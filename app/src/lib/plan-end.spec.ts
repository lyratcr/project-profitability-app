import { describe, expect, it } from "vitest";
import { describeDaysLeft, parseModelDate, planEndStatus } from "./plan-end";

describe("plan end date", () => {
    it("reads the model's date as a local calendar day", () => {
        const d = parseModelDate("2028-06-01T00:00:00.000");
        expect(d).toEqual(new Date(2028, 5, 1));
        expect(parseModelDate("2026-02-30T00:00:00.000")).toBeNull();
        expect(parseModelDate(null)).toBeNull();
        expect(parseModelDate(46000)).toBeNull();
    });

    it("counts days from the viewer's local date and colours < 30 red, < 90 amber", () => {
        const today = new Date(2026, 10, 6, 18, 30);
        expect(planEndStatus(new Date(2028, 5, 1), today)).toEqual({ daysLeft: 573, tone: "positive" });
        expect(planEndStatus(new Date(2027, 0, 30), today)).toEqual({ daysLeft: 85, tone: "warning" });
        expect(planEndStatus(new Date(2027, 1, 4), today)).toEqual({ daysLeft: 90, tone: "positive" });
        expect(planEndStatus(new Date(2026, 11, 5), today)).toEqual({ daysLeft: 29, tone: "negative" });
        expect(planEndStatus(new Date(2026, 10, 1), today)).toEqual({ daysLeft: -5, tone: "negative" });
    });

    it("is not shifted by a daylight-saving change between the dates", () => {
        // US DST ends 2026-11-01: still exactly 7 calendar days.
        expect(planEndStatus(new Date(2026, 10, 3), new Date(2026, 9, 27)).daysLeft).toBe(7);
    });

    it("describes the days left", () => {
        expect(describeDaysLeft(573)).toBe("573 days left");
        expect(describeDaysLeft(1)).toBe("1 day left");
        expect(describeDaysLeft(0)).toBe("Ends today");
        expect(describeDaysLeft(-5)).toBe("Ended 5 days ago");
    });
});
