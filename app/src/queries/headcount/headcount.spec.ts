import { describe, expect, it } from "vitest";
import { dateRangeArg, filterArgs, monthPeriod, type FilterKey, type FilterState } from "@/lib/filters";
import { thisWeek } from "@/lib/weeks";
import { headcountByCountry, headcountByOrg, headcountKpis, headcountMonthlyTrend, headcountTrendColumns } from "./index";

const state: FilterState = { period: monthPeriod(2026, 10), week: thisWeek(new Date(2026, 10, 4)), org: { l1: "BPO" }, country: "Costa Rica" };
const filters = filterArgs(state, new Set<FilterKey>(["period", "org", "country", "customer", "project"]));
const factories = { headcountKpis, headcountMonthlyTrend, headcountByCountry, headcountByOrg };

describe("P2 headcount query factories", () => {
    it.each(Object.entries(factories))("%s fills the filters and uses the Sunday-week headcount, never year_week or dim_project", (_, factory) => {
        const { connection, query } = factory({ filters });
        const code = query.replace(/\/\/.*$/gm, "");
        expect(connection).toBe("profitmodel");
        expect(code).not.toContain("/* @filters */");
        expect(code).toContain('KEEPFILTERS ( TREATAS ( { "BPO" }, dim_hierarchy_master[L1] ) )');
        expect(code).toContain('KEEPFILTERS ( TREATAS ( { "Costa Rica" }, fact_profitability_metrics[employee_country] ) )');
        expect(code).toContain("[Headcount (Last Week)_app]");
        expect(code).not.toContain("year_week");
        expect(code).not.toContain("dim_project");
        expect(code).not.toMatch(/TODAY\s*\(/);
    });

    it("KPIs use the employee-org people measure and slice contractors in DAX", () => {
        const { query } = headcountKpis({ filters });
        expect(query).toContain('"HeadcountMoM", [Headcount (Last Week) MoM %_app]');
        expect(query).toContain('"People", [People With Hours (Employee Org)_app]');
        expect(query).toContain('IN { "Contractor", "GT Contractor" }');
        expect(query).not.toContain("[People With Hours_app]");
    });

    it("org matrix groups by the master hierarchy with model subtotals", () => {
        const { query } = headcountByOrg({ filters });
        expect(query).toMatch(/ROLLUPADDISSUBTOTAL \(\s*dim_hierarchy_master\[L1\], "IsL1Total"/);
    });

    it("monthly trend stacks categories and keeps the query's month order", () => {
        const window = dateRangeArg(new Date(2025, 10, 1), new Date(2026, 9, 31));
        const { query, columnMetadata, vegaLiteSpec } = headcountMonthlyTrend({ filters: [window] });
        expect(query).toContain("DATE ( 2025, 11, 1 )");
        expect(query).toContain("ORDER BY dim_calendar[year_month_number]");
        expect(columnMetadata[headcountTrendColumns.category].name).toBe("Category");
        const encoding = (vegaLiteSpec as { encoding: Record<string, { field: string; sort?: unknown }> }).encoding;
        expect(encoding.x.field).toBe("Month");
        expect(encoding.x.sort).toBeNull();
        expect(encoding.color.field).toBe("Category");
        expect((encoding.color as unknown as { scale: { domain: string[] } }).scale.domain[0]).toBe("Regular");
    });

    it("country spec fields match the column metadata names", () => {
        const { columnMetadata, vegaLiteSpec } = headcountByCountry({ filters });
        const json = JSON.stringify(vegaLiteSpec);
        for (const def of Object.values(columnMetadata)) expect(json).toContain(`"field":"${def.name}"`);
    });
});
