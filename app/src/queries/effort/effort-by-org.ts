import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { buildEffortQuery, EFFORT_CONNECTION, type EffortParams } from "./effort-params";
import byOrgQuery from "./effort-by-org.dax?raw";

// P1 hours by organization.

export const byOrgColumns = {
    l1: "dim_hierarchy_master[L1]",
    l2: "dim_hierarchy_master[L2]",
    l3: "dim_hierarchy_master[L3]",
    isL1Total: "[IsL1Total]",
    isL2Total: "[IsL2Total]",
    isL3Total: "[IsL3Total]",
    hours: "[Hours]",
    share: "[Share]",
} as const;

const byOrgMetadata: ColumnMetadataMap = {
    [byOrgColumns.l1]: { name: "L1", displayName: "L1" },
    [byOrgColumns.l2]: { name: "L2", displayName: "L2" },
    [byOrgColumns.l3]: { name: "L3", displayName: "L3" },
    [byOrgColumns.hours]: { name: "Hours", displayName: "Hours", format: "#,0" },
    [byOrgColumns.share]: { name: "Share", displayName: "Share", format: "0.0%" },
};

export function effortByOrg(params: EffortParams = {}) {
    return { connection: EFFORT_CONNECTION, query: buildEffortQuery(byOrgQuery, params), columnMetadata: byOrgMetadata } as const;
}
