import { useState, type ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { ChevronRight } from "lucide-react";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { cell, numberCell } from "@/lib/query-table";
import { cn } from "@/lib/utils";
import { FLOW_ANALYSES, flowTreeColumns, flowsTree, type FlowAnalysis } from "@/queries/flows";
import { AxCard } from "./ax/ax-card.component";
import { QueryStates } from "./query-states.component";

interface DecompositionTreeProps {
    analysis: FlowAnalysis;
    /** The page's SUMMARIZECOLUMNS filter arguments. */
    filters: readonly string[];
    /** False while the filter lists load: no query runs. */
    ready: boolean;
}

/**
 * Flow breakdown in the style of a decomposition tree (Ion, 2026-11-04, instead of the design's Sankey, which
 * Vega-Lite can't draw): origin → destination → customer → project. Each column is one query filtered by the
 * page and by the items picked to its left; clicking an item opens the next column. Bar length is the item's
 * hours against the column's largest, for reading only; every number comes from the model.
 */
export function DecompositionTree({ analysis, filters, ready }: DecompositionTreeProps): ReactElement {
    const levels = FLOW_ANALYSES[analysis].levels;
    // Picks reset when the analysis or the page filters change (the key below remounts the tree).
    const [picks, setPicks] = useState<string[]>([]);

    const pick = (level: number, value: string) =>
        setPicks((current) => (current[level] === value ? current.slice(0, level) : [...current.slice(0, level), value]));

    const shown = Math.min(picks.length + 1, levels.length);

    return (
        <AxCard title="Flow breakdown" subtitle={`Pick an item to break it down: ${levels.map((l) => l.label.toLowerCase()).join(" → ")}`}>
            <div className="flex gap-3 overflow-x-auto pb-1">
                {levels.slice(0, shown).map((level, i) => (
                    <TreeColumn
                        key={`${analysis}-${i}-${picks.slice(0, i).join("|")}`}
                        analysis={analysis}
                        level={i}
                        label={level.label}
                        filters={filters}
                        picks={picks.slice(0, i)}
                        selected={picks[i]}
                        ready={ready}
                        onPick={(value) => pick(i, value)}
                        hasNext={i < levels.length - 1}
                    />
                ))}
            </div>
        </AxCard>
    );
}

interface TreeColumnProps {
    analysis: FlowAnalysis;
    level: number;
    label: string;
    filters: readonly string[];
    picks: readonly string[];
    selected: string | undefined;
    ready: boolean;
    hasNext: boolean;
    onPick: (value: string) => void;
}

function TreeColumn({ analysis, level, label, filters, picks, selected, ready, hasNext, onPick }: TreeColumnProps): ReactElement {
    const config = flowsTree({ analysis, level, filters, picks });
    const result = useSemanticModelQuery({ connection: config.connection, query: ready ? config.query : "" });

    return (
        <div className="flex w-64 shrink-0 flex-col gap-2">
            <h3 className="ax-label m-0">{label}</h3>
            <QueryStates result={result} shape="table" title={label} emptyMessage="No hours here.">
                {(table) => {
                    const items = table.rows.map((_, r) => ({
                        value: cell(table, config.column, r),
                        hours: numberCell(table, flowTreeColumns.hours, r),
                    }));
                    const max = Math.max(...items.map((it) => it.hours ?? 0), 0);
                    return (
                        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
                            {items.map((it, r) => {
                                const text = it.value === null || it.value === "" ? "(blank)" : String(it.value);
                                const isSelected = selected !== undefined && selected === it.value;
                                const width = max > 0 && it.hours !== null ? Math.max(2, (it.hours / max) * 100) : 0;
                                const canPick = hasNext && typeof it.value === "string";
                                return (
                                    <li key={`${text}-${r}`}>
                                        <button
                                            type="button"
                                            disabled={!canPick}
                                            aria-pressed={canPick ? isSelected : undefined}
                                            onClick={() => canPick && onPick(it.value as string)}
                                            className={cn(
                                                "flex w-full flex-col gap-1 rounded-md border px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-ring",
                                                isSelected ? "border-brand bg-muted" : "border-transparent hover:bg-muted",
                                                !canPick && "cursor-default hover:bg-transparent",
                                            )}
                                        >
                                            <span className="flex items-center justify-between gap-2 text-200">
                                                <span className="truncate text-foreground" title={text}>
                                                    {text}
                                                </span>
                                                <span className="flex shrink-0 items-center gap-1 tabular-nums text-muted-foreground">
                                                    {it.hours === null ? "" : String(formatValue(it.hours, "#,0"))}
                                                    {canPick && <ChevronRight className="icon-size-100" aria-hidden="true" />}
                                                </span>
                                            </span>
                                            <span className="ax-bar block w-full" aria-hidden="true">
                                                <span style={{ width: `${width}%` }} />
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    );
                }}
            </QueryStates>
        </div>
    );
}
