import type { ReactElement, ReactNode } from "react";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { AlertCircle, RotateCw } from "lucide-react";
import type { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { cn } from "@/lib/utils";

export type QueryResult = ReturnType<typeof useSemanticModelQuery>;

const SKELETON_HEIGHT = {
    kpi: "h-28",
    chart: "h-72",
    table: "h-64",
} as const;

interface QueryStatesProps {
    result: QueryResult;
    /** Shape of the visual, for a skeleton that matches it. */
    shape: keyof typeof SKELETON_HEIGHT;
    /** Names the visual in the loading, empty and error states. */
    title: string;
    /** Shown when the query succeeds with no rows. */
    emptyMessage?: string;
    /** No rows is a valid answer (e.g. one block of a composed visual): render the children with the empty table. */
    allowEmpty?: boolean;
    className?: string;
    children: (table: QueryTable) => ReactNode;
}

/**
 * Loading, empty and error states for one visual (docs/06 definition of done). Never shows mock data:
 * a failed query shows its error, and the previous successful result stays on screen while a new
 * filter reloads (marked busy) instead of flashing a skeleton.
 */
export function QueryStates({ result, shape, title, emptyMessage = "No data for the selected filters.", allowEmpty = false, className, children }: QueryStatesProps): ReactElement {
    const { data, isLoading, refetch } = result;

    if (data?.status === "error") {
        return (
            <div role="alert" className={cn("flex flex-col gap-2 rounded-xl border border-destructive bg-destructive/10 p-4 text-300 text-destructive", className)}>
                <p className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="icon-size-200 shrink-0" aria-hidden="true" />
                    {title}: could not load ({data.error.category}).
                </p>
                <p className="text-200 break-words">{data.error.message}</p>
                <button
                    type="button"
                    onClick={() => void refetch()}
                    className="inline-flex w-fit items-center gap-1 rounded-md border border-destructive px-2 py-1 text-200 hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <RotateCw className="icon-size-100" aria-hidden="true" />
                    Retry
                </button>
            </div>
        );
    }

    if (data?.status !== "success") {
        return <div className={cn("animate-pulse rounded-xl bg-muted", SKELETON_HEIGHT[shape], className)} aria-busy="true" aria-label={`Loading ${title}`} />;
    }

    if (data.table.rows.length === 0 && !allowEmpty) {
        return (
            <div className={cn("flex items-center justify-center rounded-xl border border-border bg-card px-4 text-center text-300 text-muted-foreground", SKELETON_HEIGHT[shape], className)}>
                <p>
                    <span className="font-medium text-foreground">{title}</span>
                    <br />
                    {emptyMessage}
                </p>
            </div>
        );
    }

    return (
        <div className={cn("relative min-w-0", isLoading && "opacity-60 transition-opacity", className)} aria-busy={isLoading || undefined}>
            {children(data.table)}
        </div>
    );
}
