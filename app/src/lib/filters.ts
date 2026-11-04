/**
 * Global filters (docs/05_app_design.md § 2) and the DAX filter helper (build plan 2.2).
 *
 * Filter state lives in the hash query and is untrusted: periods are parsed strictly, and every
 * other value must be in the option list loaded from the model (whitelist) before it reaches DAX.
 * Values are then written as escaped DAX string literals inside KEEPFILTERS ( TREATAS ( ... ) ).
 */

// ---------------------------------------------------------------- period

export type PeriodKind = "month" | "quarter" | "ytd" | "range";

export interface Period {
    kind: PeriodKind;
    /** Inclusive local calendar days. */
    start: Date;
    end: Date;
    /** Canonical URL form: m:2026-09 · q:2026-Q3 · ytd:2026-09 · r:2026-09-01..2026-09-30 */
    token: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const lastDayOfMonth = (y: number, m0: number) => new Date(y, m0 + 1, 0);

function parseYmd(text: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return null;
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function monthPeriod(year: number, month1: number): Period {
    return {
        kind: "month",
        start: new Date(year, month1 - 1, 1),
        end: lastDayOfMonth(year, month1 - 1),
        token: `m:${year}-${pad(month1)}`,
    };
}

/** Parses a period token; returns null for anything malformed. */
export function parsePeriod(token: string | null): Period | null {
    if (!token) return null;
    let match = /^m:(\d{4})-(\d{2})$/.exec(token);
    if (match) {
        const [y, m] = [Number(match[1]), Number(match[2])];
        return m >= 1 && m <= 12 ? monthPeriod(y, m) : null;
    }
    match = /^q:(\d{4})-Q([1-4])$/.exec(token);
    if (match) {
        const [y, q] = [Number(match[1]), Number(match[2])];
        return { kind: "quarter", start: new Date(y, (q - 1) * 3, 1), end: lastDayOfMonth(y, q * 3 - 1), token };
    }
    match = /^ytd:(\d{4})-(\d{2})$/.exec(token);
    if (match) {
        const [y, m] = [Number(match[1]), Number(match[2])];
        return m >= 1 && m <= 12 ? { kind: "ytd", start: new Date(y, 0, 1), end: lastDayOfMonth(y, m - 1), token } : null;
    }
    match = /^r:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(token);
    if (match) {
        const start = parseYmd(match[1]);
        const end = parseYmd(match[2]);
        return start && end && start <= end ? { kind: "range", start, end, token } : null;
    }
    return null;
}

export function rangePeriod(start: Date, end: Date): Period {
    return { kind: "range", start, end, token: `r:${ymd(start)}..${ymd(end)}` };
}

/** Default for P1–P5: the last complete calendar month before the viewer's local today. */
export function lastCompleteMonth(today: Date): Period {
    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const prev = new Date(firstOfThisMonth.getFullYear(), firstOfThisMonth.getMonth() - 1, 1);
    return monthPeriod(prev.getFullYear(), prev.getMonth() + 1);
}

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short" });
const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function describePeriod(period: Period): string {
    switch (period.kind) {
        case "month":
            return monthLabel.format(period.start);
        case "quarter":
            return `Q${Math.floor(period.start.getMonth() / 3) + 1} ${period.start.getFullYear()}`;
        case "ytd":
            return `YTD ${period.end.getFullYear()} (Jan – ${shortMonth.format(period.end)})`;
        case "range":
            return `${dayLabel.format(period.start)} – ${dayLabel.format(period.end)}`;
    }
}

// ---------------------------------------------------------------- filter state

export interface OrgSelection {
    l1?: string;
    l2?: string;
    l3?: string;
}

export interface FilterState {
    period: Period;
    org: OrgSelection;
    country?: string;
    customer?: string;
    project?: string;
}

export type FilterKey = "period" | "org" | "country" | "customer" | "project";

/** Option lists loaded from the model; the whitelist for every non-period filter. */
export interface FilterOptions {
    org: ReadonlyArray<readonly [string, string, string]>;
    countries: readonly string[];
    customers: readonly string[];
    projects: ReadonlyArray<{ key: string; name: string | null }>;
}

const PARAM = { period: "period", l1: "l1", l2: "l2", l3: "l3", country: "country", customer: "customer", project: "project" } as const;

/**
 * Reads filter state from the hash query. Values not found in `options` are dropped, so nothing
 * outside the model's own values can reach a query. With `options` still loading, only the
 * period is resolved.
 */
export function readFilters(params: URLSearchParams, today: Date, options: FilterOptions | null): FilterState {
    const period = parsePeriod(params.get(PARAM.period)) ?? lastCompleteMonth(today);
    const state: FilterState = { period, org: {} };
    if (!options) return state;

    const l1 = params.get(PARAM.l1) ?? undefined;
    const l2 = params.get(PARAM.l2) ?? undefined;
    const l3 = params.get(PARAM.l3) ?? undefined;
    if (l1 && options.org.some(([a]) => a === l1)) {
        state.org.l1 = l1;
        if (l2 && options.org.some(([a, b]) => a === l1 && b === l2)) {
            state.org.l2 = l2;
            if (l3 && options.org.some(([a, b, c]) => a === l1 && b === l2 && c === l3)) state.org.l3 = l3;
        }
    }

    const country = params.get(PARAM.country);
    if (country !== null && options.countries.includes(country)) state.country = country;
    const customer = params.get(PARAM.customer);
    if (customer !== null && options.customers.includes(customer)) state.customer = customer;
    const project = params.get(PARAM.project);
    if (project !== null && options.projects.some((p) => p.key === project)) state.project = project;
    return state;
}

/** Writes filter state into a copy of `params`; keys for "All" are removed. */
export function writeFilters(params: URLSearchParams, state: FilterState): URLSearchParams {
    const next = new URLSearchParams(params);
    const set = (key: string, value: string | undefined) => (value === undefined ? next.delete(key) : next.set(key, value));
    set(PARAM.period, state.period.token);
    set(PARAM.l1, state.org.l1);
    set(PARAM.l2, state.org.l1 ? state.org.l2 : undefined);
    set(PARAM.l3, state.org.l1 && state.org.l2 ? state.org.l3 : undefined);
    set(PARAM.country, state.country);
    set(PARAM.customer, state.customer);
    set(PARAM.project, state.project);
    return next;
}

// ---------------------------------------------------------------- DAX

/** Escapes a value as a DAX string literal. */
export function daxString(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
}

const daxDate = (d: Date) => `DATE ( ${d.getFullYear()}, ${d.getMonth() + 1}, ${d.getDate()} )`;

/**
 * Target columns per filter. Customer and project filter each fact's own column because every
 * query through dim_project fails until open item #1 (duplicate key) is fixed.
 */
export const FILTER_COLUMNS = {
    date: "dim_calendar[date]",
    org: ["dim_hierarchy_master[L1]", "dim_hierarchy_master[L2]", "dim_hierarchy_master[L3]"],
    country: ["fact_profitability_metrics[employee_country]"],
    customer: ["fact_profitability_metrics[project_customer]", "fact_revenue_metrics[financial_customer]"],
    project: ["fact_profitability_metrics[project_key]", "fact_revenue_metrics[project_key]"],
} as const;

/** DAX filter arguments for SUMMARIZECOLUMNS, limited to the filters the page applies. */
export function filterArgs(state: FilterState, applies: ReadonlySet<FilterKey>): string[] {
    const args: string[] = [];
    const treatas = (value: string, column: string) => `KEEPFILTERS ( TREATAS ( { ${daxString(value)} }, ${column} ) )`;

    if (applies.has("period")) {
        args.push(`KEEPFILTERS ( DATESBETWEEN ( ${FILTER_COLUMNS.date}, ${daxDate(state.period.start)}, ${daxDate(state.period.end)} ) )`);
    }
    if (applies.has("org")) {
        const levels = [state.org.l1, state.org.l2, state.org.l3];
        levels.forEach((value, i) => {
            if (value !== undefined && levels.slice(0, i).every((v) => v !== undefined)) {
                args.push(treatas(value, FILTER_COLUMNS.org[i]));
            }
        });
    }
    if (applies.has("country") && state.country !== undefined) {
        for (const column of FILTER_COLUMNS.country) args.push(treatas(state.country, column));
    }
    if (applies.has("customer") && state.customer !== undefined) {
        for (const column of FILTER_COLUMNS.customer) args.push(treatas(state.customer, column));
    }
    if (applies.has("project") && state.project !== undefined) {
        for (const column of FILTER_COLUMNS.project) args.push(treatas(state.project, column));
    }
    return args;
}

export const FILTERS_PLACEHOLDER = "/* @filters */";

/**
 * Puts filter arguments into a query's SUMMARIZECOLUMNS. The .dax file marks the spot with
 * `/* @filters *\/` right after the group-by columns (or at the start of the argument list),
 * written as the first argument: `SUMMARIZECOLUMNS ( /* @filters *\/ "Hours", [Synerion Hours_app] )`
 * or after columns: `SUMMARIZECOLUMNS ( t[c], /* @filters *\/ "Hours", ... )`.
 */
export function applyFilters(query: string, args: readonly string[]): string {
    const count = query.split(FILTERS_PLACEHOLDER).length - 1;
    if (count !== 1) throw new Error(`Query must contain exactly one ${FILTERS_PLACEHOLDER} marker (found ${count}).`);
    const text = args.map((a) => `${a},\n    `).join("");
    return query.replace(FILTERS_PLACEHOLDER, text);
}

// ---------------------------------------------------------------- period choices

/** First month with data in the model (fact_profitability_metrics starts 2025-01-01). */
export const DATA_START = { year: 2025, month: 1 } as const;

/**
 * Keeps the period if the page accepts its kind; otherwise falls back to the month that holds the
 * period's last day (pages that are monthly by design), or the last complete month.
 */
export function coercePeriod(period: Period, kinds: readonly string[], today: Date): Period {
    if (kinds.length === 0 || kinds.includes(period.kind)) return period;
    if (kinds.includes("month")) {
        const last = lastCompleteMonth(today);
        return period.end > last.end ? last : monthPeriod(period.end.getFullYear(), period.end.getMonth() + 1);
    }
    return lastCompleteMonth(today);
}

/** Selectable periods of one kind, newest first, from DATA_START to the viewer's current month. */
export function periodChoices(kind: Exclude<PeriodKind, "range">, today: Date): Period[] {
    const out: Period[] = [];
    const endYear = today.getFullYear();
    const endMonth = today.getMonth() + 1;
    if (kind === "month") {
        const first = DATA_START.year * 12 + (DATA_START.month - 1);
        for (let i = endYear * 12 + (endMonth - 1); i >= first; i--) {
            out.push(monthPeriod(Math.floor(i / 12), (i % 12) + 1));
        }
    } else if (kind === "quarter") {
        const endQ = Math.floor((endMonth - 1) / 3) + 1;
        for (let y = endYear; y >= DATA_START.year; y--) {
            for (let q = y === endYear ? endQ : 4; q >= 1; q--) out.push(parsePeriod(`q:${y}-Q${q}`)!);
        }
    } else {
        const last = lastCompleteMonth(today);
        for (let y = endYear; y >= DATA_START.year; y--) {
            const m = y === endYear ? (last.start.getFullYear() === y ? last.start.getMonth() + 1 : 0) : 12;
            if (m >= 1) out.push(parsePeriod(`ytd:${y}-${pad(m)}`)!);
        }
    }
    return out;
}

export function toYmd(date: Date): string {
    return ymd(date);
}

export function fromYmd(text: string): Date | null {
    return parseYmd(text);
}
