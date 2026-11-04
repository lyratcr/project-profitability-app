# App Measures (`_app`)

> Project knowledge file. Created 2026-11-04 (build plan 1.1). **Status: CREATED 2026-11-04** in the published Dev model after Ion's approval (33 measures, all `State = Ready`). The two customer rank measures are still pending (§ 1). Source: `03_measure_review.md` § 3, with the changes in § 1.

All measures go in table `_Measures`, display folder `_app\<topic>`, description `ADDED 2026-11-04 (Fabric app): <text>`. Originals are not touched.

## 1. Changes vs `03_measure_review.md` § 3

| Measure | Change | Why |
|---|---|---|
| `Plan End Date_app` | `CALCULATE ( [Project End Date], REMOVEFILTERS ( 'dim_calendar' ) )` instead of `= [Project End Date]` | The original follows the date filter: in September 2026 it returns 2026-09-30 instead of the plan end (2029-12-01). P6 shows it as a whole-life KPI. |
| `Last Revenue Date_app` | T&M rows only | Actual has 164 rows dated after 2026-11-04 (Fixed Fee After Month $1.83 M dated 10–28 Nov; Manual Adjustment up to 2027-03-02), so the plain max returns 2027-03-02. T&M follows the hours integration (max 2026-10-30). |
| `Customer Rank by Revenue Growth_app`, `… Decline_app` | **Deferred** | The originals rank over `dim_project[project_customer]`, so they fail until open item #1 (duplicate `PROMETHEUS` key) is fixed. Create them after that. |
| All | Format strings set | The app reads them for display; several originals have none. |

## 2. Measures and validated values

Validated as query-scoped measures (`DEFINE MEASURE`) on 2026-11-04 against the published Dev model (refresh 11/04/2026 09:14 EST). Month = September 2026; week = Mon 2026-10-05 – Sun 2026-10-11.

