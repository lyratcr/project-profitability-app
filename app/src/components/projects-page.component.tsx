import { useMemo, type ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { signedChange } from "@/lib/change";
import { describeFilterContext } from "@/lib/filter-context";
import { dateRangeArg, filterArgs, monthWindow, TREND_MONTHS, writeFilters, type FilterOptions, type FilterState } from "@/lib/filters";
import { describeDaysLeft, parseModelDate, planEndStatus } from "@/lib/plan-end";
import { cell, numberCell } from "@/lib/query-table";
import { pageHref, type PageDef } from "@/lib/routes";
import { toDataTable } from "@/lib/to-data-table";
import { describeWeek, lastWeek, reviewWindow, thisWeek, trendWindow, weekSpan, type Week } from "@/lib/weeks";
import {
    PROJECT_TREND_WEEKS,
    PROJECTS_FORMATS,
    projectsKpiColumns,
    projectsKpis,
    projectsPeople,
    projectsPeopleColumns,
    projectsRevenueByMonth,
    projectsRevenueColumns,
    projectsWeek,
    projectsWeekColumns,
    projectsWeeklyTrend,
} from "@/queries/projects";
import { AxCard } from "./ax/ax-card.component";
import { AxKpiCard } from "./ax/ax-kpi-card.component";
import { AxPageHeader } from "./ax/ax-page-header.component";
import { QueryStates, type QueryResult } from "./query-states.component";
import { ReportTable } from "./report-table.component";
import { TrendChart } from "./trend-chart.component";

interface ProjectsPageProps {
    page: PageDef;
    filters: FilterState;
    options: FilterOptions | null;
    params: URLSearchParams;
    now?: Date;
}

const PEOPLE_TABLE_ID = "who-logged-time";

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

/** Rows of the "this week and last week vs plan" table: the model's column and its format. */
const WEEK_ROWS = [
    { raw: projectsWeekColumns.hours, label: "Synerion hours", format: PROJECTS_FORMATS.hours },
    { raw: projectsWeekColumns.plannedHours, label: "Planned hours", format: PROJECTS_FORMATS.hours },
    { raw: projectsWeekColumns.hoursVsPlan, label: "Hours vs plan", format: PROJECTS_FORMATS.hours, signed: true },
    { raw: projectsWeekColumns.hoursVsPlanPct, label: "Hours / plan", format: PROJECTS_FORMATS.percent },
    { raw: projectsWeekColumns.plannedRevenue, label: "Planned revenue", format: PROJECTS_FORMATS.money },
    { raw: projectsWeekColumns.people, label: "People who logged time", format: PROJECTS_FORMATS.people },
    { raw: projectsWeekColumns.notYetBilled, label: "Hours not yet in Project Ops", format: PROJECTS_FORMATS.hours },
] as const;

/**
 * P6 Project Progress for PMs (build plan 4.1–4.2, docs/05_app_design.md § 3): the project's whole-life KPIs,
 * last week and this week against plan, a 12-week trend, who logged time in the selected week (with flags for
 * the Monday review) and revenue by month. Built on each fact's own project_key: every query through
 * dim_project fails until open item #1 is fixed. Not released until #1 and #2 (daily Synerion loads with
 * unapproved time) are closed.
 */
export function ProjectsPage({ page, filters, options, params, now = new Date() }: ProjectsPageProps): ReactElement {
    // Wait for the project list, so an unvalidated project never reaches a query; and P6 needs one project.
    const ready = options !== null && filters.project !== undefined;
    // Calendar day and hour matter (the review window ends Tuesday morning); minutes don't.
    const nowKey = [now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()].join("-");

    const model = useMemo(() => {
        const [y, m, d, h] = nowKey.split("-").map(Number);
        const at = new Date(y, m, d, h);
        const project = filterArgs(filters, new Set(["project"]));
        const weekArgs = (w: Week) => [dateRangeArg(w.start, w.end), ...project];
        const last = lastWeek(at);
        const current = thisWeek(at);
        const trend = trendWindow(at, at, PROJECT_TREND_WEEKS);
        const months = monthWindow(filters.week.weekEnd);
        return {
            at,
            last,
            current,
            trend,
            months,
            review: reviewWindow(at),
            kpis: projectsKpis({ filters: project }),
            lastWeekQuery: projectsWeek({ filters: weekArgs(last) }),
            thisWeekQuery: projectsWeek({ filters: weekArgs(current) }),
            weekly: projectsWeeklyTrend({ filters: [dateRangeArg(trend.start, trend.end), ...project] }),
            people: projectsPeople({ filters: weekArgs(filters.week), currentWeek: filters.week.isCurrent }),
            revenue: projectsRevenueByMonth({ filters: [dateRangeArg(months.start, months.end), ...project] }),
        };
    }, [filters, nowKey]);

    const run = (q: { connection: string; query: string }) => ({ connection: q.connection, query: ready ? q.query : "" });
    const kpiResult = useSemanticModelQuery(run(model.kpis));
    const lastWeekResult = useSemanticModelQuery(run(model.lastWeekQuery));
    const thisWeekResult = useSemanticModelQuery(run(model.thisWeekQuery));
    const trendResult = useSemanticModelQuery(run(model.weekly));
    const peopleResult = useSemanticModelQuery(run(model.people));
    const revenueResult = useSemanticModelQuery(run(model.revenue));

    const context = describeFilterContext(page, filters, options, model.at);
    const reviewHref = pageHref(page, writeFilters(params, { ...filters, week: model.review.week }));

    return (
        <section aria-labelledby="page-title" className="flex flex-col gap-6">
            <AxPageHeader
                title={page.title}
                purpose={page.purpose}
                context={context}
                notes={[
                    "Weeks run Sunday to Saturday, from your local date. Hours are what Synerion has loaded so far: recent days can be incomplete and unapproved time is not loaded yet (open item #2).",
                    "Projects are matched by project key, which is the first 10 characters of the project name: the two PROMETHEUS projects show as one (open items #1, #11).",
                ]}
            />

            {model.review.active && (
                <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-warning-surface px-4 py-3 text-300 text-warning">
                    <span>
                        Review last week&apos;s hours ({dayFormat.format(model.review.week.start)} – {dayFormat.format(model.review.week.weekEnd)}). Synerion approval
                        closes <strong>today at end of day</strong>; the integration to Project Operations runs <strong>Tuesday early morning</strong>.
                    </span>
                    <a
                        className="font-semibold underline"
                        href={reviewHref}
                        onClick={() => window.setTimeout(() => document.getElementById(PEOPLE_TABLE_ID)?.scrollIntoView({ behavior: "smooth" }), 0)}
                    >
                        Go to last week&apos;s hours
                    </a>
                </div>
            )}

            {filters.project === undefined ? (
                <div className="ax-card text-300 text-muted-foreground">
                    <p className="m-0">Pick a project in the Project filter to see its progress against plan.</p>
                </div>
            ) : (
                <>
                    {/* KPI row, whole project life: billing progress is the hero; revenue left to bill carries the accent bar. */}
                    <QueryStates result={kpiResult} shape="kpi" title="Project KPIs" emptyMessage="This project has no plan or revenue in the model.">
                        {(table) => {
                            const planEnd = parseModelDate(cell(table, projectsKpiColumns.planEnd));
                            const status = planEnd ? planEndStatus(planEnd, model.at) : null;
                            return (
                                <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 xl:grid-cols-5">
                                    <AxKpiCard
                                        variant="spotlight"
                                        label="Billing progress"
                                        value={numberCell(table, projectsKpiColumns.progress)}
                                        format={PROJECTS_FORMATS.percent}
                                        note="Billed to date ÷ total plan"
                                    />
                                    <AxKpiCard variant="accent" label="Revenue left to bill" value={numberCell(table, projectsKpiColumns.leftToBill)} format={PROJECTS_FORMATS.money} note="Plan minus billed to date" />
                                    <AxKpiCard label="Total planned revenue" value={numberCell(table, projectsKpiColumns.planned)} format={PROJECTS_FORMATS.money} note="Backlog scenario, whole plan" />
                                    <AxKpiCard label="Revenue billed to date" value={numberCell(table, projectsKpiColumns.billed)} format={PROJECTS_FORMATS.money} note="Actual scenario, project life" />
                                    <section className="ax-card" aria-label="Plan end date">
                                        <div className="ax-kpi-label">Plan end date</div>
                                        <div className="ax-kpi-value">{planEnd ? dateFormat.format(planEnd) : "—"}</div>
                                        <div className="ax-kpi-foot">
                                            {status ? (
                                                <span className="ax-badge">
                                                    <span className={`ax-dot ax-dot-${status.tone}`} aria-hidden="true" />
                                                    {describeDaysLeft(status.daysLeft)}
                                                </span>
                                            ) : (
                                                <span>No plan dates</span>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            );
                        }}
                    </QueryStates>

                    <div className="grid grid-cols-1 gap-grid lg:grid-cols-5">
                        <AxCard className="lg:col-span-2" title="Last week and this week vs plan" subtitle="Hours in Synerion; plan from the Backlog scenario">
                            <WeekVsPlan last={{ week: model.last, result: lastWeekResult }} current={{ week: model.current, result: thisWeekResult }} />
                            <p className="caption m-0 mt-3 text-muted-foreground">
                                Fixed Fee plan is posted on the first of each month and T&amp;M plan by day, so a week only holds the Fixed Fee plan when it contains the
                                1st. &quot;Hours not yet in Project Ops&quot; are logged in Synerion but not integrated yet.
                            </p>
                        </AxCard>

                        <AxCard
                            className="lg:col-span-3"
                            title="Weekly hours vs plan"
                            subtitle={`Last ${PROJECT_TREND_WEEKS} weeks · ${weekSpan({ ...model.current, start: model.trend.start })} · bars: Synerion hours · line: planned hours · last week is this week, to date`}
                        >
                            <QueryStates result={trendResult} shape="chart" title="Weekly hours vs plan">
                                {(table) => <TrendChart chromeless data={toDataTable(table, model.weekly.columnMetadata)} spec={model.weekly.vegaLiteSpec} title="Weekly hours vs plan" height={280} />}
                            </QueryStates>
                        </AxCard>
                    </div>

                    <div id={PEOPLE_TABLE_ID} className="scroll-mt-4">
                        <AxCard
                            title="Who logged time on this project"
                            subtitle={`${describeWeek(filters.week, model.at)} · pick the week in the Week filter · flags: no hours this week${filters.week.isCurrent ? " (none yet)" : ""}, unmapped task, overtime`}
                        >
                            <QueryStates result={peopleResult} shape="table" title="Who logged time" emptyMessage="Nobody logged time on this project in this week or the 4 weeks before.">
                                {(table) => <ReportTable chromeless table={table} columnMetadata={model.people.columnMetadata} title="Who logged time" pageSize={25} hiddenColumns={[projectsPeopleColumns.flagOrder]} />}
                            </QueryStates>
                            <p className="caption m-0 mt-3 text-muted-foreground">
                                People flagged &quot;No hours this week&quot; logged time on this project in the 4 weeks before the week. Time allocation = hours on this project ÷ all their hours
                                that week.
                            </p>
                        </AxCard>
                    </div>

                    <AxCard
                        title="Revenue by month vs plan"
                        subtitle={`Last ${TREND_MONTHS} months · ${monthLabel.format(model.months.start)} – ${monthLabel.format(model.months.end)} · USD · actual (Actual scenario) vs plan (Backlog scenario)`}
                    >
                        <QueryStates result={revenueResult} shape="table" title="Revenue by month">
                            {(table) => <ReportTable chromeless table={table} columnMetadata={model.revenue.columnMetadata} title="Revenue by month" pageSize={TREND_MONTHS} hiddenColumns={[projectsRevenueColumns.monthNumber]} />}
                        </QueryStates>
                    </AxCard>
                </>
            )}
        </section>
    );
}

interface WeekColumn {
    week: Week;
    result: QueryResult;
}

/** Two columns (last week, this week to date) × the model's week measures. Each column is its own query. */
function WeekVsPlan({ last, current }: { last: WeekColumn; current: WeekColumn }): ReactElement {
    const columns = [
        { ...last, heading: "Last week", span: weekSpan(last.week) },
        { ...current, heading: "This week", span: `${dayFormat.format(current.week.start)} – ${dayFormat.format(current.week.end)}, to date` },
    ];
    const failed = columns.find((c) => c.result.data?.status === "error");
    const loading = columns.some((c) => c.result.data?.status !== "success");

    if (failed || loading) {
        // Show the failing (or loading) column through the shared states, so errors keep their retry button.
        const shown = failed ?? columns.find((c) => c.result.data?.status !== "success") ?? columns[0];
        return (
            <QueryStates result={shown.result} shape="table" title={`${shown.heading} vs plan`}>
                {() => null}
            </QueryStates>
        );
    }

    const value = (c: WeekColumn, raw: string) => {
        const data = c.result.data;
        return data?.status === "success" && data.table.rows.length > 0 ? numberCell(data.table, raw) : null;
    };

    return (
        <div className="overflow-x-auto">
            <table className="ax-table w-full">
                <caption className="sr-only">Last week and this week vs plan</caption>
                <thead>
                    <tr>
                        <th scope="col">
                            <span className="sr-only">Measure</span>
                        </th>
                        {columns.map((c) => (
                            <th key={c.heading} scope="col" className="ax-num">
                                {c.heading}
                                <span className="block text-200 font-normal text-muted-foreground">{c.span}</span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {WEEK_ROWS.map((row) => (
                        <tr key={row.raw}>
                            <th scope="row" className="text-left font-normal">
                                {row.label}
                            </th>
                            {columns.map((c) => {
                                const v = value(c, row.raw);
                                return (
                                    <td key={c.heading} className="ax-num">
                                        {v === null ? "—" : "signed" in row && row.signed ? signedChange(v, row.format) : String(formatValue(v, row.format))}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
