import { describe, expect, it } from "vitest";
import { dateRangeArg, filterArgs, monthPeriod, type FilterState } from "@/lib/filters";
import { lastWeek, thisWeek } from "@/lib/weeks";
import {
    PROJECT_TREND_WEEKS,
    projectsKpis,
    projectsPeople,
    projectsPeopleColumns,
    projectsRevenueByMonth,
    projectsWeek,
    projectsWeeklyTrend,
} from "./index";

const today = new Date(2026, 10, 6);
const state: FilterState = { period: monthPeriod(2026, 10), week: lastWeek(today), org: {}, project: "PAR-401-01" };
const project = filterArgs(state, new Set(["project"]));
const week = [dateRangeArg(state.week.start, state.week.end), ...project];
const code = (q: string) => q.replace(/\/\/.*$/gm, "");

const factories = {
    projectsKpis: () => projectsKpis({ filters: project }),
    projectsWeek: () => projectsWeek({ filters: week }),
    projectsPeople: () => projectsPeople({ filters: week }),
    projectsWeeklyTrend: () => projectsWeeklyTrend({ filters: week }),
    projectsRevenueByMonth: () => projectsRevenueByMonth({ filters: week }),
};

describe("P6 project query factories", () => {
    it.each(Object.entries(factories))("%s filters both facts' project_key and never uses dim_project, year_week or TODAY", (_, factory) => {
        const { connection, query } = factory();
        expect(connection).toBe("profitmodel");
        expect(code(query)).not.toMatch(/@filters|dim_project|year_week|TODAY\s*\(/);
        expect(query).toContain('KEEPFILTERS ( TREATAS ( { "PAR-401-01" }, fact_profitability_metrics[project_key] ) )');
        expect(query).toContain('KEEPFILTERS ( TREATAS ( { "PAR-401-01" }, fact_revenue_metrics[project_key] ) )');
        // Revenue always through the scenario-explicit _app measures, never the original [Total Revenue].
        expect(code(query)).not.toMatch(/\[Total Revenue\]/);
    });

    it("KPIs carry the whole-life measures and no date filter", () => {
        const q = projectsKpis({ filters: project }).query;
        for (const m of ["[Total Planned Revenue_app]", "[Revenue Billed to Date_app]", "[Revenue Left to Bill_app]", "[Billing Progress %_app]", "[Plan End Date_app]"]) {
            expect(q).toContain(m);
        }
        expect(q).not.toContain("DATESBETWEEN");
    });

    it("a week column sends the Sunday–Saturday range (this week ends today)", () => {
        const current = thisWeek(today);
        const q = projectsWeek({ filters: [dateRangeArg(current.start, current.end), ...project] }).query;
        expect(q).toContain("DATESBETWEEN ( dim_calendar[date], DATE ( 2026, 11, 1 ), DATE ( 2026, 11, 6 ) )");
        for (const m of ["[Synerion Hours_app]", "[Planned Hours_app]", "[Hours vs Plan_app]", "[Hours vs Plan %_app]", "[Planned Revenue_app]", "[People With Hours_app]", "[Hours Not Yet Billed_app]"]) {
            expect(q).toContain(m);
        }
    });

    it("who logged time keeps flagged people first and hides the employee id", () => {
        const { query, columnMetadata } = projectsPeople({ filters: week });
        expect(query).toContain("[Missing This Week_app]");
        expect(query).toContain("[Time Allocation %_app]");
        expect(query).toMatch(/ORDER BY \[FlagOrder\], \[Hours\] DESC/);
        expect(Object.keys(columnMetadata)).not.toContain(projectsPeopleColumns.flagOrder);
        expect(Object.keys(columnMetadata).join()).not.toMatch(/ukg_employee_id|rate|cost/i);
        expect(columnMetadata[projectsPeopleColumns.totalHours].displayName).toBe("All their hours");
        expect(projectsPeople({ filters: week, currentWeek: true }).columnMetadata[projectsPeopleColumns.totalHours].displayName).toBe("All their hours (to date)");
    });

    it("weekly trend draws hours bars and a planned-hours line in the query's week order", () => {
        const { query, vegaLiteSpec } = projectsWeeklyTrend({ filters: week });
        expect(PROJECT_TREND_WEEKS).toBe(12);
        expect(query).toContain("ORDER BY dim_calendar[start_of_week_sun]");
        const spec = vegaLiteSpec as { encoding: { x: { field: string; sort: unknown } } };
        expect(spec.encoding.x.field).toBe("Week");
        expect(spec.encoding.x.sort).toBeNull();
        const json = JSON.stringify(vegaLiteSpec);
        expect(json).toContain('"field":"Hours"');
        expect(json).toContain('"field":"PlannedHours"');
    });

    it("revenue by month compares the Actual and Backlog measures in calendar order", () => {
        const q = projectsRevenueByMonth({ filters: week }).query;
        expect(q).toContain("[Actual Revenue_app]");
        expect(q).toContain("[Planned Revenue_app]");
        expect(q).toContain("ORDER BY dim_calendar[year_month_number]");
    });
});
