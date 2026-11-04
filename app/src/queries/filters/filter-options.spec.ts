import { describe, expect, it } from "vitest";
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
});
