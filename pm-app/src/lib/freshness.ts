/**
 * Data-freshness helpers for the top bar. Dates come from the model as ISO strings
 * ("2026-11-03T00:00:00.000") with no time zone meaning; they are read as calendar days
 * in the viewer's local time. "Today" is always the viewer's local date (never the service's UTC).
 */

/** Reads a model date value as a local calendar day, or null if it is missing or not a date. */
export function parseModelDate(value: unknown): Date | null {
    if (typeof value !== "string") return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return null;
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * The Saturday that ends the most recent complete Sunday–Saturday week before `today` (Auxis weeks
 * start on Sunday). Sunday → yesterday; Saturday → the Saturday a week earlier (today's week is not
 * complete yet).
 */
export function lastCompleteWeekEnd(today: Date): Date {
    const day = startOfDay(today);
    const back = (day.getDay() + 1) % 7 || 7;
    return new Date(day.getFullYear(), day.getMonth(), day.getDate() - back);
}

/** Hours are stale when the last loaded Synerion day is earlier than the last complete week's Saturday. */
export function isHoursStale(lastSynerionDate: Date | null, today: Date): boolean {
    if (lastSynerionDate === null) return false;
    return startOfDay(lastSynerionDate) < lastCompleteWeekEnd(today);
}

const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function formatDay(date: Date | null): string {
    return date === null ? "—" : dayFormat.format(date);
}
