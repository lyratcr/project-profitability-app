import { describe, expect, it } from "vitest";
import { thisWeek } from "./weeks";
import { describeFilterContext } from "./filter-context";
import { monthPeriod } from "./filters";
import { PAGES } from "./routes";

const page = (id: string) => PAGES.find((p) => p.id === id)!;
const options = { org: [], countries: [], customers: [], projects: [{ key: "PAR-401-01", name: "PAR-401-01 Project" }] };

describe("describeFilterContext", () => {
    it("lists the page's filters in words", () => {
        expect(describeFilterContext(page("effort"), { period: monthPeriod(2026, 9), week: thisWeek(new Date(2026, 10, 4)), org: {}, country: "Costa Rica" }, options)).toBe(
            "September 2026 · All organizations · Costa Rica · All customers · All projects",
        );
    });

    it("skips filters the page does not apply and names the project", () => {
        expect(describeFilterContext(page("yield"), { period: monthPeriod(2026, 9), week: thisWeek(new Date(2026, 10, 4)), org: {}, country: "Costa Rica", project: "PAR-401-01" }, options)).toBe(
            "September 2026 · All organizations · All customers · PAR-401-01 Project",
        );
    });
    it("shows the organization path", () => {
        expect(describeFilterContext(page("fte"), { period: monthPeriod(2026, 9), week: thisWeek(new Date(2026, 10, 4)), org: { l1: "BPO", l2: "BOS" } }, options)).toBe(
            "September 2026 · BPO › BOS · All countries · All customers · All projects",
        );
    });
});
