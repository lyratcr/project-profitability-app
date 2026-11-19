import { useId, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { X } from "lucide-react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import {
    allocationFilterArgs,
    allocationWindow,
    arrangePeople,
    findPerson,
    personArg,
    personChoices,
    readBookings,
    readKpis,
    readOptions,
    readPeople,
    readWeeks,
    AVAILABLE_MINS,
    type AllocationOrder,
    type AvailableMin,
    type ShowFilter,
} from "@/lib/allocation";
import type { PageDef } from "@/lib/routes";
import { ALLOCATION_FORMATS, allocationBookings, allocationDetail, allocationKpis, allocationOptions, allocationPeople, allocationWeeks } from "@/queries/allocation";
import { AxCard } from "./ax/ax-card.component";
import { AxPageHeader } from "./ax/ax-page-header.component";
import { QueryStates } from "./query-states.component";
import { ResourceAllocationGantt } from "./resource-allocation-gantt.component";

const SHOW_LABEL: Record<ShowFilter, string> = { all: "Everyone", available: "Available", over: "Over 40 h" };
const AVAILABLE_LABEL: Record<AvailableMin, string> = { 8: "1 day+ a week", 20: "Half time+", 40: "Full time" };
const ORDER_LABEL: Record<AllocationOrder, string> = { revenue: "Most revenue first", free: "Most free first", name: "By name" };
const fmt = (v: number | null, format: string) => (v === null ? "—" : String(formatValue(v, format)));

/**
 * Resource Allocation (build plan 6.17; mockup approved by Ion, 2026-11-19). First version on the data the model
 * has today: planned hours are the T&M Backlog by person (Fixed Fee has no person detail yet, open item #37); role
 * is the role on the person's Backlog lines (the UKG role comes later, #35); L1 is the person's current org (UKG);
 * capacity is a fixed 40 h a week (#36). Employee names and the billing rate are allowed on this page (Ion).
 */
