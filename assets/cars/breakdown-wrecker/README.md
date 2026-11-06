# Breakdown Wrecker

Status: **playable** · breakdown truck for class `heavy-duty` (large; tows up to 58 t) · 6×6, 3 axles · 13.1 t empty · tires 1.75 m · 9.5 m long

**Redrawn (2026-11-06):** safety yellow, in the Colossus Wrecker's heavy, rugged style, so every class's breakdown truck reads as one fleet. The old art was deleted.

## Art brief

- Vehicle: safety yellow 6×6 heavy recovery truck, boxy and rugged like the Colossus Wrecker
- Load (drawn as part of the vehicle): a heavy hydraulic recovery boom with an underlift
- Equipment: twin rear winch drums with red hooks, outrigger legs, tool lockers, light bars on the cab and boom
- Finish: chipped yellow paint with grime and mud on the lower panels
- Tires: 1.75 m off-road truck tires with deep chevron lugs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-vN.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-vN.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-vN.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts, the validation record, and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
