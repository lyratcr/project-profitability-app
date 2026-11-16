import type { ReactElement } from "react";
import type { PageDef } from "@/lib/routes";
import { AxPageHeader } from "./ax/ax-page-header.component";

/** Page frame until the page is built (e.g. Resource Utilization, Ion 2026-11-16). Shows no data: never mock numbers. */
export function PagePlaceholder({ page }: { page: PageDef }): ReactElement {
    return (
        <section aria-labelledby="page-title" className="flex flex-col gap-6">
            <AxPageHeader title={page.title} purpose={page.purpose} />
            <div className="ax-card text-center text-300 text-muted-foreground">
                <p className="m-0">This page is not built yet (build plan task {page.task}).</p>
            </div>
        </section>
    );
}
