import { useId, useState, type MouseEvent, type ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { useElementWidth } from "@/hooks/use-element-width";
import { monthStarts, niceTicks, smoothPath } from "@/lib/chart-geometry";
import { readProjectionWeeks, type ProjectionStory, type ProjectionValues, type WeekPoint } from "@/lib/revenue-projection";
import { PROJECTS_FORMATS } from "@/queries/projects";
import { MarkerPill } from "./chart-marker-pill.component";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthTick = new Intl.DateTimeFormat("en-US", { month: "short" });
const yearTick = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const money = (v: number) => String(formatValue(v, PROJECTS_FORMATS.money));
/** Axis labels in thousands: display scaling only. */
const moneyTick = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M` : `$${Math.round(v / 1000)}k`);

/**
 * Revenue to plan end chart (Guille, 2026-11-17), in the style of the hours burn-up: cumulative revenue billed in
 * Project Ops through the integration cutoff (solid blue, the Project Ops colour), then the projection with the
 * Backlog of each week ahead (dashed), the plan (dotted) and the SOW (ink line). Every value is a model measure.
 */
export function RevenueProjectionChart({ values, story, table }: { values: ProjectionValues; story: ProjectionStory; table: QueryTable }): ReactElement {
    const [ref, width] = useElementWidth();
    const [hover, setHover] = useState<number | null>(null);
    const ids = useId().replace(/:/g, "");
    const points = readProjectionWeeks(table);
    const sow = values.sow ?? 0;

    const height = 300;
    const m = { l: 64, r: 20, t: 34, b: 34 };
    const plotW = width - m.l - m.r;
    const first = points[0]?.start ?? new Date();
    const last = points.at(-1)?.end ?? first;
    const ticks = niceTicks(Math.max(sow, values.projected ?? 0, ...points.map((p) => Math.max(p.cumulative, p.plan ?? 0))) * 1.1);
    const maxY = ticks.at(-1) ?? 1;
    const x = (d: Date) => m.l + ((d.getTime() - first.getTime()) / Math.max(1, last.getTime() - first.getTime())) * plotW;
    const y = (v: number) => m.t + (1 - v / maxY) * (height - m.t - m.b);
    const at = (p: WeekPoint) => ({ px: x(p.end), py: y(p.cumulative) });

    const billed = points.filter((p) => p.integrated);
    const lastBilled = billed.at(-1) ?? null;
    const ahead = points.filter((p) => !p.integrated);
    const billedPath = smoothPath(billed.map(at));
    // The projection starts where billing stops, so the dashed line continues the solid one.
    const projectionPath = smoothPath([...(lastBilled ? [lastBilled] : []), ...ahead].map(at));
    const planPoints = points.filter((p) => p.plan !== null);
    const planPath = smoothPath(planPoints.map((p) => ({ px: x(p.end), py: y(p.plan as number) })));
    const months = monthStarts(first, last);
    const everyMonth = plotW / Math.max(1, months.length) > 46;
    const shownMonths = months.filter((_, i) => everyMonth || i % 2 === 0);
    const cutoffX = lastBilled ? x(lastBilled.end) : m.l;
    const end = points.at(-1) ?? null;
    const endTone = story === "over" ? "negative" : story === "short" ? "warning" : undefined;
    const hovered = hover === null ? null : (points[hover] ?? null);

    const onMove = (e: MouseEvent<SVGRectElement>) => {
        const svg = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
        if (!svg || points.length === 0) return;
        const px = e.clientX - svg.left;
        let best = 0;
        points.forEach((p, i) => {
            if (Math.abs(x(p.end) - px) < Math.abs(x(points[best].end) - px)) best = i;
        });
        setHover(best);
    };

    return (
        <div ref={ref} className="relative w-full">
            <svg width={width} height={height} role="img" aria-label="Cumulative revenue: billed in Project Ops, then the projection with the Backlog ahead, against the plan and the SOW" className="block overflow-visible">
                <defs>
                    <filter id={`${ids}-glow`} x="-5%" y="-50%" width="110%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <clipPath id={`${ids}-clip`}>
                        <rect x={m.l} y={0} width={plotW} height={height} />
                    </clipPath>
                </defs>

                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid, var(--line))" />
                        <text x={m.l - 10} y={y(t) + 4} textAnchor="end" className="fill-[var(--ink-muted)] text-[11px] tabular-nums">
                            {moneyTick(t)}
                        </text>
                    </g>
                ))}
                <text transform={`translate(14 ${(m.t + height - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="fill-[var(--ink-muted)] text-[11px] font-semibold">
                    Revenue
                </text>
                {shownMonths.map((d) => (
                    <text key={d.getTime()} x={x(d)} y={height - 12} textAnchor="middle" className="fill-[var(--ink-muted)] text-[11px]">
                        {d.getMonth() === 0 ? yearTick.format(d) : monthTick.format(d)}
                    </text>
                ))}

                {/* The weeks ahead, softly shaded from the cutoff (as in the hours burn-up). */}
                {ahead.length > 0 && <rect x={cutoffX} y={m.t} width={Math.max(0, width - m.r - cutoffX)} height={y(0) - m.t} fill="var(--glass-sunken)" opacity={0.7} />}

                <g clipPath={`url(#${ids}-clip)`}>
                    <path d={planPath} fill="none" stroke="var(--ink-muted)" strokeWidth={2} strokeDasharray="1 5" strokeLinecap="round" />
                    {ahead.length > 0 && <path d={projectionPath} fill="none" stroke="var(--blue-300)" strokeWidth={3} strokeDasharray="8 6" strokeLinecap="round" />}
                    <path d={billedPath} fill="none" stroke="var(--blue-300)" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" filter={`url(#${ids}-glow)`} />
                    {hovered && <circle cx={x(hovered.end)} cy={y(hovered.cumulative)} r={5.5} fill="var(--blue-300)" stroke="var(--surface)" strokeWidth={2.5} />}
                    {lastBilled && <circle cx={cutoffX} cy={y(lastBilled.cumulative)} r={5} fill="var(--blue-300)" stroke="var(--surface)" strokeWidth={2} />}
                </g>

                {/* SOW: the ink line with the glass shadow, like the hours budget. */}
                <line x1={m.l} x2={width - m.r} y1={y(sow)} y2={y(sow)} stroke="var(--ink)" strokeWidth={2.5} className="[filter:drop-shadow(0_2px_2px_var(--glass-line-shadow))]" />
                <text x={m.l + 8} y={y(sow) - 8} className="fill-[var(--ink)] text-[11px] font-semibold tabular-nums">
                    SOW {money(sow)}
                </text>

                {lastBilled && (
                    <g>
                        <line x1={cutoffX} x2={cutoffX} y1={m.t} y2={y(0)} stroke="var(--line-strong)" strokeDasharray="3 3" />
                        <MarkerPill x={cutoffX} y={m.t - 16} text={`Billed${values.cutoff ? ` through ${dateFormat.format(values.cutoff)}` : ""} · ${money(lastBilled.cumulative)}`} maxX={width - m.r} />
                    </g>
                )}
                {end && values.projected !== null && ahead.length > 0 && (
                    <g>
                        <circle cx={x(end.end)} cy={y(values.projected)} r={11} fill={endTone === "negative" ? "var(--negative)" : endTone === "warning" ? "var(--warning)" : "var(--blue-300)"} opacity={0.18} />
                        <circle cx={x(end.end)} cy={y(values.projected)} r={5} fill="var(--blue-300)" stroke="var(--surface)" strokeWidth={2} />
                        <MarkerPill x={x(end.end)} y={y(values.projected) + (values.projected >= sow ? -24 : 24)} text={`Projected ${money(values.projected)}`} tone={endTone} maxX={width - m.r} />
                    </g>
                )}

                {hovered && <line x1={x(hovered.end)} x2={x(hovered.end)} y1={m.t} y2={y(0)} stroke="var(--blue-300)" strokeOpacity={0.6} />}
                <rect x={m.l} y={m.t} width={Math.max(0, plotW)} height={Math.max(0, y(0) - m.t)} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
            </svg>
            {hovered && (
                <div role="tooltip" className="ax-burnup-tip pointer-events-none absolute" style={{ left: Math.min(Math.max(x(hovered.end), 110), width - 110), top: Math.max(0, y(hovered.cumulative) - 86) }}>
                    <div className="text-200 text-[var(--ink-muted)]">
                        Week {dateFormat.format(hovered.start)} – {dateFormat.format(hovered.end)}
                    </div>
                    <div className="text-300 font-semibold tabular-nums text-[var(--ink)]">
                        {money(hovered.cumulative)} {hovered.integrated ? "billed to date" : "projected"}
                    </div>
                    {hovered.plan !== null && <div className="text-200 tabular-nums text-[var(--ink-muted)]">Plan to date {money(hovered.plan)}</div>}
                </div>
            )}
            <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-200 text-muted-foreground" aria-label="Legend">
                <li className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block h-[3px] w-5 rounded-full bg-[var(--blue-300)] shadow-[0_0_6px_var(--blue-300)]" />
                    Billed in Project Ops
                </li>
                <li className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block w-5 border-t-[3px] border-dashed border-[var(--blue-300)]" />
                    Projection (Backlog ahead)
                </li>
                <li className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block w-5 border-t-[2px] border-dotted border-[var(--ink-muted)]" />
                    Plan (Backlog)
                </li>
                <li className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block w-5 border-t-[2.5px] border-[var(--ink)] [filter:drop-shadow(0_2px_2px_var(--glass-line-shadow))]" />
                    SOW
                </li>
            </ul>
        </div>
    );
}
