/**
 * Display geometry shared by the act 4 charts (hours burn-up and revenue projection). Nothing here computes a KPI:
 * these only place model values on screen.
 */

/** Round axis steps (1, 2, 2.5, 5 × 10^n) for about `count` gridlines. Display scaling only. */
export function niceTicks(max: number, count = 5): number[] {
    const raw = Math.max(max, 1) / count;
    const power = 10 ** Math.floor(Math.log10(raw));
    const step = ([1, 2, 2.5, 5, 10].find((f) => f * power >= raw) ?? 10) * power;
    return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** First day of each month after `from` up to `to`, for the x axis. */
export function monthStarts(from: Date, to: Date): Date[] {
    const out: Date[] = [];
    for (let d = new Date(from.getFullYear(), from.getMonth() + 1, 1); d <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push(d);
    return out;
}

/**
 * Smooth SVG path through points (monotone cubic, Fritsch–Carlson): the curve passes through every point and never
 * overshoots, so a cumulative line never dips. Display geometry only.
 */
export function smoothPath(pts: ReadonlyArray<{ px: number; py: number }>): string {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M${pts[0].px},${pts[0].py}`;
    const n = pts.length;
    const dx = pts.slice(1).map((p, i) => p.px - pts[i].px);
    const slope = pts.slice(1).map((p, i) => (p.py - pts[i].py) / (dx[i] || 1));
    const t = pts.map((_, i) => (i === 0 ? slope[0] : i === n - 1 ? slope[n - 2] : slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2));
    for (let i = 0; i < n - 1; i++) {
        if (slope[i] === 0) {
            t[i] = 0;
            t[i + 1] = 0;
            continue;
        }
        const a = t[i] / slope[i];
        const b = t[i + 1] / slope[i];
        const h = Math.hypot(a, b);
        if (h > 3) {
            t[i] = (3 / h) * a * slope[i];
            t[i + 1] = (3 / h) * b * slope[i];
        }
    }
    let d = `M${pts[0].px.toFixed(1)},${pts[0].py.toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
        const h = dx[i] / 3;
        d += ` C${(pts[i].px + h).toFixed(1)},${(pts[i].py + t[i] * h).toFixed(1)} ${(pts[i + 1].px - h).toFixed(1)},${(pts[i + 1].py - t[i + 1] * h).toFixed(1)} ${pts[i + 1].px.toFixed(1)},${pts[i + 1].py.toFixed(1)}`;
    }
    return d;
}

export interface TreemapTile<T> {
    item: T;
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Squarified treemap (Bruls, Huizing, van Wijk): tiles with areas proportional to `value`, as close to squares as the
 * order allows, biggest first. Items with no positive value are left out. Display geometry only.
 */
export function squarify<T>(items: readonly T[], value: (item: T) => number, width: number, height: number): TreemapTile<T>[] {
    const nodes = items
        .map((item) => ({ item, v: value(item) }))
        .filter((n) => n.v > 0)
        .sort((a, b) => b.v - a.v);
    const total = nodes.reduce((sum, n) => sum + n.v, 0);
    if (total <= 0 || width <= 0 || height <= 0) return [];
    const scale = (width * height) / total;
    const out: TreemapTile<T>[] = [];
    let x = 0;
    let y = 0;
    let w = width;
    let h = height;
    let row: { item: T; a: number }[] = [];
    const worst = (r: { a: number }[], side: number) => {
        const s = r.reduce((sum, n) => sum + n.a, 0);
        const max = Math.max(...r.map((n) => n.a));
        const min = Math.min(...r.map((n) => n.a));
        return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
    };
    const place = () => {
        const s = row.reduce((sum, n) => sum + n.a, 0);
        if (w >= h) {
            const cw = s / h;
            let cy = y;
            for (const n of row) {
                const ch = n.a / cw;
                out.push({ item: n.item, x, y: cy, w: cw, h: ch });
                cy += ch;
            }
            x += cw;
            w -= cw;
        } else {
            const rh = s / w;
            let cx = x;
            for (const n of row) {
                const cwid = n.a / rh;
                out.push({ item: n.item, x: cx, y, w: cwid, h: rh });
                cx += cwid;
            }
            y += rh;
            h -= rh;
        }
        row = [];
    };
    for (const n of nodes) {
        const a = n.v * scale;
        const side = Math.min(w, h);
        if (row.length === 0 || worst([...row, { a }], side) <= worst(row, side)) row.push({ item: n.item, a });
        else {
            place();
            row.push({ item: n.item, a });
        }
    }
    if (row.length > 0) place();
    return out;
}

