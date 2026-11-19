# Resource Allocation (build plan 6.17, open item #37): read-only discovery of Project Ops bookings.
# Paste each cell into a Fabric notebook attached to LH_Corp_DataHub and run them in order.
# Nothing here writes, overwrites or deletes: only SHOW / SELECT / count.
#
# Results (Ion ran it 2026-11-19; decisions in docs/04 #35-#38):
# - Not in the lakehouse: bookableresourcebooking, msdyn_resourceassignment, bookingstatus, bookableresourcecategoryassn.
# - dataverse_lh_shortcut.aux_resourceassignmentshistory: a change log (Create / Update / Delete events since Nov 2024),
#   not the current assignments; not used. Ask Alejandro for msdyn_resourceassignment and msdyn_projectteam.
# - dataverse_history.msdyn_projecttask: 1,895 tasks with scheduled dates, effort, effort remaining and resource
#   category (role), but no assigned people (that link is msdyn_resourceassignment).
# - dataverse.bookableresource_clean: 1,713 active resources, 99.7% with aux_ukgrole and aux_organizationname (L1-L2-L3);
#   calendaridname and aux_country empty (no capacity source).
# - Cells 3-4 below assume tables that don't exist; the follow-up cells were run from chat.

# %% Cell 1: which Project Ops scheduling tables exist in the lakehouse
CAT = "LH_Corp_DataHub"
WANTED = ["resourceassignment", "bookableresourcebooking", "bookableresourcecategory", "bookingstatus",
          "resourcerequirement", "projectteam", "bookableresource"]
for schema in ["dataverse", "dataverse_history", "dataverse_lh_shortcut"]:
    try:
        names = [r["tableName"] for r in spark.sql(f"SHOW TABLES IN {CAT}.{schema}").collect()]
    except Exception as e:
        print(f"{schema}: not available ({str(e)[:100]})")
        continue
    print(f"{schema}: {sorted(n for n in names if any(w in n.lower() for w in WANTED))}")

# %% Cell 2: set the full names found in Cell 1 (None when a table is missing), then run
T_ASSIGN = f"{CAT}.dataverse.msdyn_resourceassignment"        # resource assignments on project tasks
T_BOOKING = f"{CAT}.dataverse.bookableresourcebooking"        # bookings (hard / soft)
T_STATUS = f"{CAT}.dataverse.bookingstatus"                   # booking status (Proposed / Committed / Canceled)
T_CATASSN = f"{CAT}.dataverse.bookableresourcecategoryassn"   # resource -> role
T_CATEGORY = f"{CAT}.dataverse.bookableresourcecategory"      # role names
TODAY = "2026-11-19"

from pyspark.sql import functions as F

def cols(t, *words):
    """Columns of table t whose name contains any of the words (to find lookups and dates without guessing)."""
    return sorted(c for c in spark.table(t).columns if any(w in c.lower() for w in words))

for t in [T_ASSIGN, T_BOOKING, T_STATUS, T_CATASSN, T_CATEGORY]:
    if not t:
        continue
    try:
        df = spark.table(t)
    except Exception as e:
        print(f"{t}: cannot read ({str(e)[:100]})")
        continue
    print(f"\n{t}: {df.count():,} rows")
    print("  ids / lookups:", cols(t, "project", "resource", "task", "status", "category", "requirement"))
    print("  dates / hours:", cols(t, "start", "finish", "end", "from", "to", "date", "hours", "duration", "work"))
    print("  state:", cols(t, "statecode", "statuscode", "type", "name"))

# %% Cell 3: coverage of future bookings (fill the column names printed by Cell 2, then run)
# Example names; replace each with the real one from Cell 2.
B_RESOURCE = "resource"          # booking -> bookable resource id
B_PROJECT = "msdyn_projectid"    # booking -> project id (may come through the resource requirement instead)
B_START, B_END = "starttime", "endtime"
B_MINUTES = "duration"           # booking duration in minutes
B_STATUS = "bookingstatus"       # booking -> booking status id

proj = (spark.table(f"{CAT}.dataverse_history.msdyn_project")
        .select(F.col("msdyn_projectid").alias("pid"), F.substring("msdyn_subject", 1, 10).alias("project_key"))
        .dropDuplicates(["pid"]))
rtype = (spark.table(f"{CAT}.gold.fact_revenue_metrics").where("scenario = 'Backlog'")
         .groupBy("project_key").agg(F.max("revenue_type").alias("revenue_type")))
status = spark.table(T_STATUS).select(F.col("bookingstatusid").alias("sid"), F.col("name").alias("status_name"))

bk = (spark.table(T_BOOKING)
      .where(F.col(B_END) >= F.lit(TODAY))
      .join(proj, F.lower(F.col(B_PROJECT)) == F.lower(F.col("pid")), "left")
      .join(rtype, "project_key", "left")
      .join(status, F.col(B_STATUS) == F.col("sid"), "left"))

print("Future bookings by revenue type and status:")
(bk.groupBy("revenue_type", "status_name")
   .agg(F.countDistinct(B_RESOURCE).alias("people"),
        F.countDistinct("project_key").alias("projects"),
        F.round(F.sum(F.col(B_MINUTES)) / 60).alias("hours"))
   .orderBy("revenue_type", "status_name").show(50, truncate=False))

print("Bookings with no project key (project lookup not matched):",
      bk.where(F.col("project_key").isNull()).count())

# %% Cell 4: roles, to compare Project Ops with UKG (open item #35)
ca = spark.table(T_CATASSN)
print("Category assignment columns:", cols(T_CATASSN, "resource", "category", "state"))
# Fill the two lookup names printed above, then uncomment:
# (ca.join(spark.table(T_CATEGORY).select(F.col("bookableresourcecategoryid").alias("cid"), F.col("name").alias("role")),
#          F.col("resourcecategory") == F.col("cid"), "left")
#    .groupBy("role").agg(F.countDistinct("resource").alias("people")).orderBy(F.desc("people")).show(60, truncate=False))
