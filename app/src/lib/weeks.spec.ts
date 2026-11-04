import { describe, expect, it } from "vitest";
import { defaultWeek, describeWeek, lastWeek, mondayOf, parseWeek, reviewWindow, thisWeek, weekChoices, weekSpan } from "./weeks";

const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
// Calendar facts checked against dim_calendar on 2026-11-04: Nov 2, 2026 is a Monday.
const wednesday = day(2026, 11, 4);
const monday = day(2026, 11, 2);

describe("mondayOf", () => {
    it("returns the Monday of the week, Sunday belonging to the week before", () => {
        expect(mondayOf(wednesday)).toEqual(day(2026, 11, 2, 0));
        expect(mondayOf(monday)).toEqual(day(2026, 11, 2, 0));
        expect(mondayOf(day(2026, 11, 1))).toEqual(day(2026, 10, 26, 0));
    });

    it("crosses month and year boundaries", () => {
        expect(mondayOf(day(2026, 1, 1))).toEqual(day(2025, 12, 29, 0));
        expect(mondayOf(day(2027, 1, 3))).toEqual(day(2026, 12, 28, 0));
    });
});

describe("this week / last week", () => {
    it("cuts the current week at today and keeps last week whole", () => {
        expect(thisWeek(wednesday)).toMatchObject({ start: day(2026, 11, 2, 0), end: day(2026, 11, 4, 0), sunday: day(2026, 11, 8, 0), isCurrent: true, token: "w:2026-11-02" });
        expect(lastWeek(wednesday)).toMatchObject({ start: day(2026, 10, 26, 0), end: day(2026, 11, 1, 0), isCurrent: false, token: "w:2026-10-26" });
    });

    it("handles the week that spans New Year", () => {
        expect(lastWeek(day(2026, 1, 7))).toMatchObject({ start: day(2025, 12, 29, 0), end: day(2026, 1, 4, 0) });
    });
});

describe("parseWeek", () => {
    it("accepts past and current Mondays", () => {
        expect(parseWeek("w:2026-10-26", wednesday)?.end).toEqual(day(2026, 11, 1, 0));
        expect(parseWeek("w:2026-11-02", wednesday)?.isCurrent).toBe(true);
    });

    it("rejects non-Mondays, future weeks and malformed values", () => {
        for (const bad of [null, "", "w:2026-10-27", "w:2026-11-09", "w:2026-02-30", "2026-10-26", "w:2026-10-26;x"]) {
            expect(parseWeek(bad, wednesday)).toBeNull();
        }
    });
});

describe("weekChoices", () => {
    it("lists the current week and the 11 before it, newest first", () => {
        const weeks = weekChoices(wednesday);
        expect(weeks).toHaveLength(12);
        expect(weeks[0].token).toBe("w:2026-11-02");
        expect(weeks[1].token).toBe("w:2026-10-26");
        expect(weeks[11].token).toBe("w:2026-08-17");
        expect(weeks.slice(1).every((w) => !w.isCurrent)).toBe(true);
    });
});

describe("reviewWindow / defaultWeek", () => {
    it("is open on Monday, for last week", () => {
        const r = reviewWindow(day(2026, 11, 2, 9));
        expect(r.active).toBe(true);
        expect(r.week.token).toBe("w:2026-10-26");
        expect(defaultWeek(day(2026, 11, 2, 9)).token).toBe("w:2026-10-26");
    });

    it("stays open on Tuesday before the integration hour, for the same week", () => {
        const r = reviewWindow(day(2026, 11, 3, 5));
        expect(r.active).toBe(true);
        expect(r.week.token).toBe("w:2026-10-26");
    });

    it("closes on Tuesday after the integration and the rest of the week", () => {
        expect(reviewWindow(day(2026, 11, 3, 6)).active).toBe(false);
        expect(reviewWindow(wednesday).active).toBe(false);
        expect(reviewWindow(day(2026, 11, 8, 23)).active).toBe(false);
        expect(defaultWeek(wednesday).token).toBe("w:2026-11-02");
    });
});

describe("labels", () => {
    it("describes this week, last week and older weeks", () => {
        expect(describeWeek(thisWeek(wednesday), wednesday)).toBe("This week (Nov 2 – Nov 4, to date)");
        expect(describeWeek(lastWeek(wednesday), wednesday)).toBe("Last week (Oct 26 – Nov 1, 2026)");
        expect(describeWeek(weekChoices(wednesday)[2], wednesday)).toBe("Oct 19 – Oct 25, 2026");
        expect(weekSpan(lastWeek(day(2026, 1, 7)))).toBe("Dec 29 – Jan 4, 2026");
    });
});
