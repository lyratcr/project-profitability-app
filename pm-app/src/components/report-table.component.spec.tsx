import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { ReportTable } from "./report-table.component";

const grid = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock("@microsoft/fabric-datagrid", () => ({
    DataGrid: ({ data }: { data: unknown }) => {
        grid.data = data;
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
});
