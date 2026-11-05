import { describe, expect, it } from "vitest";
import { filterArgs, monthPeriod, type FilterKey, type FilterState } from "@/lib/filters";
import { thisWeek } from "@/lib/weeks";
import { fteByCustomer, fteByProjectOrgMonth, fteKpis, ftePeople, ftePeopleColumns } from "./index";

const state: FilterState = { period: monthPeriod(2026, 10), week: thisWeek(new Date(2026, 10, 4)), org: { l1: "BPO" }, customer: "Parallon" };
const filters = filterArgs(state, new Set<FilterKey>(["period", "org", "country", "customer", "project"]));
const factories = { fteKpis, fteByCustomer, fteByProjectOrgMonth, ftePeople };

describe("P3 FTE query factories", () => {
    it.each(Object.entries(factories))("%s fills the filters and uses the allocation FTE, never year_week or dim_project", (_, factory) => {
        const { connection, query } = factory({ filters });
        const code = query.replace(/\/\/.*$/gm, "");
        expect(connection).toBe("profitmodel");
        expect(code).not.toContain("/* @filters */");
        expect(code).toContain('KEEPFILTERS ( TREATAS ( { "BPO" }, dim_hierarchy_master[L1] ) )');
        expect(code).toContain('KEEPFILTERS ( TREATAS ( { "Parallon" }, fact_profitability_metrics[project_customer] ) )');
        expect(code).toContain("[Allocated FTE (Last Week)_app]");
        expect(code).not.toContain("Operational FTE");
        expect(code).not.toContain("year_week");
        expect(code).not.toContain("dim_project");
        expect(code).not.toMatch(/TODAY\s*\(/);
    });

    it("KPIs carry the FTE MoM and last-week headcount", () => {
        const { query } = fteKpis({ filters });
        expect(query).toContain('"FTEMoM", [Allocated FTE MoM %_app]');
        expect(query).toContain('"Headcount", [Headcount (Last Week)_app]');
    });

    it("customer matrix keeps the top 15 customers by FTE", () => {
        expect(fteByCustomer({ filters }).query).toContain("TOPN ( 15,");
    });

    it("project org matrix pivots months and groups by the fact's project org", () => {
        const { query } = fteByProjectOrgMonth({ filters });
        expect(query).toContain("dim_calendar[year_month_number]");
        expect(query).toMatch(/ROLLUPADDISSUBTOTAL \(\s*fact_profitability_metrics\[project_L1\]/);
    });

    it("people detail returns names, time allocation and FTE, but not the employee id, rates or costs", () => {
        const { query, columnMetadata } = ftePeople({ filters });
        expect(query).toContain("[Time Allocation %_app]");
        expect(query.replace(/\/\/.*$/gm, "")).not.toMatch(/actual_cost|rate/i);
        expect(Object.keys(columnMetadata)).toEqual(Object.values(ftePeopleColumns));
        expect(Object.keys(columnMetadata)).not.toContain("fact_profitability_metrics[ukg_employee_id]");
    });
});
