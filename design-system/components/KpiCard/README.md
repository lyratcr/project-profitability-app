# KpiCard
A single headline number with label, delta pill and comparison text.

- Markup: `section.ax-card` > `.ax-kpi-label`, `.ax-kpi-value`, `.ax-kpi-foot` (a StatusBadge pill + muted text).
- Variants: add `span.ax-kpi-accent` for the gold top bar (the page focus metric); `.ax-spotlight.ax-kpi-hero` for the one hero KPI per page on `gradient-charcoal`.
- Provide: label (UPPERCASE via style), formatted value with unit, delta with sign and arrow, comparison basis ("vs budget").
- Use at most one spotlight and one accent bar per page. Rows of 3–5 cards.
