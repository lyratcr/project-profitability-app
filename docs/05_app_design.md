# App Design — Project Real Profitability (Fabric App)

> Project knowledge file. Draft 2026-11-03, for agreement with Ion and Adan. Every number comes from an `_app` measure (`03_measure_review.md` § 3) or a model column. The app formats and lays out; it doesn't calculate KPIs.

## 1. Audiences and what each needs

| Audience | Question they bring | Main pages |
|---|---|---|
| CFO (Adan, first requester) and executives | Where is the effort going, how many people do we have, what revenue does each FTE produce, how much moves between countries and areas? | P1–P5 |
| Area directors (L1/L2) | My area's people, effort, cross-charges and yield | P1–P5 filtered to their L1/L2 |
| Project Managers | Is my project on plan this week, who logged what, what must be fixed **before Monday's approval closes**? | P6 |

## 2. Global elements

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
- **KPI cards:** `[Synerion Hours_app]` with `[Synerion Hours MoM %_app]`; productive share (hours with `subtask_category` = Productive Time ÷ total); overtime hours (`pay_category_description` = Overtime); time off + holiday.
- **Hours by organization:** `project_L1 > L2 > L3` (where the work is billed) vs `employee_L1 > L2 > L3` (where the people sit), selectable.
- **Hours by customer and project:** top 15 with share; drill to task (`task_name`).
- **Weekly trend:** 12–26 weeks of hours, stacked by `pay_category_description`.
- **Shrinkage:** hours by `subtask_category` (productive vs internal codes).

### P2 · Headcount Overview (`/headcount`)
**Purpose:** how many people over time.
- **KPI cards:** `[Headcount (Last Week)_app]` with MoM; `[People With Hours_app]` in the period; contractors share.
- **Monthly trend:** `[Headcount (Last Week)_app]` by `dim_calendar[year_month]` (each month shows its last week with data), stacked by `employee_reporting_category`.
- **By country** (`employee_country`) and **by organization** (`employee_L1-L3` through the master hierarchy).
- *Pending decision:* headcount = people who logged time (current measures) or active employees in UKG (needs a new measure on `dim_employee` hire/termination dates).

### P3 · FTE Overview (`/fte`)
**Purpose:** how the people are allocated.
- **KPI cards:** `[Allocated FTE (Last Week)_app]` with `[Allocated FTE MoM %_app]`.
- **Allocated FTE by customer / project / project L1:** how many people each one really uses. One person split between two projects counts 0.5 in each.
- **Matrix:** project L1 (rows) × month (columns) of `[Allocated FTE (Last Week)_app]`.
- **People detail:** for a selected project, each person's `[Time Allocation %_app]`.
- *Pending decision:* allocation FTE (current; total = headcount) vs capacity FTE (hours ÷ 40).

### P4 · Intercompany & Cross-Charge (`/flows`)
**Purpose:** hours that cross countries or areas. Replaces the "Analysis Type" field parameter.
- **Toggle:** Intercompany (`intercompany_flow`: CR Local, COL → USA, CR → USA …) or Cross Charge (`cross_charge_flow`: BPO Direct, ITO → DTF …).
- **Matrix:** flow (rows) × month (columns) of `[Synerion Hours_app]`, with a total column. Rows expand to customer → project → employee.
- **KPI cards:** share of hours that are intercompany; share that are cross-charge; with an area selected, `[Cross-Charge Hours Received_app]`, `[Cross-Charge Hours Lent_app]` and `[Net Cross-Charge Hours_app]`.
- **Flow diagram:** origin → destination (country or L1), width = hours.
- Check: February 2026 must total 223,641 h in both views, as in the current report.

### P5 · Revenue & Capacity Yield (`/yield`)
**Purpose:** revenue produced per unit of capacity.
- **KPI cards:**
  - `[Actual Revenue_app]` with `[Actual Revenue MoM %_app]`.
  - `[Allocated FTE (Last Week)_app]`.
  - `[Revenue per FTE_app]` with `[Revenue per FTE MoM %_app]`.
  - `[Annualized Revenue per FTE_app]`.
  - Shown for a **single month** (the measures are monthly by design). The period filter is forced to one month on this page.
- **Monthly trend:** revenue (bars) and revenue per FTE (line), last 12 months.
- **By organization (master hierarchy L1 > L2 > L3):** revenue, FTE, revenue per FTE, MoM.
- **Customers that grew / dropped most:** `[Actual Revenue MoM $_app]` with `[Customer Rank by Revenue Growth_app]` / `[… Decline_app]`, top 10 each.

### P6 · Project Progress, for PMs (`/projects`)
**Purpose:** day-by-day progress of my projects, and the Monday timesheet review.

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
