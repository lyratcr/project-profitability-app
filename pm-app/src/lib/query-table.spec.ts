import { describe, expect, it } from "vitest";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { cell, columnIndex, numberCell, withoutColumns } from "./query-table";

// Shape of a KPI query on the published model: September 2026 Synerion hours and MoM %.
const table = {
    columns: [{ name: "[Synerion Hours]" }, { name: "[Synerion Hours MoM %]" }, { name: "[Blank]" }],
    rows: [[267322.2809, 0.04417006318178832, null]],
} as unknown as QueryTable;

describe("query-table helpers", () => {
    it("finds columns and cells by raw output name", () => {
        expect(columnIndex(table, "[Synerion Hours MoM %]")).toBe(1);
        expect(cell(table, "[Synerion Hours]")).toBe(267322.2809);
    });

    it("returns null for missing columns, rows and blanks", () => {
        expect(columnIndex(table, "[Nope]")).toBe(-1);
        expect(cell(table, "[Nope]")).toBeNull();
        expect(cell(table, "[Synerion Hours]", 3)).toBeNull();
        expect(numberCell(table, "[Blank]")).toBeNull();
    });

    it("reads numbers only (never coerces a blank to zero)", () => {
        expect(numberCell(table, "[Synerion Hours MoM %]")).toBeCloseTo(0.0442);
        const text = { columns: [{ name: "[x]" }], rows: [["12"]] } as unknown as QueryTable;
        expect(numberCell(text, "[x]")).toBeNull();
    });
});

describe("withoutColumns", () => {
    it("drops sort-only columns and keeps the query's row order", () => {
        // Shape of projects-revenue-by-month.dax: the numeric month key only orders the rows.
        const months = {
            columns: [{ name: "dim_calendar[year_month]" }, { name: "dim_calendar[year_month_number]" }, { name: "[Actual]" }],
            rows: [
                ["2026 Sep", 202609, 335158],
                ["2026 Oct", 202610, 335158],
            ],
        } as unknown as QueryTable;
        const out = withoutColumns(months, ["dim_calendar[year_month_number]"]);
        expect(out.columns.map((c) => c.name)).toEqual(["dim_calendar[year_month]", "[Actual]"]);
        expect(out.rows).toEqual([
            ["2026 Sep", 335158],
            ["2026 Oct", 335158],
        ]);
    });
});