| Folder | Measure | Format | Sep 2026 | Week of 10-05 |
|---|---|---|---|---|
| `_app\Hours` | **Synerion Hours_app** | `#,0` | 267,322 | 60,719 |
| `_app\Hours` | **Synerion Hours MoM %_app** | `0.0%` | 4.4% | 0.9% |
| `_app\Hours` | **Cross-Charge Hours Received_app** | `#,0` | 1,052 | 287 |
| `_app\Hours` | **Cross-Charge Hours Lent_app** | `#,0` | 1,359 | 353 |
| `_app\Hours` | **Net Cross-Charge Hours_app** | `#,0;-#,0;0` | -307 | -66 |
| `_app\People` | **People With Hours_app** | `#,0` | 1,605 | 1,538 |
| `_app\People` | **Headcount (Last Week)_app** | `#,0` | 1,544 | 1,538 |
| `_app\People` | **Allocated FTE (Last Week)_app** | `#,0.0` | 1,541.0 | 1,538.0 |
| `_app\People` | **Allocated FTE MoM %_app** | `0.0%` | 2.2% | 1.2% |
| `_app\People` | **Time Allocation %_app** | `0.0%` | 100.0% | 100.0% |
| `_app\Revenue` | **Actual Revenue_app** | `\$#,0;(\$#,0);\$#,0` | $6,033,393 | $2,845,079 |
| `_app\Revenue` | **Actual Revenue Last Month_app** | `\$#,0;(\$#,0);\$#,0` | $5,812,600 | $2,922,956 |
| `_app\Revenue` | **Actual Revenue MoM $_app** | `\$#,0;(\$#,0);\$#,0` | $220,794 | -$77,877 |
| `_app\Revenue` | **Actual Revenue MoM %_app** | `0.0%` | 3.8% | -2.7% |
| `_app\Yield` | **Revenue per FTE_app** | `\$#,0;(\$#,0);\$#,0` | $3,915 | $1,850 |
| `_app\Yield` | **Annualized Revenue per FTE_app** | `\$#,0;(\$#,0);\$#,0` | $46,983 | $22,198 |
| `_app\Yield` | **Revenue per Head_app** | `\$#,0;(\$#,0);\$#,0` | $3,908 | $1,850 |
| `_app\Yield` | **Revenue per FTE MoM %_app** | `0.0%` | 1.6% | -3.8% |
| `_app\Projects` | **Revenue Billed to Date_app** | `\$#,0;(\$#,0);\$#,0` | $121,380,542 | $121,380,542 |
| `_app\Projects` | **Total Planned Revenue_app** | `\$#,0;(\$#,0);\$#,0` | $228,031,572 | $228,031,572 |
| `_app\Projects` | **Revenue Left to Bill_app** | `\$#,0;(\$#,0);\$#,0` | $106,651,030 | $106,651,030 |
| `_app\Projects` | **Billing Progress %_app** | `0.0%` | 53.2% | 53.2% |
| `_app\Projects` | **Plan End Date_app** | `yyyy-mm-dd` | 2029-12-01 | 2029-12-01 |
| `_app\Projects` | **Planned Revenue_app** | `\$#,0;(\$#,0);\$#,0` | $6,103,163 | $297,888 |
| `_app\Projects` | **Planned Hours_app** | `#,0` | 30,891 | 5,284 |
| `_app\Projects` | **Billed Hours_app** | `#,0` | 30,864 | 9,854 |
| `_app\Projects` | **Revenue vs Plan_app** | `\$#,0;(\$#,0);\$#,0` | -$69,770 | $2,547,191 |
| `_app\Projects` | **Revenue vs Plan %_app** | `0.0%` | 98.9% | 955.1% |
| `_app\Projects` | **Hours vs Plan_app** | `#,0;-#,0;0` | 236,431 | 55,435 |
| `_app\Projects` | **Hours vs Plan %_app** | `0.0%` | 865.4% | 1149.1% |
| `_app\Projects` | **Hours Not Yet Billed_app** | `#,0;-#,0;0` | 236,458 | 50,865 |
| `_app\Data health` | **Last Synerion Date_app** | `yyyy-mm-dd` | 2026-11-03 | 2026-11-03 |
| `_app\Data health` | **Last Revenue Date_app** | `yyyy-mm-dd` | 2026-10-30 | 2026-10-30 |

Re-run after creation against the model measures (no `DEFINE`): all 37 columns identical in both windows.

Independent checks (plain `SUM` / `DISTINCTCOUNT` in the same query) agree exactly: hours 267,322 / 60,719; actual revenue $6,033,393 / $2,845,079; plan revenue $6,103,163 / $297,888; people 1,605 / 1,538.

## 3. DAX and descriptions

### Synerion Hours_app

Folder `_app\Hours` · format `#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Hours logged in Synerion (all pay categories).`

```dax
[Total Worked Hours]
```

### Synerion Hours MoM %_app

Folder `_app\Hours` · format `0.0%`  
Description: `ADDED 2026-11-04 (Fabric app): Change in Synerion hours vs the same period one month earlier (numeric).`

```dax
VAR _lm = CALCULATE ( [Synerion Hours_app], DATEADD ( dim_calendar[date], -1, MONTH ) )
RETURN DIVIDE ( [Synerion Hours_app] - _lm, _lm )
```

### Cross-Charge Hours Received_app

Folder `_app\Hours` · format `#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Hours other areas' people logged on this area's projects.`

```dax
[Cross-Charge Hours In]
```

### Cross-Charge Hours Lent_app

Folder `_app\Hours` · format `#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Hours this area's people logged on other areas' projects.`

```dax
[Cross-Charge Hours Out]
```

### Net Cross-Charge Hours_app

Folder `_app\Hours` · format `#,0;-#,0;0`  
Description: `ADDED 2026-11-04 (Fabric app): Received minus lent cross-charge hours.`

```dax
[Net Cross-Charge Hours]
```

### People With Hours_app

Folder `_app\People` · format `#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Distinct people who logged time in the period.`

```dax
[Active Headcount]
```

