import { useMemo, type ReactElement, type ReactNode } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { useDesignTokens } from "@/hooks/use-design-tokens";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { signedChange } from "@/lib/change";
import { describeFilterContext } from "@/lib/filter-context";
import { DATA_START, dateRangeArg, monthWindow, projectScope, projectScopeArgs, TREND_MONTHS, type FilterOptions, type FilterState } from "@/lib/filters";
import { completeWeeksWindow } from "@/lib/pace";
import { describeDaysLeft, parseModelDate, planEndStatus, type PlanEndStatus } from "@/lib/plan-end";
import { cell, numberCell } from "@/lib/query-table";
import { pageHref, type PageDef } from "@/lib/routes";

import { buildPeopleMatrix, buildProjectMatrix, matrixWeeks, type MatrixCell, type PeopleMatrix } from "@/lib/people-week";
import { toDataTable } from "@/lib/to-data-table";
import { cn } from "@/lib/utils";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { defaultWeek, lastWeek, reviewWindow, thisWeek, trendWindow, weekSpan, weekStartOf, type Week } from "@/lib/weeks";
import {
    AGGREGATE_MATRIX_WEEKS,
    AGGREGATE_ROWS,
    PACE_HISTORY_WEEKS,
    PACE_WEEKS,
    PROJECT_TREND_WEEKS,
    PROJECTS_FORMATS,
    projectsKpiColumns,
    projectsKpis,
    projectsBilledThrough,
    BILLED_THROUGH_COLUMN,
    projectsPace,
    projectsPaceByProject,
    projectsPaceWeeks,
    projectsPeopleBreakdown,
    projectsPeopleWeeks,
    projectsProjectWeeks,
    projectsProjectsWeeks,
    projectsReconcilePeopleWeeks,
    projectsReconcileProjectWeeks,
    projectsReconcileProjectsWeeks,
    projectsRoleWeeks,
    projectsRevenueByMonth,
    projectsRevenueColumns,
    projectsWeek,
    projectsWeekColumns,
    projectsTrendMonths,
    projectsTrendSummaryColumns,
    projectsWeeklyTrend,
    projectsWeeklyVariance,
} from "@/queries/projects";
import { AxCard } from "./ax/ax-card.component";
import { AxPageHeader } from "./ax/ax-page-header.component";
import { PaceToPlanEnd } from "./pace-to-plan-end.component";
import { ProjectsByPace } from "./projects-by-pace.component";
import { QueryStates, type QueryResult } from "./query-states.component";
import { PeopleWeekMatrix } from "./people-week-matrix.component";
import { ReportTable } from "./report-table.component";
import { TrendChart } from "./trend-chart.component";

interface ProjectsPageProps {
    page: PageDef;
    filters: FilterState;
    options: FilterOptions | null;
    params: URLSearchParams;
    /** Changes the filters (act 4 opens a project). */
    onFiltersChange?: (next: FilterState) => void;
    now?: Date;
}

