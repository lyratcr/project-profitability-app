import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactElement } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import {
    lowestRate,
    personLoad,
    readDetail,
    readWeekDetail,
    weekKeyOf,
    weekLoad,
    type AllocationMonth,
    type AllocationPerson,
    type AllocationWindow,
    type Booking,
    type WeekCell,
} from "@/lib/allocation";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { ALLOCATION_FORMATS, allocationWeek } from "@/queries/allocation";
import { cn } from "@/lib/utils";
import { AllocationWeekTooltip } from "./allocation-week-tooltip.component";
import type { BreakdownState } from "./people-week-tooltip.component";
import { QueryStates, type QueryResult } from "./query-states.component";

const fmt = (v: number | null, format: string) => (v === null ? "—" : String(formatValue(v, format)));
const hours = (v: number | null) => fmt(v, ALLOCATION_FORMATS.hours);
const money = (v: number | null) => fmt(v, ALLOCATION_FORMATS.money);
const percent = (v: number | null) => fmt(v, ALLOCATION_FORMATS.percent);
const compact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 });
const compactMoney = (v: number | null) => (v === null ? "—" : compact.format(v));

interface GanttProps {
    window: AllocationWindow;
    month: AllocationMonth;
    people: readonly AllocationPerson[];
    bookings: ReadonlyMap<string, Booking[]>;
    weeks: ReadonlyMap<string, ReadonlyMap<number, WeekCell>>;
    /** Person whose detail is open, and its query. */
    open: string | null;
    onToggle: (employeeNumber: string) => void;
    detail: QueryResult;
}

/**
 * Resource Allocation Gantt (mockup approved by Ion, 2026-11-19): one row per person, grouped by role; one bar per
 * project over the weeks it has planned T&M hours; under the bars a weekly strip of free (green, stronger when
 * freer), full (grey) or over 40 h (red). The chosen month is shaded and this week is marked. Selecting a person
 * opens their month: hours, billing rate and planned revenue per project.
 */
