//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { AppHeader } from "./components/app-header.component";
import { EffortPage } from "./components/effort-page.component";
import { HeadcountPage } from "./components/headcount-page.component";
import { FilterBar } from "./components/filter-bar.component";
import { PagePlaceholder } from "./components/page-placeholder.component";
import { useGlobalFilters } from "./hooks/use-global-filters";
import { useHashRoute } from "./hooks/use-hash-route";
import { readOrgView, writeOrgView } from "./lib/org-view";
import { pageHref } from "./lib/routes";

// App shell (build plan 2.1–2.2): top bar with data freshness, page tabs, hash routes and global filters.
// Pages P1–P6 replace PagePlaceholder in Phases 3–4 (P1 Effort: 3.1, P2 Headcount: 3.2).
function App() {
    const route = useHashRoute();
    const { page } = route;
    const filters = useGlobalFilters(route);

    return (
        <div className="min-h-full bg-background">
            <AppHeader current={page} params={route.params} />
            <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8">
                <FilterBar
                    page={page}
                    state={filters.state}
                    options={filters.options}
                    optionsLoading={filters.optionsLoading}
                    optionsError={filters.optionsError}
                    customersLoading={filters.customersLoading}
                    projectsLoading={filters.projectsLoading}
                    onChange={filters.setFilters}
                />
                <div className="pt-6">
                    {page.id === "effort" ? (
                        <EffortPage
                            page={page}
                            filters={filters.state}
                            options={filters.options}
                            view={readOrgView(route.params)}
                            onViewChange={(view) => {
                                window.location.hash = pageHref(page, writeOrgView(route.params, view));
                            }}
                        />
                    ) : page.id === "headcount" ? (
                        <HeadcountPage page={page} filters={filters.state} options={filters.options} />
                    ) : (
                        <PagePlaceholder page={page} filters={filters.state} options={filters.options} />
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;
