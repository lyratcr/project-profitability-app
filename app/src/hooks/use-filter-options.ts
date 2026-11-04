import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import type { FilterOptions } from "@/lib/filters";
import { countryOptions, customerOptions, optionColumns, orgOptions, projectOptions } from "@/queries/filters";

export interface FilterOptionsResult {
    /** Null until all four option lists have loaded. */
    options: FilterOptions | null;
    isLoading: boolean;
    /** First error message, if any list failed. */
    error: string | undefined;
}

function column(table: QueryTable, raw: string): unknown[] {
    const index = table.columns.findIndex((c) => c.name === raw);
    return index < 0 ? [] : table.rows.map((row) => row[index]);
}

const asText = (values: unknown[]) => values.filter((v): v is string => typeof v === "string" && v !== "");

/** Loads the whitelist of filter values from the model (cached for the session). */
export function useFilterOptions(): FilterOptionsResult {
    const org = orgOptions();
    const country = countryOptions();
    const customer = customerOptions();
    const project = projectOptions();
    const orgQ = useSemanticModelQuery({ connection: org.connection, query: org.query });
    const countryQ = useSemanticModelQuery({ connection: country.connection, query: country.query });
    const customerQ = useSemanticModelQuery({ connection: customer.connection, query: customer.query });
    const projectQ = useSemanticModelQuery({ connection: project.connection, query: project.query });

    const all = [orgQ, countryQ, customerQ, projectQ];
    const failed = all.find((q) => q.data?.status === "error");
    const error = failed?.data?.status === "error" ? failed.data.error.message : undefined;
    const isLoading = all.some((q) => q.isLoading || q.data === undefined) && error === undefined;

    if (
        orgQ.data?.status !== "success" ||
        countryQ.data?.status !== "success" ||
        customerQ.data?.status !== "success" ||
        projectQ.data?.status !== "success"
    ) {
        return { options: null, isLoading, error };
    }

    const l1 = column(orgQ.data.table, optionColumns.l1);
    const l2 = column(orgQ.data.table, optionColumns.l2);
    const l3 = column(orgQ.data.table, optionColumns.l3);
    const keys = column(projectQ.data.table, optionColumns.projectKey);
    const names = column(projectQ.data.table, optionColumns.projectName);

    return {
        options: {
            org: l1
                .map((a, i) => [a, l2[i], l3[i]] as const)
                .filter((t): t is readonly [string, string, string] => t.every((v) => typeof v === "string")),
            countries: asText(column(countryQ.data.table, optionColumns.country)),
            customers: asText(column(customerQ.data.table, optionColumns.customer)),
            projects: keys
                .map((key, i) => ({ key, name: typeof names[i] === "string" ? (names[i] as string) : null }))
                .filter((p): p is { key: string; name: string | null } => typeof p.key === "string" && p.key !== ""),
        },
        isLoading: false,
        error: undefined,
    };
}
