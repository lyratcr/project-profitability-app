// Builds the Word version of docs/09_pm_app_access_sop.md (SOP: access to PM Performance Hub).
// The content below mirrors that Markdown file: change the Markdown first, then this script.
// Usage (from any folder with the npm package `docx` installed): node make_sop_docx.js <output.docx>
// Then open the .docx in Word once and update the table of contents (References → Update Table).
const fs = require("fs");
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
    HeadingLevel, LevelFormat, BorderStyle, Header, Footer, PageNumber, TableOfContents,
} = require("docx");

const OUT = process.argv[2];
const FONT = "Arial";
const INK = "272425";
const GOLD = "F2B705";
const MUTED = "6B6566";
const LINE = "D9D4CF";
const SOFT = "F6F3EF";
const PAGE_W = 12240, MARGIN = 1080, CONTENT_W = PAGE_W - 2 * MARGIN; // US Letter, 0.75" margins

// ---------- inline text: **bold** and `code` ----------
function runs(text, opts = {}) {
    const out = [];
    const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
        if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...opts }));
        const t = m[0];
        if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...opts }));
        else out.push(new TextRun({ text: t.slice(1, -1), font: "Consolas", size: 19, ...opts }));
        last = m.index + t.length;
    }
    if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...opts }));
    return out;
}
const P = (text, o = {}) => new Paragraph({ children: runs(text), spacing: { after: 120 }, ...o });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const bullet = (t, level = 0) => new Paragraph({ numbering: { reference: "bullets", level }, children: runs(t), spacing: { after: 60 } });
let listId = 0;
function steps(items) {
    const ref = `steps${listId++}`;
    numberingConfigs.push({
        reference: ref,
        levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } },
            { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
    });
    const out = [];
    for (const it of items) {
        if (Array.isArray(it)) it.forEach((sub) => out.push(new Paragraph({ numbering: { reference: ref, level: 1 }, children: runs(sub), spacing: { after: 40 } })));
        else out.push(new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(it), spacing: { after: 80 } }));
    }
    return out;
}
function callout(text, title = "Important") {
    return new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [CONTENT_W],
        rows: [new TableRow({
            children: [new TableCell({
                width: { size: CONTENT_W, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: "FFF6D6", color: "auto" },
                borders: { left: { style: BorderStyle.SINGLE, size: 24, color: GOLD }, top: none(), bottom: none(), right: none() },
                margins: { top: 120, bottom: 120, left: 200, right: 200 },
                children: [new Paragraph({ children: [new TextRun({ text: `${title}: `, bold: true }), ...runs(text)] })],
            })],
        })],
    });
}
function none() { return { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }; }
function table(headers, rows, widths) {
    const total = widths.reduce((a, b) => a + b, 0);
    const cell = (text, head) => new TableCell({
        width: { size: 0, type: WidthType.DXA },
        shading: head ? { type: ShadingType.CLEAR, fill: INK, color: "auto" } : undefined,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: runs(text, head ? { bold: true, color: "FFFFFF" } : {}) })],
    });
    const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
    return new Table({
        width: { size: total, type: WidthType.DXA },
        columnWidths: widths,
        borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
        rows: [
            new TableRow({ tableHeader: true, children: headers.map((h, i) => { const c = cell(h, true); c.options = c.options; return withWidth(c, widths[i], h, true); }) }),
            ...rows.map((r, ri) => new TableRow({ children: r.map((t, i) => withWidth(null, widths[i], t, false, ri % 2 === 1)) })),
        ],
    });
}
function withWidth(_unused, w, text, head, zebra) {
    return new TableCell({
        width: { size: w, type: WidthType.DXA },
        shading: head ? { type: ShadingType.CLEAR, fill: INK, color: "auto" } : zebra ? { type: ShadingType.CLEAR, fill: SOFT, color: "auto" } : undefined,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: runs(text, head ? { bold: true, color: "FFFFFF" } : {}) })],
    });
}
const gap = () => new Paragraph({ spacing: { after: 120 }, children: [] });

const numberingConfigs = [
    {
        reference: "bullets",
        levels: [
            { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } },
            { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 300 } } } },
        ],
    },
];

// ---------- content ----------
const APP_URL = "https://magic-maple-28bbbd8e63-eastus2.webapp.fabricapps.net";
const body = [];

