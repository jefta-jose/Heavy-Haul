# Colossus Wrecker

Status: **planned** · breakdown truck for class `heavy` (giant; tows up to 260 t) · 10×10, 5 axles · 75 t empty · 1650 kW · giant tires, 3.3 m

## Art brief

- Vehicle: safety yellow 10×10 heavy recovery truck
- Load (drawn as part of the vehicle): a giant rotating crane boom
- Equipment: twin heavy rear winches, outrigger spades, counterweights, light bars
- Finish: heavy grime and chipped paint
- Tires: 3.30 m giant mining tires: enormous tires taller than a person, deep chevron tread

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
