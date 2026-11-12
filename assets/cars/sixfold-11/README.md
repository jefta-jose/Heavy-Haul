# Sixfold 11

Status: **planned** · class `scout`, rank 11 of 20 · 6×6, 3 axles · 3.8 t empty · 400 kW · mud-terrain tires, 1.12 m
Load: **Bed spares**, 0.3 t

Size: about 5.9 m long with its load. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 3 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. Wheels under the weight: evenly spaced axles or a close rear tandem, as this kind of truck has them.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: matte sand luxury boxy 6×6 off-roader: a tall upright SUV cabin with an open rear pickup bed over two close rear axles
- Load (drawn as part of the vehicle): two spare wheels and a fuel can in the rear bed
- Equipment: portal axles, roof light bar, side steps
- Finish: desert dust
- Tires: 1.12 m mud-terrain tyres: deep chunky mud lugs with open voids; perfectly round, every tyre the same size

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
