import type { ColumnMetadataMap } from "@/lib/to-data-table";
import countryQuery from "./country-options.dax?raw";
import customerQuery from "./customer-options.dax?raw";
import orgQuery from "./org-options.dax?raw";
import projectQuery from "./project-options.dax?raw";

const connection = "profitmodel" as const;

/** Raw output column names, as returned by the model. */
export const optionColumns = {
    l1: "dim_hierarchy_master[L1]",
    l2: "dim_hierarchy_master[L2]",
    l3: "dim_hierarchy_master[L3]",
    country: "fact_profitability_metrics[employee_country]",
    customer: "fact_profitability_metrics[project_customer]",
    projectKey: "fact_profitability_metrics[project_key]",
    projectName: "[Project Name]",
} as const;

const meta = (raw: string, name: string, displayName: string): ColumnMetadataMap => ({ [raw]: { name, displayName } });

export function orgOptions() {
    return {
        connection,
        query: orgQuery,
        columnMetadata: {
            ...meta(optionColumns.l1, "L1", "L1"),
            ...meta(optionColumns.l2, "L2", "L2"),
            ...meta(optionColumns.l3, "L3", "L3"),
        },
    } as const;
}

export function countryOptions() {
    return { connection, query: countryQuery, columnMetadata: meta(optionColumns.country, "Country", "Employee country") } as const;
}

export function customerOptions() {
    return { connection, query: customerQuery, columnMetadata: meta(optionColumns.customer, "Customer", "Customer") } as const;
}

export function projectOptions() {
    return {
        connection,
        query: projectQuery,
        columnMetadata: {
            ...meta(optionColumns.projectKey, "ProjectKey", "Project key"),
            ...meta(optionColumns.projectName, "ProjectName", "Project"),
        },
    } as const;
}