const PEOPLE_TABLE_ID = "who-logged-time";
const GLASS_TOKENS = ["yellow-100", "yellow-300", "yellow-500", "ink", "ink-muted", "surface", "positive", "negative", "blue-300"] as const;
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
    { raw: projectsWeekColumns.hoursVsPlanPct, label: "Hours / plan", format: "0%", tone: "ratio" },
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
export function ProjectsPage({ page, filters, options, params, onFiltersChange, now = new Date() }: ProjectsPageProps): ReactElement {
    // Aggregated view (Ion, 2026-11-16): one project, or every project the org / customer / PM filters leave (or every
    // project the viewer may see). Wait for the project list, so an unvalidated project never reaches a query.
    const scope = useMemo(() => (options ? projectScope(filters, options) : null), [filters, options]);
    const single = filters.project !== undefined;
    const emptyScope = scope !== null && scope.length === 0;
    const ready = options !== null && !emptyScope;
    const projectCount = scope?.length ?? options?.projects.length ?? 0;
    // Calendar day and hour matter (the review window ends Tuesday morning); minutes don't.
    const nowKey = [now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()].join("-");

    // Gold glass bars for the weekly trend (liquid glass look), from the design-system tokens.
    // Ink and surface switch with the theme; the hook reads them again when it changes.
    const tokens = useDesignTokens(GLASS_TOKENS);
    const glass = useMemo(() => (tokens
            ? { light: tokens[0], base: tokens[1], deep: tokens[2], plan: tokens[3], muted: tokens[4], ring: tokens[5], below: tokens[6], above: tokens[7], billed: tokens[8] }
            : undefined), [tokens]);

    const model = useMemo(() => {
        const [y, m, d, h] = nowKey.split("-").map(Number);
        const at = new Date(y, m, d, h);
        const project = projectScopeArgs(scope);
        const weekArgs = (w: Week) => [dateRangeArg(w.start, w.end), ...project];
        const last = lastWeek(at);
        const current = thisWeek(at);
        const trend = trendWindow(at, at, PROJECT_TREND_WEEKS);
        // Act 3 runs to the end of the review week (last Saturday, or this week once the review is over).
        const months = monthWindow(defaultWeek(at).weekEnd);
        const trendArgs = [dateRangeArg(trend.start, trend.end), ...project];
        // Matrix (Ion, 2026-11-16): one project from its first week (data start) to this week, to date; several projects
        // the last AGGREGATE_MATRIX_WEEKS weeks. Future weeks never show, so they never read as -plan.
        const matrixWindow = single
            ? { start: weekStartOf(new Date(DATA_START.year, DATA_START.month - 1, 1)), end: at }
            : trendWindow(at, at, AGGREGATE_MATRIX_WEEKS);
        const matrixArgs = [dateRangeArg(matrixWindow.start, matrixWindow.end), ...project];
        // Act 4: the pace window (last complete weeks) and the burn-up's history, both ending last Saturday.
        const paceWindow = completeWeeksWindow(at, PACE_WEEKS);
        const historyWindow = completeWeeksWindow(at, PACE_HISTORY_WEEKS);
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
            // Act 3: hours by month over the same months as revenue by month, so both tables read side by side (Ion, 2026-11-16).
            trendMonths: projectsTrendMonths({ filters: [dateRangeArg(months.start, months.end), ...project] }),
            matrixWindow,
            peopleWeeks: projectsPeopleWeeks({ filters: matrixArgs }),
            // Tooltip of one cell: that person, that week (or the whole window), run only on hover.
            breakdownFor: (employee: string, week: Date | null) =>
                projectsPeopleBreakdown({
                    filters: [
                        week ? dateRangeArg(week, new Date(week.getFullYear(), week.getMonth(), week.getDate() + 6)) : dateRangeArg(matrixWindow.start, matrixWindow.end),
                        ...project,
                        `KEEPFILTERS ( TREATAS ( { "${employee.replace(/"/g, '""')}" }, dim_employee[employee_number] ) )`,
                    ],
                }),
            roleWeeks: projectsRoleWeeks({ filters: matrixArgs }),
            projectWeeks: projectsProjectWeeks({ filters: matrixArgs }),
            projectsWeeks: projectsProjectsWeeks({ filters: matrixArgs }),
            reconcilePeople: projectsReconcilePeopleWeeks({ filters: matrixArgs }),
            reconcileTotal: projectsReconcileProjectWeeks({ filters: matrixArgs }),
            reconcileProjects: projectsReconcileProjectsWeeks({ filters: matrixArgs }),
            revenue: projectsRevenueByMonth({ filters: [dateRangeArg(months.start, months.end), ...project] }),
            paceAsOf: paceWindow.end,
            pace: projectsPace({ filters: [dateRangeArg(paceWindow.start, paceWindow.end), ...project] }),
            paceByProject: projectsPaceByProject({ filters: [dateRangeArg(paceWindow.start, paceWindow.end), ...project] }),
            paceWeeks: projectsPaceWeeks({ filters: [dateRangeArg(historyWindow.start, historyWindow.end), ...project] }),
        };
    }, [scope, single, nowKey, glass]);

    const run = (q: { connection: string; query: string }) => ({ connection: q.connection, query: ready ? q.query : "" });
    // Queries only one view needs stay idle in the other.
    const runIf = (when: boolean, q: { connection: string; query: string }) => run(when ? q : { ...q, query: "" });
    const kpiResult = useSemanticModelQuery(run(model.kpis));
    const lastWeekResult = useSemanticModelQuery(run(model.lastWeekQuery));
    const thisWeekResult = useSemanticModelQuery(run(model.thisWeekQuery));
    const trendResult = useSemanticModelQuery(run(model.weekly));
    const trendMonthsResult = useSemanticModelQuery(run(model.trendMonths));
    const peopleWeeksResult = useSemanticModelQuery(runIf(single, model.peopleWeeks));
    const roleWeeksResult = useSemanticModelQuery(runIf(single, model.roleWeeks));
    const projectsWeeksResult = useSemanticModelQuery(runIf(!single, model.projectsWeeks));
    const reconcilePeopleResult = useSemanticModelQuery(runIf(single, model.reconcilePeople));
    const reconcileTotalResult = useSemanticModelQuery(run(model.reconcileTotal));
    const reconcileProjectsResult = useSemanticModelQuery(runIf(!single, model.reconcileProjects));
    const projectWeeksResult = useSemanticModelQuery(run(model.projectWeeks));
    const revenueResult = useSemanticModelQuery(run(model.revenue));
    const paceResult = useSemanticModelQuery(runIf(single, model.pace));
    const paceWeeksResult = useSemanticModelQuery(runIf(single, model.paceWeeks));
    const paceByProjectResult = useSemanticModelQuery(runIf(!single, model.paceByProject));
    // Matrix source (Ion, 2026-11-16): weeks up to the last day billed in Project Ops show Project Ops hours.
    const billedThroughData = useSemanticModelQuery(run(projectsBilledThrough())).data;
    const billedThrough = billedThroughData?.status === "success" ? parseModelDate(cell(billedThroughData.table, BILLED_THROUGH_COLUMN)) : null;

    const context = describeFilterContext(page, filters, options, model.at);
    const reviewHref = pageHref(page, params);
    const projectsLabel = `${projectCount} project${projectCount === 1 ? "" : "s"}`;

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

            {emptyScope ? (
                <div className="ax-card text-300 text-muted-foreground">
                    <p className="m-0">No projects match these filters. Change the organization, customer or project manager.</p>
                </div>
            ) : (
                <>
                    {/* Project Health tells a story in four acts (Ion, 2026-11-16): today, how we got here, in money, what comes next. */}
                    <StoryAct step={1} title="Today" question={single || projectCount === 1 ? "How is the project right now?" : `How are the ${projectsLabel} right now?`}>
                        {/* Row 1, the two things the PMs read first (Ion, 2026-11-13): the project budget (with the plan end date at its
                            foot) and last week / this week vs plan, half the width each. Forecast is left out: it's manual and not in the model. */}
                        <div className="grid grid-cols-1 gap-grid lg:grid-cols-2">
                            <QueryStates result={kpiResult} shape="kpi" title="Project budget" emptyMessage="This project has no plan or revenue in the model.">
                                {(table) => {
                                    const planEnd = parseModelDate(cell(table, projectsKpiColumns.planEnd));
                                    return <ProjectBudget table={table} planEnd={planEnd} status={planEnd && single ? planEndStatus(planEnd, model.at) : null} projects={single ? null : projectCount} />;
                                }}
                            </QueryStates>
                            <AxCard className="h-full" title="Last week and this week vs plan" subtitle="Hours in Synerion; plan from the Backlog scenario">
                                <WeekVsPlan last={{ week: model.last, result: lastWeekResult }} current={{ week: model.current, result: thisWeekResult }} />
                                <p className="caption m-0 mt-3 text-muted-foreground">
                                    Fixed Fee plan is posted on the first of each month and T&amp;M plan by day, so a week only holds the Fixed Fee plan when it contains the
                                    1st. &quot;Hours not yet in Project Ops&quot; are logged in Synerion but not integrated yet.
                                </p>
                            </AxCard>
                        </div>

                    </StoryAct>

                    <StoryAct step={2} title="How we got here" question="The shape of the last weeks first, then who drove it">
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
                            <p className="caption m-0 mt-3 text-muted-foreground">
                                Three scenarios: Synerion hours logged (bars), budget = plan hours (Backlog) and T&amp;M hours billed in Project Ops
                                (blue, solid: it already happened; only weeks the integration has posted; none for Fixed Fee projects). The budget line is dashed: it's a plan. The variance compares Synerion with the budget. On
                                Fixed Fee projects the weekly budget is tiny, so the variance is very large (open item #26).
                            </p>
                        </AxCard>


                        {/* The people (one project) or project (several) x week matrix, right under the weekly chart it explains (Ion, 2026-11-16). */}
                        <div id={PEOPLE_TABLE_ID} className="scroll-mt-4">
                            <AxCard
                                title={single ? "Project Ops vs budget (Backlog) by person" : "Project Ops vs budget (Backlog) by project"}
                                subtitle={
                                    single
                                        ? "Every week from the project's first, Sunday to Saturday · scroll sideways for earlier weeks · the highlighted column is last week"
                                        : `Last ${AGGREGATE_MATRIX_WEEKS} weeks, Sunday to Saturday · scroll sideways for earlier weeks · pick a project to see it by person`
                                }
                                aside={<MatrixLegend billedThrough={billedThrough} />}
                            >
                                {single ? (
                                    /* One model query per block: people, plan by role, and the project row; the matrix only places them. */
                                    <QueryStates result={peopleWeeksResult} shape="table" title="Hours vs budget by person" emptyMessage="Nobody logged time or was planned on this project yet.">
                                        {(people) => (
                                            <QueryStates result={roleWeeksResult} shape="table" title="Plan by role" allowEmpty>
                                                {(roles) => (
                                                    <QueryStates result={projectWeeksResult} shape="table" title="Project total" allowEmpty>
                                                        {(project) => (
                                                            <MatrixView
                                                                matrix={buildPeopleMatrix(people, roles, project)}
                                                                current={model.current.start}
                                                                selected={model.last.start}
                                                                breakdownFor={model.breakdownFor}
                                                                project={filters.project ?? ""}
                                                                rowLabel="Person"
                                                                billedThrough={billedThrough}
                                                                kpis={{ period: "Project to date" }}
                                                            />
                                                        )}
                                                    </QueryStates>
                                                )}
                                            </QueryStates>
                                        )}
                                    </QueryStates>
                                ) : (
                                    <QueryStates result={projectsWeeksResult} shape="table" title="Hours vs budget by project" emptyMessage="No hours or plan on these projects in these weeks.">
                                        {(projects) => (
                                            <QueryStates result={projectWeeksResult} shape="table" title="Total" allowEmpty>
                                                {(total) => (
                                                    <MatrixView
                                                        matrix={buildProjectMatrix(projects, total)}
                                                        current={model.current.start}
                                                        selected={model.last.start}
                                                        project={projectsLabel}
                                                        rowLabel="Project"
                                                        billedThrough={billedThrough}
                                                        rowLimit={AGGREGATE_ROWS}
                                                        onRowPick={(key) => onFiltersChange?.({ ...filters, project: key })}
                                                        kpis={{ period: `Last ${AGGREGATE_MATRIX_WEEKS} weeks` }}
                                                    />
                                                )}
                                            </QueryStates>
                                        )}
                                    </QueryStates>
                                )}
                                <p className="caption m-0 mt-3 text-muted-foreground">
                                    {single
                                        ? "Budget = the person's plan hours (Backlog) matched by Auxis ID. Hours logged without a budget count as over (+); budget without hours as under (−). Plan not assigned to a person in Project Operations is shown by role, with 0 hours (nobody logs time against a role), as in the Backlog vs Actuals report; catalog services are not people (open item #27). On Fixed Fee projects the month's plan lands in the week that holds the 1st (#26)."
                                        : "Budget = the project's plan hours (Backlog). Total = the weeks shown. On Fixed Fee projects the month's plan lands in the week that holds the 1st (#26)."}
                                </p>
                            </AxCard>
                        </div>

                        {/* Project Ops vs Synerion (Ion, 2026-11-16, 6.10): the same matrix, comparing what was billed with what was logged,
                            to find adjustments and integration problems. */}
                        <AxCard
                            title={single ? "Project Ops vs Synerion hours by person" : "Project Ops vs Synerion hours by project"}
                            subtitle={`Weeks already in Project Ops${billedThrough ? ` (through ${dateFormat.format(billedThrough)})` : ""} · T&M projects · scroll sideways for earlier weeks`}
                            aside={<ReconcileLegend />}
                        >
                            {single ? (
                                <QueryStates
                                    result={reconcilePeopleResult}
                                    shape="table"
                                    title="Project Ops vs Synerion hours by person"
                                    emptyMessage="No T&M hours to compare: Fixed Fee projects have no hours of work in Project Ops, and this project has none billed yet."
                                >
                                    {(people) => (
                                        <QueryStates result={reconcileTotalResult} shape="table" title="Project total" allowEmpty>
                                            {(project) => (
                                                <MatrixView
                                                    matrix={buildPeopleMatrix(people, EMPTY_TABLE, project)}
                                                    current={model.current.start}
                                                    selected={model.last.start}
                                                    breakdownFor={model.breakdownFor}
                                                    project={filters.project ?? ""}
                                                    rowLabel="Person"
                                                    billedThrough={billedThrough}
                                                    mode="reconcile"
                                                    kpis={{ period: "Project to date" }}
                                                />
                                            )}
                                        </QueryStates>
                                    )}
                                </QueryStates>
                            ) : (
                                <QueryStates result={reconcileProjectsResult} shape="table" title="Project Ops vs Synerion hours by project" emptyMessage="No T&M hours to compare on these projects.">
                                    {(projects) => (
                                        <QueryStates result={reconcileTotalResult} shape="table" title="Total" allowEmpty>
                                            {(total) => (
                                                <MatrixView
                                                    matrix={buildProjectMatrix(projects, total)}
                                                    current={model.current.start}
                                                    selected={model.last.start}
                                                    project={projectsLabel}
                                                    rowLabel="Project"
                                                    billedThrough={billedThrough}
                                                    rowLimit={AGGREGATE_ROWS}
                                                    onRowPick={(key) => onFiltersChange?.({ ...filters, project: key })}
                                                    mode="reconcile"
                                                    kpis={{ period: `Last ${AGGREGATE_MATRIX_WEEKS} weeks` }}
                                                />
                                            )}
                                        </QueryStates>
                                    )}
                                </QueryStates>
                            )}
                            <p className="caption m-0 mt-3 text-muted-foreground">
                                Each cell: T&amp;M hours billed in Project Ops · of hours logged in Synerion · the difference. A difference is an adjustment made in
                                Project Ops (for example, a holiday not billed) or an integration problem. Fixed Fee projects are left out: Project Ops has no hours of work for them.
                            </p>
                        </AxCard>
                    </StoryAct>

                    <StoryAct step={3} title="In money" question="What it means month by month">
                        <div className="grid grid-cols-1 gap-grid lg:grid-cols-2">
                        <AxCard
                            title="Hours vs budget by month"
                            subtitle={`Last ${TREND_MONTHS} months · ${monthLabel.format(model.months.start)} – ${monthLabel.format(model.months.end)} · Synerion hours vs plan hours (Backlog scenario)`}
                        >
                            <QueryStates result={trendMonthsResult} shape="table" title="Hours vs budget by month">
                                {(table) => <TrendMonths table={table} window={model.months} />}
                            </QueryStates>
                            <p className="caption m-0 mt-3 text-muted-foreground">Budget = plan hours (Backlog scenario). * Only through {dateFormat.format(model.months.end)}.</p>
                        </AxCard>
                        <AxCard
                            title="Revenue by month vs plan"
                            subtitle={`Last ${TREND_MONTHS} months · ${monthLabel.format(model.months.start)} – ${monthLabel.format(model.months.end)} · USD · actual (Actual scenario) vs plan (Backlog scenario)`}
                        >
                            <QueryStates result={revenueResult} shape="table" title="Revenue by month">
                                {(table) => <ReportTable chromeless table={table} columnMetadata={model.revenue.columnMetadata} title="Revenue by month" pageSize={TREND_MONTHS} hiddenColumns={[projectsRevenueColumns.monthNumber]} />}
                            </QueryStates>
                        </AxCard>
                        </div>
                    </StoryAct>

                    <StoryAct step={4} title="What comes next" question={single ? "If the team keeps this pace, does the hours budget last?" : "Which projects' hours budgets won't last at this pace?"}>
                        {single ? (
                            <PaceToPlanEnd pace={paceResult} history={paceWeeksResult} asOf={model.paceAsOf} />
                        ) : (
                            <ProjectsByPace result={paceByProjectResult} onPick={(key) => onFiltersChange?.({ ...filters, project: key })} />
                        )}
                    </StoryAct>
                </>
            )}
        </section>
    );
}

