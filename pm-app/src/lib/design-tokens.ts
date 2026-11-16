/**
 * Reads design-system tokens (design-system/tokens.css) for places that need a concrete colour value, such as a
 * Vega-Lite gradient, so the app never copies a hex. Returns null when any token is missing (e.g. in tests, or
 * before the stylesheet loads); callers then fall back to the chart theme.
 */
export function readTokens(names: readonly string[], root: Element | null = typeof document === "undefined" ? null : document.documentElement): string[] | null {
    if (!root) return null;
    const styles = getComputedStyle(root);
    const values = names.map((name) => styles.getPropertyValue(`--${name}`).trim());
    return values.every((v) => v !== "") ? values : null;
}
