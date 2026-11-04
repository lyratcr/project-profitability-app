# Data Lineage — where the Synerion hours and the revenue come from

> Project knowledge file. From the notebooks in `pipeline/notebooks/` (run 2026-11-03), lakehouse `LH_Corp_DataHub`.

## 1. Flow

```
SYNERION (time keeping)                    UKG (HR)                         PROJECT OPERATIONS (Dataverse)
synerion.time_costing_detail   ──┐    hr.ukg_employment_details   ──┐    dataverse_history.msdyn_project
synerion.pay_categories          │    hr.ukg_employee_job_history    │    dataverse_history.msdyn_projecttask
synerion.employment_type         │    hr.ukg_company_details         │    dataverse.bookableresource_clean
synerion.auxiliar_codes          │    hr.ukg_dimensions_details      │    dataverse.fact_financials_unified
                                 ▼                                   │              │
        NB ..._Silver_Synerion_UKG                                   │              │
        silver.fact_time_and_cost_enriched  ◄────────────────────────┘              │
        (hours, cost = hours × UKG hourly pay rate, employee org L1-L3)             │
                                 │                                                  │
                                 ▼                                                  ▼
        NB ..._Gold_Profitability ──────────────────────────────────────────────────────────
        gold.fact_profitability_metrics   (Synerion hours + Project Ops project/task attributes)
        gold.fact_revenue_metrics         (Project Ops Actual + Backlog, no LICS)
        gold.dim_project, dim_employee, dim_employee_history, dim_organization,
        gold.dim_Hierarchy_Master, gold.info_gold_profitability_refresh
                                 │
                                 ▼
        SM_Corp_Project_Real_Profitability (Direct Lake), refresh triggered at the end of the gold notebook
```

**Key point:** `fact_profitability_metrics` is **Synerion time** (what people logged), not Project Operations actuals. Project Ops only adds the project's name, customer, industry, service line, company and org through the project/task ids. Project Ops **money** (Actual and Backlog) is in `fact_revenue_metrics`. So the PM comparison "hours logged vs plan" is `fact_profitability_metrics[worked_hours]` against `fact_revenue_metrics` Backlog (`hours_quantity` and amount), both sliced through `dim_project` and `dim_calendar`.

## 2. Silver: `NB_Corp_Finance_DataHub_ELT_Silver_Synerion_UKG`

- **Source:** `synerion.time_costing_detail` (one row per time entry: `transactiondate`, `employeeid`, `projectid`, `projecttaskid`, `bookableresourceid`, `paycategoryid`, `paycategorydecimal` = hours, `level4_task`).
- **Enrichment:**
  - Employee: UKG employment details (name, company → country CRI/COL/USA, employee type → reporting category).
  - Pay category description.
  - Shrinkage code from `auxiliar_codes` (`subtask_category`: "Default" → Regular Time, unmatched → Productive Time).
  - Job history as of the transaction date (SCD2) → hourly pay rate and org levels 1–4 (L1-L2-L3 split from the level-1 description; customer / service line / industry from levels 2–4).
- **Cost:** `actual_cost_usd = round(hours × hist.hourlyPayRate, 2)`. UKG pay rates are in each company's local currency, so Colombia and Costa Rica rows are COP and CRC. The name "usd" is wrong.
- **Load:** `RUN_FULL_LOAD = True` (full overwrite each run). Writes `silver.info_synerion_ukg_refresh`.

## 3. Gold: `NB_Corp_Finance_DataHub_ELT_Gold_Profitability`

- **`fact_profitability_metrics`**: silver joined to Project Ops.
  - **Project:** `msdyn_project` by `projectid` gives the name, company, customer, industry, service line and org L1-L3. `project_key` = first 10 characters of the project name. Unmatched projects become `"Unmapped Project"`.
  - **Fallback:** from `fact_financials_unified` (latest row per 10-character key).
  - **Umbrella projects** (`msdyn_comments = "Dimension by task"`): customer, industry, service line and L1-L3 come from the **task** instead.
  - **Resource name** from `bookableresource_clean`.
  - **Flags:**
    - `intercompany_flag`: employee country = project country (project country comes from the project company name).
    - `cross_charge_flag`: `employee_L1 = project_L1` → Direct, otherwise Cross Charge.
    - The `*_flow` columns are "EMP → PRJ" labels.
  - **`org_key`** = project L1 \| L2 \| L3.
- **`fact_revenue_metrics`**: `fact_financials_unified` with scenario in (Actual, Backlog) and L3 ≠ LICS. `amount` → `actual_revenue_usd` (both scenarios); `type` → `revenue_type`; `org_key` = financial L1 \| L2 \| L3.
- **`dim_project`**: full outer join of financial projects and time projects on `project_key`. Name and customer prefer the financial side.
- **`dim_employee`**: UKG, with the name taken from Dataverse resources when available. **`dim_employee_history`**: SCD2 of L1 only.
- **`dim_organization`**: union of project org (time) and financial org (revenue), with nulls → "Unallocated".
- **`dim_Hierarchy_Master`**: union of employee org (time) and financial org (revenue), **from 2026-01-01**.
- The last step triggers the semantic model refresh with `sempy`.

## 4. Freshness: the blocker for the PM use case

- Model refreshed 2026-11-03 11:42 EST, but the latest Synerion date is **2026-10-17** (week 2026 W42). Weeks W43 (Oct 19–25) and W44 (Oct 26–Nov 1) are missing.
- So the problem is upstream of both notebooks: the bronze extract into `synerion.time_costing_detail` (not in this repo) is behind, or it only brings time that is already approved or integrated.
- **What the PM Monday review needs:**
  1. Synerion time loaded **at least daily**, ideally several times on Monday.
  2. **Including unapproved / submitted** time.
  3. A column with the approval status, if Synerion exposes it.
  4. The gold notebook and the model refresh run right after each load.
- **Action:** get the bronze Synerion ingestion pipeline/notebook into `pipeline/notebooks/` and review its schedule and filters.
