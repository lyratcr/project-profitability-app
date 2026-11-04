import { describe, expect, it } from "vitest";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { buildMatrix, type MatrixSpec } from "./matrix";

// Real rows from the published model (2026-11-04): Synerion hours and allocated FTE by employee
// L1 > L2 > L3 for Aug–Sep 2026 with ROLLUPADDISSUBTOTAL flags; grand totals plus BPO › BOS.
const columns = [
    "dim_calendar[year_month]", "dim_calendar[year_month_number]",
    "fact_profitability_metrics[employee_L1]", "fact_profitability_metrics[employee_L2]", "fact_profitability_metrics[employee_L3]",
    "[IsL1Total]", "[IsL2Total]", "[IsL3Total]", "[Hours]", "[FTE]",
].map((name) => ({ name, dataType: "unknown" }));
const rows: unknown[][] = [
    ["2026 Sep", 202609, null, null, null, true, true, true, 267322.2809, 1541],
    ["2026 Sep", 202609, "BPO", null, null, false, true, true, 173551.7796, 1004],
    ["2026 Sep", 202609, "BPO", "BOS", null, false, false, true, 53015.4513, 322],
    ["2026 Sep", 202609, "BPO", "BOS", "POD0", false, false, false, 1261, 8],
    ["2026 Sep", 202609, "BPO", "BOS", "POD1", false, false, false, 33666.3005, 208],
    ["2026 Sep", 202609, "BPO", "BOS", "POD2", false, false, false, 18088.1508, 106],
    ["2026 Aug", 202608, null, null, null, true, true, true, 256014.121, 1508],
    ["2026 Aug", 202608, "BPO", null, null, false, true, true, 167963.4013, 992],
    ["2026 Aug", 202608, "BPO", "BOS", null, false, false, true, 52364.7824, 322],
    ["2026 Aug", 202608, "BPO", "BOS", "POD0", false, false, false, 1167, 8],
    ["2026 Aug", 202608, "BPO", "BOS", "POD1", false, false, false, 34336.5335, 210],
    ["2026 Aug", 202608, "BPO", "BOS", "POD2", false, false, false, 16861.2489, 104],
];
const table = { columns, rows } as unknown as QueryTable;

const spec: MatrixSpec = {
    levels: ["fact_profitability_metrics[employee_L1]", "fact_profitability_metrics[employee_L2]", "fact_profitability_metrics[employee_L3]"],
    flags: ["[IsL1Total]", "[IsL2Total]", "[IsL3Total]"],
    value: "[FTE]",
    pivot: "dim_calendar[year_month]",
    pivotSort: "dim_calendar[year_month_number]",
};

