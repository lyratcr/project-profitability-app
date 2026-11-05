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
    /** Raw output name of the measure shown in the cells (with an optional pivot). */
    value?: string;
    /**
     * Several measures side by side instead of a pivot, e.g. hours and share. Each becomes a column
     * (`c0`, `c1`, … in this order); `pivot` must be omitted.
     */
    values?: readonly { raw: string; header: string }[];
    /** Raw output name of the column pivoted into columns; omit for a single value column. */
    pivot?: string;
    /** Raw output name that orders the pivot columns (e.g. dim_calendar[year_month_number]). */
    pivotSort?: string;
    /** Label for blank level values that are real data (not subtotals), e.g. people with no org. */
    blankLabel?: string;
    /**
     * Raw output names that identify each level's rows when the label isn't unique (e.g. the UKG id behind an
     * employee name: two people can share a name). `undefined` for a level keeps the label as its key.
     */
    levelKeys?: readonly (string | undefined)[];
    /**
     * Raw output name of a ROLLUPADDISSUBTOTAL flag on the pivot (e.g. "[IsMonthTotal]"): its TRUE rows are the
     * model's total across the pivot, shown as a last "Total" column.
     */
    pivotTotalFlag?: string;
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
    if ((spec.value === undefined) === (spec.values === undefined)) throw new Error("Matrix spec needs either value or values.");
    if (spec.values && spec.pivot) throw new Error("Matrix spec can't pivot several values.");
    if (spec.values) return buildMultiValue(table, spec, spec.values, levelIdx, flagIdx);
    const valueIdx = index(table, spec.value!);
    const pivotIdx = spec.pivot ? index(table, spec.pivot) : -1;
    const sortIdx = spec.pivotSort ? index(table, spec.pivotSort) : -1;
    const totalFlagIdx = spec.pivotTotalFlag ? index(table, spec.pivotTotalFlag) : -1;
    const TOTAL_KEY = "__pivot_total__";
    const pivotKey = (row: readonly unknown[]) => (totalFlagIdx >= 0 && row[totalFlagIdx] === true ? TOTAL_KEY : pivotIdx < 0 ? "" : String(row[pivotIdx] ?? ""));

    // Pivot columns, ordered by the sort column when given, else by first appearance; the model's total goes last.
    const pivotKeys: string[] = [];
    const pivotOrder = new Map<string, number>();
    for (const row of table.rows) {
        const key = pivotKey(row);
        if (!pivotOrder.has(key)) {
            pivotKeys.push(key);
            pivotOrder.set(key, key === TOTAL_KEY ? Number.POSITIVE_INFINITY : sortIdx < 0 ? pivotKeys.length : Number(row[sortIdx]));
        }
    }
    pivotKeys.sort((a, b) => (pivotOrder.get(a) ?? 0) - (pivotOrder.get(b) ?? 0));
    const colId = new Map(pivotKeys.map((k, i) => [k, `c${i}`]));
    const columns: MatrixColumn[] = [
        { id: "label", header: "" },
        ...pivotKeys.map((k, i) => ({ id: `c${i}`, header: k === TOTAL_KEY ? "Total" : k || "Value" })),
    ];

    const tree = createTree(spec, [...colId.values()], table);
    let totals: Record<string, number | null> | null = null;

    for (const row of table.rows) {
        const depth = depthOf(row, flagIdx);
        const column = colId.get(pivotKey(row))!;
        const value = asNumber(row[valueIdx]);
        if (depth === 0) {
            totals ??= Object.fromEntries(pivotKeys.map((_, i) => [`c${i}`, null]));
            totals[column] = value;
            continue;
        }
        tree.node(tree.path(row, depth))[column] = value;
    }

    return { columns, rows: tree.roots, totals };
}

function buildMultiValue(
    table: QueryTable,
    spec: MatrixSpec,
    values: NonNullable<MatrixSpec["values"]>,
    levelIdx: number[],
    flagIdx: number[],
): Matrix {
    const valueIdx = values.map((v) => index(table, v.raw));
    const ids = values.map((_, i) => `c${i}`);
    const columns: MatrixColumn[] = [{ id: "label", header: "" }, ...values.map((v, i) => ({ id: ids[i], header: v.header }))];
    const tree = createTree(spec, ids, table);
    let totals: Record<string, number | null> | null = null;

    for (const row of table.rows) {
        const depth = depthOf(row, flagIdx);
        const cells = Object.fromEntries(ids.map((id, i) => [id, asNumber(row[valueIdx[i]])]));
        if (depth === 0) totals = cells;
        else Object.assign(tree.node(tree.path(row, depth)), cells);
    }
    return { columns, rows: tree.roots, totals };
}

/** Depth of a rollup row: the number of FALSE flags (0 = grand total). */
function depthOf(row: readonly unknown[], flagIdx: number[]): number {
    const flags = flagIdx.map((i) => row[i]);
    if (flags.some((f) => typeof f !== "boolean")) throw new Error("Matrix rollup flags must be boolean.");
    const depth = flags.filter((f) => f === false).length;
    // Flags must form a prefix: FALSE for the levels shown, TRUE for the rolled-up ones.
    if (flags.slice(0, depth).some((f) => f !== false) || flags.slice(depth).some((f) => f !== true)) {
        throw new Error("Matrix rollup flags must roll up from the innermost level.");
    }
    return depth;
}

function createTree(spec: MatrixSpec, columnIds: readonly string[], table: QueryTable) {
    const nodes = new Map<string, MatrixRow>();
    const roots: MatrixRow[] = [];
    const blank = spec.blankLabel ?? "(blank)";
    const levelIdx = spec.levels.map((l) => index(table, l));
    const keyIdx = spec.levels.map((_, i) => (spec.levelKeys?.[i] ? index(table, spec.levelKeys[i]!) : -1));

    interface Step {
        label: string;
        key: string;
    }

    /**
     * Finds or creates the node for `path`, creating missing ancestors with empty cells. A parent can
     * be missing when the model returns BLANK for its subtotal in every column seen so far.
     */
    function node(path: Step[]): MatrixRow {
        const id = path.map((p) => p.key).join(" › ");
        const existing = nodes.get(id);
        if (existing) return existing;
        const depth = path.length;
        const created: MatrixRow = { _id: id, label: path[depth - 1].label, depth };
        for (const c of columnIds) created[c] = null;
        if (depth < spec.levels.length) created._children = [];
        nodes.set(id, created);
        if (depth === 1) roots.push(created);
        else node(path.slice(0, -1))._children!.push(created);
        return created;
    }

    const text = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
    const path = (row: readonly unknown[], depth: number): Step[] =>
        levelIdx.slice(0, depth).map((i, level) => {
            const label = text(row[i]) ?? blank;
            const key = keyIdx[level] >= 0 ? `${label}#${text(row[keyIdx[level]]) ?? ""}` : label;
            return { label, key };
        });

    return { node, path, roots };
}