// Title block
body.push(new Paragraph({ children: [new TextRun({ text: "STANDARD OPERATING PROCEDURE", bold: true, color: MUTED, size: 18, characterSpacing: 40 })], spacing: { after: 60 } }));
body.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Access to PM Performance Hub")] }));
body.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 6 } },
    spacing: { after: 240 },
    children: [new TextRun({ text: "How to grant, remove and verify access for project managers, supervisors, directors and executives.", color: MUTED })],
}));
body.push(table(["Item", "Value"], [
    ["App", "PM Performance Hub (Fabric item `pm-project-progress`)"],
    ["Workspace", "`_Corporate DCOE Backend Dev`"],
    ["App URL", APP_URL],
    ["Semantic model", "`SM_Corp_Project_Real_Profitability`"],
    ["Lakehouse", "`LH_Corp_DataHub`"],
    ["Owner", "Ion (DCOE)"],
    ["Version", "1.1, 2026-11-17"],
], [2600, CONTENT_W - 2600]));
body.push(gap());
body.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-1" }));

// 1
body.push(H1("1. Purpose and scope"));
body.push(P("This SOP explains how to give a person access to PM Performance Hub, how to remove it, and how to check that each person sees only what they should. It covers project managers (PMs), their supervisors, directors and executives. Follow it when the app owner is not available."));

// 2
body.push(H1("2. How access works"));
body.push(P("Two separate things decide what a person sees in the app."));
body.push(H2("A. Which projects a person sees (automatic)"));
body.push(P("The gold notebook `NB_Corp_Finance_DataHub_ELT_Gold_Profitability` rebuilds the table `gold.security_project_access` on every run. It applies these rules, which add up:"));
body.push(table(["Rule", "Source", "Maintained by"], [
    ["A PM sees their own projects", "Project Operations (project manager on the project)", "PMO / Project Operations; nothing to do here"],
    ["Every supervisor up the PM's chain sees the PM's projects", "UKG (supervisor of each employee)", "HR / UKG; nothing to do here"],
    ["Executives and directors outside that chain see everything or an area", "Manual list `pm_app_access_list.csv` (section 5)", "The app owner"],
], [3000, 3600, CONTENT_W - 6600]));
body.push(gap());
body.push(P("When a project changes PM in Project Operations, or a person changes supervisor in UKG, access updates on the next gold run with no manual step."));
body.push(H2("B. Whether a person can open the app (manual)"));
body.push(P("The person needs all three of the following:"));
body.push(...steps([
    "Membership in a security role of the semantic model: `Project access_app`, or `All company_app` for executives.",
    "**Read** and **Build** permission on the semantic model.",
    "Permission to open and run the app item `pm-project-progress`.",
]));
body.push(callout("Never give app users the **Admin**, **Member** or **Contributor** role on the workspace. Those roles bypass row-level security, so the person would see every project. App users get only the permissions in this SOP."));
body.push(H2("C. How the model reads the data (one-time setup, done 2026-11-17)"));
body.push(P("The model is Direct Lake on OneLake. Its OneLake data source is bound to the cloud connection **OneLake LH_Corp_DataHub - SM_Corp_Project_Real_Profitability (fixed identity)**: OAuth 2.0 as `powerbi@auxis.com`, with **Use Entra ID SSO for DirectQuery and Direct Lake** turned off. So app users need no access to Lakehouse `LH_Corp_DataHub`, and the model's row-level security still applies to each viewer."));
body.push(P("To check it: on **SM_Corp_Project_Real_Profitability**, select **⋯**, **Settings**, then **Gateway and cloud connections**. The OneLake source must say **Maps to: OneLake LH_Corp_DataHub - SM_Corp_Project_Real_Profitability (fixed identity)**. Never switch it back to **Default: Single Sign-On**. With SSO the model reads the Lakehouse as the viewer, and anyone without a workspace role gets no data (section 9)."));

// 3
body.push(H1("3. One-time setup with a security group (recommended)"));
body.push(P("Granting the three permissions to one Entra ID security group, instead of to each person, turns onboarding into a single step: add the person to the group."));
body.push(...steps([
    "Ask IT to create an Entra ID security group, for example **PMHub-Users**, and to give the app owner rights to manage its members.",
    "Add the group to the role `Project access_app` (section 4.1; type the group name instead of a person).",
    "Give the group Read and Build on the semantic model (section 4.2).",
    "Share the app with the group (section 4.3).",
]));
body.push(P("From then on, onboarding a PM or supervisor means adding them to **PMHub-Users** (section 6). Executives still go in the manual list (section 5) or in `All company_app`."));
body.push(P("**Full automation (optional, needs IT).** IT can make PMHub-Users a dynamic group, so Entra ID adds people automatically based on an attribute such as job title or department. Row-level security limits every user to their own projects, so a person in the group who is not a PM or supervisor sees an empty app, not someone else's data. Decide this with IT and the app owner (see the note on Build permission in section 9)."));

