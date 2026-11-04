import { describe, expect, it } from "vitest";
import { columnMetadata, smoke, smokeColumns } from "./smoke";

describe("smoke query factory", () => {
    it("targets the profitmodel connector", () => {
        expect(smoke().connection).toBe("profitmodel");
    });

    it("queries September 2026 with the original measures (Actual-only revenue)", () => {
        const query = smoke()
            .query.split("\n")
            .filter((line) => !line.trim().startsWith("//"))
            .join("\n");
        expect(query).toContain("DATE ( 2026, 9, 1 )");
        expect(query).toContain("DATE ( 2026, 9, 30 )");
        expect(query).toContain("[Total Worked Hours]");
        expect(query).toContain("[Total Revenue (Master Hierarchy)]");
        expect(query).not.toMatch(/\[Total Revenue\]/);
    });

    it("keys metadata by every raw output column with bracket-free names", () => {
        for (const raw of Object.values(smokeColumns)) {
            const def = columnMetadata[raw];
            expect(def).toBeDefined();
            expect(def.name).not.toMatch(/[[\].]/);
        }
    });
});
