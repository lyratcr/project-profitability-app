import type { ReactElement } from "react";
import { KpiCard } from "@microsoft/fabric-visuals";
import type { ColumnDef } from "@microsoft/fabric-visuals-core";
import { useThemeContext } from "@/hooks/theme.context";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { smoke, smokeColumns } from "@/queries/smoke";

/**
 * Phase 0 smoke page (build plan task 0.5): proves the deployed app can read the
 * published model with the viewer's identity. Temporary; replaced by the app shell in Phase 2.
 */
export function SmokePage(): ReactElement {
    const { theme } = useThemeContext();
    const config = smoke();
    const { data, isLoading } = useSemanticModelQuery({
        connection: config.connection,
        query: config.query,
    });

    let body: ReactElement;
    if (isLoading || data === undefined) {
        body = (
            <div className="grid grid-cols-1 gap-grid sm:grid-cols-2" aria-busy="true" aria-label="Loading">
                <div className="h-32 animate-pulse rounded-xl bg-muted" />
                <div className="h-32 animate-pulse rounded-xl bg-muted" />
            </div>
        );
    } else if (data.status === "error") {
        body = (
            <div
                role="alert"
                className="rounded-xl border border-destructive bg-destructive/10 p-4 text-300 text-destructive"
            >
                <p className="font-semibold">Could not read the model ({data.error.category}).</p>
                <p className="mt-1">{data.error.message}</p>
            </div>
        );
    } else if (data.table.rows.length === 0) {
        body = (
            <p className="py-12 text-center text-300 text-muted-foreground">
                The model returned no data for September 2026.
            </p>
        );
    } else {
        const table = toDataTable(data.table, config.columnMetadata);
        const row = table.rows[0];
        const cell = (raw: string): { value: unknown; column: ColumnDef | undefined } => {
            const index = data.table.columns.findIndex((c) => c.name === raw);
            return { value: index >= 0 ? row[index] : null, column: index >= 0 ? table.columns[index] : undefined };
        };
        const asNumber = (value: unknown): number | null => (typeof value === "number" ? value : null);
        const hours = cell(smokeColumns.hours);
        const revenue = cell(smokeColumns.revenue);
        const refresh = cell(smokeColumns.lastRefresh).value;

        body = (
            <>
                <div className="grid grid-cols-1 gap-grid sm:grid-cols-2">
                    <KpiCard
                        theme={theme}
                        header={{ title: "Synerion hours", subtitle: "September 2026" }}
                        callout={{ metric: { value: asNumber(hours.value), format: hours.column?.format } }}
                    />
                    <KpiCard
                        theme={theme}
                        header={{ title: "Actual revenue", subtitle: "September 2026 · Actual scenario" }}
                        callout={{ metric: { value: asNumber(revenue.value), format: revenue.column?.format } }}
                    />
                </div>
                <p className="mt-4 text-200 text-muted-foreground">
                    Model refresh: {typeof refresh === "string" && refresh !== "" ? refresh : "—"}
                </p>
            </>
        );
    }

    return (
        <main className="mx-auto min-h-screen w-full max-w-5xl bg-background px-4 py-8 sm:px-8">
            <header className="mb-6">
                <h1 className="font-page-title text-page-title text-emphasis-foreground">Project Real Profitability</h1>
                <p className="font-page-subtitle text-page-subtitle">
                    Connection check against SM_Corp_Project_Real_Profitability
                </p>
            </header>
            {body}
        </main>
    );
}
