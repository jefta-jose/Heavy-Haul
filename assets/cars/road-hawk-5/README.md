# Road Hawk 5

Status: **planned** · class `highway`, tier 5 of 20 · 8×8, 4 axles · 8.6 t empty · 283 kW · mud-terrain tires, 1.08 m
Load: **Cement tanker**, 12 t

**Size cap: 16.8 m long at most, load included.** Draw the vehicle at that scale or smaller, with `pixelsPerMetre` and `physics.size` to match, so it needs no higher zoom than other trucks. Obstacles are one size for every truck: there is no per-truck scaling of the world, so never exceed this cap. Keep the tires big enough to climb the trail (about 1.3 m or more).

**Wheels (hard rule, see AGENTS.md):** the wheels must make sense for this truck and its load, and carry the weight where the load sits. Tractor with a steer axle and a drive axle or close drive tandem under the hitch; a close tandem on the trailer under the rear of the load. Never one lone axle at the far end of a long trailer.

## Art brief

- Vehicle: sand beige highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a grey bulk cement tanker trailer
- Equipment: twin chrome stacks and visor
- Finish: polished paint with road dust
- Tires: 1.08 m mud-terrain tires: deep chunky mud lugs with open voids
- Note: The rejected version's back tires were not well distributed, which made the whole body look off. Put the drive axle under the hitch and the close trailer tandem under the rear of the tank, with tires in proportion to the truck, not oversized.

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
