# Mountain Mule 19

Status: **planned** · class `heavy-duty`, tier 19 of 20 · 6×6, 3 axles · 21.3 t empty · 468 kW · spiked tires, 1.36 m
Load: **One giant log**, 28 t

## Art brief

- Vehicle: mustard yellow heavy-duty work truck
- Load (drawn as part of the vehicle): a single colossal sequoia trunk chained down
- Equipment: tool lockers and a compressor
- Finish: work-worn paint and dried mud
- Tires: 1.36 m spiked tires: off-road mud-terrain tires studded with rows of short steel spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
