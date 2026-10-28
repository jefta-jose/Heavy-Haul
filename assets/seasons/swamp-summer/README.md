# Blackwater Swamp landscape

Use the [season landscape guide](../SKILL.md) and [approved reference](../../references/four-scout-trucks.png). Preserve the established trees and background palette.

The playable road uses ordinary dirt, wet mud, deep bogs, fallen logs, four-trunk piles, and suspended timber bridges. These obstacles have matching collision geometry; their artwork alone does not supply the behavior.

## Selected interactive terrain art

| Role | Master | Runtime |
| --- | --- | --- |
| Deep slurry material | `source/deep-mud-v1.png` | `art/deepMud.webp` |
| Log end face | `source/log-end-v2.png` | `art/logEnd.webp` |
| Bridge timber material | `source/bridge-wood-v1.png` | `art/bridgeWood.webp` |

All selected new masters are 1774×887 PNG. Mud and timber are opaque materials; the log end has true alpha and transparent side margins. The renderer measures its visible alpha bounds once, in memory, before mapping it onto the circular log collision shape. Keep old variants; v1 of the log end is retained but was below the minimum canvas width. Exact prompts and that rejection reason are under `interactive_terrain` in `source/prompts.json`.

## Registration and behavior

- `season.json → trail.heavyMud`: four bog centres. `surfaces.mud.heavySink` adds up to 0.16 m to the normal 0.26 m bed depth, with a smooth transition. The same field drives the wet material and splashes. Tire impressions are visual and persist briefly within a run; the mud bed is physical.
- `trail.logPiles`: three authored piles of four collision logs, with larger radii than scattered trunks. The first pile is beyond the starting acceleration area. Avoid generating rocks or extra logs in their reserved space.
- `trail.bridges`: anchored Planck decks at 364–378 m and 957–969 m. Planks are connected by limited hinges, flex under wheel loads, crack on contact, and can lose a connection under sustained overload. Normal Scout loads remain crossable. The terrain beneath them is an excavated gully, not a hidden solid road.
- Mud rendering uses continuous paths rather than overlapping translucent columns. Redraw only below the irregular surface for tire burial; rectangular wheel masks create visible patches.
- Cache the static wet material in bounded world-space chunks and reuse rasterized tire-impression stamps. Rebuild them when pixel scale changes; keep the retained track count bounded and clear it for a new run.
- Water fills submerged intervals only. Do not connect dry approach samples to a basin's water level; that creates translucent walls across the road.

Run `npm run check` after integration. `tests/terrain.test.js` checks sinking, four-log collision piles, loaded bridge flex and overload failure. Browser captures include `08-bog-splash.png` and `09-swing-bridge.png`; additional review captures use the `terrain-` prefix under `output/captures/`.
