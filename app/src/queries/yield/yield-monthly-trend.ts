import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import { applyFilters } from "@/lib/filters";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { trendSpec } from "@/queries/shared/trend-spec";
import query from "./yield-monthly-trend.dax?raw";

/** P5 monthly trend. `filters` must carry the 12-month window (`dateRangeArg(monthWindow(...))`), not the month. */
export const yieldTrendColumns = {
    month: "dim_calendar[year_month]",
    monthNumber: "dim_calendar[year_month_number]",
    revenue: "[Revenue]",
    revenuePerFte: "[RevenuePerFTE]",
} as const;

const columnMetadata: ColumnMetadataMap = {
    [yieldTrendColumns.month]: { name: "Month", displayName: "Month" },
    [yieldTrendColumns.monthNumber]: { name: "MonthNumber", displayName: "Month number" },
    [yieldTrendColumns.revenue]: { name: "Revenue", displayName: "Actual revenue", format: "\\$#,0;(\\$#,0);\\$#,0" },
    [yieldTrendColumns.revenuePerFte]: { name: "RevenuePerFTE", displayName: "Revenue per FTE", format: "\\$#,0;(\\$#,0);\\$#,0" },
};

/**
 * The shared bars + line trend, keeping the query's month order (`sort: null`): VegaVisual's layered marks
 * order x labels alphabetically and ignore a sort by another field (log 2026-11-04).
 */
function monthlySpec(): VisualizationSpec {
    const spec = trendSpec({ kind: "bars-line", x: "Month", xSort: "MonthNumber", y: "Revenue", line: "RevenuePerFTE" }) as VisualizationSpec & {
        encoding: { x: Record<string, unknown> };
    };
    spec.encoding.x.sort = null;
    return spec;
}

export function yieldMonthlyTrend({ filters = [] }: { filters?: readonly string[] } = {}) {
    return { connection: "profitmodel", query: applyFilters(query, filters), columnMetadata, vegaLiteSpec: monthlySpec() } as const;
}
