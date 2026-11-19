# Mudlord 13

Status: **planned** · class `offroad`, rank 13 of 20 · 6×6, 3 axles · 12 t empty · 340 kW · mud-terrain tires, 1.6 m
Load: **Building materials**, 4 t

Size: about 8.4 m long with its load. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 3 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. Wheels under the weight: evenly spaced axles or a close rear tandem, as this kind of truck has them.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: black 6×6 bonneted off-road truck with a flatbed
- Load (drawn as part of the vehicle): pallets of materials strapped down
- Equipment: front winch, headache rack
- Finish: mud-caked lower panels
- Tires: oversized off-road mud-terrain: deep chunky mud lugs with open voids; perfectly round, every tyre the same size, no chains or spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
