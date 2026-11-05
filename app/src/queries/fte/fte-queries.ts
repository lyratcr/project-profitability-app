import { applyFilters } from "@/lib/filters";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import byCustomerQuery from "./fte-by-customer.dax?raw";
import byProjectOrgMonthQuery from "./fte-by-project-org-month.dax?raw";
import kpisQuery from "./fte-kpis.dax?raw";
import peopleQuery from "./fte-people.dax?raw";

/**
 * P3 FTE Overview (docs/05_app_design.md § 3). FTE = allocation FTE (open item #6, closed 2026-11-04):
 * each person counts 1, split by their share of the week's hours. Every factory takes the page's
 * SUMMARIZECOLUMNS filter arguments; none of P3's visuals is a Vega chart (tables and KPI cards).
 */
export interface FteParams {
    filters?: readonly string[];
}

const CONNECTION = "profitmodel";

// ---------------------------------------------------------------- KPI cards

export const fteKpiColumns = { fte: "[FTE]", fteMoM: "[FTEMoM]", headcount: "[Headcount]" } as const;

const kpiMetadata: ColumnMetadataMap = {
    [fteKpiColumns.fte]: { name: "FTE", displayName: "Allocated FTE (last week)", format: "#,0.0" },
    [fteKpiColumns.fteMoM]: { name: "FTEMoM", displayName: "FTE vs previous month", format: "0.0%" },
    [fteKpiColumns.headcount]: { name: "Headcount", displayName: "Headcount (last week)", format: "#,0" },
};

export function fteKpis({ filters = [] }: FteParams = {}) {
    return { connection: CONNECTION, query: applyFilters(kpisQuery, filters), columnMetadata: kpiMetadata } as const;
}

// ---------------------------------------------------------------- by customer and project

export const fteByCustomerColumns = {
    customer: "fact_profitability_metrics[project_customer]",
    project: "fact_profitability_metrics[project_name]",
    isCustomerTotal: "[IsCustomerTotal]",
    isProjectTotal: "[IsProjectTotal]",
    fte: "[FTE]",
    headcount: "[Headcount]",
} as const;

/** Customers shown by the customer and project matrix (the query's TOPN). */
export const FTE_TOP_CUSTOMERS = 15;

export function fteByCustomer({ filters = [] }: FteParams = {}) {
    return { connection: CONNECTION, query: applyFilters(byCustomerQuery, filters) } as const;
}

// ---------------------------------------------------------------- project org × month

export const fteByProjectOrgMonthColumns = {
    month: "dim_calendar[year_month]",
    monthNumber: "dim_calendar[year_month_number]",
    l1: "fact_profitability_metrics[project_L1]",
    l2: "fact_profitability_metrics[project_L2]",
    l3: "fact_profitability_metrics[project_L3]",
    isL1Total: "[IsL1Total]",
    isL2Total: "[IsL2Total]",
    isL3Total: "[IsL3Total]",
    fte: "[FTE]",
} as const;

/** `filters` must carry the 12-month window (`dateRangeArg(monthWindow(...))`), not the period. */
export function fteByProjectOrgMonth({ filters = [] }: FteParams = {}) {
    return { connection: CONNECTION, query: applyFilters(byProjectOrgMonthQuery, filters) } as const;
}

// ---------------------------------------------------------------- people detail

export const ftePeopleColumns = {
    employee: "[Employee]",
    country: "[Country]",
    hours: "[Hours]",
    timeAllocation: "[TimeAllocation]",
    fte: "[FTE]",
} as const;

const peopleMetadata: ColumnMetadataMap = {
    [ftePeopleColumns.employee]: { name: "Employee", displayName: "Employee" },
    [ftePeopleColumns.country]: { name: "Country", displayName: "Country" },
    [ftePeopleColumns.hours]: { name: "Hours", displayName: "Hours in selection", format: "#,0.0" },
    [ftePeopleColumns.timeAllocation]: { name: "TimeAllocation", displayName: "Time allocation", format: "0.0%" },
    [ftePeopleColumns.fte]: { name: "FTE", displayName: "FTE (last week)", format: "#,0.00" },
};

/** Only run with a customer or project among `filters` (Ion, 2026-11-04). */
export function ftePeople({ filters = [] }: FteParams = {}) {
    return { connection: CONNECTION, query: applyFilters(peopleQuery, filters), columnMetadata: peopleMetadata } as const;
}
