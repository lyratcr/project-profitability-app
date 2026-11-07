import type { ReactElement } from "react";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { DataGrid, type SortConfig } from "@microsoft/fabric-datagrid";
import { useThemeContext } from "@/hooks/theme.context";
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
}

/** Table with model-provided grand totals (build plan 2.4). */
export function ReportTable({ table, columnMetadata, title, subtitle, grandTotalFlag, defaultSort, pageSize = 25, chromeless = false }: ReportTableProps): ReactElement {
    const { theme } = useThemeContext();
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

    return <DataGrid data={toDataTable(table, columnMetadata)} defaultSort={defaultSort} pageSize={pageSize} theme={theme} {...frame} />;
}
