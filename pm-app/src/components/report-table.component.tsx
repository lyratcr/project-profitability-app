import type { ReactElement } from "react";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { DataGrid, type GridColumnDef, type SortConfig } from "@microsoft/fabric-datagrid";
import type { DataTable } from "@microsoft/fabric-visuals-core";
import { useThemeContext } from "@/hooks/theme.context";
import { withoutColumns } from "@/lib/query-table";
import { toDataTable, toRollupDataTables, type ColumnMetadataMap } from "@/lib/to-data-table";

interface ReportTableProps {
    table: QueryTable;
    columnMetadata: ColumnMetadataMap;
    title: string;
    subtitle?: string;
    /**
     * Raw name of the query's ROLLUPADDISSUBTOTAL grand-total flag (e.g. "[IsGrandTotal]"). When given,
     * the total row comes from the model; without it the table shows no total (row-level detail).
     */
    grandTotalFlag?: string;
    defaultSort?: SortConfig[];
    /** Rows per page; the table paginates instead of growing without bound. */
    pageSize?: number;
    /** No frame or header: the caller's card (e.g. AxCard) is the frame and carries the title. */
    chromeless?: boolean;
    /** Raw names of query columns that only order the rows (e.g. a numeric month key); not shown. */
    hiddenColumns?: readonly string[];
    /**
     * Starting widths in px by column `name` (the metadata name), so short headers read whole without resizing
     * (Ion, 2026-11-17). Columns not listed keep the grid's default width; the formats still come from the data.
     */
    columnWidths?: Readonly<Record<string, number>>;
}

/** The grid's own column list (id = column name, header = display name) with the requested widths. */
function sizedColumns(data: DataTable, widths: Readonly<Record<string, number>>): GridColumnDef[] {
    return data.columns.map((c) => ({ id: c.name, header: c.displayName ?? c.name, ...(widths[c.name] !== undefined ? { width: widths[c.name], minWidth: widths[c.name] } : {}) }));
}

/** Table with model-provided grand totals (build plan 2.4). */
export function ReportTable({ table: queryTable, columnMetadata, title, subtitle, grandTotalFlag, defaultSort, pageSize = 25, chromeless = false, hiddenColumns, columnWidths }: ReportTableProps): ReactElement {
    const { theme } = useThemeContext();
    const table = hiddenColumns && hiddenColumns.length > 0 ? withoutColumns(queryTable, hiddenColumns) : queryTable;
    const frame = chromeless ? { chromeless: true as const } : { header: { title, subtitle } };

    if (grandTotalFlag) {
        const { bodyTable, grandTotalTable } = toRollupDataTables(table, columnMetadata, { rollupFlagColumns: [grandTotalFlag] });
        return (
            <DataGrid
                data={bodyTable}
                grandTotals={grandTotalTable.rows.length > 0 ? { position: "bottom", data: grandTotalTable } : undefined}
                defaultSort={defaultSort}
                pageSize={pageSize}
                theme={theme}
                {...frame}
            />
        );
    }

    const data = toDataTable(table, columnMetadata);
    return <DataGrid data={data} columns={columnWidths ? sizedColumns(data, columnWidths) : undefined} defaultSort={defaultSort} pageSize={pageSize} theme={theme} {...frame} />;
}
