import { useMemo, type ReactElement } from "react";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { describeFilterContext } from "@/lib/filter-context";
import {
    dateRangeArg,
    describeMonthComparison,
    describePeriod,
    filterArgs,
    monthWindow,
    TREND_MONTHS,
    type FilterKey,
    type FilterOptions,
    type FilterState,
} from "@/lib/filters";
import type { MatrixSpec } from "@/lib/matrix";
import { numberCell } from "@/lib/query-table";
import type { PageDef } from "@/lib/routes";
import { toDataTable } from "@/lib/to-data-table";
import {
    TOP_CUSTOMER_MOVES,
    YIELD_FORMATS,
    yieldByOrg,
    yieldByOrgColumns,
    yieldCustomersDropped,
    yieldCustomersGrew,
    yieldKpiColumns,
    yieldKpis,
    yieldMonthlyTrend,
} from "@/queries/yield";
import { HierarchyMatrix } from "./hierarchy-matrix.component";
import { KpiTile } from "./kpi-tile.component";
import { QueryStates } from "./query-states.component";
import { ReportTable } from "./report-table.component";
import { TrendChart } from "./trend-chart.component";

interface YieldPageProps {
    page: PageDef;
    filters: FilterState;
    options: FilterOptions | null;
}

const ORG_SPEC: MatrixSpec = {
    levels: [yieldByOrgColumns.l1, yieldByOrgColumns.l2, yieldByOrgColumns.l3],
    flags: [yieldByOrgColumns.isL1Total, yieldByOrgColumns.isL2Total, yieldByOrgColumns.isL3Total],
    values: [
        { raw: yieldByOrgColumns.revenue, header: "Revenue" },
        { raw: yieldByOrgColumns.fte, header: "FTE" },
        { raw: yieldByOrgColumns.revenuePerFte, header: "Revenue / FTE" },
        { raw: yieldByOrgColumns.annualized, header: "Annualized / FTE" },
        { raw: yieldByOrgColumns.revenuePerFteMoM, header: "Rev / FTE MoM" },
    ],
    blankLabel: "(no org)",
};
const ORG_FORMATS = [YIELD_FORMATS.money, YIELD_FORMATS.fte, YIELD_FORMATS.money, YIELD_FORMATS.money, YIELD_FORMATS.percent] as const;

/**
 * P5 Revenue & Capacity Yield (build plan 3.5, docs/05_app_design.md § 3): revenue produced per unit of capacity,
 * one month at a time. Revenue per FTE and annualized revenue per FTE are Adan's formulas (#8, closed) on the
 * last Sunday–Saturday week's allocation FTE; with an org filter, revenue follows the financial org and FTE the
 * project org, so both describe the same projects.
 */
