import { useMemo, type ReactElement, type ReactNode } from "react";
import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";
import { DataGrid, type GridColumnDef, type Row } from "@microsoft/fabric-datagrid";
import { formatValue, type DataTable } from "@microsoft/fabric-visuals-core";
import { useThemeContext } from "@/hooks/theme.context";
import { buildMatrix, type MatrixSpec } from "@/lib/matrix";

interface HierarchyMatrixProps {
    table: QueryTable;
    spec: MatrixSpec;
    /** Header of the row-label column, e.g. "Organization (employee)". */
    rowHeader: string;
    /**
     * Format string of the measure in the cells (from the query metadata), or one per value column
     * when the spec lists several `values`.
     */
    format?: string | readonly (string | undefined)[];
    title: string;
    subtitle?: string;
    /** Expand the first level on load. */
    expandFirstLevel?: boolean;
    /**
     * Fixed width of each value column in pixels, so month headers stay readable; the grid scrolls sideways.
     * Without it the grid fits every column into the container (and ignores minWidth).
     */
    valueWidth?: number;
    /** No frame or header: the caller's card (e.g. AxCard) is the frame and carries the title. */
    chromeless?: boolean;
    /**
     * Value columns (0-based, in `spec.values` order) that hold a 0–1 share: the cell adds an in-cell bar
     * (design-system DataTable `.ax-bar`). Display only; the share itself comes from the model.
     */
    barColumns?: readonly number[];
}

const show = (value: unknown, format?: string) => (value === null || value === undefined ? "" : String(formatValue(value, format)));

/** A formatted share with an in-cell bar; the bar length is the model's 0–1 share, clamped for display. */
function ShareCell({ value, format }: { value: unknown; format?: string }): ReactNode {
    if (typeof value !== "number" || !Number.isFinite(value)) return "";
    const width = `${Math.min(100, Math.max(0, value * 100))}%`;
    return (
        <span className="flex w-full items-center justify-end gap-2">
            <span className="ax-bar flex-1" aria-hidden="true">
                <span style={{ width }} />
            </span>
            <span className="tabular-nums">{show(value, format)}</span>
        </span>
    );
}

/**
 * Matrix with expandable rows (build plan 2.4): levels as a tree, an optional pivot (e.g. months) as
 * columns, and the model's grand total in the totals row. Every number comes from the query.
 */
export function HierarchyMatrix({
    table,
    spec,
    rowHeader,
    format,
    title,
    subtitle,
    expandFirstLevel = false,
    valueWidth,
    chromeless = false,
    barColumns = [],
}: HierarchyMatrixProps): ReactElement {
    const { theme } = useThemeContext();
    const matrix = useMemo(() => buildMatrix(table, spec), [table, spec]);

    const formatOf = (i: number) => (typeof format === "string" || format === undefined ? format : format[i]);
    const columns: GridColumnDef[] = matrix.columns.map((c, i) =>
        c.id === "label"
            ? { id: "label", header: rowHeader, minWidth: 180, ...(valueWidth !== undefined ? { width: 180 } : {}) }
            : {
                  id: c.id,
                  header: c.header,
                  numericStyling: true,
                  ...(valueWidth !== undefined ? { width: valueWidth, minWidth: valueWidth } : {}),
                  cellRenderer: (value) =>
                      barColumns.includes(i - 1) ? <ShareCell value={value} format={formatOf(i - 1)} /> : show(value, formatOf(i - 1)),
              },
    );

    const rows: Row[] = useMemo(() => {
        const toRow = (r: (typeof matrix.rows)[number]): Row => {
            const { _children, depth, ...rest } = r;
            const row: Row = { ...(rest as Row) };
            if (_children) {
                row._children = _children.map(toRow);
                row._expanded = expandFirstLevel && depth === 1;
            }
            return row;
        };
        return matrix.rows.map(toRow);
    }, [matrix, expandFirstLevel]);

    const totals: DataTable | undefined = matrix.totals
        ? {
              columns: [{ name: "label" }, ...matrix.columns.slice(1).map((c, i) => ({ name: c.id, format: formatOf(i) }))],
              rows: [["Total", ...matrix.columns.slice(1).map((c) => matrix.totals![c.id])]],
          }
        : undefined;

    return (
        <DataGrid
            data={rows}
            columns={columns}
            grandTotals={totals ? { position: "bottom", data: totals } : undefined}
            capabilities={{ disableFiltering: true }}
            theme={theme}
            {...(chromeless ? { chromeless: true } : { header: { title, subtitle } })}
        />
    );
}
