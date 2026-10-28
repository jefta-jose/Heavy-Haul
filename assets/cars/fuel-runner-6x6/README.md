# Fuel Runner 6×6

Status: **planned** · service vehicle (fuel) · 6×6, 3 axles · 12 t · 330 kW · chained tires, 1.3 m

## Art brief

- Body: arctic white 6×6 off-road fuel tanker
- Equipment: insulated tank, hose reels, beacons
- Finish: frost and mud
- Tires: 1.30 m chained mud tires

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics, drivetrain) and `status: "playable"`.
