/**
 * Org view for pages that show hours under the L1 > L2 > L3 filter (P1). The master hierarchy serves
 * both views (open item #19): "project" = where the work is billed (the project's org), "employee" =
 * where the people sit. The view picks which `_app` measure each visual uses; it never changes a number
 * in code. Lives in the hash query as `view=employee` (project is the default and is not written).
 */
export type OrgView = "project" | "employee";

export const ORG_VIEW_PARAM = "view";
export const DEFAULT_ORG_VIEW: OrgView = "project";

export const ORG_VIEW_LABEL: Record<OrgView, string> = {
    project: "Project org",
    employee: "Employee org",
};

export const ORG_VIEW_HINT: Record<OrgView, string> = {
    project: "Where the work is billed",
    employee: "Where the people sit",
};

/** Reads the view from the hash query; anything but "employee" is the default. */
export function readOrgView(params: URLSearchParams): OrgView {
    return params.get(ORG_VIEW_PARAM) === "employee" ? "employee" : DEFAULT_ORG_VIEW;
}

/** Writes the view into a copy of `params`; the default is left out of the URL. */
export function writeOrgView(params: URLSearchParams, view: OrgView): URLSearchParams {
    const next = new URLSearchParams(params);
    if (view === DEFAULT_ORG_VIEW) next.delete(ORG_VIEW_PARAM);
    else next.set(ORG_VIEW_PARAM, view);
    return next;
}

/** Org-aware `_app` measures per view (docs/08_app_measures.md §§ 6–8). */
export const ORG_VIEW_MEASURES: Record<OrgView, Record<string, string>> = {
    project: {
        "[@Hours]": "[Synerion Hours (Project Org)_app]",
        "[@HoursMoM]": "[Synerion Hours (Project Org) MoM %_app]",
        "[@ProductiveShare]": "[Productive Share (Project Org)_app]",
    },
    employee: {
        "[@Hours]": "[Synerion Hours (Employee Org)_app]",
        "[@HoursMoM]": "[Synerion Hours (Employee Org) MoM %_app]",
        "[@ProductiveShare]": "[Productive Share (Employee Org)_app]",
    },
};

/**
 * Replaces the `[@Token]` measure placeholders in a .dax file with the view's measures. Throws on a
 * token it doesn't know, so a typo never reaches the model as an invalid query.
 */
export function applyOrgView(query: string, view: OrgView): string {
    const map = ORG_VIEW_MEASURES[view];
    return query.replace(/\[@[A-Za-z]+\]/g, (token) => {
        const measure = map[token];
        if (measure === undefined) throw new Error(`Unknown org-view measure token ${token}.`);
        return measure;
    });
}
