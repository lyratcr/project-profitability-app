import { useId, useState, type MouseEvent, type ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import type { PaceStory, PaceValues } from "@/lib/pace";
import { useElementWidth } from "@/hooks/use-element-width";
import { monthStarts, niceTicks, smoothPath } from "@/lib/chart-geometry";
import { parseModelDate } from "@/lib/plan-end";
import { cell, numberCell } from "@/lib/query-table";
import { PACE_HISTORY_WEEKS, PROJECTS_FORMATS, projectsPaceWeeksColumns } from "@/queries/projects";
import { MarkerPill } from "./chart-marker-pill.component";

const DAY = 86_400_000;
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthTick = new Intl.DateTimeFormat("en-US", { month: "short" });
const yearTick = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const hours = (v: number) => String(formatValue(v, PROJECTS_FORMATS.hours));

interface BurnUpProps {
    values: PaceValues;
    story: PaceStory;
    weeksTable: QueryTable;
    /** Last day of the pace window (last Saturday). */
    asOf: Date;
}

/**
 * Pace to plan end burn-up, in the app's chart style (Ion, 2026-11-16: "que se vea tal cual el resto del app"):
 * - a smooth gold line with a glow and a short fade below it (Ion, 2026-11-16): hours to date at the end of each of
 *   the last PACE_HISTORY_WEEKS weeks (model);
 * - the hours budget as the ink line with the glass shadow, like the budget line of the weekly chart;
 * - gridlines, an hours axis and month ticks;
 * - two straight lines from "to date": to the budget at the runout date (current pace) and at the plan end (pace
 *   needed). They only join the model's points; the x range stops 13 weeks past the plan end (a slow pace is clipped).
 * Hovering a week shows its hours to date.
 */
export function PaceBurnUp({ values, story, weeksTable, asOf }: BurnUpProps): ReactElement {
    const [ref, width] = useElementWidth();
    const [hover, setHover] = useState<number | null>(null);
    const ids = useId().replace(/:/g, "");
    const c = projectsPaceWeeksColumns;
    const points = weeksTable.rows
        .map((_, i) => {
            const sunday = parseModelDate(cell(weeksTable, c.week, i));
            const value = numberCell(weeksTable, c.hoursToDate, i);
            return sunday && value !== null ? { start: sunday, x: new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6), y: value } : null;
        })
        .filter((p): p is { start: Date; x: Date; y: number } => p !== null);
    const budget = values.budget ?? 0;
    const toDate = values.toDate ?? points.at(-1)?.y ?? 0;
    const showFuture = story === "runs-out-early" || story === "lasts" || story === "no-pace";

    const height = 300;
    const m = { l: 64, r: 20, t: 34, b: 34 };
    const plotW = width - m.l - m.r;
    const first = points[0]?.x ?? new Date(asOf.getTime() - PACE_HISTORY_WEEKS * 7 * DAY);
    const limit = values.planEnd ? values.planEnd.getTime() + 13 * 7 * DAY : asOf.getTime();
    const lastX = Math.max(asOf.getTime(), values.planEnd?.getTime() ?? 0, showFuture && values.runout ? Math.min(values.runout.getTime(), limit) : 0);
    const ticks = niceTicks(Math.max(budget, toDate, ...points.map((p) => p.y)) * 1.1);
    const maxY = ticks.at(-1) ?? 1;
    const x = (d: Date | number) => m.l + ((+d - first.getTime()) / Math.max(DAY, lastX - first.getTime())) * plotW;
    const y = (v: number) => m.t + (1 - v / maxY) * (height - m.t - m.b);
    const curve = smoothPath(points.map((p) => ({ px: x(p.x), py: y(p.y) })));
    // Region under the curve: the colour below the line is clipped to it, so it never spills above the line.
    const under = points.length > 0 ? `${curve} L${x(points[points.length - 1].x).toFixed(1)},${y(0)} L${x(points[0].x).toFixed(1)},${y(0)} Z` : "";
    const months = monthStarts(first, new Date(lastX));
    const everyMonth = plotW / Math.max(1, months.length) > 46;
    const shownMonths = months.filter((_, i) => everyMonth || i % 2 === 0);
    const hovered = hover === null ? null : (points[hover] ?? null);
    const runoutVisible = showFuture && values.runout !== null && values.runout.getTime() <= limit;

    const onMove = (e: MouseEvent<SVGRectElement>) => {
        const svg = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
        if (!svg || points.length === 0) return;
        const px = e.clientX - svg.left;
        let best = 0;
        points.forEach((p, i) => {
            if (Math.abs(x(p.x) - px) < Math.abs(x(points[best].x) - px)) best = i;
        });
        setHover(best);
    };

    return (
        <div ref={ref} className="relative w-full">
            <svg width={width} height={height} role="img" aria-label="Burn-up: hours to date, the hours budget and the pace to plan end" className="block overflow-visible">
                <defs>
                    {/* Colour that drips a little below the line and fades (Ion, 2026-11-16): the line blurred downward only. */}
                    <filter id={`${ids}-drip`} x="-5%" y="-10%" width="110%" height="300%">
                        <feGaussianBlur stdDeviation="0 16" />
                        <feOffset dy="18" />
                    </filter>
                    <filter id={`${ids}-glow`} x="-5%" y="-50%" width="110%" height="200%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <clipPath id={`${ids}-under`}>
                        <path d={under} />
                    </clipPath>
                    <linearGradient id={`${ids}-line`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--yellow-500)" />
                        <stop offset="100%" stopColor="var(--yellow-300)" />
                    </linearGradient>
                    <clipPath id={`${ids}-clip`}>
                        <rect x={m.l} y={0} width={plotW} height={height} />
                    </clipPath>
                </defs>

                {/* Gridlines and the hours axis, as in the weekly chart. */}
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid, var(--line))" />
                        <text x={m.l - 10} y={y(t) + 4} textAnchor="end" className="fill-[var(--ink-muted)] text-[11px] tabular-nums">
                            {hours(t)}
                        </text>
                    </g>
                ))}
                <text transform={`translate(14 ${(m.t + height - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="fill-[var(--ink-muted)] text-[11px] font-semibold">
                    Hours
                </text>
                {shownMonths.map((d) => (
                    <text key={d.getTime()} x={x(d)} y={height - 12} textAnchor="middle" className="fill-[var(--ink-muted)] text-[11px]">
                        {d.getMonth() === 0 ? yearTick.format(d) : monthTick.format(d)}
                    </text>
                ))}

                {/* What comes next: the future, softly shaded from "to date". */}
                {showFuture && <rect x={x(asOf)} y={m.t} width={Math.max(0, width - m.r - x(asOf))} height={y(0) - m.t} fill="var(--glass-sunken)" opacity={0.7} />}

                <g clipPath={`url(#${ids}-clip)`}>
                    <g clipPath={`url(#${ids}-under)`}>
                        <path d={curve} fill="none" stroke="var(--yellow-300)" strokeWidth={14} strokeOpacity={0.55} filter={`url(#${ids}-drip)`} />
                    </g>
                    {showFuture && values.planEnd && values.needed !== null && (
                        <line x1={x(asOf)} y1={y(toDate)} x2={x(values.planEnd)} y2={y(budget)} stroke="var(--positive)" strokeWidth={3} strokeDasharray="0.5 7" strokeLinecap="round" />
                    )}
                    {showFuture && values.runout && (
                        <line x1={x(asOf)} y1={y(toDate)} x2={x(values.runout)} y2={y(budget)} stroke="var(--negative)" strokeWidth={2.5} strokeDasharray="8 5" strokeLinecap="round" />
                    )}
                    <path d={curve} fill="none" stroke={`url(#${ids}-line)`} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" filter={`url(#${ids}-glow)`} />
                    {hovered && <circle cx={x(hovered.x)} cy={y(hovered.y)} r={5.5} fill="var(--yellow-300)" stroke="var(--surface)" strokeWidth={2.5} />}
                    <circle cx={x(asOf)} cy={y(toDate)} r={5} fill="var(--yellow-300)" stroke="var(--surface)" strokeWidth={2} />
                </g>

                {/* Hours budget: the ink line with the glass shadow. */}
                <line x1={m.l} x2={width - m.r} y1={y(budget)} y2={y(budget)} stroke="var(--ink)" strokeWidth={2.5} className="[filter:drop-shadow(0_2px_2px_var(--glass-line-shadow))]" />
                <text x={m.l + 8} y={y(budget) - 8} className="fill-[var(--ink)] text-[11px] font-semibold tabular-nums">
                    Hours budget {hours(budget)}
                </text>

                {/* Markers: to date, plan end, runout. */}
                <line x1={x(asOf)} x2={x(asOf)} y1={m.t} y2={y(0)} stroke="var(--line-strong)" strokeDasharray="3 3" />
                <MarkerPill x={x(asOf)} y={m.t - 16} text={`To date · ${hours(toDate)} h`} maxX={width - m.r} />
                {values.planEnd && x(values.planEnd) <= width - m.r + 1 && (
                    <g>
                        <line x1={x(values.planEnd)} x2={x(values.planEnd)} y1={m.t} y2={y(0)} stroke="var(--ink-muted)" strokeDasharray="3 3" />
                        <MarkerPill x={x(values.planEnd)} y={y(0) - 16} text={`Plan end · ${dateFormat.format(values.planEnd)}`} maxX={width - m.r} />
                    </g>
                )}
                {runoutVisible && values.runout && (
                    <g>
                        <circle cx={x(values.runout)} cy={y(budget)} r={11} fill="var(--negative)" opacity={0.18} />
                        <circle cx={x(values.runout)} cy={y(budget)} r={5} fill="var(--negative)" stroke="var(--surface)" strokeWidth={2} />
                        <MarkerPill x={x(values.runout)} y={y(budget) + 22} text={`Runs out ${dateFormat.format(values.runout)}`} tone="negative" maxX={width - m.r} />
                    </g>
                )}

                {hovered && <line x1={x(hovered.x)} x2={x(hovered.x)} y1={m.t} y2={y(0)} stroke="var(--yellow-500)" strokeOpacity={0.7} />}
                <rect
                    x={m.l}
                    y={m.t}
                    width={Math.max(0, x(asOf) - m.l + 12)}
                    height={Math.max(0, y(0) - m.t)}
                    fill="transparent"
                    onMouseMove={onMove}
                    onMouseLeave={() => setHover(null)}
                />
            </svg>
            {hovered && (
                <div role="tooltip" className="ax-burnup-tip pointer-events-none absolute" style={{ left: Math.min(Math.max(x(hovered.x), 100), width - 100), top: Math.max(0, y(hovered.y) - 78) }}>
                    <div className="text-200 text-[var(--ink-muted)]">
                        Week {dateFormat.format(hovered.start)} – {dateFormat.format(hovered.x)}
                    </div>
                    <div className="text-300 font-semibold tabular-nums text-[var(--ink)]">{hours(hovered.y)} hours to date</div>
                    {values.budget !== null && <div className="text-200 tabular-nums text-[var(--ink-muted)]">of a {hours(values.budget)} hours budget</div>}
                </div>
            )}
            <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-200 text-muted-foreground" aria-label="Legend">
                <li className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block h-[3px] w-5 rounded-full bg-[var(--yellow-300)] shadow-[0_0_6px_var(--yellow-300)]" />
                    Hours to date
                </li>
                <li className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block w-5 border-t-[2.5px] border-[var(--ink)] [filter:drop-shadow(0_2px_2px_var(--glass-line-shadow))]" />
                    Hours budget
                </li>
                {showFuture && (
                    <>
                        <li className="flex items-center gap-2">
                            <span aria-hidden="true" className="inline-block w-5 border-t-[2.5px] border-dashed border-[var(--negative)]" />
                            At the current pace
                        </li>
                        <li className="flex items-center gap-2">
                            <span aria-hidden="true" className="inline-block w-5 border-t-[3px] border-dotted border-[var(--positive)]" />
                            Pace needed
                        </li>
                    </>
                )}
            </ul>
        </div>
    );
}
