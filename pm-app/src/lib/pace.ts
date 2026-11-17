import { lastWeek } from "./weeks";

/**
 * The last `count` complete Sunday–Saturday weeks before the current one, from the viewer's local date: the
 * date range behind the pace measures (docs/08_app_measures.md § 19). Its last day (last Saturday) is "to date".
 */
export function completeWeeksWindow(today: Date, count: number): { start: Date; end: Date } {
    const end = lastWeek(today).weekEnd;
    return { start: new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7 * count + 1), end };
}

/** The pace measures of one project, as the model returns them (null = blank). */
export interface PaceValues {
    budget: number | null;
    toDate: number | null;
    left: number | null;
    pace: number | null;
    weeksToEnd: number | null;
    needed: number | null;
    runout: Date | null;
    weeksBefore: number | null;
    planEnd: Date | null;
}

/**
 * Which story the Pace to plan end card tells. Only reads the model's values and their signs; every number it
 * shows is a model measure.
 * - `no-budget`: no hours budget (Fixed Fee plan, or no plan hours; open items #26, #27).
 * - `plan-ended`: the plan end is behind "to date".
 * - `over-budget`: the hours to date already passed the budget, before the plan end.
 * - `no-pace`: budget left but no hours in the pace weeks, so no runout date.
 * - `runs-out-early`: at the current pace the budget runs out before the plan end.
 * - `lasts`: at the current pace the budget lasts until the plan end (or later).
 */
export type PaceStory = "no-budget" | "plan-ended" | "over-budget" | "no-pace" | "runs-out-early" | "lasts";

export function paceStory(v: PaceValues): PaceStory {
    if (v.budget === null) return "no-budget";
    if (v.weeksToEnd !== null && v.weeksToEnd <= 0) return "plan-ended";
    if (v.left !== null && v.left <= 0) return "over-budget";
    if (v.runout === null || v.weeksBefore === null) return "no-pace";
    return v.weeksBefore > 0 ? "runs-out-early" : "lasts";
}
