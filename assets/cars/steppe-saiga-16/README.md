# Steppe Saiga 16

Status: **planned** · class `scout`, tier 16 of 20 · 4×4, 2 axles · 4.7 t empty · 325 kW · chained tires, 1.48 m
Load: **Copper wire spools**, 1.2 t

## Art brief

- Vehicle: arctic white 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): three wooden spools of shiny copper cable
- Equipment: light bar and roof tent
- Finish: mud-caked lower panels
- Tires: 1.48 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
