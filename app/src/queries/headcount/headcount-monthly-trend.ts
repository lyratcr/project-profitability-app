import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import { applyFilters } from "@/lib/filters";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { trendSpec } from "@/queries/shared/trend-spec";
import query from "./headcount-monthly-trend.dax?raw";

/** P2 monthly trend. `filters` must carry the 12-month window (`dateRangeArg(monthWindow(...))`), not the period. */
export const headcountTrendColumns = {
    month: "dim_calendar[year_month]",
    monthNumber: "dim_calendar[year_month_number]",
    category: "fact_profitability_metrics[employee_reporting_category]",
    headcount: "[Headcount]",
} as const;

const columnMetadata: ColumnMetadataMap = {
    [headcountTrendColumns.month]: { name: "Month", displayName: "Month" },
    [headcountTrendColumns.monthNumber]: { name: "MonthNumber", displayName: "Month number" },
    [headcountTrendColumns.category]: { name: "Category", displayName: "Reporting category" },
    [headcountTrendColumns.headcount]: { name: "Headcount", displayName: "Headcount (last week)", format: "#,0" },
};

/** Every employee_reporting_category in the model, so each keeps its color whichever ones a filter leaves. */
export const REPORTING_CATEGORIES = ["Regular", "Contractor", "GT Contractor", "Intern", "Temporary Employee"] as const;

/**
 * The shared stacked trend, keeping the query's month order (`sort: null`): VegaVisual's stacked-bar overlay
 * orders x labels alphabetically and ignores a sort by another field (log 2026-11-04). The color domain is
 * fixed so a category keeps its color when a filter removes others.
 */
function monthlySpec(): VisualizationSpec {
    const spec = trendSpec({ kind: "stacked", x: "Month", xSort: "MonthNumber", y: "Headcount", color: "Category" }) as VisualizationSpec & {
        encoding: { x: Record<string, unknown>; color: Record<string, unknown> };
    };
    spec.encoding.x.sort = null;
    spec.encoding.color.scale = { domain: [...REPORTING_CATEGORIES] };
    return spec;
}

export function headcountMonthlyTrend({ filters = [] }: { filters?: readonly string[] } = {}) {
    return { connection: "profitmodel", query: applyFilters(query, filters), columnMetadata, vegaLiteSpec: monthlySpec() } as const;
}
