import { describe, expect, it } from "vitest";
import { projectsWeeklyTrend } from "./projects-weekly-trend";
import { projectsWeeklyVariance } from "./projects-weekly-variance";

const glass = { light: "#ffd866", base: "#ffcb05", deep: "#fab434", plan: "#272425", billed: "#14b1e7", muted: "#5a5558", ring: "#ffffff", positive: "#729b78", negative: "#9e2b2b" };

describe("projectsWeeklyTrend", () => {
    it("returns the three scenarios: Synerion, Backlog budget and Project Ops billed hours (Ion, 2026-11-16)", () => {
        const q = projectsWeeklyTrend({ glass });
        expect(q.query).toContain('"Billed", [Billed Hours by Person_app]');
        expect(q.query).toContain("[Planned Hours_app]");
        expect(q.query).toContain("[Synerion Hours_app]");
    });

    it("draws Project Ops as a solid blue line (what happened) and the budget dashed (a plan), on the shared hours axis", () => {
        const spec = projectsWeeklyTrend({ glass }).vegaLiteSpec as unknown as { layer: { layer: { mark: { color?: string; strokeDash?: number[] }; encoding: { y: { field: string } } }[] }[] };
        const lines = spec.layer[1].layer;
        expect(lines.map((l) => l.encoding.y.field)).toEqual(["PlannedHours", "Billed"]);
        expect(lines[1].mark.color).toBe("#14b1e7");
        expect(lines[1].mark.strokeDash).toBeUndefined();
        expect(lines[0].mark.strokeDash).toEqual([6, 4]);
    });
});

describe("projectsWeeklyVariance (Ion, 2026-11-18)", () => {
    it("compares Project Ops (Actual) with the Backlog, only in weeks the integration has posted", () => {
        const q = projectsWeeklyVariance({ glass });
        expect(q.query).toContain("VAR _billed = [Billed Hours by Person_app]");
        expect(q.query).toContain("VAR _plan = [Planned Hours_app]");
        expect(q.query).toMatch(/MAX \( dim_calendar\[start_of_week_sun\] \) <= _cutoff/);
        expect(q.query).toContain('"Posted"');
        expect(q.query).not.toContain("[Hours vs Plan Variance %_app]");
    });

    it("draws above the Backlog green and below it red, and says 'not posted' for a week not in Project Ops yet", () => {
        const spec = projectsWeeklyVariance({ glass }).vegaLiteSpec as unknown as { layer: { encoding: { color?: { condition: { test: string; value: string }; value: string } }; transform?: { calculate?: string }[] }[] };
        const color = spec.layer[2].encoding.color;
        expect(color?.condition).toEqual({ test: "datum.Variance < 0", value: "#9e2b2b" });
        expect(color?.value).toBe("#729b78");
        expect(JSON.stringify(spec.layer.at(-1)?.transform)).toContain("not posted");
    });
});
