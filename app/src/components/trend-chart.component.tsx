import type { ReactElement } from "react";
import { VegaVisual, type VisualizationSpec } from "@microsoft/fabric-visuals";
import type { DataTable } from "@microsoft/fabric-visuals-core";
import { useThemeContext } from "@/hooks/theme.context";

interface TrendChartProps {
    /** Query result shaped with its factory's columnMetadata (formats travel with the columns). */
    data: DataTable;
    /** From trendSpec() in queries/shared. */
    spec: VisualizationSpec;
    title: string;
    subtitle?: string;
    /** Chart height in pixels. */
    height?: number;
    /** No frame or header: the caller's card (e.g. AxCard) is the frame and carries the title. */
    chromeless?: boolean;
}

/** Monthly or weekly trend (build plan 2.4): bars, stacked bars, or bars with a line on a second axis. */
export function TrendChart({ data, spec, title, subtitle, height = 280, chromeless = false }: TrendChartProps): ReactElement {
    const { theme } = useThemeContext();
    return chromeless ? (
        <VegaVisual spec={spec} data={data} theme={theme} style={{ height }} chromeless />
    ) : (
        <VegaVisual spec={spec} data={data} theme={theme} style={{ height }} header={{ title, subtitle }} />
    );
}
