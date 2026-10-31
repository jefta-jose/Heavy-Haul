# Overlander 8

Status: **planned** · class `highway`, tier 8 of 20 · 6×2, 3 axles · 10 t empty · 330 kW · mud-terrain tires, 1.04 m
Load: **Cattle trailer**, 9 t

## Art brief

- Vehicle: charcoal black highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): an aluminium livestock trailer full of cows
- Equipment: sleeper cab with roof lights
- Finish: polished paint with road dust
- Tires: 1.04 m mud-terrain tires: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
