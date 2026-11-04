---
name: build-page
description: Build or update one page of the Project Profitability Fabric App (P1–P6) from its mockup and the visual contract, with every number coming from the semantic model.
---

# Build a page

Input: the page id (for example `E2` or `O3`).

1. Read, in this order:
   - `docs/05_fabric_app_build_guide.md` § 4 (rules), § 5 (route), § 6 (filters) and the page's entry in § 7 (and § 8 for E4).
   - The page's mockup in `design/mockup/` (`Main.dc.html` is E1). Use layout, hierarchy, copy, spacing and colors. Ignore the `<x-dc>` / `<sc-for>` markup and the sample numbers.
   - Open items in `docs/04_decisions_and_changelog.md` that touch this page.
2. List every measure and column the page needs. Check they exist in the published model with the `dax-check` skill. Missing ones: stop and report, or propose them with `model-change`; never compute them in code.
3. Branch `feat/<page-id>-<short-name>`.
4. Build with the shared components and query helper from Phase 1. One query per visual; filters from the global state; loading, empty and error states.
5. Run the app (`npm run dev` from `app/`, in the background) and take Playwright screenshots at desktop and mobile width.
6. Spot check three numbers against a DAX query for the same filters.
7. Open a PR using the template: what was built, the measure list, the spot-check table, screenshots, open items hit. Tick the task in `docs/08_build_plan.md`.
