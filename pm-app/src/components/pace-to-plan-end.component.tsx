import { useEffect, useId, useState, type ReactElement } from "react";
import { HelpCircle, X } from "lucide-react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { paceStory, type PaceStory, type PaceValues } from "@/lib/pace";
import { parseModelDate } from "@/lib/plan-end";
import { cell, numberCell } from "@/lib/query-table";
import { PACE_WEEKS, PROJECTS_FORMATS, projectsPaceColumns } from "@/queries/projects";
import { AxCard } from "./ax/ax-card.component";
import { PaceBurnUp } from "./pace-burn-up.component";
import { QueryStates, type QueryResult } from "./query-states.component";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const hours = (v: number | null) => (v === null ? "—" : String(formatValue(v, PROJECTS_FORMATS.hours)));
const weeks = (v: number | null) => (v === null ? "—" : String(formatValue(Math.abs(v), "#,0")));

interface PaceToPlanEndProps {
    pace: QueryResult;
    history: QueryResult;
    /** Last day of the pace window (last Saturday): "to date". */
    asOf: Date;
}

/**
 * P6 act 4, "What comes next" (Ion, 2026-11-16): if the team keeps the pace of the last 4 complete weeks, does the
 * hours budget last until the plan end? Tiles, a burn-up and one sentence, all from the `_app\Pace` measures
 * (docs/08_app_measures.md § 19). The "?" in the corner explains how it works (Ion, 2026-11-16).
 */
export function PaceToPlanEnd({ pace, history, asOf }: PaceToPlanEndProps): ReactElement {
    const [helpOpen, setHelpOpen] = useState(false);
    const helpId = useId();
    return (
        <AxCard
            title="Pace to plan end"
            subtitle={`Hours budget (plan hours, Backlog, whole project life) vs the pace of the last ${PACE_WEEKS} complete weeks · hours to ${dateFormat.format(asOf)}`}
            aside={
                <button
                    type="button"
                    className="ax-help-button"
                    aria-expanded={helpOpen}
                    aria-controls={helpId}
                    aria-label={helpOpen ? "Close how this works" : "How this works"}
                    title="How this works"
                    onClick={() => setHelpOpen((open) => !open)}
                >
                    {helpOpen ? <X className="icon-size-200" aria-hidden="true" /> : <HelpCircle className="icon-size-200" aria-hidden="true" />}
                </button>
            }
        >
            {helpOpen && <PaceHelp id={helpId} onClose={() => setHelpOpen(false)} />}
            <QueryStates result={pace} shape="kpi" title="Pace to plan end" emptyMessage="This project has no plan or hours in the model.">
                {(table) => {
                    const values = readPace(table);
                    const story = paceStory(values);
                    if (story === "no-budget") {
                        return (
                            <p className="m-0 rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-300 text-muted-foreground">
                                This project has no hours budget to project against: its plan in Project Operations is Fixed Fee, and Fixed Fee plan hours aren&apos;t
                                hours of work (open items #26, #27).
                            </p>
                        );
                    }
                    return (
                        <>
                            <PaceTiles values={values} story={story} />
                            <QueryStates result={history} shape="chart" title="Hours to date by week" className="mt-4">
                                {(weeksTable) => <PaceBurnUp values={values} story={story} weeksTable={weeksTable} asOf={asOf} />}
                            </QueryStates>
                            <PaceSentence values={values} story={story} />
                        </>
                    );
                }}
            </QueryStates>
        </AxCard>
    );
}

function readPace(table: QueryTable): PaceValues {
    const c = projectsPaceColumns;
    return {
        budget: numberCell(table, c.budget),
        toDate: numberCell(table, c.toDate),
        left: numberCell(table, c.left),
        pace: numberCell(table, c.pace),
        weeksToEnd: numberCell(table, c.weeksToEnd),
        needed: numberCell(table, c.needed),
        runout: parseModelDate(cell(table, c.runout)),
        weeksBefore: numberCell(table, c.weeksBefore),
        planEnd: parseModelDate(cell(table, c.planEnd)),
    };
}

function PaceTiles({ values, story }: { values: PaceValues; story: PaceStory }): ReactElement {
    // Status ink follows the story (the sign of the model's weeks before plan end), never colour alone: the sentence says it too.
    const paceTone = story === "runs-out-early" || story === "over-budget" ? "text-[var(--negative-ink)]" : story === "lasts" ? "text-[var(--positive-ink)]" : "";
    const leftTone = values.left !== null && values.left < 0 ? "text-[var(--negative-ink)]" : "";
    const used = values.budget !== null && values.toDate !== null ? `${hours(values.toDate)} of ${hours(values.budget)} used` : "";
    const items = [
        { label: "Hours budget left", value: values.left === null ? "—" : hours(values.left), note: used, className: leftTone },
        {
            label: "Weeks to plan end",
            value: weeks(values.weeksToEnd),
            note: values.planEnd ? `Plan end ${dateFormat.format(values.planEnd)}` : "No plan end date",
            className: "",
        },
        { label: "Pace needed", value: values.needed === null ? "—" : `${hours(values.needed)} h/wk`, note: "To use the budget exactly by plan end", className: "" },
        { label: "Current pace", value: values.pace === null ? "—" : `${hours(values.pace)} h/wk`, note: `Last ${PACE_WEEKS} complete weeks`, className: paceTone },
    ];
    return (
        <dl className="m-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {items.map((item) => (
                <div key={item.label} className="rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-center">
                    <dt className="ax-kpi-label">{item.label}</dt>
                    <dd className={`m-0 mt-1 text-[22px] font-semibold tabular-nums ${item.className}`}>{item.value}</dd>
                    {item.note && <dd className="m-0 mt-0.5 text-200 text-muted-foreground">{item.note}</dd>}
                </div>
            ))}
        </dl>
    );
}