export function ResourceAllocationGantt({ window, month, people, bookings, weeks, open, onToggle, detail }: GanttProps): ReactElement {
    const style = { "--weeks": window.weeks.length } as CSSProperties;
    const band = { left: `${(month.firstWeek / window.weeks.length) * 100}%`, width: `${(month.weekCount / window.weeks.length) * 100}%` };
    const today = { left: `${(window.currentWeek / window.weeks.length) * 100}%` };
    const shortMonth = month.label.split(" ")[0];
    const tooltipId = useId();

    // Week tooltip (Ion, 2026-11-19): one query for the hovered person and week (cached, so a second hover is instant).
    const [active, setActive] = useState<{ person: AllocationPerson; week: number; rect: DOMRect } | null>(null);
    const weekConfig = active ? allocationWeek(active.person.employeeNumber, window.weeks[active.week]) : null;
    const weekData = useSemanticModelQuery({ connection: weekConfig?.connection ?? "profitmodel", query: weekConfig?.query ?? "" }).data;
    const weekDetail = useMemo(() => (weekData?.status === "success" ? readWeekDetail(weekData.table) : null), [weekData]);
    const weekState: BreakdownState = weekData?.status === "success" ? "ready" : weekData?.status === "error" ? "error" : "loading";
    // Fixed position: close on scroll, resize or Escape.
    useEffect(() => {
        if (!active) return;
        const close = () => setActive(null);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        globalThis.addEventListener("scroll", close, true);
        globalThis.addEventListener("resize", close);
        globalThis.addEventListener("keydown", onKey);
        return () => {
            globalThis.removeEventListener("scroll", close, true);
            globalThis.removeEventListener("resize", close);
            globalThis.removeEventListener("keydown", onKey);
        };
    }, [active]);

    let role: string | null | undefined;
    const rows: ReactElement[] = [];

    for (const person of people) {
        if (person.role !== role) {
            role = person.role;
            const count = people.filter((p) => p.role === role).length;
            rows.push(
                <div key={`role-${role ?? "none"}`} className="ax-gantt-role">
                    {role ?? "No role"} · {count} {count === 1 ? "person" : "people"}
                </div>,
            );
        }
        const personBookings = bookings.get(person.employeeNumber) ?? [];
        const personWeeks = weeks.get(person.employeeNumber);
        const isOpen = open === person.employeeNumber;
        rows.push(
            <div key={person.employeeNumber} className={cn("ax-gantt-row", isOpen && "is-open")}>
                <div className="ax-gantt-name">
                    <button type="button" className="ax-gantt-person" aria-expanded={isOpen} onClick={() => onToggle(person.employeeNumber)}>
                        {isOpen ? <ChevronDown className="icon-size-100 shrink-0" aria-hidden="true" /> : <ChevronRight className="icon-size-100 shrink-0" aria-hidden="true" />}
                        <span className="truncate">{person.name}</span>
                    </button>
                    <div className="ax-gantt-pills">
                        <LoadPill person={person} month={shortMonth} />
                        <span className="ax-pill" title={`Planned T&M revenue in ${month.label}`}>
                            {compactMoney(person.monthRevenue ?? 0)} in {shortMonth}
                        </span>
                    </div>
                    {person.l1 !== null && <div className="ax-gantt-meta">{person.l1}</div>}
                </div>
                <div className="ax-gantt-track" style={{ minHeight: `${Math.max(1, personBookings.length) * 26 + 18}px` }}>
                    <div className="ax-gantt-band" style={band} aria-hidden="true" />
                    <div className="ax-gantt-today" style={today} aria-hidden="true" />
                    <div className="ax-gantt-lanes">
                        {personBookings.map((b, lane) =>
                            b.segments.map((s) => {
                                const same = s.hours.every((h) => h === s.hours[0]);
                                return (
                                    <div key={`${b.project}-${s.first}`} className="ax-gantt-bar" style={{ gridRow: lane + 1, gridColumn: `${s.first + 1} / ${s.last + 2}` }}>
                                        {b.project}
                                        {same && ` · ${hours(s.hours[0])} h/wk`}
                                    </div>
                                );
                            }),
                        )}
                    </div>
                    <div className="ax-gantt-strip" aria-label={`Weekly load of ${person.name}`}>
                        {window.weeks.map((w) => {
                            const c = personWeeks?.get(weekKeyOf(w));
                            const load = weekLoad(c);
                            const opacity = load === "free" ? Math.max(0.3, c?.freeShare ?? 1) : 1;
                            return <span key={w.getTime()} className={`ax-gantt-load is-${load}`} style={{ opacity }} />;
                        })}
                    </div>
                    {/* Hover areas, one per week over the whole row: open the week tooltip (mouse; the person detail is the keyboard path). */}
                    <div className="ax-gantt-hits" aria-hidden="true">
                        {window.weeks.map((w, i) => (
                            <span
                                key={w.getTime()}
                                className={cn("ax-gantt-hit", active?.person.employeeNumber === person.employeeNumber && active.week === i && "is-active")}
                                onMouseEnter={(e) => setActive({ person, week: i, rect: e.currentTarget.getBoundingClientRect() })}
                                onMouseLeave={() => setActive(null)}
                            />
                        ))}
                    </div>
                </div>
            </div>,
        );
        if (isOpen) {
            rows.push(
                <div key={`${person.employeeNumber}-detail`} className="ax-gantt-detail">
                    <PersonDetail person={person} month={month} detail={detail} />
                </div>,
            );
        }
    }

    return (
        <>
            {active && (
                <AllocationWeekTooltip
                    id={tooltipId}
                    anchor={active.rect}
                    person={active.person}
                    weekStart={window.weeks[active.week]}
                    load={weeks.get(active.person.employeeNumber)?.get(weekKeyOf(window.weeks[active.week]))}
                    detail={weekDetail}
                    state={weekState}
                />
            )}
            <div className="ax-matrix-scroll overflow-x-auto" tabIndex={0} aria-label="Bookings by person, week by week">
            <div className="ax-gantt" style={style}>
                <div className="ax-gantt-row ax-gantt-head">
                    <div className="ax-gantt-name ax-label">Person</div>
                    <div className="ax-gantt-track ax-gantt-months">
                        <div className="ax-gantt-band" style={band} aria-hidden="true" />
                        {window.months.map((m) => (
                            <div key={m.key} className={cn("ax-gantt-month", m.key === month.key && "is-current")} style={{ gridColumn: `${m.firstWeek + 1} / span ${m.weekCount}` }}>
                                {m.label}
                            </div>
                        ))}
                        {window.weeks.map((w, i) => (
                            <div key={w.getTime()} className={cn("ax-gantt-week", i === window.currentWeek && "is-today")} style={{ gridColumn: i + 1, gridRow: 2 }}>
                                {w.getDate()}
                            </div>
                        ))}
                    </div>
                </div>
                {rows}
            </div>
        </div>
        </>
    );
}