const EMPTY_TABLE: QueryTable = { columns: [], rows: [] } as unknown as QueryTable;

/** Legend for the Project Ops vs Synerion matrix: what a cell shows; any difference is amber, a match is neutral. */
function ReconcileLegend(): ReactElement {
    return (
        <div className="flex shrink-0 flex-col items-start gap-1 text-200 text-muted-foreground sm:items-end">
            <span>
                Each cell: <strong className="font-semibold text-[var(--ink)]">Project Ops</strong> · of Synerion · difference
            </span>
            <ul className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0" aria-label="Legend">
                <li className="flex items-center gap-1.5">
                    <span className="ax-var-pill is-diff">±</span> differs, check it
                </li>
                <li className="flex items-center gap-1.5">
                    <span className="ax-var-pill is-even">0</span> match
                </li>
            </ul>
        </div>
    );
}

/** Lays the matrix over the weeks that hold data (first week to this week). */
function MatrixView({
    matrix,
    current,
    selected,
    breakdownFor,
    project,
    rowLabel,
    rowLimit,
    onRowPick,
    billedThrough,
    mode,
    kpis,
}: {
    matrix: PeopleMatrix;
    current: Date;
    selected: Date;
    breakdownFor?: (employee: string, week: Date | null) => { connection: string; query: string };
    project: string;
    rowLabel: string;
    rowLimit?: number;
    onRowPick?: (key: string) => void;
    billedThrough: Date | null;
    mode?: "budget" | "reconcile";
    /** KPI group on top: the matrix's total row (Ion, 2026-11-16), so the cards and the weekly detail always agree. */
    kpis?: { period: string };
}): ReactElement {
    return (
        <>
        {kpis && matrix.project && <ComparisonKpis total={matrix.project.total} mode={mode ?? "budget"} period={kpis.period} billedThrough={billedThrough} />}
        <PeopleWeekMatrix
            matrix={matrix}
            weeks={matrixWeeks(matrix, current)}
            currentWeek={current}
            selectedWeek={selected}
            breakdownQuery={breakdownFor}
            project={project}
            rowLabel={rowLabel}
            rowLimit={rowLimit}
            onRowPick={onRowPick}
            billedThrough={billedThrough}
            mode={mode}
        />
        </>
    );
}

