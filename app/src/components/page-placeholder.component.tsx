import type { ReactElement } from "react";
import { describeFilterContext } from "@/lib/filter-context";
import type { FilterOptions, FilterState } from "@/lib/filters";
import type { PageDef } from "@/lib/routes";

interface PagePlaceholderProps {
    page: PageDef;
    filters: FilterState;
    options: FilterOptions | null;
}

/** Page frame until the page is built. Shows no data: never mock numbers. */
export function PagePlaceholder({ page, filters, options }: PagePlaceholderProps): ReactElement {
    const context = describeFilterContext(page, filters, options);
    return (
        <section aria-labelledby="page-title">
            <h1 id="page-title" className="font-page-title text-page-title text-emphasis-foreground">
                {page.title}
            </h1>
            <p className="font-page-subtitle text-page-subtitle text-muted-foreground">{page.purpose}</p>
            <div className="mt-8 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-300 text-muted-foreground">
                <p>This page is not built yet (build plan task {page.task}).</p>
                {context !== "" && <p className="mt-2 text-200">Filter context: {context}</p>}
            </div>
        </section>
    );
}
