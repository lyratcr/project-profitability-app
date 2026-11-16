# SOP: access to PM Performance Hub

| | |
|---|---|
| **App** | PM Performance Hub (Fabric item `pm-project-progress`, workspace `_Corporate DCOE Backend Dev`) |
| **App URL** | https://magic-maple-28bbbd8e63-eastus2.webapp.fabricapps.net |
| **Semantic model** | `SM_Corp_Project_Real_Profitability` |
| **Owner** | Ion (DCOE) |
| **Version** | 1.0, 2026-11-16 |
| **Word version** | `docs/09_pm_app_access_sop.docx`, built from this file by `docs/tools/make_sop_docx.js` (Node, `docx` package). Change this Markdown first, then regenerate the Word file. |

## 1. Purpose and scope

This SOP explains how to give a person access to PM Performance Hub, how to remove it, and how to check that each person sees only what they should. It covers project managers, their supervisors, directors and executives.

## 2. How access works

Two separate things decide what a person sees in the app.

**A. Which projects a person sees.** This part is automatic. The gold notebook (`NB_Corp_Finance_DataHub_ELT_Gold_Profitability`) rebuilds the table `gold.security_project_access` on every run. It applies these rules, which add up:

| Rule | Source | Maintained by |
|---|---|---|
| A PM sees their own projects | Project Operations (`msdyn_project`, project manager) | PMO / Project Operations, nothing to do here |
| Every supervisor up the PM's chain sees the PM's projects | UKG (`hr.vw_dim_employee_details`, supervisor) | HR / UKG, nothing to do here |
| People outside that chain (executives, directors of other areas) see everything or an area | Manual list `Files/Finance/pm_performance_hub/pm_app_access_list.csv` in Lakehouse `LH_Corp_DataHub` | The app owner (section 5) |

When a project changes PM in Project Operations, or a person changes supervisor in UKG, access updates on the next gold run without any manual step.

**B. Whether a person can open the app.** This part is manual (section 4). The person needs all three of:

1. Membership in a security role of the semantic model: `Project access_app`, or `All company_app` for executives.
2. **Read** and **Build** permission on the semantic model.
3. Permission to run the app item `pm-project-progress`.

> **Important:** never give app users the **Admin**, **Member** or **Contributor** role on the workspace. Those roles bypass row-level security, so the person would see every project. App users get only the permissions in this SOP.

## 3. One-time setup with a security group (recommended)

Granting the three permissions to one Entra ID security group, instead of to each person, makes onboarding a single step: add the person to the group.

1. Ask IT to create an Entra ID security group, for example **`PMHub-Users`**, and give the app owner rights to manage its members.
2. Add the group to the role (section 4.1, steps 1 to 5; pick `Project access_app` and type the group name).
3. Give the group Read and Build on the model (section 4.2).
4. Share the app with the group (section 4.3).

From then on, onboarding a PM or supervisor means **adding them to `PMHub-Users`** (section 6). Executives still go in the manual list (section 5) or in `All company_app`.

**Full automation (optional, needs IT):** IT can make `PMHub-Users` a *dynamic* group, so Entra ID adds people based on an attribute (for example, job title or department) and nobody has to add them by hand. Because row-level security limits every user to their own projects, a person in the group who isn't a PM or supervisor sees an empty app, not someone else's data. Decide this with IT; see the note on Build permission in section 9.

## 4. Grant access to one person (without a group)

Use this for the pilot (Adan Rivera Hernandez, Iliak Herrera, Franklin Calderon) or for one-off cases. Use the person's sign-in email (UPN), e.g. `name@auxis.com`.

### 4.1 Add the person to a security role

1. Open https://app.fabric.microsoft.com and go to workspace **_Corporate DCOE Backend Dev**.
2. Find the semantic model **SM_Corp_Project_Real_Profitability**, select **⋯ (More options)**, then **Security**.
3. On the left, select the role:
   - **Project access_app** for PMs, supervisors and directors.
   - **All company_app** for executives who see the whole company.
4. Under **Members**, type the person's email and select them.
5. Select **Add**, then **Save**.

### 4.2 Give Read and Build on the semantic model

1. In the same workspace, on **SM_Corp_Project_Real_Profitability**, select **⋯**, then **Manage permissions**.
2. Select **+ Add user**.
3. Type the person's email.
4. Tick **Allow recipients to build content with the data associated with this semantic model** (this is the Build permission). Leave **reshare** unticked.
5. Select **Grant**.

### 4.3 Share the app

