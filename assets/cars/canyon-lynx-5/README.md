# Canyon Lynx 5

Status: **planned** · class `scout`, tier 5 of 20 · 4×4, 2 axles · 2.6 t empty · 174 kW · all-terrain tires, 1.05 m
Load: **Cement blocks**, 0.9 t

## Art brief

- Vehicle: gunmetal grey 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): a pallet of grey cement blocks in the bed
- Equipment: side shovel and hi-lift jack
- Finish: mud-caked lower panels
- Tires: 1.05 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
