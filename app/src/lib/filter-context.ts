import { describePeriod, type FilterOptions, type FilterState } from "./filters";
import type { PageDef } from "./routes";

/** Filter context in words, limited to the filters the page applies. */
export function describeFilterContext(page: PageDef, filters: FilterState, options: FilterOptions | null): string {
    const parts: string[] = [];
    if (page.filters.includes("period")) parts.push(describePeriod(filters.period));
    if (page.filters.includes("country")) parts.push(filters.country ?? "All countries");
    if (page.filters.includes("customer")) parts.push(filters.customer?.trim() ?? "All customers");
    if (page.filters.includes("project")) {
        const name = options?.projects.find((p) => p.key === filters.project)?.name;
        parts.push(filters.project ? (name ?? filters.project) : "All projects");
    }
    return parts.join(" · ");
}
