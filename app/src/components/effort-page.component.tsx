import { useMemo, type ReactElement } from "react";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { describeFilterContext } from "@/lib/filter-context";
import { dateRangeArg, describeMonthComparison, describePeriod, filterArgs, type FilterKey, type FilterOptions, type FilterState } from "@/lib/filters";
import type { MatrixSpec } from "@/lib/matrix";
import { ORG_VIEW_HINT, ORG_VIEW_LABEL, type OrgView } from "@/lib/org-view";
import { numberCell } from "@/lib/query-table";
import type { PageDef } from "@/lib/routes";
import { toDataTable } from "@/lib/to-data-table";
import { TREND_WEEKS, trendWindow } from "@/lib/weeks";
import {
    byCustomerColumns,
    byOrgColumns,
    effortByCustomer,
    effortByOrg,
    effortKpis,
    effortShrinkage,
    effortWeeklyTrend,
    kpiColumns,
    TOP_CUSTOMERS,
} from "@/queries/effort";
import { AxCard } from "./ax/ax-card.component";
import { AxKpiCard } from "./ax/ax-kpi-card.component";
import { HierarchyMatrix } from "./hierarchy-matrix.component";
import { QueryStates } from "./query-states.component";
import { SegmentedToggle } from "./segmented-toggle.component";
import { TrendChart } from "./trend-chart.component";

interface EffortPageProps {
    page: PageDef;
    filters: FilterState;
    options: FilterOptions | null;
    view: OrgView;
    onViewChange: (view: OrgView) => void;
    /** Viewer's local date (the trend window ends at the period end or today). */
    today?: Date;
}

const ORG_SPEC: MatrixSpec = {
    levels: [byOrgColumns.l1, byOrgColumns.l2, byOrgColumns.l3],
    flags: [byOrgColumns.isL1Total, byOrgColumns.isL2Total, byOrgColumns.isL3Total],
    values: [
        { raw: byOrgColumns.hours, header: "Hours" },
        { raw: byOrgColumns.share, header: "Share" },
    ],
    blankLabel: "(no org)",
};

const CUSTOMER_SPEC: MatrixSpec = {
    levels: [byCustomerColumns.customer, byCustomerColumns.project, byCustomerColumns.task],
    flags: [byCustomerColumns.isCustomerTotal, byCustomerColumns.isProjectTotal, byCustomerColumns.isTaskTotal],
    values: [
        { raw: byCustomerColumns.hours, header: "Hours" },
        { raw: byCustomerColumns.share, header: "Share" },
    ],
    blankLabel: "(none)",
};

const VALUE_FORMATS = ["#,0", "0.0%"] as const;

/**
 * P1 Effort Distribution (build plan 3.1, docs/05_app_design.md § 3): where the hours go. One query per
 * visual; the page's org view (project or employee org) picks the org-aware `_app` measures for every
 * visual (Ion, 2026-11-04). Laid out with the Auxis design system (design-system/: AppShell, KpiCard,
 * ChartCard, DataTable): one spotlight KPI, one accent bar, cards on the gradient canvas.
 */
