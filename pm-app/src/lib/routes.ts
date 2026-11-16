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

// The PM app has one page (Ion, 2026-11-16): Project Progress, moved out of the executive app (app/, P1-P5).
// It works by Sunday-Saturday week (lib/weeks.ts) instead of a period.
export type PageId = "projects";

export const PAGES: readonly PageDef[] = [
    { id: "projects", path: "/projects", label: "Projects", title: "Project Progress", purpose: "Progress of my projects against plan, and the Monday timesheet review.", task: "4.1", filters: ["week", "project"], periodKinds: [] },
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
