import { describe, expect, it } from "vitest";
import { defaultWeek, describeWeek, lastWeek, parseWeek, reviewWindow, thisWeek, weekChoices, weekSpan, trendWindow, weekStartOf } from "./weeks";

const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const at0 = (y: number, m: number, d: number) => new Date(y, m - 1, d);
// Calendar facts checked against dim_calendar on 2026-11-04: Nov 1, 2026 is a Sunday.
const wednesday = day(2026, 11, 4);

describe("weekStartOf", () => {
    it("returns the Sunday of the week; Saturday closes it", () => {
        expect(weekStartOf(wednesday)).toEqual(at0(2026, 11, 1));
        expect(weekStartOf(day(2026, 11, 1))).toEqual(at0(2026, 11, 1));
        expect(weekStartOf(day(2026, 10, 31))).toEqual(at0(2026, 10, 25));
    });

    it("crosses month and year boundaries", () => {
        expect(weekStartOf(day(2026, 1, 1))).toEqual(at0(2025, 12, 28));
        expect(weekStartOf(day(2027, 1, 2))).toEqual(at0(2026, 12, 27));
    });
});

describe("this week / last week", () => {
    it("cuts the current week at today and keeps last week whole (Sunday–Saturday)", () => {
        expect(thisWeek(wednesday)).toMatchObject({ start: at0(2026, 11, 1), end: at0(2026, 11, 4), weekEnd: at0(2026, 11, 7), isCurrent: true, token: "w:2026-11-01" });
        expect(lastWeek(wednesday)).toMatchObject({ start: at0(2026, 10, 25), end: at0(2026, 10, 31), isCurrent: false, token: "w:2026-10-25" });
    });

    it("treats Sunday as the first day of the current week", () => {
        expect(thisWeek(day(2026, 11, 8))).toMatchObject({ start: at0(2026, 11, 8), end: at0(2026, 11, 8) });
        expect(lastWeek(day(2026, 11, 8)).token).toBe("w:2026-11-01");
    });

    it("handles the week that spans New Year", () => {
        expect(lastWeek(day(2026, 1, 7))).toMatchObject({ start: at0(2025, 12, 28), end: at0(2026, 1, 3) });
    });
});

describe("parseWeek", () => {
    it("accepts past and current Sundays", () => {
        expect(parseWeek("w:2026-10-25", wednesday)?.end).toEqual(at0(2026, 10, 31));
        expect(parseWeek("w:2026-11-01", wednesday)?.isCurrent).toBe(true);
    });

    it("rejects non-Sundays, future weeks and malformed values", () => {
        for (const bad of [null, "", "w:2026-10-26", "w:2026-11-08", "w:2026-02-30", "2026-10-25", "w:2026-10-25;x"]) {
            expect(parseWeek(bad, wednesday)).toBeNull();
        }
    });
});

describe("weekChoices", () => {
    it("lists the current week and the 11 before it, newest first", () => {
        const weeks = weekChoices(wednesday);
        expect(weeks).toHaveLength(12);
        expect(weeks[0].token).toBe("w:2026-11-01");
        expect(weeks[1].token).toBe("w:2026-10-25");
        expect(weeks[11].token).toBe("w:2026-08-16");
        expect(weeks.slice(1).every((w) => !w.isCurrent)).toBe(true);
    });
});

describe("reviewWindow / defaultWeek", () => {
    it("is open on Monday, for the week that ended on Saturday", () => {
        const r = reviewWindow(day(2026, 11, 2, 9));
        expect(r.active).toBe(true);
        expect(r.week.token).toBe("w:2026-10-25");
        expect(defaultWeek(day(2026, 11, 2, 9)).token).toBe("w:2026-10-25");
    });

    it("stays open on Tuesday before the integration hour, for the same week", () => {
        const r = reviewWindow(day(2026, 11, 3, 5));
        expect(r.active).toBe(true);
        expect(r.week.token).toBe("w:2026-10-25");
    });

    it("closes on Tuesday after the integration and the rest of the week", () => {
        expect(reviewWindow(day(2026, 11, 3, 6)).active).toBe(false);
        expect(reviewWindow(wednesday).active).toBe(false);
        expect(reviewWindow(day(2026, 11, 7, 23)).active).toBe(false);
        expect(reviewWindow(day(2026, 11, 8, 10)).active).toBe(false);
        expect(defaultWeek(wednesday).token).toBe("w:2026-11-01");
    });
});

describe("labels", () => {
    it("describes this week, last week and older weeks", () => {
        expect(describeWeek(thisWeek(wednesday), wednesday)).toBe("This week (Nov 1 – Nov 4, to date)");
        expect(describeWeek(lastWeek(wednesday), wednesday)).toBe("Last week (Oct 25 – Oct 31, 2026)");
        expect(describeWeek(weekChoices(wednesday)[2], wednesday)).toBe("Oct 18 – Oct 24, 2026");
        expect(weekSpan(lastWeek(day(2026, 1, 7)))).toBe("Dec 28 – Jan 3, 2026");
    });
});

describe("trendWindow", () => {
    const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
    const today = d(2026, 11, 4); // Wednesday

    it("ends with the Sunday–Saturday week that holds the period's last day", () => {
        const w = trendWindow(d(2026, 10, 31), today); // Saturday
        expect(w.end).toEqual(d(2026, 10, 31));
        expect(w.start).toEqual(d(2026, 8, 2)); // 13 weeks, starting on a Sunday
        expect(w.start.getDay()).toBe(0);
    });

    it("runs to the Saturday when the period ends mid-week", () => {
        const w = trendWindow(d(2026, 9, 30), today); // Wednesday
        expect(w.end).toEqual(d(2026, 10, 3));
        expect(w.start).toEqual(d(2026, 7, 5));
    });

    it("stops at today when the period runs into the future", () => {
        const w = trendWindow(d(2026, 11, 30), today);
        expect(w.end).toEqual(today);
        expect(w.start).toEqual(d(2026, 8, 9));
    });

    it("takes another week count", () => {
        expect(trendWindow(d(2026, 10, 31), today, 26).start).toEqual(d(2026, 5, 3));
    });
});
