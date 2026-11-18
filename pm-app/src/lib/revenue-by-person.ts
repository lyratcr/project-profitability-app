import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { projectsRevenueByPersonColumns as p, projectsRevenueUnassignedColumns as u } from "@/queries/projects/projects-queries";
import { cell, numberCell } from "./query-table";

/** Revenue by person (act 3, Ion 2026-11-17): "To date" (through the integration cutoff) or the whole project. */
export type RevenueView = "to-date" | "whole";

/** One person's revenue as the model returns it (null = blank); nothing here is computed. */
export interface PersonRevenue {
    key: string;
    name: string;
    billed: number | null;
    backlog: number | null;
    /** The model's % Execution (billed vs the person's Backlog; 100% when they bill with no Backlog of their own). */
    execution: number | null;
}

export function readPeopleRevenue(table: QueryTable, view: RevenueView): PersonRevenue[] {
    const toDate = view === "to-date";
    return table.rows.map((_, i) => ({
        key: String(cell(table, p.employeeNumber, i) ?? i),
        name: String(cell(table, p.employeeName, i) ?? cell(table, p.employeeNumber, i) ?? ""),
        billed: numberCell(table, toDate ? p.billedToDate : p.billed, i),
        backlog: numberCell(table, toDate ? p.backlogToDate : p.backlog, i),
        execution: numberCell(table, toDate ? p.execToDate : p.exec, i),
    }));
}

/** Backlog planned for roles with no person, for the chips. */
export function readUnassignedRevenue(table: QueryTable, view: RevenueView): { role: string; backlog: number | null }[] {
    return table.rows.map((_, i) => ({
        role: String(cell(table, u.role, i) ?? "No role"),
        backlog: numberCell(table, view === "to-date" ? u.backlogToDate : u.backlog, i),
    }));
}

/**
 * Colour band of a person's tile (Ion, 2026-11-17: colourful but professional, official palette). Reads the model's
 * % as shown (whole percents). `no-plan`: billing with no Backlog line of their own (the model returns 100% then).
 */
export type ExecutionBand = "ahead" | "on" | "behind" | "well-behind" | "no-plan";

export function executionBand(person: Pick<PersonRevenue, "backlog" | "execution">): ExecutionBand {
    if (person.backlog === null || person.backlog === 0) return "no-plan";
    const pct = Math.round((person.execution ?? 0) * 100);
    if (pct > 105) return "ahead";
    if (pct >= 95) return "on";
    if (pct >= 75) return "behind";
    return "well-behind";
}
