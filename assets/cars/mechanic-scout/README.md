# Mechanic Scout

Status: **planned** · breakdown truck for class `scout` (small; tows up to 9 t) · 4×4, 2 axles · 5 t empty · 420 kW · mud-terrain tires, 1.2 m

## Art brief

- Vehicle: mustard yellow 4×4 recovery pickup
- Load (drawn as part of the vehicle): a small folding tow crane and wheel-lift in the bed
- Equipment: heavy rear winch drum with hook, tool chests, spare wheel, amber beacon
- Finish: mud-caked lower panels
- Tires: 1.20 m mud-terrain tires: aggressive open-shoulder lugs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
