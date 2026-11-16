import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import barsLine from "./trend-bars-line.json";
import bars from "./trend-bars.json";
import stacked from "./trend-stacked-bars.json";

/**
 * Field names are the bracket-free `ColumnDef.name` aliases from a factory's columnMetadata, never raw
 * DAX names. `xSort` orders the periods: dim_calendar[year_month] is text ("2026 Apr") and would sort
 * alphabetically, so pass its numeric partner (e.g. year_month_number) or the week start date.
 */
export type TrendFields =
    | { kind: "bars"; x: string; xSort: string; y: string }
    | { kind: "stacked"; x: string; xSort: string; y: string; color: string }
    | { kind: "bars-line"; x: string; xSort: string; y: string; line: string };

const TEMPLATES = { bars, stacked, "bars-line": barsLine } as const;

/** Builds a trend spec from the shared .json templates by replacing their placeholder fields. */
export function trendSpec(fields: TrendFields): VisualizationSpec {
    const names: Record<string, string> = { __x: fields.x, __xSort: fields.xSort, __y: fields.y };
    if (fields.kind === "stacked") names.__color = fields.color;
    if (fields.kind === "bars-line") names.__line = fields.line;
    const json = JSON.stringify(TEMPLATES[fields.kind]).replace(/"__(x|xSort|y|color|line)"/g, (_, key: string) => {
        const name = names[`__${key}`];
        if (name === undefined) throw new Error(`trendSpec: no field for __${key}.`);
        return JSON.stringify(name);
    });
    return JSON.parse(json) as VisualizationSpec;
}
