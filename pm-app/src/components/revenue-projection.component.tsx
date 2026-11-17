import { useEffect, useId, useState, type ReactElement } from "react";
import { HelpCircle, X } from "lucide-react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { signedChange } from "@/lib/change";
import { projectionStory, readProjection, type ProjectionStory, type ProjectionValues } from "@/lib/revenue-projection";
import { PROJECTS_FORMATS } from "@/queries/projects";
import { AxCard } from "./ax/ax-card.component";
import { QueryStates, type QueryResult } from "./query-states.component";
import { RevenueProjectionChart } from "./revenue-projection-chart.component";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const money = (v: number | null) => (v === null ? "—" : String(formatValue(v, PROJECTS_FORMATS.money)));
const percent = (v: number | null) => (v === null ? "" : signedChange(v, PROJECTS_FORMATS.percent));

interface RevenueProjectionProps {
    summary: QueryResult;
    weeks: QueryResult;
    /** One project (the sentence says "the project") or several ("these projects"). */
    single: boolean;
}

/**
 * P6 act 4, Revenue to plan end (Guille, 2026-11-17): what was billed in Project Ops so far plus the Backlog of the
 * weeks ahead, in dollars, against the SOW: will the project go over or fall short? T&M projects only. Tiles, a
 * cumulative chart and one sentence, all from the `_app\Revenue Projection` measures (docs/08_app_measures.md § 22).
 */
export function RevenueProjection({ summary, weeks, single }: RevenueProjectionProps): ReactElement {
    const [helpOpen, setHelpOpen] = useState(false);
    const helpId = useId();
    return (
        <AxCard
            title="Revenue to plan end"
            subtitle="T&M revenue billed in Project Ops so far, then the Backlog of the weeks ahead, against the SOW"
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
            {helpOpen && <ProjectionHelp id={helpId} onClose={() => setHelpOpen(false)} />}
            <QueryStates result={summary} shape="kpi" title="Revenue to plan end" emptyMessage="This project has no revenue or plan in the model.">
                {(table) => {
                    const values = readProjection(table);
                    const story = projectionStory(values);
                    if (story === "fixed-fee") {
                        return (
                            <p className="m-0 rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-300 text-muted-foreground">
                                No revenue projection for Fixed Fee projects: Project Operations posts their revenue by month and with future dates, so the
                                weekly projection doesn&apos;t hold for them (open items #17, #26).
                            </p>
                        );
                    }
                    return (
                        <>
                            <ProjectionTiles values={values} story={story} />
                            <QueryStates result={weeks} shape="chart" title="Revenue by week" className="mt-4">
                                {(weeksTable) => <RevenueProjectionChart values={values} story={story} table={weeksTable} />}
                            </QueryStates>
                            <ProjectionSentence values={values} story={story} single={single} />
                            {values.allSow !== null && values.sow !== null && Math.round(values.allSow) !== Math.round(values.sow) && (
                                <p className="caption m-0 mt-3 text-muted-foreground">
                                    T&amp;M projects only: {money(values.sow)} of the {money(values.allSow)} SOW in scope. Fixed Fee revenue is posted by month and with
                                    future dates (#17, #26).
                                </p>
                            )}
                        </>
                    );
                }}
            </QueryStates>
        </AxCard>
    );
}

function ProjectionTiles({ values, story }: { values: ProjectionValues; story: ProjectionStory }): ReactElement {
    // Status ink follows the story (the sign of the model's difference), never colour alone: the sentence says it too.
    const tone = story === "over" ? "text-[var(--negative-ink)]" : story === "short" ? "ax-text-diff" : "text-[var(--positive-ink)]";
    const through = values.cutoff ? `Project Ops, through ${dateFormat.format(values.cutoff)}` : "Project Ops";
    const items = [
        { label: "SOW", value: money(values.sow), note: "Backlog, whole plan", className: "" },
        { label: "Billed to date", value: money(values.billed), note: through, className: "text-[var(--blue-300)]" },
        { label: "Backlog ahead", value: money(values.ahead), note: "Weeks not billed yet", className: "" },
        { label: "Projected at end", value: money(values.projected), note: "Billed + Backlog ahead", className: "" },
        {
            label: "vs SOW",
            value: values.vsSow === null ? "—" : signedChange(values.vsSow, PROJECTS_FORMATS.money),
            note: story === "over" ? `${percent(values.vsSowPct)}, over the SOW` : story === "short" ? `${percent(values.vsSowPct)}, short of the SOW` : "On the SOW",
            className: tone,
        },
    ];
    return (
        <dl className="m-0 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {items.map((item) => (
                <div key={item.label} className="rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-center">
                    <dt className="ax-kpi-label">{item.label}</dt>
                    <dd className={`m-0 mt-1 text-[22px] font-semibold tabular-nums ${item.className}`}>{item.value}</dd>
                    <dd className="m-0 mt-0.5 text-200 text-muted-foreground">{item.note}</dd>
                </div>
            ))}
        </dl>
    );
}

/** The card's one-line answer. */
function ProjectionSentence({ values, story, single }: { values: ProjectionValues; story: ProjectionStory; single: boolean }): ReactElement {
    const subject = single ? "the project ends" : "these T&M projects end";
    const billed = `${money(values.billed)} billed${values.cutoff ? ` through ${dateFormat.format(values.cutoff)}` : ""} plus ${money(values.ahead)} of Backlog ahead`;
    const gap = values.vsSow === null ? "" : money(Math.abs(values.vsSow));
    const tone = story === "over" ? "negative" : story === "short" ? "warning" : "positive";
    const text =
        story === "over"
            ? `At this rate ${subject} ${gap} over the SOW (${percent(values.vsSowPct)}): ${billed}.`
            : story === "short"
              ? `At this rate ${subject} ${gap} short of the SOW (${percent(values.vsSowPct)}): ${billed}.`
              : `At this rate ${subject} on the SOW (${money(values.sow)}): ${billed}.`;
    return (
        <p role="status" className="m-0 mt-4 flex items-start gap-2 rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-300 text-[var(--ink)]">
            <span className={`ax-dot ax-dot-${tone} mt-1.5`} aria-hidden="true" />
            <span>{text}</span>
        </p>
    );
}

/** Explanation behind the "?". */
function ProjectionHelp({ id, onClose }: { id: string; onClose: () => void }): ReactElement {
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
                    <strong className="font-semibold">SOW</strong>: the project&apos;s plan revenue for its whole life (Backlog scenario in Project Operations).
                </li>
                <li>
                    <strong className="font-semibold">Billed to date</strong>: revenue (Actual) of the weeks Project Operations has already integrated, through the date at
                    the top of the page.
                </li>
                <li>
                    <strong className="font-semibold">Backlog ahead</strong>: the plan revenue of every later week, as if the project bills exactly its plan from now on.
                </li>
                <li>
                    <strong className="font-semibold">Projected at end</strong>: billed to date plus the Backlog ahead. Above the SOW the project goes over; below it, it
                    falls short.
                </li>
                <li>
                    <strong className="font-semibold">The chart</strong>: the solid blue line is the revenue billed so far (hover a week to see it); the dashed line continues
                    it with the Backlog of each week ahead; the dotted line is the plan; the solid line across is the SOW.
                </li>
                <li>T&amp;M projects only: Fixed Fee revenue is posted by month and with future dates (open items #17, #26).</li>
            </ul>
        </div>
    );
}
