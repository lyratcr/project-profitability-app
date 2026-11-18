import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE, PAGES, pageHref, parseHash } from "./routes";

// PM app (Ion, 2026-11-16): Project Health (Project Progress page) is the home page; Resource Utilization and Resource Allocation (2026-11-18) are placeholder tabs.
describe("routes", () => {
    it("has Project Progress as home page, then Utilization and Allocation tabs", () => {
        expect(PAGES.map((p) => p.path)).toEqual(["/projects", "/utilization", "/allocation"]);
        expect(DEFAULT_PAGE.id).toBe("projects");
        expect(parseHash("#/utilization").page.id).toBe("utilization");
        expect(parseHash("#/allocation").page.id).toBe("allocation");
    });

    it("shows no filters on the Utilization and Allocation placeholders", () => {
        expect(PAGES.find((p) => p.id === "utilization")!.filters).toEqual([]);
        expect(PAGES.find((p) => p.id === "allocation")!.filters).toEqual([]);
    });

    it("resolves the page hash, any case or trailing slash", () => {
        expect(parseHash("#/Projects/").page.id).toBe("projects");
    });

    it("falls back to Project Progress for empty or unknown hashes (old links to executive pages included)", () => {
        expect(parseHash("").page).toBe(DEFAULT_PAGE);
        expect(parseHash("#/effort").page).toBe(DEFAULT_PAGE);
    });

    it("keeps page state from the hash query", () => {
        const route = parseHash("#/projects?project=PAR-401-01&week=2026-10-27");
        expect(route.page.id).toBe("projects");
        expect(route.params.get("project")).toBe("PAR-401-01");
        expect(route.params.get("week")).toBe("2026-10-27");
    });

    it("builds hrefs with and without state", () => {
        expect(pageHref(DEFAULT_PAGE)).toBe("#/projects");
        expect(pageHref(DEFAULT_PAGE, new URLSearchParams({ project: "GOT-401-05" }))).toBe("#/projects?project=GOT-401-05");
    });

    it("gives Project Health the org, customer, project manager and project filters, no week (Ion, 2026-11-16)", () => {
        expect(DEFAULT_PAGE.filters).toEqual(["org", "customer", "pm", "project"]);
        expect(DEFAULT_PAGE.periodKinds).toEqual([]);
    });
});
