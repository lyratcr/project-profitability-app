import type { ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { signedChange } from "@/lib/change";
import { diffTone, weekKey, type MatrixCell, type MatrixRow, type PeopleMatrix } from "@/lib/people-week";
import { cn } from "@/lib/utils";

interface PeopleWeekMatrixProps {
    matrix: PeopleMatrix;
    /** The window's Sundays, oldest first. */
    weeks: readonly Date[];
    /** Sunday of the current week (its column is to date). */
    currentWeek: Date;
    /** Sunday of the week picked in the Week filter, highlighted. */
    selectedWeek: Date;
}

const label = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" });
const hours = (v: number | null) => (v === null ? "—" : String(formatValue(v, "#,0")));

function Pill({ diff }: { diff: number | null }): ReactElement | null {
    const tone = diffTone(diff);
    if (tone === null || diff === null) return null;
    return <span className={`ax-var-pill is-${tone}`}>{signedChange(Math.round(diff), "#,0")}</span>;
}

function Cell({ value, kind }: { value: MatrixCell | undefined; kind: MatrixRow["kind"] }): ReactElement {
    if (!value || (value.hours === null && value.planned === null)) return <span className="text-[var(--ink-muted)]">—</span>;
    if (kind === "role" || kind === "services") {
        // Plan only: nobody logs hours against a role or a service line.
        return <span className="ax-matrix-plan">plan {hours(value.planned)}</span>;
    }
    return (
        <span className="flex flex-col items-center gap-0.5">
            <span className="ax-matrix-hours">{hours(value.hours ?? 0)}</span>
            <span className="ax-matrix-plan">of {hours(value.planned ?? 0)}</span>
            <Pill diff={value.diff} />
        </span>
    );
}

function VariancePill({ variance }: { variance: number | null }): ReactElement {
    if (variance === null) return <span className="text-[var(--ink-muted)]">—</span>;
    const tone = Math.round(variance * 100) > 0 ? "over" : Math.round(variance * 100) < 0 ? "under" : "even";
    return <span className={`ax-var-pill is-${tone}`}>{signedChange(variance, "#,0%")}</span>;
}

/**
 * P6 people x week matrix (PMs, 2026-11-12): one row per person with actual hours, "of" budget and the difference
 * in each Sunday-Saturday week; plan not assigned to a person by role; catalog services; and the project row.
 * Green under budget, red over (Auxis status colours, with the sign).
 */
export function PeopleWeekMatrix({ matrix, weeks, currentWeek, selectedWeek }: PeopleWeekMatrixProps): ReactElement {
    const keys = weeks.map((w) => weekKey(w) ?? "");
    const current = weekKey(currentWeek);
    const selected = weekKey(selectedWeek);
    const rows: MatrixRow[] = [...matrix.people, ...matrix.roles, ...(matrix.services ? [matrix.services] : [])];

    const renderRow = (row: MatrixRow) => (
        <tr key={row.key} className={cn(row.kind === "project" && "ax-matrix-total", row.kind !== "person" && row.kind !== "project" && "ax-matrix-muted")}>
            <th scope="row" className="ax-matrix-name">
                {row.label}
                {row.kind === "role" && <span className="ml-1 text-[var(--ink-muted)]">· role, unassigned</span>}
            </th>
            {keys.map((k) => (
                <td key={k} className={cn("ax-matrix-cell", k === selected && "ax-matrix-selected")}>
                    <Cell value={row.weeks[k]} kind={row.kind} />
                </td>
            ))}
            <td className="ax-matrix-cell ax-matrix-sum">
                <Cell value={row.total} kind={row.kind} />
            </td>
            <td className="ax-matrix-cell">{row.kind === "person" || row.kind === "project" ? <VariancePill variance={row.total.variance} /> : null}</td>
        </tr>
    );

    return (
        <div className="overflow-x-auto">
            <table className="ax-table ax-matrix w-full min-w-[760px]">
                <caption className="sr-only">Hours vs budget by person and week</caption>
                <thead>
                    <tr>
                        <th scope="col" className="ax-matrix-name">
                            Person
                        </th>
                        {weeks.map((w, i) => (
                            <th key={keys[i]} scope="col" className={cn("ax-matrix-cell", keys[i] === selected && "ax-matrix-selected")}>
                                {label.format(w)}
                                {keys[i] === current && <span className="block font-normal normal-case tracking-normal">to date</span>}
                            </th>
                        ))}
                        <th scope="col" className="ax-matrix-cell ax-matrix-sum">
                            Total
                        </th>
                        <th scope="col" className="ax-matrix-cell">
                            Var.
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(renderRow)}
                    {matrix.project && renderRow(matrix.project)}
                </tbody>
            </table>
        </div>
    );
}
