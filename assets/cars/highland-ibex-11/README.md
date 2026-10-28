# Highland Ibex 11

Status: **planned** · class `scout`, tier 11 of 20 · 4×4, 2 axles · 3.7 t empty · 256 kW · mud-terrain tires, 1.28 m
Load: **Tool chests**, 0.6 t

## Art brief

- Vehicle: mustard yellow 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): red rolling tool chests and a welding cart
- Equipment: side shovel and hi-lift jack
- Finish: mud-caked lower panels
- Tires: 1.28 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
