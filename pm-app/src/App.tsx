//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { AppHeader } from "./components/app-header.component";
import { LogoWatermark } from "./components/logo-watermark.component";
import { ProjectsPage } from "./components/projects-page.component";
import { FilterBar } from "./components/filter-bar.component";
import { useGlobalFilters } from "./hooks/use-global-filters";
import { useHashRoute } from "./hooks/use-hash-route";

// PM app shell (Ion, 2026-11-16): Project Progress (P6) is the only page, moved out of the executive app (app/).
// Same Auxis look: logo watermark, glass header, liquid glass on the page (design-system bundle.css `.ax-liquid`).
function App() {
    const route = useHashRoute();
    const { page } = route;
    const filters = useGlobalFilters(route);

    return (
        <div className="min-h-full bg-background">
            <LogoWatermark />
            <div className="relative z-[1]">
                <AppHeader current={page} params={route.params} />
                <main className="ax-liquid mx-auto w-full max-w-7xl px-4 py-6 sm:px-8">
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
                        <ProjectsPage page={page} filters={filters.state} options={filters.options} params={route.params} />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;
