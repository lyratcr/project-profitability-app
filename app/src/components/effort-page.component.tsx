import { useMemo, type ReactElement } from "react";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { describeFilterContext } from "@/lib/filter-context";
import { dateRangeArg, describeMonthComparison, describePeriod, filterArgs, type FilterKey, type FilterOptions, type FilterState } from "@/lib/filters";
import type { MatrixSpec } from "@/lib/matrix";
import { ORG_VIEW_HINT, ORG_VIEW_LABEL, type OrgView } from "@/lib/org-view";
import { numberCell } from "@/lib/query-table";
import type { PageDef } from "@/lib/routes";
import { toDataTable } from "@/lib/to-data-table";
import { cn } from "@/lib/utils";
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
import { HierarchyMatrix } from "./hierarchy-matrix.component";
import { KpiTile } from "./kpi-tile.component";
import { QueryStates } from "./query-states.component";
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
 * visual (Ion, 2026-11-04).
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
    const orgSubtitle =
        view === "project"
            ? "Where the work is billed. Projects whose org is missing from the master hierarchy count only in the total (open item #21)."
            : "Where the people sit (the employee's home org).";

    return (
        <section aria-labelledby="page-title" className="flex flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 id="page-title" className="font-page-title text-page-title text-emphasis-foreground">
                        {page.title}
                    </h1>
                    <p className="font-page-subtitle text-page-subtitle text-muted-foreground">{page.purpose}</p>
                    {context !== "" && <p className="mt-1 text-200 text-muted-foreground">{context}</p>}
                </div>
                <OrgViewToggle view={view} onChange={onViewChange} />
            </header>

            <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 xl:grid-cols-4">
                <QueryStates result={kpiResult} shape="kpi" title="Synerion hours" className="sm:col-span-2 xl:col-span-4">
                    {(table) => (
                        <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 xl:grid-cols-4">
                            <KpiTile
                                title="Synerion hours"
                                subtitle={`${periodText} · ${ORG_VIEW_LABEL[view]}`}
                                value={numberCell(table, kpiColumns.hours)}
                                format="#,0"
                                change={{ value: numberCell(table, kpiColumns.hoursMoM), format: "0.0%", comparedTo: describeMonthComparison(filters.period) }}
                                favorable="neither"
                            />
                            <KpiTile
                                title="Productive share"
                                subtitle="Excl. holiday and time off"
                                value={numberCell(table, kpiColumns.productiveShare)}
                                format="0.0%"
                            />
                            <KpiTile title="Overtime hours" subtitle="Pay category Overtime" value={numberCell(table, kpiColumns.overtime)} format="#,0" />
                            <KpiTile
                                title="Time off + holiday"
                                subtitle="Pay categories Time Off and Holiday"
                                value={numberCell(table, kpiColumns.timeOffHoliday)}
                                format="#,0"
                            />
                        </div>
                    )}
                </QueryStates>
            </div>

            <div className="grid grid-cols-1 gap-grid lg:grid-cols-5">
                <QueryStates result={orgResult} shape="table" title="Hours by organization" className="lg:col-span-2">
                    {(table) => (
                        <HierarchyMatrix
                            table={table}
                            spec={ORG_SPEC}
                            rowHeader={view === "project" ? "Project org" : "Employee org"}
                            format={VALUE_FORMATS}
                            title="Hours by organization"
                            subtitle={orgSubtitle}
                            expandFirstLevel
                        />
                    )}
                </QueryStates>
                <QueryStates result={customerResult} shape="table" title="Hours by customer and project" className="lg:col-span-3">
                    {(table) => (
                        <HierarchyMatrix
                            table={table}
                            spec={CUSTOMER_SPEC}
                            rowHeader="Customer › project › task"
                            format={VALUE_FORMATS}
                            title="Hours by customer and project"
                            subtitle={`Top ${TOP_CUSTOMERS} customers by hours; expand to projects and tasks. Share and total cover all customers.`}
                        />
                    )}
                </QueryStates>
            </div>

            <div className="grid grid-cols-1 gap-grid lg:grid-cols-5">
                <QueryStates result={trendResult} shape="chart" title="Weekly trend" className="lg:col-span-3">
                    {(table) => (
                        <TrendChart
                            data={toDataTable(table, trend.columnMetadata)}
                            spec={trend.vegaLiteSpec}
                            title="Weekly hours by pay category"
                            subtitle={`${TREND_WEEKS} Sunday–Saturday weeks, ${weekRange.format(trendArgs.window.start)} – ${weekRange.format(trendArgs.window.end)}`}
                            height={300}
                        />
                    )}
                </QueryStates>
                <QueryStates result={shrinkageResult} shape="chart" title="Shrinkage" className="lg:col-span-2">
                    {(table) => (
                        <TrendChart
                            data={toDataTable(table, shrinkage.columnMetadata)}
                            spec={shrinkage.vegaLiteSpec}
                            title="Hours by subtask code"
                            subtitle={`${periodText} · labels: share of hours`}
                            height={Math.max(220, 26 * table.rows.length)}
                        />
                    )}
                </QueryStates>
            </div>
        </section>
    );
}

function OrgViewToggle({ view, onChange }: { view: OrgView; onChange: (view: OrgView) => void }): ReactElement {
    const views: OrgView[] = ["project", "employee"];
    return (
        <div role="radiogroup" aria-label="Organization view" className="flex flex-col gap-1">
            <span className="text-200 leading-200 text-muted-foreground">Organization view</span>
            <div className="inline-flex rounded-md border border-border bg-card p-0.5">
                {views.map((v) => (
                    <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={view === v}
                        title={ORG_VIEW_HINT[v]}
                        onClick={() => onChange(v)}
                        className={cn(
                            "rounded-sm px-3 py-1 text-200 focus-visible:outline-2 focus-visible:outline-ring",
                            view === v ? "bg-brand text-on-brand" : "text-muted-foreground hover:bg-muted",
                        )}
                    >
                        {ORG_VIEW_LABEL[v]}
                    </button>
                ))}
            </div>
        </div>
    );
}
