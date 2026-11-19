import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { daxString } from "./filters";
import { cell, numberCell } from "./query-table";
import { weekStartOf } from "./weeks";

/**
 * Resource Allocation (build plan 6.17, Ion 2026-11-19). Dates come from the viewer's local calendar and go to the
 * model as DATE literals (no TODAY() in DAX). Weeks run Sunday–Saturday; a month holds the weeks whose Sunday falls
 * in it. Every number shown comes from the model (queries/allocation/*.dax); this file only lays them out.
 */

/** Months in the window: this month and the next six. */
export const ALLOCATION_MONTHS = 7;

export interface AllocationMonth {
    /** `YYYY-MM`. */
    key: string;
    label: string;
    /** First Sunday of the month inside the window. */
    start: Date;
    /** Saturday of the month's last week. */
    end: Date;
    /** Index of the month's first week in the window, and how many weeks it holds. */
    firstWeek: number;
    weekCount: number;
}

export interface AllocationWindow {
    /** Sunday of this week. */
    from: Date;
    /** Saturday of the last week that starts in the last month. */
    to: Date;
    /** The window's Sundays, oldest first. */
    weeks: Date[];
    months: AllocationMonth[];
    /** Index of this week (always 0). */
    currentWeek: number;
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const pad = (n: number) => String(n).padStart(2, "0");
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

export function monthKeyOf(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** `yyyymmdd` of a Sunday, as the queries return it (`WeekKey`). */
export function weekKeyOf(d: Date): number {
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function allocationWindow(today: Date, months = ALLOCATION_MONTHS): AllocationWindow {
    const from = weekStartOf(today);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() + months - 1, 1);
    const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    const weeks: Date[] = [];
    for (let d = from; d <= lastDay; d = addDays(d, 7)) weeks.push(d);
    const out: AllocationMonth[] = [];
    weeks.forEach((sunday, i) => {
        const key = monthKeyOf(sunday);
        const last = out[out.length - 1];
        if (last && last.key === key) {
            last.weekCount += 1;
            last.end = addDays(sunday, 6);
        } else {
            out.push({ key, label: monthLabel.format(sunday), start: sunday, end: addDays(sunday, 6), firstWeek: i, weekCount: 1 });
        }
    });
    return { from, to: addDays(weeks[weeks.length - 1], 6), weeks, months: out, currentWeek: 0 };
}

const daxDate = (d: Date) => `DATE ( ${d.getFullYear()}, ${d.getMonth() + 1}, ${d.getDate()} )`;

/** Fills the date tokens of an allocation query. */
export function fillAllocationDates(query: string, window: AllocationWindow, month: AllocationMonth, today: Date): string {
    return query
        .replaceAll("@@FROM@@", daxDate(window.from))
        .replaceAll("@@TO@@", daxDate(window.to))
        .replaceAll("@@MONTH_FROM@@", daxDate(month.start))
        .replaceAll("@@MONTH_TO@@", daxDate(month.end))
        .replaceAll("@@TODAY@@", daxDate(today));
}

// ---------------------------------------------------------------- filters

export type ShowFilter = "all" | "available" | "over";
/** Available (Ion, 2026-11-19): at least this many free hours a week on average in the month (1 day, half time, full time). */
export type AvailableMin = 8 | 20 | 40;
export const AVAILABLE_MINS: readonly AvailableMin[] = [8, 20, 40];
export type AllocationOrder = "revenue" | "free" | "name";

export interface AllocationFilters {
    role?: string;
    l1?: string;
    month: string;
    show: ShowFilter;
    order: AllocationOrder;
}

export interface AllocationOptions {
    roles: string[];
    l1s: string[];
}

export function readOptions(table: QueryTable): AllocationOptions {
    const roles: string[] = [];
    const l1s: string[] = [];
    table.rows.forEach((_, i) => {
        const kind = cell(table, "[Kind]", i);
        const value = cell(table, "[Value]", i);
        if (typeof value !== "string" || value === "") return;
        if (kind === "role") roles.push(value);
        else if (kind === "l1") l1s.push(value);
    });
    return { roles, l1s };
}

/**
 * SUMMARIZECOLUMNS filter arguments that pick the people. Values must come from the option lists (whitelist);
 * they are written as escaped DAX strings. L1 is the person's current org (UKG job history, through the UKG id).
 */
export function allocationFilterArgs(filters: Pick<AllocationFilters, "role" | "l1">, options: AllocationOptions): string[] {
    const args: string[] = [];
    if (filters.role !== undefined && options.roles.includes(filters.role)) {
        args.push(`KEEPFILTERS ( TREATAS ( { ${daxString(filters.role)} }, fact_revenue_metrics[resource_role] ) )`);
    }
    if (filters.l1 !== undefined && options.l1s.includes(filters.l1)) {
        args.push(
            "KEEPFILTERS ( TREATAS ( CALCULATETABLE ( VALUES ( dim_employee[employee_number] ), TREATAS ( CALCULATETABLE ( " +
                `VALUES ( dim_employee_history[ukg_employee_id] ), dim_employee_history[L1] = ${daxString(filters.l1)}, ` +
                "dim_employee_history[effective_date] <= _today, dim_employee_history[end_date] > _today ), " +
                "dim_employee[ukg_employee_id] ) ), fact_revenue_metrics[employee_number] ) )",
        );
    }
    return args;
}

export interface PersonChoice {
    employeeNumber: string;
    /** What the Person search shows and matches: the name, plus the Auxis ID when two people share it. */
    label: string;
    /** Role · L1, as a hint in the suggestions. */
    hint: string;
}

/**
 * Person search choices (Ion, 2026-11-19): the people the Role and L1 filters leave, sorted by name. The list comes
 * from the model (allocation people query), so it is also the whitelist for the person filter.
 */
export function personChoices(people: readonly AllocationPerson[]): PersonChoice[] {
    const count = new Map<string, number>();
    for (const p of people) count.set(p.name, (count.get(p.name) ?? 0) + 1);
    return [...people]
        .sort((a, b) => a.name.localeCompare(b.name) || a.employeeNumber.localeCompare(b.employeeNumber))
        .map((p) => ({
            employeeNumber: p.employeeNumber,
            label: (count.get(p.name) ?? 0) > 1 ? `${p.name} · Auxis ID ${p.employeeNumber}` : p.name,
            hint: [p.role, p.l1].filter((v) => v !== null).join(" · "),
        }));
}

/** The choice whose label matches the typed text (any case, outer spaces ignored), or null. */
export function findPerson(choices: readonly PersonChoice[], typed: string): PersonChoice | null {
    const t = typed.trim().toLowerCase();
    return t === "" ? null : (choices.find((c) => c.label.toLowerCase() === t) ?? null);
}

/** The person filter (detail query, and the Person search on every query). */
export function personArg(employeeNumber: string): string {
    return `KEEPFILTERS ( TREATAS ( { ${daxString(employeeNumber)} }, fact_revenue_metrics[employee_number] ) )`;
}

// ---------------------------------------------------------------- results

export interface AllocationPerson {
    employeeNumber: string;
    name: string;
    role: string | null;
    l1: string | null;
    monthHours: number | null;
    monthRevenue: number | null;
    freeHours: number | null;
    overHours: number | null;
    peakHours: number | null;
    rate: number | null;
    /** The month's free hours over its weeks (model). */
    freePerWeek: number | null;
}

const text = (table: QueryTable, column: string, i: number) => {
    const v = cell(table, column, i);
    return typeof v === "string" && v !== "" ? v : null;
};

export function readPeople(table: QueryTable): AllocationPerson[] {
    return table.rows
        .map((_, i) => {
            const employeeNumber = text(table, "[EmployeeNumber]", i);
            if (employeeNumber === null) return null;
            return {
                employeeNumber,
                name: text(table, "[Employee]", i) ?? `Auxis ID ${employeeNumber}`,
                role: text(table, "[Role]", i),
                l1: text(table, "[L1]", i),
                monthHours: numberCell(table, "[MonthHours]", i),
                monthRevenue: numberCell(table, "[MonthRevenue]", i),
                freeHours: numberCell(table, "[FreeHours]", i),
                overHours: numberCell(table, "[OverHours]", i),
                peakHours: numberCell(table, "[PeakHours]", i),
                rate: numberCell(table, "[Rate]", i),
                freePerWeek: numberCell(table, "[FreePerWeek]", i),
            };
        })
        .filter((p): p is AllocationPerson => p !== null);
}

export interface AllocationKpis {
    people: number | null;
    revenue: number | null;
    freeHours: number | null;
    overPeople: number | null;
}

export function readKpis(table: QueryTable): AllocationKpis {
    return {
        people: numberCell(table, "[People]"),
        revenue: numberCell(table, "[Revenue]"),
        freeHours: numberCell(table, "[FreeHours]"),
        overPeople: numberCell(table, "[OverPeople]"),
    };
}

export type WeekLoad = "free" | "full" | "over";

export interface WeekCell {
    hours: number;
    free: number;
    over: number;
    freeShare: number;
}

/** Person → week key → planned hours and free / over hours (model values). A missing week has no T&M hours. */
export function readWeeks(table: QueryTable): Map<string, Map<number, WeekCell>> {
    const out = new Map<string, Map<number, WeekCell>>();
    table.rows.forEach((_, i) => {
        const person = text(table, "[EmployeeNumber]", i);
        const week = numberCell(table, "[WeekKey]", i);
        const hours = numberCell(table, "[Hours]", i);
        if (person === null || week === null || hours === null) return;
        const map = out.get(person) ?? new Map<number, WeekCell>();
        map.set(week, {
            hours,
            free: numberCell(table, "[Free]", i) ?? 0,
            over: numberCell(table, "[Over]", i) ?? 0,
            freeShare: numberCell(table, "[FreeShare]", i) ?? 0,
        });
        out.set(person, map);
    });
    return out;
}

/**
 * How a week reads in the strip: over 40 h, full, or free. Whole hours, like the pills and the tooltip (Ion,
 * 2026-11-19: 40.11 h planned read as over in the strip and full everywhere else): under half an hour over or
 * free reads as full.
 */
export function weekLoad(cellValue: WeekCell | undefined): WeekLoad {
    if (cellValue === undefined) return "free";
    if (Math.round(cellValue.over) > 0) return "over";
    return Math.round(cellValue.free) > 0 ? "free" : "full";
}

export interface BookingSegment {
    /** Window week indexes, inclusive. */
    first: number;
    last: number;
    /** The model's planned hours for each week of the segment, in order. */
    hours: number[];
}

export interface Booking {
    project: string;
    segments: BookingSegment[];
}

/**
 * Person → bookings (one per project), each split into runs of consecutive weeks with planned hours. Only joins
 * weeks for the drawing; the hours are the model's weekly values.
 */
export function readBookings(table: QueryTable, window: AllocationWindow): Map<string, Booking[]> {
    const index = new Map(window.weeks.map((w, i) => [weekKeyOf(w), i]));
    const byPerson = new Map<string, Map<string, Map<number, number>>>();
    table.rows.forEach((_, i) => {
        const person = text(table, "[EmployeeNumber]", i);
        const project = text(table, "[Project]", i);
        const week = numberCell(table, "[WeekKey]", i);
        const hours = numberCell(table, "[Hours]", i);
        if (person === null || project === null || week === null || hours === null || hours <= 0) return;
        const w = index.get(week);
        if (w === undefined) return;
        const projects = byPerson.get(person) ?? new Map<string, Map<number, number>>();
        const weeks = projects.get(project) ?? new Map<number, number>();
        weeks.set(w, hours);
        projects.set(project, weeks);
        byPerson.set(person, projects);
    });
    const out = new Map<string, Booking[]>();
    for (const [person, projects] of byPerson) {
        const bookings: Booking[] = [];
        for (const [project, weeks] of projects) {
            const sorted = [...weeks.keys()].sort((a, b) => a - b);
            const segments: BookingSegment[] = [];
            for (const w of sorted) {
                const current = segments[segments.length - 1];
                if (current && w === current.last + 1) {
                    current.last = w;
                    current.hours.push(weeks.get(w)!);
                } else {
                    segments.push({ first: w, last: w, hours: [weeks.get(w)!] });
                }
            }
            bookings.push({ project, segments });
        }
        bookings.sort((a, b) => a.segments[0].first - b.segments[0].first || a.project.localeCompare(b.project));
        out.set(person, bookings);
    }
    return out;
}

export interface DetailRow {
    project: string;
    hours: number | null;
    rate: number | null;
    revenue: number | null;
    share: number | null;
}

export function readDetail(table: QueryTable): DetailRow[] {
    return table.rows
        .map((_, i) => ({
            project: text(table, "[Project]", i) ?? "",
            hours: numberCell(table, "[Hours]", i),
            rate: numberCell(table, "[Rate]", i),
            revenue: numberCell(table, "[Revenue]", i),
            share: numberCell(table, "[Share]", i),
        }))
        .filter((r) => r.project !== "");
}

/** The detail row with the lowest billing rate when the person has more than one project with a rate. */
export function lowestRate(rows: readonly DetailRow[]): DetailRow | null {
    const rated = rows.filter((r) => r.rate !== null);
    if (rated.length < 2) return null;
    return rated.reduce((low, r) => (r.rate! < low.rate! ? r : low));
}

/** Hours as the page shows them (no decimals): under half an hour free or over reads as none. */
export const shownHours = (v: number | null) => Math.round(v ?? 0);

/** How the person reads in the month: over 40 h in some week, with free hours, or fully booked (as shown, whole hours). */
export function personLoad(p: AllocationPerson): WeekLoad {
    if (shownHours(p.overHours) > 0) return "over";
    return shownHours(p.freeHours) > 0 ? "free" : "full";
}

/** Available: at least `min` free hours a week on average (whole hours) and never over 40 h in the month. */
export function isAvailable(p: AllocationPerson, min: AvailableMin): boolean {
    return personLoad(p) !== "over" && shownHours(p.freePerWeek) >= min;
}

/** Applies the Show filter and the order (model values only), grouped by role. */
export function arrangePeople(people: readonly AllocationPerson[], show: ShowFilter, order: AllocationOrder, min: AvailableMin = 8): AllocationPerson[] {
    const shown = people.filter((p) => show === "all" || (show === "over" ? personLoad(p) === "over" : isAvailable(p, min)));
    const byOrder = (a: AllocationPerson, b: AllocationPerson) => {
        if (order === "name") return a.name.localeCompare(b.name);
        if (order === "free") return (b.freeHours ?? 0) - (a.freeHours ?? 0) || a.name.localeCompare(b.name);
        if (show === "over") return (b.overHours ?? 0) - (a.overHours ?? 0) || a.name.localeCompare(b.name);
        return (b.monthRevenue ?? 0) - (a.monthRevenue ?? 0) || a.name.localeCompare(b.name);
    };
    return [...shown].sort((a, b) => (a.role ?? "~").localeCompare(b.role ?? "~") || byOrder(a, b));
}

// ---------------------------------------------------------------- week tooltip

/** Capacity a week, as the queries use it (open item #36); shown in the tooltip, never used to compute. */
export const WEEK_CAPACITY = 40;
/** A day above this many planned hours is marked in the tooltip (Ion, 2026-11-19: 40 h over 5 days). */
export const DAY_LIMIT = 8;

export interface WeekDetail {
    hours: number | null;
    revenue: number | null;
    projects: { project: string; hours: number | null; revenue: number | null }[];
    /** `YYYY-MM-DD` → planned hours. */
    days: Map<string, number>;
}

export function readWeekDetail(table: QueryTable): WeekDetail {
    const detail: WeekDetail = { hours: null, revenue: null, projects: [], days: new Map() };
    table.rows.forEach((_, i) => {
        const kind = cell(table, "[Kind]", i);
        const key = text(table, "[Key]", i);
        const hours = numberCell(table, "[Hours]", i);
        const revenue = numberCell(table, "[Revenue]", i);
        if (kind === "total") {
            detail.hours = hours;
            detail.revenue = revenue;
        } else if (kind === "project" && key !== null) {
            detail.projects.push({ project: key, hours, revenue });
        } else if (kind === "day" && key !== null && hours !== null) {
            detail.days.set(key, hours);
        }
    });
    detail.projects.sort((a, b) => (b.hours ?? 0) - (a.hours ?? 0) || a.project.localeCompare(b.project));
    return detail;
}
