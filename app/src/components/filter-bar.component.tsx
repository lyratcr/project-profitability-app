import { useId, type ReactElement, type ReactNode } from "react";
import {
    describePeriod,
    fromYmd,
    lastCompleteMonth,
    periodChoices,
    rangePeriod,
    toYmd,
    type FilterKey,
    type FilterOptions,
    type FilterState,
    type PeriodKind,
} from "@/lib/filters";
import type { PageDef } from "@/lib/routes";
import { describeWeek, weekChoices } from "@/lib/weeks";

interface FilterBarProps {
    page: PageDef;
    state: FilterState;
    options: FilterOptions | null;
    optionsLoading: boolean;
    optionsError: string | undefined;
    /** The customer / project list is reloading for a new org or customer. */
    customersLoading?: boolean;
    projectsLoading?: boolean;
    onChange: (next: FilterState) => void;
    /** Viewer's local "today"; injectable for tests. */
    today?: Date;
}

const KIND_LABEL: Record<PeriodKind, string> = { month: "Month", quarter: "Quarter", ytd: "Year to date", range: "Custom" };
const ALL = "";

const unique = (values: readonly string[] | undefined): string[] => [...new Set(values ?? [])];

// Auxis Slicer (design-system/components/Slicer): `.ax-label` over an `.ax-select` dropdown; short lists as
// `.ax-chip` groups. `app-select-narrow` (global.css) relaxes the 180px minimum for the L1–L3 pickers.
const controlClass = "ax-select disabled:opacity-60";
const narrowClass = "ax-select app-select-narrow disabled:opacity-60";

function Field({ label, children, id }: { label: string; children: ReactNode; id: string }): ReactElement {
    return (
        <div className="ax-slicer min-w-0">
            <label htmlFor={id} className="ax-label">
                {label}
            </label>
            {children}
        </div>
    );
}

