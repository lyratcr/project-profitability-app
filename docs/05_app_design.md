# App Design — Project Real Profitability (Fabric App)

> Project knowledge file. Draft 2026-11-03, for agreement with Ion and Adan. Every number comes from an `_app` measure (`03_measure_review.md` § 3) or a model column. The app formats and lays out; it doesn't calculate KPIs.

## 1. Audiences and what each needs

| Audience | Question they bring | Main pages |
|---|---|---|
| CFO (Adan, first requester) and executives | Where is the effort going, how many people do we have, what revenue does each FTE produce, how much moves between countries and areas? | P1–P5 |
| Area directors (L1/L2) | My area's people, effort, cross-charges and yield | P1–P5 filtered to their L1/L2 |
| Project Managers | Is my project on plan this week, who logged what, what must be fixed **before Monday's approval closes**? | P6 |

## 2. Global elements

- **Look and feel:** the Auxis Dashboards design system in `design-system/` (read its `CLAUDE.md` and `README.md`): tokens only, `ax-` components (AppShell, PageTabs, Slicer, KpiCard, ChartCard, DataTable, StatusBadge), one spotlight KPI and one accent bar per page, light and dark.
- **Top bar:** app name, page tabs, "Data through" from `[Last Synerion Date_app]` (hours) and `[Last Revenue Date_app]` (revenue), and model refresh from `[Last Refresh Date]`. If the Synerion date is earlier than the Saturday that ends the last complete Sunday–Saturday week, show a warning: "Hours are not current: last day loaded is …".
- **Global filters → DAX:**

