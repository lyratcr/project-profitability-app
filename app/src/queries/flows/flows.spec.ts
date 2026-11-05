import { describe, expect, it } from "vitest";
import { filterArgs, monthPeriod, type FilterKey, type FilterState } from "@/lib/filters";
import { thisWeek } from "@/lib/weeks";
import { FLOW_ANALYSES, flowsKpis, flowsMatrix, flowsTree, readFlowAnalysis, writeFlowAnalysis } from "./index";

const state: FilterState = { period: monthPeriod(2026, 2), week: thisWeek(new Date(2026, 10, 4)), org: { l1: "BPO" } };
const filters = filterArgs(state, new Set<FilterKey>(["period", "org", "country", "customer", "project"]));
const code = (q: string) => q.replace(/\/\/.*$/gm, "");

describe("P4 flows query factories", () => {
    it("reads and writes the analysis switch, intercompany by default", () => {
        expect(readFlowAnalysis(new URLSearchParams(""))).toBe("intercompany");
        expect(readFlowAnalysis(new URLSearchParams("analysis=cross"))).toBe("cross");
        expect(readFlowAnalysis(new URLSearchParams("analysis=x"))).toBe("intercompany");
        expect(writeFlowAnalysis(new URLSearchParams("l1=BPO"), "cross").toString()).toBe("l1=BPO&analysis=cross");
        expect(writeFlowAnalysis(new URLSearchParams("analysis=cross"), "intercompany").toString()).toBe("");
    });

    it("KPIs use employee-org hours, flag slices and the cross-charge measures", () => {
        const q = flowsKpis({ filters }).query;
        expect(q).toContain("[Synerion Hours (Employee Org)_app]");
        expect(q).toContain('fact_profitability_metrics[intercompany_flag] = "Intercompany"');
        expect(q).toContain('fact_profitability_metrics[cross_charge_flag] = "Cross Charge"');
        expect(q).toContain("[Cross-Charge Hours Received_app]");
        expect(q).not.toContain("/* @filters */");
    });

    it.each(["intercompany", "cross"] as const)("%s matrix fills the flow column, month total and filters", (analysis) => {
        const { query, flowColumn } = flowsMatrix({ analysis, filters });
        expect(flowColumn).toBe(FLOW_ANALYSES[analysis].flow);
        expect(code(query)).not.toMatch(/@FLOW@|@employee|@filters/);
        expect(query).toContain(`${FLOW_ANALYSES[analysis].flow}, "IsFlowTotal"`);
        expect(query).toContain('ROLLUPADDISSUBTOTAL ( ROLLUPGROUP ( dim_calendar[year_month], dim_calendar[year_month_number] ), "IsMonthTotal" )');
        expect(query).not.toContain("employee_full_name");
        expect(code(query)).not.toMatch(/dim_project|year_week|TODAY\s*\(/);
    });

    it("adds the employee level, keyed by UKG id, only when asked", () => {
        const { query } = flowsMatrix({ analysis: "intercompany", filters, withEmployees: true });
        expect(query).toContain(
            'ROLLUPGROUP ( fact_profitability_metrics[employee_full_name], fact_profitability_metrics[ukg_employee_id] ), "IsEmployeeTotal"',
        );
    });

    it("tree levels filter by the earlier picks as escaped literals", () => {
        const { query, column } = flowsTree({ analysis: "cross", level: 2, filters, picks: ["BPO", 'O"Brien'] });
        expect(column).toBe("fact_profitability_metrics[project_customer]");
        expect(code(query)).not.toMatch(/@LEVEL@|@filters/);
        expect(query).toContain('KEEPFILTERS ( TREATAS ( { "BPO" }, fact_profitability_metrics[employee_L1] ) )');
        expect(query).toContain('KEEPFILTERS ( TREATAS ( { "O""Brien" }, fact_profitability_metrics[project_L1] ) )');
    });

    it("rejects a tree level that doesn't match its picks", () => {
        expect(() => flowsTree({ analysis: "intercompany", level: 1, filters, picks: [] })).toThrow();
        expect(() => flowsTree({ analysis: "intercompany", level: 4, filters, picks: ["a", "b", "c", "d"] })).toThrow();
    });
});
