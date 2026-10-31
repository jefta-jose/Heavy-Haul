# Frozen North (winter)

Status: **planned**

Ice roads over frozen lakes, snow drifts and packed-snow climbs; pale overcast sky, blue shadows. Home of the ice-road trucks.

## Needed to become playable

Use `../swamp-summer` as the template (its `season.json` documents every field).
Scenery is **extremely simple** (gradient sky, flat hazy silhouette layers, a calm lower band; set
`render.forestFloor` to `false`); only the road layers get full detail. See the hard rule in `../SKILL.md`.

- [ ] `source/*.png` masters and `source/prompts.json` for: backdrop (opaque panorama), midground
      (transparent trees), bank (side-view ground strip, tire-contact row recorded in `render.bankContactRow`),
      ground (top-down tile), reeds/props, log, rock, and the lane materials
- [ ] `art/*.webp` encoded with `npm run art:encode`
- [ ] `rock-hulls.json` traced from the rock art with `tools/art/trace-hulls.py`
- [ ] `season.json` with the trail (keys, zones, waters, heavy-mud pits, checkpoints, stations),
      surface grip and noise, art map and render settings; set `status` to `playable`
