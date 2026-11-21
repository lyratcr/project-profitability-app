import { useState, type ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { budgetStatus, type BudgetStatus } from "@/lib/budget-status";
import { signedChange } from "@/lib/change";
import { cell, numberCell } from "@/lib/query-table";
import { cn } from "@/lib/utils";
import { AGGREGATE_ROWS, BUDGET_NEAR_SOW, PROJECTS_FORMATS, projectsBudgetByProjectColumns as c } from "@/queries/projects";
import { AxCard } from "./ax/ax-card.component";
import { QueryStates, type QueryResult } from "./query-states.component";

const STATUS: Record<BudgetStatus, { tone: "negative" | "warning" | "positive" | "none"; label: string; note: string }> = {
    over: { tone: "negative", label: "Over SOW", note: "Billed more than the SOW" },
    near: { tone: "warning", label: "Near the limit", note: `${String(formatValue(BUDGET_NEAR_SOW, PROJECTS_FORMATS.percent))} of the SOW or more` },
    "on-track": { tone: "positive", label: "On track", note: `Under ${String(formatValue(BUDGET_NEAR_SOW, PROJECTS_FORMATS.percent))} of the SOW` },
    "no-sow": { tone: "none", label: "No SOW", note: "No plan in the model" },
};
const STATUS_ORDER: readonly BudgetStatus[] = ["over", "near", "on-track", "no-sow"];
/** The bars share one scale so the 100% mark lines up; projects billed past it fill the track. */
const BAR_SCALE_MAX = 2;

interface Row {
    id: string;
    key: string;
    name: string;
    customer: string | null;
    planned: number | null;
    billed: number | null;
    leftToBill: number | null;
    progress: number | null;
    hoursVsPlan: number | null;
    status: BudgetStatus;
}

function readRows(table: QueryTable): Row[] {
    return table.rows.map((_, i) => {
        const key = String(cell(table, c.projectKey, i) ?? "");
        const name = String(cell(table, c.projectName, i) ?? key);
        const customer = cell(table, c.customer, i);
        const planned = numberCell(table, c.planned, i);
        const progress = numberCell(table, c.progress, i);
        const leftToBill = numberCell(table, c.leftToBill, i);
        return {
            // Two projects can share a key (open items #1, #11), so the row id carries the name too.
            id: `${key}|${name}`,
            key,
            name,
            customer: typeof customer === "string" && customer.trim() !== "" ? customer.trim() : null,
            planned,
            billed: numberCell(table, c.billed, i),
            leftToBill,
            progress,
            hoursVsPlan: numberCell(table, c.hoursVsPlan, i),
            status: budgetStatus(planned, progress, leftToBill),
        };
    });
}

const money = (v: number | null) => (v === null ? "—" : String(formatValue(v, PROJECTS_FORMATS.money)));
const percent = (v: number | null) => (v === null ? "—" : String(formatValue(v, PROJECTS_FORMATS.percent)));

interface BudgetByProjectProps {
    result: QueryResult;
    /** The week behind "Hours vs plan", as shown in the week table beside the budget card. */
    weekLabel: string;
    /** Opens one project (sets the Project filter). */
    onPick: (projectKey: string) => void;
}

/**
 * P6 aggregated view, act 1 (PM feedback, 2026-11-20): the budget card per project, so a PM who sees "Over SOW by 16%"
 * on the total finds which projects are over without opening them one by one. Every number is a model measure
 * (projects-budget-by-project.dax); the status only reads their sign and the "near" threshold, the counts are the
 * rows in each status, and the bar widths only scale % Actual for display. The order comes from the query (most
 * billed against the SOW first). Clicking a project opens it.
 */
export function BudgetByProject({ result, weekLabel, onPick }: BudgetByProjectProps): ReactElement {
    // null = the default view: the projects that need attention (over or near), or all of them when none does.
    const [filter, setFilter] = useState<BudgetStatus | "all" | null>(null);
    return (
        <AxCard title="Budget by project" subtitle="Billed to date against the SOW, whole project life · most billed against the SOW first · pick a project to open it">
            <QueryStates result={result} shape="table" title="Budget by project" emptyMessage="No projects with a plan or revenue in this selection.">
                {(table) => {
                    const rows = readRows(table);
                    const count = (s: BudgetStatus) => rows.filter((r) => r.status === s).length;
                    const attention = rows.filter((r) => r.status === "over" || r.status === "near");
                    const shown =
                        filter === "all"
                            ? rows
                            : filter !== null
                              ? rows.filter((r) => r.status === filter)
                              : (attention.length > 0 ? attention : rows).slice(0, AGGREGATE_ROWS);
                    const scale = Math.min(BAR_SCALE_MAX, Math.max(1, ...shown.map((r) => r.progress ?? 0)));
                    const markAt = (1 / scale) * 100;
                    return (
                        <>
                            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Filter projects by status">
                                {STATUS_ORDER.filter((s) => s !== "no-sow" || count(s) > 0).map((s) => {
                                    const n = count(s);
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            className={cn("ax-status-chip", filter === s && "is-active")}
                                            aria-pressed={filter === s}
                                            disabled={n === 0}
                                            onClick={() => setFilter(filter === s ? null : s)}
                                        >
                                            <span className="flex items-center gap-1.5 text-200 font-semibold text-[var(--ink-muted)]">
                                                {STATUS[s].tone !== "none" && <span className={`ax-dot ax-dot-${STATUS[s].tone}`} aria-hidden="true" />}
                                                {STATUS[s].label}
                                            </span>
                                            <span className="mt-1 block text-[22px] font-semibold tabular-nums text-[var(--ink)]">{n}</span>
                                            <span className="block text-200 text-muted-foreground">{STATUS[s].note}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="ax-table ax-pace-table w-full">
                                    <caption className="sr-only">Budget by project</caption>
                                    <thead>
                                        <tr>
                                            <th scope="col">Project</th>
                                            <th scope="col" className="ax-center">Status</th>
                                            <th scope="col">Billed vs SOW</th>
                                            <th scope="col" className="ax-center">% Actual</th>
                                            <th scope="col" className="ax-center">SOW</th>
                                            <th scope="col" className="ax-center">Actual</th>
                                            <th scope="col" className="ax-center">Variance</th>
                                            <th scope="col" className="ax-center">
                                                Hours vs plan
                                                <span className="block text-200 font-normal text-muted-foreground">Last week, {weekLabel}</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shown.map((row) => {
                                            const status = STATUS[row.status];
                                            const billed = Math.max(0, row.progress ?? 0);
                                            const goldWidth = (Math.min(billed, 1) / scale) * 100;
                                            const overWidth = billed > 1 ? ((Math.min(billed, scale) - 1) / scale) * 100 : 0;
                                            const hoursTone = row.hoursVsPlan === null ? null : Math.round(row.hoursVsPlan) > 0 ? "over" : Math.round(row.hoursVsPlan) < 0 ? "under" : "even";
                                            return (
                                                <tr key={row.id}>
                                                    <th scope="row" className="text-left font-normal">
                                                        <button type="button" className="ax-link-button" onClick={() => onPick(row.key)} title={`Open ${row.name}`}>
                                                            {row.name}
                                                        </button>
                                                        {row.customer && <span className="block text-200 text-muted-foreground">{row.customer}</span>}
                                                    </th>
                                                    <td className="ax-center">
                                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                                            {status.tone !== "none" && <span className={`ax-dot ax-dot-${status.tone}`} aria-hidden="true" />}
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {row.status === "no-sow" ? (
                                                            <span className="text-muted-foreground">—</span>
                                                        ) : (
                                                            <div className="ax-budget-track ax-budget-row-track" aria-hidden="true">
                                                                <span className={cn("ax-budget-fill", overWidth > 0 && "is-capped")} style={{ width: `${goldWidth}%` }} />
                                                                {overWidth > 0 && <span className="ax-budget-over" style={{ left: `${goldWidth}%`, width: `${overWidth}%` }} />}
                                                                <span className="ax-budget-mark" style={{ left: `${markAt}%` }} />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className={cn("ax-center font-semibold tabular-nums", row.status === "over" && "text-[var(--negative-ink)]")}>{row.status === "no-sow" ? "—" : percent(row.progress)}</td>
                                                    <td className="ax-center whitespace-nowrap tabular-nums">{money(row.planned)}</td>
                                                    <td className="ax-center whitespace-nowrap tabular-nums">{money(row.billed)}</td>
                                                    <td className={cn("ax-center whitespace-nowrap tabular-nums", row.status === "over" && "font-semibold text-[var(--negative-ink)]")}>{money(row.leftToBill)}</td>
                                                    <td className="ax-center">
                                                        {row.hoursVsPlan === null || hoursTone === null ? "—" : <span className={`ax-var-pill is-${hoursTone}`}>{signedChange(row.hoursVsPlan, PROJECTS_FORMATS.hours)}</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                                <span className="text-200 text-muted-foreground">
                                    Showing {shown.length} of {rows.length} project{rows.length === 1 ? "" : "s"} with a plan, revenue or hours
                                    {filter === null && attention.length > 0 ? ": over the SOW or near the limit" : ""}
                                </span>
                                {shown.length < rows.length && (
                                    <button type="button" className="ax-show-all" onClick={() => setFilter("all")}>
                                        Show all {rows.length} projects
                                    </button>
                                )}
                            </div>
                            <p className="caption m-0 mt-3 text-muted-foreground">
                                SOW = whole plan (Backlog); Actual = billed to date; Variance = left to bill (negative when billed over the SOW). The mark on each bar is 100% of
                                the SOW; the red striped part is what was billed over it. Hours vs plan = Synerion hours minus plan hours in that week, as in the table above.
                            </p>
                        </>
                    );
                }}
            </QueryStates>
        </AxCard>
    );
}
