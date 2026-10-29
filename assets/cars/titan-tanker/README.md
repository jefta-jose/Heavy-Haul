# Titan Tanker

Status: **planned** · fuel truck for class `offroad` (huge) · 8×8, 4 axles · 38 t empty · 620 kW · flotation tires, 2.2 m

## Art brief

- Vehicle: arctic white 8×8 off-road fuel tanker
- Load (drawn as part of the vehicle): a huge insulated fuel tank
- Equipment: hose reels, beacons
- Finish: mud and frost
- Tires: 2.20 m flotation tires: huge low-pressure balloon tires with wide paddle lugs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
