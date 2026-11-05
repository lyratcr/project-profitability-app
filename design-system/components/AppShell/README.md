# AppShell
The frame of a Fabric app or report page: glass header with logo, page title, page tabs and user avatar, over the gradient canvas.

- Markup: `.ax-shell` > `header.ax-header.ax-glass` + `main`. Provide both logos (`.ax-logo-light` = auxis-logo-color, `.ax-logo-dark` = auxis-logo-reversed); the theme picks one.
- Content area: a CSS grid with `space-4` gaps and `space-5` padding; cards go directly inside.
- Do keep the header 64px and the title in `display` 15px. Do not put filters in the header; use a Slicer row under it.
