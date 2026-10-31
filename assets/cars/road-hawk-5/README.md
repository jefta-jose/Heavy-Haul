# Road Hawk 5

Status: **planned** · class `highway`, tier 5 of 20 · 4×2, 2 axles · 8.6 t empty · 283 kW · mud-terrain tires, 1.08 m
Load: **Cement tanker**, 12 t

## Art brief

- Vehicle: sand beige highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a grey bulk cement tanker trailer
- Equipment: twin chrome stacks and visor
- Finish: polished paint with road dust
- Tires: 1.08 m mud-terrain tires: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
