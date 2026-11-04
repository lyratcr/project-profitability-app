// Dev check for the shared trend specs (build plan 2.4), not part of the app bundle. Renders each
// template in src/queries/shared against real model data:
//   npm run validate:visual -- scripts/checks/trend-spec-check.ts '{"kind":"bars"}'
//     scripts/checks/trend-spec-check.ts '{"kind":"stacked"}' scripts/checks/trend-spec-check.ts '{"kind":"bars-line"}'
import { trendSpec } from "../../src/queries/shared/trend-spec";

const monthly = `EVALUATE
SUMMARIZECOLUMNS (
    dim_calendar[year_month], dim_calendar[year_month_number],
    KEEPFILTERS ( DATESBETWEEN ( dim_calendar[date], DATE ( 2026, 1, 1 ), DATE ( 2026, 10, 31 ) ) ),
    KEEPFILTERS ( TREATAS ( { "BPO" }, dim_hierarchy_master[L1] ) ),
    "Hours", [Synerion Hours (Employee Org)_app],
    "People", [People With Hours (Employee Org)_app]
)
ORDER BY dim_calendar[year_month_number]`;

const byPay = `EVALUATE
SUMMARIZECOLUMNS (
    dim_calendar[year_month], dim_calendar[year_month_number], fact_profitability_metrics[pay_category_description],
    KEEPFILTERS ( DATESBETWEEN ( dim_calendar[date], DATE ( 2026, 7, 1 ), DATE ( 2026, 10, 31 ) ) ),
    "Hours", [Synerion Hours_app]
)
ORDER BY dim_calendar[year_month_number]`;

const meta = {
    "dim_calendar[year_month]": { name: "Month", displayName: "Month" },
    "dim_calendar[year_month_number]": { name: "MonthNumber", displayName: "Month number" },
    "fact_profitability_metrics[pay_category_description]": { name: "PayCategory", displayName: "Pay category" },
    "[Hours]": { name: "Hours", displayName: "Synerion hours", format: "#,0" },
    "[People]": { name: "People", displayName: "People with hours", format: "#,0" },
};

export default function trendCheck(params: { kind: "bars" | "stacked" | "bars-line" }) {
    const kind = params?.kind ?? "bars";
    const spec =
        kind === "stacked"
            ? trendSpec({ kind, x: "Month", xSort: "MonthNumber", y: "Hours", color: "PayCategory" })
            : kind === "bars-line"
              ? trendSpec({ kind, x: "Month", xSort: "MonthNumber", y: "Hours", line: "People" })
              : trendSpec({ kind, x: "Month", xSort: "MonthNumber", y: "Hours" });
    return { connection: "profitmodel", query: kind === "stacked" ? byPay : monthly, columnMetadata: meta, vegaLiteSpec: spec };
}
