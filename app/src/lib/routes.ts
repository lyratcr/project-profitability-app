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
}

export type PageId = "effort" | "headcount" | "fte" | "flows" | "yield" | "projects";

export const PAGES: readonly PageDef[] = [
    { id: "effort", path: "/effort", label: "Effort", title: "Effort Distribution", purpose: "Where the hours go.", task: "3.1" },
    { id: "headcount", path: "/headcount", label: "Headcount", title: "Headcount Overview", purpose: "How many people over time.", task: "3.2" },
    { id: "fte", path: "/fte", label: "FTE", title: "FTE Overview", purpose: "How the people are allocated.", task: "3.3" },
    { id: "flows", path: "/flows", label: "Flows", title: "Intercompany & Cross-Charge", purpose: "Hours that cross countries or areas.", task: "3.4" },
    { id: "yield", path: "/yield", label: "Yield", title: "Revenue & Capacity Yield", purpose: "Revenue produced per unit of capacity.", task: "3.5" },
    { id: "projects", path: "/projects", label: "Projects", title: "Project Progress", purpose: "Progress of my projects against plan, and the Monday timesheet review.", task: "4.1" },
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
