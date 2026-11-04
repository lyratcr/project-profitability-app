# Build Plan — Project Real Profitability Fabric App

> Project knowledge file. Created 2026-11-03. Claude Code works this plan in order: one branch and one PR per task group, and ticks `[x]` in the same PR. Ion reviews and merges.

## Definition of done (every page)

- [ ] Layout and copy follow `05_app_design.md` (and the mockup, once there is one).
- [ ] Every number is an `_app` measure or a model column; no KPI math in TypeScript.
- [ ] One DAX query per visual, tested first with the `dax-check` skill.
- [ ] Global filters apply; page state is in the URL.
- [ ] Loading, empty and error states; never mock data.
- [ ] Three numbers spot-checked against DAX on Fabric (table in the PR).
- [ ] Playwright screenshots, desktop and mobile, in the PR.

## Phase 0 — Foundation

- [ ] 0.1 Check prerequisites: Node ≥ 20, `npx rayfin login`, access to workspace `_Corporate DCOE Backend Dev`, Fabric Apps tenant setting.
- [ ] 0.2 Scaffold the Rayfin data app into `app/` and read `app/AGENTS.md` and its skills.
- [ ] 0.3 Add the `fabric-semanticmodel` connector to `SM_Corp_Project_Real_Profitability` (alias `profitmodel`, operation `executeQuery`). Commit `app/rayfin/.env.example`, never `.env`.
- [ ] 0.4 Smoke query: September 2026 `[Total Worked Hours]` = 267,322 and actual revenue = $6,031,963.
- [ ] 0.5 First deploy of a page showing the smoke result; Ion shares it with a non-builder to check viewer access (Build + Read on the model).
- [ ] 0.6 Export the model as TMDL into `model/` (skill `export-model`).

## Phase 1 — Model layer (needs Ion's approval of the DAX)

- [ ] 1.1 Create the `_app` measures in `03_measure_review.md` § 3 (skill `model-change`), validate, export TMDL.
- [ ] 1.2 Propose `Hours Previous 4 Weeks_app` and `Missing This Week_app` for the P6 flag.

## Phase 2 — App shell

- [ ] 2.1 Theme, top bar with data freshness and stale-data warning, page tabs and routes.
- [ ] 2.2 Global filters (period, master hierarchy, country, customer, project) and the query helper (`SUMMARIZECOLUMNS` + `KEEPFILTERS(TREATAS(...))`, whitelisted values).
- [ ] 2.3 Week logic: this week, last week and the Monday window from the viewer's local date, sent as date ranges.
- [ ] 2.4 Shared components: KPI card with MoM, matrix with expandable rows, trend chart, table, states.

## Phase 3 — Executive pages

- [ ] 3.1 P1 Effort Distribution
- [ ] 3.2 P2 Headcount Overview
- [ ] 3.3 P3 FTE Overview
- [ ] 3.4 P4 Intercompany & Cross-Charge (February 2026 = 223,641 h in both views)
- [ ] 3.5 P5 Revenue & Capacity Yield

## Phase 4 — PM page (after open items #1 and #2 are fixed)

- [ ] 4.1 P6 Project Progress: KPIs, week vs plan, weekly trend, revenue by month
- [ ] 4.2 P6 "Who logged time" table with flags and the Monday banner
- [ ] 4.3 Project selector (remembered; default to the PM's projects once #4 exists)

## Phase 5 — Release

- [ ] 5.1 Reconciliation table per page against DAX on Fabric
- [ ] 5.2 Viewer access for executives, directors and PMs (security group with Build + Read)
- [ ] 5.3 Release from `main` (skill `release`)
