---
name: release
description: Validate and deploy the Project Profitability Fabric App to the _Corporate DCOE Backend Dev workspace from main, then record the release.
---

# Release

1. Be on an up-to-date `main` with a clean working tree. Deploys only happen from `main`.
2. From `app/`: install, type-check, lint and run tests with the scripts the scaffold defines (`npm run …`).
3. Run the template's Playwright browser validation at desktop and mobile width; fix failures before going on.
4. Ask Ion to confirm the deploy, then `npx rayfin up` and `npx rayfin up status`.
5. Open the deployed app, check E1 and O1 load with data, and compare two numbers against a `dax-check` query.
6. Add a log line to `docs/04_decisions_and_changelog.md`: date, commit, what shipped, app URL. Commit it on a branch and open a PR.
