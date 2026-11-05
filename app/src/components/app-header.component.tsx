import type { ReactElement } from "react";
import { AlertTriangle, Moon, Sun } from "lucide-react";
import { useThemeContext } from "@/hooks/theme.context";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { formatDay, isHoursStale, parseModelDate } from "@/lib/freshness";
import { PAGES, pageHref, type PageDef } from "@/lib/routes";
import { dataFreshness, freshnessColumns } from "@/queries/shell";
// Official Auxis logos (design-system/assets/logos): colour on light grounds, reversed on dark. Never recoloured.
import logoColor from "../../../design-system/assets/logos/auxis-logo-color.png";
import logoReversed from "../../../design-system/assets/logos/auxis-logo-reversed.png";

interface AppHeaderProps {
    current: PageDef;
    /** Current page state; tabs carry it so filters survive a page change. */
    params?: URLSearchParams;
    /** Viewer's local "today"; injectable for tests. */
    today?: Date;
}

/** Top bar: Auxis AppShell header (logo, app name, page tabs, theme toggle) and the data freshness line (docs/05_app_design.md § 2). */
export function AppHeader({ current, params, today = new Date() }: AppHeaderProps): ReactElement {
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
            <dl className="flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1 text-200 leading-200 text-muted-foreground">
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
                    className="mx-auto mt-2 flex max-w-7xl items-center gap-2 rounded-md bg-warning-surface px-4 py-2 text-300 text-warning sm:px-8"
                >
                    <AlertTriangle className="icon-size-200 shrink-0" aria-hidden="true" />
                    <span>Hours are not current: last day loaded is {formatDay(hoursThrough)}.</span>
                </div>
            );
        }
    }

    return (
        <>
            {/* Auxis AppShell header (design-system/components/AppShell): glass bar, logo, app title, page tabs.
                Only the bar is sticky; the freshness line and stale banner scroll with the page. */}
            <header className="ax-header ax-glass sticky top-0 z-10" style={{ borderWidth: 0, borderRadius: 0, boxShadow: "none" }}>
                <img className="ax-logo ax-logo-light" src={logoColor} alt="Auxis" />
                <img className="ax-logo ax-logo-dark" src={logoReversed} alt="Auxis" />
                <span className="ax-header-title hidden sm:inline">Project Real Profitability</span>
                <div className="ax-header-spacer" />
                <nav aria-label="Pages" className="min-w-0 overflow-x-auto">
                    <div className="ax-tabs" role="tablist">
                        {PAGES.map((page) => {
                            const active = page.id === current.id;
                            return (
                                <a
                                    key={page.id}
                                    href={pageHref(page, params)}
                                    role="tab"
                                    aria-selected={active}
                                    aria-current={active ? "page" : undefined}
                                    className="ax-tab inline-flex items-center whitespace-nowrap no-underline"
                                >
                                    {page.label}
                                </a>
                            );
                        })}
                    </div>
                </nav>
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="ax-btn ax-btn-ghost"
                    aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                >
                    {isDark ? <Sun className="icon-size-200" aria-hidden="true" /> : <Moon className="icon-size-200" aria-hidden="true" />}
                </button>
            </header>
            <div className="mx-auto flex max-w-7xl justify-end px-4 pt-3 sm:px-8">{freshness}</div>
            {staleBanner}
        </>
    );
}
