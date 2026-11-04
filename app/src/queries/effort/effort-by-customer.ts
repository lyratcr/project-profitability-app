import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { buildEffortQuery, EFFORT_CONNECTION, type EffortParams } from "./effort-params";
import byCustomerQuery from "./effort-by-customer.dax?raw";

// P1 hours by customer and project.

export const byCustomerColumns = {
    customer: "fact_profitability_metrics[project_customer]",
    project: "fact_profitability_metrics[project_name]",
    task: "fact_profitability_metrics[task_name]",
    isCustomerTotal: "[IsCustomerTotal]",
    isProjectTotal: "[IsProjectTotal]",
    isTaskTotal: "[IsTaskTotal]",
    hours: "[Hours]",
    share: "[Share]",
} as const;

const byCustomerMetadata: ColumnMetadataMap = {
    [byCustomerColumns.customer]: { name: "Customer", displayName: "Customer" },
    [byCustomerColumns.project]: { name: "Project", displayName: "Project" },
    [byCustomerColumns.task]: { name: "Task", displayName: "Task" },
    [byCustomerColumns.hours]: { name: "Hours", displayName: "Hours", format: "#,0" },
    [byCustomerColumns.share]: { name: "Share", displayName: "Share", format: "0.0%" },
};

/** Customers shown by the customer and project matrix (the query's TOPN). */
export const TOP_CUSTOMERS = 15;

export function effortByCustomer(params: EffortParams = {}) {
    return { connection: EFFORT_CONNECTION, query: buildEffortQuery(byCustomerQuery, params), columnMetadata: byCustomerMetadata } as const;
}
