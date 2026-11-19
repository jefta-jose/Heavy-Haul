# Dustbowl 14

Status: **planned** · class `highway`, rank 14 of 20 · 10×10, 5 axles · 14 t empty · 370 kW · all-terrain tires, 1.4 m
Load: **Grain**, 10 t

Size: about 16.2 m long with its load. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 5 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. Tractor with a steer axle and a drive axle or close drive tandem under the hitch; a close group of axles on the trailer under the load. Never one lone axle at the far end of a long trailer.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: white conventional tractor with a hopper grain semi-trailer
- Load (drawn as part of the vehicle): the grain hopper with a tarp roll on top
- Equipment: roo bar, chrome-free steel tanks
- Finish: fresh red-clay splashes
- Tires: oversized off-road all-terrain: blocky all-terrain tread with sipes; perfectly round, every tyre the same size, no chains or spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
