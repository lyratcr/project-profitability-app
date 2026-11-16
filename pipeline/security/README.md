# PM app access list

The gold code lives in `pipeline/notebooks/NB_Corp_Finance_DataHub_ELT_Gold_Profitability.ipynb` (section "PROJECT MANAGER PER PROJECT AND PM APP ACCESS", run as step 4b). `gold_pm_access.py` is the same logic as a standalone file, for a read-only preview in any notebook (see its header).

`pm_app_access_list.template.csv` is the empty template of the manual access list for the PM app (PM Performance Hub). Ion fills it in and uploads it to the Lakehouse as `Files/Finance/pm_performance_hub/pm_app_access_list.csv`. The gold notebook reads that file on every run and turns it into rows of `gold.security_project_access`. Decided by Ion on 2026-11-16 (see `docs/04_decisions_and_open_items.md`).

Who sees what in the PM app (the rules add up):

1. **PM:** sees the projects where they're the project manager in Project Operations. A project key with more than one Project Ops project takes the PM of the active one first, then of the most recently created (#30).
2. **Supervisor chain (automatic):** each PM's supervisor, that person's supervisor and so on up the chain see the PM's projects. The chain comes from `hr.vw_dim_employee_details`.
3. **This list:** for people outside that chain, such as executives, directors of other areas, Finance or the PMO.

## Columns

| Column | Meaning |
|---|---|
| `user_upn` | The person's sign-in (UPN), e.g. `name@auxis.com`. Case is ignored. |
| `scope` | `all` (every project in the company) or `area`. |
| `area` | Only when `scope` is `area`. The organization path as Project Operations writes it, joined by hyphens: `L1`, `L1-L2` or `L1-L2-L3` (e.g. `BPO`, `BPO-BTR`, `BPO-BTR-CORE`). A project matches when its organization equals the area or starts with the area followed by `-`, so `BPO` covers `BPO-BTR-CORE` but never `BPOX-...`. Case and spaces are ignored. |

Use one row per area. A person with two areas gets two rows.

## Checks the gold notebook prints on every run

- Any `area` that matches no project, which usually means a typo.
- Any `user_upn` not found in `hr.vw_dim_employee_details`.
- Any row with a `scope` other than `all` or `area`.

## Keep it private

The list names people and their access, so it's internal data. Commit only the empty template; keep the filled-in file in the Lakehouse.
