import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { buildEffortQuery, EFFORT_CONNECTION, type EffortParams } from "./effort-params";
import shrinkageSpecTemplate from "./effort-shrinkage.json";
import shrinkageQuery from "./effort-shrinkage.dax?raw";

// P1 shrinkage.

export const shrinkageColumns = {
    subtask: "fact_profitability_metrics[subtask_category]",
    hours: "[Hours]",
    share: "[Share]",
} as const;

const shrinkageMetadata: ColumnMetadataMap = {
    [shrinkageColumns.subtask]: { name: "Subtask", displayName: "Subtask code" },
    [shrinkageColumns.hours]: { name: "Hours", displayName: "Hours", format: "#,0" },
    [shrinkageColumns.share]: { name: "Share", displayName: "Share of hours", format: "0.0%" },
};

export function effortShrinkage(params: EffortParams = {}) {
    return {
        connection: EFFORT_CONNECTION,
        query: buildEffortQuery(shrinkageQuery, params),
        columnMetadata: shrinkageMetadata,
        vegaLiteSpec: shrinkageSpecTemplate as VisualizationSpec,
    } as const;
}
