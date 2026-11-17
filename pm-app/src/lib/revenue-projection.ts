import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { projectsRevenueProjectionColumns as c, projectsRevenueProjectionWeeksColumns as w } from "@/queries/projects/projects-queries";
import { parseModelDate } from "./plan-end";
import { cell, numberCell } from "./query-table";

/** The revenue projection measures (docs/08_app_measures.md § 22) as the model returns them (null = blank). */
export interface ProjectionValues {
    sow: number | null;
    billed: number | null;
    ahead: number | null;
    projected: number | null;
    vsSow: number | null;
    vsSowPct: number | null;
    /** Whole SOW in scope, Fixed Fee included: what the projection leaves out. */
    allSow: number | null;
    cutoff: Date | null;
    planEnd: Date | null;
}

export function readProjection(table: QueryTable): ProjectionValues {
    return {
        sow: numberCell(table, c.sow),
        billed: numberCell(table, c.billed),
        ahead: numberCell(table, c.ahead),
        projected: numberCell(table, c.projected),
        vsSow: numberCell(table, c.vsSow),
        vsSowPct: numberCell(table, c.vsSowPct),
        allSow: numberCell(table, c.allSow),
        cutoff: parseModelDate(cell(table, c.cutoff)),
        planEnd: parseModelDate(cell(table, c.planEnd)),
    };
}

/**
 * Which story the Revenue to plan end card tells (Guille, 2026-11-17). Only reads the model's values and the sign of
 * the model's difference; every number shown is a model measure.
 * - `fixed-fee`: nothing to project (Fixed Fee projects only; #17, #26).
 * - `over`: projected revenue at plan end above the SOW.
 * - `short`: below the SOW.
 * - `on`: within half a percent of the SOW (the model's percent rounds to 0%).
 */
export type ProjectionStory = "fixed-fee" | "over" | "short" | "on";

export function projectionStory(v: ProjectionValues): ProjectionStory {
    if (v.sow === null || v.projected === null || v.vsSow === null) return "fixed-fee";
    if (v.vsSowPct !== null && Math.round(v.vsSowPct * 100) === 0) return "on";
    return v.vsSow > 0 ? "over" : v.vsSow < 0 ? "short" : "on";
}

export interface WeekPoint {
    start: Date;
    /** The week's Saturday: cumulative values are "at the end of the week". */
    end: Date;
    cumulative: number;
    plan: number | null;
    integrated: boolean;
}

/** One point per model row; a week before anything is billed starts the line at 0 (display baseline). */
export function readProjectionWeeks(table: QueryTable): WeekPoint[] {
    return table.rows
        .map((_, i) => {
            const start = parseModelDate(cell(table, w.week, i));
            if (!start) return null;
            return {
                start,
                end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6),
                cumulative: numberCell(table, w.cumulative, i) ?? 0,
                plan: numberCell(table, w.planCumulative, i),
                integrated: numberCell(table, w.integrated, i) === 1,
            };
        })
        .filter((p): p is WeekPoint => p !== null);
}
