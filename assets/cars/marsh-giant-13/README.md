# Wetland Titan 13

Status: **planned** · class `offroad`, tier 13 of 20 · 6×6, 3 axles · 18 t empty · 445 kW · chained tires, 1.75 m
Load: **Broken-down 6×6**, 14 t

**Size cap: 16.8 m long at most, load included.** Draw the vehicle at that scale or smaller, with `pixelsPerMetre` and `physics.size` to match, so it needs no higher zoom than other trucks. Obstacles are one size for every truck: there is no per-truck scaling of the world, so never exceed this cap. Keep the tires big enough to climb the trail (about 1.3 m or more).

**Wheels (hard rule, see AGENTS.md):** the wheels must make sense for this truck and its load, and carry the weight where the load sits. Lay it out like the Fieldmaster 5, Swamp Ox 3 and Crag Crusher 11: wheels under the load, a close rear tandem or evenly spaced axles.

## Art brief

- Vehicle: sand beige all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): a broken-down 6×6 truck on a recovery deck
- Equipment: snorkel and wading kit
- Finish: thick dried mud
- Tires: 1.75 m off-road mud-terrain tires wrapped in heavy steel V-bar cleated chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
