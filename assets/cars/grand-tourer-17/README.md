# Grand Tourer 17

Status: **planned** · class `highway`, tier 17 of 20 · 6×4, 3 axles · 14.4 t empty · 472 kW · chained tires, 1.17 m
Load: **Steel beams**, 22 t

## Art brief

- Vehicle: forest green highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a flatbed with long steel I-beams
- Equipment: chrome bull bar and air horns
- Finish: polished paint with road dust
- Tires: 1.17 m off-road mud-terrain tires wrapped in heavy steel V-bar cleated chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
