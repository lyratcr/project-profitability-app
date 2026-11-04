import { describe, expect, it } from "vitest";
import { columnMetadata, dataFreshness, freshnessColumns } from "./data-freshness";

describe("dataFreshness query factory", () => {
    it("targets profitmodel and uses the _app data-health measures", () => {
        const { connection, query } = dataFreshness();
        expect(connection).toBe("profitmodel");
        expect(query).toContain("[Last Synerion Date_app]");
        expect(query).toContain("[Last Revenue Date_app]");
        expect(query).toContain("[Last Refresh Date]");
        expect(query).not.toMatch(/TODAY\s*\(/);
    });

    it("keys metadata by every raw output column with bracket-free names", () => {
        for (const raw of Object.values(freshnessColumns)) {
            expect(columnMetadata[raw]).toBeDefined();
            expect(columnMetadata[raw].name).not.toMatch(/[[\].]/);
        }
    });
});
