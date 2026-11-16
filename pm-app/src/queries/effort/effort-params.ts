import { applyFilters } from "@/lib/filters";
import { applyOrgView, DEFAULT_ORG_VIEW, type OrgView } from "@/lib/org-view";

/**
 * P1 Effort Distribution (docs/05_app_design.md § 3). Every factory takes the DAX filter arguments
 * built by lib/filters.ts (`filterArgs`, plus the trend's week window) and the page's org view, which
 * picks the org-aware `_app` measures. No number is computed in code.
 */
export interface EffortParams {
    /** SUMMARIZECOLUMNS filter arguments from `filterArgs` / `dateRangeArg`. */
    filters?: readonly string[];
    view?: OrgView;
}

export const EFFORT_CONNECTION = "profitmodel";

export function buildEffortQuery(query: string, { filters = [], view = DEFAULT_ORG_VIEW }: EffortParams): string {
    return applyFilters(applyOrgView(query, view), filters);
}
