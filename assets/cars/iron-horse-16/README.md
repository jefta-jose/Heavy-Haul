# Iron Horse 16

Status: **planned** · class `highway`, tier 16 of 20 · 6×4, 3 axles · 13.9 t empty · 456 kW · chained tires, 1.15 m
Load: **Wind tower section**, 25 t

## Art brief

- Vehicle: charcoal black highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a lowbed semi-trailer with a white wind tower section
- Equipment: chrome bull bar and air horns
- Finish: polished paint with road dust
- Tires: 1.15 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
