# Gold: project manager per project and PM app access (Ion, 2026-11-16).
# Rules: docs/04_decisions_and_open_items.md (#29, #30) and pipeline/security/README.md.
#
# Paste these functions into NB_Corp_Finance_DataHub_ELT_Gold_Profitability (they use the notebook's `spark`), then:
#   df_dim_proj = add_project_manager(build_gold_dim_project(df_fact))            # instead of build_gold_dim_project(df_fact)
#   ... write gold.dim_project as today ...
#   df_access = build_gold_security_project_access(df_dim_proj)
#   df_access.transform(add_metadata).write.format("delta").mode("overwrite") \
#       .option("overwriteSchema", "true").saveAsTable(f"{CATALOG}.gold.security_project_access")
#
# Read-only preview (writes nothing), in any notebook attached to the Lakehouse, after pasting the functions:
#   dim = add_project_manager(spark.table(f"{CATALOG}.gold.dim_project").select("project_key", "project_name", "project_customer"))
#   access = build_gold_security_project_access(dim)
#   access.groupBy("reason").count().show(); print("users:", access.select("user_upn").distinct().count())

from pyspark.sql import DataFrame
from pyspark.sql import functions as F
from pyspark.sql.window import Window

CATALOG = "LH_Corp_DataHub"
# Manual access list (executives, directors outside the chain): CSV Ion uploads to the Lakehouse Files.
ACCESS_LIST_PATH = "Files/Finance/pm_performance_hub/pm_app_access_list.csv"
# Longest supervisor chain seen on 2026-11-16 was 5 levels above a PM; this only stops a broken chain.
MAX_CHAIN_LEVELS = 15
EMPTY_ACCESS = "user_upn string, project_key string, reason string"


def _auxis_id(c):
    """Auxis ID as the HR view writes it: numeric numbers padded to 4 digits, letter prefixes (C, U, T…) kept."""
    c = F.trim(c.cast("string"))
    return F.when(c.rlike("^[0-9]+$"), F.lpad(c, 4, "0")).otherwise(c)


def _org_path(c):
    """Organization path for matching: upper case, no spaces (e.g. 'BPO-BTR-CORE')."""
    return F.upper(F.regexp_replace(F.coalesce(c, F.lit("")), r"\s+", ""))


def build_pm_per_project_key() -> DataFrame:
    """
    One Project Ops project per project key (#30): the latest version of each msdyn_project record; when a key
    (first 10 characters of the name, #11) has several projects, the active one first, then the most recently created.
    Returns key_norm, pm_user_id (Dynamics user id), pm_name and project_org (Project Ops organization path).
    """
    p = spark.table(f"{CATALOG}.dataverse_history.msdyn_project")
    p = (
        p.withColumn("_v", F.row_number().over(Window.partitionBy("Id").orderBy(F.col("SinkModifiedOn").desc())))
        .filter("_v = 1")
        .filter(F.col("IsDelete").isNull() | (F.col("IsDelete") == False))  # noqa: E712 (Spark column comparison)
        .withColumn("key_norm", F.upper(F.trim(F.substring("msdyn_subject", 1, 10))))
    )
    w = Window.partitionBy("key_norm").orderBy(F.col("statecode").asc(), F.col("createdon").desc())
    return (
        p.withColumn("_k", F.row_number().over(w))
        .filter("_k = 1")
        .select(
            "key_norm",
            F.lower(F.trim("msdyn_projectmanager")).alias("pm_user_id"),
            F.trim("msdyn_projectmanagername").alias("pm_name"),
            _org_path(F.col("aux_organizationname")).alias("project_org"),
        )
    )


def add_project_manager(df_dim: DataFrame) -> DataFrame:
    """dim_project + project_manager_name (open item #4). Keys without a Project Ops project keep it blank."""
    pm = build_pm_per_project_key().select("key_norm", F.col("pm_name").alias("project_manager_name"))
    return df_dim.withColumn("key_norm", F.upper(F.trim("project_key"))).join(pm, "key_norm", "left").drop("key_norm")


