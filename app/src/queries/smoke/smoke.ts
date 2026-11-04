import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./smoke.dax?raw";

/** Raw output column names of smoke.dax, as returned by the model. */
export const smokeColumns = {
    hours: "[Synerion Hours]",
    revenue: "[Actual Revenue]",
    lastRefresh: "[Last Refresh]",
} as const;

export const columnMetadata: ColumnMetadataMap = {
    [smokeColumns.hours]: {
        name: "SynerionHours",
        displayName: "Synerion hours",
        format: "#,##0",
    },
    [smokeColumns.revenue]: {
        name: "ActualRevenue",
        displayName: "Actual revenue",
        format: "$#,##0",
    },
    [smokeColumns.lastRefresh]: {
        name: "LastRefresh",
        displayName: "Model refresh",
    },
};

/** Phase 0 smoke check: September 2026 hours and actual revenue (KPI cards, no chart). */
export function smoke() {
    return { connection: "profitmodel", query, columnMetadata } as const;
}
