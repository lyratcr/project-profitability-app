# DataTable
Table / matrix visual with sunken header band, hairline rows, right-aligned numbers and optional in-cell bars.

- Markup: `table.ax-table` in a `.ax-card`; numeric cells `.r`; totals in `tfoot`; share bars `.ax-bar > span[style=width:%]`.
- Deltas as text use `positive-ink` / `negative-ink` with a sign (+/−).
- Numbers use tabular figures and the `data` style. Do not zebra-stripe; hover uses `surface-raised`.
