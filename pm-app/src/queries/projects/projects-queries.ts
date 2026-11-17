import { applyFilters } from "@/lib/filters";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import kpisQuery from "./projects-kpis.dax?raw";
import peopleQuery from "./projects-people.dax?raw";
import peopleBreakdownQuery from "./projects-people-breakdown.dax?raw";
import paceQuery from "./projects-pace.dax?raw";
import paceWeeksQuery from "./projects-pace-weeks.dax?raw";
import peopleWeeksQuery from "./projects-people-weeks.dax?raw";
import billedThroughQuery from "./projects-billed-through.dax?raw";
import paceByProjectQuery from "./projects-pace-by-project.dax?raw";
import projectWeeksQuery from "./projects-project-weeks.dax?raw";
import projectsWeeksQuery from "./projects-projects-weeks.dax?raw";
import revenueByMonthQuery from "./projects-revenue-by-month.dax?raw";
import roleWeeksQuery from "./projects-role-weeks.dax?raw";
import trendMonthsQuery from "./projects-trend-months.dax?raw";
import trendSummaryQuery from "./projects-trend-summary.dax?raw";
import weekQuery from "./projects-week.dax?raw";

/**
 * P6 Project Progress (docs/05_app_design.md § 3), for Project Managers. Every factory takes SUMMARIZECOLUMNS
 * filter arguments: the project goes to each fact's own project_key (lib/filters.ts FILTER_COLUMNS.project),
 * because every query through dim_project fails until open item #1 is fixed; weeks are Sunday–Saturday
 * dim_calendar[date] ranges from the viewer's local date (lib/weeks.ts).
 */
export interface ProjectsParams {
    filters?: readonly string[];
}

const CONNECTION = "profitmodel";
const MONEY = "\\$#,0;(\\$#,0);\\$#,0";

export const PROJECTS_FORMATS = {
    money: MONEY,
    hours: "#,0",
    people: "#,0",
    // Whole percents on P6 (Ion, 2026-11-07 and 2026-11-13: "nada de decimales").
    percent: "0%",
} as const;

// ---------------------------------------------------------------- KPI cards (whole project life)

export const projectsKpiColumns = {
    planned: "[Planned]",
    billed: "[Billed]",
    leftToBill: "[LeftToBill]",
    progress: "[Progress]",
    leftToBillPct: "[LeftToBillPct]",
    planEnd: "[PlanEnd]",
} as const;

/** `filters` must carry the project only: the measures cover the project's whole life. */
export function projectsKpis({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(kpisQuery, filters) } as const;
}

// ---------------------------------------------------------------- one week vs plan

export const projectsWeekColumns = {
    hours: "[Hours]",
    plannedHours: "[PlannedHours]",
    hoursVsPlan: "[HoursVsPlan]",
    hoursVsPlanPct: "[HoursVsPlanPct]",
    plannedRevenue: "[PlannedRevenue]",
    people: "[People]",
    notYetBilled: "[NotYetBilled]",
    variance: "[Variance]",
} as const;

/** One row for one week; run once per column (last week, this week to date) with that week's date range. */
export function projectsWeek({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(weekQuery, filters) } as const;
}

// ---------------------------------------------------------------- who logged time

export const projectsPeopleColumns = {
    employee: "[Employee]",
    tasks: "[Tasks]",
    payCategories: "[PayCategories]",
    hours: "[Hours]",
    totalHours: "[TotalHours]",
    timeAllocation: "[TimeAllocation]",
    flags: "[Flags]",
    flagOrder: "[FlagOrder]",
} as const;

