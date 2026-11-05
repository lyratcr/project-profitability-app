# Auxis Dashboards design system — instructions for Claude Code

This folder is the source of truth for every UI in this repo (Fabric app pages, HTML/custom visuals, Power BI theming).

1. Read `README.md` first: brand rules, colour usage, type, spacing, light/dark behaviour, logos and icons.
2. Styling: load `tokens.css` then `components/bundle.css`. Use only the CSS variables from `tokens.css` (e.g. `var(--surface)`, `var(--ink)`, `var(--accent)`) and the `ax-` classes from `bundle.css`. Never hard-code hex colours, font sizes, radii or shadows.
3. Theming: set `data-theme="light"` or `data-theme="dark"` on `<html>`; every token switches automatically.
4. Components: each `components/<Name>/README.md` says when and how to use it; `components/<Name>/preview.html` is the reference markup (open it in a browser to see it). Available: AppShell, KpiCard, ChartCard, DataTable, Slicer, Button, StatusBadge, PageTabs, Iconography.
5. Icons: area icons (BPO, Digital Transformation, ITO, Corporate) and UI icons are in `assets/icons/`. For HTML, inline the SVG with `class="ax-icon"` and `stroke="currentColor"` (see `components/Iconography/preview.html`); use the `-light`/`-dark` files only where an image file is required.
6. Logos: `assets/logos/` — colour logo on light, reversed logo on dark. Never redraw or recolour them.
7. Charts: series colours `--chart-1` … `--chart-6` in order; positive/negative values use `--positive-ink` / `--negative-ink` with a sign or arrow, never colour alone.
8. Power BI: report themes in `assets/powerbi/`, canvas background images in `assets/backgrounds/`.
9. `tokens.json` is the editable source; `tokens.css` is generated from it. If you change a token, update both.
