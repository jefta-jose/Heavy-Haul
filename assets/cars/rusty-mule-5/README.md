# Rusty Mule 5

Status: **planned** · class `scout`, rank 5 of 20 · 4×4, 2 axles · 2.6 t empty · 115 kW · mud-terrain tires, 1.35 m
Load: **Spare tyre**, 0.1 t

Size: about 5.4 m long with its load. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 2 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. One wheel in each arch, where this kind of vehicle has them.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: dark charcoal grey 1970s American coupe utility: a long, low two-door car body with a long flat bonnet, a sloping sedan-style cab roof with thin chrome window trim and an open pickup bed built into the rear bodywork, a chrome rocker strip along the sills; raised on a modest lift kit with wider wheel arches to clear off-road tyres
- Load (drawn as part of the vehicle): a spare tyre lying in the bed
- Equipment: slotted five-spoke steel rally rims painted silver, chrome bumpers, side mirror on the door
- Finish: light dust and mud spatter on the lower panels
- Tires: oversized off-road mud-terrain: deep chunky mud lugs with open voids; perfectly round, every tyre the same size, no chains or spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