function peopleMetadata(currentWeek: boolean): ColumnMetadataMap {
    return {
        [projectsPeopleColumns.employee]: { name: "Employee", displayName: "Employee" },
        [projectsPeopleColumns.tasks]: { name: "Tasks", displayName: "Tasks" },
        [projectsPeopleColumns.payCategories]: { name: "PayCategories", displayName: "Pay categories" },
        [projectsPeopleColumns.hours]: { name: "Hours", displayName: "Hours on project", format: "#,0.0" },
        [projectsPeopleColumns.totalHours]: { name: "TotalHours", displayName: currentWeek ? "All their hours (to date)" : "All their hours", format: "#,0.0" },
        [projectsPeopleColumns.timeAllocation]: { name: "TimeAllocation", displayName: "Time allocation", format: "0.0%" },
        [projectsPeopleColumns.flags]: { name: "Flags", displayName: "Flags" },
    };
}

/**
 * `filters` = project + the selected week. People flagged "No hours this week" (logged on the project in the
 * 4 weeks before, not in the week; for the current week: none logged yet) or "Unmapped task" come first.
 */
export function projectsPeople({ filters = [], currentWeek = false }: ProjectsParams & { currentWeek?: boolean } = {}) {
    return { connection: CONNECTION, query: applyFilters(peopleQuery, filters), columnMetadata: peopleMetadata(currentWeek) } as const;
}

// ---------------------------------------------------------------- revenue by month

export const projectsRevenueColumns = {
    month: "dim_calendar[year_month]",
    monthNumber: "dim_calendar[year_month_number]",
    actual: "[Actual]",
    planned: "[Planned]",
    vsPlan: "[VsPlan]",
    vsPlanPct: "[VsPlanPct]",
} as const;

const revenueMetadata: ColumnMetadataMap = {
    [projectsRevenueColumns.month]: { name: "Month", displayName: "Month" },
    [projectsRevenueColumns.actual]: { name: "Actual", displayName: "Actual revenue", format: MONEY },
    [projectsRevenueColumns.planned]: { name: "Planned", displayName: "Planned revenue", format: MONEY },
    [projectsRevenueColumns.vsPlan]: { name: "VsPlan", displayName: "Actual − plan", format: "\\$#,0;−\\$#,0;\\$#,0" },
    [projectsRevenueColumns.vsPlanPct]: { name: "VsPlanPct", displayName: "Actual / plan", format: "0.0%" },
};

/** `filters` = project + the 12-month window (`dateRangeArg(monthWindow(...))`). */
export function projectsRevenueByMonth({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(revenueByMonthQuery, filters), columnMetadata: revenueMetadata } as const;
}

// ---------------------------------------------------------------- weekly trend summary (12-week window)

/** Columns of the trend summary (one row) and of its monthly rows. */
export const projectsTrendSummaryColumns = {
    month: "dim_calendar[year_month]",
    monthNumber: "dim_calendar[year_month_number]",
    hours: "[Hours]",
    plannedHours: "[PlannedHours]",
    hoursVsPlan: "[HoursVsPlan]",
    variance: "[Variance]",
} as const;

/** `filters` = project + the trend's 12-week window (the same arguments as the weekly trend). */
export function projectsTrendSummary({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(trendSummaryQuery, filters) } as const;
}

/** One row per calendar month in the window; the first and last are usually partial. */
export function projectsTrendMonths({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(trendMonthsQuery, filters) } as const;
}

// ---------------------------------------------------------------- people x week (PMs, 2026-11-12)

/** Weeks in the people x week matrix: the current week and the 7 before it. */
export const PEOPLE_MATRIX_WEEKS = 8;

/** Raw columns shared by the three people x week queries. */
export const peopleWeekColumns = {
    employeeNumber: "dim_employee[employee_number]",
    employeeName: "dim_employee[employee_full_name]",
    role: "fact_revenue_metrics[resource_role]",
    weekStart: "dim_calendar[start_of_week_sun]",
    isWeekTotal: "[IsWeekTotal]",
    hours: "[Hours]",
    plannedHours: "[PlannedHours]",
    diff: "[Diff]",
    variance: "[Variance]",
    servicesPlannedHours: "[ServicesPlannedHours]",
    synerionHours: "[SynerionHours]",
    billedVsSynerion: "[BilledVsSynerion]",
    fromProjectOps: "[FromProjectOps]",
} as const;

