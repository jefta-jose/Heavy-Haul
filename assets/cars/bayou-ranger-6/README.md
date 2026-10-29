# Bayou Ranger 6

Status: **planned** · class `scout`, tier 6 of 20 · 4×4, 2 axles · 2.8 t empty · 188 kW · mud-terrain tires, 1.01 m
Load: **Small logs**, 0.7 t

## Art brief

- Vehicle: desert tan 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): a bundle of short pine logs strapped across the bed
- Equipment: side shovel and hi-lift jack
- Finish: mud-caked lower panels
- Tires: 1.01 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
