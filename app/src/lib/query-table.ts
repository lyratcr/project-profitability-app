import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";

/** Index of a raw output column (e.g. "[Hours]" or "dim_calendar[year_month]"), or -1. */
export function columnIndex(table: QueryTable, raw: string): number {
    return table.columns.findIndex((c) => c.name === raw);
}

/** The cell of a raw output column in one row; null when the column or row is missing. */
export function cell(table: QueryTable, raw: string, rowIndex = 0): unknown {
    const index = columnIndex(table, raw);
    const row = table.rows[rowIndex];
    return index < 0 || row === undefined ? null : (row[index] ?? null);
}

/** A numeric cell, or null for blanks and non-numbers (a model BLANK must stay blank, not 0). */
export function numberCell(table: QueryTable, raw: string, rowIndex = 0): number | null {
    const value = cell(table, raw, rowIndex);
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** The table without the given columns (e.g. a sort-only key); row order is kept, since it carries the query's ORDER BY. */
export function withoutColumns(table: QueryTable, raw: readonly string[]): QueryTable {
    const keep = table.columns.map((c, i) => (raw.includes(c.name) ? -1 : i)).filter((i) => i >= 0);
    return { ...table, columns: keep.map((i) => table.columns[i]), rows: table.rows.map((r) => keep.map((i) => r[i])) };
}
