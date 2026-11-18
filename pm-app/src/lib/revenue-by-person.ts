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
    /** The person's share of what the project billed (model). */
    share: number | null;
}

export function readPeopleRevenue(table: QueryTable, view: RevenueView): PersonRevenue[] {
    const toDate = view === "to-date";
    return table.rows.map((_, i) => ({
        key: String(cell(table, p.employeeNumber, i) ?? i),
        name: String(cell(table, p.employeeName, i) ?? cell(table, p.employeeNumber, i) ?? ""),
        billed: numberCell(table, toDate ? p.billedToDate : p.billed, i),
        backlog: numberCell(table, toDate ? p.backlogToDate : p.backlog, i),
        execution: numberCell(table, toDate ? p.execToDate : p.exec, i),
        share: numberCell(table, toDate ? p.shareToDate : p.share, i),
    }));
}

/** Backlog planned for roles with no person, for the chips. */
export function readUnassignedRevenue(table: QueryTable, view: RevenueView): { role: string; backlog: number | null }[] {
    return table.rows.map((_, i) => ({
        role: String(cell(table, u.role, i) ?? "No role"),
        backlog: numberCell(table, view === "to-date" ? u.backlogToDate : u.backlog, i),
    }));
}

/** No Backlog line of their own: they bill on a role's or nobody's plan (the model returns 100% then). */
export function hasNoPlan(person: Pick<PersonRevenue, "backlog">): boolean {
    return person.backlog === null || person.backlog === 0;
}

/**
 * Colour tier of a person's tile: their share of what the project billed (Ion, 2026-11-17: colour by each person's %
 * of the project total, so the tiles show variety). Reads the model's share as shown (whole percents). The person's
 * progress against their own Backlog stays in the pill.
 */
export type ShareTier = "25" | "15" | "10" | "5" | "0";

export function shareTier(share: number | null): ShareTier {
    const pct = Math.round((share ?? 0) * 100);
    if (pct >= 25) return "25";
    if (pct >= 15) return "15";
    if (pct >= 10) return "10";
    if (pct >= 5) return "5";
    return "0";
}
