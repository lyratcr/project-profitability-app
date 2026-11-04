import { describe, expect, it } from "vitest";
import { presentChange } from "./change";

describe("presentChange", () => {
    it("colors an increase as good when more is better (hours, revenue)", () => {
        expect(presentChange(0.044, "increase")).toEqual({ tone: "positive", color: "var(--color-success)", icon: "▲", direction: "up" });
        expect(presentChange(-0.027, "increase")).toMatchObject({ tone: "negative", color: "var(--color-destructive)", icon: "▼" });
    });

    it("colors a decrease as good when less is better", () => {
        expect(presentChange(-0.1, "decrease").tone).toBe("positive");
        expect(presentChange(0.1, "decrease").tone).toBe("negative");
    });

    it("stays neutral for no change, blanks and neutral KPIs", () => {
        expect(presentChange(0, "increase")).toMatchObject({ tone: "neutral", direction: "flat" });
        expect(presentChange(null, "increase")).toMatchObject({ tone: "neutral", direction: "none", icon: "" });
        expect(presentChange(0.2, "neither")).toMatchObject({ tone: "neutral", direction: "up" });
    });
});
