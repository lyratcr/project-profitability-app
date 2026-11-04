import type { ReactElement } from "react";
import { AlertTriangle, Moon, Sun } from "lucide-react";
import { useThemeContext } from "@/hooks/theme.context";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { formatDay, isHoursStale, parseModelDate } from "@/lib/freshness";
import { PAGES, pageHref, type PageDef } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { dataFreshness, freshnessColumns } from "@/queries/shell";

interface AppHeaderProps {
    current: PageDef;
    /** Viewer's local "today"; injectable for tests. */
    today?: Date;
}

/** Top bar: app name, data freshness, theme toggle and page tabs (docs/05_app_design.md § 2). */
export function AppHeader({ current, today = new Date() }: AppHeaderProps): ReactElement {
    const { isDark, toggleTheme } = useThemeContext();
    const config = dataFreshness();
    const { data, isLoading } = useSemanticModelQuery({ connection: config.connection, query: config.query });

    let freshness: ReactElement;
    let staleBanner: ReactElement | null = null;

    if (isLoading || data === undefined) {
        freshness = <span className="h-4 w-64 animate-pulse rounded-md bg-muted" aria-label="Loading data dates" />;
    } else if (data.status === "error") {
        freshness = (
            <span role="alert" className="text-200 text-destructive" title={data.error.message}>
                Data dates unavailable ({data.error.category})
            </span>
        );
    } else {
        const row = data.table.rows[0];
        const cell = (raw: string): unknown => {
            const index = data.table.columns.findIndex((c) => c.name === raw);
            return row !== undefined && index >= 0 ? row[index] : null;
        };
        const hoursThrough = parseModelDate(cell(freshnessColumns.lastSynerionDate));
        const revenueThrough = parseModelDate(cell(freshnessColumns.lastRevenueDate));
        const refresh = cell(freshnessColumns.lastRefresh);

        freshness = (
            <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-200 leading-200 text-muted-foreground">
                <div className="flex gap-1">
                    <dt>Hours through</dt>
                    <dd className="font-medium text-foreground">{formatDay(hoursThrough)}</dd>
                </div>
                <div className="flex gap-1">
                    <dt>Revenue through</dt>
                    <dd className="font-medium text-foreground">{formatDay(revenueThrough)}</dd>
                </div>
                <div className="flex gap-1">
                    <dt>Model refreshed</dt>
                    <dd className="font-medium text-foreground">
                        {typeof refresh === "string" && refresh !== "" ? refresh : "—"}
                    </dd>
                </div>
            </dl>
        );

        if (isHoursStale(hoursThrough, today)) {
            staleBanner = (
                <div
                    role="status"
                    className="flex items-center gap-2 border-b border-border bg-warning-surface px-4 py-2 text-300 text-warning sm:px-8"
                >
                    <AlertTriangle className="icon-size-200 shrink-0" aria-hidden="true" />
                    <span>Hours are not current: last day loaded is {formatDay(hoursThrough)}.</span>
                </div>
            );
        }
    }

    return (
        <header className="sticky top-0 z-10 border-b border-border bg-card">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-4 sm:px-8">
                <p className="font-heading text-500 leading-500 font-semibold text-emphasis-foreground">
                    Project Real Profitability
                </p>
                <div className="flex items-center gap-4">
                    {freshness}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                    >
                        {isDark ? <Sun className="icon-size-200" aria-hidden="true" /> : <Moon className="icon-size-200" aria-hidden="true" />}
                    </button>
                </div>
            </div>
            <nav aria-label="Pages" className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-8">
                <ul className="flex gap-1">
                    {PAGES.map((page) => {
                        const active = page.id === current.id;
                        return (
                            <li key={page.id}>
                                <a
                                    href={pageHref(page)}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "inline-block whitespace-nowrap border-b-2 px-3 pt-3 pb-2 text-[length:var(--text-300)] focus-visible:outline-2 focus-visible:outline-ring",
                                        active
                                            ? "border-brand-foreground font-semibold text-emphasis-foreground"
                                            : "border-transparent text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {page.label}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            {staleBanner}
        </header>
    );
}
