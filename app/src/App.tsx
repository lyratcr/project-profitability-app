//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { SmokePage } from "./components/smoke-page.component";

// Phase 0: the smoke page only. The app shell and pages P1–P6 replace it in Phase 2.
// EmptyStatePreview.tsx and empty-state-preview-world-map.png are no longer imported;
// Ion removes them by hand (repo rule: Claude doesn't delete files).
function App() {
    return <SmokePage />;
}

export default App;
