# Mechanic Scout

Status: **planned** · service vehicle (repair) · 4×4, 2 axles · 3.8 t · 190 kW · mud-terrain tires, 0.95 m

## Art brief

- Body: mustard yellow 4×4 service pickup
- Equipment: tool chests in the bed, spare wheel, beacon
- Finish: mud-caked lower panels
- Tires: 0.95 m mud-terrain tires

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics, drivetrain) and `status: "playable"`.
