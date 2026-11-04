import { applyFilters } from "@/lib/filters";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./headcount-kpis.dax?raw";

/** P2 KPI cards. `filters` are the page's SUMMARIZECOLUMNS filter arguments (`filterArgs`). */
export const headcountKpiColumns = {
    headcount: "[Headcount]",
    headcountMoM: "[HeadcountMoM]",
    people: "[People]",
    contractorsShare: "[ContractorsShare]",
} as const;

const columnMetadata: ColumnMetadataMap = {
    [headcountKpiColumns.headcount]: { name: "Headcount", displayName: "Headcount (last week)", format: "#,0" },
    [headcountKpiColumns.headcountMoM]: { name: "HeadcountMoM", displayName: "Headcount vs previous month", format: "0.0%" },
    [headcountKpiColumns.people]: { name: "People", displayName: "People with hours", format: "#,0" },
    [headcountKpiColumns.contractorsShare]: { name: "ContractorsShare", displayName: "Contractors share", format: "0.0%" },
};

export function headcountKpis({ filters = [] }: { filters?: readonly string[] } = {}) {
    return { connection: "profitmodel", query: applyFilters(query, filters), columnMetadata } as const;
}
