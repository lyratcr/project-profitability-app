import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import { applyFilters } from "@/lib/filters";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { trendSpec } from "@/queries/shared/trend-spec";
import query from "./projects-weekly-trend.dax?raw";

/** P6 weekly trend. `filters` = project + the 12-week window (`dateRangeArg` of `trendWindow(…, PROJECT_TREND_WEEKS)`). */
export const projectsTrendColumns = {
    weekStart: "dim_calendar[start_of_week_sun]",
    hours: "[Hours]",
    plannedHours: "[PlannedHours]",
    week: "[Week]",
    weekKey: "[WeekKey]",
} as const;

/** Weeks in the P6 trend (docs/05_app_design.md: last 12 weeks). */
export const PROJECT_TREND_WEEKS = 12;

const columnMetadata: ColumnMetadataMap = {
    [projectsTrendColumns.weekStart]: { name: "WeekStart", displayName: "Week starting" },
    [projectsTrendColumns.hours]: { name: "Hours", displayName: "Synerion hours", format: "#,0" },
    [projectsTrendColumns.plannedHours]: { name: "PlannedHours", displayName: "Planned hours", format: "#,0" },
    [projectsTrendColumns.week]: { name: "Week", displayName: "Week" },
    [projectsTrendColumns.weekKey]: { name: "WeekKey", displayName: "Week key" },
};

/**
 * The shared bars + line trend (independent axes), keeping the query's week order (`sort: null`): VegaVisual's
 * layered marks order x labels alphabetically and ignore a sort by another field (log 2026-11-04).
 */
function weeklySpec(): VisualizationSpec {
    const spec = trendSpec({ kind: "bars-line", x: "Week", xSort: "WeekKey", y: "Hours", line: "PlannedHours" }) as VisualizationSpec & {
        encoding: { x: Record<string, unknown> };
    };
    // Transparent ground: the Auxis card is the only surface behind the chart.
    (spec as Record<string, unknown>).background = "transparent";
    spec.encoding.x.sort = null;
    // Points on the plan line: a Fixed Fee plan has one value a month, which a line alone doesn't draw.
    const layers = (spec as unknown as { layer: { layer: { mark: unknown; encoding: { y: Record<string, unknown> } }[] }[] }).layer;
    layers[1].layer[0].mark = { type: "line", point: true };
    // Both series are hours: one shared axis, so the bar and the line can be compared directly.
    layers[0].layer[0].encoding.y.title = "Hours";
    layers[1].layer[0].encoding.y.axis = null;
    layers[1].layer[0].encoding.y.title = "Hours";
    (spec as Record<string, unknown>).resolve = { scale: { y: "shared" } };
    return spec;
}

export function projectsWeeklyTrend({ filters = [] }: { filters?: readonly string[] } = {}) {
    return { connection: "profitmodel", query: applyFilters(query, filters), columnMetadata, vegaLiteSpec: weeklySpec() } as const;
}
