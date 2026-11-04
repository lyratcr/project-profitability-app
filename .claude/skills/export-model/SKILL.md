---
name: export-model
description: Export the published SM_Corp_Project_Real_Profitability semantic model as TMDL into the repo's model/ folder so model changes are versioned and diffable.
---

# Export the model to `model/`

1. Connect with the Power BI modeling MCP: `connection_operations` → `ConnectFabric` (workspace `_Corporate DCOE Backend Dev`, model `SM_Corp_Project_Real_Profitability`).
2. `database_operations` → `ExportToTmdlFolder` with `tmdlFolderPath` = the absolute path of `<repo>/model/definition`. Overwrite the previous export.
3. Check the folder has `database.tmdl`, `model.tmdl` and `tables/`. Make sure nothing in it holds data or secrets (TMDL has no data rows; data source credentials are not exported). If a file contains a connection string with credentials, stop and tell Ion.
4. `git diff --stat model/` and summarize what changed (new or changed `_app` objects). Unexpected changes to originals mean someone else edited the model: report them, don't revert them.
5. Commit on the current branch: `chore(model): export TMDL <date>`.

The export is a snapshot for history and review. The published model stays the master copy; don't import `model/` back into Fabric without Ion's explicit decision.
