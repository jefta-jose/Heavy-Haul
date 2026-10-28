# Ice Breaker 19

Status: **planned** · class `offroad`, tier 19 of 20 · 8×8, 4 axles · 23.1 t empty · 543 kW · spiked tires, 2 m
Load: **Orca aquarium**, 20 t

## Art brief

- Vehicle: racing green all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): a glass aquarium with a friendly orca, water sloshing
- Equipment: crane boom and recovery spades
- Finish: thick dried mud
- Tires: 2.00 m spiked studs: winter tires studded with rows of steel spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
