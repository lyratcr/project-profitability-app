import type { PageDef } from "@/lib/routes";

/**
 * Page definitions of the executive app (app/src/lib/routes.ts), kept as test fixtures: the shared filter bar and
 * filter context still support period, organization, country and customer filters, which the PM app's only page
 * (Project Progress) doesn't show. These keep that shared behaviour covered.
 */
const EXECUTIVE_PAGES = [
    { id: "effort", path: "/effort", label: "Effort", title: "Effort Distribution", purpose: "Where the hours go.", task: "3.1", filters: ["period", "org", "country", "customer", "project"], periodKinds: ["month", "quarter", "ytd", "range"] },
    { id: "headcount", path: "/headcount", label: "Headcount", title: "Headcount Overview", purpose: "How many people over time.", task: "3.2", filters: ["period", "org", "country", "customer", "project"], periodKinds: ["month", "quarter", "ytd", "range"] },
    { id: "flows", path: "/flows", label: "Flows", title: "Intercompany & Cross-Charge", purpose: "Hours that cross countries or areas.", task: "3.4", filters: ["period", "org", "country", "customer", "project"], periodKinds: ["month", "quarter", "ytd", "range"] },
    { id: "fte", path: "/fte", label: "FTE", title: "FTE Overview", purpose: "How the people are allocated.", task: "3.3", filters: ["period", "org", "country", "customer", "project"], periodKinds: ["month", "quarter", "ytd", "range"] },
    { id: "yield", path: "/yield", label: "Yield", title: "Revenue & Capacity Yield", purpose: "Revenue produced per unit of capacity.", task: "3.5", filters: ["period", "org", "customer", "project"], periodKinds: ["month"] },
    { id: "projects", path: "/projects", label: "Projects", title: "Project Progress", purpose: "Progress of my projects against plan, and the Monday timesheet review.", task: "4.1", filters: ["week", "project"], periodKinds: [] },
] as unknown as readonly PageDef[];

export const testPage = (id: string): PageDef => {
    const page = EXECUTIVE_PAGES.find((p) => p.id === id);
    if (!page) throw new Error(`No test page ${id}`);
    return page;
};
