# Rangeline 10

Status: **planned** · class `heavy-duty`, tier 10 of 20 · 6×4, 3 axles · 15.3 t empty · 364 kW · mud-terrain tires, 1.23 m
Load: **Broken-down truck**, 12 t

## Art brief

- Vehicle: gunmetal grey heavy-duty work truck
- Load (drawn as part of the vehicle): a rusty broken-down cab-over truck on a tilt deck
- Equipment: folded knuckle crane
- Finish: work-worn paint and dried mud
- Tires: 1.23 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
