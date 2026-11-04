# Decisions and Open Items

> Project knowledge file. Newest first. Format of log lines: `YYYY-MM-DD | Type | Object | Detail | Owner`.

## Open items

| # | Item | Blocks | Owner | Status |
|---|---|---|---|---|
| 1 | `dim_project` duplicate key `PROMETHEUS`: every query through `dim_project` fails (fix in gold `build_gold_dim_project`: normalize key, dedupe) | P6, any project filter; current Power BI report too | Ion / data engineering | Open (found 2026-11-03) |
| 2 | Synerion hours stop at 2026-10-17; the PM review needs daily loads incl. unapproved time; get the bronze Synerion ingestion into `pipeline/notebooks/` | P6 | Ion | Open |
| 3 | Confirm Backlog = full planned schedule (EAC), not only the unbilled remainder | P6 KPIs | Finance | Open |
| 4 | Add project manager (name + email) to `dim_project` from `msdyn_project` | P6 "my projects" | Ion / data engineering | Open |
| 5 | Extend `dim_calendar` to the last backlog date (2029-12-01) | P6 plan totals by date | Data engineering | Open |
| 6 | FTE definition for P3/P5: allocation FTE (current) vs capacity FTE (hours ÷ 40) | P3, P5 | Adan | Open |
| 7 | Headcount definition for P2: people with hours (current) vs active employees in UKG | P2 | Adan | Open |
| 8 | Revenue per FTE: last-week FTE vs month-average FTE | P5 | Adan | Open |
| 9 | Create the `_app` measures in `03_measure_review.md` § 3 (after Ion approves the DAX) | All pages | Ion + Claude | Done 2026-11-04 (33 of 35; the 2 customer rank measures wait for #1) |
| 10 | Cost in local currency (COP/CRC) labelled USD; Project Ops standard cost and roles outdated | Margin (out of scope now) | Finance | Deferred |
| 11 | `project_key` = first 10 characters of the project name (fragile); use the Project Ops project id | Data quality | Data engineering | Open |
| 12 | `dim_employee_history` relates on `ukg_employee_id` → `dim_employee[employee_number]` | Not used by the app | Data engineering | Open |
| 13 | Silver merge key `synerion_emp_id` isn't unique (fine while full load) | Only if incremental is turned on | Data engineering | Note |
| 14 | `TODAY()` in DAX is UTC on the service; the app passes week windows instead | P6 | — | Decided |
| 15 | Smoke check: September 2026 actual revenue now $6,033,393 vs $6,031,963 noted on 2026-11-03 (+$1,430); hours unchanged. Confirm the new baseline for reconciliations | Task 0.4 sign-off | Ion | Closed 2026-11-04: Ion confirmed $6,033,393 |
| 16 | Mobile check of the deployed app: nobody available yet to review it on a phone (the layout stacks to one column below 640 px, but nobody has seen it) | Definition of done (mobile), from 0.5 on | Ion | Deferred (2026-11-04) |
| 17 | Actual revenue has rows dated in the future (2026-11-04 check: 164 rows; Fixed Fee After Month $1.83 M dated 10–28 Nov 2026; Manual Adjustment up to 2027-03-02). Confirm with Finance that this is how Project Ops posts them; they land in future months' actual revenue | P5, P6 revenue by month; `Last Revenue Date_app` uses T&M only | Finance / Ion | Open (found 2026-11-04) |
| 18 | Repo skills (`build-page`, `model-change`, `release`) and `.github/pull_request_template.md` refer to docs that don't exist here (`07_app_measures.md`, `04_decisions_and_changelog.md`, `08_build_plan.md`, `Retell_AI`); measures doc is `08_app_measures.md` | Tooling | Ion | Open (found 2026-11-04) |
| 19 | Hours, people and plan measures ignore `dim_hierarchy_master` (Sep 2026, L1 = BPO: hours 267,322 unchanged; FTE 1,541 → 1,004; revenue $6.03 M → $3.47 M). Ion (2026-11-04): the hierarchy serves both views, so each measure maps it to its own org: proposed `Synerion Hours (Employee Org)_app`, `Synerion Hours (Project Org)_app`, `People With Hours (Employee Org)_app`, `People With Hours (Project Org)_app`, and financial-org versions of `Planned Revenue_app`, `Planned Hours_app`, `Billed Hours_app` (validated, pending approval) | Org filter on P1–P5 | Ion | Open |
| 20 | Customer names have stray whitespace (e.g. `"
| 21 | `dim_hierarchy_master` is built from employee org + financial org, so 6 **project-org** combos are missing (Jan–Oct 2026: 20,397 h, 0.8%; BPO / RCM / POD5 15,203 h, OVH / ADM / EXEC 3,312 h, Corporate 1,132 h). Project-org measures lose those hours under an org filter. Add project org to the union in gold | Project-org views (P1 "where the work is billed", P4) | Ion / data engineering | Open (found 2026-11-04) |
NY Municipal Credit"`, `"Access Corporation  "`), and 3 revenue customers have no hours match (e.g. Propelis). Trim in gold | Customer filter labels and matching | Data engineering | Open (found 2026-11-04) |

## Log

2026-11-04 | Proposal | `_app` measures | 4 new org-aware hours/people measures (employee and project org) and financial-org versions of `Planned Revenue_app`, `Planned Hours_app`, `Billed Hours_app` (`08_app_measures.md` § 6), validated, pending Ion's approval | Claude
2026-11-04 | Decision | Org filter | Ion: an L1 > L2 > L3 filter is required on every tab except Projects. `dim_hierarchy_master` serves both views; each measure maps it to the org that fits it (employee, project or financial), as the existing headcount, cross-charge and revenue measures already do | Ion
2026-11-04 | Decision | Filters | Global filters live in the hash query and only accept values loaded from the model (whitelist); the period defaults to the last complete month from the viewer's date; Yield accepts single months only; country is not offered on Yield (revenue has no employee country) | Claude
2026-11-04 | Decision | Filters | Until #1 is fixed, customer and project filter each fact's own column (`project_customer` / `financial_customer`, `project_key` in both) instead of `dim_project`; the organization filter is hidden until #19 is decided | Claude
2026-11-04 | Release | App shell | `npx rayfin up` from `main` @ `d5d78c6` (PRs #1–#6 merged, approved by Ion) to `_Corporate DCOE Backend Dev`, app https://epic-acorn-69682d5614-eastus2.webapp.fabricapps.net. Checked in Ion's Chrome: live data dates, direct link `#/flows`, Google Fonts load (no CSP block) | Ion + Claude
2026-11-04 | Decision | Routing | Hash routes (`#/effort`, page state in the hash query) so deep links work on Fabric static hosting without server rewrites | Claude
2026-11-04 | Decision | Stale-data warning | Hours are "not current" when `Last Synerion Date_app` is before the Sunday ending the last complete Mon–Sun week, using the viewer's local date | Claude
2026-11-04 | Change | Model | Ion approved; `Hours Previous 4 Weeks_app` and `Missing This Week_app` created in `_app\Projects`, validated before and after creation, TMDL re-exported. Phase 1 done except the 2 rank measures (#1) | Ion + Claude
2026-11-04 | Proposal | P6 flag | `Hours Previous 4 Weeks_app` and `Missing This Week_app` validated as query-scoped measures on two projects and two weeks (`08_app_measures.md` § 5), pending Ion's approval | Claude
2026-11-04 | Change | Model | Ion approved; 33 `_app` measures created in the Dev model (`_Measures`, `_app\<topic>`), validated before and after creation, TMDL re-exported; closes #9 except the 2 rank measures (blocked by #1) | Ion + Claude
2026-11-04 | Proposal | `_app` measures | 33 `_app` measures validated as query-scoped measures (Sep 2026 and week of 2026-10-05) in `08_app_measures.md`, pending Ion's approval. Changes vs `03` § 3: `Plan End Date_app` ignores the date filter; `Last Revenue Date_app` uses T&M only (#17); the two customer rank measures wait for #1 | Claude
2026-11-04 | Finding | Data freshness | Synerion hours now load through 2026-11-03 (142,755 h after 2026-10-17), so #2 is progressing; `dim_calendar` now ends 2029-04-01 (plan ends 2029-12-01, #5 still open) | Claude
2026-11-04 | Change | Model export | First TMDL snapshot of the published Dev model in `model/definition/` (baseline before the `_app` measures, Phase 1); Phase 0 complete except the deferred mobile check (#16) | Claude
2026-11-04 | Decision | Task 0.5 | Viewer access confirmed by Ion with a non-builder; 0.5 ticked. Mobile check deferred until someone can review on a phone (open item #16) | Ion
2026-11-04 | Release | First deploy | Smoke page deployed from `feat/0.5-smoke-page` (Ion approved deploying before merge to main) to `_Corporate DCOE Backend Dev`, item `project-real-profitability`; live values match DAX on Fabric | Ion + Claude
2026-11-04 | Finding | Tooling | The Rayfin dataapp template (CLI 1.36.2) has no Playwright validation and can't render locally before the first `rayfin up` (no backend env vars; `rayfin dev` provisions the item). Browser validation for 0.5 moves to right after the first deploy; CLAUDE.md's "Playwright before rayfin up" rule applies from then on | Claude
2026-11-04 | Decision | Smoke baseline | September 2026 actual revenue baseline is $6,033,393 (Ion confirmed); closes open item #15 and task 0.4 | Ion
2026-11-04 | Finding | Smoke query | Sep 2026 Synerion hours 267,322 match; actual revenue $6,033,393 (+$1,430 vs 2026-11-03 figure) after the 2026-11-04 09:14 EST refresh; open item #15 | Claude
2026-11-04 | Decision | Connector | `profitmodel` points to the Dev model (`_Corporate DCOE Backend Dev`, item 48ad695a-…); the same model also exists in the prod and Test workspaces | Ion + Claude
2026-11-03 | Decision | Naming | Originals are not renamed (the Power BI report binds to them); the app uses `_app` measures with clear names, most of them pointing to the original | Ion + Claude
2026-11-03 | Decision | Scope | Priority is hours and revenue; cost is out of scope until FX and standard cost are fixed | Ion
2026-11-03 | Decision | Pages | Six pages: Effort Distribution, Headcount Overview, FTE Overview, Intercompany & Cross-Charge, Revenue & Capacity Yield (from Adan), Project Progress for PMs | Ion
2026-11-03 | Finding | Model review | Total Revenue includes Backlog ($348 M vs $121 M actual); cost in local currency; Synerion data ends 2026-10-17; `dim_project` duplicate key breaks project queries; the three Operational FTE measures return the same value | Ion + Claude
2026-11-03 | Decision | Tooling | New GitHub repo for this app with Claude Code; Claude Project gets docs and notebooks by manual upload; repo is the source of truth | Ion
