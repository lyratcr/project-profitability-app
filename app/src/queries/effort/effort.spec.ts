import { describe, expect, it } from "vitest";
import { dateRangeArg, filterArgs, monthPeriod, type FilterKey, type FilterState } from "@/lib/filters";
import { thisWeek } from "@/lib/weeks";
import {
    byCustomerColumns,
    byOrgColumns,
    effortByCustomer,
    effortByOrg,
    effortKpis,
    effortShrinkage,
    effortWeeklyTrend,
    kpiColumns,
    shrinkageColumns,
    trendColumns,
} from "./index";

const today = new Date(2026, 10, 4);
const state: FilterState = { period: monthPeriod(2026, 10), week: thisWeek(today), org: { l1: "BPO" }, customer: "Parallon" };
const applies = new Set<FilterKey>(["period", "org", "country", "customer", "project"]);
const filters = filterArgs(state, applies);

const factories = { effortKpis, effortByOrg, effortByCustomer, effortWeeklyTrend, effortShrinkage };

describe("P1 effort query factories", () => {
    it.each(Object.entries(factories))("%s targets profitmodel, fills every token and filter, and has no TODAY()", (_, factory) => {
        const { connection, query } = factory({ filters, view: "project" });
        expect(connection).toBe("profitmodel");
        expect(query).not.toMatch(/\[@[A-Za-z]+\]/);
        expect(query).not.toContain("/* @filters */");
        expect(query).toContain('KEEPFILTERS ( TREATAS ( { "BPO" }, dim_hierarchy_master[L1] ) )');
        expect(query).toContain('KEEPFILTERS ( TREATAS ( { "Parallon" }, fact_profitability_metrics[project_customer] ) )');
        expect(query).not.toMatch(/TODAY\s*\(/);
        // No query goes through dim_project (open item #1) or year_week (open item #22); comments may name them.
        const code = query.replace(/\/\/.*$/gm, "");
        expect(code).not.toContain("dim_project");
        expect(code).not.toContain("year_week");
    });

    it.each(Object.entries(factories))("%s uses the employee-org measures in the employee view", (_, factory) => {
        const project = factory({ filters, view: "project" }).query;
        const employee = factory({ filters, view: "employee" }).query;
        expect(project).toContain("[Synerion Hours (Project Org)_app]");
        expect(project).not.toContain("Employee Org");
        expect(employee).toContain("[Synerion Hours (Employee Org)_app]");
        expect(employee).not.toContain("Project Org");
        // Never the plain measure: it ignores the org filter.
        expect(employee).not.toContain("[Synerion Hours_app]");
    });

    it("KPI query has the org-aware MoM and productive share, and slices pay categories in DAX", () => {
        const { query, columnMetadata } = effortKpis({ filters, view: "employee" });
        expect(query).toContain('"HoursMoM", [Synerion Hours (Employee Org) MoM %_app]');
        expect(query).toContain('"ProductiveShare", [Productive Share (Employee Org)_app]');
        expect(query).toContain('fact_profitability_metrics[pay_category_description] = "Overtime"');
        expect(query).toContain('fact_profitability_metrics[pay_category_description] IN { "Time Off", "Holiday" }');
        for (const raw of Object.values(kpiColumns)) expect(columnMetadata[raw]).toBeDefined();
    });

    it("org matrix groups by the master hierarchy (the measures' TREATAS would override the fact's org columns)", () => {
        const { query } = effortByOrg({ filters });
        expect(query).toMatch(/ROLLUPADDISSUBTOTAL \(\s*dim_hierarchy_master\[L1\], "IsL1Total"/);
        expect(query).not.toContain("fact_profitability_metrics[project_L1]");
        expect(query).toContain("ORDER BY [Hours] DESC");
        expect(Object.values(byOrgColumns)).toContain("[Share]");
    });

    it("customer matrix keeps the top 15 customers with projects and tasks", () => {
        const { query } = effortByCustomer({ filters });
        expect(query).toContain("TOPN ( 15,");
        expect(query).toContain(byCustomerColumns.task);
        expect(query).toContain("ALLSELECTED ()");
    });

    it("weekly trend groups by the Sunday week and stacks pay categories", () => {
        const window = dateRangeArg(new Date(2026, 4, 3), new Date(2026, 9, 31));
        const rest = filterArgs(state, new Set<FilterKey>(["org", "country", "customer", "project"]));
        const { query, columnMetadata, vegaLiteSpec } = effortWeeklyTrend({ filters: [window, ...rest] });
        expect(query).toContain("dim_calendar[start_of_week_sun]");
        expect(query).toContain("DATE ( 2026, 5, 3 )");
        expect(query).not.toContain("DATE ( 2026, 10, 1 )");
        expect(columnMetadata[trendColumns.weekStart].name).toBe("WeekStart");
        const encoding = (vegaLiteSpec as { encoding: Record<string, { field: string; sort?: unknown }> }).encoding;
        // Weeks keep the query's order: VegaVisual's stacked overlay sorts labels alphabetically otherwise.
        expect(query).toContain("ORDER BY dim_calendar[start_of_week_sun]");
        expect(encoding.x.field).toBe("Week");
        expect(encoding.x.sort).toBeNull();
        expect(encoding.color.field).toBe("PayCategory");
    });

    it("shrinkage spec fields match the column metadata names", () => {
        const { columnMetadata, vegaLiteSpec } = effortShrinkage({ filters });
        const names = Object.values(shrinkageColumns).map((raw) => columnMetadata[raw].name);
        expect(names).toEqual(["Subtask", "Hours", "Share"]);
        const json = JSON.stringify(vegaLiteSpec);
        for (const n of names) expect(json).toContain(`"field":"${n}"`);
    });
});
