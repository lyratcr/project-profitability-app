import { useCallback, useMemo } from "react";
import { useFilterOptions } from "@/hooks/use-filter-options";
import { coercePeriod, readFilters, writeFilters, type FilterOptions, type FilterState } from "@/lib/filters";
import { pageHref, type Route } from "@/lib/routes";

export interface GlobalFilters {
    state: FilterState;
    options: FilterOptions | null;
    optionsLoading: boolean;
    optionsError: string | undefined;
    customersLoading: boolean;
    projectsLoading: boolean;
    /** Replaces the filter state in the URL (adds a history entry, so Back undoes it). */
    setFilters: (next: FilterState) => void;
}

/** Filter state from the URL, validated against the model's own values. */
export function useGlobalFilters(route: Route, now: Date = new Date()): GlobalFilters {
    // Local date and hour: the Monday review window ends on Tuesday morning (lib/weeks.ts).
    const nowKey = [now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()].join("-");
    const paramsKey = route.params.toString();
    const { options, isLoading, error, customersLoading, projectsLoading } = useFilterOptions(
        route.params,
        route.page.filters.includes("org"),
        route.page.filters.includes("customer"),
    );

    const kinds = route.page.periodKinds;
    const state = useMemo(() => {
        const [y, m, d, h] = nowKey.split("-").map(Number);
        const at = new Date(y, m, d, h);
        const read = readFilters(new URLSearchParams(paramsKey), at, options);
        return { ...read, period: coercePeriod(read.period, kinds, at) };
    }, [paramsKey, nowKey, options, kinds]);

    const setFilters = useCallback(
        (next: FilterState) => {
            window.location.hash = pageHref(route.page, writeFilters(new URLSearchParams(paramsKey), next));
        },
        [route.page, paramsKey],
    );

    return { state, options, optionsLoading: isLoading, optionsError: error, customersLoading, projectsLoading, setFilters };
}
