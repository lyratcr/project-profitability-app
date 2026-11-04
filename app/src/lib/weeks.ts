/**
 * Week logic for P6 (build plan 2.3). Auxis weeks run **Sunday–Saturday** (Ion, 2026-11-04), as
 * dim_calendar[start_of_week_sun] / [end_of_week_sat]. Every window comes from the viewer's local date
 * and goes to the model as a dim_calendar[date] range; there is no TODAY() in DAX (the service runs in UTC).
 *
 * dim_calendar[year_week] is not used: it is a Monday-based ISO week, and its label takes the calendar
 * year, so "2025 W01" holds both Jan 1–5 2025 and Dec 29–31 2025 (open item #22).
 */

export interface Week {
    /** Sunday. */
    start: Date;
    /** Saturday, or today for the current week ("to date"). */
    end: Date;
    /** Saturday of the week, even when `end` is cut at today. */
    weekEnd: Date;
    /** URL form: w:2026-11-01 (the Sunday). */
    token: string;
    isCurrent: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Sunday of the week that holds `date` (local calendar day). */
export function weekStartOf(date: Date): Date {
    const d = day(date);
    return addDays(d, -d.getDay()); // getDay(): Sun 0 … Sat 6
}

/** The Sunday–Saturday week that starts on `sunday`; the current week ends at `today`. */
export function weekStarting(sunday: Date, today: Date): Week {
    const start = weekStartOf(sunday);
    const weekEnd = addDays(start, 6);
    const isCurrent = start.getTime() === weekStartOf(today).getTime();
    return { start, end: isCurrent ? day(today) : weekEnd, weekEnd, token: `w:${ymd(start)}`, isCurrent };
}

export function thisWeek(today: Date): Week {
    return weekStarting(weekStartOf(today), today);
}

export function lastWeek(today: Date): Week {
    return weekStarting(addDays(weekStartOf(today), -7), today);
}

/** Parses `w:YYYY-MM-DD`; only a real Sunday that is not in the future is accepted. */
export function parseWeek(token: string | null, today: Date): Week | null {
    if (!token) return null;
    const match = /^w:(\d{4})-(\d{2})-(\d{2})$/.exec(token);
    if (!match) return null;
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    if (date.getDay() !== 0) return null;
    if (date > weekStartOf(today)) return null;
    return weekStarting(date, today);
}

/** The current week and the `count - 1` weeks before it, newest first. */
export function weekChoices(today: Date, count = 12): Week[] {
    const sunday = weekStartOf(today);
    return Array.from({ length: count }, (_, i) => weekStarting(addDays(sunday, -7 * i), today));
}

/**
 * Hour (viewer's local time) on Tuesday when the Synerion → Project Operations integration is assumed
 * to have run. Until then the Monday review is still open. To confirm with Ion (open item #23).
 */
export const INTEGRATION_HOUR_TUESDAY = 6;

export interface ReviewWindow {
    /** True on Monday, and on Tuesday before the integration runs. */
    active: boolean;
    /** The week the PMs review: the Sunday–Saturday week that ended the Saturday before. */
    week: Week;
}

/**
 * Monday timesheet review (docs/05_app_design.md P6): Synerion approval closes Monday at end of day;
 * the integration to Project Operations runs Tuesday early morning. Monday and Tuesday belong to the
 * week that started on Sunday, so the review week is always last week.
 */
export function reviewWindow(now: Date): ReviewWindow {
    const dow = now.getDay();
    const active = dow === 1 || (dow === 2 && now.getHours() < INTEGRATION_HOUR_TUESDAY);
    return { active, week: lastWeek(now) };
}

/** Default week for P6: the review week while the Monday review is open, otherwise this week. */
export function defaultWeek(now: Date): Week {
    const review = reviewWindow(now);
    return review.active ? review.week : thisWeek(now);
}

const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const withYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "Oct 25 – Oct 31, 2026" for the full week (Sunday–Saturday). */
export function weekSpan(week: Week): string {
    return `${short.format(week.start)} – ${withYear.format(week.weekEnd)}`;
}

/** Label for selectors: "This week (Nov 1 – Nov 4, to date)", "Last week (Oct 25 – Oct 31, 2026)", or the span. */
export function describeWeek(week: Week, today: Date): string {
    if (week.isCurrent) return `This week (${short.format(week.start)} – ${short.format(week.end)}, to date)`;
    if (week.start.getTime() === lastWeek(today).start.getTime()) return `Last week (${weekSpan(week)})`;
    return weekSpan(week);
}
