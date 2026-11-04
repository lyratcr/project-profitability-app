import { describe, expect, it } from "vitest";
import { ORG_OPTION_MARKERS } from "@/lib/filters";
import { countryOptions, customerOptions, optionColumns, orgOptions, projectOptions } from "./filter-options";

describe("filter option query factories", () => {
    const factories = [orgOptions(), countryOptions(), customerOptions(), projectOptions()];

    it("target profitmodel with one EVALUATE each", () => {
        for (const f of factories) {
            expect(f.connection).toBe("profitmodel");
            expect(f.query.match(/\bEVALUATE\b/g)).toHaveLength(1);
        }
    });

    it("avoid dim_project until open item #1 is fixed", () => {
        for (const f of factories) {
            const code = f.query.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
            expect(code).not.toMatch(/dim_project/);
        }
    });

    it("key metadata by the raw output columns with bracket-free names", () => {
        const all = Object.assign({}, ...factories.map((f) => f.columnMetadata));
        for (const raw of Object.values(optionColumns)) {
            expect(all[raw]).toBeDefined();
            expect(all[raw].name).not.toMatch(/[[\].]/);
        }
    });

    it("narrow customers and projects to the selected org and leave no markers", () => {
        for (const f of [customerOptions({ l1: "BPO" }), projectOptions({ l1: "BPO" })]) {
            expect(f.query).toContain('TREATAS ( { "BPO" }, fact_profitability_metrics[project_L1] )');
            expect(f.query).toContain('TREATAS ( { "BPO" }, fact_revenue_metrics[financial_L1] )');
        }
        for (const f of [customerOptions(), projectOptions()]) {
            expect(f.query).not.toContain(ORG_OPTION_MARKERS.hours.marker);
            expect(f.query).not.toContain(ORG_OPTION_MARKERS.revenue.marker);
            expect(f.query).not.toContain("fact_profitability_metrics[project_L1] )");
            expect(f.query).not.toContain("fact_revenue_metrics[financial_L1] )");
        }
    });
});
