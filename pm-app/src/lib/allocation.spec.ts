import { describe, expect, it } from "vitest";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import {
    allocationFilterArgs,
    allocationWindow,
    arrangePeople,
    fillAllocationDates,
    findPerson,
    lowestRate,
    personArg,
    personChoices,
    personLoad,
    readBookings,
    readOptions,
    readPeople,
    readWeekDetail,
    readWeeks,
    weekKeyOf,
    weekLoad,
    type AllocationPerson,
} from "./allocation";

const table = (columns: string[], rows: unknown[][]): QueryTable => ({ columns: columns.map((name) => ({ name })), rows }) as unknown as QueryTable;

describe("allocationWindow", () => {
    // Thursday 2026-11-19: this week starts Sunday Nov 15; seven months, Nov 2026 to May 2027.
    const w = allocationWindow(new Date(2026, 10, 19));

    it("runs from this week's Sunday to the Saturday of the last week that starts in the seventh month", () => {
        expect(w.from).toEqual(new Date(2026, 10, 15));
        expect(w.to).toEqual(new Date(2027, 5, 5));
        expect(w.weeks).toHaveLength(29);
        expect(w.months.map((m) => m.key)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"]);
    });

    it("gives each month the weeks whose Sunday falls in it", () => {
        const nov = w.months[0];
        expect([nov.firstWeek, nov.weekCount, nov.start, nov.end]).toEqual([0, 3, new Date(2026, 10, 15), new Date(2026, 11, 5)]);
        const mar = w.months.find((m) => m.key === "2027-03")!;
        expect([mar.weekCount, mar.start, mar.end]).toEqual([4, new Date(2027, 2, 7), new Date(2027, 3, 3)]);
        expect(w.months.reduce((n, m) => n + m.weekCount, 0)).toBe(w.weeks.length);
    });

    it("fills the date tokens as DAX dates", () => {
        const mar = w.months.find((m) => m.key === "2027-03")!;
        const q = fillAllocationDates("@@FROM@@ @@TO@@ @@MONTH_FROM@@ @@MONTH_TO@@ @@TODAY@@", w, mar, new Date(2026, 10, 19));
        expect(q).toBe("DATE ( 2026, 11, 15 ) DATE ( 2027, 6, 5 ) DATE ( 2027, 3, 7 ) DATE ( 2027, 4, 3 ) DATE ( 2026, 11, 19 )");
    });

    it("keys weeks as yyyymmdd", () => {
        expect(weekKeyOf(new Date(2026, 10, 15))).toBe(20261115);
    });
});

describe("filters", () => {
    const options = readOptions(
        table(
            ["[Kind]", "[Value]"],
            [
                ["l1", "DTF"],
                ["role", "Consultant"],
                ["role", 'Say "hi"'],
            ],
        ),
    );

    it("reads the role and L1 lists", () => {
        expect(options).toEqual({ roles: ["Consultant", 'Say "hi"'], l1s: ["DTF"] });
    });

    it("only lets listed values reach DAX, escaped", () => {
        expect(allocationFilterArgs({ role: "Unknown", l1: "Nope" }, options)).toEqual([]);
        const [role] = allocationFilterArgs({ role: 'Say "hi"' }, options);
        expect(role).toBe('KEEPFILTERS ( TREATAS ( { "Say ""hi""" }, fact_revenue_metrics[resource_role] ) )');
        const [l1] = allocationFilterArgs({ l1: "DTF" }, options);
        expect(l1).toContain('dim_employee_history[L1] = "DTF"');
        expect(l1).toContain("dim_employee_history[end_date] > _today");
        expect(personArg('A"1')).toBe('KEEPFILTERS ( TREATAS ( { "A""1" }, fact_revenue_metrics[employee_number] ) )');
    });
});

describe("results", () => {
    const w = allocationWindow(new Date(2026, 10, 19));

    it("joins consecutive weeks of a project into bars, keeping each week's hours", () => {
        const bookings = readBookings(
            table(
                ["[EmployeeNumber]", "[Project]", "[WeekKey]", "[Hours]"],
                [
                    ["C1", "B-1", 20261122, 10],
                    ["C1", "A-1", 20261115, 40],
                    ["C1", "A-1", 20261122, 40],
                    ["C1", "A-1", 20261206, 20],
                    ["C1", "A-1", 20991231, 8],
                ],
            ),
            w,
        );
        expect(bookings.get("C1")).toEqual([
            { project: "A-1", segments: [{ first: 0, last: 1, hours: [40, 40] }, { first: 3, last: 3, hours: [20] }] },
            { project: "B-1", segments: [{ first: 1, last: 1, hours: [10] }] },
        ]);
    });

    it("reads week loads; a week with no row is free", () => {
        const weeks = readWeeks(table(["[EmployeeNumber]", "[WeekKey]", "[Hours]", "[Free]", "[Over]", "[FreeShare]"], [["C1", 20261115, 48, 0, 8, 0], ["C1", 20261122, 40, 0, 0, 0]]));
        const c1 = weeks.get("C1")!;
        expect(weekLoad(c1.get(20261115))).toBe("over");
        expect(weekLoad(c1.get(20261122))).toBe("full");
        expect(weekLoad(c1.get(20261129))).toBe("free");
        // 40.11 h planned: 0.11 h over reads as full, as in the pill and the tooltip.
        expect(weekLoad({ hours: 40.11, free: 0, over: 0.11, freeShare: 0 })).toBe("full");
        expect(weekLoad({ hours: 39.7, free: 0.3, over: 0, freeShare: 0.0075 })).toBe("full");
        expect(weekLoad({ hours: 41, free: 0, over: 1, freeShare: 0 })).toBe("over");
    });

    const person = (name: string, role: string, free: number, over: number, revenue: number): AllocationPerson => ({
        employeeNumber: name,
        name,
        role,
        l1: "DTF",
        monthHours: 0,
        monthRevenue: revenue,
        freeHours: free,
        overHours: over,
        peakHours: 0,
        rate: null,
    });

    it("reads people and falls back to the Auxis ID for a missing name", () => {
        const people = readPeople(table(["[EmployeeNumber]", "[Employee]", "[FreeHours]"], [["0387", null, 1.2]]));
        expect(people[0].name).toBe("Auxis ID 0387");
        expect(people[0].freeHours).toBe(1.2);
    });

    it("treats under half an hour free or over as none", () => {
        expect(personLoad(person("a", "R", 0.4, 0, 0))).toBe("full");
        expect(personLoad(person("a", "R", 0, 0.3, 0))).toBe("full");
        expect(personLoad(person("a", "R", 9, 0, 0))).toBe("free");
        expect(personLoad(person("a", "R", 0, 2, 0))).toBe("over");
    });

    it("filters by Show and orders within each role", () => {
        const people = [person("Ana", "B", 10, 0, 100), person("Bea", "A", 0, 5, 300), person("Cid", "A", 20, 0, 200), person("Dan", "A", 0, 9, 50)];
        expect(arrangePeople(people, "all", "revenue").map((p) => p.name)).toEqual(["Bea", "Cid", "Dan", "Ana"]);
        expect(arrangePeople(people, "free", "free").map((p) => p.name)).toEqual(["Cid", "Ana"]);
        expect(arrangePeople(people, "over", "revenue").map((p) => p.name)).toEqual(["Dan", "Bea"]);
        expect(arrangePeople(people, "all", "name").map((p) => p.name)).toEqual(["Bea", "Cid", "Dan", "Ana"]);
    });

    it("names the lowest billing rate only with two or more rated projects", () => {
        expect(lowestRate([{ project: "A", hours: 10, rate: 100, revenue: 1000, share: 1 }])).toBeNull();
        expect(lowestRate([{ project: "A", hours: 10, rate: 100, revenue: 1000, share: 0.6 }, { project: "B", hours: 10, rate: 60, revenue: 600, share: 0.4 }])?.project).toBe("B");
    });

    it("offers the person search sorted by name, telling apart people who share a name", () => {
        const people = [person("Zoe", "R", 1, 0, 0), person("Ana", "R", 1, 0, 0), { ...person("Ana", "R", 1, 0, 0), employeeNumber: "T2" }];
        const choices = personChoices(people);
        expect(choices.map((c) => c.label)).toEqual(["Ana · Auxis ID Ana", "Ana · Auxis ID T2", "Zoe"]);
        expect(choices[2].hint).toBe("R · DTF");
        expect(findPerson(choices, "  zoe ")?.employeeNumber).toBe("Zoe");
        expect(findPerson(choices, "Zo")).toBeNull();
        expect(findPerson(choices, "")).toBeNull();
    });

    it("reads the week tooltip: total, projects by hours, and days", () => {
        const detail = readWeekDetail(
            table(
                ["[Kind]", "[Key]", "[Hours]", "[Revenue]"],
                [
                    ["day", "2026-12-14", 13, null],
                    ["project", "BLU-401-03", 16, 1744],
                    ["project", "GTA-101-04", 48, 912],
                    ["total", "", 64, 2656],
                ],
            ),
        );
        expect([detail.hours, detail.revenue]).toEqual([64, 2656]);
        expect(detail.projects.map((p) => p.project)).toEqual(["GTA-101-04", "BLU-401-03"]);
        expect(detail.days.get("2026-12-14")).toBe(13);
    });
});
