# Prairie Star 13

Status: **planned** · class `highway`, tier 13 of 20 · 6×2, 3 axles · 12.4 t empty · 409 kW · all-terrain tires, 1.13 m
Load: **Lumber packs**, 20 t

## Art brief

- Vehicle: forest green highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a flatbed semi-trailer with sawn lumber packs
- Equipment: chrome bull bar and air horns
- Finish: polished paint with road dust
- Tires: 1.13 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
