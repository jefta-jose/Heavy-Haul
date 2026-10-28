# Sequoia 20

Status: **planned** · class `heavy-duty`, tier 20 of 20 · 6×6, 3 axles · 22 t empty · 480 kW · spiked tires, 1.42 m
Load: **Mining ore**, 30 t

## Art brief

- Vehicle: safety orange heavy-duty work truck
- Load (drawn as part of the vehicle): a dump body heaped with copper ore
- Equipment: steel dump body and mud flaps
- Finish: work-worn paint and dried mud
- Tires: 1.42 m spiked studs: winter tires studded with rows of steel spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
