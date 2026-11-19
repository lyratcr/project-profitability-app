import { applyFilters, daxString } from "@/lib/filters";
import { fillAllocationDates, type AllocationMonth, type AllocationWindow } from "@/lib/allocation";
import setHead from "./allocation-set.dax?raw";
import peopleVars from "./allocation-people-vars.dax?raw";
import peopleTail from "./allocation-people.dax?raw";
import kpisTail from "./allocation-kpis.dax?raw";
import weeksTail from "./allocation-weeks.dax?raw";
import bookingsTail from "./allocation-bookings.dax?raw";
import detailQuery from "./allocation-detail.dax?raw";
import optionsQuery from "./allocation-options.dax?raw";
import weekQuery from "./allocation-week.dax?raw";

/**
 * Resource Allocation (build plan 6.17, Ion 2026-11-19). Every query but the options and the detail starts with
 * allocation-set.dax (the people the role and L1 filters pick); the people list and the KPIs share the per-person
 * month figures (allocation-people-vars.dax), so the KPI row always matches the list.
 */
const CONNECTION = "profitmodel";

export const ALLOCATION_FORMATS = {
    hours: "#,0",
    money: "\\$#,0;(\\$#,0);\\$#,0",
    // No decimals on the PM app, % included (Ion).
    percent: "0%",
} as const;

export interface AllocationQueryParams {
    window: AllocationWindow;
    month: AllocationMonth;
    today: Date;
    /** Role and L1 filter arguments (lib/allocation.ts allocationFilterArgs). */
    filters: readonly string[];
}

function build(text: string, { window, month, today, filters }: AllocationQueryParams) {
    return { connection: CONNECTION, query: fillAllocationDates(applyFilters(text, filters), window, month, today) } as const;
}

export function allocationPeople(params: AllocationQueryParams) {
    return build(setHead + peopleVars + peopleTail, params);
}

export function allocationKpis(params: AllocationQueryParams) {
    return build(setHead + peopleVars + kpisTail, params);
}

export function allocationWeeks(params: AllocationQueryParams) {
    return build(setHead + weeksTail, params);
}

export function allocationBookings(params: AllocationQueryParams) {
    return build(setHead + bookingsTail, params);
}

/** One person's projects in the month; `filters` = the person (lib/allocation.ts personArg). */
export function allocationDetail(params: AllocationQueryParams) {
    return build(detailQuery, params);
}

export function allocationOptions({ window, month, today }: Omit<AllocationQueryParams, "filters">) {
    return { connection: CONNECTION, query: fillAllocationDates(optionsQuery, window, month, today) } as const;
}

const daxDate = (d: Date) => `DATE ( ${d.getFullYear()}, ${d.getMonth() + 1}, ${d.getDate()} )`;

/** The week tooltip (Ion, 2026-11-19): one person's planned T&M hours in one Sunday–Saturday week, by project and day. */
export function allocationWeek(employeeNumber: string, weekStart: Date) {
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
    return {
        connection: CONNECTION,
        query: weekQuery
            .replaceAll("@@WEEK_FROM@@", daxDate(weekStart))
            .replaceAll("@@WEEK_TO@@", daxDate(weekEnd))
            .replaceAll("@@PERSON@@", daxString(employeeNumber)),
    } as const;
}
