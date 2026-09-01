# Brand — Korama

_Status: implemented in `app/globals.css`_

## Palette

Deep green `#136b50` and gold `#e3a857`, carried over from the original
prototype and converted to OKLCh. The light values are exact conversions and
round-trip to the source hexes byte for byte.

One decision is worth knowing before touching the tokens: **shadcn's `--accent`
is the hover / subtle-surface pair**, consumed by every dropdown item, menu
item, tab trigger and sidebar row. Mapping Korama gold there would turn every
hover gold, and gold is 2.10:1 on white, so it can carry neither text nor a
focus ring.

So:

- `--accent` is a pale green tint. **Green is structurally the interactive
  colour** — buttons, links, active nav, focus rings.
- Gold has its own namespace (`--gold`, `--gold-foreground`, `--gold-muted`,
  `--gold-muted-foreground`) with exactly one consumer:
  `components/shared/origin-badge.tsx`. Seeing gold in this product means
  evidenced Ghana origin, and nothing else.
- `--ring` is green, at 5.95:1 on the page ground and 6.47:1 on card. The
  original `outline: 3px solid var(--accent)` gold ring was 2.10:1 and failed
  WCAG 1.4.11.

Dark mode takes hue 165 as its neutral spine — from the old `.gate-page`
background `#10261d` — so dark greys read as warm dark-green stone rather than
blue-black. The sidebar sits *below* the page in lightness, inverting light
mode; that is what makes the console read as an app rather than an inverted
website.

All 26 foreground/surface pairs are verified at 4.5:1 or better (3:1 for the
ring) in both themes, with no out-of-gamut values.

## Typography

| Role | Face | Why |
|---|---|---|
| Display | **Fraunces** | Old-style humanist serif, soft slightly wonky terminals. `axes` is deliberately omitted so `opsz` pins at its 14 text cut — the design bans big headline sentences, so headings live at 17–22px where the text cut belongs. |
| UI | **Instrument Sans** | Neutral without being the default every generated interface reaches for. Its `wdth` axis buys horizontal room in compact console tables without a second font file. |
| Mono | **JetBrains Mono** | Money, batch numbers, order references, telemetry. Chosen for glyph disambiguation — dotted zero, distinct `1/l/I`, `5/S`, `8/B`. Mis-reading a character in `NK-SB-2407` is an operational failure. |

129 KB actually downloads (the latin chunks); the remaining subsets carry
unicode ranges no page hits.

## Density

Two densities, one token set — the storefront is `comfortable`, the staff
console is `compact`. `[data-density]` scopes redefine `--radius`,
`--control-h`, `--row-h`, `--gutter`, `--stack` and the text sizes, and six
files in `components/ui/` read those custom properties instead of fixed
heights.

This split is deliberate and load-bearing: a deck has one uniform level of
grandeur on every slide, a product does not. The storefront should feel like
shopping; the console should feel like operating.

## Rules

- Radius varies by role: input 6 · select 8 · card 10 · sheet/dialog 14 ·
  badge full. Uniform radius everywhere is a tell.
- Page headers are breadcrumb + plain title + toolbar. No eyebrow, no headline
  sentence, no numbered section chips.
- Money and identifiers are mono and tabular, right-aligned in tables.
- One easing curve, `--ease-korama`; 300ms in, 200ms out.
- No `transition: all`, no pure `#000`, card shadows at or below 8% opacity
  (12% for overlays only). `scripts/smoke.mjs` enforces the first two.
- At most two non-grey hues on screen.
