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

- [x] 0.1 Check prerequisites: Node ≥ 20, `npx rayfin login`, access to workspace `_Corporate DCOE Backend Dev`, Fabric Apps tenant setting.
  - 2026-11-04: Node v24.16.0, npm 11.13.0, Rayfin CLI 1.36.2; signed in as `powerbi@auxis.com`; workspace resolves (`d8218373-5db6-4ccc-b4c6-b2c787c63d00`) and the model answers DAX. The Fabric Apps tenant setting can only be proven by the first `npx rayfin up` (0.5).
- [x] 0.2 Scaffold the Rayfin data app into `app/` and read `app/AGENTS.md` and its skills.
  - 2026-11-04: template `dataapp`, project `project-real-profitability`. `rayfin init` refuses a non-empty folder without `--overwrite`, so it was scaffolded in a temp folder and copied in without overwriting (`app/README.md` kept). `tsc`, 137 template tests and lint pass.
- [x] 0.3 Add the `fabric-semanticmodel` connector to `SM_Corp_Project_Real_Profitability` (alias `profitmodel`, operation `executeQuery`). Commit `app/rayfin/.env.example`, never `.env`.
  - 2026-11-04: Dev model item `48ad695a-a31f-4f3a-852b-7bd2f3bbc39e` (the same model name also exists in `_Corporate DCOE Backend` and `_Corporate DCOE Backend Test`; not used). `app/.gitignore` re-includes `rayfin/.env.example`.
- [ ] 0.4 Smoke query: September 2026 `[Total Worked Hours]` = 267,322 and actual revenue = $6,031,963.
  - 2026-11-04 (`app/src/queries/smoke/smoke.dax`, model refresh 11/04/2026 09:14 EST): hours **267,322.28 ✓**; actual revenue **$6,033,393.35 ✗** (+$1,430.39 vs expected). Explicit `scenario = "Actual"` and `[Total Revenue (Master Hierarchy)]` agree. Every September row was reloaded today (full load), so the change can't be isolated by load date. Pending: Ion confirms the new figure as the baseline (likely a Project Ops change since 2026-11-03).
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
