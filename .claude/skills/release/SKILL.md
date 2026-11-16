---
name: release
description: Validate and deploy one of the two Fabric Apps (executive app in app/, PM app in pm-app/) to the _Corporate DCOE Backend Dev workspace from main, then record the release.
---

# Release

The repo holds two Fabric Apps on the same semantic model, each its own Rayfin project:
- `app/`: executive app (P1-P5, plus P6 until the PM app replaces it), item `project-real-profitability`.
- `pm-app/`: PM app (Project Progress), item `pm-project-progress` (Ion, 2026-11-16).
Run every command from the folder of the app being released; never cross the two `rayfin/` folders.

1. Be on an up-to-date `main` with a clean working tree. Deploys only happen from `main`.
2. From the app's folder (`app/` or `pm-app/`): install, type-check, lint and run tests with the scripts the scaffold defines (`npm run …`).
3. Run the template's Playwright browser validation at desktop and mobile width; fix failures before going on.
4. Ask Ion to confirm the deploy, then `npx rayfin up` and `npx rayfin up status`.
5. Open the deployed app, check E1 and O1 load with data, and compare two numbers against a `dax-check` query.
6. Add a log line to `docs/04_decisions_and_changelog.md`: date, commit, what shipped, app URL. Commit it on a branch and open a PR.
