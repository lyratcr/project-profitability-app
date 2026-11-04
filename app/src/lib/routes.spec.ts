import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE, PAGES, pageHref, parseHash } from "./routes";

describe("routes", () => {
    it("defines the six pages of the design with unique paths", () => {
        expect(PAGES.map((p) => p.path)).toEqual(["/effort", "/headcount", "/fte", "/flows", "/yield", "/projects"]);
    });

    it("resolves a known hash to its page", () => {
        expect(parseHash("#/flows").page.id).toBe("flows");
        expect(parseHash("#/Projects/").page.id).toBe("projects");
    });

    it("falls back to the default page for empty or unknown hashes", () => {
        expect(parseHash("").page).toBe(DEFAULT_PAGE);
        expect(parseHash("#/nope").page).toBe(DEFAULT_PAGE);
    });

    it("keeps page state from the hash query", () => {
        const route = parseHash("#/projects?project=PAR-401-01&week=2026-10-27");
        expect(route.page.id).toBe("projects");
        expect(route.params.get("project")).toBe("PAR-401-01");
        expect(route.params.get("week")).toBe("2026-10-27");
    });

    it("builds hrefs with and without state", () => {
        const yieldPage = PAGES.find((p) => p.id === "yield")!;
        expect(pageHref(yieldPage)).toBe("#/yield");
        expect(pageHref(yieldPage, new URLSearchParams({ month: "2026-09" }))).toBe("#/yield?month=2026-09");
    });

    it("configures filters per page (organization everywhere but Projects, monthly Yield)", () => {
        for (const p of PAGES) expect(p.filters.includes("org")).toBe(p.id !== "projects");
        const yieldPage = PAGES.find((p) => p.id === "yield")!;
        expect(yieldPage.periodKinds).toEqual(["month"]);
        expect(yieldPage.filters).not.toContain("country");
    });
});
