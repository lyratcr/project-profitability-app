import { describe, expect, it } from "vitest";
import { completeWeeksWindow, paceStory, type PaceValues } from "./pace";

const base: PaceValues = { budget: 8616.86, toDate: 6400, left: 2216.86, pace: 150, weeksToEnd: 29.86, needed: 74.25, runout: new Date(2027, 1, 25), weeksBefore: 15.14, planEnd: new Date(2027, 5, 11) };

describe("completeWeeksWindow", () => {
    it("ends last Saturday and spans whole Sunday-Saturday weeks", () => {
        const w = completeWeeksWindow(new Date(2026, 10, 16, 10), 4); // Monday
        expect(w.start).toEqual(new Date(2026, 9, 18));
        expect(w.end).toEqual(new Date(2026, 10, 14));
    });
    it("on a Saturday the current week is still not complete", () => {
        const w = completeWeeksWindow(new Date(2026, 10, 21, 20), 1);
        expect(w.start).toEqual(new Date(2026, 10, 8));
        expect(w.end).toEqual(new Date(2026, 10, 14));
    });
});

describe("paceStory", () => {
    it("reads the model's values (ALK-401-01 on 2026-11-16: runs out early)", () => {
        expect(paceStory(base)).toBe("runs-out-early");
        expect(paceStory({ ...base, weeksBefore: -3 })).toBe("lasts");
    });
    it("has no budget for Fixed Fee projects, and covers ended plans, over budget and no pace", () => {
        expect(paceStory({ ...base, budget: null, left: null, needed: null, runout: null, weeksBefore: null })).toBe("no-budget");
        expect(paceStory({ ...base, weeksToEnd: 0, needed: null, runout: null, weeksBefore: null })).toBe("plan-ended");
        expect(paceStory({ ...base, left: -120, needed: null, runout: null, weeksBefore: null })).toBe("over-budget");
        expect(paceStory({ ...base, pace: null, runout: null, weeksBefore: null })).toBe("no-pace");
    });
});
