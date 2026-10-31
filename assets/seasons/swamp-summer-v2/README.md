# Blackwater Swamp Clean (summer)

Status: **playable** (art delivered and wired on 2026-10-31).

The same Blackwater trail as `../swamp-summer`, with the scenery made **extremely simple** so the eye
(and the phone's GPU) goes to the road. The look to aim for is a clean mobile driving game: a soft
gradient sky, two or three flat layers of tree silhouettes, and nothing else behind the trail. The
road keeps its SnowRunner weight: the detailed mud, ruts, rocks, logs, holes, pipes, bridges and
water are unchanged.

## Art direction

**Scenery (new, simple):** flat, stylized painted shapes with almost no texture. Use 3 or 4 tonal values
per layer, smooth gradients instead of brush noise, and soft atmospheric fade with distance. Use simple
cypress and pine silhouettes with a few clean Spanish-moss drapes. The palette is muted swamp: sage,
olive, teal-grey and a pale warm sky. Keep contrast low and saturation gentle, so the scenery never
competes with the road. Use no fine leaves, no bark detail, no reflections, no hard outlines, and no
busy small shapes.

**Road (unchanged, detailed):** the approved swamp-summer masters are reused directly by
`season.json` (`../swamp-summer/source/...`), so they are **not** regenerated: ground, wet mud, granite,
deep mud, rock, log, log end, log crossing, bridge wood, bridge plank, the timber and steel bridge
frames, mud hole and pipe. Water, ruts, splashes and mud are drawn by the game.

## Images to make (write them in `source/`)

Each one is an **edit of its swamp-summer counterpart**, so it keeps the same canvas, horizon,
baseline and positions and drops into the existing registration with no re-tuning.

| File | Edit of | Canvas | What it is |
| --- | --- | --- | --- |
| `backdrop-v1.png` | `../swamp-summer/source/backdrop-v2.png` | 1774×887, opaque | Sky gradient plus two or three flat, hazy tree-line silhouettes. Keep the far waterline and horizon at the same height. Calm, repeatable left and right edges |
| `midground-v1.png` | `../swamp-summer/source/midground-v1.png` | 1774×887, true alpha | A few simple cypress silhouettes (one or two tones each, a little moss), roots on the **same baseline** as the original. Everything between trees transparent |
| `bank-v1.png` | `../swamp-summer/source/bank-v2.png` | 1774×887, true alpha | **Keep the drivable band and everything below row 500 as it is** (same shape, same soil, same opacity to the bottom edge). Simplify only the far verge above the band: a clean low crest of flat grass tufts, no small scattered detail. Transparent above the crest |
| `reeds-v1.png` | `../swamp-summer/source/reeds-v3.png` | 1309×1202, true alpha | One simple reed clump in two or three flat greens, same footprint and baseline as the original |

Hard rules for every image:
- No vehicles, people, road obstacles, water reflections, text, logos or watermarks.
- Transparent images have real alpha: no checkerboard, halo, glow, matte or ground shadow. Check them on a
  light and a dark background.
- Never overwrite a master. A redo is `-v2`, `-v3`, ...
- Record the exact prompts in `source/prompts.json` (drafts are already there; mark each one
  `selected` or `rejected`, with the reason).

## Then Claude wires it

1. Review each image against this brief, then run `npm run art:encode`.
2. Check the bank's contact row (`render.bankContactRow` 500) and that the forest floor meets the new
   midground roots (`src/render/layers/background.js`).
3. Run `HAUL_SEASON=swamp-summer-v2` builds and look at desktop and phone captures. Set `status` to
   `playable` when it looks right.

The trail, surfaces, render settings, rock hulls and ambience come straight from swamp-summer, so the
driving is identical: only the scenery changes.
