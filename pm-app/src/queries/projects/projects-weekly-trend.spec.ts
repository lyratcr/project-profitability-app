import { describe, expect, it } from "vitest";
import { projectsWeeklyTrend } from "./projects-weekly-trend";

const glass = { light: "#ffd866", base: "#ffcb05", deep: "#fab434", plan: "#272425", billed: "#14b1e7", muted: "#5a5558", ring: "#ffffff", below: "#729b78", above: "#9e2b2b" };

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