export function EffortPage({ page, filters, options, view, onViewChange, today = new Date() }: EffortPageProps): ReactElement {
    const applies = useMemo(() => new Set<FilterKey>(page.filters), [page.filters]);
    // Wait for the filter lists: until then the org, customer and project filters aren't validated yet,
    // and querying would show unfiltered numbers for a moment.
    const ready = options !== null;

    const args = useMemo(() => filterArgs(filters, applies), [filters, applies]);
    // Only the calendar day of `today` matters for the trend window.
    const todayKey = today.toDateString();
    const trendArgs = useMemo(() => {
        const window = trendWindow(filters.period.end, new Date(todayKey));
        const rest = filterArgs(filters, new Set([...applies].filter((k) => k !== "period")));
        return { window, args: [dateRangeArg(window.start, window.end), ...rest] };
    }, [filters, applies, todayKey]);

    const kpis = effortKpis({ filters: args, view });
    const byOrg = effortByOrg({ filters: args, view });
    const byCustomer = effortByCustomer({ filters: args, view });
    const trend = effortWeeklyTrend({ filters: trendArgs.args, view });
    const shrinkage = effortShrinkage({ filters: args, view });

    const kpiResult = useSemanticModelQuery({ connection: kpis.connection, query: ready ? kpis.query : "" });
    const orgResult = useSemanticModelQuery({ connection: byOrg.connection, query: ready ? byOrg.query : "" });
    const customerResult = useSemanticModelQuery({ connection: byCustomer.connection, query: ready ? byCustomer.query : "" });
    const trendResult = useSemanticModelQuery({ connection: trend.connection, query: ready ? trend.query : "" });
    const shrinkageResult = useSemanticModelQuery({ connection: shrinkage.connection, query: ready ? shrinkage.query : "" });

    const context = describeFilterContext(page, filters, options);
    const periodText = describePeriod(filters.period);
    const weekRange = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
    const orgNote =
        view === "project"
            ? "Where the work is billed. Projects whose org is missing from the master hierarchy count only in the total (open item #21)."
            : "Where the people sit (the employee's home org).";

    return (
        <section aria-labelledby="page-title" className="flex flex-col gap-6">
            {/* Auxis page head: display title, muted purpose and filter context, org view as a chip slicer. */}
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 id="page-title" className="display-xl m-0">
                        {page.title}
                    </h1>
                    <p className="body m-0 mt-1 text-muted-foreground">{page.purpose}</p>
                    {context !== "" && <p className="body-sm m-0 mt-1 text-muted-foreground">{context}</p>}
                </div>
                <SegmentedToggle
                    label="Organization view"
                    options={(["project", "employee"] as const).map((v) => ({ value: v, label: ORG_VIEW_LABEL[v], hint: ORG_VIEW_HINT[v] }))}
                    value={view}
                    onChange={onViewChange}
                />
            </header>

            {/* KPI row: one spotlight (the hero, hours) and one accent bar (the focus metric, productive share). */}
            <QueryStates result={kpiResult} shape="kpi" title="Synerion hours">
                {(table) => (
                    <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 xl:grid-cols-4">
                        <AxKpiCard
                            variant="spotlight"
                            label={`Synerion hours · ${periodText}`}
                            value={numberCell(table, kpiColumns.hours)}
                            format="#,0"
                            change={{ value: numberCell(table, kpiColumns.hoursMoM), format: "0.0%", comparedTo: describeMonthComparison(filters.period) }}
                            favorable="neither"
                        />
                        <AxKpiCard
                            variant="accent"
                            label="Productive share"
                            value={numberCell(table, kpiColumns.productiveShare)}
                            format="0.0%"
                            note="Regular Time and Activity codes, excl. holiday and time off"
                        />
                        <AxKpiCard label="Overtime hours" value={numberCell(table, kpiColumns.overtime)} format="#,0" note="Pay category Overtime" />
                        <AxKpiCard
                            label="Time off + holiday"
                            value={numberCell(table, kpiColumns.timeOffHoliday)}
                            format="#,0"
                            note="Pay categories Time Off and Holiday"
                        />
                    </div>
                )}
            </QueryStates>

            <div className="grid grid-cols-1 gap-grid lg:grid-cols-5">
                <AxCard title="Hours by organization" subtitle={`${periodText} · ${ORG_VIEW_LABEL[view]} · hours and share`} className="lg:col-span-2">
                    <QueryStates result={orgResult} shape="table" title="Hours by organization">
                        {(table) => (
                            <HierarchyMatrix
                                chromeless
                                table={table}
                                spec={ORG_SPEC}
                                rowHeader={ORG_VIEW_LABEL[view]}
                                format={VALUE_FORMATS}
                                barColumns={[1]}
                                title="Hours by organization"
                                expandFirstLevel
                            />
                        )}
                    </QueryStates>
                    <p className="caption m-0 mt-3 text-muted-foreground">{orgNote}</p>
                </AxCard>
                <AxCard
                    title="Hours by customer and project"
                    subtitle={`${periodText} · top ${TOP_CUSTOMERS} customers · expand to projects and tasks`}
                    className="lg:col-span-3"
                >
                    <QueryStates result={customerResult} shape="table" title="Hours by customer and project">
                        {(table) => (
                            <HierarchyMatrix
                                chromeless
                                table={table}
                                spec={CUSTOMER_SPEC}
                                rowHeader="Customer › project › task"
                                format={VALUE_FORMATS}
                                barColumns={[1]}
                                title="Hours by customer and project"
                            />
                        )}
                    </QueryStates>
                    <p className="caption m-0 mt-3 text-muted-foreground">Share and total cover all customers.</p>
                </AxCard>
            </div>

            <div className="grid grid-cols-1 gap-grid lg:grid-cols-5">
                <AxCard
                    title="Weekly hours by pay category"
                    subtitle={`${TREND_WEEKS} Sunday–Saturday weeks · ${weekRange.format(trendArgs.window.start)} – ${weekRange.format(trendArgs.window.end)} · hours`}
                    className="lg:col-span-3"
                >
                    <QueryStates result={trendResult} shape="chart" title="Weekly hours by pay category">
                        {(table) => (
                            <TrendChart chromeless data={toDataTable(table, trend.columnMetadata)} spec={trend.vegaLiteSpec} title="Weekly hours by pay category" height={300} />
                        )}
                    </QueryStates>
                </AxCard>
                <AxCard title="Shrinkage by subtask code" subtitle={`${periodText} · hours · labels: share of hours`} className="lg:col-span-2">
                    <QueryStates result={shrinkageResult} shape="chart" title="Shrinkage by subtask code">
                        {(table) => (
                            <TrendChart
                                chromeless
                                data={toDataTable(table, shrinkage.columnMetadata)}
                                spec={shrinkage.vegaLiteSpec}
                                title="Shrinkage by subtask code"
                                height={Math.max(220, 26 * table.rows.length)}
                            />
                        )}
                    </QueryStates>
                </AxCard>
            </div>
        </section>
    );
}
