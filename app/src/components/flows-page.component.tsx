import { useMemo, type ReactElement } from "react";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { describeFilterContext } from "@/lib/filter-context";
import { describePeriod, filterArgs, type FilterKey, type FilterOptions, type FilterState } from "@/lib/filters";
import type { MatrixSpec } from "@/lib/matrix";
import { numberCell } from "@/lib/query-table";
import type { PageDef } from "@/lib/routes";
import { FLOW_ANALYSES, flowKpiColumns, flowMatrixColumns, flowsKpis, flowsMatrix, type FlowAnalysis } from "@/queries/flows";
import { DecompositionTree } from "./decomposition-tree.component";
import { HierarchyMatrix } from "./hierarchy-matrix.component";
import { KpiTile } from "./kpi-tile.component";
import { QueryStates } from "./query-states.component";
import { SegmentedToggle } from "./segmented-toggle.component";

interface FlowsPageProps {
    page: PageDef;
    filters: FilterState;
    options: FilterOptions | null;
    analysis: FlowAnalysis;
    onAnalysisChange: (analysis: FlowAnalysis) => void;
}

/**
 * The matrix spec for the table on screen. While a new query loads, QueryStates keeps showing the previous
 * result, which may belong to the other analysis or lack the employee level, so the spec follows the table's
 * own columns, not the page state.
 */
const specCache = new WeakMap<QueryTable, MatrixSpec>();

function matrixSpecFor(table: QueryTable): MatrixSpec {
    // One spec object per table, so HierarchyMatrix doesn't rebuild the tree on every render.
    const cached = specCache.get(table);
    if (cached) return cached;
    const spec = buildSpec(table);
    specCache.set(table, spec);
    return spec;
}

function buildSpec(table: QueryTable): MatrixSpec {
    const c = flowMatrixColumns;
    const has = (raw: string) => table.columns.some((col) => col.name === raw);
    const flowColumn = has(FLOW_ANALYSES.cross.flow) ? FLOW_ANALYSES.cross.flow : FLOW_ANALYSES.intercompany.flow;
    const withEmployees = has(c.employee);
    return {
        levels: withEmployees ? [flowColumn, c.customer, c.project, c.employee] : [flowColumn, c.customer, c.project],
        flags: withEmployees ? [c.isFlowTotal, c.isCustomerTotal, c.isProjectTotal, c.isEmployeeTotal] : [c.isFlowTotal, c.isCustomerTotal, c.isProjectTotal],
        levelKeys: withEmployees ? [undefined, undefined, undefined, c.employeeId] : undefined,
        value: c.hours,
        pivot: c.month,
        pivotSort: c.monthNumber,
        pivotTotalFlag: c.isMonthTotal,
        blankLabel: "(none)",
    };
}

/**
 * P4 Intercompany & Cross-Charge (build plan 3.4, docs/05_app_design.md § 3): hours that cross countries or areas.
 * Replaces the report's "Analysis Type" field parameter with an Intercompany / Cross charge switch. Hours use
 * the employee org (Ion, 2026-11-04). February 2026 totals 223,641 h in both views.
 */
