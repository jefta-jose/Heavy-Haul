# Northgate 11

Status: **planned** · class `heavy-duty`, tier 11 of 20 · 6×6, 3 axles · 15.9 t empty · 375 kW · mud-terrain tires, 1.27 m
Load: **Broken-down campaign truck**, 10 t

## Art brief

- Vehicle: sand beige heavy-duty work truck
- Load (drawn as part of the vehicle): a banner-covered campaign truck with an open bonnet on the deck
- Equipment: folded knuckle crane
- Finish: work-worn paint and dried mud
- Tires: 1.27 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
