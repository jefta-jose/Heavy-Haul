# Highway Wrecker

Status: **playable** · breakdown truck for class `highway` (medium; tows up to 48 t) · 6×6, 3 axles · 13 t empty · 560 kW · all-terrain tires, 1.3 m

**Redrawn (2026-11-06):** safety yellow, in the Colossus Wrecker's heavy, rugged style, so every class's breakdown truck reads as one fleet. The old art was deleted.

## Art brief

- Vehicle: safety yellow 6×6 heavy rotator tow truck, boxy and rugged like the Colossus Wrecker
- Load (drawn as part of the vehicle): a rotating recovery boom and underlift
- Equipment: heavy rear winch drum with hook, outrigger legs, light bar
- Finish: chipped yellow paint, grime and road dust
- Tires: 1.30 m all-terrain tires: blocky tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
