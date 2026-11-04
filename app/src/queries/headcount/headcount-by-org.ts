import { applyFilters } from "@/lib/filters";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./headcount-by-org.dax?raw";

/** P2 headcount by organization (employee org, master hierarchy). */
export const headcountByOrgColumns = {
    l1: "dim_hierarchy_master[L1]",
    l2: "dim_hierarchy_master[L2]",
    l3: "dim_hierarchy_master[L3]",
    isL1Total: "[IsL1Total]",
    isL2Total: "[IsL2Total]",
    isL3Total: "[IsL3Total]",
    headcount: "[Headcount]",
    people: "[People]",
} as const;

const columnMetadata: ColumnMetadataMap = {
    [headcountByOrgColumns.l1]: { name: "L1", displayName: "L1" },
    [headcountByOrgColumns.l2]: { name: "L2", displayName: "L2" },
    [headcountByOrgColumns.l3]: { name: "L3", displayName: "L3" },
    [headcountByOrgColumns.headcount]: { name: "Headcount", displayName: "Headcount (last week)", format: "#,0" },
    [headcountByOrgColumns.people]: { name: "People", displayName: "People with hours", format: "#,0" },
};

export function headcountByOrg({ filters = [] }: { filters?: readonly string[] } = {}) {
    return { connection: "profitmodel", query: applyFilters(query, filters), columnMetadata } as const;
}
