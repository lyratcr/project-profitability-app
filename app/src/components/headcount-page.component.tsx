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
import { AxCard } from "./ax/ax-card.component";
import { AxKpiCard } from "./ax/ax-kpi-card.component";
import { AxPageHeader } from "./ax/ax-page-header.component";
import { HierarchyMatrix } from "./hierarchy-matrix.component";
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
            <AxPageHeader
                title={page.title}
                purpose={page.purpose}
                context={context}
                notes={["Headcount counts people who logged time in Synerion during the last Sunday–Saturday week with hours in the period, by the employee's home org."]}
            />

            {/* KPI row: headcount is the hero (spotlight); contractors share carries the accent bar. */}
            <QueryStates result={kpiResult} shape="kpi" title="Headcount">
                {(table) => (
                    <div className="grid grid-cols-1 gap-grid sm:grid-cols-3">
                        <AxKpiCard
                            variant="spotlight"
                            label={`Headcount · last week · ${periodText}`}
                            value={numberCell(table, headcountKpiColumns.headcount)}
                            format="#,0"
                            change={{ value: numberCell(table, headcountKpiColumns.headcountMoM), format: "0.0%", comparedTo: describeMonthComparison(filters.period) }}
                            favorable="neither"
                        />
                        <AxKpiCard
                            label="People with hours"
                            value={numberCell(table, headcountKpiColumns.people)}
                            format="#,0"
                            note={`Anyone who logged time in ${periodText}`}
                        />
                        <AxKpiCard
                            variant="accent"
                            label="Contractors share"
                            value={numberCell(table, headcountKpiColumns.contractorsShare)}
                            format="0.0%"
                            note="Contractor + GT Contractor, last week"
                        />
                    </div>
                )}
            </QueryStates>

            <AxCard
                title="Monthly headcount by reporting category"
                subtitle={`Last ${TREND_MONTHS} months · ${monthLabel.format(trend.window.start)} – ${monthLabel.format(trend.window.end)} · each month's last week with hours`}
            >
                <QueryStates result={trendResult} shape="chart" title="Monthly headcount">
                    {(table) => (
                        <TrendChart
                            chromeless
                            data={toDataTable(table, monthly.columnMetadata)}
                            spec={monthly.vegaLiteSpec}
                            title="Monthly headcount by reporting category"
                            height={300}
                        />
                    )}
                </QueryStates>
            </AxCard>

            <div className="grid grid-cols-1 items-start gap-grid lg:grid-cols-5">
                <AxCard title="Headcount by country" subtitle={`Employee country · last week · labels: share`} className="lg:col-span-2">
                    <QueryStates result={countryResult} shape="chart" title="Headcount by country">
                        {(table) => (
                            <TrendChart
                                chromeless
                                data={toDataTable(table, byCountry.columnMetadata)}
                                spec={byCountry.vegaLiteSpec}
                                title="Headcount by country"
                                height={Math.max(160, 48 * table.rows.length)}
                            />
                        )}
                    </QueryStates>
                </AxCard>
                <AxCard title="Headcount by organization" subtitle={`${periodText} · employee org · last week and whole period`} className="lg:col-span-3">
                    <QueryStates result={orgResult} shape="table" title="Headcount by organization">
                        {(table) => (
                            <HierarchyMatrix
                                chromeless
                                table={table}
                                spec={ORG_SPEC}
                                rowHeader="Employee org"
                                format={ORG_FORMATS}
                                title="Headcount by organization"
                                expandFirstLevel
                            />
                        )}
                    </QueryStates>
                    <p className="caption m-0 mt-3 text-muted-foreground">Subtotals and the total come from the model (people are not additive).</p>
                </AxCard>
            </div>
        </section>
    );
}
