import { applyFilters } from "@/lib/filters";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import byOrgQuery from "./yield-by-org.dax?raw";
import droppedQuery from "./yield-customers-dropped.dax?raw";
import grewQuery from "./yield-customers-grew.dax?raw";
import kpisQuery from "./yield-kpis.dax?raw";

/**
 * P5 Revenue & Capacity Yield (docs/05_app_design.md § 3). Monthly by design: every factory takes the page's
 * SUMMARIZECOLUMNS filter arguments for one month. Revenue per FTE and annualized revenue per FTE are Adan's
 * formulas (#8, closed 2026-11-05) on the project-org allocation FTE.
 */
export interface YieldParams {
    filters?: readonly string[];
}

const CONNECTION = "profitmodel";
const MONEY = "\\$#,0;(\\$#,0);\\$#,0";

export const YIELD_FORMATS = { money: MONEY, fte: "#,0.0", percent: "0.0%" } as const;

// ---------------------------------------------------------------- KPI cards

export const yieldKpiColumns = {
    revenue: "[Revenue]",
    revenueMoM: "[RevenueMoM]",
    fte: "[FTE]",
    revenuePerFte: "[RevenuePerFTE]",
    revenuePerFteMoM: "[RevenuePerFTEMoM]",
    annualized: "[Annualized]",
} as const;

export function yieldKpis({ filters = [] }: YieldParams = {}) {
    return { connection: CONNECTION, query: applyFilters(kpisQuery, filters) } as const;
}

// ---------------------------------------------------------------- by organization

export const yieldByOrgColumns = {
    l1: "dim_hierarchy_master[L1]",
    l2: "dim_hierarchy_master[L2]",
    l3: "dim_hierarchy_master[L3]",
    isL1Total: "[IsL1Total]",
    isL2Total: "[IsL2Total]",
    isL3Total: "[IsL3Total]",
    revenue: "[Revenue]",
    fte: "[FTE]",
    revenuePerFte: "[RevenuePerFTE]",
    annualized: "[Annualized]",
    revenuePerFteMoM: "[RevenuePerFTEMoM]",
} as const;

export function yieldByOrg({ filters = [] }: YieldParams = {}) {
    return { connection: CONNECTION, query: applyFilters(byOrgQuery, filters) } as const;
}

// ---------------------------------------------------------------- customers that grew / dropped

export const yieldCustomerColumns = {
    customer: "fact_revenue_metrics[financial_customer]",
    revenue: "[Revenue]",
    lastMonth: "[LastMonth]",
    change: "[Change]",
} as const;

const customerMetadata: ColumnMetadataMap = {
    [yieldCustomerColumns.customer]: { name: "Customer", displayName: "Customer" },
    [yieldCustomerColumns.revenue]: { name: "Revenue", displayName: "Revenue", format: MONEY },
    [yieldCustomerColumns.lastMonth]: { name: "LastMonth", displayName: "Previous month", format: MONEY },
    [yieldCustomerColumns.change]: { name: "Change", displayName: "Change", format: MONEY },
};

/** Customers ranked in the query (TOPN 10) until the rank measures exist (open item #1). */
export const TOP_CUSTOMER_MOVES = 10;

export function yieldCustomersGrew({ filters = [] }: YieldParams = {}) {
    return { connection: CONNECTION, query: applyFilters(grewQuery, filters), columnMetadata: customerMetadata } as const;
}

export function yieldCustomersDropped({ filters = [] }: YieldParams = {}) {
    return { connection: CONNECTION, query: applyFilters(droppedQuery, filters), columnMetadata: customerMetadata } as const;
}
