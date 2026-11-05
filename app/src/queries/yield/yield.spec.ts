import { describe, expect, it } from "vitest";
import { dateRangeArg, filterArgs, monthPeriod, type FilterKey, type FilterState } from "@/lib/filters";
import { thisWeek } from "@/lib/weeks";
import { yieldByOrg, yieldCustomersDropped, yieldCustomersGrew, yieldKpis, yieldMonthlyTrend } from "./index";

const state: FilterState = { period: monthPeriod(2026, 10), week: thisWeek(new Date(2026, 10, 5)), org: { l1: "BPO" }, customer: "Parallon" };
const filters = filterArgs(state, new Set<FilterKey>(["period", "org", "customer", "project"]));
const factories = { yieldKpis, yieldByOrg, yieldCustomersGrew, yieldCustomersDropped, yieldMonthlyTrend };
const code = (q: string) => q.replace(/\/\/.*$/gm, "");

describe("P5 yield query factories", () => {
    it.each(Object.entries(factories))("%s fills the filters and never uses dim_project, year_week, TODAY or the originals", (_, factory) => {
        const { connection, query } = factory({ filters });
        expect(connection).toBe("profitmodel");
        expect(code(query)).not.toMatch(/@filters|dim_project|year_week|TODAY\s*\(/);
        expect(query).toContain('KEEPFILTERS ( TREATAS ( { "BPO" }, dim_hierarchy_master[L1] ) )');
        expect(query).toContain('KEEPFILTERS ( TREATAS ( { "Parallon" }, fact_revenue_metrics[financial_customer] ) )');
        // Adan's formulas through the _app measures, not the originals (Monday week, employee org).
        expect(code(query)).not.toMatch(/\[Revenue per FTE\]|\[Operational FTE|\[Total Revenue\]/);
        expect(query).toContain("[Actual Revenue_app]");
    });

    it("KPIs carry revenue, project-org FTE, revenue per FTE with MoM and annualized", () => {
        const q = yieldKpis({ filters }).query;
        for (const m of [
            "[Actual Revenue MoM %_app]",
            "[Allocated FTE (Last Week, Project Org)_app]",
            "[Revenue per FTE_app]",
            "[Revenue per FTE MoM %_app]",
            "[Annualized Revenue per FTE_app]",
        ]) {
            expect(q).toContain(m);
        }
    });

    it("customers that grew and dropped rank opposite ways by the model's change measure", () => {
        expect(yieldCustomersGrew({ filters }).query).toMatch(/\[Change\], DESC\s*\)\s*ORDER BY \[Change\] DESC/);
        expect(yieldCustomersDropped({ filters }).query).toMatch(/\[Change\], ASC\s*\)\s*ORDER BY \[Change\] ASC/);
        expect(yieldCustomersGrew({ filters }).query).toContain("[Actual Revenue MoM $_app]");
    });

    it("monthly trend draws revenue bars and a revenue-per-FTE line in the query's month order", () => {
        const window = dateRangeArg(new Date(2025, 10, 1), new Date(2026, 9, 31));
        const { query, vegaLiteSpec } = yieldMonthlyTrend({ filters: [window] });
        expect(query).toContain("ORDER BY dim_calendar[year_month_number]");
        const spec = vegaLiteSpec as { encoding: { x: { field: string; sort: unknown } } };
        expect(spec.encoding.x.field).toBe("Month");
        expect(spec.encoding.x.sort).toBeNull();
        const json = JSON.stringify(vegaLiteSpec);
        expect(json).toContain('"field":"Revenue"');
        expect(json).toContain('"field":"RevenuePerFTE"');
    });
});
