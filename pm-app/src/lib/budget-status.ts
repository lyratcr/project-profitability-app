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
