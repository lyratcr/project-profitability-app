import type { ReactElement } from "react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { presentChange, signedChange, type Favorable } from "@/lib/change";
import { cn } from "@/lib/utils";

export type AxKpiVariant = "default" | "accent" | "spotlight";

interface AxKpiCardProps {
    /** Overline label (shown UPPERCASE by the `ax-kpi-label` style). */
    label: string;
    /** The model's value; null shows an em dash, never 0. */
    value: number | null;
    /** The measure's format string. */
    format?: string;
    /** A change measure the model computed, with its format and comparison basis ("vs September 2026"). */
    change?: { value: number | null; format?: string; comparedTo: string };
    /** Which direction is good news: colours the pill. "neither" keeps it neutral (arrow and sign only). */
    favorable?: Favorable;
    /** Muted text under the value when there is no change, e.g. what the number covers. */
    note?: string;
    /**
     * "spotlight" = the one hero KPI per page (dark charcoal card in both themes); "accent" = the gold top
     * bar of the page's focus metric (one per page); "default" otherwise.
     */
    variant?: AxKpiVariant;
}

/**
 * Auxis KpiCard (design-system/components/KpiCard): label, value with tabular figures, and a StatusBadge
 * delta pill with arrow and sign plus the comparison basis. Every number comes from the model.
 */
export function AxKpiCard({ label, value, format, change, favorable = "increase", note, variant = "default" }: AxKpiCardProps): ReactElement {
    const presentation = change ? presentChange(change.value, favorable) : null;
    const pillClass =
        presentation?.tone === "positive" ? "ax-pill ax-pill-up" : presentation?.tone === "negative" ? "ax-pill ax-pill-down" : "ax-pill";

    return (
        <section className={cn("ax-card", variant === "spotlight" && "ax-spotlight ax-kpi-hero")} aria-label={label}>
            {variant === "accent" && <span className="ax-kpi-accent" aria-hidden="true" />}
            <div className="ax-kpi-label">{label}</div>
            <div className="ax-kpi-value">{value === null ? "—" : String(formatValue(value, format))}</div>
            <div className="ax-kpi-foot">
                {change && change.value !== null && presentation ? (
                    <>
                        <span className={pillClass}>
                            {presentation.direction === "up" && (
                                <svg viewBox="0 0 10 10" aria-hidden="true">
                                    <path d="M5 1.5 9 7.5H1z" fill="currentColor" />
                                </svg>
                            )}
                            {presentation.direction === "down" && (
                                <svg viewBox="0 0 10 10" aria-hidden="true">
                                    <path d="M5 8.5 1 2.5h8z" fill="currentColor" />
                                </svg>
                            )}
                            {signedChange(change.value, change.format)}
                        </span>
                        <span>{change.comparedTo}</span>
                    </>
                ) : change ? (
                    <span>No comparison {change.comparedTo}</span>
                ) : (
                    note !== undefined && <span>{note}</span>
                )}
            </div>
        </section>
    );
}
