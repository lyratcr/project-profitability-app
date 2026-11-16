import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { readOrg, type FilterOptions } from "@/lib/filters";
import { countryOptions, customerOptions, optionColumns, orgOptions, projectOptions } from "@/queries/filters";

export interface FilterOptionsResult {
    /** Null until every option list has loaded once. */
    options: FilterOptions | null;
    /** True while the customer or project list reloads for a new org or customer (old values still shown). */
    customersLoading: boolean;
    projectsLoading: boolean;
    isLoading: boolean;
    /** First error message, if any list failed. */
    error: string | undefined;
}

function column(table: QueryTable, raw: string): unknown[] {
    const index = table.columns.findIndex((c) => c.name === raw);
    return index < 0 ? [] : table.rows.map((row) => row[index]);
}

const asText = (values: unknown[]) => values.filter((v): v is string => typeof v === "string" && v !== "");

/**
 * Loads the whitelist of filter values from the model (cached for the session). When the page applies
 * the organization filter, the customer and project lists are narrowed to the selected L1 > L2 > L3
 * (the project's org); when it applies the customer filter, the project list is also narrowed to the
 * selected customer. While a narrowed list reloads, useSemanticModelQuery keeps the previous result and
 * the `*Loading` flags tell the filter bar to disable that list.
 */
export function useFilterOptions(params: URLSearchParams, appliesOrg: boolean, appliesCustomer: boolean): FilterOptionsResult {
    const org = orgOptions();
    const country = countryOptions();
    const orgQ = useSemanticModelQuery({ connection: org.connection, query: org.query });
    const countryQ = useSemanticModelQuery({ connection: country.connection, query: country.query });

    const orgRows: FilterOptions["org"] =
        orgQ.data?.status === "success"
            ? (() => {
                  const l1 = column(orgQ.data.table, optionColumns.l1);
                  const l2 = column(orgQ.data.table, optionColumns.l2);
                  const l3 = column(orgQ.data.table, optionColumns.l3);
                  return l1
                      .map((a, i) => [a, l2[i], l3[i]] as const)
                      .filter((t): t is readonly [string, string, string] => t.every((v) => typeof v === "string"));
              })()
            : [];
    const selectedOrg = appliesOrg ? readOrg(params, orgRows) : {};

    const customer = customerOptions(selectedOrg);
    const customerQ = useSemanticModelQuery({ connection: customer.connection, query: customer.query });
    const customers = customerQ.data?.status === "success" ? asText(column(customerQ.data.table, optionColumns.customer)) : null;
    const requestedCustomer = params.get("customer");
    const selectedCustomer =
        appliesCustomer && requestedCustomer !== null && customers?.includes(requestedCustomer) ? requestedCustomer : undefined;

    const project = projectOptions(selectedOrg, selectedCustomer);
    const projectQ = useSemanticModelQuery({ connection: project.connection, query: project.query });

    const all = [orgQ, countryQ, customerQ, projectQ];
    const failed = all.find((q) => q.data?.status === "error");
    const error = failed?.data?.status === "error" ? failed.data.error.message : undefined;
    const isLoading = all.some((q) => q.isLoading || q.data === undefined) && error === undefined;

    const customersLoading = customerQ.isLoading;
    const projectsLoading = projectQ.isLoading || customerQ.isLoading;

    if (
        orgQ.data?.status !== "success" ||
        countryQ.data?.status !== "success" ||
        customers === null ||
        projectQ.data?.status !== "success"
    ) {
        return { options: null, isLoading, error, customersLoading, projectsLoading };
    }

    const keys = column(projectQ.data.table, optionColumns.projectKey);
    const names = column(projectQ.data.table, optionColumns.projectName);

    return {
        options: {
            org: orgRows,
            countries: asText(column(countryQ.data.table, optionColumns.country)),
            customers,
            projects: keys
                .map((key, i) => ({ key, name: typeof names[i] === "string" ? (names[i] as string) : null }))
                .filter((p): p is { key: string; name: string | null } => typeof p.key === "string" && p.key !== ""),
        },
        isLoading,
        error,
        customersLoading,
        projectsLoading,
    };
}
