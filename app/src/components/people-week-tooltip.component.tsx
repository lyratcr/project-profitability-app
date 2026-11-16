import { useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { signedChange } from "@/lib/change";
import { diffTone, weekKey, type BreakdownPart, type CellBreakdown, type MatrixCell } from "@/lib/people-week";
import { PAY_CATEGORIES } from "@/queries/effort/effort-weekly-trend";

/** Where the breakdown query stands; the tooltip shows its own loading and error lines. */
export type BreakdownState = "loading" | "error" | "ready";

export interface CellTooltipProps {
    id: string;
    /** The hovered or focused cell, in viewport coordinates. */
    anchor: DOMRect;
    name: string;
    /** "Week Nov 1 – Nov 7, 2026" or the window for the total column. */
    period: string;
    /** The week's Sunday; null for the window total (no day strip). */
    weekStart: Date | null;
    value: MatrixCell;
    breakdown: CellBreakdown | undefined;
    state: BreakdownState;
}

const WIDTH = 300;
const GAP = 8;
const hours = (v: number) => String(formatValue(v, "#,0"));
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });

/** Pay categories in the Effort page's order and colours (chart-1 Regular Time … chart-4 Time Off), then any other. */
function categoryRows(parts: BreakdownPart[]): { label: string; hours: number | null; color: string }[] {
    const known: readonly string[] = PAY_CATEGORIES;
    const rows = PAY_CATEGORIES.map((label, i) => ({ label, hours: parts.find((p) => p.label === label)?.hours ?? null, color: `var(--chart-${i + 1})` }));
    const others = parts.filter((p) => !known.includes(p.label)).map((p) => ({ label: p.label, hours: p.hours, color: "var(--chart-6)" }));
    return [...rows, ...others];
}

/**
 * Power BI style tooltip for a person's cell in the people x week matrix (Ion, 2026-11-16): the cell's hours and
 * budget, then what the hours are made of (pay category, task, and day for a week). Every number comes from the
 * model; the bar widths only draw each category's share of the cell's hours. Rendered in a portal with fixed
 * position, so the table's scroll box and the glass cards (backdrop-filter) don't clip or move it.
 */
export function CellTooltip({ id, anchor, name, period, weekStart, value, breakdown, state }: CellTooltipProps): ReactElement {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

    useLayoutEffect(() => {
        const height = ref.current?.offsetHeight ?? 0;
        const right = anchor.right + GAP;
        const left = right + WIDTH <= window.innerWidth - GAP ? right : Math.max(GAP, anchor.left - GAP - WIDTH);
        const top = Math.min(Math.max(GAP, anchor.top), Math.max(GAP, window.innerHeight - GAP - height));
        setPos({ left, top });
    }, [anchor, breakdown, state]);

    const total = value.hours ?? 0;
    const tone = diffTone(value.diff);
    const days = weekStart
        ? Array.from({ length: 7 }, (_, i) => {
              const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
              return { date, day: breakdown?.days[weekKey(date) ?? ""] };
          })
        : [];
    const splitDays = days.filter((d) => (d.day?.parts.length ?? 0) > 1);

    return createPortal(
        <div
            ref={ref}
            id={id}
            role="tooltip"
            className="ax-cell-tooltip"
            style={{ width: WIDTH, left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
        >
            <div className="ax-cell-tooltip-name">{name}</div>
            <div className="ax-cell-tooltip-muted">{period}</div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="ax-cell-tooltip-muted">Hours on the project</span>
                <span className="text-[18px] font-semibold tabular-nums text-[var(--ink)]">{hours(total)} h</span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="ax-cell-tooltip-muted">{value.planned === null ? "No budget for this person" : `Budget ${hours(value.planned)} h`}</span>
                {tone !== null && value.diff !== null && <span className={`ax-var-pill is-${tone}`}>{signedChange(Math.round(value.diff), "#,0")}</span>}
            </div>

            {state === "loading" && <p className="ax-cell-tooltip-muted m-0 mt-3">Loading the breakdown…</p>}
            {state === "error" && <p className="m-0 mt-3 text-[var(--negative-ink)]">Couldn&apos;t load the breakdown. Reload the page to try again.</p>}
            {state === "ready" && !breakdown && <p className="ax-cell-tooltip-muted m-0 mt-3">No breakdown for these hours.</p>}

            {state === "ready" && breakdown && (
                <>
                    <section className="ax-cell-tooltip-section" aria-label="By pay category">
                        <div className="ax-cell-tooltip-heading">By pay category</div>
                        {categoryRows(breakdown.categories).map((r) => (
                            <div key={r.label} className={`ax-cell-tooltip-row${r.hours === null ? " is-empty" : ""}`}>
                                <span>{r.label}</span>
                                <span className="ax-cell-tooltip-track" aria-hidden="true">
                                    {r.hours !== null && total > 0 && (
                                        <span style={{ width: `${Math.min(100, (r.hours / total) * 100)}%`, background: r.color }} />
                                    )}
                                </span>
                                <span className="text-right tabular-nums">{r.hours === null ? "—" : hours(r.hours)}</span>
                            </div>
                        ))}
                    </section>

                    <section className="ax-cell-tooltip-section" aria-label="By task">
                        <div className="ax-cell-tooltip-heading">{breakdown.tasks.length === 1 ? "Task" : "By task"}</div>
                        {breakdown.tasks.map((t) => (
                            <div key={t.label} className="flex justify-between gap-3">
                                <span className="min-w-0 whitespace-normal">{t.label}</span>
                                <span className="tabular-nums">{hours(t.hours)}</span>
                            </div>
                        ))}
                    </section>

                    {weekStart && (
                        <section className="ax-cell-tooltip-section" aria-label="By day">
                            <div className="ax-cell-tooltip-heading">By day</div>
                            <div className="ax-cell-tooltip-days">
                                {days.map(({ date, day }) => (
                                    <div key={date.getDate()} className={(day?.parts.length ?? 0) > 1 ? "is-split" : day?.total ? "" : "is-empty"}>
                                        <span>{weekday.format(date).slice(0, 2)}</span>
                                        <b>{day?.total ? hours(day.total) : "—"}</b>
                                    </div>
                                ))}
                            </div>
                            {splitDays.map(({ date, day }) => (
                                <div key={date.getDate()} className="ax-cell-tooltip-muted mt-1">
                                    {weekday.format(date)}: {day?.parts.map((p) => `${hours(p.hours)} ${p.label}`).join(" + ")}
                                </div>
                            ))}
                        </section>
                    )}
                </>
            )}
        </div>,
        document.body,
    );
}
