import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { trendSpec } from "@/queries/shared/trend-spec";
import { buildEffortQuery, EFFORT_CONNECTION, type EffortParams } from "./effort-params";
import trendQuery from "./effort-weekly-trend.dax?raw";

// P1 weekly trend.

export const trendColumns = {
    weekStart: "dim_calendar[start_of_week_sun]",
    payCategory: "fact_profitability_metrics[pay_category_description]",
    hours: "[Hours]",
    week: "[Week]",
    weekKey: "[WeekKey]",
} as const;

const trendMetadata: ColumnMetadataMap = {
    [trendColumns.weekStart]: { name: "WeekStart", displayName: "Week starting" },
    [trendColumns.payCategory]: { name: "PayCategory", displayName: "Pay category" },
    [trendColumns.hours]: { name: "Hours", displayName: "Hours", format: "#,0" },
    [trendColumns.week]: { name: "Week", displayName: "Week" },
    [trendColumns.weekKey]: { name: "WeekKey", displayName: "Week key" },
};

/** `filters` must carry the trend's week window (`dateRangeArg(trendWindow(...))`), not the page period. */
export function effortWeeklyTrend(params: EffortParams = {}) {
    return {
        connection: EFFORT_CONNECTION,
        query: buildEffortQuery(trendQuery, params),
        columnMetadata: trendMetadata,
        vegaLiteSpec: weeklySpec(),
    } as const;
}

/** Synerion pay categories, main first (the colour order of the chart). */
export const PAY_CATEGORIES = ["Regular Time", "Overtime", "Holiday", "Time Off"] as const;

/**
 * The shared stacked trend with two changes. Weeks keep the query's order (ORDER BY start_of_week_sun,
 * `sort: null`): VegaVisual's stacked-bar overlay orders the x labels alphabetically and ignores a sort
 * by another field, with or without an aggregate op (checked in the browser, 2026-11-04). And the labels
 * are angled, since 26 weeks don't fit side by side.
 */
function weeklySpec(): VisualizationSpec {
    const spec = trendSpec({ kind: "stacked", x: "Week", xSort: "WeekKey", y: "Hours", color: "PayCategory" }) as VisualizationSpec & {
        encoding: { x: Record<string, unknown>; color: Record<string, unknown> };
    };
    // Transparent ground: the Auxis card (ax-card gradient) is the only surface behind the chart.
    (spec as Record<string, unknown>).background = "transparent";
    spec.encoding.x.sort = null;
    // Auxis series order: the main measure (Regular Time) takes chart-1 (gold), then the others.
    spec.encoding.color.scale = { domain: [...PAY_CATEGORIES] };
    spec.encoding.x.axis = { labelAngle: -45, labelLimit: 0 };
    return spec;
}
