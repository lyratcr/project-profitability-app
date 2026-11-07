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
| PAR-401-01 | Sun 2026-10-25 – Sat 10-31 (last full week) | 109 | 104 | 5 | 5 | 18,931 = 18,931 |
| PAR-401-05 | Sun 2026-10-25 – Sat 10-31 | 363 | 350 | 13 | 13 | 53,630 = 53,630 |
| PAR-401-01 | Sun 2026-11-01 – Wed 11-04 (current week to date; hours through Tue 11-03) | 108 | 97 | 11 | 11 | 18,769 = 18,769 |

*Corrected 2026-11-04 (task 2.3):* the first version of this table used 2026-10-27 – 11-02 and 11-03 – 11-09, which are Tuesday–Monday ranges (2026-10-27 is a Tuesday). The measures were right (they use the first date the app sends); the table now uses real **Sunday–Saturday** weeks (Auxis weeks), built by `app/src/lib/weeks.ts`.

No row is flagged while having hours in the week.

**Note for P6:** on the current (partial) week the flag means "nothing logged *yet* this week" (11 people by Wednesday morning). The page should label it that way for the current week, and use the full last week for the Monday review.

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

## 7. Org-aware hours MoM (open item #24): CREATED 2026-11-04

`Synerion Hours MoM %_app` is built on `Synerion Hours_app`, which ignores `dim_hierarchy_master`. P1's hours KPI needs a MoM that follows the org filter in the same org view as the hours it sits next to. Created in the Dev model after Ion's approval (`State = Ready`); re-run against the model measures with identical values (October 2026: no org 1.4517% both; L1 = BPO −1.0153% / −1.0124%; week Oct 25–31, L1 = BPO, 27.99% / 28.17%).

| Measure | Action | Folder | Format |
|---|---|---|---|
| **Synerion Hours (Employee Org) MoM %_app** | NEW | `_app\Hours` | `0.0%` |
| **Synerion Hours (Project Org) MoM %_app** | NEW | `_app\Hours` | `0.0%` |

### Validation (query-scoped, 2026-11-04)

October 2026 vs September 2026:

