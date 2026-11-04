# Hercules 14

Status: **planned** · class `heavy`, tier 14 of 20 · 16×16, 8 axles · 66.1 t empty · 1152 kW · giant tires, 2.56 m
Load: **Rocket stage**, 30 t

**Size cap: 16.8 m long at most, load included.** Draw the vehicle at that scale or smaller, with `pixelsPerMetre` and `physics.size` to match, so it needs no higher zoom than other trucks. Obstacles are one size for every truck: there is no per-truck scaling of the world, so never exceed this cap. Keep the tires big enough to climb the trail (about 1.3 m or more).

**Wheels (hard rule, see AGENTS.md):** the wheels must make sense for this truck and its load, and carry the weight where the load sits. Lay it out like the Prime Mover and Atlas in `assets/references/wheel-layouts/`: steer axle, a close drive tandem on the tractor, then a close group of 3 or 4 axles at the rear under the load.

## Art brief

- Vehicle: signal red heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a white rocket stage on a cradle
- Equipment: roll cage, beacons and a giant bull bar
- Finish: heavy grime and chipped paint
- Tires: 2.56 m giant mining tires: enormous mining-truck tires taller than a person, deep chevron tread

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