| Filter | Column | Default |
|---|---|---|
| Period | `dim_calendar[date]` range (month, quarter, YTD, custom) | Last complete month (P1–P5); current and previous week (P6) |
| Organization | `dim_hierarchy_master[L1] > [L2] > [L3]` (through the TREATAS in the measures) | All |
| Employee country | `fact_profitability_metrics[employee_country]` | All |
| Customer | `dim_project[project_customer]` | All |
| Project | `dim_project[project_key]` (shown as `project_name`) | All (P6: the PM's projects) |

- **Weeks** run **Sunday to Saturday** (Auxis weeks; Ion, 2026-11-04), as `dim_calendar[start_of_week_sun]` / `[end_of_week_sat]`. `dim_calendar[year_week]` is Monday-based ISO and is not used (open item #22). The app works out "this week", "last week" and the Monday review window from the viewer's local date and sends them as `dim_calendar[date]` ranges. No `TODAY()` in DAX.
- **Month-over-month:** use the numeric `… MoM %_app` measures, or query the previous period.

## 3. Pages

### P1 · Effort Distribution (`/effort`)
**Purpose:** where the hours go.
- **Organization view** (whole page, Ion 2026-11-04): Project org (where the work is billed, default) or Employee org (where the people sit); every visual uses the `(Project Org)` or `(Employee Org)` `_app` measures.
- **KPI cards:** `[Synerion Hours (… Org)_app]` with `[Synerion Hours (… Org) MoM %_app]`; `[Productive Share (… Org)_app]` (subtask Regular Time, Activity 01/02 or Productive Time, excluding Holiday and Time Off pay, ÷ all hours; Ion 2026-11-04, #25); overtime hours (`pay_category_description` = Overtime); time off + holiday.
- **Hours by organization:** master hierarchy L1 > L2 > L3 in the selected org view, with share.
- **Hours by customer and project:** top 15 customers with share; drill to project and task (`task_name`).
- **Weekly trend:** last 13 Sunday–Saturday weeks (about 3 months, Ion 2026-11-04) ending with the period, stacked by `pay_category_description`.
- **Shrinkage:** hours by `subtask_category` (productive vs internal codes).

### P2 · Headcount Overview (`/headcount`)
**Purpose:** how many people over time.
- **KPI cards:** `[Headcount (Last Week)_app]` (Sunday–Saturday week that holds the period's last day with hours) with `[Headcount (Last Week) MoM %_app]`; `[People With Hours (Employee Org)_app]` in the period; contractors share (Contractor + GT Contractor; Ion 2026-11-04).
- **Monthly trend:** last 12 months ending with the period (Ion 2026-11-04), `[Headcount (Last Week)_app]` by `dim_calendar[year_month]` (each month shows its last week with data), stacked by `employee_reporting_category`.
- **By country** (`employee_country`) and **by organization** (`employee_L1-L3` through the master hierarchy).
- *Pending decision:* headcount = people who logged time (current measures) or active employees in UKG (needs a new measure on `dim_employee` hire/termination dates).

### P3 · FTE Overview (`/fte`)
**Purpose:** how the people are allocated.
- **FTE = allocation FTE** (Ion with Adan, 2026-11-04, #6): each person counts 1, split across projects by their share of the week's hours, in the last Sunday–Saturday week with hours. Not hours ÷ 40: people work night and special shifts.
- **KPI cards:** `[Allocated FTE (Last Week)_app]` with `[Allocated FTE MoM %_app]`, next to `[Headcount (Last Week)_app]`.
- **Allocated FTE by customer / project:** top 15 customers by FTE, with people for contrast. One person split between two projects counts 0.5 in each.
- **Matrix:** project L1 > L2 > L3 (rows) × last 12 months (columns) of `[Allocated FTE (Last Week)_app]`.
- **People detail:** with a customer or project selected (Ion, 2026-11-04), each person's hours, `[Time Allocation %_app]` and last-week FTE.

### P4 · Intercompany & Cross-Charge (`/flows`)
**Purpose:** hours that cross countries or areas. Replaces the "Analysis Type" field parameter.
- **Toggle:** Intercompany (`intercompany_flow`: CR Local, COL → USA, CR → USA …) or Cross Charge (`cross_charge_flow`: BPO Direct, ITO → DTF …). Hours use the employee org (Ion, 2026-11-04).
- **Matrix:** flow (rows) × the period's months (columns) of `[Synerion Hours (Employee Org)_app]`, with the model's total column. Rows expand to customer → project, and to employee (name) when a customer or project is selected (Ion, 2026-11-04; the full tree is ~27k rows a year).
- **KPI cards:** share of hours that are intercompany; share that are cross-charge; with an L1 area selected, `[Cross-Charge Hours Received_app]`, `[Cross-Charge Hours Lent_app]` and `[Net Cross-Charge Hours_app]` (L1 only: with L2/L3 selected they show its L1, labelled).
- **Flow breakdown** (instead of a Sankey, which Vega-Lite can't draw; Ion 2026-11-04): a decomposition tree, origin → destination (employee/project country, or employee/project L1) → customer → project; pick an item to open the next column.
- Check: February 2026 must total 223,641 h in both views, as in the current report.

### P5 · Revenue & Capacity Yield (`/yield`)
**Purpose:** revenue produced per unit of capacity.
- **Definitions** (Ion with Adan, 2026-11-05, #8): FTE = last-week allocation FTE (`Operational FTE (Last Week)` logic, Sunday–Saturday week); revenue per FTE = Adan's `Revenue per FTE`; annualized = Adan's `Annualized Revenue per FTE` (× 12), the key KPI for Adan. With an org filter, revenue follows the project's financial org and FTE the project org (same projects).
- **KPI cards:**
  - `[Actual Revenue_app]` with `[Actual Revenue MoM %_app]`.
  - `[Allocated FTE (Last Week, Project Org)_app]`.
  - `[Revenue per FTE_app]` with `[Revenue per FTE MoM %_app]`.
  - `[Annualized Revenue per FTE_app]`.
  - Shown for a **single month** (the measures are monthly by design). The period filter is forced to one month on this page.
- **Monthly trend:** revenue (bars) and revenue per FTE (line), last 12 months.
- **By organization (master hierarchy L1 > L2 > L3):** revenue, FTE, revenue per FTE, annualized, MoM.
- **Customers that grew / dropped most:** `[Actual Revenue MoM $_app]`, top 10 each, ranked in the query (TOPN) until `[Customer Rank by Revenue Growth_app]` / `[… Decline_app]` exist (#1).

### P6 · Project Progress, for PMs (`/projects`)
**Purpose:** day-by-day progress of my projects, and the Monday timesheet review.

**Look** (Ion, 2026-11-07): liquid glass on the whole page (filter row, banner, cards, tables), an exception to the Auxis "cards = surface" rule documented in `design-system/README.md`. Other pages keep the solid Auxis cards.

**Project selector.** The PM picks one or more projects. There's no PM field in the model yet (open item #4 in `04`); until it exists, the selection is remembered per user in the browser.

**Monday review banner** (Mondays, and any day until the integration runs):
"Review last week's hours (Sun dd – Sat dd). Synerion approval closes **today at end of day**; the integration to Project Operations runs **Tuesday early morning**." It links to the week table below, filtered to last week.

**KPI cards (whole project life):**
- `[Total Planned Revenue_app]`, `[Revenue Billed to Date_app]`, `[Revenue Left to Bill_app]`.
- `[Billing Progress %_app]`.
- `[Plan End Date_app]` with days left: < 30 days red, < 90 amber.

**This week and last week vs plan.** Two columns (last week, this week to date) × rows:
- `[Synerion Hours_app]`, `[Planned Hours_app]`, `[Hours vs Plan_app]`, `[Hours vs Plan %_app]`.
- `[Planned Revenue_app]`.
- People who logged time.

**Weekly trend (last 12 weeks):** Synerion hours vs planned hours per week (bars + line), with the current week marked as partial.

**Who logged time on this project (selected week):** person, `task_name`, `pay_category_description`, hours on the project, their total hours that week, `[Time Allocation %_app]`, and a flag column:
- **"No hours this week"**: logged on this project in the previous 4 weeks but nothing in the selected week. Needs a model measure; proposed: `Hours Previous 4 Weeks_app` + `Missing This Week_app`.
- **"Unmapped task"**: `task_name` = "Unmapped Task".
- **"Overtime"**: pay category Overtime.

The PM uses this table to ask people for fixes before Monday's approval.

**Revenue by month:** `[Actual Revenue_app]` vs `[Planned Revenue_app]` per month, and `[Revenue vs Plan %_app]`.

**Hours not yet in Project Ops:** `[Hours Not Yet Billed_app]` for the period (logged in Synerion, not yet integrated).

## 4. Dependencies before P6 is useful

Numbers are open items in `04_decisions_and_open_items.md`.

1. **#1** `dim_project` duplicate key fixed: today every project-filtered query fails.
2. **#2** Synerion hours loaded daily, including unapproved time. Without it, P6 shows the last loaded week, which today is 2+ weeks old.
3. **#3** Confirmation that Backlog = full plan (`03_measure_review.md` § 2).
4. **#4** Project manager on `dim_project`, to default the selector to "my projects".

## 5. Out of scope for now

Cost, margin and profitability by cost (cost is in local currency; Project Ops standard cost and roles are outdated). The page structure leaves room for a "Margin" page once cost is fixed.