### Headcount (Last Week)_app

Folder `_app\People` · format `#,0`  
Description: `ADDED 2026-11-04 (Fabric app): People who logged time in the last week with data inside the period.`

```dax
[Operational Headcount (Last Week)]
```

### Allocated FTE (Last Week)_app

Folder `_app\People` · format `#,0.0`  
Description: `ADDED 2026-11-04 (Fabric app): Allocation FTE in the last week with data: each person's time split across projects (a person totals 1).`

```dax
[Operational FTE (Last Week)]
```

### Allocated FTE MoM %_app

Folder `_app\People` · format `0.0%`  
Description: `ADDED 2026-11-04 (Fabric app): Change in allocated FTE vs one month earlier (numeric).`

```dax
VAR _lm = CALCULATE ( [Allocated FTE (Last Week)_app], DATEADD ( dim_calendar[date], -1, MONTH ) )
RETURN DIVIDE ( [Allocated FTE (Last Week)_app] - _lm, _lm )
```

### Time Allocation %_app

Folder `_app\People` · format `0.0%`  
Description: `ADDED 2026-11-04 (Fabric app): Share of a person's hours on the row's project.`

```dax
[FTE Time Allocation %]
```

### Actual Revenue_app

Folder `_app\Revenue` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Actual-scenario revenue (USD); follows the master hierarchy when it is filtered.`

```dax
[Total Revenue (Master Hierarchy)]
```

### Actual Revenue Last Month_app

Folder `_app\Revenue` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Actual revenue one month earlier.`

```dax
[Last Month Revenue (Master Hierarchy)]
```

### Actual Revenue MoM $_app

Folder `_app\Revenue` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Actual revenue change vs one month earlier (USD).`

```dax
[Revenue MoM $ (Master Hierarchy)]
```

### Actual Revenue MoM %_app

Folder `_app\Revenue` · format `0.0%`  
Description: `ADDED 2026-11-04 (Fabric app): Actual revenue change vs one month earlier (numeric).`

```dax
VAR _lm = [Actual Revenue Last Month_app]
RETURN DIVIDE ( [Actual Revenue_app] - _lm, _lm )
```

### Revenue per FTE_app

Folder `_app\Yield` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Actual revenue / allocated FTE (last week). Monthly context only.`

```dax
[Revenue per FTE]
```

### Annualized Revenue per FTE_app

Folder `_app\Yield` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Revenue per FTE x 12. Valid for a single month only.`

```dax
[Annualized Revenue per FTE]
```

### Revenue per Head_app

Folder `_app\Yield` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Actual revenue / headcount (last week). Monthly context only.`

```dax
[Revenue per Headcount]
```

### Revenue per FTE MoM %_app

Folder `_app\Yield` · format `0.0%`  
Description: `ADDED 2026-11-04 (Fabric app): Change in revenue per FTE vs one month earlier (numeric).`

```dax
VAR _lm = CALCULATE ( [Revenue per FTE_app], DATEADD ( dim_calendar[date], -1, MONTH ) )
RETURN DIVIDE ( [Revenue per FTE_app] - _lm, _lm )
```

### Revenue Billed to Date_app

Folder `_app\Projects` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Actual revenue over the project's life (ignores the date filter).`

```dax
[LTD Actual Revenue]
```

### Total Planned Revenue_app

Folder `_app\Projects` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Whole plan (Backlog scenario, all dates).`

```dax
[LTD Backlog]
```

### Revenue Left to Bill_app

Folder `_app\Projects` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Plan minus billed to date.`

```dax
[Remaining Backlog]
```

### Billing Progress %_app

Folder `_app\Projects` · format `0.0%`  
Description: `ADDED 2026-11-04 (Fabric app): Billed to date / total plan.`

```dax
[Project Progress %]
```

### Plan End Date_app

Folder `_app\Projects` · format `yyyy-mm-dd`  
Description: `ADDED 2026-11-04 (Fabric app): Last date in the plan (Backlog), whole project life. Unlike the original, it ignores the date filter.`

