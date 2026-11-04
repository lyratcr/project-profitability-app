/**
 * Week logic for P6 (build plan 2.3). Weeks run Monday–Sunday, as dim_calendar's Monday-based weeks.
 * Every window comes from the viewer's local date and goes to the model as a dim_calendar[date] range;
 * there is no TODAY() in DAX (the service runs in UTC).
 *
 * dim_calendar[year_week] is not used: its label takes the calendar year, so "2025 W01" holds both
 * Jan 1–5 2025 and Dec 29–31 2025 (open item #22).
 */

export interface Week {
    /** Monday. */
    start: Date;
    /** Sunday, or today for the current week ("to date"). */
    end: Date;
    /** Sunday of the week, even when `end` is cut at today. */
    sunday: Date;
    /** URL form: w:2026-10-26 (the Monday). */
    token: string;
    isCurrent: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Monday of the week that holds `date` (local calendar day). */
export function mondayOf(date: Date): Date {
    const d = day(date);
    const back = (d.getDay() + 6) % 7; // Mon 0 … Sun 6
    return addDays(d, -back);
}

/** The Monday–Sunday week that starts on `monday`; the current week ends at `today`. */
export function weekStarting(monday: Date, today: Date): Week {
    const start = mondayOf(monday);
    const sunday = addDays(start, 6);
    const isCurrent = start.getTime() === mondayOf(today).getTime();
    return { start, end: isCurrent ? day(today) : sunday, sunday, token: `w:${ymd(start)}`, isCurrent };
}

export function thisWeek(today: Date): Week {
    return weekStarting(mondayOf(today), today);
}

export function lastWeek(today: Date): Week {
    return weekStarting(addDays(mondayOf(today), -7), today);
}

/** Parses `w:YYYY-MM-DD`; only a real Monday that is not in the future is accepted. */
export function parseWeek(token: string | null, today: Date): Week | null {
    if (!token) return null;
    const match = /^w:(\d{4})-(\d{2})-(\d{2})$/.exec(token);
    if (!match) return null;
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    if (date.getDay() !== 1) return null;
    if (date > mondayOf(today)) return null;
    return weekStarting(date, today);
}

/** The current week and the `count - 1` weeks before it, newest first. */
export function weekChoices(today: Date, count = 12): Week[] {
    const monday = mondayOf(today);
    return Array.from({ length: count }, (_, i) => weekStarting(addDays(monday, -7 * i), today));
}

/**
 * Hour (viewer's local time) on Tuesday when the Synerion → Project Operations integration is assumed
 * to have run. Until then the Monday review is still open. To confirm with Ion (open item #23).
 */
export const INTEGRATION_HOUR_TUESDAY = 6;

export interface ReviewWindow {
    /** True on Monday, and on Tuesday before the integration runs. */
    active: boolean;
    /** The week the PMs review: the Monday–Sunday week before the review Monday. */
    week: Week;
}

/**
 * Monday timesheet review (docs/05_app_design.md P6): Synerion approval closes Monday at end of day;
 * the integration to Project Operations runs Tuesday early morning.
 */
export function reviewWindow(now: Date): ReviewWindow {
    const dow = now.getDay();
    const active = dow === 1 || (dow === 2 && now.getHours() < INTEGRATION_HOUR_TUESDAY);
    const reviewMonday = dow === 2 ? addDays(day(now), -1) : mondayOf(now);
    return { active, week: weekStarting(addDays(reviewMonday, -7), now) };
}

/** Default week for P6: the review week while the Monday review is open, otherwise this week. */
export function defaultWeek(now: Date): Week {
    const review = reviewWindow(now);
    return review.active ? review.week : thisWeek(now);
}

const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const withYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "Oct 26 – Nov 1, 2026" for the full week (Monday–Sunday). */
export function weekSpan(week: Week): string {
    return `${short.format(week.start)} – ${withYear.format(week.sunday)}`;
}

/** Label for selectors: "This week (Nov 2 – Nov 4, to date)", "Last week (Oct 26 – Nov 1, 2026)", or the span. */
export function describeWeek(week: Week, today: Date): string {
    if (week.isCurrent) return `This week (${short.format(week.start)} – ${short.format(week.end)}, to date)`;
    if (week.start.getTime() === lastWeek(today).start.getTime()) return `Last week (${weekSpan(week)})`;
    return weekSpan(week);
}
