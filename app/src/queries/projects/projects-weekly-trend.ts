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
 * Colours for the liquid glass look (P6; Ion, 2026-11-07), read by the page from the design-system tokens
 * `--yellow-100`, `--yellow-300`, `--yellow-500`, `--ink` and `--surface` so the spec never hard-codes a hex value.
 */
export interface GlassBarColors {
    light: string;
    base: string;
    deep: string;
    /**
     * The plan line, a neutral reference line in the text colour (`--ink`). A gold or amber line next to the gold
     * bars fails the dataviz palette check (normal-vision ΔE 4.8–13.4, floor 15); ink passes in both themes.
     */
    plan: string;
    /** The chart surface (`--surface`): the 2px ring around the plan points. */
    ring: string;
}

/** Bar width in px: at most 24 (dataviz mark spec), leaving air between weeks. */
export const TREND_BAR_SIZE = 22;

type Layer = { mark: unknown; encoding: Record<string, unknown> };

/**
 * The shared bars + line trend on one hours axis, keeping the query's week order (`sort: null`): VegaVisual's
 * layered marks order x labels alphabetically and ignore a sort by another field (log 2026-11-04). With `glass`,
 * the dataviz mark specs apply: bars at most 24px with 4px rounded tops (Auxis premium gold gradient plus a glossy
 * sheen on their left side, no border), a 2px plan line with 8px points in a 2px surface ring, and one direct
 * label at the start of the plan line with its value.
 */
function weeklySpec(glass?: GlassBarColors): VisualizationSpec {
    const spec = trendSpec({ kind: "bars-line", x: "Week", xSort: "WeekKey", y: "Hours", line: "PlannedHours" }) as VisualizationSpec & {
        encoding: { x: Record<string, unknown> };
    };
    // Transparent ground: the Auxis card is the only surface behind the chart.
    (spec as Record<string, unknown>).background = "transparent";
    spec.encoding.x.sort = null;
    // Points on the plan line: a Fixed Fee plan has one value a month, which a line alone doesn't draw.
    const layers = (spec as unknown as { layer: { layer: { mark: unknown; encoding: { y: Record<string, unknown> }; transform?: unknown[] }[] }[] }).layer;
    layers[1].layer[0].mark = { type: "line", point: true };
    // Both series are hours: one shared axis, so the bar and the line can be compared directly.
    layers[0].layer[0].encoding.y.title = "Hours";
    layers[1].layer[0].encoding.y.axis = null;
    layers[1].layer[0].encoding.y.title = "Hours";
    (spec as Record<string, unknown>).resolve = { scale: { y: "shared" } };
    // One tooltip with both series (the layered default showed only the plan).
    const tooltip = [
        { field: "Week", type: "ordinal", title: "Week starting" },
        { field: "Hours", type: "quantitative", title: "Synerion hours", format: ",.0f" },
        { field: "PlannedHours", type: "quantitative", title: "Planned hours", format: ",.0f" },
    ];
    for (const group of layers) for (const layer of group.layer as Layer[]) layer.encoding.tooltip = tooltip;
    if (glass) {
        const bars = layers[0].layer as Layer[];
        const shape = { type: "bar", size: TREND_BAR_SIZE, cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 };
        bars[0].mark = {
            ...shape,
            // Bottom to top: deep gold, brand gold, soft gold.
            color: { gradient: "linear", x1: 0, y1: 1, x2: 0, y2: 0, stops: [{ offset: 0, color: glass.deep }, { offset: 0.45, color: glass.base }, { offset: 1, color: glass.light }] },
        };
        // Sheen: soft gold fading out across the left side of each bar, drawn over it; no tooltip of its own.
        bars.push({
            mark: {
                ...shape,
                opacity: 0.55,
                color: { gradient: "linear", x1: 0, y1: 0, x2: 1, y2: 0, stops: [{ offset: 0, color: glass.light }, { offset: 0.35, color: "transparent" }, { offset: 1, color: "transparent" }] },
            },
            encoding: { y: { ...(bars[0].encoding.y as Record<string, unknown>), axis: null }, tooltip },
        });
        const lineGroup = layers[1].layer as (Layer & { transform?: unknown[] })[];
        lineGroup[0].mark = {
            type: "line",
            color: glass.plan,
            strokeWidth: 2,
            strokeCap: "round",
            strokeJoin: "round",
            point: { filled: true, color: glass.plan, size: 64, stroke: glass.ring, strokeWidth: 2 },
        };
        // Direct label at the first week with plan: names the line and gives its value ("Plan 5 h"), so a small plan
        // next to large bars doesn't read as a line at 0. Text in the ink colour, never a series colour.
        lineGroup.push({
            transform: [
                { filter: "isValid(datum.PlannedHours)" },
                { joinaggregate: [{ op: "min", field: "WeekKey", as: "FirstPlanKey" }] },
                { filter: "datum.WeekKey === datum.FirstPlanKey" },
                { calculate: "'Plan ' + format(datum.PlannedHours, ',.0f') + ' h'", as: "PlanLabel" },
            ],
            mark: { type: "text", align: "left", baseline: "bottom", dx: -4, dy: -10, fontSize: 11, fontWeight: 600, color: glass.plan },
            encoding: { y: { field: "PlannedHours", type: "quantitative", axis: null, title: "Hours" }, text: { field: "PlanLabel" } },
        });
    }
    return spec;
}

export function projectsWeeklyTrend({ filters = [], glass }: { filters?: readonly string[]; glass?: GlassBarColors } = {}) {
    return { connection: "profitmodel", query: applyFilters(query, filters), columnMetadata, vegaLiteSpec: weeklySpec(glass) } as const;
}