/**
 * KPI group heading a matrix (Ion, 2026-11-16): the budget matrix compares Project Ops (Synerion for weeks not
 * integrated yet) with the budget (Backlog); the reconciliation matrix compares Project Ops with Synerion in integrated
 * weeks. Values are the matrix total row: model measures, nothing computed here.
 */
function ComparisonKpis({ total, mode, period, billedThrough }: { total: MatrixCell; mode: "budget" | "reconcile"; period: string; billedThrough: Date | null }): ReactElement {
    const fmt = (v: number | null) => (v === null ? "—" : String(formatValue(v, "#,0")));
    const through = billedThrough ? `through ${dateFormat.format(billedThrough)}` : "";
    const diffClass =
        total.diff === null || Math.round(total.diff) === 0
            ? ""
            : mode === "reconcile"
              ? "ax-text-diff"
              : total.diff > 0
                ? "text-[var(--negative-ink)]"
                : "text-[var(--positive-ink)]";
    const items =
        mode === "budget"
            ? [
                  { label: "Hours (Project Ops)", value: fmt(total.hours), note: `Billed ${through}; Synerion after` },
                  { label: "Budget (Backlog)", value: fmt(total.planned), note: "Plan" },
                  { label: "Difference", value: total.diff === null ? "—" : signedChange(total.diff, "#,0"), note: "Hours vs budget", className: diffClass },
                  { label: "Variance", value: total.variance === null ? "—" : signedChange(total.variance, "#,0%"), note: "Of the budget", className: diffClass },
              ]
            : [
                  { label: "Billed in Project Ops", value: fmt(total.hours), note: `T&M, ${through}`, className: "text-[var(--blue-300)]" },
                  { label: "Logged in Synerion", value: fmt(total.planned), note: "Same weeks" },
                  { label: "Difference", value: total.diff === null ? "—" : signedChange(total.diff, "#,0"), note: "Project Ops − Synerion", className: diffClass },
                  { label: "Variance", value: total.variance === null ? "—" : signedChange(total.variance, "#,0%"), note: "Of Synerion", className: diffClass },
              ];
    return (
        <div className="mb-4">
            <div className="mb-2 text-200 font-semibold text-[var(--ink-muted)]">{period}</div>
            <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {items.map((item) => (
                    <div key={item.label} className="rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-center">
                        <dt className="ax-kpi-label">{item.label}</dt>
                        <dd className={`m-0 mt-1 text-[22px] font-semibold tabular-nums ${"className" in item ? (item.className ?? "") : ""}`}>{item.value}</dd>
                        <dd className="m-0 mt-0.5 text-200 text-muted-foreground">{item.note}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

/** One act of the Project Health story: a small numbered heading and its cards. */
function StoryAct({ step, title, question, children }: { step: number; title: string; question: string; children: ReactNode }): ReactElement {
    const id = `act-${step}`;
    return (
        <section aria-labelledby={id} className="flex flex-col gap-grid">
            <h2 id={id} className="ax-act m-0">
                <span className="ax-act-step">{step}</span>
                <span className="ax-act-title">{title}</span>
                <span className="ax-act-question">{question}</span>
            </h2>
            {children}
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
                {/* Dashed: the budget is a plan (Ion, 2026-11-16). Drawn as SVG so the dashes show around the point. */}
                <svg aria-hidden="true" width="30" height="10" viewBox="0 0 30 10" className="shrink-0 overflow-visible">
                    <line x1="0" y1="5" x2="30" y2="5" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="4 3" />
                    <circle cx="15" cy="5" r="3.5" fill="var(--ink)" stroke="var(--surface)" strokeWidth="2" />
                </svg>
                Budget hours (Backlog)
            </li>
            <li className="flex items-center gap-2">
                {/* Solid: Project Ops is what already happened. */}
                <svg aria-hidden="true" width="30" height="10" viewBox="0 0 30 10" className="shrink-0 overflow-visible">
                    <line x1="0" y1="5" x2="30" y2="5" stroke="var(--blue-300)" strokeWidth="2.5" />
                    <rect x="11.5" y="1.5" width="7" height="7" transform="rotate(45 15 5)" fill="var(--blue-300)" stroke="var(--surface)" strokeWidth="1.5" />
                </svg>
                Billed in Project Ops
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
 * to bill) and their shares, with a billed / left bar, in one column (Ion, 2026-11-13: % Actual and % Variance under
 * Variance), and the plan end date with the days left at its foot. Every figure is a model measure; the bar width shows
 * % Actual; the days left come from the viewer's local date.
 */
function ProjectBudget({ table, planEnd, status, projects }: { table: QueryTable; planEnd: Date | null; status: PlanEndStatus | null; projects: number | null }): ReactElement {
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
    // Billed over the SOW (Ion, 2026-11-16): the bar's scale stretches to the model's % Actual, a mark shows 100% of the
    // SOW, gold runs to it and the excess is a red striped segment. Widths only scale the model's value for display.
    const billed = progress === null ? 0 : Math.max(0, progress);
    const scale = Math.max(1, billed);
    const goldWidth = (Math.min(billed, 1) / scale) * 100;
    const overWidth = billed > 1 ? ((billed - 1) / scale) * 100 : 0;
    const markAt = (1 / scale) * 100;
    const leftPct = numberCell(table, c.leftToBillPct);
    const overSow = leftPct !== null && leftPct < 0;
    return (
        <section className="ax-card ax-spotlight ax-kpi-hero flex h-full flex-col" aria-label="Project budget">
            <div className="ax-kpi-label">{projects === null ? "Project budget · whole project life" : `Budget of ${projects} project${projects === 1 ? "" : "s"} · whole project life`}</div>
            <div className="mt-3 pt-4">
                <div className="ax-budget-track" aria-hidden="true">
                    <span className={cn("ax-budget-fill", overWidth > 0 && "is-capped")} style={{ width: `${goldWidth}%` }} />
                    {overWidth > 0 && <span className="ax-budget-over" style={{ left: `${goldWidth}%`, width: `${overWidth}%` }} />}
                    <span className="ax-budget-mark" style={{ left: `${markAt}%` }}>
                        <span className="ax-budget-mark-label">100% SOW</span>
                    </span>
                </div>
                <div className="mt-1 flex justify-between text-200 text-[var(--ink-muted)]">
                    <span>Billed {percent(c.progress)}</span>
                    {overSow ? (
                        <span className="flex items-center gap-1.5 font-semibold text-[var(--negative-ink)]">
                            <span className="ax-dot ax-dot-negative" aria-hidden="true" />
                            Over SOW by {String(formatValue(-(leftPct as number), PROJECTS_FORMATS.percent))}
                        </span>
                    ) : (
                        <span>Left {percent(c.leftToBillPct)}</span>
                    )}
                </div>
            </div>
            {/* The PMs' order: amounts, then the shares under Variance; the rows spread to the height of the week table beside it. */}
            <dl className="mx-0 mb-3 mt-3 flex flex-1 flex-col justify-evenly">
                {rows.map((r) => (
                    <div key={r.label} className="flex items-baseline justify-between gap-3 border-t border-white/10 py-2">
                        <dt className="m-0">
                            <span className="text-300 font-semibold text-[var(--ink)]">{r.label}</span>
                            <span className="ml-2 text-200 text-[var(--ink-muted)]">{r.note}</span>
                        </dt>
                        <dd className="m-0 text-[20px] font-semibold tabular-nums text-[var(--ink)]">{r.value}</dd>
                    </div>
                ))}
            </dl>
            <div className="ax-budget-end mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md px-3 py-2">
                <span className="text-200 text-[var(--ink-muted)]">
                    {projects === null ? "Plan end date" : "Latest plan end"} <span className="ml-1 text-300 font-semibold tabular-nums text-[var(--ink)]">{planEnd ? dateFormat.format(planEnd) : "—"}</span>
                </span>
                {projects !== null ? (
                    <span className="text-200 text-[var(--ink-muted)]">{projects} project{projects === 1 ? "" : "s"}</span>
                ) : status ? (
                    <span className="flex items-center gap-1.5 text-200 text-[var(--ink-muted)]">
                        <span className={`ax-dot ax-dot-${status.tone}`} aria-hidden="true" />
                        {describeDaysLeft(status.daysLeft)}
                    </span>
                ) : (
                    <span className="text-200 text-[var(--ink-muted)]">No plan dates</span>
                )}
            </div>
        </section>
    );
}

/**
 * Legend for the people x week matrix: what a cell shows and what each pill colour means. No sample numbers (Ion,
 * 2026-11-13: the old "−5 / +10 / 0" examples read as data). Status colours always carry the sign too.
 */
function MatrixLegend({ billedThrough }: { billedThrough: Date | null }): ReactElement {
    return (
        <div className="flex shrink-0 flex-col items-start gap-1 text-200 text-muted-foreground sm:items-end">
            {billedThrough && (
                <span>
                    Through {dateFormat.format(billedThrough)}: hours <strong className="font-semibold text-[var(--ink)]">billed in Project Ops</strong> · later weeks: Synerion
                </span>
            )}
            <span>
                Each cell: <strong className="font-semibold text-[var(--ink)]">hours</strong> · of budget · difference in hours
            </span>
            <ul className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0" aria-label="Legend">
                <li className="flex items-center gap-1.5">
                    <span className="ax-var-pill is-over">+</span> more hours than budget
                </li>
                <li className="flex items-center gap-1.5">
                    <span className="ax-var-pill is-under">−</span> fewer
                </li>
                <li className="flex items-center gap-1.5">
                    <span className="ax-var-pill is-even">0</span> on budget
                </li>
            </ul>
        </div>
    );
}

/**
 * One value of the week vs plan table. With a tone, it shows as a status pill (red over plan, green under): a
 * difference by its sign, a ratio against 100%. Status is never colour alone: the sign or the % carries it too.
 */
function WeekValue({ value, format, signed, tone }: { value: number; format: string; signed: boolean; tone?: "diff" | "ratio" }): ReactElement {
    const text = signed ? signedChange(value, format) : String(formatValue(value, format));
    if (!tone) return <>{text}</>;
    const delta = tone === "ratio" ? Math.round((value - 1) * 100) : Math.round(value);
    const kind = delta > 0 ? "over" : delta < 0 ? "under" : "even";
    return <span className={`ax-var-pill is-${kind}`}>{text}</span>;
}

