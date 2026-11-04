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
| 9 | Create the `_app` measures in `03_measure_review.md` § 3 (after Ion approves the DAX) | All pages | Ion + Claude | Open |
| 10 | Cost in local currency (COP/CRC) labelled USD; Project Ops standard cost and roles outdated | Margin (out of scope now) | Finance | Deferred |
| 11 | `project_key` = first 10 characters of the project name (fragile); use the Project Ops project id | Data quality | Data engineering | Open |
| 12 | `dim_employee_history` relates on `ukg_employee_id` → `dim_employee[employee_number]` | Not used by the app | Data engineering | Open |
| 13 | Silver merge key `synerion_emp_id` isn't unique (fine while full load) | Only if incremental is turned on | Data engineering | Note |
| 14 | `TODAY()` in DAX is UTC on the service; the app passes week windows instead | P6 | — | Decided |
| 15 | Smoke check: September 2026 actual revenue now $6,033,393 vs $6,031,963 noted on 2026-11-03 (+$1,430); hours unchanged. Confirm the new baseline for reconciliations | Task 0.4 sign-off | Ion | Closed 2026-11-04: Ion confirmed $6,033,393 |
| 16 | Mobile check of the deployed app: nobody available yet to review it on a phone (the layout stacks to one column below 640 px, but nobody has seen it) | Definition of done (mobile), from 0.5 on | Ion | Deferred (2026-11-04) |

## Log

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