| Context | Employee Org MoM | Project Org MoM | `Synerion Hours MoM %_app` | Independent check |
|---|---|---|---|---|
| No org | 1.45% | 1.45% | 1.45% | equal to the existing measure ✓ |
| Week Oct 25–31, L1 = BPO | 27.99% | 28.17% | — | (38,940 − 30,425) / 30,425 ✓ (plain SUM of `worked_hours`, `employee_L1`; one month back is Sep 25–30) |
| L1 = BPO | −1.02% | −1.01% | 1.45% (company-wide, wrong under the filter) | employee: (171,790 − 173,552) / 173,552 = −1.02% ✓ (fact `employee_L1`); project: (169,978 − 171,716) / 171,716 = −1.01% ✓ (same master-hierarchy measure; the fact's `project_L1` gives 171,788 / 173,612 because of #21) |

### DAX

#### Synerion Hours (Employee Org) MoM %_app (NEW)

Description: `ADDED 2026-11-04 (Fabric app): Change in employee-org Synerion hours vs the same period one month earlier (numeric); follows the master hierarchy.`

```dax
VAR _lm = CALCULATE ( [Synerion Hours (Employee Org)_app], DATEADD ( dim_calendar[date], -1, MONTH ) )
RETURN DIVIDE ( [Synerion Hours (Employee Org)_app] - _lm, _lm )
```

#### Synerion Hours (Project Org) MoM %_app (NEW)

Description: `ADDED 2026-11-04 (Fabric app): Change in project-org Synerion hours vs the same period one month earlier (numeric); follows the master hierarchy.`

```dax
VAR _lm = CALCULATE ( [Synerion Hours (Project Org)_app], DATEADD ( dim_calendar[date], -1, MONTH ) )
RETURN DIVIDE ( [Synerion Hours (Project Org)_app] - _lm, _lm )
```

## 8. Productive share (open item #25): CREATED 2026-11-04

`subtask_category` holds the Synerion auxiliar code: "Default" becomes "Regular Time", a null code "Productive Time" (none in 2026), and named codes keep their name. Ion (2026-11-04): **productive = subtask Regular Time, Activity 01, Activity 02 or Productive Time, excluding pay categories Holiday and Time Off**, over all Synerion hours. One measure per org view, like the hours measures (P1 has a page-level employee / project org toggle). Created in the Dev model after Ion's approval (`State = Ready`); re-run against the model measures with identical values (October 2026: no org 93.6261%; L1 = BPO 92.3229% / 92.4402%; week Oct 25–31, L1 = BPO, 92.9730% / 93.0772%).

| Measure | Action | Folder | Format |
|---|---|---|---|
| **Productive Share (Employee Org)_app** | NEW | `_app\Hours` | `0.0%` |
| **Productive Share (Project Org)_app** | NEW | `_app\Hours` | `0.0%` |

### Validation (query-scoped, 2026-11-04)

| Context | Employee org | Project org | Independent check (plain SUM of `worked_hours`, `employee_L1`) |
|---|---|---|---|
| October 2026, no org | 93.6% | 93.6% | 253,917 / 271,203 (from the subtask × pay category breakdown) ✓ |
| October 2026, L1 = BPO | 92.3% | 92.4% | 158,601 / 171,790 = 92.3% ✓ |
| Week Oct 25–31, no org | 94.3% | 94.3% | — |
| Week Oct 25–31, L1 = BPO | 93.0% | 93.1% | 36,204 / 38,940 = 93.0% ✓ |

### DAX

#### Productive Share (Employee Org)_app (NEW)

Description: `ADDED 2026-11-04 (Fabric app): Share of employee-org Synerion hours that are productive: subtask Regular Time, Activity 01/02 or Productive Time, excluding Holiday and Time Off pay.`

```dax
DIVIDE (
    CALCULATE (
        [Synerion Hours (Employee Org)_app],
        KEEPFILTERS ( fact_profitability_metrics[subtask_category] IN { "Regular Time", "Activity 01", "Activity 02", "Productive Time" } ),
        KEEPFILTERS ( NOT fact_profitability_metrics[pay_category_description] IN { "Holiday", "Time Off" } )
    ),
    [Synerion Hours (Employee Org)_app]
)
```

#### Productive Share (Project Org)_app (NEW)

Description: `ADDED 2026-11-04 (Fabric app): Share of project-org Synerion hours that are productive: subtask Regular Time, Activity 01/02 or Productive Time, excluding Holiday and Time Off pay.`

```dax
DIVIDE (
    CALCULATE (
        [Synerion Hours (Project Org)_app],
        KEEPFILTERS ( fact_profitability_metrics[subtask_category] IN { "Regular Time", "Activity 01", "Activity 02", "Productive Time" } ),
        KEEPFILTERS ( NOT fact_profitability_metrics[pay_category_description] IN { "Holiday", "Time Off" } )
    ),
    [Synerion Hours (Project Org)_app]
)
```

## 9. Headcount on Sunday–Saturday weeks (open item #22, P2): CREATED 2026-11-04

`Headcount (Last Week)_app` points to the original `[Operational Headcount (Last Week)]`, which finds "the last week" with `dim_calendar[year_week]`: Monday-based ISO weeks with broken year-end labels (#22). October 2026 counts Mon Oct 26 – Sun Nov 1 (1,562) and December 2025 jumps to 1,767. P2 needs it on Auxis weeks (Sunday–Saturday). Nothing else uses the `_app` measure (`Revenue per Head_app` uses the original). Updated / created in the Dev model after Ion's approval (`State = Ready`); re-run against the model measures with identical values (Dec 2025 1,326; Sep 2026 1,543; Oct 2026 1,561 / +1.1666%; Oct 2026 L1 = BPO 992 / −1.1952%). The original `Operational Headcount (Last Week)` is unchanged (the Power BI report uses it).

The week is the Sunday–Saturday week that holds **the last day with hours in the period** (option A). It can run past the period end, like the original: September 2026 = Sep 27 – Oct 3. The alternative, the last complete week ending inside the period (option B), was dropped: for a month in progress (November 2026, hours to Nov 3) it returns October's week, outside the period. The last day ignores every filter on the fact except the calendar (`ALLEXCEPT`), so stacked categories, countries and orgs share one week.

| Measure | Action | Folder | Format |
|---|---|---|---|
| **Headcount (Last Week)_app** | UPDATE | `_app\People` | `#,0` |
| **Headcount (Last Week) MoM %_app** | NEW | `_app\People` | `0.0%` |

### Validation (query-scoped, 2026-11-04)

| Month | Original (`year_week`) | Proposed | Week | Independent check (DISTINCTCOUNT of `ukg_employee_id` in the week) |
|---|---|---|---|---|
| Dec 2025 | 1,767 | 1,326 | Dec 28 – Jan 3 | 1,326 ✓ |
| Sep 2026 | 1,544 | 1,543 | Sep 27 – Oct 3 | 1,543 ✓ |
| Oct 2026 | 1,562 | 1,561 | Oct 25 – 31 | 1,561 ✓ |
| Oct 2026, L1 = BPO (employee org) | — | 992 | Oct 25 – 31 | 992 ✓ (fact `employee_L1`) |

MoM, October 2026: all orgs +1.17% = (1,561 − 1,543) / 1,543 ✓; L1 = BPO −1.20% = (992 − 1,004) / 1,004 ✓. Contractors (Contractor + GT Contractor, sliced in the query) 95 ✓.

### DAX

#### Headcount (Last Week)_app (UPDATE)

Description: `FIXED 2026-11-04 (Fabric app): People who logged time in the Sunday–Saturday week that holds the last day with hours in the period (may run past the period end); follows the master hierarchy through the employee org.`

```dax
VAR _last = CALCULATE ( MAX ( fact_profitability_metrics[transaction_date] ), ALLEXCEPT ( fact_profitability_metrics, dim_calendar ) )
VAR _start = _last - WEEKDAY ( _last, 1 ) + 1
RETURN
    IF (
        ISFILTERED ( dim_hierarchy_master[L1] ) || ISFILTERED ( dim_hierarchy_master[L2] ) || ISFILTERED ( dim_hierarchy_master[L3] ),
        CALCULATE (
            DISTINCTCOUNT ( fact_profitability_metrics[ukg_employee_id] ),
            REMOVEFILTERS ( dim_calendar ),
            DATESBETWEEN ( dim_calendar[date], _start, _start + 6 ),
            TREATAS (
                SUMMARIZE ( dim_hierarchy_master, dim_hierarchy_master[L1], dim_hierarchy_master[L2], dim_hierarchy_master[L3] ),
                fact_profitability_metrics[employee_L1], fact_profitability_metrics[employee_L2], fact_profitability_metrics[employee_L3]
            )
        ),
        CALCULATE (
            DISTINCTCOUNT ( fact_profitability_metrics[ukg_employee_id] ),
            REMOVEFILTERS ( dim_calendar ),
            DATESBETWEEN ( dim_calendar[date], _start, _start + 6 )
        )
    )
```

#### Headcount (Last Week) MoM %_app (NEW)

Description: `ADDED 2026-11-04 (Fabric app): Change in last-week headcount vs the same period one month earlier (numeric).`

```dax
VAR _lm = CALCULATE ( [Headcount (Last Week)_app], DATEADD ( dim_calendar[date], -1, MONTH ) )
RETURN DIVIDE ( [Headcount (Last Week)_app] - _lm, _lm )
```

## 10. Allocated FTE and time allocation (open items #6, #22, P3): APPLIED 2026-11-04

Ion (2026-11-04): FTE is **allocation FTE**, the logic of the original `Operational FTE % (Last Week)`, agreed with Adan. Not hours ÷ 40: people work night shifts and special schedules. Each person counts 1, split across projects by their share of that week's hours. Closes #6.

Validation of the originals (October 2026; independent check = per person, hours in the slice ÷ all their hours in Sun Oct 25 – Sat Oct 31, summed):

| Context | `Operational FTE % (Last Week)` | `Operational FTE (Last Week)` = `Allocated FTE (Last Week)_app` | Independent |
|---|---|---|---|
| All orgs | 1,562 | 1,562 | 1,561 |
| L1 = BPO | **1,562** (ignores the org filter: the SUMX is a variable, evaluated before the CALCULATE with TREATAS) | 992 | 992 |
| Project PAR-401-01 | 101.2 | 101.2 | 101.2 |

Both originals find the week with `year_week` (Monday ISO, #22: October counts Oct 26 – Nov 1). The person-level `FTE Time Allocation %` (behind `Time Allocation %_app`) only removes `dim_project` and master-hierarchy filters from its denominator, so with the app's project filter on `fact_profitability_metrics[project_key]` (no `dim_project` until #1) every person shows 100% (PAR-401-01, October 2026: 108 of 108 at 100%; 4 actually split their time).

`_app` changes (the originals are untouched; the Power BI report uses them), applied after Ion's approval (`State = Ready`) with the desktop `powerbi-modeling-mcp` (the project server hung 30 min and applied nothing). Re-run against the model measures with identical values: October 2026 1,561.0 / MoM 1.1666%; L1 = BPO 992.0; PAR-401-01 101.2; December 2025 1,326.0; time allocation of the top PAR-401-01 person 63.6364%.

| Measure | Action | Folder | Format |
|---|---|---|---|
| **Allocated FTE (Last Week)_app** | UPDATE | `_app\People` | `#,0.0` |
| **Time Allocation %_app** | UPDATE | `_app\People` | `0.0%` |

`Allocated FTE MoM %_app` follows automatically (nothing else uses these two).

- FTE: the same Sunday–Saturday week as `Headcount (Last Week)_app` (the week that holds the period's last day with hours); people iterated over that week (not the period, which missed 4 people in December 2025 who only logged Jan 1–3); employee-org mapping inside the CALCULATE so it applies.
- Time allocation: denominator = the person's hours in the period with every non-calendar filter removed (`ALLEXCEPT`); blank above person level.

### Validation (query-scoped, 2026-11-04)

| Context | Proposed FTE | Headcount (Last Week)_app | Independent |
|---|---|---|---|
| October 2026, all orgs | 1,561 (MoM +1.17%) | 1,561 | 1,561 |
| October 2026, L1 = BPO | 992 (MoM −1.20%) | 992 | 992 |
| October 2026, PAR-401-01 | 101.2 (MoM −2.89%) | 104 | 101.2 |
| Nov 2025 – Oct 2026, each month | equal to headcount every month (e.g. Dec 2025 1,326) | | |

Time allocation, PAR-401-01, October 2026: top person 224 h on the project of 352 h in the month = 63.6% (original 100%); three more at 18.2% (32 / 176, 36 / 198, 32 / 176).

### DAX

#### Allocated FTE (Last Week)_app (UPDATE)

Description: `FIXED 2026-11-04 (Fabric app): Allocation FTE in the Sunday–Saturday week that holds the last day with hours in the period: each person's hours in the context ÷ all their hours that week (a person totals 1); follows the master hierarchy through the employee org.`

```dax
VAR _last = CALCULATE ( MAX ( fact_profitability_metrics[transaction_date] ), ALLEXCEPT ( fact_profitability_metrics, dim_calendar ) )
VAR _start = _last - WEEKDAY ( _last, 1 ) + 1
RETURN
    IF (
        ISFILTERED ( dim_hierarchy_master[L1] ) || ISFILTERED ( dim_hierarchy_master[L2] ) || ISFILTERED ( dim_hierarchy_master[L3] ),
        CALCULATE (
            SUMX (
                CALCULATETABLE ( VALUES ( fact_profitability_metrics[ukg_employee_id] ), REMOVEFILTERS ( dim_calendar ), DATESBETWEEN ( dim_calendar[date], _start, _start + 6 ) ),
                VAR _emp = fact_profitability_metrics[ukg_employee_id]
                VAR _ctx = CALCULATE ( SUM ( fact_profitability_metrics[worked_hours] ), REMOVEFILTERS ( dim_calendar ), DATESBETWEEN ( dim_calendar[date], _start, _start + 6 ) )
                VAR _tot = CALCULATE ( SUM ( fact_profitability_metrics[worked_hours] ), REMOVEFILTERS ( fact_profitability_metrics ), fact_profitability_metrics[ukg_employee_id] = _emp, DATESBETWEEN ( dim_calendar[date], _start, _start + 6 ) )
                RETURN DIVIDE ( _ctx, _tot )
            ),
            TREATAS (
                SUMMARIZE ( dim_hierarchy_master, dim_hierarchy_master[L1], dim_hierarchy_master[L2], dim_hierarchy_master[L3] ),
                fact_profitability_metrics[employee_L1], fact_profitability_metrics[employee_L2], fact_profitability_metrics[employee_L3]
            )
        ),
        SUMX (
            CALCULATETABLE ( VALUES ( fact_profitability_metrics[ukg_employee_id] ), REMOVEFILTERS ( dim_calendar ), DATESBETWEEN ( dim_calendar[date], _start, _start + 6 ) ),
            VAR _emp = fact_profitability_metrics[ukg_employee_id]
            VAR _ctx = CALCULATE ( SUM ( fact_profitability_metrics[worked_hours] ), REMOVEFILTERS ( dim_calendar ), DATESBETWEEN ( dim_calendar[date], _start, _start + 6 ) )
            VAR _tot = CALCULATE ( SUM ( fact_profitability_metrics[worked_hours] ), REMOVEFILTERS ( fact_profitability_metrics ), fact_profitability_metrics[ukg_employee_id] = _emp, DATESBETWEEN ( dim_calendar[date], _start, _start + 6 ) )
            RETURN DIVIDE ( _ctx, _tot )
        )
    )
```

#### Time Allocation %_app (UPDATE)

Description: `FIXED 2026-11-04 (Fabric app): Share of a person's hours in the period that fall in the row's context (project, customer, org); blank above person level.`

```dax
IF (
    HASONEVALUE ( fact_profitability_metrics[ukg_employee_id] ),
    DIVIDE (
        SUM ( fact_profitability_metrics[worked_hours] ),
        CALCULATE ( SUM ( fact_profitability_metrics[worked_hours] ), ALLEXCEPT ( fact_profitability_metrics, dim_calendar, fact_profitability_metrics[ukg_employee_id] ) )
    )
)
```

## 11. Revenue per FTE on project-org allocation FTE (open item #8, P5): APPLIED 2026-11-05

Ion (2026-11-05, with Adan): FTE = `Operational FTE (Last Week)` (last week, not a month average: closes #8); revenue per FTE = Adan's `Revenue per FTE` (revenue ÷ that FTE); annualized = Adan's `Annualized Revenue per FTE` (× 12), "very important for Adan". The `_app` versions keep those formulas with two changes Ion approved: the Sunday–Saturday week (#22, like `Allocated FTE (Last Week)_app`) and, with an L1/L2/L3 selected, the FTE of the selected org's **projects** (project org), so revenue (financial org of the project) and FTE measure the same projects. The originals are untouched. Applied after Ion's approval of the DAX with the desktop `powerbi-modeling-mcp` (`State = Ready`); re-run against the model measures with identical values (October 2026: all 1,561.0 / $3,928.11 / $47,137.27; L1 = BPO 980.4 / $3,426.88 / MoM −2.0196%).

| Measure | Action | Folder | Format |
|---|---|---|---|
| **Allocated FTE (Last Week, Project Org)_app** | NEW | `_app\People` | `#,0.0` |
| **Revenue per FTE_app** | UPDATE | `_app\Yield` | `\$#,0;(\$#,0);\$#,0` |
| **Annualized Revenue per FTE_app** | UPDATE | `_app\Yield` | `\$#,0;(\$#,0);\$#,0` |

`Revenue per FTE MoM %_app` follows automatically. Nothing else uses these.

### Validation (query-scoped, 2026-11-05)

| Context | Revenue | FTE (project org) | Revenue per FTE | Annualized | MoM | Original (Monday week, employee org) |
|---|---|---|---|---|---|---|
| October 2026, all | $6,131,773 | 1,561 (= `Allocated FTE (Last Week)_app`) | $3,928 = 6,131,773 ÷ 1,561 | $47,137 | +0.48% | $3,926 / $47,107 |
| October 2026, L1 = BPO | $3,359,710 (= SUM `actual_revenue_usd`, Actual, `financial_L1` = BPO) | 980.4 (= independent per-person sum, Oct 25–31, combos in the hierarchy) | $3,427 | $41,123 | −2.02% (Sep $3,498) | $3,387 / $40,642 |

Caveat (#21): with the fact's own `project_L1` = BPO the FTE is 991.4; the 11.0 FTE gap is BPO / RCM / POD5, a project-org combo missing from `dim_hierarchy_master`. Until gold adds the project org to the hierarchy, project-org FTE under a filter misses those people (BPO revenue per FTE $3,427 instead of $3,389).

### DAX

#### Allocated FTE (Last Week, Project Org)_app (NEW)

Description: `ADDED 2026-11-05 (Fabric app): Allocation FTE in the last Sunday–Saturday week with hours, mapping the master hierarchy to the project org: the share of people's time on the selected org's projects. Without an org filter it equals Allocated FTE (Last Week)_app.`

```dax
VAR _last = CALCULATE ( MAX ( fact_profitability_metrics[transaction_date] ), ALLEXCEPT ( fact_profitability_metrics, dim_calendar ) )
VAR _start = _last - WEEKDAY ( _last, 1 ) + 1
RETURN
    IF (
        ISFILTERED ( dim_hierarchy_master[L1] ) || ISFILTERED ( dim_hierarchy_master[L2] ) || ISFILTERED ( dim_hierarchy_master[L3] ),
        CALCULATE (
            SUMX (
                CALCULATETABLE ( VALUES ( fact_profitability_metrics[ukg_employee_id] ), REMOVEFILTERS ( dim_calendar ), DATESBETWEEN ( dim_calendar[date], _start, _start + 6 ) ),
                VAR _emp = fact_profitability_metrics[ukg_employee_id]
                VAR _ctx = CALCULATE ( SUM ( fact_profitability_metrics[worked_hours] ), REMOVEFILTERS ( dim_calendar ), DATESBETWEEN ( dim_calendar[date], _start, _start + 6 ) )
                VAR _tot = CALCULATE ( SUM ( fact_profitability_metrics[worked_hours] ), REMOVEFILTERS ( fact_profitability_metrics ), fact_profitability_metrics[ukg_employee_id] = _emp, DATESBETWEEN ( dim_calendar[date], _start, _start + 6 ) )
                RETURN DIVIDE ( _ctx, _tot )
            ),
            TREATAS (
                SUMMARIZE ( dim_hierarchy_master, dim_hierarchy_master[L1], dim_hierarchy_master[L2], dim_hierarchy_master[L3] ),
                fact_profitability_metrics[project_L1], fact_profitability_metrics[project_L2], fact_profitability_metrics[project_L3]
            )
        ),
        [Allocated FTE (Last Week)_app]
    )
```

#### Revenue per FTE_app (UPDATE)

Description: `FIXED 2026-11-05 (Fabric app): Adan's Revenue per FTE (actual revenue ÷ last-week allocation FTE) on the Sunday–Saturday week and, with an org filter, the project org's FTE. Monthly context only.`

```dax
DIVIDE ( [Actual Revenue_app], [Allocated FTE (Last Week, Project Org)_app], 0 )
```

#### Annualized Revenue per FTE_app (UPDATE)

Description: `FIXED 2026-11-05 (Fabric app): Adan's Annualized Revenue per FTE (monthly revenue per FTE × 12) on the Sunday–Saturday week and, with an org filter, the project org's FTE. Valid for a single month only.`

```dax
DIVIDE ( [Actual Revenue_app], [Allocated FTE (Last Week, Project Org)_app], BLANK () ) * 12
```

## 12. Hours vs plan without plan (open item #26, P6): PROPOSED 2026-11-06

`Hours vs Plan_app` is `[Synerion Hours_app] - [Planned Hours_app]`, so a week with no plan rows (most weeks of a Fixed Fee project) shows all its hours as a gap. Proposed: blank when the period has no plan. `Hours vs Plan %_app` is already blank without plan. Pending Ion's approval; nothing changed in the model.

#### Hours vs Plan_app (UPDATE)

Description: `FIXED 2026-11-06 (Fabric app): Synerion minus planned hours; blank when the period has no plan hours. Project level only.`

```dax
IF ( NOT ISBLANK ( [Planned Hours_app] ), [Synerion Hours_app] - [Planned Hours_app] )
```

### Validation (query-scoped, 2026-11-06)

| Project | Week (Sun–Sat) | Current | Proposed |
|---|---|---|---|
| PAR-401-05 (Fixed Fee) | Oct 25–31 (no plan rows) | 13,554 | blank |
| PAR-401-01 | Nov 1–7, to date (holds the 1st) | 2,386 | 2,386 |
| UIP-101-01 (T&M) | Oct 25–31 | −32 | −32 |
| UIP-101-01 (T&M) | Nov 1–7, to date (no plan rows) | 40 | blank |