// 4
body.push(H1("4. Grant access to one person"));
body.push(P("Use this for the pilot users or for one-off cases. Always use the person's sign-in email (UPN), for example `name@auxis.com`."));
body.push(H2("4.1 Add the person to a security role"));
body.push(...steps([
    "Open https://app.fabric.microsoft.com and go to the workspace **_Corporate DCOE Backend Dev**.",
    "Find the semantic model **SM_Corp_Project_Real_Profitability**, select **⋯ (More options)**, then **Security**.",
    "On the left, select the role:",
    ["**Project access_app** for PMs, supervisors and directors.", "**All company_app** for executives who see the whole company."],
    "Under **Members**, type the person's email and select them.",
    "Select **Add**, then **Save**.",
]));
body.push(H2("4.2 Give Read and Build on the semantic model"));
body.push(...steps([
    "In the same workspace, on **SM_Corp_Project_Real_Profitability**, select **⋯**, then **Manage permissions**.",
    "Select **+ Add user** and type the person's email.",
    "Tick **Allow recipients to build content with the data associated with this semantic model** (this is the Build permission). Leave reshare unticked.",
    "Select **Grant**.",
]));
body.push(H2("4.3 Share the app"));
body.push(...steps([
    "In the workspace, find the item **pm-project-progress** (PM Performance Hub), select **⋯**, then **Share** (or **Manage permissions** → **Add user**).",
    "Type the person's email and grant permission to open and run the app. Leave reshare and edit unticked.",
    "Select **Grant**.",
]));
body.push(H2("4.4 Send the link"));
body.push(P(`Send the person the app URL (${APP_URL}) with these instructions: open the link, sign in with your Auxis account, then pick a project in the Project list. The list shows only the projects they may see.`));
body.push(P("If the app keeps loading on a link to a specific page, open the base URL first, then the page."));

// 5
body.push(H1("5. Executives and directors outside the supervisor chain"));
body.push(P("These people go in a manual list kept in the Lakehouse."));
body.push(...steps([
    "In Fabric, open Lakehouse **LH_Corp_DataHub** → **Files** → **Finance** → **pm_performance_hub** and download `pm_app_access_list.csv`.",
    "Add one row per person and area (columns `user_upn`, `scope`, `area`). A person with two areas gets two rows.",
    "Upload the file back to the same folder with the same name, replacing the old one.",
    "Run the gold notebook, or wait for its next scheduled run.",
    "Give the person app access (section 4, or the group in section 6). Executives can go in role `All company_app` instead.",
]));
body.push(table(["user_upn", "scope", "area", "Sees"], [
    ["exec@auxis.com", "all", "(empty)", "The whole company"],
    ["director@auxis.com", "area", "BPO", "All of L1 = BPO"],
    ["director2@auxis.com", "area", "BPO-BTR", "L1 = BPO and L2 = BTR"],
    ["manager@auxis.com", "area", "BPO-BTR-CORE", "Only that L3"],
], [2900, 1200, 2200, CONTENT_W - 6300]));
body.push(gap());
body.push(P("The area is the organization path as Project Operations writes it, joined by hyphens: L1, L1-L2 or L1-L2-L3. Case and spaces are ignored. The gold log reports list problems on every run: areas that match no project (usually a typo), emails not found in HR, and rows with an invalid scope. All three should be 0."));

// 6
body.push(H1("6. Onboard a new PM (routine)"));
body.push(...steps([
    "**Check they are the PM in Project Operations** for their projects. If not, the PMO sets it there; the app follows Project Operations.",
    "**Give app access:** add them to PMHub-Users (section 3) or follow section 4.",
    "Their projects appear after the next gold run and the model refresh it triggers.",
    "Verify (section 8).",
]));
body.push(P("Supervisors need no data step: they get their PMs' projects automatically. They only need app access (step 2)."));

// 7
body.push(H1("7. Remove access"));
body.push(...steps([
    "Remove the person from PMHub-Users, or undo section 4: remove them from the role, from the model permissions and from the app permissions.",
    "If they are in the manual list, delete their rows from the CSV and upload it again.",
    "A PM who leaves Project Operations or UKG loses data access on the next gold run, even before step 1.",
]));