/** The card's one-line answer. */
function PaceSentence({ values, story }: { values: PaceValues; story: PaceStory }): ReactElement | null {
    const planEnd = values.planEnd ? dateFormat.format(values.planEnd) : "the plan end";
    let tone: "negative" | "positive" | "info" = "info";
    let text: string;
    switch (story) {
        case "plan-ended":
            tone = values.left !== null && values.left < 0 ? "negative" : "info";
            text =
                values.left !== null && values.left < 0
                    ? `The plan ended on ${planEnd}, ${hours(-values.left)} hours over the hours budget.`
                    : `The plan ended on ${planEnd} with ${hours(values.left)} hours of budget left. Hours are still being logged: ${hours(values.pace)} h/wk.`;
            break;
        case "over-budget":
            tone = "negative";
            text = `The hours budget is used up: ${hours(values.left === null ? null : -values.left)} hours over, ${weeks(values.weeksToEnd)} weeks before plan end.`;
            break;
        case "no-pace":
            text = `No hours in the last ${PACE_WEEKS} complete weeks. To use the budget by plan end the team needs ${hours(values.needed)} h/wk.`;
            break;
        case "runs-out-early": {
            tone = "negative";
            const ahead = weeks(values.weeksBefore);
            text =
                ahead === "0"
                    ? `At the current pace the hours budget runs out around the plan end (${dateFormat.format(values.runout as Date)}).`
                    : `At the current pace the hours budget runs out on ${dateFormat.format(values.runout as Date)}, about ${ahead} weeks before plan end.`;
            break;
        }
        case "lasts": {
            tone = "positive";
            const spare = weeks(values.weeksBefore);
            text =
                spare === "0"
                    ? `At the current pace the hours budget lasts until the plan end (${planEnd}).`
                    : `At the current pace the hours budget lasts until the plan end, with about ${spare} weeks of hours to spare.`;
            break;
        }
        default:
            return null;
    }
    return (
        <p role="status" className="m-0 mt-4 flex items-start gap-2 rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-300 text-[var(--ink)]">
            <span className={`ax-dot ax-dot-${tone} mt-1.5`} aria-hidden="true" />
            <span>{text}</span>
        </p>
    );
}

/** Explanation behind the "?" (Ion, 2026-11-16). */
function PaceHelp({ id, onClose }: { id: string; onClose: () => void }): ReactElement {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);
    return (
        <div id={id} role="region" aria-label="How this works" className="ax-help-panel mb-4">
            <p className="m-0 text-300 font-semibold text-[var(--ink)]">How this works</p>
            <ul className="m-0 mt-2 list-disc space-y-1 pl-5 text-300 text-[var(--ink)]">
                <li>
                    <strong className="font-semibold">Hours budget</strong>: the project&apos;s plan hours for its whole life (Backlog scenario in Project Operations).
                </li>
                <li>
                    <strong className="font-semibold">Hours to date</strong>: hours logged in Synerion from the start of the project through last Saturday.
                </li>
                <li>
                    <strong className="font-semibold">Current pace</strong>: average Synerion hours per week over the last {PACE_WEEKS} complete weeks (Sunday to Saturday).
                </li>
                <li>
                    <strong className="font-semibold">Pace needed</strong>: hours left in the budget divided by the weeks left to the plan end. At that pace the budget is
                    used exactly at the plan end.
                </li>
                <li>
                    <strong className="font-semibold">Runout date</strong>: when the hours left run out if the team keeps the current pace. Before the plan end, the budget
                    won&apos;t last; after it, there are hours to spare.
                </li>
                <li>
                    <strong className="font-semibold">The chart</strong>: the gold area is the hours logged so far (hover a week to see it); the red dashed line continues it
                    at the current pace; the green dotted line is the pace needed; the solid line across is the budget.
                </li>
                <li>
                    Not shown for Fixed Fee projects: their plan hours in Project Operations aren&apos;t hours of work (open items #26, #27). Time that Synerion hasn&apos;t
                    loaded yet, such as unapproved hours, isn&apos;t counted (#2).
                </li>
            </ul>
        </div>
    );
}
