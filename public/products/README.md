# Catalogue photography

Drop product photos here and they render automatically — `ProductImage`
resolves `media.storage_path` from the database ("catalogue/nk-shea-balm.webp")
to `/products/nk-shea-balm.webp`. No code change is needed.

Until a file exists, the card shows a flat muted tile with the category mark
and the product initial. That is deliberate: a decorative gradient pretending
to be a photograph is the same dishonesty as marketing copy pretending to be
product UI.

## Filenames expected (from supabase/seed.sql)

| File | Product | Should depict |
|---|---|---|
| `nk-shea-balm.webp` | Nokware shea repair balm | Open amber balm jar, lid beside it, warm neutral surface |
| `nk-shea-oil.webp` | Nokware daily body oil | Amber glass pump bottle of golden oil |
| `aw-kente-tote.webp` | Handwoven Kente market tote | Structured woven tote standing, kente strip visible |
| `af-cocoa-granola.webp` | Cocoa nib breakfast granola | Kraft pouch beside a bowl with visible cocoa nibs |
| `tb-bolga-basket.webp` | Bolga storage basket | Straw basket with leather handles, front-on |
| `vcw-cocoa-powder.webp` | Single-origin cocoa powder | Open jar of dark cocoa powder with a wooden spoon |
| `di-ng-blender.webp` | Compact kitchen blender | Countertop blender, three-quarter view |
| `di-ng-scarf.webp` | Linen travel scarf | Folded natural linen scarf, flat lay |
| `di-gh-lamp.webp` | Rattan reading lamp | Rattan table lamp, lit, on a side table |

`future-marketplace.webp` is deliberately absent. It is a roadmap listing for a
product that does not exist; inventing a photograph for it would misrepresent
what the prototype can do.

## Specification

- 1200 x 1500 (4:5), WebP, under 180 KB, sRGB.
- One consistent warm-neutral background and soft daylight across all nine, so
  the grid reads as a single catalogue rather than a scrapbook.
- Record the source and licence of every file in `CREDITS.txt`.
