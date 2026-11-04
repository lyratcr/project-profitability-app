import { describe, expect, it } from "vitest";
import { formatDay, isHoursStale, lastCompleteWeekEnd, parseModelDate } from "./freshness";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe("parseModelDate", () => {
    it("reads the model's ISO string as a local calendar day", () => {
        const date = parseModelDate("2026-11-03T00:00:00.000");
        expect(date).toEqual(day(2026, 11, 3));
    });

    it("returns null for missing or non-date values", () => {
        expect(parseModelDate(null)).toBeNull();
        expect(parseModelDate(undefined)).toBeNull();
        expect(parseModelDate(45000)).toBeNull();
        expect(parseModelDate("11/04/2026 09:14 EST")).toBeNull();
    });
});

describe("lastCompleteWeekEnd", () => {
    // Nov 1, 2026 is a Sunday (dim_calendar); weeks run Sunday–Saturday.
    it("is yesterday on a Sunday", () => {
        expect(lastCompleteWeekEnd(day(2026, 11, 8))).toEqual(day(2026, 11, 7));
    });

    it("is the previous Saturday mid-week", () => {
        expect(lastCompleteWeekEnd(day(2026, 11, 4))).toEqual(day(2026, 10, 31));
        expect(lastCompleteWeekEnd(day(2026, 11, 2))).toEqual(day(2026, 10, 31));
    });

    it("is a week back on a Saturday (the current week is not complete)", () => {
        expect(lastCompleteWeekEnd(day(2026, 11, 7))).toEqual(day(2026, 10, 31));
    });

    it("ignores the time of day", () => {
        expect(lastCompleteWeekEnd(new Date(2026, 10, 8, 23, 59))).toEqual(day(2026, 11, 7));
    });
});

describe("isHoursStale", () => {
    it("is not stale when hours reach the last complete week's Saturday or later", () => {
        expect(isHoursStale(day(2026, 11, 3), day(2026, 11, 4))).toBe(false);
        expect(isHoursStale(day(2026, 10, 31), day(2026, 11, 4))).toBe(false);
    });

    it("is stale when the last loaded day is before that Saturday", () => {
        expect(isHoursStale(day(2026, 10, 17), day(2026, 11, 4))).toBe(true);
        expect(isHoursStale(day(2026, 10, 30), day(2026, 11, 2))).toBe(true);
    });

    it("does not warn without a date", () => {
        expect(isHoursStale(null, day(2026, 11, 4))).toBe(false);
    });
});

describe("formatDay", () => {
    it("formats a day and shows an em dash for null", () => {
        expect(formatDay(day(2026, 11, 3))).toBe("Nov 3, 2026");
        expect(formatDay(null)).toBe("—");
    });
});