export function YieldPage({ page, filters, options }: YieldPageProps): ReactElement {
    const applies = useMemo(() => new Set<FilterKey>(page.filters), [page.filters]);
    // Wait for the filter lists, so unvalidated org, customer and project filters never reach a query.
    const ready = options !== null;

    const args = useMemo(() => filterArgs(filters, applies), [filters, applies]);
    const trend = useMemo(() => {
        const window = monthWindow(filters.period.end);
        const rest = filterArgs(filters, new Set([...applies].filter((k) => k !== "period")));
        return { window, args: [dateRangeArg(window.start, window.end), ...rest] };
    }, [filters, applies]);

    const kpis = yieldKpis({ filters: args });
    const monthly = yieldMonthlyTrend({ filters: trend.args });
    const byOrg = yieldByOrg({ filters: args });
    const grew = yieldCustomersGrew({ filters: args });
    const dropped = yieldCustomersDropped({ filters: args });

    const run = (q: { connection: string; query: string }) => ({ connection: q.connection, query: ready ? q.query : "" });
    const kpiResult = useSemanticModelQuery(run(kpis));
    const trendResult = useSemanticModelQuery(run(monthly));
    const orgResult = useSemanticModelQuery(run(byOrg));
    const grewResult = useSemanticModelQuery(run(grew));
    const droppedResult = useSemanticModelQuery(run(dropped));

    const context = describeFilterContext(page, filters, options);
    const periodText = describePeriod(filters.period);
    const comparison = describeMonthComparison(filters.period);
    const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

    return (
        <section aria-labelledby="page-title" className="flex flex-col gap-6">
            <header className="min-w-0">
                <h1 id="page-title" className="font-page-title text-page-title text-emphasis-foreground">
                    {page.title}
                </h1>
                <p className="font-page-subtitle text-page-subtitle text-muted-foreground">{page.purpose}</p>
                {context !== "" && <p className="mt-1 text-200 text-muted-foreground">{context}</p>}
                <p className="mt-1 text-200 text-muted-foreground">
                    Actual revenue (Actual scenario) ÷ allocation FTE in the last Sunday–Saturday week with hours. With an organization
                    selected, revenue follows the project&apos;s financial org and FTE the time people spent on that org&apos;s projects.
                </p>
            </header>

            <QueryStates result={kpiResult} shape="kpi" title="Yield KPIs">
                {(table) => (
                    <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 xl:grid-cols-4">
                        <KpiTile
                            title="Actual revenue"
                            subtitle={periodText}
                            value={numberCell(table, yieldKpiColumns.revenue)}
                            format={YIELD_FORMATS.money}
                            change={{ value: numberCell(table, yieldKpiColumns.revenueMoM), format: YIELD_FORMATS.percent, comparedTo: comparison }}
                        />
                        <KpiTile title="Allocated FTE" subtitle="Last week with hours · project org" value={numberCell(table, yieldKpiColumns.fte)} format={YIELD_FORMATS.fte} />
                        <KpiTile
                            title="Revenue per FTE"
                            subtitle="Monthly"
                            value={numberCell(table, yieldKpiColumns.revenuePerFte)}
                            format={YIELD_FORMATS.money}
                            change={{ value: numberCell(table, yieldKpiColumns.revenuePerFteMoM), format: YIELD_FORMATS.percent, comparedTo: comparison }}
                        />
                        <KpiTile title="Annualized revenue per FTE" subtitle="Revenue per FTE × 12" value={numberCell(table, yieldKpiColumns.annualized)} format={YIELD_FORMATS.money} />
                    </div>
                )}
            </QueryStates>

            <QueryStates result={trendResult} shape="chart" title="Monthly revenue and revenue per FTE">
                {(table) => (
                    <TrendChart
                        data={toDataTable(table, monthly.columnMetadata)}
                        spec={monthly.vegaLiteSpec}
                        title="Monthly revenue and revenue per FTE"
                        subtitle={`Last ${TREND_MONTHS} months, ${monthLabel.format(trend.window.start)} – ${monthLabel.format(trend.window.end)}. Bars: actual revenue; line: revenue per FTE.`}
                        height={300}
                    />
                )}
            </QueryStates>

            <QueryStates result={orgResult} shape="table" title="Yield by organization">
                {(table) => (
                    <HierarchyMatrix
                        table={table}
                        spec={ORG_SPEC}
                        rowHeader="Organization"
                        format={ORG_FORMATS}
                        title="Yield by organization"
                        subtitle={`${periodText}. Totals come from the model. Project-org combos missing from the master hierarchy lose their FTE here (open item #21).`}
                        expandFirstLevel
                    />
                )}
            </QueryStates>

            <div className="grid grid-cols-1 gap-grid lg:grid-cols-2">
                <QueryStates result={grewResult} shape="table" title="Customers that grew most">
                    {(table) => (
                        <ReportTable
                            table={table}
                            columnMetadata={grew.columnMetadata}
                            title="Customers that grew most"
                            subtitle={`Top ${TOP_CUSTOMER_MOVES} by revenue change ${comparison}`}
                            pageSize={TOP_CUSTOMER_MOVES}
                        />
                    )}
                </QueryStates>
                <QueryStates result={droppedResult} shape="table" title="Customers that dropped most">
                    {(table) => (
                        <ReportTable
                            table={table}
                            columnMetadata={dropped.columnMetadata}
                            title="Customers that dropped most"
                            subtitle={`Top ${TOP_CUSTOMER_MOVES} by revenue change ${comparison}`}
                            pageSize={TOP_CUSTOMER_MOVES}
                        />
                    )}
                </QueryStates>
            </div>
        </section>
    );
}