function LoadPill({ person, month }: { person: AllocationPerson; month: string }): ReactElement {
    const load = personLoad(person);
    if (load === "over") {
        return (
            <span className="ax-pill ax-pill-down" title={`Busiest week: ${hours(person.peakHours)} h`}>
                {hours(person.overHours)} h over
            </span>
        );
    }
    if (load === "free") {
        return <span className="ax-pill ax-pill-up">{hours(person.freeHours)} h free in {month}</span>;
    }
    return <span className="ax-pill">Fully booked</span>;
}

function PersonDetail({ person, month, detail }: { person: AllocationPerson; month: AllocationMonth; detail: QueryResult }): ReactElement {
    const shortMonth = month.label.split(" ")[0];
    return (
        <div className="flex flex-col gap-2">
            <p className="m-0 text-200 font-semibold">
                {person.name} in {month.label}: where the hours and the revenue go
            </p>
            <QueryStates result={detail} shape="table" title={`${person.name} in ${month.label}`} emptyMessage={`No T&M hours planned in ${month.label}.`}>
                {(table) => {
                    const rows = readDetail(table);
                    const load = personLoad(person);
                    const low = load === "over" ? lowestRate(rows) : null;
                    return (
                        <>
                            <table className="ax-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Project</th>
                                        <th scope="col" className="r">Hours in {shortMonth}</th>
                                        <th scope="col" className="r">Billing rate</th>
                                        <th scope="col" className="r">Planned revenue</th>
                                        <th scope="col" className="r">Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.project}>
                                            <td>{r.project}</td>
                                            <td className="r">{hours(r.hours)}</td>
                                            <td className="r">{r.rate === null ? "—" : `${money(r.rate)}/h`}</td>
                                            <td className="r">{money(r.revenue)}</td>
                                            <td className="r">
                                                <span className="ax-gantt-share">
                                                    <span className="ax-gantt-share-bar" style={{ width: `${Math.round((r.share ?? 0) * 48)}px` }} aria-hidden="true" />
                                                    {percent(r.share)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="ax-gantt-total">
                                        <td>Total</td>
                                        <td className="r">{hours(person.monthHours)}</td>
                                        <td className="r">{person.rate === null ? "—" : `${money(person.rate)}/h avg`}</td>
                                        <td className="r">{money(person.monthRevenue)}</td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table>
                            {load === "over" && (
                                <p className="m-0 text-200 text-[var(--negative-ink)]">
                                    {hours(person.overHours)} h over in {month.label}
                                    {low !== null ? `: ${low.project} has the lowest billing rate (${money(low.rate)}/h), the first candidate to move.` : "."}
                                </p>
                            )}
                            {load === "free" && (
                                <p className="m-0 text-200 text-[var(--positive-ink)]">
                                    {hours(person.freeHours)} h free in {month.label}: room for another booking.
                                </p>
                            )}
                        </>
                    );
                }}
            </QueryStates>
        </div>
    );
}
