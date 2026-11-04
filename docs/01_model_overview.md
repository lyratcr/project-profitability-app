# Semantic Model Overview — SM_Corp_Project_Real_Profitability

> Project knowledge file. Snapshot taken **2026-11-03** from the published model (XMLA, `INFO.VIEW`), model refreshed **2026-11-03 11:42 EST**. The published model is the source of truth; re-check it when this file and the model disagree.

## 1. Context

- **Workspace:** `_Corporate DCOE Backend Dev` (folder Corporate > Finance). **Model:** `SM_Corp_Project_Real_Profitability`. **Storage:** Direct Lake on lakehouse `LH_Corp_DataHub`, schema `gold` (plus two import tables).
- **Business problem.** Synerion is the time-keeping tool. People enter hours weekly; only their line managers approve timesheets in Synerion, whatever projects they worked on. Hours reach Project Operations through an automatic integration every **Tuesday early morning**. Project Managers only see the hours after that, and every correction then needs Accounting to reclassify hours, which means rework for Accounting and late invoices.
- **Goal of the app.** Give PMs day-by-day visibility of their projects. On **Monday** they review last week's hours against the plan and ask people to fix their timesheets before Synerion approval closes at the end of Monday. Also give executives, area directors and Finance (first requester: CFO Adan) effort, headcount, FTE, intercompany/cross-charge and revenue-yield views.
- **Priority.** Hours and revenue. **Cost is out of scope for now**: `actual_cost_usd` is in local currency and the Project Operations standard cost and roles are outdated (see § 6).

## 2. Tables

| Table | Mode | Grain | Rows | Date range | Source (see `02_data_lineage.md`) |
|---|---|---|---|---|---|
| `fact_profitability_metrics` | Direct Lake | One Synerion time entry (employee × day × project task × pay category) | 1,319,654 | 2025-01-01 → **2026-10-17** | Synerion time + UKG HR + Project Ops (Dataverse) project/task attributes |
| `fact_revenue_metrics` | Direct Lake | One Project Ops financial line per project × day × type × scenario | 279,154 | 2024-12-31 → **2029-12-01** | `dataverse.fact_financials_unified` (Actual + Backlog, no licenses) |
| `dim_project` | Direct Lake | Project (`project_key`) | 317 projects, 138 customers | — | Financials ∪ time facts |
| `dim_employee` | Direct Lake | Employee (UKG) | 5,107 | — | UKG employment details |
| `dim_employee_history` | Direct Lake | Employee × L1 period (SCD2) | 32,510 | — | UKG job history |
| `dim_organization` | Direct Lake | L1 \| L2 \| L3 combination (`org_key`) | 44 | — | Both facts |
| `dim_hierarchy_master` | Direct Lake | L1/L2/L3 active since 2026-01-01 | 41 | — | Employee org (time) ∪ financial org (revenue) |
| `dim_calendar` | Direct Lake | Day | — | 2024-12-31 → **2029-04-01** | Calendar |
| `info_gold_profitability_refresh` | Direct Lake | 1 row | 1 | — | Gold pipeline end time |
| `_Measures` | Import | Measure holder | — | — | — |
| `Analysis Type` | Import (field parameter) | Intercompany / Cross Charge | 2 | — | `intercompany_flow` / `cross_charge_flow` |

### Key columns