1. In the workspace, find the item **pm-project-progress** (PM Performance Hub), select **⋯**, then **Share**, or **Manage permissions** → **Add user**.
2. Type the person's email and grant the permission to open and run the app. Leave reshare and edit unticked.
3. Select **Grant**.

### 4.4 Send the link

Send the person the app URL and these instructions: *Open the link, sign in with your Auxis account, then pick a project in the Project list.* The Project list shows only the projects they may see.

If the app keeps loading on a link to a specific page, open the base URL first, then the page.

## 5. Executives and directors outside the supervisor chain (manual list)

1. Download `Files/Finance/pm_performance_hub/pm_app_access_list.csv` from Lakehouse **LH_Corp_DataHub**. If it doesn't exist, start from `pipeline/security/pm_app_access_list.template.csv` in the repo.
2. Add one row per person and area:

   | user_upn | scope | area | Sees |
   |---|---|---|---|
   | `exec@auxis.com` | `all` | *(empty)* | The whole company |
   | `director@auxis.com` | `area` | `BPO` | All of L1 = BPO |
   | `director2@auxis.com` | `area` | `BPO-BTR` | L1 = BPO, L2 = BTR |
   | `manager@auxis.com` | `area` | `BPO-BTR-CORE` | Only that L3 |

   A person with two areas gets two rows.
3. Upload the file back to the same folder with the same name, replacing the old one.
4. Run the gold notebook, or wait for its next scheduled run.
5. Give the person app access (section 4, or the group in section 6). Executives can go in role `All company_app` instead.

The gold log reports list problems on every run: areas that match no project (usually a typo), emails not found in HR, and rows with an invalid scope. All three should be 0.

## 6. Onboard a new PM (routine)

1. **Check that they're the PM in Project Operations** for their projects. If not, the PMO sets it in Project Operations. The app follows Project Operations.
2. **Give app access:** add them to `PMHub-Users` (section 3) or follow section 4.
3. Their projects appear after the next gold run (and the model refresh it triggers).
4. Verify (section 8).

Supervisors don't need their own step for data: they get their PMs' projects automatically. They only need app access (step 2).

## 7. Remove access

1. Remove the person from `PMHub-Users`, or undo section 4: remove them from the role, from the model's permissions and from the app's permissions.
2. If they're in the manual list, delete their rows from the CSV and upload it again.
3. A PM who leaves Project Operations or UKG loses their data access on the next gold run, even before step 1.

## 8. Verify access

- **Test as role in Fabric:** on the semantic model, select **⋯**, **Security**, then **⋯** next to `Project access_app`, then **Test as role**. Choose **Other user**, type the person's email and check the Project list shows only their projects.
- **Expected values on 2026-11-16** (for the pilot): Iliak Herrera sees 27 projects (his 18 plus Franklin Calderon's 9), Franklin Calderon sees 9, Adan Rivera Hernandez sees all 318.
- **Gold log:** each run prints `PM app access: <rows> rows, <users> users, <keys> of <total> project keys covered`. On 2026-11-16 it was 1,737 rows, 49 users, 318 of 318.

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| The app shows "Sign in" or an access error | No permission to run the app or no Read/Build on the model | Section 4.2 and 4.3 |
| The app opens but the Project list is empty | Not in a role, or not a PM / supervisor / list member | Section 4.1; check Project Operations and UKG; or add to the manual list |
| A PM is missing one project | That project's PM in Project Operations is someone else; or the project key holds several Project Ops projects (#30 rule picks the active one) | PMO fixes the PM in Project Operations |
| A PM sees nothing although they're the PM | Their account has no UPN in HR (`hr.vw_dim_employee_details`); the gold log counts these ("project keys whose PM has no UPN") | HR / IT fixes the account; their supervisors still see the projects |
| A person sees every project | They're Admin, Member or Contributor of the workspace, which bypasses row-level security | Remove that workspace role; use only this SOP's permissions |

**About Build permission.** The app needs Build on the model to run its queries. Build also lets a person connect to the model from Excel or Power BI Desktop. Project data (hours, revenue, plan) stays filtered by the role, but a few lookup tables aren't filtered yet (for example, the employee list). Before opening the app to many people, decide with Ion whether to add row-level security to those tables too.

## 10. References

- Rules and decisions: `docs/04_decisions_and_open_items.md` (open items #29, #30) and `pipeline/security/README.md`.
- Roles and tests: `docs/08_app_measures.md` §§ 16–17.
- Gold code: `pipeline/notebooks/NB_Corp_Finance_DataHub_ELT_Gold_Profitability.ipynb` (step 4b).
