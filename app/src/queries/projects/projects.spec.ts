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

    it("weekly trend: 0 hours for a plan-only week (keeps its place), blank for weeks with neither (dropped)", () => {
        const q = projectsWeeklyTrend({ filters: week }).query;
        expect(q).toMatch(/IF \(\s*NOT ISBLANK \( \[Synerion Hours_app\] \) \|\| NOT ISBLANK \( \[Planned Hours_app\] \),\s*COALESCE \( \[Synerion Hours_app\], 0 \)\s*\)/);
    });

    it("weekly trend asks the model for the variance %", () => {
        expect(projectsWeeklyTrend({ filters: week }).query).toContain('"Variance", [Hours vs Plan Variance %_app]');
        expect(projectsWeeklyTrend({ filters: week }).columnMetadata["[Variance]"].format).toBe("+0.0%;−0.0%;0.0%");
    });

    it("weekly trend tooltip carries both series", () => {
        const json = JSON.stringify(projectsWeeklyTrend({ filters: week }).vegaLiteSpec);
        expect(json).toContain('"tooltip":[{"field":"Week"');
        expect(json).toContain('"title":"Synerion hours"');
        expect(json).toContain('"title":"Planned hours"');
    });

    it("glass bars and plan line follow the dataviz mark specs, in token colours", () => {
        const glass = { light: "#ffd866", base: "#ffcb05", deep: "#fab434", plan: "#aba4a6", variance: "#f4f1ee", ring: "#1f1c1d" };
        const spec = projectsWeeklyTrend({ filters: week, glass }).vegaLiteSpec as unknown as {
            layer: { layer: { mark: Record<string, unknown> }[] }[];
        };
        const [bar, sheen] = spec.layer[0].layer;
        // At most 24px wide, 4px rounded data-end, no border around the mark.
        expect(bar.mark).toMatchObject({ type: "bar", size: 22, cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 });
        expect(bar.mark).not.toHaveProperty("stroke");
        expect(bar.mark.color).toMatchObject({ gradient: "linear", y1: 1, y2: 0, stops: [{ color: glass.deep }, { color: glass.base }, { color: glass.light }] });
        expect(sheen.mark).toMatchObject({ type: "bar", color: { gradient: "linear", x1: 0, x2: 1 } });
        // Plan: grey dashed 2px line; >= 8px points with a 2px ring in the surface colour.
        expect(spec.layer[1].layer[0].mark).toMatchObject({ type: "line", color: glass.plan, strokeWidth: 2, strokeDash: [5, 4], point: { size: 64, stroke: glass.ring, strokeWidth: 2 } });
        // Per week: a segment from plan to hours beside the bar, and the model's variance % above it.
        const [, segment, label] = spec.layer[1].layer as unknown as { mark: Record<string, unknown>; encoding: Record<string, { field?: string }> }[];
        expect(segment.mark).toMatchObject({ type: "rule", color: glass.variance });
        expect(segment.mark).not.toHaveProperty("xOffset");
        expect(segment.encoding.y.field).toBe("PlannedHours");
        expect(segment.encoding.y2.field).toBe("Hours");
        expect(label.mark).toMatchObject({ type: "text", align: "center", color: glass.variance });
        expect(label.mark).not.toHaveProperty("xOffset");
        expect(label.encoding.text.field).toBe("VarianceLabel");
        // No layer may hide the shared hours axis.
        expect(JSON.stringify(spec.layer[0].layer[0])).not.toContain('"axis":null');
        expect(segment.encoding.y).not.toHaveProperty("axis");
        // Without the tokens (tests, stylesheet not loaded) the theme's plain bars stay.
        const plain = projectsWeeklyTrend({ filters: week }).vegaLiteSpec as unknown as { layer: { layer: unknown[] }[] };
        expect(plain.layer[0].layer).toHaveLength(1);
    });
});