/** `filters` = project + the matrix window. One row per person and week, plus each person's window total. */
export function projectsPeopleWeeks({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(peopleWeeksQuery, filters) } as const;
}

/** The project row: all hours vs the whole plan by week and in total, with the catalog-service plan (#27). */
export function projectsProjectWeeks({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(projectWeeksQuery, filters) } as const;
}

/** Plan not assigned to a person, by role and week, plus each role's window total. */
export function projectsRoleWeeks({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(roleWeeksQuery, filters) } as const;
}

/** Raw columns of the cell tooltip query (Ion, 2026-11-16). Week and Day are yyyy-mm-dd text; Week is blank on the window rows. */
export const peopleBreakdownColumns = {
    employeeNumber: "[Employee]",
    week: "[Week]",
    kind: "[Kind]",
    label: "[Label]",
    day: "[Day]",
    hours: "[Hours]",
} as const;

/**
 * `filters` = project + the matrix window. What each person's hours are made of: by pay category and by task per
 * week and for the window, and by day (total and per pay category). Feeds the matrix cell tooltips.
 */
export function projectsPeopleBreakdown({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(peopleBreakdownQuery, filters) } as const;
}

// ---------------------------------------------------------------- pace to plan end (act 4, Ion 2026-11-16)

/** Complete Sunday-Saturday weeks behind the current pace. */
export const PACE_WEEKS = 4;
/** Complete weeks of hours to date drawn in the burn-up. */
export const PACE_HISTORY_WEEKS = 26;

export const projectsPaceColumns = {
    budget: "[Budget]",
    toDate: "[ToDate]",
    left: "[Left]",
    used: "[Used]",
    pace: "[Pace]",
    weeksToEnd: "[WeeksToEnd]",
    needed: "[Needed]",
    runout: "[Runout]",
    weeksBefore: "[WeeksBefore]",
    planEnd: "[PlanEnd]",
} as const;

/** One row; `filters` carry the project and the last PACE_WEEKS complete weeks ("to date" = their last day). */
export function projectsPace({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(paceQuery, filters) } as const;
}

export const projectsPaceWeeksColumns = {
    week: "dim_calendar[start_of_week_sun]",
    hoursToDate: "[HoursToDate]",
} as const;

/** Hours to date at the end of each week; `filters` carry the project and the last PACE_HISTORY_WEEKS complete weeks. */
export function projectsPaceWeeks({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(paceWeeksQuery, filters) } as const;
}

// ---------------------------------------------------------------- aggregated view (Ion, 2026-11-16)

/** Weeks in the aggregated project x week matrix (several projects); one project shows every week from its first. */
export const AGGREGATE_MATRIX_WEEKS = 52;
/** Rows the aggregated matrix and the projects-by-pace table show before "Show all". */
export const AGGREGATE_ROWS = 25;

export const projectWeekColumns = {
    projectKey: "dim_project[project_key]",
    projectName: "dim_project[project_name]",
} as const;

/** One row per project in scope and week (plus each project's window total), same columns as the people x week query. */
export function projectsProjectsWeeks({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(projectsWeeksQuery, filters) } as const;
}

export const projectsPaceByProjectColumns = {
    projectKey: "dim_project[project_key]",
    projectName: "dim_project[project_name]",
    pm: "dim_project[project_manager_name]",
    ...projectsPaceColumns,
} as const;

/** The pace measures per project in scope; `filters` carry the projects and the last PACE_WEEKS complete weeks. */
export function projectsPaceByProject({ filters = [] }: ProjectsParams = {}) {
    return { connection: CONNECTION, query: applyFilters(paceByProjectQuery, filters) } as const;
}

/** Last day of T&M hours billed in Project Ops (the integration): matrix weeks up to it use Project Ops hours. */
export const BILLED_THROUGH_COLUMN = "[BilledThrough]";

export function projectsBilledThrough() {
    return { connection: CONNECTION, query: billedThroughQuery } as const;
}
