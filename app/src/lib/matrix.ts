import type { QueryTable } from "@microsoft/rayfin-connector-fabric-semanticmodel";

/**
 * Turns a ROLLUPADDISSUBTOTAL result into tree rows for an expandable matrix (build plan 2.4).
 * Every value — leaves, subtotals and the grand total — comes from the query; this only reshapes
 * rows into a tree and pivots one column (e.g. month) into columns. No aggregation happens here,
 * so non-additive measures (FTE, distinct people) stay correct at every level.
 *
 * Query contract:
 *   SUMMARIZECOLUMNS ( <pivot column>, [<pivot sort column>],
 *       ROLLUPADDISSUBTOTAL ( <level 1>, "IsL1Total", <level 2>, "IsL2Total", … ), <filters>, "<Value>", [<measure>] )
 * A row's depth is the number of FALSE flags: 0 = grand total, 1 = level-1 subtotal, … n = leaf.
 */
export interface MatrixSpec {
    /** Raw output names of the row levels, outermost first. */
    levels: readonly string[];
    /** Raw output names of the matching rollup flags (same order as `levels`). */
    flags: readonly string[];
    /** Raw output name of the measure shown in the cells. */
    value: string;
    /** Raw output name of the column pivoted into columns; omit for a single value column. */
    pivot?: string;
    /** Raw output name that orders the pivot columns (e.g. dim_calendar[year_month_number]). */
    pivotSort?: string;
    /** Label for blank level values that are real data (not subtotals), e.g. people with no org. */
    blankLabel?: string;
}

export interface MatrixColumn {
    /** Grid column id: "label" for the row header, then "c0", "c1", … */
    id: string;
    header: string;
}

export interface MatrixRow {
    _id: string;
    _children?: MatrixRow[];
    _expanded?: boolean;
    label: string;
    depth: number;
    [columnId: string]: unknown;
}

export interface Matrix {
    columns: MatrixColumn[];
    rows: MatrixRow[];
    /** Grand-total values per column id (from the query's grand-total rows), or null if absent. */
    totals: Record<string, number | null> | null;
}

const index = (table: QueryTable, raw: string) => {
    const i = table.columns.findIndex((c) => c.name === raw);
    if (i < 0) throw new Error(`Matrix query has no column ${raw}.`);
    return i;
};

const asNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function buildMatrix(table: QueryTable, spec: MatrixSpec): Matrix {
    if (spec.levels.length === 0 || spec.levels.length !== spec.flags.length) {
        throw new Error("Matrix spec needs one rollup flag per level.");
    }
    const levelIdx = spec.levels.map((l) => index(table, l));
    const flagIdx = spec.flags.map((f) => index(table, f));
    const valueIdx = index(table, spec.value);
    const pivotIdx = spec.pivot ? index(table, spec.pivot) : -1;
    const sortIdx = spec.pivotSort ? index(table, spec.pivotSort) : -1;

    // Pivot columns, ordered by the sort column when given, else by first appearance.
    const pivotKeys: string[] = [];
    const pivotOrder = new Map<string, number>();
    for (const row of table.rows) {
        const key = pivotIdx < 0 ? "" : String(row[pivotIdx] ?? "");
        if (!pivotOrder.has(key)) {
            pivotKeys.push(key);
            pivotOrder.set(key, sortIdx < 0 ? pivotKeys.length : Number(row[sortIdx]));
        }
    }
    pivotKeys.sort((a, b) => (pivotOrder.get(a) ?? 0) - (pivotOrder.get(b) ?? 0));
    const colId = new Map(pivotKeys.map((k, i) => [k, `c${i}`]));
    const columns: MatrixColumn[] = [{ id: "label", header: "" }, ...pivotKeys.map((k, i) => ({ id: `c${i}`, header: k || "Value" }))];

    const nodes = new Map<string, MatrixRow>();
    const roots: MatrixRow[] = [];
    let totals: Record<string, number | null> | null = null;
    const blank = spec.blankLabel ?? "(blank)";

    for (const row of table.rows) {
        const flags = flagIdx.map((i) => row[i]);
        if (flags.some((f) => typeof f !== "boolean")) throw new Error("Matrix rollup flags must be boolean.");
        const depth = flags.filter((f) => f === false).length;
        // Flags must form a prefix: FALSE for the levels shown, TRUE for the rolled-up ones.
        if (flags.slice(0, depth).some((f) => f !== false) || flags.slice(depth).some((f) => f !== true)) {
            throw new Error("Matrix rollup flags must roll up from the innermost level.");
        }
        const column = colId.get(pivotIdx < 0 ? "" : String(row[pivotIdx] ?? ""))!;
        const value = asNumber(row[valueIdx]);

        if (depth === 0) {
            totals ??= Object.fromEntries(pivotKeys.map((_, i) => [`c${i}`, null]));
            totals[column] = value;
            continue;
        }

        const path = levelIdx.slice(0, depth).map((i) => (row[i] === null || row[i] === undefined || row[i] === "" ? blank : String(row[i])));
        ensureNode(path)[column] = value;
    }

    /**
     * Finds or creates the node for `path`, creating missing ancestors with empty cells. A parent can
     * be missing when the model returns BLANK for its subtotal in every column seen so far.
     */
    function ensureNode(path: string[]): MatrixRow {
        const id = path.join(" › ");
        const existing = nodes.get(id);
        if (existing) return existing;
        const depth = path.length;
        const node: MatrixRow = { _id: id, label: path[depth - 1], depth };
        for (const c of colId.values()) node[c] = null;
        if (depth < spec.levels.length) node._children = [];
        nodes.set(id, node);
        if (depth === 1) roots.push(node);
        else ensureNode(path.slice(0, -1))._children!.push(node);
        return node;
    }

    return { columns, rows: roots, totals };
}
