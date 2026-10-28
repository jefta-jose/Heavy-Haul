# Colossus Wrecker

Status: **planned** · service truck (repair, huge; tows up to 400 t) · 10×10, 5 axles · 60 t empty · 1000 kW · giant tires, 2.4 m

## Art brief

- Vehicle: safety yellow 10×10 heavy recovery truck
- Load (drawn as part of the vehicle): a giant rotating crane boom
- Equipment: twin heavy rear winches, outrigger spades, counterweights, light bars
- Finish: heavy grime and chipped paint
- Tires: 2.40 m giant mining tires

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
