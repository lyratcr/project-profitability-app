---
name: toolkit
description: Rebuild the data platform page of this project (Architecture, Data lineage, Data model, Data catalog) from the notebooks, the TMDL export, the two apps' queries and fresh counts from the published model. Use after a gold notebook change, a model change (after export-model), a release, or when Ion asks for the platform map, the lineage of a table or the catalog.
---

# Toolkit: the data platform page

Adapted from `toolkit` + `metadata` in DataWithBaraa/claude-code-data-engineering-skills (MIT, reviewed 2026-11-24: Markdown and static example pages only, no scripts or network calls). Ours is one page, not a site: we have 2 notebooks and 13 model tables.

The page is `docs/platform/index.html`, written by `docs/platform/build_site.py` (Python standard library, no installs). Nothing on it is typed by hand.

| Page | Read from |
|---|---|
| Architecture | the notebooks (steps, schemas), the model (tables, measures, relationships, roles), the apps, `model_stats.json` (freshness) |
| Data lineage | every `build_*` / `process_incremental_load` in `pipeline/notebooks/*_ELT_*.ipynb` (what it reads, what it writes), the model partitions (gold → model), the apps' DAX and TS (model → app, also through measures) |
| Data model | `model/definition/relationships.tmdl`, the tables, `roles/*.tmdl` (role names and filtered tables only, never members) |
| Data catalog | TMDL columns and measures, `catalog_notes.json` (descriptions), `model_stats.json` (rows, distinct, blanks, date ranges) |

## Steps

1. Make sure the inputs are current: `model/definition` is the latest export (skill `export-model`), and the notebooks in `pipeline/notebooks/` match what runs in Fabric.
2. Refresh the counts (skip only if nothing changed in the data since `captured_at` in `docs/platform/model_stats.json`):
   1. `python docs/platform/build_site.py stats-dax` writes `docs/platform/model_stats.dax` (two queries: row counts, column statistics).
   2. Split it into two `.dax` files in the scratchpad and run both from `app/`:
      `npx fabric-app-semantic-model-tools run-dax-query --dax <q1.dax> --dax <q2.dax> --alias profitmodel --sample 400 > <scratchpad>/stats.json`
      (or run them with the Power BI modeling MCP, `ConnectFabric`, and save the two CSV results).
   3. `python docs/platform/build_site.py import-stats <scratchpad>/stats.json` (or `import-stats rows.csv columns.csv`). It refuses a cut result.
3. Descriptions: add or fix entries in `docs/platform/catalog_notes.json`, each traced to a doc in `docs/` (the `doc` field). Never guess one: an empty description shows as "no description yet" and is counted. A `///` description in the model wins over the notes. Mark personal columns in `personal`.
4. New source system or schema: add it to `systems` (and its tables to `external_tables`) in the notes.
5. `python docs/platform/build_site.py` — read its summary: notebook steps, source tables, columns described, tables each app reads. A step or table that disappeared means the parser missed a new code pattern: fix the parser, not the page.
6. Check it in the browser at desktop and phone width, light and dark: no console errors, lineage lines drawn, clicks highlight, catalog search works.
7. Publish or update the Artifact from `docs/platform/index.html` (same file path in the session, or the existing URL) only when Ion asks or agrees; commit the builder, the notes, the stats and the page on a feature branch.

## Never

- Never edit `index.html` by hand: fix the input or the builder and build again.
- Never put a data value of a personal column (names, UPNs, ids, job titles) on the page; the stats are counts and date / number ranges only.
- Never list role members, emails or rates.
- Never add a library, a CDN or a network fetch to the page.
- Never write a description that does not come from a document or the model.
