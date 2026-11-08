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
    variance: "[Variance]",
    week: "[Week]",
    weekKey: "[WeekKey]",
} as const;

/** Weeks in the P6 trend (docs/05_app_design.md: last 12 weeks). */
export const PROJECT_TREND_WEEKS = 12;

/** `Hours vs Plan Variance %_app`'s format, with a true minus (Auxis: deltas carry a sign, never a hyphen). */
export const VARIANCE_FORMAT = "+0.0%;−0.0%;0.0%";

const columnMetadata: ColumnMetadataMap = {
    [projectsTrendColumns.weekStart]: { name: "WeekStart", displayName: "Week starting" },
    [projectsTrendColumns.hours]: { name: "Hours", displayName: "Synerion hours", format: "#,0" },
    [projectsTrendColumns.plannedHours]: { name: "PlannedHours", displayName: "Planned hours", format: "#,0" },
    [projectsTrendColumns.variance]: { name: "Variance", displayName: "Variance vs plan", format: VARIANCE_FORMAT },
    [projectsTrendColumns.week]: { name: "Week", displayName: "Week" },
    [projectsTrendColumns.weekKey]: { name: "WeekKey", displayName: "Week key" },
};

/**
 * Colours for the liquid glass look (P6; Ion, 2026-11-07), read by the page from the design-system tokens
 * (`--yellow-100`, `--yellow-300`, `--yellow-500`, `--ink`, `--ink-muted`, `--surface`) so the spec never hard-codes
 * a hex value.
 */
export interface GlassBarColors {
    light: string;
    base: string;
    deep: string;
    /**
     * The plan line: grey and dashed (`--ink-muted`; Ion, 2026-11-07), a reference line. A gold or amber line next to
     * the gold bars fails the dataviz palette check (normal-vision ΔE 4.8–13.4, floor 15).
     */
    plan: string;
    /** The weekly variance segments and their labels (`--ink`): the data, so stronger than the plan line. */
    variance: string;
    /** The chart surface (`--surface`): the 2px ring around the plan points. */
    ring: string;
}

/** Bar width in px: at most 24 (dataviz mark spec), leaving air between weeks. */
export const TREND_BAR_SIZE = 22;

type Layer = { mark: unknown; encoding: Record<string, unknown>; transform?: unknown[] };

/**
 * The shared bars + line trend on one hours axis, keeping the query's week order (`sort: null`): VegaVisual's
 * layered marks order x labels alphabetically and ignore a sort by another field (log 2026-11-04). With `glass`:
 * bars at most 24px with 4px rounded tops (Auxis premium gold gradient plus a glossy sheen, no border); the plan as
 * a grey dashed 2px line with ringed 8px points; and, per week, a vertical segment from the plan to the hours with
 * the model's variance % above it (Ion, 2026-11-07).
 */
function weeklySpec(glass?: GlassBarColors): VisualizationSpec {
    const spec = trendSpec({ kind: "bars-line", x: "Week", xSort: "WeekKey", y: "Hours", line: "PlannedHours" }) as VisualizationSpec & {
        encoding: { x: Record<string, unknown> };
    };
    // Transparent ground: the Auxis card is the only surface behind the chart.
    (spec as Record<string, unknown>).background = "transparent";
    spec.encoding.x.sort = null;
    // Points on the plan line: a Fixed Fee plan has one value a month, which a line alone doesn't draw.
    const layers = (spec as unknown as { layer: { layer: (Layer & { encoding: { y: Record<string, unknown> } })[] }[] }).layer;
    layers[1].layer[0].mark = { type: "line", point: true };
    // Both series are hours: one shared axis, so the bar and the line can be compared directly.
    layers[0].layer[0].encoding.y.title = "Hours";
    layers[1].layer[0].encoding.y.axis = null;
    layers[1].layer[0].encoding.y.title = "Hours";
    (spec as Record<string, unknown>).resolve = { scale: { y: "shared" } };
    // One tooltip with both series and the variance (the layered default showed only the plan).
    const tooltip = [
        { field: "Week", type: "ordinal", title: "Week starting" },
        { field: "Hours", type: "quantitative", title: "Synerion hours", format: ",.0f" },
        { field: "PlannedHours", type: "quantitative", title: "Planned hours", format: ",.0f" },
        { field: "Variance", type: "quantitative", title: "Variance vs plan" },
    ];
    for (const group of layers) for (const layer of group.layer) layer.encoding.tooltip = tooltip;
    if (glass) {
        const bars = layers[0].layer as Layer[];
        const shape = { type: "bar", size: TREND_BAR_SIZE, cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 };
        bars[0].mark = {
            ...shape,
            // Bottom to top: deep gold, brand gold, soft gold.
            color: { gradient: "linear", x1: 0, y1: 1, x2: 0, y2: 0, stops: [{ offset: 0, color: glass.deep }, { offset: 0.45, color: glass.base }, { offset: 1, color: glass.light }] },
        };
        // Sheen: soft gold fading out across the left side of each bar, drawn over it.
        bars.push({
            mark: {
                ...shape,
                opacity: 0.55,
                color: { gradient: "linear", x1: 0, y1: 0, x2: 1, y2: 0, stops: [{ offset: 0, color: glass.light }, { offset: 0.35, color: "transparent" }, { offset: 1, color: "transparent" }] },
            },
            encoding: { y: { ...(bars[0].encoding.y as Record<string, unknown>), axis: null }, tooltip },
        });

        const lineGroup = layers[1].layer as Layer[];
        lineGroup[0].mark = {
            type: "line",
            color: glass.plan,
            strokeWidth: 2,
            strokeDash: [5, 4],
            strokeCap: "round",
            point: { filled: true, color: glass.plan, size: 64, stroke: glass.ring, strokeWidth: 2 },
        };
        // Variance per week: a segment from the plan to the hours, centred on the bar (Ion, 2026-11-07), and the model's
        // % centred above its top end.
        const withVariance = [{ filter: "isValid(datum.PlannedHours) && isValid(datum.Variance)" }];
        lineGroup.push({
            transform: withVariance,
            mark: { type: "rule", color: glass.variance, strokeWidth: 2, strokeCap: "round" },
            // No `axis: null` here: Vega merges every layer's axis on the shared scale, and null hid the hours axis.
            encoding: { y: { field: "PlannedHours", type: "quantitative", title: "Hours" }, y2: { field: "Hours" }, tooltip },
        });
        lineGroup.push({
            transform: [
                ...withVariance,
                { calculate: "max(datum.Hours, datum.PlannedHours)", as: "VarianceTop" },
                // The measure's +0.0% pattern with thousands separators; d3's format writes a true minus. VegaVisual's own text formatting
                // dropped trailing zeros ("−12%" next to "−12.4%").
                { calculate: "format(datum.Variance, '+,.1%')", as: "VarianceLabel" },
            ],
            mark: { type: "text", align: "center", baseline: "bottom", dy: -6, fontSize: 10, fontWeight: 600, color: glass.variance },
            encoding: { y: { field: "VarianceTop", type: "quantitative", title: "Hours" }, text: { field: "VarianceLabel" } },
        });
    }
    return spec;
}

export function projectsWeeklyTrend({ filters = [], glass }: { filters?: readonly string[]; glass?: GlassBarColors } = {}) {
    return { connection: "profitmodel", query: applyFilters(query, filters), columnMetadata, vegaLiteSpec: weeklySpec(glass) } as const;
}
