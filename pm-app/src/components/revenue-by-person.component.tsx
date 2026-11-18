import { useState, type CSSProperties, type ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { useElementWidth } from "@/hooks/use-element-width";
import { squarify } from "@/lib/chart-geometry";
import { diffTone } from "@/lib/people-week";
import { readProjection } from "@/lib/revenue-projection";
import { hasNoPlan, readPeopleRevenue, readUnassignedRevenue, shareTier, type PersonRevenue, type RevenueView, type ShareTier } from "@/lib/revenue-by-person";
import { PROJECTS_FORMATS } from "@/queries/projects";
import { AxCard } from "./ax/ax-card.component";
import { QueryStates, type QueryResult } from "./query-states.component";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const money = (v: number | null) => (v === null ? "—" : String(formatValue(v, PROJECTS_FORMATS.money)));
const percent = (v: number | null) => (v === null ? "—" : String(formatValue(v, PROJECTS_FORMATS.percent)));

/** Official palette by share of billed, warm and cool alternating (Ion, 2026-11-17: colourful but professional). */
const TIER_COLOR: Record<ShareTier, string> = {
    "25": "var(--yellow-300)",
    "15": "var(--blue-300)",
    "10": "var(--yellow-700)",
    "5": "var(--blue-500)",
    "0": "var(--gt-purple)",
};
const TIER_LABEL: Record<ShareTier, string> = {
    "25": "25% or more",
    "15": "15–25%",
    "10": "10–15%",
    "5": "5–10%",
    "0": "Under 5%",
};
const TIERS: ShareTier[] = ["25", "15", "10", "5", "0"];

interface RevenueByPersonProps {
    people: QueryResult;
    roles: QueryResult;
    /** The revenue projection summary (act 4): its cutoff, and whether the scope is Fixed Fee only or mixed. */
    summary: QueryResult;
    /** One project picked: people detail shows only then, as in the people matrix (no names in the aggregated view). */
    single: boolean;
}

/**
 * P6 act 3, Revenue by person (Ion, 2026-11-17): a treemap of revenue billed per person (Auxis ID on the Project Ops
 * line), coloured by the person's share of what the project billed, with their % Execution against their own
 * Backlog in the pill, "To date" (through the integration cutoff) or for the whole project. T&M only: Fixed Fee projects bill by service line, not by person. Every number is a model
 * measure (docs/08_app_measures.md § 23); the colour tier and the pill only read the model's % as shown.
 */
export function RevenueByPerson({ people, roles, summary, single }: RevenueByPersonProps): ReactElement {
    const [view, setView] = useState<RevenueView>("to-date");
    const projection = summary.data?.status === "success" ? readProjection(summary.data.table) : null;
    const fixedFeeOnly = projection !== null && projection.sow === null && projection.allSow !== null;
    const cutoff = projection?.cutoff ? dateFormat.format(projection.cutoff) : null;
    const subtitle =
        view === "to-date"
            ? `T&M revenue billed in Project Ops${cutoff ? ` through ${cutoff}` : ""} vs each person's Backlog to the same date`
            : `T&M revenue billed in Project Ops${cutoff ? ` through ${cutoff}` : ""} vs each person's Backlog for the whole project`;
    return (
        <AxCard
            className="h-full"
            title="Revenue by person"
            subtitle={subtitle}
            aside={
                fixedFeeOnly || !single ? undefined : (
                    <div className="ax-seg" role="group" aria-label="Compare against">
                        <button type="button" aria-pressed={view === "to-date"} onClick={() => setView("to-date")}>
                            To date
                        </button>
                        <button type="button" aria-pressed={view === "whole"} onClick={() => setView("whole")}>
                            Whole project
                        </button>
                    </div>
                )
            }
        >
            {!single ? (
                <p className="m-0 rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-300 text-muted-foreground">
                    Pick one project to see who billed its revenue and how each person is doing against their Backlog.
                </p>
            ) : fixedFeeOnly ? (
                <p className="m-0 rounded-md bg-[var(--glass-sunken)] px-4 py-3 text-300 text-muted-foreground">
                    <strong className="font-semibold text-[var(--ink)]">No revenue by person for Fixed Fee projects.</strong> Project Operations bills them by service
                    or FTE line, not by person, so there&apos;s no one&apos;s progress to measure here. See Revenue by month vs Backlog for how the project is billing.
                </p>
            ) : (
                <QueryStates result={people} shape="chart" title="Revenue by person" emptyMessage="No revenue billed or planned by person for this project in the model.">
                    {(table) => (
                        <>
                            <BandLegend />
                            <PersonTreemap people={readPeopleRevenue(table, view)} />
                            <NotBilledChips people={readPeopleRevenue(table, view)} roles={roles} view={view} />
                        </>
                    )}
                </QueryStates>
            )}
        </AxCard>
    );
}

function BandLegend(): ReactElement {
    return (
        <ul className="m-0 mb-3 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-200 text-muted-foreground" aria-label="Legend">
            <li className="font-semibold text-[var(--ink)]">Share of billed</li>
            {TIERS.map((tier) => (
                <li key={tier} className="flex items-center gap-2">
                    <span aria-hidden="true" className="ax-person-swatch" style={{ "--tile": TIER_COLOR[tier] } as CSSProperties} />
                    {TIER_LABEL[tier]}
                </li>
            ))}
            <li>Pill: % of their own Backlog</li>
        </ul>
    );
}

/** The squarified treemap: tile size = revenue billed; colour and pill = the person's % Execution. */
function PersonTreemap({ people }: { people: PersonRevenue[] }): ReactElement {
    const [ref, width] = useElementWidth();
    const height = width < 520 ? 300 : 380;
    const tiles = squarify(people, (p) => p.billed ?? 0, width, height);
    const gap = 3;
    return (
        <div ref={ref} className="relative w-full" style={{ height }} role="list" aria-label="Revenue billed by person">
            {tiles.map(({ item: p, x, y, w, h }) => {
                const noPlan = hasNoPlan(p);
                const tw = w - gap * 2;
                const th = h - gap * 2;
                const roomy = tw > 64 && th > 44;
                // The pill sits at the bottom; on medium tiles it replaces the share line so nothing overlaps.
                const showPill = th > 92 && tw > 60;
                const showShare = th > 74 && tw > 60 && (!showPill || th > 112);
                const share = p.share !== null ? `${percent(p.share)} of billed` : "";
                // Narrow tiles show the share alone, so it never gets cut.
                const shareText = tw > 104 ? share : p.share !== null ? percent(p.share) : "";
                const pill =
                    noPlan ? "No plan" : `${percent(p.execution)}${tw > 170 && p.backlog !== null ? ` of ${money(p.backlog)}` : ""}`;
                const tone = noPlan ? "even" : (diffTone(Math.round((p.execution ?? 0) * 100) - 100) ?? "even");
                const label = `${p.name}: ${money(p.billed)} billed${share ? ` (${share})` : ""}${!noPlan ? `, ${percent(p.execution)} of a ${money(p.backlog)} Backlog` : ", no Backlog of their own"}`;
                return (
                    <div
                        key={p.key}
                        role="listitem"
                        aria-label={label}
                        title={label}
                        className={roomy ? "ax-person-tile" : "ax-person-tile is-tiny"}
                        style={{ left: x + gap, top: y + gap, width: Math.max(0, tw), height: Math.max(0, th), "--tile": TIER_COLOR[shareTier(p.share)] } as CSSProperties}
                    >
                        {roomy && (
                            <>
                                <span className="ax-person-name">{p.name}</span>
                                <span className="ax-person-amount">{money(p.billed)}</span>
                                {showShare && shareText && <span className="ax-person-share">{shareText}</span>}
                                {showPill && <span className={`ax-var-pill is-${tone} ax-person-pill`}>{pill}</span>}
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/** People with Backlog but nothing billed, and roles planned with no person (as in the matrix's role rows). */
function NotBilledChips({ people, roles, view }: { people: PersonRevenue[]; roles: QueryResult; view: RevenueView }): ReactElement | null {
    const rolesTable: QueryTable | null = roles.data?.status === "success" ? roles.data.table : null;
    const chips = [
        ...(rolesTable ? readUnassignedRevenue(rolesTable, view) : [])
            .filter((r) => (r.backlog ?? 0) > 0)
            .map((r) => ({ key: `role:${r.role}`, text: `${r.role} · role`, backlog: r.backlog })),
        ...people.filter((p) => (p.billed ?? 0) === 0 && (p.backlog ?? 0) > 0).map((p) => ({ key: p.key, text: p.name, backlog: p.backlog })),
    ];
    if (chips.length === 0) return null;
    return (
        <div className="mt-3">
            <p className="ax-kpi-label m-0">Planned, not billed yet</p>
            <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
                {chips.map((c) => (
                    <li key={c.key} className="ax-person-chip">
                        {c.text} · {money(c.backlog)} planned
                    </li>
                ))}
            </ul>
        </div>
    );
}
