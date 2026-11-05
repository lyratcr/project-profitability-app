# ChartCard
A card holding one chart with title, subtitle (period · unit) and legend.

- Markup: `section.ax-card` > `.ax-card-head` (`.ax-card-title`, `.ax-card-sub`, `.ax-legend`) + an `svg.ax-chart`.
- Colour series with `chart-1` (main measure) and `chart-2` (comparison) first; gridlines `.ax-grid` (`chart-grid`), labels `caption` in `ink-muted`.
- Columns: vertical gradient `yellow-100`→`yellow-300`, 4px top radius. Lines: 2.5px, round joins, hollow markers filled with `surface`.
- In Power BI, the theme JSON applies the same colours; this card is for Fabric apps and HTML visuals.
