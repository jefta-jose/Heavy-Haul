# Autobahn 19

Status: **planned** · class `highway`, tier 19 of 20 · 6×4, 3 axles · 15.5 t empty · 504 kW · chained tires, 1.15 m
Load: **Campaign float**, 10 t

## Art brief

- Vehicle: charcoal black highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a stage trailer covered in banners, loudspeakers and lights
- Equipment: sleeper cab with roof lights
- Finish: polished paint with road dust
- Tires: 1.15 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
