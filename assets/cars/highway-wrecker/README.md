# Highway Wrecker

Status: **planned** · breakdown truck for class `highway` (medium; tows up to 48 t) · 6×6, 3 axles · 13 t empty · 560 kW · all-terrain tires, 1.3 m

## Art brief

- Vehicle: pearl white 6×6 heavy rotator tow truck
- Load (drawn as part of the vehicle): a rotating recovery boom and underlift
- Equipment: heavy rear winch drum with hook, outrigger legs, light bar
- Finish: clean paint with road dust
- Tires: 1.30 m all-terrain tires: blocky tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
