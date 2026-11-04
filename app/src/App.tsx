//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { AppHeader } from "./components/app-header.component";
import { PagePlaceholder } from "./components/page-placeholder.component";
import { useHashRoute } from "./hooks/use-hash-route";

// App shell (build plan 2.1): top bar with data freshness, page tabs and hash routes.
// Pages P1–P6 replace PagePlaceholder in Phases 3–4.
function App() {
    const { page } = useHashRoute();

    return (
        <div className="min-h-full bg-background">
            <AppHeader current={page} />
            <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8">
                <PagePlaceholder page={page} />
            </main>
        </div>
    );
}

export default App;
