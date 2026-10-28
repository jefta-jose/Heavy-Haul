# Blacktop 15

Status: **planned** · class `highway`, tier 15 of 20 · 6×4, 3 axles · 13.4 t empty · 441 kW · chained tires, 1.12 m
Load: **Glass panels**, 12 t

## Art brief

- Vehicle: arctic white highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): an A-frame rack of huge glass panels
- Equipment: chrome bull bar and air horns
- Finish: polished paint with road dust
- Tires: 1.12 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
