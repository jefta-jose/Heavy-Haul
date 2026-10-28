# Spring Thaw (spring)

Status: **planned**

Mountain tracks in meltwater: deep slush, swollen creeks, rock gardens; fresh greens and grey snowbanks.

## Needed to become playable

Use `../swamp-summer` as the template (its `season.json` documents every field).

- [ ] `source/*.png` masters and `source/prompts.json` for: backdrop (opaque panorama), midground
      (transparent trees), bank (side-view ground strip, tire-contact row recorded in `render.bankContactRow`),
      ground (top-down tile), reeds/props, log, rock, and the lane materials
- [ ] `art/*.webp` encoded with `npm run art:encode`
- [ ] `rock-hulls.json` traced from the rock art with `tools/art/trace-hulls.py`
- [ ] `season.json` with the trail (keys, zones, waters, heavy-mud pits, checkpoints, stations),
      surface grip and noise, art map and render settings; set `status` to `playable`
