import { BUDGET_NEAR_SOW } from "@/queries/projects";

/** Where a project stands against its SOW. Read from the model's % Actual and Variance, never colour alone. */
export type BudgetStatus = "over" | "near" | "on-track" | "no-sow";

/**
 * Status of one project (P6 Budget by project): the sign of the model's Variance (left to bill), and its % Actual
 * against the "near" threshold. Presentation only: nothing here calculates a KPI.
 */
export function budgetStatus(planned: number | null, progress: number | null, leftToBill: number | null): BudgetStatus {
    if (planned === null || planned === 0 || progress === null) return "no-sow";
    // Rounded as shown (whole dollars): a project billed cents over its SOW shows a Variance of $0 and is not "over".
    if (leftToBill !== null && Math.round(leftToBill) < 0) return "over";
    return progress >= BUDGET_NEAR_SOW ? "near" : "on-track";
}

export type BudgetTone = "over" | "under" | null;

/**
 * Colour of a budget card figure (Ion, 2026-11-21): red when it says the SOW is exceeded, green when there is SOW
 * left, none on the line. Read from the model's value rounded as shown, so the colour never disagrees with the number.
 * `left` = Variance (left to bill, dollars) or % Variance; `progress` = % Actual (billed ÷ SOW).
 */
export function budgetTone(kind: "left" | "leftPct" | "progress", value: number | null): BudgetTone {
    if (value === null) return null;
    const shown = kind === "left" ? Math.round(value) : kind === "leftPct" ? Math.round(value * 100) : 100 - Math.round(value * 100);
    return shown < 0 ? "over" : shown > 0 ? "under" : null;
}
