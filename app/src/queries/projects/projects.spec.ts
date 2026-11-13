import { describe, expect, it } from "vitest";
import { dateRangeArg, filterArgs, monthPeriod, type FilterState } from "@/lib/filters";
import { lastWeek, thisWeek } from "@/lib/weeks";
import {
    PROJECT_TREND_WEEKS,
    projectsKpis,
    projectsPeople,
    projectsPeopleColumns,
    projectsPeopleWeeks,
    projectsProjectWeeks,
    projectsRoleWeeks,
    PEOPLE_MATRIX_WEEKS,
    projectsRevenueByMonth,
    projectsWeek,
    projectsTrendMonths,
    projectsTrendSummary,
    projectsWeeklyTrend,
    projectsWeeklyVariance,
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
        for (const m of ["[Total Planned Revenue_app]", "[Revenue Billed to Date_app]", "[Revenue Left to Bill_app]", "[Billing Progress %_app]", "[Revenue Left to Bill %_app]", "[Plan End Date_app]"]) {
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

    it("weekly trend: 0 hours for a plan-only week (keeps its place), blank for weeks with neither (dropped)", () => {
        const q = projectsWeeklyTrend({ filters: week }).query;
        expect(q).toMatch(/IF \(\s*NOT ISBLANK \( \[Synerion Hours_app\] \) \|\| NOT ISBLANK \( \[Planned Hours_app\] \),\s*COALESCE \( \[Synerion Hours_app\], 0 \)\s*\)/);
    });

    it("weekly trend asks the model for the variance %", () => {
        expect(projectsWeeklyTrend({ filters: week }).query).toContain('"Variance", [Hours vs Plan Variance %_app]');
        expect(projectsWeeklyTrend({ filters: week }).columnMetadata["[Variance]"].format).toBe("+#,0%;−#,0%;0%");
    });

    it("weekly trend tooltip carries both series", () => {
        const json = JSON.stringify(projectsWeeklyTrend({ filters: week }).vegaLiteSpec);
        expect(json).toContain('"tooltip":[{"field":"Week"');
        expect(json).toContain('"title":"Synerion hours"');
        expect(json).toContain('"title":"Budget hours"');
    });

    const glass = { light: "#ffd866", base: "#ffcb05", deep: "#fab434", plan: "#f4f1ee", muted: "#aba4a6", ring: "#1f1c1d", below: "#729b78", above: "#9e2b2b" };

    it("hours chart: translucent glass bars behind, an ink budget line in front, week labels left to the panel below", () => {
        const spec = projectsWeeklyTrend({ filters: week, glass }).vegaLiteSpec as unknown as {
            encoding: { x: { axis: Record<string, unknown> } };
            layer: { layer: { mark: Record<string, unknown>; encoding: { y: { axis?: unknown } } }[] }[];
        };
        const [bar, sheen] = spec.layer[0].layer;
        // At most 24px wide, 4px rounded data-end, no border; translucent so the line reads in front.
        expect(bar.mark).toMatchObject({ type: "bar", size: 22, cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4, opacity: 0.82 });
        expect(bar.mark).not.toHaveProperty("stroke");
        expect(bar.mark.color).toMatchObject({ gradient: "linear", y1: 1, y2: 0, stops: [{ color: glass.deep }, { color: glass.base }, { color: glass.light }] });
        expect(sheen.mark).toMatchObject({ type: "bar", color: { gradient: "linear", x1: 0, x2: 1 } });
        expect(spec.layer[1].layer[0].mark).toMatchObject({ type: "line", color: glass.plan, strokeWidth: 2.5, point: { size: 64, stroke: glass.ring, strokeWidth: 2 } });
        // The y axis keeps a fixed width so the variance panel's weeks line up under these bars.
        expect(bar.encoding.y.axis).toMatchObject({ minExtent: 46, maxExtent: 46 });
        expect(spec.encoding.x.axis).toMatchObject({ labels: false });
        // Without the tokens (tests, stylesheet not loaded) the theme's plain bars stay.
        const plain = projectsWeeklyTrend({ filters: week }).vegaLiteSpec as unknown as { layer: { layer: unknown[] }[] };
        expect(plain.layer[0].layer).toHaveLength(1);
    });

    it("variance panel: lollipops coloured by sign, signed labels, every week kept in order", () => {
        const { query, vegaLiteSpec } = projectsWeeklyVariance({ filters: week, glass });
        expect(query).toContain('"Variance", [Hours vs Plan Variance %_app]');
        const spec = vegaLiteSpec as unknown as {
            layer: { mark: Record<string, unknown>; encoding: Record<string, Record<string, unknown>>; transform?: Record<string, string>[] }[];
        };
        // Zero line first, with no x so it spans the width; then an invisible rule with every week (no filter).
        expect(spec.layer[0].encoding).not.toHaveProperty("x");
        expect(spec.layer[1].mark).toMatchObject({ type: "rule", opacity: 0 });
        expect(spec.layer[1].transform).toBeUndefined();
        expect(spec.layer[1].encoding.x).toMatchObject({ field: "Week", sort: null });
        // No layer hides the axis (it would also drop the width that aligns the weeks).
        expect(JSON.stringify(spec)).not.toContain('"axis":null');
        const stem = spec.layer[2];
        expect(stem.mark).toMatchObject({ type: "rule" });
        // Over budget red, at or under budget green.
        expect(stem.encoding.color).toMatchObject({ condition: { test: "datum.Variance > 0", value: glass.above }, value: glass.below });
        expect(stem.encoding.y.axis).toMatchObject({ minExtent: 46, maxExtent: 46 });
        const json = JSON.stringify(spec);
        expect(json).toContain("format(datum.Variance, '+,.0%')");
        expect(json).toContain("abs(datum.Variance) < 0.005 ? '0%'");
        expect(json).toContain("'no plan'");
    });

    it("trend summary and months use the four model measures over the same window", () => {
        for (const q of [projectsTrendSummary({ filters: week }).query, projectsTrendMonths({ filters: week }).query]) {
            for (const m of ["[Synerion Hours_app]", "[Planned Hours_app]", "[Hours vs Plan_app]", "[Hours vs Plan Variance %_app]"]) expect(q).toContain(m);
        }
        expect(projectsTrendMonths({ filters: week }).query).toContain("ORDER BY dim_calendar[year_month_number]");
    });

    it("people x week queries use the person measures, the inactive Auxis ID relationship stays inside them", () => {
        const people = projectsPeopleWeeks({ filters: week }).query;
        for (const m of ["[Synerion Hours_app]", "[Planned Hours by Person_app]", "[Hours vs Plan by Person_app]", "[Hours vs Plan Variance % by Person_app]"]) expect(people).toContain(m);
        expect(people).toContain('ROLLUPADDISSUBTOTAL ( dim_calendar[start_of_week_sun], "IsWeekTotal" )');
        expect(people).toContain("NOT ISBLANK ( dim_employee[employee_number] )");
        expect(code(people)).not.toMatch(/USERELATIONSHIP/);
        expect(projectsRoleWeeks({ filters: week }).query).toContain("[Planned Hours Unassigned_app]");
        expect(projectsProjectWeeks({ filters: week }).query).toContain('TREATAS ( { "not_a_person" }, fact_revenue_metrics[resource_match] )');
        expect(PEOPLE_MATRIX_WEEKS).toBe(8);
    });
});

