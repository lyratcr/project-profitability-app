import type { ReactElement } from "react";

/** A small rounded label on an act 4 chart (to date, plan end, runout, projected), kept inside the plot. */
export function MarkerPill({ x, y, text, tone, maxX }: { x: number; y: number; text: string; tone?: "negative" | "warning"; maxX: number }): ReactElement {
    const w = text.length * 6.9 + 20;
    const left = Math.min(Math.max(x - w / 2, 0), maxX - w);
    const stroke = tone === "negative" ? "var(--negative)" : tone === "warning" ? "var(--warning)" : "var(--line-strong)";
    const ink = tone === "negative" ? "fill-[var(--negative-ink)]" : tone === "warning" ? "fill-[var(--accent-ink)]" : "fill-[var(--ink)]";
    return (
        <g transform={`translate(${left} ${y - 10})`}>
            <rect width={w} height={20} rx={10} fill="var(--surface-raised)" stroke={stroke} />
            <text x={w / 2} y={14} textAnchor="middle" className={`text-[11px] font-semibold tabular-nums ${ink}`}>
                {text}
            </text>
        </g>
    );
}
