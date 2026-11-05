import { formatValue } from "@microsoft/fabric-visuals-core";

/**
 * Presentation of a change value (e.g. a MoM % measure) that the model already computed.
 * Nothing here calculates a KPI: it only decides direction, wording and color.
 */

/** Which direction is good news for this KPI. Hours or revenue up is good; cost up is not. */
export type Favorable = "increase" | "decrease" | "neither";

export type ChangeTone = "positive" | "negative" | "neutral";

export interface ChangePresentation {
    tone: ChangeTone;
    /** Theme token, so the badge follows light and dark mode. */
    color: string;
    /** Decorative arrow; the subtext carries the meaning for screen readers. */
    icon: string;
    direction: "up" | "down" | "flat" | "none";
}

const COLORS: Record<ChangeTone, string> = {
    positive: "var(--color-success)",
    negative: "var(--color-destructive)",
    neutral: "var(--color-muted-foreground)",
};

export function presentChange(value: number | null, favorable: Favorable): ChangePresentation {
    if (value === null) return { tone: "neutral", color: COLORS.neutral, icon: "", direction: "none" };
    if (value === 0) return { tone: "neutral", color: COLORS.neutral, icon: "▶", direction: "flat" };
    const direction = value > 0 ? "up" : "down";
    const tone: ChangeTone =
        favorable === "neither" ? "neutral" : (direction === "up") === (favorable === "increase") ? "positive" : "negative";
    return { tone, color: COLORS[tone], icon: direction === "up" ? "▲" : "▼", direction };
}

const MINUS = "−";

/**
 * A change value with its sign: "+1.5%" or the true minus "−1.0%" (design system: never rely on colour
 * alone). Formats the absolute value with the measure's format, then adds the sign.
 */
export function signedChange(value: number, format?: string): string {
    const text = String(formatValue(Math.abs(value), format));
    return value > 0 ? `+${text}` : value < 0 ? `${MINUS}${text}` : text;
}
