import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { peopleBreakdownColumns as b, peopleWeekColumns as c, projectWeekColumns } from "@/queries/projects/projects-queries";
import { cell, numberCell } from "./query-table";

/**
 * Lays out the P6 people x week matrix (PMs, 2026-11-12) from the three model queries. Every number is a model
 * measure value placed in its row and week; nothing is computed here. Weeks run Sunday-Saturday.
 */
export interface MatrixCell {
    /** Matrix hours: Project Ops billed hours for integrated weeks, else Synerion (Ion, 2026-11-16). */
    hours: number | null;
    planned: number | null;
    diff: number | null;
    variance: number | null;
    /** Synerion hours of the same cell, and the matrix hours minus them (adjustments made in Project Ops). */
    synerion?: number | null;
    billedVsSynerion?: number | null;
    /** The cell's hours come from Project Ops (integrated week, not a Fixed Fee project). */
    fromProjectOps?: boolean;
}

export interface MatrixRow {
    key: string;
    label: string;
    /** `item`: one project of the aggregated project x week matrix (Ion, 2026-11-16). */
    kind: "person" | "role" | "services" | "project" | "item";
    /** Keyed by the week's Sunday, yyyy-mm-dd. */
    weeks: Record<string, MatrixCell>;
    total: MatrixCell;
}

const EMPTY: MatrixCell = { hours: null, planned: null, diff: null, variance: null };

