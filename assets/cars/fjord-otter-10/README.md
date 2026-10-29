# Fjord Otter 10

Status: **planned** · class `scout`, tier 10 of 20 · 4×4, 2 axles · 3.5 t empty · 243 kW · mud-terrain tires, 1.17 m
Load: **Water tank**, 1 t

## Art brief

- Vehicle: burnt orange 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): a white 1000 L water tank in a galvanized cage
- Equipment: rock sliders and skid plates
- Finish: mud-caked lower panels
- Tires: 1.17 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
