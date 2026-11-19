import { useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { DAY_LIMIT, WEEK_CAPACITY, type AllocationPerson, type WeekCell, type WeekDetail } from "@/lib/allocation";
import { ALLOCATION_FORMATS } from "@/queries/allocation";
import type { BreakdownState } from "./people-week-tooltip.component";

interface AllocationWeekTooltipProps {
    id: string;
    /** The hovered week of the person's row, in viewport coordinates. */
    anchor: DOMRect;
    person: AllocationPerson;
    weekStart: Date;
    /** The week's load from the strip query (model values); undefined when no T&M hours are planned. */
    load: WeekCell | undefined;
    detail: WeekDetail | null;
    state: BreakdownState;
}

const WIDTH = 300;
const GAP = 8;
const hours = (v: number | null) => (v === null ? "—" : String(formatValue(v, ALLOCATION_FORMATS.hours)));
const money = (v: number | null) => (v === null ? "—" : String(formatValue(v, ALLOCATION_FORMATS.money)));
const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dayYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Resource Allocation week tooltip (mockup approved by Ion, 2026-11-19), in the look of the Project Health hours
 * tooltip: planned T&M hours against the 40 h capacity with the free or over hours, planned revenue, then where the
 * hours go by project and by day (a day above 8 h is marked). Every number comes from the model; bar widths only draw
 * each project's part of the week. Portal with fixed position, so the scroll box and glass cards don't clip it.
 */
export function AllocationWeekTooltip({ id, anchor, person, weekStart, load, detail, state }: AllocationWeekTooltipProps): ReactElement {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

    useLayoutEffect(() => {
        const height = ref.current?.offsetHeight ?? 0;
        const right = anchor.right + GAP;
        const left = right + WIDTH <= window.innerWidth - GAP ? right : Math.max(GAP, anchor.left - GAP - WIDTH);
        const top = Math.min(Math.max(GAP, anchor.top), Math.max(GAP, window.innerHeight - GAP - height));
        setPos({ left, top });
    }, [anchor, detail, state]);

    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
    const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
    const meta = [person.role, person.l1].filter((v) => v !== null).join(" · ");
    const total = detail?.hours ?? load?.hours ?? null;
    const over = load !== undefined && Math.round(load.over) > 0;
    const free = load === undefined ? WEEK_CAPACITY : load.free;

    return createPortal(
        <div
            ref={ref}
            id={id}
            role="tooltip"
            className="ax-cell-tooltip"
            style={{ width: WIDTH, left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
        >
            <div className="ax-cell-tooltip-name">{person.name}</div>
            <div className="ax-cell-tooltip-muted">
                Week {day.format(weekStart)} – {dayYear.format(weekEnd)}
                {meta !== "" && ` · ${meta}`}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="ax-cell-tooltip-muted">Planned (T&amp;M Backlog)</span>
                <span className="text-[18px] font-semibold tabular-nums text-[var(--ink)]">{load === undefined ? "0" : hours(total)} h</span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="ax-cell-tooltip-muted">Capacity</span>
                <span className="tabular-nums">{WEEK_CAPACITY} h</span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="ax-cell-tooltip-muted">{over ? "Over capacity" : "Free"}</span>
                {over ? <span className="ax-var-pill is-over">+{hours(load!.over)} h</span> : <span className="ax-var-pill is-under">{hours(free)} h</span>}
            </div>
            {load !== undefined && (
                <div className="flex items-center justify-between gap-3">
                    <span className="ax-cell-tooltip-muted">Planned revenue</span>
                    <span className="tabular-nums">{state === "ready" ? money(detail?.revenue ?? null) : "…"}</span>
                </div>
            )}

            {load === undefined && <p className="ax-cell-tooltip-muted m-0 mt-3">No T&amp;M hours planned this week. Fixed Fee work isn&apos;t planned by person, so it doesn&apos;t show here.</p>}
            {load !== undefined && state === "loading" && <p className="ax-cell-tooltip-muted m-0 mt-3">Loading the week…</p>}
            {load !== undefined && state === "error" && <p className="m-0 mt-3 text-[var(--negative-ink)]">Couldn&apos;t load the week. Reload the page to try again.</p>}

            {load !== undefined && state === "ready" && detail !== null && (
                <>
                    <section className="ax-cell-tooltip-section" aria-label="By project">
                        <div className="ax-cell-tooltip-heading">{detail.projects.length === 1 ? "Project" : "By project"}</div>
                        {detail.projects.map((p) => (
                            <div key={p.project} className="ax-alloc-tip-row">
                                <span className="truncate">{p.project}</span>
                                <span className="ax-cell-tooltip-track" aria-hidden="true">
                                    {p.hours !== null && (total ?? 0) > 0 && <span style={{ width: `${Math.min(100, (p.hours / total!) * 100)}%`, background: "var(--chart-2)" }} />}
                                </span>
                                <span className="text-right tabular-nums">{hours(p.hours)}</span>
                                <span className="ax-cell-tooltip-muted text-right tabular-nums">{money(p.revenue)}</span>
                            </div>
                        ))}
                    </section>

                    <section className="ax-cell-tooltip-section" aria-label="By day">
                        <div className="ax-cell-tooltip-heading">
                            By day <span className="normal-case tracking-normal">· red = more than {DAY_LIMIT} h</span>
                        </div>
                        <div className="ax-cell-tooltip-days">
                            {days.map((d) => {
                                const h = detail.days.get(ymd(d));
                                const heavy = h !== undefined && Math.round(h) > DAY_LIMIT;
                                return (
                                    <div key={d.getDate()} className={heavy ? "is-heavy" : h ? "" : "is-empty"}>
                                        <span>{weekday.format(d).slice(0, 2)}</span>
                                        <b>{h ? hours(h) : "—"}</b>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}
        </div>,
        document.body,
    );
}