```dax
CALCULATE ( [Project End Date], REMOVEFILTERS ( 'dim_calendar' ) )
```

### Planned Revenue_app

Folder `_app\Projects` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Plan (Backlog) revenue in the selected period.`

```dax
CALCULATE ( SUM ( fact_revenue_metrics[actual_revenue_usd] ), fact_revenue_metrics[scenario] = "Backlog" )
```

### Planned Hours_app

Folder `_app\Projects` · format `#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Plan (Backlog) hours in the selected period.`

```dax
CALCULATE ( SUM ( fact_revenue_metrics[hours_quantity] ), fact_revenue_metrics[scenario] = "Backlog" )
```

### Billed Hours_app

Folder `_app\Projects` · format `#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Hours integrated into Project Operations (Actual) in the period.`

```dax
CALCULATE ( SUM ( fact_revenue_metrics[hours_quantity] ), fact_revenue_metrics[scenario] = "Actual" )
```

### Revenue vs Plan_app

Folder `_app\Projects` · format `\$#,0;(\$#,0);\$#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Actual minus planned revenue. Monthly or longer periods only.`

```dax
[Actual Revenue_app] - [Planned Revenue_app]
```

### Revenue vs Plan %_app

Folder `_app\Projects` · format `0.0%`  
Description: `ADDED 2026-11-04 (Fabric app): Actual / planned revenue. Monthly or longer periods only.`

```dax
DIVIDE ( [Actual Revenue_app], [Planned Revenue_app] )
```

### Hours vs Plan_app

Folder `_app\Projects` · format `#,0;-#,0;0`  
Description: `ADDED 2026-11-04 (Fabric app): Synerion minus planned hours. Project level only.`

```dax
[Synerion Hours_app] - [Planned Hours_app]
```

### Hours vs Plan %_app

Folder `_app\Projects` · format `0.0%`  
Description: `ADDED 2026-11-04 (Fabric app): Synerion / planned hours. Project level only; blank without plan hours.`

```dax
DIVIDE ( [Synerion Hours_app], [Planned Hours_app] )
```

### Hours Not Yet Billed_app

Folder `_app\Projects` · format `#,0;-#,0;0`  
Description: `ADDED 2026-11-04 (Fabric app): Hours in Synerion not yet integrated into Project Operations.`

```dax
[Synerion Hours_app] - [Billed Hours_app]
```

### Last Synerion Date_app

Folder `_app\Data health` · format `yyyy-mm-dd`  
Description: `ADDED 2026-11-04 (Fabric app): Last day with Synerion hours loaded.`

```dax
CALCULATE ( MAX ( fact_profitability_metrics[transaction_date] ), REMOVEFILTERS () )
```

### Last Revenue Date_app

Folder `_app\Data health` · format `yyyy-mm-dd`  
Description: `ADDED 2026-11-04 (Fabric app): Last day with T&M actuals (follows the hours integration); other revenue types are posted with future dates.`

```dax
CALCULATE (
    MAX ( fact_revenue_metrics[transaction_date] ),
    fact_revenue_metrics[scenario] = "Actual",
    fact_revenue_metrics[revenue_type] = "T&M",
    REMOVEFILTERS ()
)
```

## 4. Notes for the pages

- **Revenue vs plan is monthly.** In the week of 10-05, actual revenue is $2.85 M against a $0.30 M plan (955%): actuals are posted in lumps (fixed fee, adjustments), not daily. P6's weekly table should show hours vs plan only; revenue vs plan goes in the monthly view.
- **`Actual Revenue Last Month_app` in a weekly context** is the same week shifted one month back; it is only meaningful for a whole month.
- **Hours vs plan only per project:** company-wide, Synerion hours include internal and non-billable time (Sep 2026: 865%).
- **`Time Allocation %_app`** is 100% at total level by design; it is meaningful per person and project.

## 5. P6 "No hours this week" flag (build plan 1.2): CREATED 2026-11-04

