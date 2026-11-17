import { useState, type ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { paceStory, type PaceStory, type PaceValues } from "@/lib/pace";
import { parseModelDate } from "@/lib/plan-end";
import { cell, numberCell } from "@/lib/query-table";
import { AGGREGATE_ROWS, PACE_WEEKS, PROJECTS_FORMATS, projectsPaceByProjectColumns as c } from "@/queries/projects";
import { AxCard } from "./ax/ax-card.component";
import { QueryStates, type QueryResult } from "./query-states.component";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const hours = (v: number | null) => (v === null ? "—" : String(formatValue(v, PROJECTS_FORMATS.hours)));
const weeks = (v: number | null) => (v === null ? "—" : String(formatValue(Math.abs(v), "#,0")));

/** Status of each story: the dot tone and a word, never colour alone. */
const STORY: Record<PaceStory, { tone: "negative" | "positive" | "warning" | "info" | "none"; label: string }> = {
    "runs-out-early": { tone: "negative", label: "Runs out early" },
    "over-budget": { tone: "negative", label: "Over budget" },
    lasts: { tone: "positive", label: "Lasts to plan end" },
    "no-pace": { tone: "info", label: "No hours lately" },
    "plan-ended": { tone: "warning", label: "Plan ended" },
    "no-budget": { tone: "none", label: "Fixed Fee, no hours budget" },
};

interface Row {
    key: string;
    name: string;
    pm: string | null;
    values: PaceValues;
    story: PaceStory;
}

function readRows(table: QueryTable): Row[] {
    return table.rows.map((_, i) => {
        const values: PaceValues = {
            budget: numberCell(table, c.budget, i),
            toDate: numberCell(table, c.toDate, i),
            left: numberCell(table, c.left, i),
            pace: numberCell(table, c.pace, i),
            weeksToEnd: numberCell(table, c.weeksToEnd, i),
            needed: numberCell(table, c.needed, i),
            runout: parseModelDate(cell(table, c.runout, i)),
            weeksBefore: numberCell(table, c.weeksBefore, i),
            planEnd: parseModelDate(cell(table, c.planEnd, i)),
        };
        const key = String(cell(table, c.projectKey, i) ?? "");
        const pm = cell(table, c.pm, i);
        return { key, name: String(cell(table, c.projectName, i) ?? key), pm: typeof pm === "string" && pm.trim() !== "" ? pm.trim() : null, values, story: paceStory(values) };
    });
}

/** What the "Before plan end" column says for one project. */
function beforeEnd(row: Row): { text: string; className: string } {
    const v = row.values;
    switch (row.story) {
        case "runs-out-early":
            return { text: `${weeks(v.weeksBefore)} weeks early`, className: "text-[var(--negative-ink)]" };
        case "lasts":
            return { text: weeks(v.weeksBefore) === "0" ? "On plan end" : `${weeks(v.weeksBefore)} weeks to spare`, className: "text-[var(--positive-ink)]" };
        case "over-budget":
            return { text: `${hours(v.left === null ? null : -v.left)} h over`, className: "text-[var(--negative-ink)]" };
        case "plan-ended":
            return { text: v.planEnd ? `Ended ${dateFormat.format(v.planEnd)}` : "Ended", className: "text-[var(--ink-muted)]" };
        default:
            return { text: "—", className: "text-[var(--ink-muted)]" };
    }
}

interface ProjectsByPaceProps {
    result: QueryResult;
    /** Opens one project (sets the Project filter). */
    onPick: (projectKey: string) => void;
}

/**
 * P6 aggregated view, act 4 (Ion, 2026-11-16): the pace of every project in scope, the ones whose hours budget runs
 * out earliest before plan end first (order from the model query). Every number is a `_app\Pace` measure
 * (docs/08_app_measures.md § 19); the status only reads their signs. Clicking a project opens it.
 */
export function ProjectsByPace({ result, onPick }: ProjectsByPaceProps): ReactElement {
    const [showAll, setShowAll] = useState(false);
    return (
        <AxCard
            title="Projects by pace"
            subtitle={`Hours budget (plan hours, Backlog, whole project life) vs the pace of the last ${PACE_WEEKS} complete weeks · the ones that run out earliest first · pick a project to open it`}
        >
            <QueryStates result={result} shape="table" title="Projects by pace" emptyMessage="No projects with hours or plan in this selection.">
                {(table) => {
                    const rows = readRows(table);
                    const shown = showAll ? rows : rows.slice(0, AGGREGATE_ROWS);
                    return (
                        <>
                            <div className="overflow-x-auto">
                                <table className="ax-table ax-pace-table w-full">
                                    <caption className="sr-only">Projects by pace</caption>
                                    <thead>
                                        <tr>
                                            <th scope="col">Project</th>
                                            <th scope="col">Project manager</th>
                                            <th scope="col" className="ax-center">Status</th>
                                            <th scope="col" className="ax-center">Budget left</th>
                                            <th scope="col" className="ax-center">Current vs needed pace</th>
                                            <th scope="col" className="ax-center">Runs out</th>
                                            <th scope="col" className="ax-center">Before plan end</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shown.map((row) => {
                                            const status = STORY[row.story];
                                            const end = beforeEnd(row);
                                            return (
                                                <tr key={row.key}>
                                                    <th scope="row" className="text-left font-normal">
                                                        <button type="button" className="ax-link-button" onClick={() => onPick(row.key)} title={`Open ${row.name}`}>
                                                            {row.name}
                                                        </button>
                                                    </th>
                                                    <td>{row.pm ?? "—"}</td>
                                                    <td className="ax-center">
                                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                                            {status.tone !== "none" && <span className={`ax-dot ax-dot-${status.tone}`} aria-hidden="true" />}
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td className="ax-center tabular-nums">{row.values.left === null ? "—" : `${hours(row.values.left)} h`}</td>
                                                    <td className="ax-center whitespace-nowrap tabular-nums">
                                                        {row.values.pace === null ? "—" : `${hours(row.values.pace)}`}
                                                        {row.values.needed !== null && <span className="text-[var(--ink-muted)]"> vs {hours(row.values.needed)}</span>}
                                                        {row.values.pace !== null && <span className="text-[var(--ink-muted)]"> h/wk</span>}
                                                    </td>
                                                    <td className="ax-center whitespace-nowrap tabular-nums">{row.values.runout ? dateFormat.format(row.values.runout) : "—"}</td>
                                                    <td className={`ax-center whitespace-nowrap font-semibold tabular-nums ${end.className}`}>{end.text}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {rows.length > shown.length && (
                                <button type="button" className="ax-show-all mt-3" onClick={() => setShowAll(true)}>
                                    Show all {rows.length} projects
                                </button>
                            )}
                            <p className="caption m-0 mt-3 text-muted-foreground">
                                Fixed Fee projects have no hours budget to project against (open items #26, #27). Hours are what Synerion has loaded through last Saturday.
                            </p>
                        </>
                    );
                }}
            </QueryStates>
        </AxCard>
    );
}
