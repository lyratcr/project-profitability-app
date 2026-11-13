import { useMemo, type ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { useDesignTokens } from "@/hooks/use-design-tokens";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { signedChange } from "@/lib/change";
import { describeFilterContext } from "@/lib/filter-context";
import { dateRangeArg, filterArgs, monthWindow, TREND_MONTHS, writeFilters, type FilterOptions, type FilterState } from "@/lib/filters";
import { describeDaysLeft, parseModelDate, planEndStatus } from "@/lib/plan-end";
import { cell, numberCell } from "@/lib/query-table";
import { pageHref, type PageDef } from "@/lib/routes";
import { buildPeopleMatrix } from "@/lib/people-week";
import { toDataTable } from "@/lib/to-data-table";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { lastWeek, reviewWindow, thisWeek, trendWindow, weekSpan, type Week } from "@/lib/weeks";
import {
    PROJECT_TREND_WEEKS,
    PROJECTS_FORMATS,
    projectsKpiColumns,
    projectsKpis,
    PEOPLE_MATRIX_WEEKS,
    projectsPeopleWeeks,
    projectsProjectWeeks,
    projectsRoleWeeks,
    projectsRevenueByMonth,
    projectsRevenueColumns,
    projectsWeek,
    projectsWeekColumns,
    projectsTrendMonths,
    projectsTrendSummary,
    projectsTrendSummaryColumns,
    projectsWeeklyTrend,
    projectsWeeklyVariance,
} from "@/queries/projects";
import { AxCard } from "./ax/ax-card.component";
import { AxPageHeader } from "./ax/ax-page-header.component";
import { QueryStates, type QueryResult } from "./query-states.component";
import { PeopleWeekMatrix } from "./people-week-matrix.component";
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
const GLASS_TOKENS = ["yellow-100", "yellow-300", "yellow-500", "ink", "ink-muted", "surface", "positive", "negative"] as const;
// The weekly trend's spec carries a tooltip with both series (VegaVisual's line crosshair would show only the plan),
// and its one plan label is wider than a week's column (VegaVisual would cut it to "Pla…").
const TREND_CAPABILITIES = { disableLineChartCrosshairTooltip: true, disableTextTruncation: true } as const;

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

/** Rows of the "this week and last week vs plan" table: the model's column and its format. */
const WEEK_ROWS = [
    { raw: projectsWeekColumns.hours, label: "Synerion hours", format: PROJECTS_FORMATS.hours },
    { raw: projectsWeekColumns.plannedHours, label: "Planned hours", format: PROJECTS_FORMATS.hours },
    // Status colour (Ion, 2026-11-12): red over plan, green under, as in the people x week matrix.
    { raw: projectsWeekColumns.hoursVsPlan, label: "Hours vs plan", format: PROJECTS_FORMATS.hours, signed: true, tone: "diff" },
    { raw: projectsWeekColumns.hoursVsPlanPct, label: "Hours / plan", format: PROJECTS_FORMATS.percent, tone: "ratio" },
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

    // Gold glass bars for the weekly trend (liquid glass look), from the design-system tokens.
    // Ink and surface switch with the theme; the hook reads them again when it changes.
    const tokens = useDesignTokens(GLASS_TOKENS);
    const glass = useMemo(() => (tokens
            ? { light: tokens[0], base: tokens[1], deep: tokens[2], plan: tokens[3], muted: tokens[4], ring: tokens[5], below: tokens[6], above: tokens[7] }
            : undefined), [tokens]);

    const model = useMemo(() => {
        const [y, m, d, h] = nowKey.split("-").map(Number);
        const at = new Date(y, m, d, h);
        const project = filterArgs(filters, new Set(["project"]));
        const weekArgs = (w: Week) => [dateRangeArg(w.start, w.end), ...project];
        const last = lastWeek(at);
        const current = thisWeek(at);
        const trend = trendWindow(at, at, PROJECT_TREND_WEEKS);
        const months = monthWindow(filters.week.weekEnd);
        const trendArgs = [dateRangeArg(trend.start, trend.end), ...project];
        // People x week matrix: the current week (to date) and the 7 before it, so future weeks never read as -plan.
        const matrixWindow = trendWindow(at, at, PEOPLE_MATRIX_WEEKS);
        const matrixArgs = [dateRangeArg(matrixWindow.start, matrixWindow.end), ...project];
        const matrixWeeks = Array.from({ length: PEOPLE_MATRIX_WEEKS }, (_, i) => new Date(matrixWindow.start.getFullYear(), matrixWindow.start.getMonth(), matrixWindow.start.getDate() + 7 * i));
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
            weekly: projectsWeeklyTrend({ filters: trendArgs, glass }),
            variance: glass ? projectsWeeklyVariance({ filters: trendArgs, glass }) : null,
            trendSummary: projectsTrendSummary({ filters: trendArgs }),
            trendMonths: projectsTrendMonths({ filters: trendArgs }),
            matrixWeeks,
            peopleWeeks: projectsPeopleWeeks({ filters: matrixArgs }),
            roleWeeks: projectsRoleWeeks({ filters: matrixArgs }),
            projectWeeks: projectsProjectWeeks({ filters: matrixArgs }),
            revenue: projectsRevenueByMonth({ filters: [dateRangeArg(months.start, months.end), ...project] }),
        };
    }, [filters, nowKey, glass]);

    const run = (q: { connection: string; query: string }) => ({ connection: q.connection, query: ready ? q.query : "" });
    const kpiResult = useSemanticModelQuery(run(model.kpis));
    const lastWeekResult = useSemanticModelQuery(run(model.lastWeekQuery));
    const thisWeekResult = useSemanticModelQuery(run(model.thisWeekQuery));
    const trendResult = useSemanticModelQuery(run(model.weekly));
    const trendSummaryResult = useSemanticModelQuery(run(model.trendSummary));
    const trendMonthsResult = useSemanticModelQuery(run(model.trendMonths));
    const peopleWeeksResult = useSemanticModelQuery(run(model.peopleWeeks));
    const roleWeeksResult = useSemanticModelQuery(run(model.roleWeeks));
    const projectWeeksResult = useSemanticModelQuery(run(model.projectWeeks));
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
                <div role="status" className="ax-liquid-pane flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-warning-surface px-4 py-3 text-300 text-warning">
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
                    {/* Project budget (PMs, 2026-11-12): SOW, Actual, Variance and their shares in one card, the way they read it
                        in Smartsheet (Forecast left out: it's manual and not in the model). The plan end date sits beside it. */}
                    <QueryStates result={kpiResult} shape="kpi" title="Project budget" emptyMessage="This project has no plan or revenue in the model.">
                        {(table) => {
                            const planEnd = parseModelDate(cell(table, projectsKpiColumns.planEnd));
                            const status = planEnd ? planEndStatus(planEnd, model.at) : null;
                            return (
                                <div className="grid grid-cols-1 gap-grid lg:grid-cols-3">
                                    <ProjectBudget table={table} />
                                    {/* Right column: plan end date and, below it, last week vs budget (Ion, 2026-11-12). */}
                                    <div className="flex flex-col gap-grid">
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
                                        <QueryStates result={lastWeekResult} shape="kpi" title="Last week vs budget" emptyMessage="No hours or budget last week.">
                                            {(week) => <LastWeekVsBudget table={week} span={weekSpan(model.last)} />}
                                        </QueryStates>
                                    </div>
                                </div>
                            );
                        }}
                    </QueryStates>

                    <AxCard
                        title="Weekly hours vs budget"
                        subtitle={`Up to ${PROJECT_TREND_WEEKS} weeks · ${weekSpan({ ...model.current, start: model.trend.start })} · weeks with hours or budget · the last one is this week, to date`}
                        aside={<TrendLegend />}
                    >
                        <QueryStates result={trendResult} shape="chart" title="Weekly hours vs budget">
                            {(table) => {
                                const data = toDataTable(table, model.weekly.columnMetadata);
                                return (
                                    <>
                                        {/* Layers: glass bars behind, the budget line in front with a CSS drop shadow (global.css). */}
                                        <div className="ax-trend-layered">
                                            <TrendChart chromeless data={data} spec={model.weekly.vegaLiteSpec} title="Weekly hours vs budget" height={260} capabilities={TREND_CAPABILITIES} />
                                        </div>
                                        {model.variance && (
                                            <div className="ax-trend-lollipop">
                                                <TrendChart chromeless data={data} spec={model.variance.vegaLiteSpec} title="Weekly variance vs budget" height={150} capabilities={TREND_CAPABILITIES} />
                                            </div>
                                        )}
                                    </>
                                );
                            }}
                        </QueryStates>
                        <div className="mt-5 rounded-md bg-[var(--glass-sunken)] px-3 py-1.5 text-center text-200 font-semibold text-[var(--ink)]">
                            Last {PROJECT_TREND_WEEKS} weeks · {weekSpan({ ...model.current, start: model.trend.start })}
                        </div>
                        <QueryStates result={trendSummaryResult} shape="kpi" title="Hours vs budget summary" className="mt-3">
                            {(table) => <TrendTotals table={table} />}
                        </QueryStates>
                        <QueryStates result={trendMonthsResult} shape="table" title="Hours vs budget by month" className="mt-3">
                            {(table) => <TrendMonths table={table} window={model.trend} />}
                        </QueryStates>
                        <p className="caption m-0 mt-3 text-muted-foreground">
                            Budget = plan hours (Backlog scenario). * The window cuts the first and last months. On Fixed Fee projects the weekly budget is tiny,
                            so the variance is very large (open item #26).
                        </p>
                    </AxCard>

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
                            title="Revenue by month vs plan"
                            subtitle={`Last ${TREND_MONTHS} months · ${monthLabel.format(model.months.start)} – ${monthLabel.format(model.months.end)} · USD · actual (Actual scenario) vs plan (Backlog scenario)`}
                        >
                            <QueryStates result={revenueResult} shape="table" title="Revenue by month">
                                {(table) => <ReportTable chromeless table={table} columnMetadata={model.revenue.columnMetadata} title="Revenue by month" pageSize={TREND_MONTHS} hiddenColumns={[projectsRevenueColumns.monthNumber]} />}
                            </QueryStates>
                        </AxCard>
                    </div>

                    <div id={PEOPLE_TABLE_ID} className="scroll-mt-4">
                        <AxCard
                            title="Hours vs budget by person"
                            subtitle={`Last ${PEOPLE_MATRIX_WEEKS} weeks, Sunday to Saturday · each cell: Synerion hours, of the person's budget, and the difference · the highlighted column is the week in the Week filter`}
                            aside={<MatrixLegend />}
                        >
                            {/* One model query per block: people, plan by role, and the project row; the matrix only places them. */}
                            <QueryStates result={peopleWeeksResult} shape="table" title="Hours vs budget by person" emptyMessage="Nobody logged time or was planned on this project in these weeks.">
                                {(people) => (
                                    <QueryStates result={roleWeeksResult} shape="table" title="Plan by role" allowEmpty>
                                        {(roles) => (
                                            <QueryStates result={projectWeeksResult} shape="table" title="Project total" allowEmpty>
                                                {(project) => (
                                                    <PeopleWeekMatrix
                                                        matrix={buildPeopleMatrix(people, roles, project)}
                                                        weeks={model.matrixWeeks}
                                                        currentWeek={model.current.start}
                                                        selectedWeek={filters.week.start}
                                                    />
                                                )}
                                            </QueryStates>
                                        )}
                                    </QueryStates>
                                )}
                            </QueryStates>
                            <p className="caption m-0 mt-3 text-muted-foreground">
                                Budget = the person&apos;s plan hours (Backlog) matched by Auxis ID. Hours logged without a budget count as over (+); budget without hours as under
                                (−). Plan not assigned to a person is shown by role; catalog services are not people (open item #27). On Fixed Fee projects the month&apos;s plan
                                lands in the week that holds the 1st (#26).
                            </p>
                        </AxCard>
                    </div>

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
                            <th key={c.heading} scope="col" className="ax-center">
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
                                    <td key={c.heading} className="ax-center">
                                        {v === null ? "—" : <WeekValue value={v} format={row.format} signed={"signed" in row && row.signed} tone={"tone" in row ? row.tone : undefined} />}
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

/** Legend for the weekly trend and its variance panel. Keys carry the colour; text stays in ink. */
function TrendLegend(): ReactElement {
    return (
        <ul className="m-0 flex shrink-0 list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-200 text-muted-foreground" aria-label="Legend">
            <li className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-3 w-2.5 rounded-t-[3px] bg-[image:var(--gradient-gold)] opacity-70" />
                Synerion hours
            </li>
            <li className="flex items-center gap-2">
                <span aria-hidden="true" className="relative inline-block w-5 border-t-[2.5px] border-[var(--ink)] [filter:drop-shadow(0_2px_2px_var(--glass-line-shadow))]">
                    <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-[60%] rounded-full bg-[var(--ink)] ring-2 ring-[var(--surface)]" />
                </span>
                Budget hours
            </li>
            <li className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block size-2 rounded-full bg-[var(--positive)]" />
                Under budget
            </li>
            <li className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block size-2 rounded-full bg-[var(--negative)]" />
                Over budget
            </li>
        </ul>
    );
}

const hoursFormat = (v: number | null) => (v === null ? "—" : String(formatValue(v, "#,0")));
const varianceText = (v: number | null) => (v === null ? "—" : signedChange(v, "#,0%"));

/** The 12-week totals: Synerion hours, budget, the difference and the variance, all from the model. */
function TrendTotals({ table }: { table: QueryTable }): ReactElement {
    const c = projectsTrendSummaryColumns;
    const delta = numberCell(table, c.hoursVsPlan);
    const variance = numberCell(table, c.variance);
    // Status text uses the Auxis ink tokens (legible on both themes): over budget red, at or under green.
    const tone = (v: number | null) => (v === null ? "" : v > 0 ? "text-[var(--negative-ink)]" : "text-[var(--positive-ink)]");
    const items = [
        { label: "Synerion hours", value: hoursFormat(numberCell(table, c.hours)), className: "" },
        { label: "Budget hours", value: hoursFormat(numberCell(table, c.plannedHours)), className: "" },
        { label: "Hours vs budget", value: delta === null ? "—" : signedChange(delta, "#,0"), className: tone(delta) },
        { label: "Variance", value: varianceText(variance), className: tone(variance) },
    ];
    return (
        <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((item) => (
                <div key={item.label} className="rounded-md bg-[var(--glass-sunken)] px-4 py-3">
                    <dt className="ax-kpi-label">{item.label}</dt>
                    <dd className={`m-0 mt-1 text-[22px] font-semibold tabular-nums ${item.className}`}>{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Rows per month in the window, like the YTD block of the reference (Ion, 2026-11-07): hours and budget bars on one
 * scale, the difference, and a variance bar coloured by its sign. Bar lengths only scale the model's numbers for display.
 */
function TrendMonths({ table, window }: { table: QueryTable; window: { start: Date; end: Date } }): ReactElement {
    const c = projectsTrendSummaryColumns;
    const rows = table.rows.map((_, i) => {
        const key = numberCell(table, c.monthNumber, i) ?? 0;
        const monthStart = new Date(Math.floor(key / 100), (key % 100) - 1, 1);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        return {
            label: String(cell(table, c.month, i) ?? ""),
            partial: monthStart < window.start || monthEnd > window.end,
            hours: numberCell(table, c.hours, i),
            plan: numberCell(table, c.plannedHours, i),
            delta: numberCell(table, c.hoursVsPlan, i),
            variance: numberCell(table, c.variance, i),
        };
    });
    const maxHours = Math.max(1, ...rows.flatMap((r) => [r.hours ?? 0, r.plan ?? 0]));
    const maxVariance = Math.max(0.0001, ...rows.map((r) => Math.abs(r.variance ?? 0)));
    const pct = (v: number, max: number) => `${Math.max(2, (Math.abs(v) / max) * 100)}%`;
    return (
        <div className="overflow-x-auto">
            <table className="ax-table w-full">
                <caption className="sr-only">Hours vs budget by month</caption>
                <thead>
                    <tr>
                        <th scope="col">Month</th>
                        <th scope="col">Synerion hours</th>
                        <th scope="col">Budget hours</th>
                        <th scope="col" className="ax-num">Hours vs budget</th>
                        <th scope="col">Variance</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.label}>
                            <th scope="row" className="text-left font-normal">
                                {r.label}
                                {r.partial ? "*" : ""}
                            </th>
                            <td>
                                <span className="flex items-center gap-2">
                                    <span className="ax-month-bar ax-month-bar-hours" style={{ width: r.hours === null ? 0 : pct(r.hours, maxHours) }} aria-hidden="true" />
                                    <span className="tabular-nums">{hoursFormat(r.hours)}</span>
                                </span>
                            </td>
                            <td>
                                {r.plan === null ? (
                                    <span className="text-muted-foreground">No budget yet</span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <span className="ax-month-bar ax-month-bar-plan" style={{ width: pct(r.plan, maxHours) }} aria-hidden="true" />
                                        <span className="tabular-nums">{hoursFormat(r.plan)}</span>
                                    </span>
                                )}
                            </td>
                            <td className="ax-num">{r.delta === null ? "—" : signedChange(r.delta, "#,0")}</td>
                            <td>
                                {r.variance === null ? (
                                    "—"
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <span
                                            className={`ax-month-bar ax-month-bar-variance ${r.variance > 0 ? "is-above" : "is-below"}`}
                                            style={{ width: pct(r.variance, maxVariance) }}
                                            aria-hidden="true"
                                        />
                                        <span className="whitespace-nowrap tabular-nums">{varianceText(r.variance)}</span>
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * The PMs' project budget card (2026-11-12), whole project life: SOW (Backlog), Actual (billed to date), Variance (left
 * to bill) and their shares, with a billed / left bar. Every figure is a model measure; the bar width shows % Actual.
 */
function ProjectBudget({ table }: { table: QueryTable }): ReactElement {
    const c = projectsKpiColumns;
    const progress = numberCell(table, c.progress);
    const money = (raw: string) => {
        const v = numberCell(table, raw);
        return v === null ? "—" : String(formatValue(v, PROJECTS_FORMATS.money));
    };
    const percent = (raw: string) => {
        const v = numberCell(table, raw);
        return v === null ? "—" : String(formatValue(v, PROJECTS_FORMATS.percent));
    };
    const rows = [
        { label: "SOW", note: "Backlog, whole plan", value: money(c.planned) },
        { label: "Actual", note: "Billed to date", value: money(c.billed) },
        { label: "Variance", note: "Left to bill", value: money(c.leftToBill) },
        { label: "% Actual", note: "Actual ÷ SOW", value: percent(c.progress) },
        { label: "% Variance", note: "Variance ÷ SOW", value: percent(c.leftToBillPct) },
    ];
    const width = progress === null ? 0 : Math.min(1, Math.max(0, progress)) * 100;
    return (
        <section className="ax-card ax-spotlight ax-kpi-hero lg:col-span-2" aria-label="Project budget">
            <div className="ax-kpi-label">Project budget · whole project life</div>
            <div className="mt-3">
                <div className="ax-budget-track" aria-hidden="true">
                    <span className="ax-budget-fill" style={{ width: `${width}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-200 text-[var(--ink-muted)]">
                    <span>Billed {percent(c.progress)}</span>
                    <span>Left {percent(c.leftToBillPct)}</span>
                </div>
            </div>
            {/* Amounts on the left, shares on the right, each in the PMs' order. */}
            <div className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {[rows.slice(0, 3), rows.slice(3)].map((group, i) => (
                    <dl key={i} className="m-0">
                        {group.map((r) => (
                            <div key={r.label} className="flex items-baseline justify-between gap-3 border-t border-white/10 py-2">
                                <dt className="m-0">
                                    <span className="text-300 font-semibold text-[var(--ink)]">{r.label}</span>
                                    <span className="ml-2 text-200 text-[var(--ink-muted)]">{r.note}</span>
                                </dt>
                                <dd className="m-0 text-[20px] font-semibold tabular-nums text-[var(--ink)]">{r.value}</dd>
                            </div>
                        ))}
                    </dl>
                ))}
            </div>
        </section>
    );
}

/** Legend for the people x week matrix: the pill colours by direction (status colours always carry the sign). */
function MatrixLegend(): ReactElement {
    return (
        <ul className="m-0 flex shrink-0 list-none flex-wrap items-center gap-x-3 gap-y-1 p-0 text-200 text-muted-foreground" aria-label="Legend">
            <li className="flex items-center gap-1.5">
                <span className="ax-var-pill is-under">−5</span> under budget
            </li>
            <li className="flex items-center gap-1.5">
                <span className="ax-var-pill is-over">+10</span> over budget
            </li>
            <li className="flex items-center gap-1.5">
                <span className="ax-var-pill is-even">0</span> on budget
            </li>
        </ul>
    );
}

/** Last Sunday-Saturday week: Synerion hours, of the plan hours, and the model's variance % (red over, green under). */
function LastWeekVsBudget({ table, span }: { table: QueryTable; span: string }): ReactElement {
    const c = projectsWeekColumns;
    const hours = numberCell(table, c.hours);
    const planned = numberCell(table, c.plannedHours);
    const variance = numberCell(table, c.variance);
    const tone = variance === null ? null : Math.round(variance * 100) > 0 ? "over" : Math.round(variance * 100) < 0 ? "under" : "even";
    return (
        <section className="ax-card" aria-label="Last week vs budget">
            <div className="ax-kpi-label">Last week vs budget</div>
            <div className="flex items-baseline gap-2">
                <span className="ax-kpi-value">{hours === null ? "—" : `${String(formatValue(hours, "#,0"))} h`}</span>
                <span className="text-300 text-[var(--ink-muted)]">{planned === null ? "no budget" : `of ${String(formatValue(planned, "#,0"))}`}</span>
            </div>
            <div className="ax-kpi-foot">
                {tone !== null && variance !== null && <span className={`ax-var-pill is-${tone}`}>{signedChange(variance, "#,0%")}</span>}
                <span>{span}</span>
            </div>
        </section>
    );
}

/**
 * One value of the week vs plan table. With a tone, it shows as a status pill (red over plan, green under): a
 * difference by its sign, a ratio against 100%. Status is never colour alone: the sign or the % carries it too.
 */
function WeekValue({ value, format, signed, tone }: { value: number; format: string; signed: boolean; tone?: "diff" | "ratio" }): ReactElement {
    const text = signed ? signedChange(value, format) : String(formatValue(value, format));
    if (!tone) return <>{text}</>;
    const delta = tone === "ratio" ? Math.round((value - 1) * 1000) : Math.round(value);
    const kind = delta > 0 ? "over" : delta < 0 ? "under" : "even";
    return <span className={`ax-var-pill is-${kind}`}>{text}</span>;
}

