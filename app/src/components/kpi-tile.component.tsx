import type { ReactElement } from "react";
import { KpiCard } from "@microsoft/fabric-visuals";
import { useThemeContext } from "@/hooks/theme.context";
import { presentChange, type Favorable } from "@/lib/change";

export interface KpiTileProps {
    title: string;
    subtitle?: string;
    /** The KPI value from a model measure; null shows an em dash (never 0). */
    value: number | null;
    /** The measure's format string from the query metadata. */
    format?: string;
    /** A change measure the model computed (e.g. `… MoM %_app`), with its format and wording. */
    change?: {
        value: number | null;
        format?: string;
        /** What the change compares to, e.g. "vs August 2026". */
        comparedTo: string;
    };
    /** Which direction is good news; colors the change badge. */
    favorable?: Favorable;
}

/** KPI card with an optional month-over-month change badge (build plan 2.4). */
export function KpiTile({ title, subtitle, value, format, change, favorable = "increase" }: KpiTileProps): ReactElement {
    const { theme } = useThemeContext();
    const presentation = change ? presentChange(change.value, favorable) : null;

    return (
        <KpiCard
            theme={theme}
            header={{ title, subtitle }}
            callout={{
                metric: { value, format },
                change:
                    change && presentation && change.value !== null
                        ? {
                              value: change.value,
                              format: change.format,
                              color: presentation.color,
                              icon: presentation.icon,
                              subtext: change.comparedTo,
                          }
                        : undefined,
                metricSubtext: change && change.value === null ? `No comparison ${change.comparedTo}` : undefined,
            }}
        />
    );
}
