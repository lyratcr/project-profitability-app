import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./data-freshness.dax?raw";

/** Raw output column names of data-freshness.dax, as returned by the model. */
export const freshnessColumns = {
    lastSynerionDate: "[Last Synerion Date]",
    lastRevenueDate: "[Last Revenue Date]",
    lastRefresh: "[Last Refresh]",
} as const;

export const columnMetadata: ColumnMetadataMap = {
    [freshnessColumns.lastSynerionDate]: { name: "LastSynerionDate", displayName: "Hours through", format: "yyyy-mm-dd" },
    [freshnessColumns.lastRevenueDate]: { name: "LastRevenueDate", displayName: "Revenue through", format: "yyyy-mm-dd" },
    [freshnessColumns.lastRefresh]: { name: "LastRefresh", displayName: "Model refreshed" },
};

/** Top bar data freshness: last Synerion day, last T&M revenue day, model refresh time. */
export function dataFreshness() {
    return { connection: "profitmodel", query, columnMetadata } as const;
}
