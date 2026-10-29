# Fuel Runner 6×6

Status: **planned** · fuel truck for class `heavy-duty` (large) · 6×6, 3 axles · 16 t empty · 540 kW · mud-terrain tires, 1.5 m

## Art brief

- Vehicle: forest green 6×6 off-road fuel tanker
- Load (drawn as part of the vehicle): an insulated fuel tank
- Equipment: hose reels, beacons, mud flaps
- Finish: dried mud and scuffed paint
- Tires: 1.50 m mud-terrain tires: aggressive open-shoulder lugs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
