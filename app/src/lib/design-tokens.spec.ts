import { afterEach, describe, expect, it } from "vitest";
import { readTokens } from "./design-tokens";

describe("readTokens", () => {
    afterEach(() => {
        document.documentElement.style.removeProperty("--yellow-300");
        document.documentElement.style.removeProperty("--chart-2");
    });

    it("reads design-system custom properties from the root", () => {
        document.documentElement.style.setProperty("--yellow-300", " #ffcb05");
        document.documentElement.style.setProperty("--chart-2", "#14b1e7");
        expect(readTokens(["yellow-300", "chart-2"])).toEqual(["#ffcb05", "#14b1e7"]);
    });

    it("returns null when a token is missing, so callers keep the theme colours", () => {
        document.documentElement.style.setProperty("--yellow-300", "#ffcb05");
        expect(readTokens(["yellow-300", "yellow-100"])).toBeNull();
        expect(readTokens(["yellow-300"], null)).toBeNull();
    });
});
