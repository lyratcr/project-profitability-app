# Project Real Profitability — Fabric App

Fabric App for Auxis Corporate Finance: Synerion hours, headcount, FTE, intercompany and cross-charge flows, revenue per FTE, and project progress against the Project Operations plan, for the CFO, executives, area directors and Project Managers.

- **Data:** semantic model `SM_Corp_Project_Real_Profitability` (Direct Lake), workspace `_Corporate DCOE Backend Dev`
- **Stack:** Microsoft Fabric Apps (preview), Rayfin CLI, data app template (React + TypeScript), `fabric-semanticmodel` connector
- **Built with:** Claude Code (rules in `CLAUDE.md`, plan in `docs/06_build_plan.md`)

## Layout

```
CLAUDE.md                 rules for Claude Code
.mcp.json                 Power BI modeling MCP (Windows)
.claude/                  permissions (no deletes) and project skills
.github/                  pull request template
app/                      the Fabric App (Rayfin scaffold, plan task 0.2)
model/                    TMDL snapshot of the published model (plan task 0.6)
pipeline/notebooks/       silver and gold notebooks that build the model's tables (reference)
docs/
  01_model_overview.md            tables, relationships, data facts, known issues
  02_data_lineage.md              Synerion → silver → gold → model
  03_measure_review.md            measure verdicts and the _app names
  04_decisions_and_open_items.md  decisions, open items, log
  05_app_design.md                pages and visuals
  06_build_plan.md                phases and definition of done
  07_project_instructions.md      Claude Project instructions
```

## First session with Claude Code

Open this folder in the Claude desktop app (Code tab, **Local** environment) and send:

> Read CLAUDE.md, docs/05_app_design.md and docs/06_build_plan.md. Start Phase 0: check the prerequisites you can check from here, scaffold the Rayfin data app into app/, add the connector to SM_Corp_Project_Real_Profitability with alias profitmodel and run the smoke query in task 0.4. Work on a branch and stop before the first deploy.