/** Global filters for the current page (docs/05_app_design.md § 2). Values come only from the model. */
export function FilterBar({
    page,
    state,
    options,
    optionsLoading,
    optionsError,
    customersLoading = false,
    projectsLoading = false,
    onChange,
    today = new Date(),
}: FilterBarProps): ReactElement | null {
    const id = useId();
    const shows = (key: FilterKey) => page.filters.includes(key);
    if (page.filters.length === 0) return null;

    const kinds = page.periodKinds;
    const period = state.period;
    const set = (patch: Partial<FilterState>) => onChange({ ...state, ...patch });
    const listsDisabled = options === null;

    const changeKind = (kind: PeriodKind) => {
        if (kind === "range") set({ period: rangePeriod(period.start, period.end) });
        else set({ period: periodChoices(kind, today).find((p) => p.end <= lastCompleteMonth(today).end) ?? periodChoices(kind, today)[0] });
    };

    return (
        <section aria-label="Filters" className="ax-glass flex flex-wrap items-end gap-4 rounded-md px-5 py-4">
            {shows("period") && (
                <>
                    {kinds.length > 1 && (
                        <div className="ax-slicer" role="group" aria-labelledby={`${id}-kind`}>
                            <span id={`${id}-kind`} className="ax-label">
                                Period
                            </span>
                            <div className="ax-chips">
                                {kinds.map((k) => (
                                    <button
                                        key={k}
                                        type="button"
                                        className="ax-chip"
                                        aria-pressed={period.kind === k}
                                        onClick={() => period.kind !== k && changeKind(k)}
                                    >
                                        {KIND_LABEL[k]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {period.kind === "range" ? (
                        <>
                            <Field label="From" id={`${id}-from`}>
                                <input
                                    id={`${id}-from`}
                                    type="date"
                                    className={controlClass}
                                    value={toYmd(period.start)}
                                    max={toYmd(period.end)}
                                    onChange={(e) => {
                                        const d = fromYmd(e.target.value);
                                        if (d && d <= period.end) set({ period: rangePeriod(d, period.end) });
                                    }}
                                />
                            </Field>
                            <Field label="To" id={`${id}-to`}>
                                <input
                                    id={`${id}-to`}
                                    type="date"
                                    className={controlClass}
                                    value={toYmd(period.end)}
                                    min={toYmd(period.start)}
                                    onChange={(e) => {
                                        const d = fromYmd(e.target.value);
                                        if (d && d >= period.start) set({ period: rangePeriod(period.start, d) });
                                    }}
                                />
                            </Field>
                        </>
                    ) : (
                        <Field label={kinds.length > 1 ? KIND_LABEL[period.kind] : "Month"} id={`${id}-period`}>
                            <select
                                id={`${id}-period`}
                                className={controlClass}
                                value={period.token}
                                onChange={(e) => {
                                    const next = periodChoices(period.kind as Exclude<PeriodKind, "range">, today).find((p) => p.token === e.target.value);
                                    if (next) set({ period: next });
                                }}
                            >
                                {periodChoices(period.kind as Exclude<PeriodKind, "range">, today).map((p) => (
                                    <option key={p.token} value={p.token}>
                                        {describePeriod(p)}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}
                </>
            )}

            {shows("week") && (
                <Field label="Week" id={`${id}-week`}>
                    <select
                        id={`${id}-week`}
                        className={controlClass}
                        value={state.week.token}
                        onChange={(e) => {
                            const next = weekChoices(today).find((w) => w.token === e.target.value);
                            if (next) set({ week: next });
                        }}
                    >
                        {(weekChoices(today).some((w) => w.token === state.week.token) ? weekChoices(today) : [state.week, ...weekChoices(today)]).map((w) => (
                            <option key={w.token} value={w.token}>
                                {describeWeek(w, today)}
                            </option>
                        ))}
                    </select>
                </Field>
            )}

            {shows("org") && (
                <>
                    <Field label="L1" id={`${id}-l1`}>
                        <select
                            id={`${id}-l1`}
                            className={narrowClass}
                            disabled={listsDisabled}
                            value={state.org.l1 ?? ALL}
                            onChange={(e) => set({ org: e.target.value === ALL ? {} : { l1: e.target.value } })}
                        >
                            <option value={ALL}>All</option>
                            {unique(options?.org.map(([a]) => a)).map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="L2" id={`${id}-l2`}>
                        <select
                            id={`${id}-l2`}
                            className={narrowClass}
                            disabled={listsDisabled || state.org.l1 === undefined}
                            value={state.org.l2 ?? ALL}
                            onChange={(e) => set({ org: e.target.value === ALL ? { l1: state.org.l1 } : { l1: state.org.l1, l2: e.target.value } })}
                        >
                            <option value={ALL}>All</option>
                            {unique(options?.org.filter(([a]) => a === state.org.l1).map(([, b]) => b)).map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="L3" id={`${id}-l3`}>
                        <select
                            id={`${id}-l3`}
                            className={narrowClass}
                            disabled={listsDisabled || state.org.l2 === undefined}
                            value={state.org.l3 ?? ALL}
                            onChange={(e) =>
                                set({ org: e.target.value === ALL ? { l1: state.org.l1, l2: state.org.l2 } : { ...state.org, l3: e.target.value } })
                            }
                        >
                            <option value={ALL}>All</option>
                            {unique(options?.org.filter(([a, b]) => a === state.org.l1 && b === state.org.l2).map(([, , c]) => c)).map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </Field>
                </>
            )}

            {shows("country") && (
                <Field label="Employee country" id={`${id}-country`}>
                    <select
                        id={`${id}-country`}
                        className={controlClass}
                        disabled={listsDisabled}
                        value={state.country ?? ALL}
                        onChange={(e) => set({ country: e.target.value === ALL ? undefined : e.target.value })}
                    >
                        <option value={ALL}>All</option>
                        {options?.countries.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </Field>
            )}

            {shows("customer") && (
                <Field label="Customer" id={`${id}-customer`}>
                    <select
                        id={`${id}-customer`}
                        className={controlClass}
                        disabled={listsDisabled || customersLoading}
                        value={state.customer ?? ALL}
                        onChange={(e) => set({ customer: e.target.value === ALL ? undefined : e.target.value, project: undefined })}
                    >
                        <option value={ALL}>All</option>
                        {options?.customers.map((c) => (
                            <option key={c} value={c}>
                                {c.trim()}
                            </option>
                        ))}
                    </select>
                </Field>
            )}

            {shows("project") && (
                <Field label="Project" id={`${id}-project`}>
                    <select
                        id={`${id}-project`}
                        className={controlClass}
                        disabled={listsDisabled || projectsLoading}
                        value={state.project ?? ALL}
                        onChange={(e) => set({ project: e.target.value === ALL ? undefined : e.target.value })}
                    >
                        <option value={ALL}>All</option>
                        {options?.projects.map((p) => (
                            <option key={p.key} value={p.key}>
                                {p.name ?? p.key}
                            </option>
                        ))}
                    </select>
                </Field>
            )}

            {optionsLoading && <span className="pb-2 text-200 text-muted-foreground">Loading filter values…</span>}
            {optionsError !== undefined && (
                <span role="alert" className="pb-2 text-200 text-destructive" title={optionsError}>
                    Filter values unavailable; showing all.
                </span>
            )}
        </section>
    );
}
