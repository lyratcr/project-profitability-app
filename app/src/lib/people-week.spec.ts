import { describe, expect, it } from "vitest";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { buildPeopleMatrix, diffTone, weekKey } from "./people-week";

// Column shapes as returned by the three people x week queries on the published model (UIP-101-01 / PAR-401-02,
// 2026-11-12). Names replaced: they are HR data.
const people = {
    columns: [
        { name: "dim_employee[employee_number]" },
        { name: "dim_employee[employee_full_name]" },
        { name: "dim_calendar[start_of_week_sun]" },
        { name: "[IsWeekTotal]" },
        { name: "[Hours]" },
        { name: "[PlannedHours]" },
        { name: "[Diff]" },
        { name: "[Variance]" },
    ],
    rows: [
        ["C009", "Person A", "2026-10-11T00:00:00.000", false, null, 36.56, -36.56, -1],
        ["C009", "Person A", "2026-11-01T00:00:00.000", false, 32, null, 32, 1],
        ["C009", "Person A", null, true, 232, 214.08, 17.92, 0.0837],
        ["", "", "2026-10-11T00:00:00.000", false, 4, null, 4, 1],
    ],
} as unknown as QueryTable;

const roles = {
    columns: [{ name: "fact_revenue_metrics[resource_role]" }, { name: "dim_calendar[start_of_week_sun]" }, { name: "[IsWeekTotal]" }, { name: "[PlannedHours]" }],
    rows: [
        ["Senior Developer", "2026-10-11T00:00:00.000", false, 110.34],
        ["Senior Developer", null, true, 860.65],
    ],
} as unknown as QueryTable;

const project = {
    columns: [
        { name: "dim_calendar[start_of_week_sun]" },
        { name: "[IsWeekTotal]" },
        { name: "[Hours]" },
        { name: "[PlannedHours]" },
        { name: "[Diff]" },
        { name: "[Variance]" },
        { name: "[ServicesPlannedHours]" },
    ],
    rows: [
        ["2026-10-11T00:00:00.000", false, 264, 488.4, -224.4, -0.459, null],
        [null, true, 2606, 2861.64, -255.64, -0.0893, null],
    ],
} as unknown as QueryTable;

describe("buildPeopleMatrix", () => {
    it("places each model value in its person and week, with the window total apart", () => {
        const m = buildPeopleMatrix(people, roles, project);
        expect(m.people).toHaveLength(1); // the blank employee row is dropped (its plan shows under roles / services)
        const a = m.people[0];
        expect(a.label).toBe("Person A");
        expect(a.weeks["2026-10-11"]).toEqual({ hours: null, planned: 36.56, diff: -36.56, variance: -1 });
        expect(a.weeks["2026-11-01"].diff).toBe(32);
        expect(a.total).toEqual({ hours: 232, planned: 214.08, diff: 17.92, variance: 0.0837 });
    });

    it("keeps roles as plan-only rows and the project row with its totals", () => {
        const m = buildPeopleMatrix(people, roles, project);
        expect(m.roles[0]).toMatchObject({ label: "Senior Developer", kind: "role" });
        expect(m.roles[0].weeks["2026-10-11"]).toEqual({ hours: null, planned: 110.34, diff: null, variance: null });
        expect(m.roles[0].total.planned).toBe(860.65);
        expect(m.project?.total).toEqual({ hours: 2606, planned: 2861.64, diff: -255.64, variance: -0.0893 });
        // No catalog-service plan on this project: no services row.
        expect(m.services).toBeNull();
    });
});

describe("people x week helpers", () => {
    it("reads week keys from model dates and local dates", () => {
        expect(weekKey("2026-10-25T00:00:00.000")).toBe("2026-10-25");
        expect(weekKey(new Date(2026, 9, 25))).toBe("2026-10-25");
        expect(weekKey(null)).toBeNull();
    });

    it("colours over budget red, under green, and a rounded zero neutral", () => {
        expect(diffTone(28.7)).toBe("over");
        expect(diffTone(-36.56)).toBe("under");
        expect(diffTone(0.3)).toBe("even");
        expect(diffTone(null)).toBeNull();
    });
});