def build_gold_security_project_access(df_dim: DataFrame) -> DataFrame:
    """
    Who sees which project in the PM app: one row per (user_upn, project_key), reason = pm / manager / list_all /
    list_area (comma-joined when several apply). The semantic model's dynamic role filters dim_project with it.
    Only Auxis ID, UPN and supervisor are read from the HR view (it also holds personal data the app must not use).
    """
    keys = df_dim.select("project_key", F.upper(F.trim("project_key")).alias("key_norm")).distinct()
    pm = build_pm_per_project_key()
    resources = (
        spark.table(f"{CATALOG}.dataverse.bookableresource_clean")
        .filter(F.col("userid").isNotNull())
        .select(F.lower(F.trim("userid")).alias("pm_user_id"), _auxis_id(F.col("aux_resourceno")).alias("emp"))
        .dropDuplicates(["pm_user_id"])
    )
    hr = spark.table(f"{CATALOG}.hr.vw_dim_employee_details").select(
        F.trim(F.col("employee_number").cast("string")).alias("emp"),
        F.trim(F.col("supervisor_employee_number").cast("string")).alias("sup"),
        F.lower(F.trim("user_principal_name")).alias("upn"),
    )
    # project_key, key_norm, pm_user_id, pm_name, project_org, emp (the PM's Auxis ID)
    proj = keys.join(pm, "key_norm", "left").join(resources, "pm_user_id", "left")

    # (1) The PM sees their projects.
    pm_rows = proj.join(hr.select("emp", "upn"), "emp").select(F.col("upn").alias("user_upn"), "project_key", F.lit("pm").alias("reason"))

    # (2) Everyone up the PM's supervisor chain sees the PM's projects.
    edges = hr.filter("sup is not null and sup <> '' and sup <> emp").select("emp", "sup")
    frontier = proj.filter("emp is not null").select("project_key", F.col("emp").alias("cur"))
    chain = None
    for _ in range(MAX_CHAIN_LEVELS):
        frontier = frontier.join(edges, frontier.cur == edges.emp).select("project_key", F.col("sup").alias("cur")).distinct()
        if frontier.limit(1).count() == 0:
            break
        chain = frontier if chain is None else chain.unionByName(frontier)
    if chain is None:
        mgr_rows = spark.createDataFrame([], EMPTY_ACCESS)
    else:
        mgr_rows = chain.join(hr.select(F.col("emp").alias("cur"), "upn"), "cur").select(
            F.col("upn").alias("user_upn"), "project_key", F.lit("manager").alias("reason")
        )

    # (3) The manual list: scope 'all' = every project; scope 'area' = projects whose Project Ops organization equals
    #     the area or starts with the area + '-' (L1, L1-L2 or L1-L2-L3 on whole segments).
    try:
        lst = spark.read.option("header", True).csv(ACCESS_LIST_PATH).select(
            F.lower(F.trim("user_upn")).alias("user_upn"),
            F.lower(F.trim("scope")).alias("scope"),
            _org_path(F.col("area")).alias("area"),
        )
    except Exception as e:  # no list uploaded yet: PM and supervisor-chain rows only
        print(f"[security] Access list not found at {ACCESS_LIST_PATH} ({type(e).__name__}): PM and supervisor-chain rows only.")
        lst = spark.createDataFrame([], "user_upn string, scope string, area string")
    area_match = (F.col("project_org") == F.col("area")) | F.col("project_org").startswith(F.concat(F.col("area"), F.lit("-")))
    all_rows = lst.filter("scope = 'all'").crossJoin(keys.select("project_key")).select("user_upn", "project_key", F.lit("list_all").alias("reason"))
    area_rows = (
        lst.filter("scope = 'area' and area <> ''")
        .join(proj.filter("project_org <> ''").select("project_key", "project_org"), area_match)
        .select("user_upn", "project_key", F.lit("list_area").alias("reason"))
    )

    access = (
        pm_rows.unionByName(mgr_rows).unionByName(all_rows).unionByName(area_rows)
        .filter(F.col("user_upn").isNotNull() & (F.col("user_upn") != ""))
        .groupBy("user_upn", "project_key")
        .agg(F.concat_ws(",", F.array_sort(F.collect_set("reason"))).alias("reason"))
    )

    # Checks printed on every run (counts and area codes only, no personal data).
    areas = lst.filter("scope = 'area'").select("area").distinct()
    matched = areas.join(proj.select("project_org").distinct(), area_match, "left_semi")
    print("[security] rows:", access.count(), "| users:", access.select("user_upn").distinct().count(),
          "| project keys covered:", access.select("project_key").distinct().count(), "of", keys.count())
    print("[security] list rows with a scope other than all/area:", lst.filter(~F.col("scope").isin("all", "area")).count())
    print("[security] list areas that match no project:", [r.area for r in areas.join(matched, "area", "left_anti").collect()])
    print("[security] list UPNs not in the HR view:",
          lst.join(hr.select(F.col("upn").alias("user_upn")), "user_upn", "left_anti").select("user_upn").distinct().count())
    print("[security] project keys whose PM has no UPN:",
          proj.filter("emp is not null").join(hr.filter("upn is not null").select("emp"), "emp", "left_anti").select("project_key").distinct().count())
    return access
