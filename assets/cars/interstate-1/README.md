# Interstate 1

Status: **planned** · class `highway`, tier 1 of 20 · 4×2, 2 axles · 7 t empty · 220 kW · road tires, 1 m
Load: **Box freight**, 6 t

## Art brief

- Vehicle: burnt orange highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a plain box semi-trailer
- Equipment: marker lights and wide mirrors
- Finish: polished paint with road dust
- Tires: 1.00 m road tires: smooth highway rib tread, chrome or painted hubs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
