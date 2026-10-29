# Heavy Haul

A 2D side-view off-road driving game for the web and phones: SnowRunner-style weight, suspension,
mud and winching, with Hill Climb Racing-style touch controls. The current build drives the
**Swamp Scout 4** through the **Blackwater Swamp** trail (1.77 km of mud, water, rocks, logs and
stepped climbs).

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev          # builds, serves http://localhost:5173, rebuilds and reloads on save
```

On a phone, open `http://<your-computer's-LAN-IP>:5173` on the same Wi-Fi, turn it sideways and
tap fullscreen. `npm run build` writes `dist/heavy-haul.html` (the whole game in one file, art
included; host it anywhere) and `dist/heavy-haul.artifact.html` (the same without the `<html>`
wrapper). Fonts load from Google Fonts if available; everything else is embedded.

## Layout

```
src/
  main.js                 entry: wires content, simulation, renderer, audio, HUD; game loop
  index.html              HUD markup (icons and CSS are inlined by the build)
  styles/game.css
  physics/                headless, deterministic; runs in Node for tests
    simulation.js         composes the modules below into step(), ctl (inputs) and st (readings)
    terrain.js            trail height field, surfaces, obstacles in the ground, water levels
    obstacles.js          boulders, crushable rocks, fallen logs
    vehicle.js            chassis, wheels, sprung joints and bump stops from car.json
    drivetrain.js         engine, torque converter, gearbox, open / locked differentials
    math.js               seeded random, value noise, smoothstep
  render/                 Canvas 2D painted scene
    renderer.js           layer order and per-frame composition
    sprite-cache.js       sprites resampled once per zoom level
    particles.js          smoke, dust, mud, splashes, rock debris
    layers/               background, ground (bank + road lane), props, vehicle, water
  audio/                  recorded sound: engine.js (class engine voices), loop-player.js (seamless
                          beds), vehicle-audio.js (tires, water, mud, brakes, load, ambience, volumes)
  game/                   view (canvas + camera), input, hud, session (rules and flow)
assets/                   cars (each drawn with its load), seasons, HUD (see assets/README.md)
docs/game-design.md       cars with loads, garage, fuel, service trucks and winching
tests/                    vehicle behaviour, full-trail drive, browser regression
tools/
  build.js, dev.js        esbuild bundle into one HTML file; dev server
  lib/content.js          loads the selected car and season
  content/scaffold.js     folder per roster entry in cars.json, with its art brief
  report-feel.js          launch and mud numbers for tuning
  art/                    encode-webp.py (masters -> runtime WebP), trace-hulls.py (rock collision)
```

Art pipeline: Codex generates images ([AGENTS.md](AGENTS.md)); Claude wires and tunes them
([CLAUDE.md](CLAUDE.md)).

Content is data: a car is `assets/cars/<id>/car.json` plus its art, a map is
`assets/seasons/<id>/season.json` plus its art. The build embeds one of each (the first playable,
or `HAUL_CAR` / `HAUL_SEASON`). Cars have fixed tires: to get something stronger, switch cars.

## How it works

- **One terrain for physics and drawing.** `terrain.js` builds a height profile every 0.25 m from
  the season's trail keys, value noise per surface and authored obstacles. Physics uses it as
  chain shapes; the renderer shears the painted bank along the same line. Mud collision sits
  below the drawn surface so tires sink.
- **Vehicle from the art.** `car.json` `rig` holds the measured registration: axle positions, hub
  height, tire radius and the wheel-arch circles. The body's arches are cut out and redrawn over
  the tires, so each tire sits inside its fender. Springs are sized from each axle's static load.
- **Drivetrain feel.** A torque converter multiplies torque at launch and the commanded drive
  speed ramps fast from rest then gently: a brisk take-off and a smooth drive. Open diffs are
  limited by the weakest tire; mud grip is patchy per tire, so 4×4 and DIFF clearly matter.
- **Rendering.** Sprites are resampled per zoom level, with no per-frame filters, and the canvas
  resolution adapts if frames run long (never during the first 5 s, and never mid-draw).

## Checks

```bash
npm test               # vehicle behaviour (fast)
npm run test:route     # drives the whole trail checkpoint to checkpoint
npm run test:browser   # headless Chromium: loads offline, drives, layouts (first: npx playwright install chromium)
npm run check          # all of the above
npm run feel           # prints launch speeds and deep-mud progress per 4×4 / DIFF combination
```

Browser captures are written to `output/captures/` for visual review.

## Tuning

| Want | Change |
| --- | --- |
| Framing | `FRAMING` in `src/game/view.js` (`front`, ground line, default `zoom`) |
| Zoom per car | `camera.zoom` in the car's `car.json` (1.5 = 17.7 m of trail across the screen; higher shows more) |
| Take-off and cruise | `drivetrain` in `car.json`: `converterBoost`, `driveRamp`, `throttleRise`, `gears` |
| Power, speed, grip, weight of one car | its own `car.json` only: `drivetrain.torqueScale`, `gears`, `governedRpm`, `physics.tireGrip`, `physics.mass`, `physics.load.massT`; roster numbers follow automatically (`tools/lib/specs.js`) |
| Stickier mud | `surfaces.mud` in `season.json`: `mu`, `bog`, `suction`, `sink`; heavy-mud pits only: `heavySink`, `heavyDrag` (drag as a share of tire load), `heavyGrip` (grip left at the pit centre) |
| Suspension | `physics.suspension` in `car.json` |
| Trail shape | `trail` in `season.json`; obstacle generation in `terrain.js` / `obstacles.js` |
