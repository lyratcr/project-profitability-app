import { describe, expect, it } from "vitest";
import { describeFilterContext } from "./filter-context";
import { monthPeriod } from "./filters";
import { PAGES } from "./routes";

const page = (id: string) => PAGES.find((p) => p.id === id)!;
const options = { org: [], countries: [], customers: [], projects: [{ key: "PAR-401-01", name: "PAR-401-01 Project" }] };

describe("describeFilterContext", () => {
    it("lists the page's filters in words", () => {
        expect(describeFilterContext(page("effort"), { period: monthPeriod(2026, 9), org: {}, country: "Costa Rica" }, options)).toBe(
            "September 2026 · Costa Rica · All customers · All projects",
        );
    });

    it("skips filters the page does not apply and names the project", () => {
        expect(describeFilterContext(page("yield"), { period: monthPeriod(2026, 9), org: {}, country: "Costa Rica", project: "PAR-401-01" }, options)).toBe(
            "September 2026 · All customers · PAR-401-01 Project",
        );
    });
});
