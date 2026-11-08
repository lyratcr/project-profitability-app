import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import { applyFilters } from "@/lib/filters";
import query from "./projects-weekly-trend.dax?raw";
import { TREND_TOOLTIP, TREND_Y_AXIS_WIDTH, trendColumnMetadata, type GlassBarColors } from "./projects-weekly-trend";

/**
 * Variance panel under the hours chart (Ion, 2026-11-07): per week a lollipop from 0 to the model's variance %, blue
 * below the budget and amber above, with the signed % at its end; "no plan" where the week has none. The invisible rule
 * layer (the first with x) carries every week, so the x domain keeps all weeks in the query's order and lines up with
 * the chart above.
 */
function varianceSpec(glass: GlassBarColors): VisualizationSpec {
    const x = { field: "Week", type: "ordinal", sort: null, title: null, axis: { labelAngle: 0 } };
    const y = { field: "Variance", type: "quantitative", title: "Variance", axis: { minExtent: TREND_Y_AXIS_WIDTH, maxExtent: TREND_Y_AXIS_WIDTH, tickCount: 3, format: "+.0%" } };
    const color = { condition: { test: "datum.Variance < 0", value: glass.below }, value: glass.above };
    const withVariance = { filter: "isValid(datum.Variance)" };
    const label = { calculate: "format(datum.Variance, '+,.1%')", as: "VarianceLabel" };
    const text = { type: "text", align: "center", fontSize: 10, fontWeight: 600, color: glass.muted };
    // Every y encoding carries the same axis definition: Vega merges the layers' axes on the shared scale, and an
    // `axis: null` in any layer hid it (and with it the width that keeps the weeks aligned with the chart above).
    const zero = { datum: 0, type: "quantitative", title: "Variance", axis: y.axis };
    return {
        $schema: "https://vega.github.io/schema/vega-lite/v6.json",
        background: "transparent",
        layer: [
            // The zero line comes first and has no x, so it spans the whole width.
            { mark: { type: "rule", color: glass.muted, strokeDash: [3, 3], strokeWidth: 1 }, encoding: { y: zero } },
            { mark: { type: "rule", opacity: 0 }, encoding: { x, tooltip: TREND_TOOLTIP } },
            { transform: [withVariance], mark: { type: "rule", strokeWidth: 3, strokeCap: "round" }, encoding: { x, y, y2: { datum: 0 }, color, tooltip: TREND_TOOLTIP } },
            {
                transform: [withVariance],
                mark: { type: "point", filled: true, size: 80, stroke: glass.ring, strokeWidth: 2, opacity: 1 },
                encoding: { x, y, color, tooltip: TREND_TOOLTIP },
            },
            { transform: [withVariance, { filter: "datum.Variance < 0" }, label], mark: { ...text, baseline: "top", dy: 8 }, encoding: { x, y, text: { field: "VarianceLabel" } } },
            { transform: [withVariance, { filter: "datum.Variance >= 0" }, label], mark: { ...text, baseline: "bottom", dy: -8 }, encoding: { x, y, text: { field: "VarianceLabel" } } },
            {
                transform: [{ filter: "!isValid(datum.Variance)" }, { calculate: "'no plan'", as: "NoPlan" }],
                mark: { ...text, fontWeight: 400, baseline: "bottom", dy: -4 },
                encoding: { x, y: zero, text: { field: "NoPlan" } },
            },
        ],
    } as unknown as VisualizationSpec;
}

/** The variance panel: the same query (and result) as the weekly trend, drawn as lollipops. Needs the token colours. */
export function projectsWeeklyVariance({ filters = [], glass }: { filters?: readonly string[]; glass: GlassBarColors }) {
    return { connection: "profitmodel", query: applyFilters(query, filters), columnMetadata: trendColumnMetadata, vegaLiteSpec: varianceSpec(glass) } as const;
}
