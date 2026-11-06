# Bog Wrecker

Status: **playable** · breakdown truck for class `offroad` (huge; tows up to 64 t) · 8×8, 4 axles · 34 t empty · 620 kW · flotation tires, 2.2 m

**Redrawn (2026-11-06):** safety yellow, in the Colossus Wrecker's heavy, rugged style, so every class's breakdown truck reads as one fleet. The old art was deleted.

## Art brief

- Vehicle: safety yellow 8×8 heavy recovery truck, boxy and rugged like the Colossus Wrecker
- Load (drawn as part of the vehicle): a heavy recovery crane boom
- Equipment: twin rear winch drums with hooks, ground spades, sand ladders, light bar
- Finish: chipped yellow paint under thick dried swamp mud
- Tires: 2.20 m flotation tires: huge low-pressure balloon tires with wide paddle lugs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
