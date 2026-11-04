import type { ReactElement } from "react";
import type { PageDef } from "@/lib/routes";

/** Page frame until the page is built. Shows no data: never mock numbers. */
export function PagePlaceholder({ page }: { page: PageDef }): ReactElement {
    return (
        <section aria-labelledby="page-title">
            <h1 id="page-title" className="font-page-title text-page-title text-emphasis-foreground">
                {page.title}
            </h1>
            <p className="font-page-subtitle text-page-subtitle text-muted-foreground">{page.purpose}</p>
            <div className="mt-8 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-300 text-muted-foreground">
                This page is not built yet (build plan task {page.task}).
            </div>
        </section>
    );
}