Created in the Dev model after Ion's approval (`State = Ready`); re-validated against the model measures with identical results. For the P6 "Who logged time" table: a person who logged time on the project in the 4 weeks before the selected week, but nothing in it. The app sends the week as a `dim_calendar[date]` range (Monday–Sunday); the measures take its first day, so no `TODAY()` is involved.

### Hours Previous 4 Weeks_app

Folder `_app\Projects` · format `#,0`  
Description: `ADDED 2026-11-04 (Fabric app): Synerion hours in the 28 days before the first date of the selected period (the 4 weeks before the selected week).`

```dax
VAR _start = MIN ( dim_calendar[date] )
RETURN
    CALCULATE (
        [Synerion Hours_app],
        REMOVEFILTERS ( dim_calendar ),
        DATESBETWEEN ( dim_calendar[date], _start - 28, _start - 1 )
    )
```

### Missing This Week_app

Folder `_app\Projects` · format `0`  
Description: `ADDED 2026-11-04 (Fabric app): 1 when there are hours in the previous 4 weeks but none in the selected period; blank otherwise. Use per person and project.`

```dax
IF ( [Hours Previous 4 Weeks_app] > 0 && COALESCE ( [Synerion Hours_app], 0 ) = 0, 1 )
```

Because `Hours Previous 4 Weeks_app` is non-blank for them, `SUMMARIZECOLUMNS` keeps the people who logged nothing in the week; the table gets one row per person who logged in either window.

### Validation (query-scoped, 2026-11-04)

