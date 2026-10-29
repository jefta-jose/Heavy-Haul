# Rocket Hauler 16

Status: **planned** · class `heavy`, tier 16 of 20 · 10×10, 5 axles · 74 t empty · 1268 kW · giant tires, 2.81 m
Load: **Nuclear warhead cask**, 15 t

## Art brief

- Vehicle: gunmetal grey heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a yellow-and-black shielded cask with radiation markings
- Equipment: escort light bar and amber beacons
- Finish: heavy grime and chipped paint
- Tires: 2.81 m giant mining tires: enormous mining-truck tires taller than a person, deep chevron tread

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
