# Sound: real recordings, one engine per truck class

**To tune anything, start with [SOUND-ENGINE.md](SOUND-ENGINE.md)**: how a sound gets from recording to speakers, what the gas and H / L / R do, and where to change each thing.

Everything the game plays comes from field recordings on Freesound, CC0 except for one CC BY 4.0
recording (the Dodge Ram, credited in the game's sound panel). There is no engine synthesis.

```
assets/audio/
  sources.json   every recording: author, title, page, licence, download URL, SHA-256 of the file
  sounds.json    the recipe: which seconds of which recording become each engine layer and effect
  bank/          built by tools/prepare-audio.py: the clips the game embeds (MP3) and bank.json
```

The masters are not in the repo. `tools/prepare-audio.py` reads them from `HAUL_AUDIO_MASTERS` (default
`~/heavy-haul-archive/audio-masters/`), downloads any that is missing and checks every hash.
Recordings that were replaced are in `~/heavy-haul-archive/2026-11-03-replaced-recordings/`.

## Engines by class

A truck plays its class's engine, fuel and breakdown trucks included. `"audio": { "engine": "offroad" }`
in `car.json` picks another, and `crankS`, `airBrakes` or `backupAlarm` there override the class's.

| Class | Recordings |
| --- | --- |
| scout | Dodge Ram 1500 V8 (sketchy.dog, CC BY 4.0): start, idle, cruise, pulling hard |
| highway | Ford LTL 9000 start and shutdown, deep inline-six semi idle, Mack and Peterbilt running and pulling away |
| heavy-duty | Ram Cummins start, recovery-truck idle, construction truck, big diesel on a hill, dump trucks, old truck working hard |
| offroad | diesel truck start, military idle, Humvee, old truck, APC pulling hard |
| heavy | big diesel start, bulldozers, wheel loader, excavator, generator rumble; pitched down to 0.86 |

## How an engine plays (`src/audio/engine.js`)

- **Layers at measured revs.** `idle`, part-throttle `on` anchors, hard-working `pull` anchors, `coast` and
  an optional `sub`. A layer's `hz` is the firing frequency measured in the recording (rpm = hz × 120 /
  cylinders), so every layer is pitched in tune to the current revs and adjacent ones blend with
  equal-power crossfades. Off load the mix moves from idle to coast; on load, from `on` to `pull`.
- **`flatten`** follows the firing frequency through a rev sweep and resamples it to one pitch, so a real
  pull-away becomes a steady layer instead of revving by itself. Its value is the search band in Hz.
- **Sound-only revs (`stepRevs`).** The physics rpm stays near 1350 at most speeds in H, so the voice has its
  own revs: converter stall from rest, a climb with road speed through the class's `gears` (top km/h of each),
  a dip and clunk on each shift with at least `holdS` seconds between them, racing when the wheels spin. L and R
  have one gear. `stall`, `revUp`, `revDown` and `shiftS` give a class its weight. None of this touches the physics; the rev needle shows it.
- **Turbo.** Boost lags the load, brings in the `turbo` bed scaled by the class's `turbo`, and lifting off
  full boost chuffs once. Scouts have none.

## No audible loops

`src/audio/loop-player.js` plays every long recording as overlapping grains of a few seconds, each
from a random place, crossfaded into the next. There is no loop point and no fixed repeat period, and a
player at zero gain schedules nothing. The prep script levels slow loudness swings in each layer.
Rhythmic recordings (wading, footsteps in mud, rocks under a truck) become even `texture` beds offline.

## Effects and ambience

- Tires: `gravel`, `dirt`, `rocks`, `mud`; `mud-spin` grows with wheel slip in mud. Water: `wade` and
  `water-churn`; `splash` and `splash-small` on entry.
- Chassis: `rattle-bed` follows speed, surface and how rough the ride is; `creak` when the body rocks at low
  speed, lower on heavier trucks.
- Gears and cab: `gear-clunk` for shifts and the 4×4 / DIFF / H-L levers, `air-pop` for the shift's air on air
  brakes and the turbo chuff.
- Brakes on trucks with air brakes: `hydraulic-brake` hiss braking from speed, `air-release` when it
  stops, `air-burst` when the pedal lets go. Handbrake: `handbrake-on` / `-off` ratchet on scouts,
  `air-release` / `air-burst` on trucks.
- Service work: `hook-clank` as the winch hooks on, `winch-motor` and `cable-strain` while the cable holds a
  load; `fuel-pump` and `fuel-flow` while refuelling.
- Hits and breaking rocks: `underbody`, plus the load shaking, chosen by weight: `cargo-light` and
  `cargo-chains` on scouts, `rattle` and `cargo-heavy-chains` on trucks, `cargo-metal` on the heaviest.
- Ambience: `forest`, `frogs` beds and `crow` / `crow-far` calls, faded in by the season's
  `ambience` zones (`season.json`: `{ "sound": "crows", "x": [260, 340], "gain": 1 }`).
- The back-up alarm and the ignition key tick are the only synthesized sounds.

## Change or add a sound

1. Find a CC0 (or CC BY, which must be credited) recording. Ask before downloading.
2. Put it in the masters folder and add its entry to `sources.json`, with its SHA-256.
3. Add or change its regions in `sounds.json`. Pick steady stretches on a spectrogram; for an engine layer,
   measure `hz`, and avoid cab-interior recordings and track clanks.
4. Build: `uv run --with numpy --with scipy --with imageio-ffmpeg python tools/prepare-audio.py`
5. Listen: `npm run audio:preview` renders every engine's drive and 40 s of every bed through the game's own
   code into `output/audio/` (open `index.html`). Then `npm test` and listen in the game. The tests fail if the
   bank holds a clip the game does not play, or a recording nothing uses.
