import { describe, expect, it } from "vitest";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { squarify } from "./chart-geometry";
import { executionBand, readPeopleRevenue, readUnassignedRevenue } from "./revenue-by-person";
import { projectsRevenueByPerson, projectsRevenueUnassigned } from "@/queries/projects";

// MOS-401-09 on the published model, 2026-11-17 (docs/08_app_measures.md § 23).
const people = {
    columns: [
        { name: "dim_employee[employee_number]" },
        { name: "dim_employee[employee_full_name]" },
        { name: "[BilledToDate]" },
        { name: "[BacklogToDate]" },
        { name: "[ExecToDate]" },
        { name: "[Billed]" },
        { name: "[Backlog]" },
        { name: "[Exec]" },
    ],
    rows: [
        ["1348", "Iliak Herrera", 24974, 32200, 0.776, 24974, 64975, 0.384],
        ["1257", "Erick Angulo", 22387, 16000, 1.399, 22387, 16600, 1.349],
        ["X1", "Javier Alvarado", 11200, null, 1, 11200, null, 1],
    ],
} as unknown as QueryTable;

describe("revenue by person", () => {
    it("reads the model's values for the view asked", () => {
        expect(readPeopleRevenue(people, "to-date")[0]).toEqual({ key: "1348", name: "Iliak Herrera", billed: 24974, backlog: 32200, execution: 0.776 });
        expect(readPeopleRevenue(people, "whole")[0]).toMatchObject({ backlog: 64975, execution: 0.384 });
    });

    it("bands each person by the % as shown, and billing with no Backlog as no plan", () => {
        const [iliak, erick, javier] = readPeopleRevenue(people, "to-date");
        expect(executionBand(iliak)).toBe("behind");
        expect(executionBand(erick)).toBe("ahead");
        expect(executionBand(javier)).toBe("no-plan");
        expect(executionBand(readPeopleRevenue(people, "whole")[0])).toBe("well-behind");
        expect(executionBand({ backlog: 15200, execution: 0.95 })).toBe("on");
        expect(executionBand({ backlog: 100, execution: 1.054 })).toBe("on");
    });

    it("reads the roles planned with no person", () => {
        const roles = {
            columns: [{ name: "fact_revenue_metrics[resource_role]" }, { name: "[BacklogToDate]" }, { name: "[Backlog]" }],
            rows: [["IT Manager", 13800, 14922]],
        } as unknown as QueryTable;
        expect(readUnassignedRevenue(roles, "to-date")).toEqual([{ role: "IT Manager", backlog: 13800 }]);
        expect(readUnassignedRevenue(roles, "whole")).toEqual([{ role: "IT Manager", backlog: 14922 }]);
    });
});

describe("squarify", () => {
    it("fills the box with areas proportional to the values, biggest first", () => {
        const tiles = squarify([5, 3, 2, 0, -1], (v) => v, 100, 50);
        expect(tiles.map((t) => t.item)).toEqual([5, 3, 2]);
        const area = tiles.reduce((sum, t) => sum + t.w * t.h, 0);
        expect(area).toBeCloseTo(5000, 6);
        expect(tiles[0].w * tiles[0].h).toBeCloseTo(2500, 6);
        for (const t of tiles) {
            expect(t.x).toBeGreaterThanOrEqual(-1e-9);
            expect(t.y).toBeGreaterThanOrEqual(-1e-9);
            expect(t.x + t.w).toBeLessThanOrEqual(100 + 1e-9);
            expect(t.y + t.h).toBeLessThanOrEqual(50 + 1e-9);
        }
    });

    it("returns nothing when there is nothing to draw", () => {
        expect(squarify([0, 0], (v) => v, 100, 50)).toEqual([]);
    });
});

describe("revenue by person queries", () => {
    it("read the by-person measures with one EVALUATE and the project scope", () => {
        const scope = ['TREATAS ( { "MOS-401-09" }, fact_revenue_metrics[project_key] )'];
        for (const q of [projectsRevenueByPerson({ filters: scope }).query, projectsRevenueUnassigned({ filters: scope }).query]) {
            expect(q.match(/\bEVALUATE\b/g)).toHaveLength(1);
            expect(q).toContain(scope[0]);
            expect(q).not.toContain("/* @filters */");
            expect(q).toContain("_cutoffWeekEnd");
        }
        expect(projectsRevenueByPerson({ filters: scope }).query).toContain("[Revenue Execution % by Person_app]");
        expect(projectsRevenueUnassigned({ filters: scope }).query).toContain("[Planned Revenue Unassigned_app]");
    });
});
