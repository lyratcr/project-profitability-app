# Project Real Profitability — Fabric App

Fabric App (Microsoft Fabric Apps, Rayfin data app template) on the semantic model `SM_Corp_Project_Real_Profitability` in Fabric workspace `_Corporate DCOE Backend Dev`. It shows Synerion hours, headcount, FTE, intercompany/cross-charge flows, revenue yield and project progress against the Project Operations plan, for the CFO, executives, area directors and Project Managers.

The **published model is the source of truth** for every number. There is no local Power BI file.

Repo layout: `app/` (Rayfin project), `model/` (TMDL export of the published model, for versioning), `pipeline/notebooks/` (the Fabric notebooks that build the gold tables, reference only), `docs/`.

## Read first

1. The Rayfin scaffold's agent instructions and skills (`app/AGENTS.md`, `app/.agents/skills/`). They are the authority on Rayfin APIs and commands.
2. `docs/05_app_design.md`: pages, visuals, the measure behind each one.
3. `docs/03_measure_review.md`: what each measure means and the `_app` names the app must use.
4. `docs/01_model_overview.md` and `docs/02_data_lineage.md`: tables, relationships, where the data comes from, known issues.
5. `docs/04_decisions_and_open_items.md`: don't build on an open item as if it were settled.
6. `docs/06_build_plan.md`: work it in order and tick tasks off.

Project skills in `.claude/skills/`: `dax-check`, `build-page`, `model-change`, `export-model`, `release`.

## Hard rules

- **NEVER delete anything (Ion's rule).** Don't run, write or suggest commands that delete or empty files or folders: `rm`, `del`, `rmdir`, `Remove-Item`, `git clean`, `git rm`, `git reset --hard`, `git checkout -- .`, overwriting a folder, or scripts that do any of these. If something should be removed, stop, say exactly what and why, and let Ion delete it by hand. When Ion runs commands himself, give one command at a time and explain it first.
- **Use `_app` measures** (`docs/03_measure_review.md` § 3). Any new or changed model object ends in `_app` and goes in an `_app\<topic>` folder. Never rename, edit or delete an original measure: the existing Power BI report binds to them.
- **The model owns the numbers.** Never compute a KPI in TypeScript. If a measure is missing or wrong, stop and propose the DAX (skill `model-change`).
- **Revenue:** always the `Actual` or `Backlog` scenario explicitly. The original `[Total Revenue]` adds both. **Cost and margin are out of scope** (`actual_cost_usd` is in local currency).
- **Week windows** (this week, last week, Monday review) come from the viewer's local date and are sent as `dim_calendar[date]` ranges. No `TODAY()`-based measures: the service runs in UTC.
- Model changes go into the published model via XMLA with the Power BI modeling MCP, **only after Ion confirms the DAX**. Then export TMDL to `model/` in the same PR, with a changelog line. The model is **Direct Lake**: don't add calculated columns to Direct Lake tables. Column changes belong in the gold notebook and are Ion's to deploy.
- Data access only through `ConnectorsRayfinClient` + `fabricSemanticModel()` + `client.connectors.<alias>.executeQuery()`. No direct REST calls, no extra auth, no secrets in code.
- Before writing a query into the app, run it against the published model with the app's DAX tool (see `app/AGENTS.md`) or the Power BI modeling MCP (`ConnectFabric`), and confirm it returns rows.
- Employee names are internal HR data: show them only where the design says so (P6 "who logged time", P3 people detail, P4 flow matrix employee level with a customer or project selected — Ion, 2026-11-04). No hourly rates or cost per person anywhere.
- Never show mock data in place of a failed query. Every visual has loading, empty and error states.
- Run the template's Playwright browser validation (desktop and mobile) before `npx rayfin up`.
- Don't commit `app/rayfin/.env`, `app/rayfin/.temp/` or anything holding secrets. Commit `app/rayfin/.env.example`.

## Commands (run from `app/`)

```bash
npx rayfin login
npm run dev            # frontend locally against the backend in Fabric (run in background)
npx rayfin up          # deploy
npx rayfin up status   # verify deployment
```

## Working agreement

- Feature branch → PR into `main`. `main` is what gets deployed.
- After any change to scope, a KPI definition or an open item, add a dated line to `docs/04_decisions_and_open_items.md` in the same PR. Docs are edited only in this repo; Ion uploads changed docs to the Claude Project by hand.
- At the end of every session, update the build plan and the open items with what was done and what is pending, so the next session doesn't depend on chat history.
- Code, comments, UI text and docs in English; conversation with Ion in Spanish.