export function FlowsPage({ page, filters, options, analysis, onAnalysisChange }: FlowsPageProps): ReactElement {
    const applies = useMemo(() => new Set<FilterKey>(page.filters), [page.filters]);
    // Wait for the filter lists, so unvalidated org, customer and project filters never reach a query.
    const ready = options !== null;
    // Employee names only with a customer or project selected (Ion: names allowed in this matrix; ~27k rows otherwise).
    const withEmployees = filters.customer !== undefined || filters.project !== undefined;

    const args = useMemo(() => filterArgs(filters, applies), [filters, applies]);
    const kpis = flowsKpis({ filters: args });
    const matrix = flowsMatrix({ analysis, filters: args, withEmployees });

    const kpiResult = useSemanticModelQuery({ connection: kpis.connection, query: ready ? kpis.query : "" });
    const matrixResult = useSemanticModelQuery({ connection: matrix.connection, query: ready ? matrix.query : "" });

    const context = describeFilterContext(page, filters, options);
    const periodText = describePeriod(filters.period);
    const area = filters.org.l1;
    const areaNote = area === undefined ? undefined : filters.org.l2 !== undefined ? `at L1 level (${area})` : area;

    return (
        <section aria-labelledby="page-title" className="flex flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 id="page-title" className="font-page-title text-page-title text-emphasis-foreground">
                        {page.title}
                    </h1>
                    <p className="font-page-subtitle text-page-subtitle text-muted-foreground">{page.purpose}</p>
                    {context !== "" && <p className="mt-1 text-200 text-muted-foreground">{context}</p>}
                    <p className="mt-1 text-200 text-muted-foreground">Organization filters use the employee&apos;s home org.</p>
                </div>
                <SegmentedToggle
                    label="Analysis"
                    options={[
                        { value: "intercompany", label: "Intercompany", hint: "Employee country → project country" },
                        { value: "cross", label: "Cross charge", hint: "Employee L1 → project L1" },
                    ]}
                    value={analysis}
                    onChange={onAnalysisChange}
                />
            </header>

            <QueryStates result={kpiResult} shape="kpi" title="Flow KPIs">
                {(table) => (
                    <div className="flex flex-col gap-grid">
                        <div className="grid grid-cols-1 gap-grid sm:grid-cols-3">
                            <KpiTile title="Synerion hours" subtitle={`${periodText} · Employee org`} value={numberCell(table, flowKpiColumns.hours)} format="#,0" />
                            <KpiTile
                                title="Intercompany share"
                                subtitle="Employee country ≠ project country"
                                value={numberCell(table, flowKpiColumns.intercompanyShare)}
                                format="0.0%"
                            />
                            <KpiTile
                                title="Cross-charge share"
                                subtitle="Employee L1 ≠ project L1"
                                value={numberCell(table, flowKpiColumns.crossChargeShare)}
                                format="0.0%"
                            />
                        </div>
                        {areaNote !== undefined ? (
                            <div className="grid grid-cols-1 gap-grid sm:grid-cols-3">
                                <KpiTile
                                    title="Cross-charge hours received"
                                    subtitle={`Other areas' people on ${areaNote} projects`}
                                    value={numberCell(table, flowKpiColumns.received)}
                                    format="#,0"
                                />
                                <KpiTile
                                    title="Cross-charge hours lent"
                                    subtitle={`${areaNote} people on other areas' projects`}
                                    value={numberCell(table, flowKpiColumns.lent)}
                                    format="#,0"
                                />
                                <KpiTile title="Net cross-charge hours" subtitle="Received − lent" value={numberCell(table, flowKpiColumns.net)} format="#,0;-#,0;0" />
                            </div>
                        ) : (
                            <p className="text-200 text-muted-foreground">Select an L1 area to see the cross-charge hours it received and lent.</p>
                        )}
                    </div>
                )}
            </QueryStates>

            <QueryStates result={matrixResult} shape="table" title={`${FLOW_ANALYSES[analysis].label} flows by month`}>
                {(table) => (
                    <HierarchyMatrix
                        table={table}
                        spec={matrixSpecFor(table)}
                        rowHeader={withEmployees ? "Flow › customer › project › employee" : "Flow › customer › project"}
                        format="#,0"
                        valueWidth={120}
                        title={`${FLOW_ANALYSES[analysis].label} flows by month`}
                        subtitle={
                            withEmployees
                                ? `${periodText}. Totals come from the model.`
                                : `${periodText}. Totals come from the model. Select a customer or project to expand to employees.`
                        }
                    />
                )}
            </QueryStates>

            <DecompositionTree key={`${analysis}|${args.join("|")}`} analysis={analysis} filters={args} ready={ready} />
        </section>
    );
}