- **`fact_profitability_metrics`** (hours): `transaction_date`, `worked_hours`, `actual_cost_usd` (local currency, don't use), `ukg_employee_id`, `synerion_emp_id`, `employee_full_name`, `employee_country`, `employee_reporting_category` (Regular, Contractor, Intern, GT Contractor, Temporary Employee), `employee_L1/L2/L3` (the employee's home org), `project_key`, `project_name`, `project_company`, `project_country`, `project_customer`, `project_industry`, `project_service_line`, `project_L1/L2/L3` (the project's org), `task_name`, `subtask_category` (Productive / Regular / shrinkage codes), `pay_category_id/description` (Regular Time, Overtime, Holiday, Time Off), `intercompany_flag/flow`, `cross_charge_flag/flow`, `org_key`.
- **`fact_revenue_metrics`** (money): `transaction_date` (daily), `project_key`, `actual_revenue_usd` (the amount for both scenarios, despite the name), `hours_quantity`, `scenario` (`Actual` / `Backlog`), `revenue_type` (T&M, Fixed Fee, Fixed Fee After Month, Rev Rec, Manual Adjustment), `financial_L1/L2/L3`, `financial_customer`, `org_key`.
- **`dim_calendar`**: `date`, `year`, `month`, `year_month`, `year_month_number`, `year_week` (text `"2026 W42"`, weeks start **Monday**), `start_of_week_sun`, `end_of_week_sat`, quarter/semester labels, `is_weekday`.

## 3. Relationships (all single direction, many-to-one, active)

```
fact_profitability_metrics[transaction_date] → dim_calendar[date]
fact_profitability_metrics[project_key]      → dim_project[project_key]
fact_profitability_metrics[ukg_employee_id]  → dim_employee[ukg_employee_id]
fact_profitability_metrics[org_key]          → dim_organization[org_key]      (project org)
fact_revenue_metrics[transaction_date]       → dim_calendar[date]
fact_revenue_metrics[project_key]            → dim_project[project_key]
fact_revenue_metrics[org_key]                → dim_organization[org_key]      (financial org)
dim_employee_history[ukg_employee_id]        → dim_employee[employee_number]  (⚠ id vs number, see § 6)
dim_hierarchy_master                          → no relationships; measures apply it with TREATAS
```

`dim_project`, `dim_calendar` and `dim_organization` filter **both** facts, so a project, a period or an org slices hours and revenue together.

## 4. Two ways to slice by organization

| Slicer | Hours side | Revenue side | Used by |
|---|---|---|---|
| `dim_hierarchy_master[L1/L2/L3]` (via TREATAS in measures) | employee org (`employee_L*`) for headcount/FTE; project org (`project_L1`) for cross-charge in | financial org (`financial_L*`) | Master Hierarchy measures (executive pages) |
| `dim_organization` (relationship) | project org | financial org | Plain measures |

Only measures written with the TREATAS pattern react to `dim_hierarchy_master`. `[Total Worked Hours]`, `[Active Headcount]` and `[Total Revenue]` ignore it.

## 5. Data facts (checked 2026-11-03)

- Revenue, all time: **Actual $121.2 M**, **Backlog $226.9 M** (whole plan, see `03_measure_review.md` § 2).
- Synerion hours: 5.15 M total; about **60–63 k hours and ~1,530 people per week** in Aug–Oct 2026; February 2026 = 223,641 h (matches the intercompany / cross-charge matrices Adan uses).
- Hours by flag: Direct 96% / Cross Charge 4%; Intercompany 93% / Local 7% (most people work for a US project from Costa Rica or Colombia).
- Project Ops actual hours (`hours_quantity`, Actual) ≈ 25–33 k per month vs Synerion ≈ 220–270 k per month. Financial hours exist only for billable plan/actuals; Synerion has every hour, internal time included.
- Backlog is **daily** (e.g. 9/1, 9/2, 9/7 …), so it can be summed by week.
- **`dim_project` currently has a duplicate key (`PROMETHEUS`)**, so every query through `dim_project` fails until the gold notebook is fixed (issue #0).
- 33,244 Synerion hours (0.6%) sit on `"Unmapped Project"`; 30 of 274 project keys in the time fact have no revenue rows; 2 project keys map to more than one project name.

## 6. Known issues

Tracked with owners in `04_decisions_and_open_items.md` (its numbering is the one to use).

| # | Issue | Impact | Proposed fix |
|---|---|---|---|
| 0 | **`dim_project[project_key]` has a duplicate (`PROMETHEUS`, two rows)** after the 2026-11-03 refresh. Most likely two keys that differ only in letter case in Spark and become equal in the model, which ignores case | **Any query that slices or filters by `dim_project` fails** ("contains a duplicate value … not allowed on the one side of a many-to-one relationship"). This breaks project visuals in the current report too | In the gold notebook `build_gold_dim_project`: normalize the key (`upper(trim(project_key))`) on both sides before the join and `dropDuplicates(["project_key"])` at the end. Use the same normalization for the fact keys |
| 1 | **Synerion data stops at 2026-10-17** although the pipeline ran 2026-11-03 | The PM Monday review can't work: last week's hours aren't there | Find why bronze `synerion.time_costing_detail` is ~2.5 weeks behind (extract schedule, approved-only filter?) and load daily, including unapproved time (`02_data_lineage.md` § 4) |
| 2 | `[Total Revenue]` sums **Actual + Backlog** ($348 M) | `[Margin $]`, `[Margin %]` and any visual using it are wrong | `Actual Revenue_app` (scenario = Actual) |
| 3 | `actual_cost_usd` is UKG hourly pay × hours in **local currency** (COP, CRC); only US rows are USD | Total Cost $636 B; margin unusable | Out of scope now. Later: FX conversion in silver, or Project Ops standard cost once roles/rates are updated |
| 4 | `dim_calendar` ends 2029-04-01; Backlog runs to 2029-12-01 | $8.5 M of backlog falls outside the calendar in date-sliced visuals | Extend the calendar to the max backlog date |
| 5 | No **project manager** on `dim_project` | The PM page can't filter "my projects" | Add `project_manager` (and email) from `msdyn_project` in the gold notebook |
| 6 | `project_key` = first 10 characters of the project name | Fragile join between time and revenue; collisions (2 keys with 2 names) | Use the Project Ops project id / number as key |
| 7 | `dim_hierarchy_master` only has L1/L2/L3 combos seen since 2026-01-01 | 2025 orgs that no longer exist drop out of Master Hierarchy measures | Accept for 2026 reporting, or build from all dates |
| 8 | `TODAY()` in `Validation Window *` measures runs in **UTC** | Monday after 18:00 Costa Rica time already counts as Tuesday | Let the app pass the window dates as a filter |
| 9 | `dim_employee_history[ukg_employee_id]` relates to `dim_employee[employee_number]` | Id vs number: the relationship likely doesn't match | Relate on `ukg_employee_id` (not used by the app today) |
| 10 | Silver notebook runs `RUN_FULL_LOAD = True`; its merge key (`synerion_emp_id`) isn't unique | Fine while full load; an incremental run would corrupt the table | Keep full load or use a real row key |
