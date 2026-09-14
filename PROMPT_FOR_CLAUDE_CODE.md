Copy-paste this into Claude Code (in your project's repo) to kick off the implementation:

---

I have a design handoff for a blog listing page called "小生" (Shosei). This folder contains:

- `README.md` — full design spec (layout, typography, colors, interactions, copy, design tokens)
- `Shosei Blog.dc.html` — an HTML/CSS/JS design reference/prototype showing the intended look and behavior
- `screenshot-full.png` — hero section screenshot
- `screenshot-grid.png`, `02-screenshot-grid.png` — popular/latest mosaic grid screenshots

These are DESIGN REFERENCES, not production code to copy directly. Please:

1. Read `README.md` first for the full spec — exact colors, fonts, spacing, and behavior.
2. Use `Shosei Blog.dc.html` and the screenshots to understand layout and visual details precisely (the HTML file is source of truth for exact styling values; treat screenshots as a visual sanity check).
3. Recreate this design in this codebase's existing environment and conventions (component structure, styling approach, routing, state management) — do not just drop in the raw HTML file.
4. Implement the search + tag filtering behavior, scroll-reveal animations, and hero parallax effect as described in the README, respecting `prefers-reduced-motion`.
5. Leave post cover images as placeholders (the design uses empty image slots with descriptive alt text) unless real assets are provided separately.
6. Ask me if anything in the spec is ambiguous or conflicts with existing patterns in this codebase, rather than guessing.

---
