# Granite Bull 18

Status: **planned** · class `heavy-duty`, tier 18 of 20 · 6×6, 3 axles · 20.6 t empty · 456 kW · spiked tires, 1.39 m
Load: **Tracked crane**, 25 t

**Size cap: 16.8 m long at most, load included.** Draw the vehicle at that scale or smaller, with `pixelsPerMetre` and `physics.size` to match, so it needs no higher zoom than other trucks. Obstacles are one size for every truck: there is no per-truck scaling of the world, so never exceed this cap. Keep the tires big enough to climb the trail (about 1.3 m or more).

**Wheels (hard rule, see AGENTS.md):** the wheels must make sense for this truck and its load, and carry the weight where the load sits. Lay it out like the Fieldmaster 5, Swamp Ox 3 and Crag Crusher 11: wheels under the load, a close rear tandem or evenly spaced axles.

## Art brief

- Vehicle: olive heavy-duty work truck
- Load (drawn as part of the vehicle): a folded tracked crane
- Equipment: tool lockers and a compressor
- Finish: work-worn paint and dried mud
- Tires: 1.39 m spiked tires: off-road mud-terrain tires studded with rows of short steel spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
