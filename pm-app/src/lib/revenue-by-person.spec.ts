import { describe, expect, it } from "vitest";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { squarify } from "./chart-geometry";
import { hasNoPlan, readPeopleRevenue, readUnassignedRevenue, shareTier } from "./revenue-by-person";
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
        { name: "[ShareToDate]" },
        { name: "[Share]" },
    ],
    rows: [
        ["1348", "Iliak Herrera", 24974, 32200, 0.776, 24974, 64975, 0.384, 0.096, 0.096],
        ["1257", "Erick Angulo", 22387, 16000, 1.399, 22387, 16600, 1.349, 0.086, 0.086],
        ["X1", "Javier Alvarado", 11200, null, 1, 11200, null, 1, 0.043, 0.043],
    ],
} as unknown as QueryTable;

describe("revenue by person", () => {
    it("reads the model's values for the view asked", () => {
        expect(readPeopleRevenue(people, "to-date")[0]).toEqual({ key: "1348", name: "Iliak Herrera", billed: 24974, backlog: 32200, execution: 0.776, share: 0.096 });
        expect(readPeopleRevenue(people, "whole")[0]).toMatchObject({ backlog: 64975, execution: 0.384 });
    });

    it("tiers each person by their share of billed as shown, and flags billing with no Backlog of their own", () => {
        // ALK-401-01 shares (published model, 2026-11-17): 26%, 25%, 17%, 12%, 11%, 9%.
        expect([0.257, 0.247, 0.173, 0.121, 0.108, 0.094].map(shareTier)).toEqual(["25", "25", "15", "10", "10", "5"]);
        expect(shareTier(0.043)).toBe("0");
        expect(shareTier(null)).toBe("0");
        const [iliak, , javier] = readPeopleRevenue(people, "to-date");
        expect(hasNoPlan(iliak)).toBe(false);
        expect(hasNoPlan(javier)).toBe(true);
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
        expect(projectsRevenueByPerson({ filters: scope }).query).toContain("REMOVEFILTERS ( dim_employee )");
        expect(projectsRevenueUnassigned({ filters: scope }).query).toContain("[Planned Revenue Unassigned_app]");
    });
});
