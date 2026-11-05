# Iconography
The Auxis icon set: four service-line icons (BPO, Digital Transformation, ITO, Corporate) and twelve UI icons for dashboards.

- Drawn on a 24px grid, 1.5px stroke, round caps and joins, 2px-radius corners, no fills except one accent.
- Area icons carry exactly one Cyber Yellow (`yellow-300`) accent:
  - BPO: two people above a gold gear — a team running the client's processes.
  - Digital Transformation: two arrows turning in a cycle around a gold spark — change that brings innovation.
  - ITO: a cloud with a gold check — IT that is managed and running.
  - Corporate: a building with a gold entrance — the corporate functions.
- Three versions per area: `-tile` (gold gradient tile, charcoal glyph; works in both themes, use in app nav, area selectors and section headers), `-light` (charcoal `grey-700` ink, for light grounds), `-dark` (dark-theme `ink` ivory, for dark grounds).
- UI icons have no accent; `-light` and `-dark` inks only. Use at 16–24px; in buttons at 14–16px.
- In HTML / Fabric apps, inline the SVG: `<svg class="ax-icon" stroke="currentColor">` takes the text colour (`ink`) and its accent (`.a` fill, `.as` stroke) takes `yellow-300` from bundle.css, so one copy works in both themes. Tiles: `.ax-area` > `svg.ax-area-tile` + label. The `-light`/`-dark` SVG files are for tools that only take image files (Power BI, PowerPoint); pair them with `img.ax-on-light` / `img.ax-on-dark`.
- In Power BI, insert the SVG with an Image visual or as a button icon; choose the ink that matches the report theme.
- Do not recolour the accent, mix these with other icon families, or use an area icon as a status signal.