// 8
body.push(H1("8. Verify access"));
body.push(bullet("**Test as role:** on the semantic model, select **⋯** → **Security**, then **⋯** next to `Project access_app` → **Test as role**. Choose **Other user**, type the person's email and check that the Project list shows only their projects."));
body.push(bullet("**Reference values (2026-11-16, pilot):** Iliak Herrera sees 27 projects (his 18 plus Franklin Calderon's 9); Franklin Calderon sees 9; Adan Rivera Hernandez sees all 318."));
body.push(bullet("**Gold log:** each run prints `PM app access: <rows> rows, <users> users, <keys> of <total> project keys covered`. On 2026-11-16: 1,737 rows, 49 users, 318 of 318."));

// 9
body.push(H1("9. Troubleshooting"));
body.push(table(["Symptom", "Likely cause", "Fix"], [
    ["The app shows Sign in or an access error", "No permission to run the app, or no Read / Build on the model", "Sections 4.2 and 4.3"],
    ["The app opens but shows no data: Data dates unavailable (query) at the top and Filter values unavailable in the filters", "The model reads the Lakehouse as the viewer (Single Sign-On), and the viewer has no access to it. Only workspace members see data", "Section 2C: map the OneLake source to the fixed-identity connection. If it already is, edit the connection's OAuth credentials as powerbi@auxis.com in Manage connections and gateways"],
    ["The app opens but the Project list is empty", "Not in a role; or not a PM, supervisor or list member", "Section 4.1; check Project Operations and UKG; or add to the manual list"],
    ["A PM is missing one project", "Another person is the PM of that project in Project Operations; or the project key holds several Project Ops projects and the active one wins", "The PMO fixes the PM in Project Operations"],
    ["A PM sees nothing although they are the PM", "Their account has no UPN in HR; the gold log counts these (project keys whose PM has no UPN)", "HR / IT fixes the account; their supervisors still see the projects"],
    ["A person sees every project", "They are Admin, Member or Contributor of the workspace, which bypasses row-level security", "Remove that workspace role and use only this SOP's permissions"],
], [2900, 3600, CONTENT_W - 6500]));
body.push(gap());
body.push(callout("The app needs Build on the model to run its queries. Build also lets a person connect to the model from Excel or Power BI Desktop. Project data (hours, revenue, plan) stays filtered by the role, but a few lookup tables are not filtered yet (for example, the employee list). Before opening the app to many people, confirm with the app owner whether row-level security has been added to those tables.", "Note on Build permission"));

// 10
body.push(H1("10. References"));
body.push(bullet("Rules and decisions: `docs/04_decisions_and_open_items.md` (open items #29, #30) and `pipeline/security/README.md` in the app repository."));
body.push(bullet("Roles and tests: `docs/08_app_measures.md`, sections 16 and 17."));
body.push(bullet("Model connection (fixed identity) and its owner: `docs/04_decisions_and_open_items.md`, log 2026-11-17 and open item #32."));
body.push(bullet("Gold code: `pipeline/notebooks/NB_Corp_Finance_DataHub_ELT_Gold_Profitability.ipynb` (step 4b)."));
body.push(bullet("Source of this document: `docs/09_pm_app_access_sop.md` (Markdown version kept in the repository)."));

// ---------- document ----------
const doc = new Document({
    creator: "DCOE",
    title: "SOP: Access to PM Performance Hub",
    features: { updateFields: true },
    styles: {
        default: { document: { run: { font: FONT, size: 21, color: INK }, paragraph: { spacing: { line: 276 } } } },
        paragraphStyles: [
            { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { font: FONT, size: 44, bold: true, color: INK }, paragraph: { spacing: { before: 0, after: 80 }, keepNext: true } },
            { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 28, bold: true, color: INK }, paragraph: { spacing: { before: 320, after: 120 }, keepNext: true, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 } } } },
            { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 23, bold: true, color: INK }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 1 } },
        ],
    },
    numbering: { config: numberingConfigs },
    sections: [{
        properties: { page: { size: { width: PAGE_W, height: 15840 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
        headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "SOP · Access to PM Performance Hub", color: MUTED, size: 16 })] })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Version 1.0 · 2026-11-16 · Page ", color: MUTED, size: 16 }), new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16 }), new TextRun({ text: " of ", color: MUTED, size: 16 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], color: MUTED, size: 16 })] })] }) },
        children: body,
    }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("written", OUT); });
