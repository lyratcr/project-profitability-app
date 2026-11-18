import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { ReportTable } from "./report-table.component";

const grid = vi.hoisted(() => ({ data: undefined as unknown, columns: undefined as unknown }));

vi.mock("@microsoft/fabric-datagrid", () => ({
    DataGrid: ({ data, columns }: { data: unknown; columns: unknown }) => {
        grid.data = data;
        grid.columns = columns;
        return <div data-testid="grid" />;
    },
}));
vi.mock("@/hooks/theme.context", () => ({ useThemeContext: () => ({ theme: {} }) }));

describe("ReportTable", () => {
    it("hides sort-only columns and keeps the query's row order", () => {
        // Shape of projects-revenue-by-month.dax: the numeric month key only orders the rows.
        const table = {
            columns: [
                { name: "dim_calendar[year_month]", dataType: "String" },
                { name: "dim_calendar[year_month_number]", dataType: "Int64" },
                { name: "[Actual]", dataType: "Double" },
            ],
            rows: [
                ["2026 Sep", 202609, 335158],
                ["2026 Oct", 202610, 335158],
            ],
        } as unknown as QueryTable;
        const metadata = {
            "dim_calendar[year_month]": { name: "Month", displayName: "Month" },
            "[Actual]": { name: "Actual", displayName: "Actual revenue" },
        };
        render(<ReportTable chromeless table={table} columnMetadata={metadata} title="Revenue by month" hiddenColumns={["dim_calendar[year_month_number]"]} />);
        const shown = JSON.stringify(grid.data);
        expect(shown).not.toContain("year_month_number");
        expect(shown).not.toContain("202609");
        expect(shown.indexOf("2026 Sep")).toBeLessThan(shown.indexOf("2026 Oct"));
    });

    it("passes widths and custom cells by column name, and keeps the grid's own columns otherwise", () => {
        const table = {
            columns: [
                { name: "dim_calendar[year_month]", dataType: "String" },
                { name: "[VsPlan]", dataType: "Double" },
            ],
            rows: [["2026 Oct", 4488]],
        } as unknown as QueryTable;
        const metadata = {
            "dim_calendar[year_month]": { name: "Month", displayName: "Month" },
            "[VsPlan]": { name: "VsPlan", displayName: "∆ Rev" },
        };
        render(<ReportTable chromeless table={table} columnMetadata={metadata} title="Revenue by month" />);
        expect(grid.columns).toBeUndefined();
        render(
            <ReportTable chromeless table={table} columnMetadata={metadata} title="Revenue by month" columnWidths={{ VsPlan: 86 }} cellRenderers={{ VsPlan: (v) => `pill ${String(v)}` }} />,
        );
        const columns = grid.columns as { id: string; header: string; width?: number; cellRenderer?: (v: unknown) => unknown }[];
        expect(columns.map((c) => c.header)).toEqual(["Month", "∆ Rev"]);
        expect(columns[1].width).toBe(86);
        expect(columns[1].cellRenderer?.(4488)).toBe("pill 4488");
        expect(columns[0].cellRenderer).toBeUndefined();
    });
});
