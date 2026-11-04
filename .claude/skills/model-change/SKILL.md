---
name: model-change
description: Propose, validate and (after Ion approves) create or fix an `_app` measure, column or table in the published SM_Corp_Project_Real_Profitability model, then record it in the repo.
---

# Model change

Rules: never edit or delete an original object (the model owner's). New or corrected objects end in `_app`, live in table `_Measures` (measures) under an `_app\<topic>` display folder, with a description that starts `ADDED YYYY-MM-DD (Fabric app):` or `FIXED YYYY-MM-DD (Fabric app):`. Never publish a `.pbix` over `SM_Corp_Project_Real_Profitability`.

1. Explain why the change is needed and show the DAX.
2. Validate without changing the model: run it as a query-scoped measure (`DEFINE MEASURE '_Measures'[X_app] = ...  EVALUATE ...`) for one full month and the last full week with data, with an independent check (a plain `COUNTROWS` / `SUM` that should agree).
3. **Stop and ask Ion to approve.** Don't continue without an explicit yes.
4. Apply with the Power BI modeling MCP (connected with `ConnectFabric` to `_Corporate DCOE Backend Dev` / `SM_Corp_Project_Real_Profitability`): `measure_operations` Create or Update. The model is **Direct Lake**: don't add calculated columns to Direct Lake tables (not supported); new columns belong in the gold notebook (`pipeline/notebooks/`). Measures and small calculated (import) tables are fine; a calculated table needs `table_operations` → `RefreshWithXMLA` with refresh type `Calculate`.
5. Re-run the validation query against the model measure; check `INFO.MEASURES()` state is valid.
6. Record in the same PR:
   - `docs/07_app_measures.md`: DAX and validated values.
   - `docs/04_decisions_and_changelog.md`: dated log line (and close or update the open item).
   - Run the `export-model` skill so `model/` matches Fabric.
