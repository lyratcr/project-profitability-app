import { useCallback, useMemo } from "react";
import { useFilterOptions } from "@/hooks/use-filter-options";
import { coercePeriod, readFilters, writeFilters, type FilterOptions, type FilterState } from "@/lib/filters";
import { pageHref, type Route } from "@/lib/routes";

export interface GlobalFilters {
    state: FilterState;
    options: FilterOptions | null;
    optionsLoading: boolean;
    optionsError: string | undefined;
    /** Replaces the filter state in the URL (adds a history entry, so Back undoes it). */
    setFilters: (next: FilterState) => void;
}

/** Filter state from the URL, validated against the model's own values. */
export function useGlobalFilters(route: Route, today: Date = new Date()): GlobalFilters {
    const todayKey = today.toDateString();
    const paramsKey = route.params.toString();
    const { options, isLoading, error } = useFilterOptions(route.params, route.page.filters.includes("org"));

    const kinds = route.page.periodKinds;
    const state = useMemo(() => {
        const read = readFilters(new URLSearchParams(paramsKey), new Date(todayKey), options);
        return { ...read, period: coercePeriod(read.period, kinds, new Date(todayKey)) };
    }, [paramsKey, todayKey, options, kinds]);

    const setFilters = useCallback(
        (next: FilterState) => {
            window.location.hash = pageHref(route.page, writeFilters(new URLSearchParams(paramsKey), next));
        },
        [route.page, paramsKey],
    );

    return { state, options, optionsLoading: isLoading, optionsError: error, setFilters };
}
