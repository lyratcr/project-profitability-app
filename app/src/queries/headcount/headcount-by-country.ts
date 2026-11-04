import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import { applyFilters } from "@/lib/filters";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import spec from "./headcount-by-country.json";
import query from "./headcount-by-country.dax?raw";

/** P2 last-week headcount by employee country. */
export const headcountByCountryColumns = {
    country: "fact_profitability_metrics[employee_country]",
    headcount: "[Headcount]",
    share: "[Share]",
} as const;

const columnMetadata: ColumnMetadataMap = {
    [headcountByCountryColumns.country]: { name: "Country", displayName: "Employee country" },
    [headcountByCountryColumns.headcount]: { name: "Headcount", displayName: "Headcount (last week)", format: "#,0" },
    [headcountByCountryColumns.share]: { name: "Share", displayName: "Share", format: "0.0%" },
};

export function headcountByCountry({ filters = [] }: { filters?: readonly string[] } = {}) {
    return { connection: "profitmodel", query: applyFilters(query, filters), columnMetadata, vegaLiteSpec: spec as VisualizationSpec } as const;
}
