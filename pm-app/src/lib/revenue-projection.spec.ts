import { describe, expect, it } from "vitest";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { projectionStory, readProjectionWeeks, type ProjectionValues } from "./revenue-projection";
import { projectsRevenueProjection, projectsRevenueProjectionWeeks } from "@/queries/projects";

const base: ProjectionValues = { sow: 100, billed: 50, ahead: 50, projected: 100, vsSow: 0, vsSowPct: 0, allSow: 100, cutoff: null, planEnd: null };

describe("projectionStory", () => {
    it("reads the sign of the model's difference", () => {
        expect(projectionStory({ ...base, projected: 301529, vsSow: 25162, vsSowPct: 0.091 })).toBe("over");
        expect(projectionStory({ ...base, projected: 117946, vsSow: -25031, vsSowPct: -0.175 })).toBe("short");
        expect(projectionStory({ ...base, vsSow: 120, vsSowPct: 0.004 })).toBe("on");
    });

    it("has nothing to project for Fixed Fee projects (blank measures)", () => {
        expect(projectionStory({ ...base, sow: null, projected: null, vsSow: null, vsSowPct: null })).toBe("fixed-fee");
    });
});

describe("readProjectionWeeks", () => {
    it("starts the line at 0 before anything is billed and marks the integrated weeks", () => {
        const table = {
            columns: [{ name: "dim_calendar[start_of_week_sun]" }, { name: "[Cumulative]" }, { name: "[PlanCum]" }, { name: "[Integrated]" }],
            rows: [
                ["2026-09-13T00:00:00.000", null, 21610, 1],
                ["2026-11-08T00:00:00.000", 272002, 246840, 0],
            ],
        } as unknown as QueryTable;
        const [first, second] = readProjectionWeeks(table);
        expect(first).toMatchObject({ cumulative: 0, plan: 21610, integrated: true });
        expect(first.end.getDate()).toBe(19);
        expect(second).toMatchObject({ cumulative: 272002, integrated: false });
    });
});

describe("revenue projection queries", () => {
    it("read the _app\\Revenue Projection measures with one EVALUATE and the project scope", () => {
        const scope = ['TREATAS ( { "MOS-401-09" }, fact_revenue_metrics[project_key] )'];
        const summary = projectsRevenueProjection({ filters: scope }).query;
        const weeks = projectsRevenueProjectionWeeks({ filters: scope }).query;
        for (const q of [summary, weeks]) {
            expect(q.match(/\bEVALUATE\b/g)).toHaveLength(1);
            expect(q).toContain('TREATAS ( { "MOS-401-09" }, fact_revenue_metrics[project_key] )');
            expect(q).not.toContain("/* @filters */");
        }
        expect(summary).toContain("[Revenue Projected at End_app]");
        expect(summary).toContain("[Revenue Projected vs SOW_app]");
        expect(weeks).toContain("[Revenue Actual then Backlog Cumulative_app]");
        expect(weeks).toContain("[Planned Revenue Cumulative_app]");
    });
});
