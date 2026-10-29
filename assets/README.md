# Assets

Everything the game shows or reads at runtime lives here; `npm run build` embeds the selected car
and season into one HTML file.

```
assets/
  cars/
    cars.json              100 cars in 5 classes ordered weakest to strongest, each with the load it
                           carries (drawn into its art), plus 10 service trucks (fuel / breakdown per class)
    wheel-types.json       the 7 tire types and their grip per surface
    <car-id>/              one folder per car
      car.json             playable cars only: registration, physics, drivetrain, card text
      art/*.webp           runtime images (master, body, wheel)
      source/              PNG masters, prompts.json, art direction
      README.md            planned cars: art brief and checklist
  seasons/
    <season-id>/
      season.json          trail layout, surfaces, art map and render settings
      art/*.webp           backdrop, midground, bank, ground, props, lane materials
      source/              PNG masters and prompts.json
      rock-hulls.json      collision outlines for rocks
  audio/
    sources.json           every recording: author, page, licence, file hash
    source/*.mp3           the downloaded recordings the bank is cut from
    sounds.json            recipe: engines per truck class, effects, ambience beds
    bank/                  built clips (MP3) and bank.json, embedded by the build
    README.md              credits, preparation and playback
  hud/
    hud.json               icons and garage art to generate
    icons/*.svg            HUD icons, inlined by the build
  references/              target concept images used to direct art generation
```

**A car and its load are one image**: scouts carry small loads, heavy haulers carry huge ones,
and only the wheels are separate. Tires are fixed per car; to get something stronger, switch to
a different car.

The build picks the first `playable` car and season (alphabetically), or the ones named by
`HAUL_CAR` / `HAUL_SEASON`. Art keys in a car and its season must not collide.

Game plan for all of this: [docs/game-design.md](../docs/game-design.md).

Workflow: Codex generates the PNG masters into an item's `source/` folder following
[AGENTS.md](../AGENTS.md); Claude reviews and wires them up following [CLAUDE.md](../CLAUDE.md).
New roster entries get their folders with `npm run scaffold`.
