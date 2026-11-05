import { applyFilters, daxString } from "@/lib/filters";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import kpisQuery from "./flows-kpis.dax?raw";
import matrixQuery from "./flows-matrix.dax?raw";
import treeQuery from "./flows-tree.dax?raw";

/**
 * P4 Intercompany & Cross-Charge (docs/05_app_design.md § 3). Hours use the employee org (Ion, 2026-11-04).
 * Two analyses replace the report's "Analysis Type" field parameter: intercompany (countries) and cross charge
 * (L1 areas). Column names below are a whitelist: only these reach the DAX templates.
 */
export type FlowAnalysis = "intercompany" | "cross";

export const FLOW_ANALYSIS_PARAM = "analysis";

export function readFlowAnalysis(params: URLSearchParams): FlowAnalysis {
    return params.get(FLOW_ANALYSIS_PARAM) === "cross" ? "cross" : "intercompany";
}

export function writeFlowAnalysis(params: URLSearchParams, analysis: FlowAnalysis): URLSearchParams {
    const next = new URLSearchParams(params);
    if (analysis === "intercompany") next.delete(FLOW_ANALYSIS_PARAM);
    else next.set(FLOW_ANALYSIS_PARAM, analysis);
    return next;
}

export interface TreeLevel {
    id: "origin" | "destination" | "customer" | "project";
    label: string;
    column: string;
}

export const FLOW_ANALYSES: Record<FlowAnalysis, { label: string; flow: string; levels: readonly TreeLevel[] }> = {
    intercompany: {
        label: "Intercompany",
        flow: "fact_profitability_metrics[intercompany_flow]",
        levels: [
            { id: "origin", label: "Employee country", column: "fact_profitability_metrics[employee_country]" },
            { id: "destination", label: "Project country", column: "fact_profitability_metrics[project_country]" },
            { id: "customer", label: "Customer", column: "fact_profitability_metrics[project_customer]" },
            { id: "project", label: "Project", column: "fact_profitability_metrics[project_name]" },
        ],
    },
    cross: {
        label: "Cross charge",
        flow: "fact_profitability_metrics[cross_charge_flow]",
        levels: [
            // The master hierarchy, not fact[employee_L1]: the employee-org measure's TREATAS replaces a filter on the
            // fact's employee_L1, so under an org filter every L1 showed the org's total (fix 2026-11-04).
            { id: "origin", label: "Employee L1", column: "dim_hierarchy_master[L1]" },
            { id: "destination", label: "Project L1", column: "fact_profitability_metrics[project_L1]" },
            { id: "customer", label: "Customer", column: "fact_profitability_metrics[project_customer]" },
            { id: "project", label: "Project", column: "fact_profitability_metrics[project_name]" },
        ],
    },
};

const CONNECTION = "profitmodel";

function replaceOnce(query: string, token: string, value: string): string {
    const count = query.split(token).length - 1;
    if (count !== 1) throw new Error(`Query must contain exactly one ${token} token (found ${count}).`);
    return query.replace(token, value);
}

// ---------------------------------------------------------------- KPI cards

export const flowKpiColumns = {
    hours: "[Hours]",
    intercompanyShare: "[IntercompanyShare]",
    crossChargeShare: "[CrossChargeShare]",
    received: "[Received]",
    lent: "[Lent]",
    net: "[Net]",
} as const;

export function flowsKpis({ filters = [] }: { filters?: readonly string[] } = {}) {
    return { connection: CONNECTION, query: applyFilters(kpisQuery, filters) } as const;
}

// ---------------------------------------------------------------- matrix

export const flowMatrixColumns = {
    month: "dim_calendar[year_month]",
    monthNumber: "dim_calendar[year_month_number]",
    isMonthTotal: "[IsMonthTotal]",
    customer: "fact_profitability_metrics[project_customer]",
    project: "fact_profitability_metrics[project_name]",
    employee: "fact_profitability_metrics[employee_full_name]",
    employeeId: "fact_profitability_metrics[ukg_employee_id]",
    isFlowTotal: "[IsFlowTotal]",
    isCustomerTotal: "[IsCustomerTotal]",
    isProjectTotal: "[IsProjectTotal]",
    isEmployeeTotal: "[IsEmployeeTotal]",
    hours: "[Hours]",
} as const;

const EMPLOYEE_LEVEL = `,
        ROLLUPGROUP ( ${flowMatrixColumns.employee}, ${flowMatrixColumns.employeeId} ), "IsEmployeeTotal"`;

export interface FlowsMatrixParams {
    analysis: FlowAnalysis;
    filters?: readonly string[];
    /** Adds the employee level; only with a customer or project selected. */
    withEmployees?: boolean;
}

export function flowsMatrix({ analysis, filters = [], withEmployees = false }: FlowsMatrixParams) {
    const flow = FLOW_ANALYSES[analysis].flow;
    let query = replaceOnce(matrixQuery, "@FLOW@", flow);
    query = replaceOnce(query, "/* @employee */", withEmployees ? EMPLOYEE_LEVEL : "");
    return { connection: CONNECTION, query: applyFilters(query, filters), flowColumn: flow } as const;
}

// ---------------------------------------------------------------- decomposition tree

export interface FlowsTreeParams {
    analysis: FlowAnalysis;
    /** Index into FLOW_ANALYSES[analysis].levels. */
    level: number;
    filters?: readonly string[];
    /** Values picked in the levels before `level`, in order (from earlier query results). */
    picks?: readonly string[];
}

export const flowTreeColumns = { hours: "[Hours]" } as const;

export function flowsTree({ analysis, level, filters = [], picks = [] }: FlowsTreeParams) {
    const levels = FLOW_ANALYSES[analysis].levels;
    if (level < 0 || level >= levels.length || picks.length !== level) throw new Error("Tree level and picks don't match.");
    const pickArgs = picks.map((value, i) => `KEEPFILTERS ( TREATAS ( { ${daxString(value)} }, ${levels[i].column} ) )`);
    const query = replaceOnce(treeQuery, "@LEVEL@", levels[level].column);
    const columnMetadata: ColumnMetadataMap = {
        [levels[level].column]: { name: "Item", displayName: levels[level].label },
        [flowTreeColumns.hours]: { name: "Hours", displayName: "Hours", format: "#,0" },
    };
    return { connection: CONNECTION, query: applyFilters(query, [...filters, ...pickArgs]), column: levels[level].column, columnMetadata } as const;
}
