# Logger King 17

Status: **planned** · class `heavy-duty`, tier 17 of 20 · 6×6, 3 axles · 19.9 t empty · 445 kW · chained tires, 1.32 m
Load: **Substation transformer**, 22 t

## Art brief

- Vehicle: desert tan heavy-duty work truck
- Load (drawn as part of the vehicle): a grey transformer with cooling fins
- Equipment: folded knuckle crane
- Finish: work-worn paint and dried mud
- Tires: 1.32 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
