# Night Rider 11

Status: **planned** · class `highway`, tier 11 of 20 · 6×2, 3 axles · 11.4 t empty · 377 kW · all-terrain tires, 1.07 m
Load: **Supercar carrier**, 8 t

## Art brief

- Vehicle: cobalt blue highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a two-deck car-carrier trailer with glossy supercars
- Equipment: twin chrome stacks and visor
- Finish: polished paint with road dust
- Tires: 1.07 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
