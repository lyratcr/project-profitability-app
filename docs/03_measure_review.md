# Measure Review — SM_Corp_Project_Real_Profitability

> Project knowledge file. Review of the 55 measures in `_Measures`, checked against the published model on 2026-11-03. Verdicts: **OK** (use as is), **OK with caveat**, **Fix** (create an `_app` version, never edit the original), **Report only** (formatting for the Power BI report; the app doesn't need it).

## 1. Summary

| Measure | Verdict | Note |
|---|---|---|
| `Total Worked Hours` | OK | `SUM(worked_hours)`: Synerion hours. Ignores `dim_hierarchy_master`. |
| `Total Revenue` | **Fix** | Sums Actual **and** Backlog: $348.1 M vs $121.2 M actual. → `Actual Revenue_app` |
| `Total Revenue (Master Hierarchy)` | OK with caveat | Actual only; TREATAS to `financial_L1-L3` when the master hierarchy is filtered. The hierarchy only has 2026+ combos. |
| `LTD Actual Revenue` | OK | Actual, all dates (ignores the date filter). |
| `LTD Backlog` | OK with caveat | Backlog, all dates = the **whole plan / contract value** (not "remaining"). Its description is copied from LTD Actual. → rename in the app to "Total plan". |
| `Remaining Backlog` | OK | Plan − actual billed. |
| `Total Contract Value` | OK (redundant) | Actual + (Plan − Actual) = Plan; same value as `LTD Backlog`. |
| `Project Progress %` | OK | Actual LTD ÷ plan LTD (53.4% overall). |
| `Project End Date` (+ Label, Color, SVG) | OK / Report only | Last backlog date. Label and color use `TODAY()` (UTC) and Spanish labels; the app renders its own. |
| `Active Headcount` | OK | Distinct employees with hours in the period (2,866 all time). |
| `Operational Headcount (Last Week)` | OK | Distinct employees in the **last week with data** inside the current filter (1,531 for W42). Uses the employee org with the master hierarchy. Good for monthly trends: each month shows its own last week. |
| `Operational FTE (Last Week)` | OK with caveat | **Allocation FTE**: each person's hours in the slice ÷ their total hours that week. One person = 1.0 split across projects, so the company total equals headcount (1,531), not hours ÷ 40. Right for "how many people does this project/area use". |
| `Operational FTE % (Last Week)` | OK (duplicate) | Same result as above (1,531); only the TREATAS order differs. Name says "%" but returns FTEs. Pick one. |
| `Operational FTE (Last Week) LIGHT` | OK (duplicate) | Same, without the master-hierarchy branch. |
| `FTE Time Allocation %` | OK | Share of an employee's hours in the slice over the period. |
| `Revenue per FTE` | OK with caveat | Revenue in the filter ÷ last-week FTE. Meaningful **only in a monthly context** (unfiltered it divides all-time revenue: $79 k). |
| `Annualized Revenue per FTE` | OK with caveat | `Revenue per FTE` × 12: only valid when the filter is one month. |
| `Revenue per Headcount` | OK with caveat | Same as Revenue per FTE, using headcount. |
| `Cross-Charge Hours In / Out`, `Net Cross-Charge Hours` | OK | In = others' people on my L1's projects; Out = my people on others' projects. L1 only; without a master-hierarchy filter In = Out. |
| `Last Month Revenue (Master Hierarchy)`, `Revenue MoM $ (Master Hierarchy)` | OK | `DATEADD(-1, MONTH)`. |
| `Revenue MoM Rank Top / Bottom` | OK | Customers ranked by revenue change. |
| `Revenue MoM %`, `FTE MoM %`, `Hours MoM %`, `Rev / FTE MoM %`, `Ann. Rev per FTE MoM %` | **Report only** | Return **text** (arrow + formatted %). The app needs numbers → numeric `_app` versions. |
| `Last Month Revenue`, `Last Month FTEs`, `Last Month Hours`, `Last Month Rev / FTE`, `Last Month Ann. Rev per FTE` | Report only | Text labels ("vs 1,234 Last Month"). |
| `CF *`, `SVG *`, `Project End Date Color` | Report only | Colors and SVG for Power BI. |
| `Validation Window Hours / Label` | **Fix** | Monday logic is right (Monday → last week; otherwise this week), but `TODAY()` is UTC and returns blank while data is stale. The app should pass the window dates. |
| `Total Cost`, `Margin $`, `Margin %` | **Out of scope** | Cost is in local currency; margin also uses the wrong `Total Revenue`. Hide in the app. |
| `Last Refresh Date` | OK | Pipeline end time, as text in EST. |

## 2. What "Backlog" means here

`fact_revenue_metrics` Backlog rows exist for **past and future** dates. Month by month, backlog is close to actual in past months (e.g. 2026-09: actual $6.03 M, backlog $6.10 M) and continues alone into the future. So Backlog = **the full planned revenue schedule** (the plan), and:

- `LTD Backlog` = total plan = contract value.
- `Remaining Backlog` = plan − billed to date.
- **Plan for a week** = Backlog with the date in that week. Backlog is daily, so weekly plan vs weekly Synerion hours works.

**To confirm with Finance:** that Backlog is the plan (estimate at completion) and not only the unbilled remainder.

## 3. The `_app` layer: clear names for the app (created 2026-11-04; final DAX in `08_app_measures.md`)

Ion asked for names that say what each number is. Originals are **not renamed**: the existing Power BI report binds to them by name and would break. Instead every measure the app uses gets an `_app` version in table `_Measures`, folder `_app\<topic>`. Where the original logic is right, the `_app` measure just points to it, so the DAX lives in one place.

### 3.1 Name map

| Topic | Original | `_app` name | Definition |
|---|---|---|---|
| Hours | `Total Worked Hours` | **Synerion Hours_app** | `= [Total Worked Hours]` |
| Hours | `Hours MoM %` (text) | **Synerion Hours MoM %_app** | numeric, § 3.2 |
| Hours | `Cross-Charge Hours In` | **Cross-Charge Hours Received_app** | `= [Cross-Charge Hours In]` (other areas' people on my area's projects) |
| Hours | `Cross-Charge Hours Out` | **Cross-Charge Hours Lent_app** | `= [Cross-Charge Hours Out]` (my people on other areas' projects) |
| Hours | `Net Cross-Charge Hours` | **Net Cross-Charge Hours_app** | `= [Net Cross-Charge Hours]` |
| Hours | `Validation Window Hours / Label` | *(none)* | the app passes the week as a date filter |
| People | `Active Headcount` | **People With Hours_app** | `= [Active Headcount]` (people who logged time in the period) |
| People | `Operational Headcount (Last Week)` | **Headcount (Last Week)_app** | `= [Operational Headcount (Last Week)]` |
| People | `Operational FTE (Last Week)`, `… %`, `… LIGHT` | **Allocated FTE (Last Week)_app** | `= [Operational FTE (Last Week)]` (one, not three) |
| People | `FTE Time Allocation %` | **Time Allocation %_app** | `= [FTE Time Allocation %]` |
| People | `FTE MoM %` (text) | **Allocated FTE MoM %_app** | numeric, § 3.2 |
| Revenue | `Total Revenue` ✗, `Total Revenue (Master Hierarchy)` | **Actual Revenue_app** | `= [Total Revenue (Master Hierarchy)]` (actual only, reacts to the master hierarchy) |
| Revenue | `Last Month Revenue (Master Hierarchy)` | **Actual Revenue Last Month_app** | `= [Last Month Revenue (Master Hierarchy)]` |
| Revenue | `Revenue MoM $ (Master Hierarchy)` | **Actual Revenue MoM $_app** | `= [Revenue MoM $ (Master Hierarchy)]` |
| Revenue | `Revenue MoM %` (text) | **Actual Revenue MoM %_app** | numeric, § 3.2 |
| Revenue | `Revenue MoM Rank Top / Bottom` | **Customer Rank by Revenue Growth_app / Decline_app** | `= [Revenue MoM Rank Top]` / `[… Bottom]` |
| Yield | `Revenue per FTE` | **Revenue per FTE_app** | `= [Revenue per FTE]` (monthly context only) |
| Yield | `Annualized Revenue per FTE` | **Annualized Revenue per FTE_app** | `= [Annualized Revenue per FTE]` |
| Yield | `Revenue per Headcount` | **Revenue per Head_app** | `= [Revenue per Headcount]` |
| Yield | `Rev / FTE MoM %` (text) | **Revenue per FTE MoM %_app** | numeric, § 3.2 |
| Projects | `LTD Actual Revenue` | **Revenue Billed to Date_app** | `= [LTD Actual Revenue]` |
| Projects | `LTD Backlog`, `Total Contract Value` | **Total Planned Revenue_app** | `= [LTD Backlog]` (whole plan; the two originals are equal) |
| Projects | `Remaining Backlog` | **Revenue Left to Bill_app** | `= [Remaining Backlog]` |
| Projects | `Project Progress %` | **Billing Progress %_app** | `= [Project Progress %]` |
| Projects | `Project End Date` | **Plan End Date_app** | `= [Project End Date]` |
| Projects | *(new)* | **Planned Revenue_app** | Backlog in the selected period, § 3.2 |
| Projects | *(new)* | **Planned Hours_app**, **Billed Hours_app**, **Hours vs Plan_app**, **Hours vs Plan %_app**, **Revenue vs Plan_app**, **Revenue vs Plan %_app**, **Hours Not Yet Billed_app** | § 3.2 |
| Data health | `Last Refresh Date` | *(use as is)* | |
| Data health | *(new)* | **Last Synerion Date_app**, **Last Revenue Date_app** | § 3.2 |
| Hidden in the app | `Total Cost`, `Margin $`, `Margin %`, `CF *`, `SVG *`, `Last Month …` text labels, `Project End Date Label / Color` | — | cost out of scope; formatting is done in the app |

### 3.2 New logic (validated as query-scoped measures on 2026-11-03)

```dax
Planned Revenue_app        = CALCULATE ( SUM ( fact_revenue_metrics[actual_revenue_usd] ), fact_revenue_metrics[scenario] = "Backlog" )
Planned Hours_app          = CALCULATE ( SUM ( fact_revenue_metrics[hours_quantity] ), fact_revenue_metrics[scenario] = "Backlog" )
Billed Hours_app           = CALCULATE ( SUM ( fact_revenue_metrics[hours_quantity] ), fact_revenue_metrics[scenario] = "Actual" )
Revenue vs Plan_app        = [Actual Revenue_app] - [Planned Revenue_app]
Revenue vs Plan %_app      = DIVIDE ( [Actual Revenue_app], [Planned Revenue_app] )
Hours vs Plan_app          = [Synerion Hours_app] - [Planned Hours_app]
Hours vs Plan %_app        = DIVIDE ( [Synerion Hours_app], [Planned Hours_app] )
Hours Not Yet Billed_app   = [Synerion Hours_app] - [Billed Hours_app]   -- in Synerion, not yet in Project Ops

Synerion Hours MoM %_app   = VAR _lm = CALCULATE ( [Synerion Hours_app], DATEADD ( dim_calendar[date], -1, MONTH ) ) RETURN DIVIDE ( [Synerion Hours_app] - _lm, _lm )
Allocated FTE MoM %_app    = VAR _lm = CALCULATE ( [Allocated FTE (Last Week)_app], DATEADD ( dim_calendar[date], -1, MONTH ) ) RETURN DIVIDE ( [Allocated FTE (Last Week)_app] - _lm, _lm )
Actual Revenue MoM %_app   = VAR _lm = [Actual Revenue Last Month_app] RETURN DIVIDE ( [Actual Revenue_app] - _lm, _lm )
Revenue per FTE MoM %_app  = VAR _lm = CALCULATE ( [Revenue per FTE_app], DATEADD ( dim_calendar[date], -1, MONTH ) ) RETURN DIVIDE ( [Revenue per FTE_app] - _lm, _lm )

Last Synerion Date_app     = CALCULATE ( MAX ( fact_profitability_metrics[transaction_date] ), REMOVEFILTERS () )
Last Revenue Date_app      = CALCULATE ( MAX ( fact_revenue_metrics[transaction_date] ), fact_revenue_metrics[scenario] = "Actual", REMOVEFILTERS () )
```

Check, September 2026 (all projects): actual revenue $6,033,393 (updated 2026-11-04 after the Project Ops refresh; was $6,031,963) · planned revenue $6,099,926 · Synerion hours 267,322 · planned hours 30,779 · billed hours 30,784 · hours MoM +4.4% · revenue MoM +3.8% · last Synerion date 2026-10-17.

Notes:
- Hours vs plan compares at **project** level: the plan has no employee. Company-wide, Synerion hours include internal and non-billable time, so the ratio only means something per project.
- Projects with no plan hours (some fixed fee) show blank, not 0%.
- Weekly windows (this week, last week, Monday review) are passed by the app as `dim_calendar[date]` ranges.
- `Actual Revenue_app` points to the Master Hierarchy version so one measure works with or without the org slicer.

## 4. Open questions on measures

1. Is Backlog the full plan (EAC) or the unbilled remainder? (§ 2)
2. Which FTE definition does Adan want on the FTE page: **allocation FTE** (current measure; total = headcount) or **capacity FTE** (hours ÷ 40 per week)? They differ for part-time people and overtime.
3. Revenue per FTE uses **last-week** FTE for a **monthly** revenue. Keep it, or use the month's average FTE?
4. Headcount Overview: is "headcount" people who logged time (current measures) or active employees in UKG (`dim_employee` hire/termination dates)? The second needs a new measure.
