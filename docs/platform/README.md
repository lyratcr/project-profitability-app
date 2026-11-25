# Data platform page

`index.html` shows the Architecture, Data lineage, Data model and Data catalog of the Project Real Profitability platform. Open it in a browser; it needs no network.

It is generated: don't edit it. `python docs/platform/build_site.py` rebuilds it from:

- `pipeline/notebooks/*_ELT_*.ipynb`: lineage (which function reads and writes which table)
- `model/definition/`: tables, columns, measures, relationships, role names
- `app/src`, `pm-app/src`: which tables, columns and measures each app reads
- `catalog_notes.json`: descriptions, each traced to a doc in `docs/`
- `model_stats.json`: row counts, distinct counts, blanks and date ranges from the published model
- `../../design-system/tokens.css`: Auxis colours and type

The full procedure, including refreshing the counts, is the project skill `toolkit` (`.claude/skills/toolkit/SKILL.md`).
