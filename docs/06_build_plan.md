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
- [x] 0.4 Smoke query: September 2026 `[Total Worked Hours]` = 267,322 and actual revenue = $6,033,393 (baseline confirmed by Ion 2026-11-04; was $6,031,963).
  - 2026-11-04 (`app/src/queries/smoke/smoke.dax`, model refresh 11/04/2026 09:14 EST): hours **267,322.28 ✓**; actual revenue **$6,033,393.35 ✗** (+$1,430.39 vs expected). Explicit `scenario = "Actual"` and `[Total Revenue (Master Hierarchy)]` agree. Every September row was reloaded today (full load), so the change can't be isolated by load date. Ion confirmed $6,033,393 as the September 2026 baseline on 2026-11-04 (open item #15 closed).
- [x] 0.5 First deploy of a page showing the smoke result; Ion shares it with a non-builder to check viewer access (Build + Read on the model).
  - 2026-11-04: smoke page built (`app/src/components/smoke-page.component.tsx`, factory `app/src/queries/smoke/`): two KPI cards (September 2026 hours and actual revenue, original measures until Phase 1) and the model refresh time, with loading, empty and error states. `tsc`, 144 unit tests, lint and `build:fabric` pass.
  - Not viewable locally yet: the template's entry throws without the backend env vars (`run 'npx rayfin up'`), and `npx rayfin dev` would itself create the Fabric item. The template ships no Playwright validation; browser checks (desktop and mobile) run on the deployed app instead, right after the first `npx rayfin up`.
  - 2026-11-04: first `npx rayfin up` (approved by Ion) from branch `feat/0.5-smoke-page` to `_Corporate DCOE Backend Dev`: item `project-real-profitability` (`ccfd1401-8097-42f2-877f-e770b5401df5`), app https://epic-acorn-69682d5614-eastus2.webapp.fabricapps.net (protected, Fabric sign-in). The workspace already had capacity; no trial or capacity change. `rayfin up status`: reachable.
  - Checked in Ion's Chrome, signed in as a builder: 267,322 h and $6,033,393, the same as DAX on Fabric; desktop layout OK. Mobile width not verified (the window could not be resized).
  - 2026-11-04: Ion confirmed viewer access with a non-builder (Build + Read on the model): OK. Mobile check deferred, nobody available to review on a phone yet (open item #16).
- [x] 0.6 Export the model as TMDL into `model/` (skill `export-model`).
  - 2026-11-04: `model/definition/` (15 files: 11 tables, 51 measures in `_Measures`, relationships, Direct Lake expression on `LH_Corp_DataHub`, compatibility level 1606). No `_app` objects yet. Checked: no credentials, emails or roles; only a OneLake URL with workspace and lakehouse ids. Power BI modeling MCP EULA accepted with Ion's OK.

## Phase 1 — Model layer (needs Ion's approval of the DAX)

- [x] 1.1 Create the `_app` measures in `03_measure_review.md` § 3 (skill `model-change`), validate, export TMDL.
  - 2026-11-04: 33 measures created in `_Measures` → `_app\<topic>` after Ion's approval; DAX, formats and validated values in `docs/08_app_measures.md`. Validated before and after creation (Sep 2026 and week of 2026-10-05; identical). TMDL re-exported. `Customer Rank by Revenue Growth_app / Decline_app` wait for open item #1.
- [x] 1.2 Propose `Hours Previous 4 Weeks_app` and `Missing This Week_app` for the P6 flag.
  - 2026-11-04: created after Ion's approval (`08_app_measures.md` § 5); validated on PAR-401-01 and PAR-401-05, last full and current week, before and after creation. On the current partial week the flag means "nothing logged yet". TMDL re-exported.

## Phase 2 — App shell

- [x] 2.1 Theme, top bar with data freshness and stale-data warning, page tabs and routes.
  - 2026-11-04: theme in `app/src/global.css` (warm paper / ink navy, dark mode, `warning` tokens, Source Serif 4 + IBM Plex Sans from Google Fonts, tabular numerals). Top bar (`app-header.component.tsx`): hours / revenue / model refresh dates from `Last Synerion Date_app`, `Last Revenue Date_app`, `Last Refresh Date` (`queries/shell/data-freshness`); amber warning when hours stop before the last complete week's Sunday (viewer's local date, `lib/freshness.ts`); theme toggle; six tabs. Hash routes (`#/effort` … `#/projects`, state in the hash query, `lib/routes.ts`); unbuilt pages show a placeholder with no data. 167 unit tests, lint, `tsc` pass; checked locally in Ion's Chrome (dark and light, tab navigation, live dates). Deployed from `main` @ `d5d78c6` on 2026-11-04 and checked live (dates, direct links, fonts); mobile pending (#16).
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
