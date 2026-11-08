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

export const trendColumnMetadata: ColumnMetadataMap = {
    [projectsTrendColumns.weekStart]: { name: "WeekStart", displayName: "Week starting" },
    [projectsTrendColumns.hours]: { name: "Hours", displayName: "Synerion hours", format: "#,0" },
    [projectsTrendColumns.plannedHours]: { name: "PlannedHours", displayName: "Budget hours", format: "#,0" },
    [projectsTrendColumns.variance]: { name: "Variance", displayName: "Variance vs budget", format: VARIANCE_FORMAT },
    [projectsTrendColumns.week]: { name: "Week", displayName: "Week" },
    [projectsTrendColumns.weekKey]: { name: "WeekKey", displayName: "Week key" },
};

/**
 * Colours for the layered liquid glass trend (P6; Ion, 2026-11-07), read by the page from the design-system tokens so
 * the specs never hard-code a hex value.
 */
export interface GlassBarColors {
    /** `--yellow-100`, `--yellow-300`, `--yellow-500`: the gold bar gradient, top to bottom. */
    light: string;
    base: string;
    deep: string;
    /** `--ink`: the budget line, in front of the bars. */
    plan: string;
    /** `--ink-muted`: zero line and the labels in the variance panel. */
    muted: string;
    /** `--surface`: the 2px ring around points. */
    ring: string;
    /**
     * `--chart-2` (blue) below the budget, `--chart-4` (amber) above. Dataviz palette check: normal-vision ΔE 28.4,
     * CVD ΔE 23.0; light-theme contrast is relieved by the signed label on every point.
     */
    below: string;
    above: string;
}

/** Bar width in px: at most 24 (dataviz mark spec), leaving air between weeks. */
export const TREND_BAR_SIZE = 22;

/** Bars sit behind the budget line: translucent glass, so the line reads as the front layer. */
const BAR_OPACITY = 0.82;

/** Both charts reserve the same y-axis width, so their weeks line up one above the other. */
export const TREND_Y_AXIS_WIDTH = 46;

export const TREND_TOOLTIP = [
    { field: "Week", type: "ordinal", title: "Week starting" },
    { field: "Hours", type: "quantitative", title: "Synerion hours", format: ",.0f" },
    { field: "PlannedHours", type: "quantitative", title: "Budget hours", format: ",.0f" },
    { field: "Variance", type: "quantitative", title: "Variance vs budget" },
];

type Layer = { mark: unknown; encoding: Record<string, unknown>; transform?: unknown[] };

/**
 * Hours (bars, behind) vs budget (line, in front), one hours axis, in the query's week order (`sort: null`: VegaVisual's
 * layered marks order x labels alphabetically and ignore a sort by another field, log 2026-11-04). With `glass`: gold
 * glass bars at most 24px with 4px rounded tops, translucent; the budget as a 2.5px ink line with ringed points. Its
 * drop shadow is CSS on the rendered SVG (`.ax-trend-layered` in global.css): Vega-Lite has no shadows. The week
 * labels sit under the variance panel below, so this chart hides them.
 */
function weeklySpec(glass?: GlassBarColors): VisualizationSpec {
    const spec = trendSpec({ kind: "bars-line", x: "Week", xSort: "WeekKey", y: "Hours", line: "PlannedHours" }) as VisualizationSpec & {
        encoding: { x: Record<string, unknown> };
    };
    (spec as Record<string, unknown>).background = "transparent";
    spec.encoding.x.sort = null;
    const layers = (spec as unknown as { layer: { layer: (Layer & { encoding: { y: Record<string, unknown> } })[] }[] }).layer;
    // Points on the budget line: a Fixed Fee plan has one value a month, which a line alone doesn't draw.
    layers[1].layer[0].mark = { type: "line", point: true };
    // Both series are hours: one shared axis, so the bar and the line can be compared directly.
    layers[0].layer[0].encoding.y.title = "Hours";
    layers[1].layer[0].encoding.y.axis = null;
    layers[1].layer[0].encoding.y.title = "Hours";
    (spec as Record<string, unknown>).resolve = { scale: { y: "shared" } };
    for (const group of layers) for (const layer of group.layer) layer.encoding.tooltip = TREND_TOOLTIP;
    if (glass) {
        layers[0].layer[0].encoding.y.axis = { minExtent: TREND_Y_AXIS_WIDTH, maxExtent: TREND_Y_AXIS_WIDTH };
        spec.encoding.x.axis = { labels: false, ticks: false, domain: false, title: null };
        const bars = layers[0].layer as Layer[];
        const shape = { type: "bar", size: TREND_BAR_SIZE, cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4, opacity: BAR_OPACITY };
        bars[0].mark = {
            ...shape,
            // Bottom to top: deep gold, brand gold, soft gold.
            color: { gradient: "linear", x1: 0, y1: 1, x2: 0, y2: 0, stops: [{ offset: 0, color: glass.deep }, { offset: 0.45, color: glass.base }, { offset: 1, color: glass.light }] },
        };
        // Sheen: soft gold fading out across the left side of each bar.
        bars.push({
            mark: {
                ...shape,
                opacity: 0.5,
                color: { gradient: "linear", x1: 0, y1: 0, x2: 1, y2: 0, stops: [{ offset: 0, color: glass.light }, { offset: 0.35, color: "transparent" }, { offset: 1, color: "transparent" }] },
            },
            encoding: { y: { ...(bars[0].encoding.y as Record<string, unknown>), axis: null }, tooltip: TREND_TOOLTIP },
        });
        layers[1].layer[0].mark = {
            type: "line",
            color: glass.plan,
            strokeWidth: 2.5,
            strokeCap: "round",
            strokeJoin: "round",
            point: { filled: true, color: glass.plan, size: 64, stroke: glass.ring, strokeWidth: 2 },
        };
    }
    return spec;
}

export function projectsWeeklyTrend({ filters = [], glass }: { filters?: readonly string[]; glass?: GlassBarColors } = {}) {
    return { connection: "profitmodel", query: applyFilters(query, filters), columnMetadata: trendColumnMetadata, vegaLiteSpec: weeklySpec(glass) } as const;
}