export function ResourceAllocationPage({ page }: { page: PageDef }): ReactElement {
    const id = useId();
    const today = useMemo(() => new Date(), []);
    const window = useMemo(() => allocationWindow(today), [today]);
    const [role, setRole] = useState<string | undefined>();
    const [l1, setL1] = useState<string | undefined>();
    const [monthKey, setMonthKey] = useState(window.months[0].key);
    const [show, setShow] = useState<ShowFilter>("all");
    const [availableMin, setAvailableMin] = useState<AvailableMin>(20);
    const [order, setOrder] = useState<AllocationOrder>("revenue");
    const [open, setOpen] = useState<string | null>(null);
    // Person search (Ion, 2026-11-19): suggests only the people the Role and L1 filters leave; the pick goes to the
    // model like the other filters, so the KPIs are that person's.
    const [person, setPerson] = useState<string | undefined>();
    const [personText, setPersonText] = useState("");
    const month = window.months.find((m) => m.key === monthKey) ?? window.months[0];

    const optionsResult = useSemanticModelQuery(allocationOptions({ window, month: window.months[0], today }));
    const options = optionsResult.data?.status === "success" ? readOptions(optionsResult.data.table) : null;
    const groupFilters = options === null ? [] : allocationFilterArgs({ role, l1 }, options);
    const ready = options !== null;
    const run = (q: { connection: string; query: string }) => ({ connection: q.connection, query: ready ? q.query : "" });

    // The people Role and L1 leave: the search's suggestions and whitelist (the same query as the list without a person).
    const poolResult = useSemanticModelQuery(run(allocationPeople({ window, month, today, filters: groupFilters })));
    const choices = useMemo(() => (poolResult.data?.status === "success" ? personChoices(readPeople(poolResult.data.table)) : null), [poolResult.data]);
    const picked = person !== undefined && choices !== null && choices.some((c) => c.employeeNumber === person) ? person : undefined;
    // A person the new Role or L1 leaves out no longer filters, and the search box shows empty again.
    const searchText = person !== undefined && choices !== null && picked === undefined ? "" : personText;
    const pickPerson = (text: string) => {
        setPersonText(text);
        const choice = choices === null ? null : findPerson(choices, text);
        if (choice !== null) {
            setPerson(choice.employeeNumber);
            setOpen(choice.employeeNumber);
        } else if (text.trim() === "") {
            setPerson(undefined);
        }
    };
    const filters = picked === undefined ? groupFilters : [...groupFilters, personArg(picked)];
    const params = { window, month, today, filters };

    const kpisResult = useSemanticModelQuery(run(allocationKpis(params)));
    const peopleResult = useSemanticModelQuery(run(allocationPeople(params)));
    const weeksResult = useSemanticModelQuery(run(allocationWeeks(params)));
    const bookingsResult = useSemanticModelQuery(run(allocationBookings(params)));
    const detailResult = useSemanticModelQuery(run(open === null ? { connection: "profitmodel", query: "" } : allocationDetail({ ...params, filters: [personArg(open)] })));

    const kpis = kpisResult.data?.status === "success" ? readKpis(kpisResult.data.table) : null;
    const bookings = useMemo(
        () => (bookingsResult.data?.status === "success" ? readBookings(bookingsResult.data.table, window) : new Map()),
        [bookingsResult.data, window],
    );
    const weeks = useMemo(() => (weeksResult.data?.status === "success" ? readWeeks(weeksResult.data.table) : new Map()), [weeksResult.data]);
    const shortMonth = month.label.split(" ")[0];

    return (
        <section aria-labelledby="page-title" className="flex flex-col gap-6">
            <AxPageHeader
                title={page.title}
                purpose={page.purpose}
                notes={[
                    "Planned hours are the T&M Backlog by person. Fixed Fee projects aren't planned by person yet, so time on them doesn't show here.",
                    "Capacity is 40 h a week. Role is the role on the person's Backlog lines; L1 is the person's current org. Weeks run Sunday to Saturday.",
                    "You see the bookings on the projects you have access to.",
                ]}
            />

            <section aria-label="Filters" className="ax-glass flex flex-wrap items-end gap-4 rounded-md px-5 py-4">
                <Field label="Role" id={`${id}-role`}>
                    <select id={`${id}-role`} className="ax-select disabled:opacity-60" disabled={options === null} value={role ?? ""} onChange={(e) => setRole(e.target.value || undefined)}>
                        <option value="">All roles</option>
                        {options?.roles.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="L1" id={`${id}-l1`}>
                    <select id={`${id}-l1`} className="ax-select app-select-narrow disabled:opacity-60" disabled={options === null} value={l1 ?? ""} onChange={(e) => setL1(e.target.value || undefined)}>
                        <option value="">All</option>
                        {options?.l1s.map((v) => (
                            <option key={v} value={v}>
                                {v}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Person" id={`${id}-person`}>
                    <div className="relative">
                        <input
                            id={`${id}-person`}
                            type="search"
                            list={`${id}-people`}
                            className="ax-select ax-person-search disabled:opacity-60"
                            placeholder={choices === null ? "Loading people…" : `All people (${choices.length})`}
                            disabled={choices === null}
                            autoComplete="off"
                            value={searchText}
                            onChange={(e) => pickPerson(e.target.value)}
                        />
                        {searchText !== "" && (
                            <button type="button" className="ax-person-clear" aria-label="Clear person" onClick={() => pickPerson("")}>
                                <X className="icon-size-100" aria-hidden="true" />
                            </button>
                        )}
                        <datalist id={`${id}-people`}>
                            {choices?.map((c) => (
                                <option key={c.employeeNumber} value={c.label} label={c.hint} />
                            ))}
                        </datalist>
                    </div>
                </Field>
                <Field label="Month" id={`${id}-month`}>
                    <select id={`${id}-month`} className="ax-select app-select-narrow" value={month.key} onChange={(e) => setMonthKey(e.target.value)}>
                        {window.months.map((m) => (
                            <option key={m.key} value={m.key}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </Field>
                <div className="ax-slicer" role="group" aria-labelledby={`${id}-show`}>
                    <span id={`${id}-show`} className="ax-label">
                        Show
                    </span>
                    <div className="ax-chips">
                        {(Object.keys(SHOW_LABEL) as ShowFilter[]).map((k) => (
                            <button
                                key={k}
                                type="button"
                                className="ax-chip"
                                aria-pressed={show === k}
                                onClick={() => {
                                    setShow(k);
                                    // Looking for availability: the freest first.
                                    if (k === "available" && order === "revenue") setOrder("free");
                                }}
                            >
                                {SHOW_LABEL[k]}
                            </button>
                        ))}
                    </div>
                </div>
                {show === "available" && (
                    <div className="ax-slicer" role="group" aria-labelledby={`${id}-min`}>
                        <span id={`${id}-min`} className="ax-label">
                            Free per week (avg)
                        </span>
                        <div className="ax-chips">
                            {AVAILABLE_MINS.map((m) => (
                                <button key={m} type="button" className="ax-chip" aria-pressed={availableMin === m} title={`${m} h free a week or more, on average in the month`} onClick={() => setAvailableMin(m)}>
                                    {AVAILABLE_LABEL[m]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <Field label="Order" id={`${id}-order`}>
                    <select id={`${id}-order`} className="ax-select app-select-narrow" value={order} onChange={(e) => setOrder(e.target.value as AllocationOrder)}>
                        {(Object.keys(ORDER_LABEL) as AllocationOrder[]).map((k) => (
                            <option key={k} value={k}>
                                {ORDER_LABEL[k]}
                            </option>
                        ))}
                    </select>
                </Field>
            </section>
            {optionsResult.data?.status === "error" && (
                <QueryStates result={optionsResult} shape="kpi" title="Role and L1 lists">
                    {() => null}
                </QueryStates>
            )}

            <QueryStates result={kpisResult} shape="kpi" title="Allocation summary">
                {() => (
                    <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Kpi
                            label="People"
                            value={fmt(kpis?.people ?? null, ALLOCATION_FORMATS.hours)}
                            note={picked !== undefined ? (choices?.find((c) => c.employeeNumber === picked)?.label ?? "One person") : [role ?? "All roles", l1].filter(Boolean).join(" · ")}
                        />
                        <Kpi label={`Planned revenue in ${shortMonth}`} value={fmt(kpis?.revenue ?? null, ALLOCATION_FORMATS.money)} note="T&M Backlog" />
                        <Kpi label={`Free hours in ${shortMonth}`} value={fmt(kpis?.freeHours ?? null, ALLOCATION_FORMATS.hours)} note="Of 40 h a week each" className="text-[var(--positive-ink)]" />
                        <Kpi
                            label={`Over 40 h in ${shortMonth}`}
                            value={fmt(kpis?.overPeople ?? null, ALLOCATION_FORMATS.hours)}
                            note={show === "over" ? "Showing only them" : "Select to show only them"}
                            className={(kpis?.overPeople ?? 0) > 0 ? "text-[var(--negative-ink)]" : undefined}
                            onClick={() => setShow(show === "over" ? "all" : "over")}
                            pressed={show === "over"}
                        />
                    </dl>
                )}
            </QueryStates>

            <AxCard title="Bookings by person" subtitle={`Planned T&M hours per project, week by week · ${month.label} shaded`} aside={<Legend />}>
                <QueryStates result={peopleResult} shape="table" title="Bookings by person" emptyMessage="No one has T&M hours planned for these filters.">
                    {(table) => {
                        const people = arrangePeople(readPeople(table), show, order, availableMin);
                        if (people.length === 0) {
                            const what = show === "over" ? "is over 40 h" : `has ${availableMin} h or more free a week`;
                            return <p className="m-0 py-10 text-center text-300 text-muted-foreground">No one {what} in {month.label} for these filters.</p>;
                        }
                        return (
                            <ResourceAllocationGantt
                                window={window}
                                month={month}
                                people={people}
                                bookings={bookings}
                                weeks={weeks}
                                open={open}
                                onToggle={(e) => setOpen(open === e ? null : e)}
                                detail={detailResult}
                            />
                        );
                    }}
                </QueryStates>
            </AxCard>
        </section>
    );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }): ReactElement {
    return (
        <div className="ax-slicer min-w-0">
            <label htmlFor={id} className="ax-label">
                {label}
            </label>
            {children}
        </div>
    );
}

interface KpiProps {
    label: string;
    value: string;
    note: string;
    className?: string;
    onClick?: () => void;
    pressed?: boolean;
}

function Kpi({ label, value, note, className, onClick, pressed }: KpiProps): ReactElement {
    const body = (
        <>
            <dt className="ax-kpi-label">{label}</dt>
            <dd className={`m-0 mt-1 text-[26px] font-semibold tabular-nums ${className ?? ""}`}>{value}</dd>
            <dd className="m-0 mt-0.5 text-200 text-muted-foreground">{note}</dd>
        </>
    );
    if (onClick === undefined) return <div className="rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-center">{body}</div>;
    return (
        <div
            role="button"
            tabIndex={0}
            aria-pressed={pressed}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick();
                }
            }}
            className={`ax-gantt-kpi rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-center ${pressed ? "is-pressed" : ""}`}
        >
            {body}
        </div>
    );
}

function Legend(): ReactElement {
    return (
        <div className="ax-gantt-legend" aria-label="Legend">
            <span>
                <i className="ax-gantt-swatch is-bar" aria-hidden="true" />
                T&amp;M booking
            </span>
            <span>
                <i className="ax-gantt-swatch is-free" aria-hidden="true" />
                Free
            </span>
            <span>
                <i className="ax-gantt-swatch is-full" aria-hidden="true" />
                Full
            </span>
            <span>
                <i className="ax-gantt-swatch is-over" aria-hidden="true" />
                Over 40 h
            </span>
            <span>
                <i className="ax-gantt-swatch is-today" aria-hidden="true" />
                This week
            </span>
        </div>
    );
}
