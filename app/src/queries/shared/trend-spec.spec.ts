import { describe, expect, it } from "vitest";
import { trendSpec, type TrendFields } from "./trend-spec";

interface Encoding {
    field?: string;
    type?: string;
    sort?: { field: string; order: string };
}
interface SpecShape {
    mark?: unknown;
    encoding: Record<string, Encoding>;
    layer: { mark?: unknown; encoding: Record<string, Encoding>; layer: { encoding: Record<string, Encoding> }[] }[];
    resolve: { scale: { y: string } };
}
const build = (fields: TrendFields) => trendSpec(fields) as unknown as SpecShape;

describe("trendSpec", () => {
    it("fills the single-series template: bars with value labels, sorted by the numeric period", () => {
        const spec = build({ kind: "bars", x: "Month", xSort: "MonthNumber", y: "Hours" });
        expect(spec.encoding.x).toMatchObject({ field: "Month", type: "ordinal", sort: { field: "MonthNumber", order: "ascending" } });
        expect(spec.encoding.y.field).toBe("Hours");
        expect(spec.layer.map((l) => l.mark)).toEqual(["bar", { type: "text", style: "labelVertical" }]);
        expect(spec.layer[1].encoding.text.field).toBe("Hours");
    });

    it("fills the stacked template with a color field and no labels", () => {
        const spec = build({ kind: "stacked", x: "Week", xSort: "WeekStart", y: "Hours", color: "PayCategory" });
        expect(spec.mark).toBe("bar");
        expect(spec.encoding.color.field).toBe("PayCategory");
        expect(spec.encoding.x.sort?.field).toBe("WeekStart");
    });

    it("fills the bars + line template on independent axes", () => {
        const spec = build({ kind: "bars-line", x: "Month", xSort: "MonthNumber", y: "Revenue", line: "RevenuePerFTE" });
        expect(spec.layer[0].layer[0].encoding.y.field).toBe("Revenue");
        expect(spec.layer[1].layer[0].encoding.y.field).toBe("RevenuePerFTE");
        expect(spec.resolve.scale.y).toBe("independent");
    });

    it("leaves no placeholder and never hardcodes formats", () => {
        for (const spec of [
            trendSpec({ kind: "bars", x: "a", xSort: "b", y: "c" }),
            trendSpec({ kind: "stacked", x: "a", xSort: "b", y: "c", color: "d" }),
            trendSpec({ kind: "bars-line", x: "a", xSort: "b", y: "c", line: "e" }),
        ]) {
            const json = JSON.stringify(spec);
            expect(json).not.toMatch(/"__/);
            expect(json).not.toMatch(/"format"/);
        }
    });

    it("escapes field names safely", () => {
        const spec = build({ kind: "bars", x: 'Mo"nth', xSort: "b", y: "c" });
        expect(spec.encoding.x.field).toBe('Mo"nth');
    });
});
