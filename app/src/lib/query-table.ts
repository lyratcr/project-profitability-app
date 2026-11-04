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
