/**
 * P6 "Plan end date with days left" (docs/05_app_design.md P6): < 30 days red, < 90 amber. The plan end date
 * comes from the model ([Plan End Date_app]); days left count from the viewer's local date, like every week
 * window, because TODAY() in DAX runs in UTC on the service (open item #14).
 */
export type PlanEndTone = "negative" | "warning" | "positive";

export interface PlanEndStatus {
    /** Whole calendar days from today to the plan end (negative once it has passed). */
    daysLeft: number;
    tone: PlanEndTone;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Reads a model date ("2028-06-01T00:00:00.000") as a local calendar day; null for anything else. */
export function parseModelDate(value: unknown): Date | null {
    if (typeof value !== "string") return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return null;
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function planEndStatus(planEnd: Date, today: Date): PlanEndStatus {
    // UTC day numbers, so a daylight-saving change between the two dates doesn't shift the count.
    const toDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;
    const daysLeft = toDay(planEnd) - toDay(today);
    const tone: PlanEndTone = daysLeft < 30 ? "negative" : daysLeft < 90 ? "warning" : "positive";
    return { daysLeft, tone };
}

export function describeDaysLeft(daysLeft: number): string {
    if (daysLeft < 0) return `Ended ${Math.abs(daysLeft).toLocaleString("en-US")} days ago`;
    if (daysLeft === 0) return "Ends today";
    return `${daysLeft.toLocaleString("en-US")} ${daysLeft === 1 ? "day" : "days"} left`;
}