/** yyyy-mm-dd of a model date ("2026-10-25T00:00:00.000") or of a local Date. */
export function weekKey(value: unknown): string | null {
    if (value instanceof Date) {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    }
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

const isTotal = (table: QueryTable, i: number) => cell(table, c.isWeekTotal, i) === true;
const has = (table: QueryTable, raw: string) => table.columns.some((col) => col.name === raw);

function readCell(table: QueryTable, i: number): MatrixCell {
    return {
        hours: numberCell(table, c.hours, i),
        planned: numberCell(table, c.plannedHours, i),
        diff: numberCell(table, c.diff, i),
        variance: numberCell(table, c.variance, i),
        // Source columns only where the query returns them (people and project rows of the matrix).
        ...(has(table, c.synerionHours) ? { synerion: numberCell(table, c.synerionHours, i) } : {}),
        ...(has(table, c.billedVsSynerion) ? { billedVsSynerion: numberCell(table, c.billedVsSynerion, i) } : {}),
        ...(has(table, c.fromProjectOps) ? { fromProjectOps: numberCell(table, c.fromProjectOps, i) === 1 } : {}),
    };
}

function groupRows(table: QueryTable, keyOf: (i: number) => string | null, labelOf: (i: number) => string, kind: MatrixRow["kind"], read: (i: number) => MatrixCell): MatrixRow[] {
    const rows = new Map<string, MatrixRow>();
    table.rows.forEach((_, i) => {
        const key = keyOf(i);
        if (key === null) return;
        let row = rows.get(key);
        if (!row) {
            row = { key, label: labelOf(i), kind, weeks: {}, total: EMPTY };
            rows.set(key, row);
        }
        if (isTotal(table, i)) row.total = read(i);
        else {
            const week = weekKey(cell(table, c.weekStart, i));
            if (week) row.weeks[week] = read(i);
        }
    });
    return [...rows.values()];
}

export interface PeopleMatrix {
    people: MatrixRow[];
    roles: MatrixRow[];
    services: MatrixRow | null;
    project: MatrixRow | null;
}

export function buildPeopleMatrix(people: QueryTable, roles: QueryTable, project: QueryTable): PeopleMatrix {
    const peopleRows = groupRows(
        people,
        (i) => {
            const n = cell(people, c.employeeNumber, i);
            return typeof n === "string" && n !== "" ? n : null;
        },
        (i) => String(cell(people, c.employeeName, i) ?? cell(people, c.employeeNumber, i) ?? ""),
        "person",
        (i) => readCell(people, i),
    );
    const roleRows = groupRows(
        roles,
        (i) => `role:${String(cell(roles, c.role, i) ?? "")}`,
        (i) => {
            const role = cell(roles, c.role, i);
            return typeof role === "string" && role.trim() !== "" ? role.trim() : "No role";
        },
        "role",
        (i) => ({ ...EMPTY, planned: numberCell(roles, c.plannedHours, i) }),
    );
    const [projectRow] = groupRows(project, () => "project", () => "Project", "project", (i) => readCell(project, i));
    const [servicesRow] = groupRows(project, () => "services", () => "Services (not people)", "services", (i) => ({ ...EMPTY, planned: numberCell(project, c.servicesPlannedHours, i) }));
    const hasServices = servicesRow && (servicesRow.total.planned ?? 0) !== 0;
    return { people: peopleRows, roles: roleRows, services: hasServices ? servicesRow : null, project: projectRow ?? null };
}

/**
 * The aggregated project x week matrix (Ion, 2026-11-16): one row per project from projects-projects-weeks.dax and the
 * total row from projects-project-weeks.dax, laid out like the people x week matrix.
 */
export function buildProjectMatrix(projects: QueryTable, total: QueryTable): PeopleMatrix {
    const rows = groupRows(
        projects,
        (i) => {
            const key = cell(projects, projectWeekColumns.projectKey, i);
            return typeof key === "string" && key !== "" ? key : null;
        },
        (i) => String(cell(projects, projectWeekColumns.projectName, i) ?? cell(projects, projectWeekColumns.projectKey, i) ?? ""),
        "item",
        (i) => readCell(projects, i),
    );
    const [totalRow] = groupRows(total, () => "project", () => "Total", "project", (i) => readCell(total, i));
    return { people: rows, roles: [], services: null, project: totalRow ?? null };
}

/**
 * The Sundays from the first week that holds data in the matrix rows to `current` (Ion, 2026-11-16: from the first
 * week of the project to the week in progress). Falls back to `current` alone when no row has a week.
 */
export function matrixWeeks(matrix: PeopleMatrix, current: Date): Date[] {
    const keys = [...matrix.people, ...matrix.roles, ...(matrix.project ? [matrix.project] : [])].flatMap((r) => Object.keys(r.weeks)).sort();
    const first = keys[0] ? new Date(`${keys[0]}T00:00:00`) : current;
    const out: Date[] = [];
    for (let d = first; d <= current; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) out.push(d);
    return out.length > 0 ? out : [current];
}

/** Over budget (more hours than planned) is red, under is green, on budget neutral (Ion, 2026-11-07). */
export function diffTone(diff: number | null): "over" | "under" | "even" | null {
    if (diff === null) return null;
    if (Math.round(diff) > 0) return "over";
    if (Math.round(diff) < 0) return "under";
    return "even";
}

// ---------------------------------------------------------------- cell tooltip (Ion, 2026-11-16)

export interface BreakdownPart {
    label: string;
    hours: number;
}

export interface BreakdownDay {
    /** The day's hours on the project, from the model. */
    total: number | null;
    /** The same hours by pay category, largest first. */
    parts: BreakdownPart[];
}

/** What one person's hours in one week (or in the whole window) are made of. Every number is a model value. */
export interface CellBreakdown {
    categories: BreakdownPart[];
    tasks: BreakdownPart[];
    /** Keyed by day, yyyy-mm-dd; empty for the window total. */
    days: Record<string, BreakdownDay>;
}

/** Key of a person's breakdown: the Auxis ID and the week's Sunday (yyyy-mm-dd), or "total" for the window. */
export const breakdownKey = (employeeNumber: string, week: string | null) => `${employeeNumber}|${week ?? "total"}`;

/** Places the breakdown query's rows by person and week; nothing is added up here. */
export function buildBreakdown(table: QueryTable): Map<string, CellBreakdown> {
    const out = new Map<string, CellBreakdown>();
    const get = (key: string) => {
        let entry = out.get(key);
        if (!entry) {
            entry = { categories: [], tasks: [], days: {} };
            out.set(key, entry);
        }
        return entry;
    };
    const text = (raw: string, i: number) => {
        const v = cell(table, raw, i);
        return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
    };
    table.rows.forEach((_, i) => {
        const employee = text(b.employeeNumber, i);
        const hours = numberCell(table, b.hours, i);
        if (employee === null || hours === null) return;
        const week = weekKey(text(b.week, i));
        const entry = get(breakdownKey(employee, week));
        const label = text(b.label, i);
        const kind = cell(table, b.kind, i);
        const day = weekKey(text(b.day, i));
        if (kind === "category" && label) entry.categories.push({ label, hours });
        else if (kind === "task") entry.tasks.push({ label: label ?? "No task", hours });
        else if ((kind === "day" || kind === "daytotal") && day) {
            const d = (entry.days[day] ??= { total: null, parts: [] });
            if (kind === "daytotal") d.total = hours;
            else if (label) d.parts.push({ label, hours });
        }
    });
    for (const entry of out.values()) {
        entry.categories.sort((x, y) => y.hours - x.hours);
        entry.tasks.sort((x, y) => y.hours - x.hours);
        for (const d of Object.values(entry.days)) d.parts.sort((x, y) => y.hours - x.hours);
    }
    return out;
}
