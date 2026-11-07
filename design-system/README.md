# Auxis Dashboards — design system

Auxis Dashboards is the visual language for Auxis Power BI reports and Microsoft Fabric apps: charcoal and Cyber Yellow, warm gradient canvases, lacquered cards with soft depth. It is quiet by default and gold where it matters. Every rule below names a token; never hard-code a hex.

## Principles

- **Gold is earned.** `accent` / `gradient-gold` marks one thing per view: the primary action, the active page, the hero KPI accent bar, series 1. If everything is gold, nothing is.
- **Depth, not borders.** Cards float on the canvas with `shadow-card` (an inset `sheen` top edge plus a long soft drop). Use `line` hairlines only inside cards.
- **Numbers first.** KPI values in `kpi` / `kpi-hero` with tabular figures; labels in the `label` overline style above them, never beside them.
- **Status is never colour alone.** Every red or green carries an arrow, sign (+/−) or word.

## Content

- Write in English, sentence case for titles ("Revenue by service line"), UPPERCASE only via the `label` style.
- Titles say what the visual answers, subtitles give period and unit: "Revenue vs budget" / "Monthly · USD thousands".
- Format numbers with the unit in the value or subtitle: `$12.48M`, `38.6%`, `47 days`, `+1.2 pp`. Use the true minus sign (−) for negatives.
- No emoji, no exclamation marks.

## Colour

- **Brand palette (official):** Cyber Yellow `yellow-300`, Uranian Blue `blue-300`, Charcoal Grey `grey-700`, each with an extended scale (`yellow-100…700`, `blue-100…700`, `grey-100…700`). `gt-purple` is only for Grant Thornton co-branding.
- **Auxis status colours:** `red-500` (#9E2B2B) and `green-500` (#729B78) are the fills for `negative` and `positive`. As text use `negative-ink` / `positive-ink`: on light, `green-500` is only 3.1:1 on white so text uses a deepened green; on dark, `red-500` is 2.3:1 so text uses `red-300`.
- **Surfaces:** page = `--ax-page-gradient` (in `components/bundle.css`: `bg-base`→`bg-deep` diagonal, `glow-gold` top-left, `glow-blue` bottom-right). Cards = `surface`; popovers and hover = `surface-raised`; wells, table headers and inputs = `surface-sunken`; header bar and filter pane = `glass` + `blur-glass`. **Exception, P6 Project Progress only (Ion, 2026-11-07):** inside `.ax-liquid` the cards are liquid glass (`glass-card` + `blur-liquid`, `glass-highlight` sheen, `glass-edge` rim, `shadow-glass`, smoked `glass-spotlight`) over `glass-orb-gold` / `glass-orb-blue` light; they fall back to solid cards with `prefers-reduced-transparency` or without `backdrop-filter`. Don't use it on other pages without Ion's decision.
- **Text:** `ink` for values and titles, `ink-muted` for labels, subtitles and axes, `ink-faint` only for non-text marks. Gold text on light grounds uses `accent-ink`, never `yellow-300`.
- **Charts:** series in order `chart-1` (gold, the main measure) → `chart-2` (blue, the comparison) → `chart-3…6`. Gridlines `chart-grid`. Fill columns with a vertical `yellow-100`→`yellow-300` gradient for the premium look.
- Red and green differ in lightness by only 2.4:1, so red/green status must always carry an icon or sign (see StatusBadge).

## Light and dark

Both themes share the same layout and brand fills; only grounds and text swap. Light is a warm ivory canvas with white cards; dark is a near-black warm charcoal canvas with `surface` cards lit from the top by `sheen`. The **spotlight** card (`gradient-charcoal`) stays dark in both themes and is the place for the single hero KPI.

## Type

- `display` = Poppins (Google Fonts, the face of the Auxis palette guide) for page titles `display-xl`, section headings `display-lg` and card titles `title`.
- `sans` = Segoe UI, the Power BI / Fabric native face, for everything data: `kpi-hero`, `kpi`, `data`, `body`, `body-sm`, `label`, `caption`. Inside Power BI visuals use Segoe UI / Segoe UI Semibold, since Poppins is not available there.

## Space, radius, depth

- 4px base: `space-4` (16) between cards and as visual padding, `space-5` (24) inside cards, `space-6` (32) page margins.
- `radius-md` (14) for cards and visual containers, `radius-sm` (8) for buttons, chips and inputs, `radius-pill` for pills, `radius-xs` (4) for tooltips and table corners.
- `shadow-card` on every card, `shadow-float` on tooltips and popovers, `shadow-glow` on the primary button or hero accent only (one per view).

## Power BI and Fabric

- Import `assets/powerbi/Auxis-Light.json` or `Auxis-Dark.json` (View → Themes → Browse for themes). They set series colours, text classes, card radius 14, soft drop shadows, tables, slicers and the filter pane from these tokens.
- Power BI themes cannot draw gradients: set the page **Canvas background** image to `auxis-canvas-light.jpg` / `auxis-canvas-dark.jpg` (`assets/backgrounds/`), Image fit = Fit, transparency 0%, and leave **Wallpaper** at `bg-deep`.
- For Fabric apps and custom HTML visuals, load `tokens.css` and `components/bundle.css`, then build with the `ax-` classes shown in each component.

## Logos

- Light theme: `auxis-logo-color.png` (charcoal + yellow). Dark theme: `auxis-logo-reversed.png` (yellow + white). On photos or gold: `auxis-logo-white.png`.
- Keep clear space equal to the height of the "x" on all sides; minimum height 24px in app headers. Never recolour, stretch or redraw the mark.

## Iconography

- Auxis icons are custom line icons on a 24px grid, 1.5px stroke, round caps and joins (see the Iconography component).
- **Area icons** (`assets/icons/area/`): BPO, Digital Transformation, ITO, Corporate. Each has one `yellow-300` accent and comes as `-tile` (gold tile, both themes), `-light` and `-dark`. Use them to label service lines in nav, filters and section headers, never as status.
- **UI icons** (`assets/icons/ui/`): home, filter, search, calendar, refresh, download, export, info, settings, trend-up, trend-down, more. Pick `-light` on light grounds and `-dark` on dark; 16–24px, 14–16px inside buttons.
- Status arrows in pills stay solid triangles at 10px. No emoji, no third-party icon fonts.