Grouped by `fact_profitability_metrics[ukg_employee_id]`, filtered on `fact_profitability_metrics[project_key]` (not `dim_project`, because of open item #1). Independent check: the same 4-week sum with fixed `transaction_date` bounds.

| Project | Week | Rows | With hours | Flagged | Independent flagged | Prev-4-weeks hours = check |
|---|---|---|---|---|---|---|
| PAR-401-01 | 2026-10-27 – 11-02 (last full week) | 109 | 106 | 3 | 3 | 18,901 = 18,901 |
| PAR-401-05 | 2026-10-27 – 11-02 | 365 | 352 | 13 | 13 | 53,665 = 53,665 |
| PAR-401-01 | 2026-11-03 – 11-09 (current, data through 11-03) | 108 | 93 | 15 | 15 | 18,626 = 18,626 |

No row is flagged while having hours in the week.

**Note for P6:** on the current (partial) week the flag means "nothing logged *yet* this week" (15 people on a Monday). The page should label it that way for the current week, and use the full last week for the Monday review.

## 6. Master-hierarchy-aware measures (open item #19): CREATED 2026-11-04

Created and updated in the Dev model after Ion's approval (all `State = Ready`, formats and folders as below). Re-run against the model measures: same values as the validation table (no org: hours 267,322, people 1,605, plan $6,103,163; L1 = BPO: employee-org hours 173,552, project-org hours 171,716, plan $3,426,309, planned hours 2,977, billed hours 3,378). `Planned Revenue_app`, `Planned Hours_app` and `Billed Hours_app` keep their ADDED text and gain a FIXED line.

`dim_hierarchy_master` has no relationships and serves both views (Ion, 2026-11-04). Each measure maps it with `TREATAS` to the org that fits it, like the existing headcount (employee org), cross-charge (project org) and revenue (financial org) measures. With no org selected, every measure returns its unfiltered value. Pages choose the employee-org or project-org version per visual (P1 "where the people sit" vs "where the work is billed").

`UPDATE` rows change `_app` measures created in § 2 (ours, not used by any page yet); `Revenue vs Plan_app` and `Hours Not Yet Billed_app` follow automatically.

| Measure | Action | Folder | Format |
|---|---|---|---|
| **Synerion Hours (Employee Org)_app** | NEW | `_app\Hours` | `#,0` |
| **Synerion Hours (Project Org)_app** | NEW | `_app\Hours` | `#,0` |
| **People With Hours (Employee Org)_app** | NEW | `_app\People` | `#,0` |
| **People With Hours (Project Org)_app** | NEW | `_app\People` | `#,0` |
| **Planned Revenue_app** | UPDATE | `_app\Projects` | `\$#,0;(\$#,0);\$#,0` |
| **Planned Hours_app** | UPDATE | `_app\Projects` | `#,0` |
| **Billed Hours_app** | UPDATE | `_app\Projects` | `#,0` |

### Validation (query-scoped, 2026-11-04)

September 2026, `dim_hierarchy_master[L1] = "BPO"`, against plain filters on the fact's own org column:

| Measure | Via master hierarchy | Direct fact filter | |
|---|---|---|---|
| Hours, employee org | 173,552 | 173,552 | exact |
| People, employee org | 1,045 | 1,045 | exact |
| Hours, project org | 171,716 | 173,612 | −1,896 h: project-org combos missing from the hierarchy (#21) |
| People, project org | 1,035 | 1,047 | same cause |
| Planned revenue, financial org | $3,426,309 | $3,426,309 | exact |
| Planned hours, financial org | 2,977 | 2,977 | exact |
| Billed hours, financial org | 3,378 | 3,378 | exact |

No org selected: every measure equals its unfiltered value (hours 267,322; people 1,605; plan $6,103,163). September 2025 shows small gaps (employee-org hours 163,276 vs 163,364) because the hierarchy only has 2026 combos (`01_model_overview.md` issue 7).

### DAX

#### Synerion Hours (Employee Org)_app (NEW)

Description: `ADDED 2026-11-04 (Fabric app): Synerion hours of the people who sit in the selected org (employee org).`

```dax
IF (
    ISFILTERED ( dim_hierarchy_master[L1] ) || ISFILTERED ( dim_hierarchy_master[L2] ) || ISFILTERED ( dim_hierarchy_master[L3] ),
    CALCULATE (
        [Total Worked Hours],
        TREATAS (
            SUMMARIZE ( dim_hierarchy_master, dim_hierarchy_master[L1], dim_hierarchy_master[L2], dim_hierarchy_master[L3] ),
            fact_profitability_metrics[employee_L1], fact_profitability_metrics[employee_L2], fact_profitability_metrics[employee_L3]
        )
    ),
    [Total Worked Hours]
)
```

#### Synerion Hours (Project Org)_app (NEW)

Description: `ADDED 2026-11-04 (Fabric app): Synerion hours logged on projects that belong to the selected org (project org).`

```dax
IF (
    ISFILTERED ( dim_hierarchy_master[L1] ) || ISFILTERED ( dim_hierarchy_master[L2] ) || ISFILTERED ( dim_hierarchy_master[L3] ),
    CALCULATE (
        [Total Worked Hours],
        TREATAS (
            SUMMARIZE ( dim_hierarchy_master, dim_hierarchy_master[L1], dim_hierarchy_master[L2], dim_hierarchy_master[L3] ),
            fact_profitability_metrics[project_L1], fact_profitability_metrics[project_L2], fact_profitability_metrics[project_L3]
        )
    ),
    [Total Worked Hours]
)
```

#### People With Hours (Employee Org)_app (NEW)

Description: `ADDED 2026-11-04 (Fabric app): People with hours who sit in the selected org.`

```dax
IF (
    ISFILTERED ( dim_hierarchy_master[L1] ) || ISFILTERED ( dim_hierarchy_master[L2] ) || ISFILTERED ( dim_hierarchy_master[L3] ),
    CALCULATE (
        [Active Headcount],
        TREATAS (
            SUMMARIZE ( dim_hierarchy_master, dim_hierarchy_master[L1], dim_hierarchy_master[L2], dim_hierarchy_master[L3] ),
            fact_profitability_metrics[employee_L1], fact_profitability_metrics[employee_L2], fact_profitability_metrics[employee_L3]
        )
    ),
    [Active Headcount]
)
```

#### People With Hours (Project Org)_app (NEW)

Description: `ADDED 2026-11-04 (Fabric app): People with hours on the selected org's projects.`

```dax
IF (
    ISFILTERED ( dim_hierarchy_master[L1] ) || ISFILTERED ( dim_hierarchy_master[L2] ) || ISFILTERED ( dim_hierarchy_master[L3] ),
    CALCULATE (
        [Active Headcount],
        TREATAS (
            SUMMARIZE ( dim_hierarchy_master, dim_hierarchy_master[L1], dim_hierarchy_master[L2], dim_hierarchy_master[L3] ),
            fact_profitability_metrics[project_L1], fact_profitability_metrics[project_L2], fact_profitability_metrics[project_L3]
        )
    ),
    [Active Headcount]
)
```

#### Planned Revenue_app (UPDATE)

Description: `FIXED 2026-11-04 (Fabric app): Plan (Backlog) revenue in the selected period; follows the master hierarchy through the financial org.`

```dax
IF (
    ISFILTERED ( dim_hierarchy_master[L1] ) || ISFILTERED ( dim_hierarchy_master[L2] ) || ISFILTERED ( dim_hierarchy_master[L3] ),
    CALCULATE (
        CALCULATE ( SUM ( fact_revenue_metrics[actual_revenue_usd] ), fact_revenue_metrics[scenario] = "Backlog" ),
        TREATAS (
            SUMMARIZE ( dim_hierarchy_master, dim_hierarchy_master[L1], dim_hierarchy_master[L2], dim_hierarchy_master[L3] ),
            fact_revenue_metrics[financial_L1], fact_revenue_metrics[financial_L2], fact_revenue_metrics[financial_L3]
        )
    ),
    CALCULATE ( SUM ( fact_revenue_metrics[actual_revenue_usd] ), fact_revenue_metrics[scenario] = "Backlog" )
)
```

#### Planned Hours_app (UPDATE)

Description: `FIXED 2026-11-04 (Fabric app): Plan (Backlog) hours in the selected period; follows the master hierarchy through the financial org.`

```dax
IF (
    ISFILTERED ( dim_hierarchy_master[L1] ) || ISFILTERED ( dim_hierarchy_master[L2] ) || ISFILTERED ( dim_hierarchy_master[L3] ),
    CALCULATE (
        CALCULATE ( SUM ( fact_revenue_metrics[hours_quantity] ), fact_revenue_metrics[scenario] = "Backlog" ),
        TREATAS (
            SUMMARIZE ( dim_hierarchy_master, dim_hierarchy_master[L1], dim_hierarchy_master[L2], dim_hierarchy_master[L3] ),
            fact_revenue_metrics[financial_L1], fact_revenue_metrics[financial_L2], fact_revenue_metrics[financial_L3]
        )
    ),
    CALCULATE ( SUM ( fact_revenue_metrics[hours_quantity] ), fact_revenue_metrics[scenario] = "Backlog" )
)
```

#### Billed Hours_app (UPDATE)

Description: `FIXED 2026-11-04 (Fabric app): Hours integrated into Project Operations (Actual); follows the master hierarchy through the financial org.`

```dax
IF (
    ISFILTERED ( dim_hierarchy_master[L1] ) || ISFILTERED ( dim_hierarchy_master[L2] ) || ISFILTERED ( dim_hierarchy_master[L3] ),
    CALCULATE (
        CALCULATE ( SUM ( fact_revenue_metrics[hours_quantity] ), fact_revenue_metrics[scenario] = "Actual" ),
        TREATAS (
            SUMMARIZE ( dim_hierarchy_master, dim_hierarchy_master[L1], dim_hierarchy_master[L2], dim_hierarchy_master[L3] ),
            fact_revenue_metrics[financial_L1], fact_revenue_metrics[financial_L2], fact_revenue_metrics[financial_L3]
        )
    ),
    CALCULATE ( SUM ( fact_revenue_metrics[hours_quantity] ), fact_revenue_metrics[scenario] = "Actual" )
)
```
