import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { signedChange } from "@/lib/change";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { breakdownKey, buildBreakdown, diffTone, weekKey, type MatrixCell, type MatrixRow, type PeopleMatrix } from "@/lib/people-week";
import { CellTooltip, type BreakdownState } from "./people-week-tooltip.component";
import { cn } from "@/lib/utils";

interface PeopleWeekMatrixProps {
    matrix: PeopleMatrix;
    /** The window's Sundays, oldest first. */
    weeks: readonly Date[];
    /** Sunday of the current week (its column is to date). */
    currentWeek: Date;
    /** Sunday of the highlighted week (last week, the Monday review week). */
    selectedWeek: Date;
    /**
     * Cell tooltips (Ion, 2026-11-16): the breakdown query for one person and one week (null = the whole window).
     * Run only for the cell being hovered, so long windows never load every day of every person up front.
     */
    breakdownQuery?: (employeeNumber: string, week: Date | null) => { connection: string; query: string };
    /** The project, for the tooltip's period line. */
    project: string;
    /** First column heading: "Person" or "Project". */
    rowLabel?: string;
    /** Show only this many rows until "Show all" (aggregated view). */
    rowLimit?: number;
    /** Aggregated view: clicking a project's name opens it. */
    onRowPick?: (key: string) => void;
    /** Last day billed in Project Ops: later weeks show Synerion hours and say so in the header (Ion, 2026-11-16). */
    billedThrough?: Date | null;
    /** Budget matrix or the Project Ops vs Synerion reconciliation (same layout). */
    mode?: MatrixMode;
}

const label = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" });
const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const yearLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const hours = (v: number | null) => (v === null ? "—" : String(formatValue(v, "#,0")));

/** "budget": hours vs plan (red over, green under). "reconcile": Project Ops vs Synerion (any difference amber, Ion 2026-11-16). */
export type MatrixMode = "budget" | "reconcile";

function Pill({ diff, mode }: { diff: number | null; mode: MatrixMode }): ReactElement | null {
    const tone = diffTone(diff);
    if (tone === null || diff === null) return null;
    const kind = mode === "reconcile" ? (tone === "even" ? "even" : "diff") : tone;
    return <span className={`ax-var-pill is-${kind}`}>{signedChange(Math.round(diff), "#,0")}</span>;
}

function Cell({ value, kind, mode }: { value: MatrixCell | undefined; kind: MatrixRow["kind"]; mode: MatrixMode }): ReactElement {
    if (!value || (value.hours === null && value.planned === null)) return <span className="text-[var(--ink-muted)]">—</span>;
    if (kind === "role" || kind === "services") {
        // Plan only: nobody logs hours against a role or a service line.
        return <span className="ax-matrix-plan">plan {hours(value.planned)}</span>;
    }
    return (
        <span className="flex flex-col items-center gap-0.5">
            <span className="ax-matrix-hours">{hours(value.hours ?? 0)}</span>
            {/* No plan in that week reads "of 0", as the PMs asked (Ion, 2026-11-16: keep "0", not "no plan"). */}
            <span className="ax-matrix-plan">of {hours(value.planned ?? 0)}</span>
            <Pill diff={value.diff} mode={mode} />
        </span>
    );
}

function VariancePill({ variance, mode }: { variance: number | null; mode: MatrixMode }): ReactElement {
    if (variance === null) return <span className="text-[var(--ink-muted)]">—</span>;
    const sign = Math.round(variance * 100);
    const tone = sign === 0 ? "even" : mode === "reconcile" ? "diff" : sign > 0 ? "over" : "under";
    return <span className={`ax-var-pill is-${tone}`}>{signedChange(variance, "#,0%")}</span>;
}

/**
 * P6 people x week matrix (PMs, 2026-11-12): one row per person with actual hours, "of" budget and the difference
 * in each Sunday-Saturday week; plan not assigned to a person by role; catalog services; and the project row.
 * Green under budget, red over (Auxis status colours, with the sign).
 */
