---
name: dax-check
description: Run a DAX query against the published SM_Corp_Project_Real_Profitability model in Fabric to check a measure, a visual's query or a number before it goes into the app.
---

# DAX check

Use before writing any query into the app, when a number looks wrong, or when Ion asks what a measure returns.

1. Write the query as the app will send it: `EVALUATE SUMMARIZECOLUMNS(...)` with the same filters (`KEEPFILTERS(TREATAS(...))`, date range on `calendar[Date]`). Never select `from_number`, `to_number`, `transcript` or `recording_url`.
2. Run it against the **published** model, one of:
   - Power BI modeling MCP: `connection_operations` → `ConnectFabric` (workspace `_Corporate DCOE Backend Dev`, model `SM_Corp_Project_Real_Profitability`), then `dax_query_operations` → `Execute`.
   - Through the app tooling, from `app/`: save the query in a `.dax` file under `app/` and run `npx fabric-app-semantic-model-tools run-dax-query --dax <file.dax> --alias profitmodel` (see `app/AGENTS.md`). Don't use `npx rayfin connector invoke` for DAX.
3. Report: the query, the filter context in words, row count, the first rows, and the data date ([Last Update]).
4. If a measure doesn't exist in Fabric, or returns an error, stop. Don't work around it in TypeScript: propose a fix with the `model-change` skill.
5. Notes:
   - `DEFINE MEASURE` in a query does not change dependent model measures.
   - Revenue lives in `fact_revenue_metrics` with `scenario` = `Actual` or `Backlog`: always filter the scenario (the original `[Total Revenue]` adds both).
   - Hours come from Synerion (`fact_profitability_metrics[worked_hours]`); cost (`actual_cost_usd`) is in local currency and out of scope for now.
   - The model is Direct Lake: `TODAY()` runs in UTC on the service.
