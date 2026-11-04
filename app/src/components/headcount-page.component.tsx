import { useMemo, type ReactElement } from "react";
import { describeFilterContext } from "@/lib/filter-context";
import { dateRangeArg, describeMonthComparison, describePeriod, filterArgs, monthWindow, TREND_MONTHS, type FilterKey, type FilterOptions, type FilterState } from "@/lib/filters";
import type { MatrixSpec } from "@/lib/matrix";
import { numberCell } from "@/lib/query-table";
import type { PageDef } from "@/lib/routes";
import { toDataTable } from "@/lib/to-data-table";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import {
    headcountByCountry,
    headcountByOrg,
    headcountByOrgColumns,
    headcountKpiColumns,
    headcountKpis,
    headcountMonthlyTrend,
} from "@/queries/headcount";
import { HierarchyMatrix } from "./hierarchy-matrix.component";
import { KpiTile } from "./kpi-tile.component";
import { QueryStates } from "./query-states.component";
import { TrendChart } from "./trend-chart.component";

interface HeadcountPageProps {
    page: PageDef;
    filters: FilterState;
    options: FilterOptions | null;
}

const ORG_SPEC: MatrixSpec = {
    levels: [headcountByOrgColumns.l1, headcountByOrgColumns.l2, headcountByOrgColumns.l3],
    flags: [headcountByOrgColumns.isL1Total, headcountByOrgColumns.isL2Total, headcountByOrgColumns.isL3Total],
    values: [
        { raw: headcountByOrgColumns.headcount, header: "Headcount (last week)" },
        { raw: headcountByOrgColumns.people, header: "People with hours" },
    ],
    blankLabel: "(no org)",
};

const ORG_FORMATS = ["#,0", "#,0"] as const;

/**
 * P2 Headcount Overview (build plan 3.2, docs/05_app_design.md § 3): how many people over time.
 * Headcount = people who logged time in the Sunday–Saturday week that holds the period's last day with hours
 * (open item #7 is still open with Adan); every visual uses the employee org.
 */
export function HeadcountPage({ page, filters, options }: HeadcountPageProps): ReactElement {
    const applies = useMemo(() => new Set<FilterKey>(page.filters), [page.filters]);
    // Wait for the filter lists, so unvalidated org, customer and project filters never reach a query.
    const ready = options !== null;

    const args = useMemo(() => filterArgs(filters, applies), [filters, applies]);
    const trend = useMemo(() => {
        const window = monthWindow(filters.period.end);
        const rest = filterArgs(filters, new Set([...applies].filter((k) => k !== "period")));
        return { window, args: [dateRangeArg(window.start, window.end), ...rest] };
    }, [filters, applies]);

    const kpis = headcountKpis({ filters: args });
    const monthly = headcountMonthlyTrend({ filters: trend.args });
    const byCountry = headcountByCountry({ filters: args });
    const byOrg = headcountByOrg({ filters: args });

    const kpiResult = useSemanticModelQuery({ connection: kpis.connection, query: ready ? kpis.query : "" });
    const trendResult = useSemanticModelQuery({ connection: monthly.connection, query: ready ? monthly.query : "" });
    const countryResult = useSemanticModelQuery({ connection: byCountry.connection, query: ready ? byCountry.query : "" });
    const orgResult = useSemanticModelQuery({ connection: byOrg.connection, query: ready ? byOrg.query : "" });

    const context = describeFilterContext(page, filters, options);
    const periodText = describePeriod(filters.period);
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
                    Headcount counts people who logged time in Synerion during the last Sunday–Saturday week with hours in the period, by the
                    employee&apos;s home org.
                </p>
            </header>

            <QueryStates result={kpiResult} shape="kpi" title="Headcount">
                {(table) => (
                    <div className="grid grid-cols-1 gap-grid sm:grid-cols-3">
                        <KpiTile
                            title="Headcount"
                            subtitle={`Last week with hours · ${periodText}`}
                            value={numberCell(table, headcountKpiColumns.headcount)}
                            format="#,0"
                            change={{ value: numberCell(table, headcountKpiColumns.headcountMoM), format: "0.0%", comparedTo: describeMonthComparison(filters.period) }}
                            favorable="neither"
                        />
                        <KpiTile
                            title="People with hours"
                            subtitle={`Anyone who logged time in ${periodText}`}
                            value={numberCell(table, headcountKpiColumns.people)}
                            format="#,0"
                        />
                        <KpiTile
                            title="Contractors share"
                            subtitle="Contractor + GT Contractor, last week"
                            value={numberCell(table, headcountKpiColumns.contractorsShare)}
                            format="0.0%"
                        />
                    </div>
                )}
            </QueryStates>

            <QueryStates result={trendResult} shape="chart" title="Monthly headcount">
                {(table) => (
                    <TrendChart
                        data={toDataTable(table, monthly.columnMetadata)}
                        spec={monthly.vegaLiteSpec}
                        title="Monthly headcount by reporting category"
                        subtitle={`Last ${TREND_MONTHS} months, ${monthLabel.format(trend.window.start)} – ${monthLabel.format(trend.window.end)}; each month shows its last week with hours`}
                        height={300}
                    />
                )}
            </QueryStates>

            <div className="grid grid-cols-1 gap-grid lg:grid-cols-5">
                <QueryStates result={countryResult} shape="chart" title="Headcount by country" className="lg:col-span-2">
                    {(table) => (
                        <TrendChart
                            data={toDataTable(table, byCountry.columnMetadata)}
                            spec={byCountry.vegaLiteSpec}
                            title="Headcount by country"
                            subtitle={`Employee country, last week · labels: share`}
                            height={Math.max(160, 48 * table.rows.length)}
                        />
                    )}
                </QueryStates>
                <QueryStates result={orgResult} shape="table" title="Headcount by organization" className="lg:col-span-3">
                    {(table) => (
                        <HierarchyMatrix
                            table={table}
                            spec={ORG_SPEC}
                            rowHeader="Employee org"
                            format={ORG_FORMATS}
                            title="Headcount by organization"
                            subtitle="Where the people sit. Subtotals and the total come from the model (people are not additive)."
                            expandFirstLevel
                        />
                    )}
                </QueryStates>
            </div>
        </section>
    );
}
