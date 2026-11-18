import type { FilterKey, PeriodKind } from "./filters";

/**
 * App pages (docs/05_app_design.md § 3). Routing is hash-based (`#/effort`) so deep links
 * work on Fabric static hosting without server rewrites; page state goes in the hash query.
 */
export interface PageDef {
    id: PageId;
    path: `/${string}`;
    /** Short tab label. */
    label: string;
    title: string;
    purpose: string;
    /** Build plan task that delivers the page. */
    task: string;
    /** Global filters shown on the page and applied to its queries. */
    filters: readonly FilterKey[];
    /** Period kinds the page accepts (P5 is monthly by design). */
    periodKinds: readonly PeriodKind[];
}

// PM app pages (Ion, 2026-11-16; tab labels "Project Health" and "Resource Utilization"): Project Progress, moved out of the executive app (app/, P1-P5), is the home page;
// it works by Sunday-Saturday week (lib/weeks.ts) instead of a period. Resource Utilization is a placeholder tab for now
// (an urgent need in the company; to be designed later, build plan task 6.8): no filters, no data. Resource Allocation is a
// placeholder tab too (Ion, 2026-11-18, task 6.17): people planned on projects week by week; it needs the Project Ops resource
// assignments in gold, since the Fixed Fee Backlog has no people.
export type PageId = "projects" | "utilization" | "allocation";

export const PAGES: readonly PageDef[] = [
    { id: "projects", path: "/projects", label: "Project Health", title: "Project Progress", purpose: "Progress of my projects against plan, and the Monday timesheet review.", task: "4.1", filters: ["org", "customer", "pm", "project"], periodKinds: [] },
    { id: "utilization", path: "/utilization", label: "Resource Utilization", title: "Resource Utilization", purpose: "How the team members' time is used.", task: "6.8", filters: [], periodKinds: [] },
    { id: "allocation", path: "/allocation", label: "Resource Allocation", title: "Resource Allocation", purpose: "Who is planned on which projects, week by week.", task: "6.17", filters: [], periodKinds: [] },
];

export const DEFAULT_PAGE: PageDef = PAGES[0];

export interface Route {
    page: PageDef;
    /** Query parameters after `?` in the hash (page state). */
    params: URLSearchParams;
}

/** Parses `#/path?query`. Unknown or empty paths resolve to the default page. */
export function parseHash(hash: string): Route {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    const [path, query = ""] = raw.split("?", 2);
    const normalized = path.replace(/\/+$/, "").toLowerCase();
    const page = PAGES.find((p) => p.path === normalized) ?? DEFAULT_PAGE;
    return { page, params: new URLSearchParams(query) };
}

export function pageHref(page: PageDef, params?: URLSearchParams): string {
    const query = params?.toString();
    return `#${page.path}${query ? `?${query}` : ""}`;
}