export function PeopleWeekMatrix({ matrix, weeks, currentWeek, selectedWeek, breakdownQuery, project, rowLabel = "Person", rowLimit, onRowPick, billedThrough = null, mode = "budget" }: PeopleWeekMatrixProps): ReactElement {
    const keys = weeks.map((w) => weekKey(w) ?? "");
    const tooltipId = useId();
    const [active, setActive] = useState<{ row: MatrixRow; week: string | null; rect: DOMRect } | null>(null);
    const [showAll, setShowAll] = useState(false);
    const scroller = useRef<HTMLDivElement | null>(null);
    // Weeks scroll sideways from the first week to this week (Ion, 2026-11-16); open at this week.
    const lastKey = keys[keys.length - 1];
    useEffect(() => {
        const el = scroller.current;
        if (el) el.scrollLeft = el.scrollWidth;
    }, [lastKey, keys.length]);

    // Lazy tooltip breakdown: one query for the hovered person and week (cached, so a second hover is instant).
    const breakdownConfig =
        active && active.row.kind === "person" && breakdownQuery
            ? breakdownQuery(active.row.key, active.week ? new Date(`${active.week}T00:00:00`) : null)
            : null;
    const breakdownData = useSemanticModelQuery({ connection: breakdownConfig?.connection ?? "profitmodel", query: breakdownConfig?.query ?? "" }).data;
    const breakdown = useMemo(() => (breakdownData?.status === "success" ? buildBreakdown(breakdownData.table) : null), [breakdownData]);
    const breakdownState: BreakdownState = breakdownData?.status === "success" ? "ready" : breakdownData?.status === "error" ? "error" : "loading";

    // The tooltip sits at fixed coordinates: close it when the page or the table scrolls, or on Escape.
    useEffect(() => {
        if (!active) return;
        const close = () => setActive(null);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
            window.removeEventListener("keydown", onKey);
        };
    }, [active]);

    const isActive = (row: MatrixRow, week: string | null) => active?.row.key === row.key && active.week === week;
    /** A person's cell with hours opens the tooltip on hover, keyboard focus or a tap. */
    const cellContent = (row: MatrixRow, week: string | null, value: MatrixCell | undefined) => {
        const content = <Cell value={value} kind={row.kind} mode={mode} />;
        // Reconciliation: a week with Synerion hours but nothing billed is worth explaining too.
        const hasHours = value && (value.hours !== null || (mode === "reconcile" && value.planned !== null));
        if (row.kind !== "person" || !value || !hasHours) return content;
        const open = (el: HTMLElement) => setActive({ row, week, rect: el.getBoundingClientRect() });
        const when = week ? `week of ${dayLabel.format(new Date(`${week}T00:00:00`))}` : "total";
        return (
            <button
                type="button"
                className="ax-matrix-hit"
                aria-describedby={isActive(row, week) ? tooltipId : undefined}
                aria-label={`${row.label}, ${when}: what the hours are made of`}
                onMouseEnter={(e) => open(e.currentTarget)}
                onMouseLeave={() => setActive(null)}
                onFocus={(e) => open(e.currentTarget)}
                onBlur={() => setActive(null)}
                onClick={(e) => (isActive(row, week) ? setActive(null) : open(e.currentTarget))}
            >
                {content}
            </button>
        );
    };

    const tooltip = () => {
        if (!active) return null;
        const cellValue = active.week ? active.row.weeks[active.week] : active.row.total;
        if (!cellValue) return null;
        // Reconciliation cells: hours = Project Ops, planned = Synerion; the tooltip shows both and the difference.
        const value: MatrixCell =
            mode === "reconcile"
                ? { hours: cellValue.hours ?? 0, planned: null, diff: null, variance: null, synerion: cellValue.planned, billedVsSynerion: cellValue.diff, fromProjectOps: true }
                : cellValue;
        const start = active.week ? new Date(`${active.week}T00:00:00`) : null;
        const first = weeks[0];
        const last = weeks[weeks.length - 1];
        const period = start
            ? `Week ${dayLabel.format(start)} – ${yearLabel.format(addDays(start, 6))}${active.week === current ? ", to date" : ""} · ${project}`
            : `${weeks.length} weeks · ${dayLabel.format(first)} – ${yearLabel.format(addDays(last, 6))} · ${project}`;
        return (
            <CellTooltip
                id={tooltipId}
                anchor={active.rect}
                name={active.row.label}
                period={period}
                weekStart={start}
                value={value}
                breakdown={breakdown?.get(breakdownKey(active.row.key, active.week))}
                state={breakdownState}
                showBudget={mode === "budget"}
            />
        );
    };
    const current = weekKey(currentWeek);
    const selected = weekKey(selectedWeek);
    const allRows: MatrixRow[] = [...matrix.people, ...matrix.roles, ...(matrix.services ? [matrix.services] : [])];
    const limited = rowLimit !== undefined && !showAll && allRows.length > rowLimit;
    const rows = limited ? allRows.slice(0, rowLimit) : allRows;

    const renderRow = (row: MatrixRow) => (
        <tr key={row.key} className={cn(row.kind === "project" && "ax-matrix-total", (row.kind === "role" || row.kind === "services") && "ax-matrix-muted")}>
            <th scope="row" className="ax-matrix-name" title={row.label}>
                {row.kind === "item" && onRowPick ? (
                    <button type="button" className="ax-link-button" onClick={() => onRowPick(row.key)}>
                        {row.label}
                    </button>
                ) : (
                    row.label
                )}
                {row.kind === "role" && <span className="ml-1 text-[var(--ink-muted)]">· role, unassigned</span>}
            </th>
            {keys.map((k) => (
                <td key={k} className={cn("ax-matrix-cell", k === selected && "ax-matrix-selected")}>
                    {cellContent(row, k, row.weeks[k])}
                </td>
            ))}
            <td className="ax-matrix-cell ax-matrix-sum ax-matrix-pin-total">
                {cellContent(row, null, row.total)}
            </td>
            <td className="ax-matrix-cell ax-matrix-pin-var">{row.kind === "role" || row.kind === "services" ? null : <VariancePill variance={row.total.variance} mode={mode} />}</td>
        </tr>
    );

    return (
        <div>
        <div ref={scroller} className="ax-matrix-scroll overflow-x-auto" tabIndex={0} aria-label={`Weeks ${dayLabel.format(weeks[0])} to ${yearLabel.format(weeks[weeks.length - 1])}, scroll sideways`}>
            <table className="ax-table ax-matrix w-full min-w-[760px]">
                <caption className="sr-only">Hours vs budget by {rowLabel.toLowerCase()} and week</caption>
                <thead>
                    <tr>
                        <th scope="col" className="ax-matrix-name">
                            {rowLabel}
                        </th>
                        {weeks.map((w, i) => (
                            <th key={keys[i]} scope="col" className={cn("ax-matrix-cell", keys[i] === selected && "ax-matrix-selected")}>
                                {i === 0 || (w.getMonth() === 0 && w.getDate() <= 7) ? yearLabel.format(w) : label.format(w)}
                                {keys[i] === current && <span className="block font-normal normal-case tracking-normal">to date</span>}
                                {billedThrough !== null && w > billedThrough && (
                                    <span className="ax-matrix-source">{mode === "reconcile" ? "Not in Project Ops" : "Synerion"}</span>
                                )}
                            </th>
                        ))}
                        <th scope="col" className="ax-matrix-cell ax-matrix-sum ax-matrix-pin-total">
                            Total
                        </th>
                        <th scope="col" className="ax-matrix-cell ax-matrix-pin-var">
                            Var.
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(renderRow)}
                    {matrix.project && renderRow(matrix.project)}
                </tbody>
            </table>
            {tooltip()}
        </div>
            {limited && (
                <button type="button" className="ax-show-all mt-3" onClick={() => setShowAll(true)}>
                    Show all {allRows.length} {rowLabel.toLowerCase()}s
                </button>
            )}
        </div>
    );
}