describe("buildMatrix", () => {
    it("pivots months into columns in calendar order, not text order", () => {
        const m = buildMatrix(table, spec);
        expect(m.columns.map((c) => c.header)).toEqual(["", "2026 Aug", "2026 Sep"]);
    });

    it("nests L1 > L2 > L3 with the model's own subtotals at each level", () => {
        const m = buildMatrix(table, spec);
        expect(m.rows).toHaveLength(1);
        const bpo = m.rows[0];
        expect(bpo).toMatchObject({ _id: "BPO", label: "BPO", depth: 1, c0: 992, c1: 1004 });
        const bos = bpo._children![0];
        expect(bos).toMatchObject({ _id: "BPO › BOS", label: "BOS", depth: 2, c0: 322, c1: 322 });
        expect(bos._children!.map((r) => [r.label, r.c0, r.c1])).toEqual([
            ["POD0", 8, 8],
            ["POD1", 210, 208],
            ["POD2", 104, 106],
        ]);
        expect(bos._children![0]._children).toBeUndefined();
    });

    it("keeps the grand total from the model (non-additive FTE)", () => {
        const m = buildMatrix(table, spec);
        expect(m.totals).toEqual({ c0: 1508, c1: 1541 });
    });

    it("works with another measure and without a pivot", () => {
        const sep = { columns, rows: rows.slice(0, 6) } as unknown as QueryTable;
        const m = buildMatrix(sep, { ...spec, value: "[Hours]", pivot: undefined, pivotSort: undefined });
        expect(m.columns.map((c) => c.id)).toEqual(["label", "c0"]);
        expect(m.rows[0].c0).toBeCloseTo(173551.7796);
        expect(m.totals).toEqual({ c0: 267322.2809 });
    });

    it("puts several measures side by side (hours and share) with the model's totals", () => {
        // Real rows from the model: project-org hours and share, October 2026, L1 = BPO.
        const t = {
            columns: ["dim_hierarchy_master[L1]", "dim_hierarchy_master[L2]", "[IsL1Total]", "[IsL2Total]", "[Hours]", "[Share]"].map((name) => ({ name })),
            rows: [
                [null, null, true, true, 169977.9521, 1],
                ["BPO", null, false, true, 169977.9521, 1],
                ["BPO", "FAO", false, false, 58712.4175, 0.3454],
                ["BPO", "RCM", false, false, 57409.3514, 0.3377],
            ],
        } as unknown as QueryTable;
        const m = buildMatrix(t, {
            levels: ["dim_hierarchy_master[L1]", "dim_hierarchy_master[L2]"],
            flags: ["[IsL1Total]", "[IsL2Total]"],
            values: [
                { raw: "[Hours]", header: "Hours" },
                { raw: "[Share]", header: "Share" },
            ],
        });
        expect(m.columns.map((c) => [c.id, c.header])).toEqual([["label", ""], ["c0", "Hours"], ["c1", "Share"]]);
        expect(m.rows[0]).toMatchObject({ label: "BPO", c0: 169977.9521, c1: 1 });
        expect(m.rows[0]._children!.map((r) => [r.label, r.c0, r.c1])).toEqual([
            ["FAO", 58712.4175, 0.3454],
            ["RCM", 57409.3514, 0.3377],
        ]);
        expect(m.totals).toEqual({ c0: 169977.9521, c1: 1 });
    });

    it("needs exactly one of value or values, and no pivot with values", () => {
        const base = { levels: ["dim_hierarchy_master[L1]"], flags: ["[IsL1Total]"] };
        const t = { columns: [{ name: "dim_hierarchy_master[L1]" }, { name: "[IsL1Total]" }, { name: "[Hours]" }], rows: [] } as unknown as QueryTable;
        expect(() => buildMatrix(t, base)).toThrow(/either value or values/);
        expect(() => buildMatrix(t, { ...base, value: "[Hours]", values: [{ raw: "[Hours]", header: "H" }] })).toThrow(/either value or values/);
        expect(() => buildMatrix(t, { ...base, values: [{ raw: "[Hours]", header: "H" }], pivot: "[Hours]" })).toThrow(/can't pivot/);
    });

    it("keeps BLANK values blank and labels real blank org values", () => {
        const withBlank = {
            columns,
            rows: [
                ["2026 Sep", 202609, null, null, null, false, true, true, 8, null],
                ["2026 Sep", 202609, null, null, null, false, false, true, 8, null],
                ["2026 Sep", 202609, null, null, null, false, false, false, 8, null],
            ],
        } as unknown as QueryTable;
        const m = buildMatrix(withBlank, { ...spec, blankLabel: "No org" });
        expect(m.rows[0]).toMatchObject({ label: "No org", c0: null });
        expect(m.rows[0]._children![0]._children![0].label).toBe("No org");
        expect(m.totals).toBeNull();
    });

    it("creates a parent whose subtotal the model left out", () => {
        const orphan = { columns, rows: [rows[3]] } as unknown as QueryTable;
        const m = buildMatrix(orphan, spec);
        expect(m.columns.map((c) => c.header)).toEqual(["", "2026 Sep"]);
        expect(m.rows[0]).toMatchObject({ label: "BPO", c0: null });
        expect(m.rows[0]._children![0]._children![0]).toMatchObject({ label: "POD0", c0: 8 });
    });

    it("rejects malformed specs and flags", () => {
        expect(() => buildMatrix(table, { ...spec, flags: ["[IsL1Total]"] })).toThrow(/one rollup flag per level/);
        expect(() => buildMatrix(table, { ...spec, value: "[Nope]" })).toThrow(/no column \[Nope\]/);
        const bad = { columns, rows: [["2026 Sep", 202609, "BPO", null, null, true, false, true, 1, 1]] } as unknown as QueryTable;
        expect(() => buildMatrix(bad, spec)).toThrow(/innermost level/);
    });
});
