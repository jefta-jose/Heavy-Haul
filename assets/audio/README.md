# Sound: real recordings, one engine per truck class

Everything the game plays comes from field recordings on Freesound, mostly CC0, plus one CC BY 4.0
recording (the Dodge Ram, credited in the game's sound panel). There is no engine synthesis.

```
assets/audio/
  sources.json   every recording: author, title, page, licence, download URL, SHA-256 of the file
  source/*.mp3   the downloaded recordings (Freesound high-quality MP3 previews)
  sounds.json    the recipe: which seconds of which recording become each engine layer and effect
  bank/          built by tools/prepare-audio.py: the clips the game embeds (MP3) and bank.json
```

## Engines by class

| Class | Recordings |
| --- | --- |
| scout | Dodge Ram 1500 V8 (sketchy.dog, CC BY 4.0): start, idle, cruise and pulling hard |
| highway | Ford LTL 9000 semi start, idle and shutdown; Mack semi diesel running |
| heavy-duty | Cummins start, recovery-truck diesel idle, Mack dump truck working and pulling away |
| offroad | military vehicle idle, Humvee driving, APC diesel revving |
| heavy | heavy construction engine idle, excavator working |

A car plays its class's engine (`cars.json` class). Service trucks and unknown classes get the
heavy-duty diesel, or the heavy engine from 700 kW up. A car can pick another with
`"audio": { "engine": "offroad" }` in its `car.json`, and override `crankS`, `airBrakes` or
`backupAlarm` there.

Each engine has `idle`, `drive` and (except highway and heavy) `pull` layers, each a long stretch of
steady running, plus a `start` clip and optionally a `stop` (the highway semi's real shutdown;
others wind down in pitch). `src/audio/engine.js` blends the layers by revs and throttle with
equal-power crossfades and moves their speed within a modest range. `crankS` is how long the starter
turns before the engine catches in the start clip; the physics uses the same time.

## No audible loops

`src/audio/loop-player.js` plays every long recording as overlapping grains of a few seconds, each
from a random place, crossfaded into the next. There is no loop point and no fixed repeat period.
The prep script levels slow loudness swings in each layer, so any grain sits at the same volume.
Rhythmic recordings (wading steps, footsteps in mud, rocks under a truck) are turned into even
`texture` beds offline: many short, level-matched, overlapping grains.

## Effects and ambience

- Tires: `gravel`, `dirt`, `rocks`, `mud` (grows with wheel spin); water: `wade` and `water-churn`;
  `splash` and `splash-small` on entry.
- Brakes on trucks with air brakes: `hydraulic-brake` hiss braking from speed, `air-release` when it
  stops, `air-burst` when the pedal lets go. Handbrake: `handbrake-on` / `-off` ratchet on scouts,
  `air-release` / `air-burst` on trucks.
- Hits and breaking rocks: `underbody`, plus the load shaking, chosen by weight: `cargo-light` and
  `cargo-chains` on scouts, `rattle` and `cargo-heavy-chains` on trucks, `cargo-metal` on the heaviest.
- Ambience: `forest`, `swamp`, `frogs` beds and `crow` / `crow-far` calls, faded in by the season's
  `ambience` zones (`season.json`: `{ "sound": "crows", "x": [260, 340], "gain": 1 }`).
- The back-up alarm and the cab switch clicks are the only synthesized sounds.

## Change or add a sound

1. Find a CC0 (or CC BY, which must be credited) recording. Ask before downloading.
2. Save it in `source/` and add its entry to `sources.json`, with its SHA-256.
3. Add or change its regions in `sounds.json`. Pick steady stretches for engine layers and beds; check
   them on a spectrogram first.
4. Build: `uv run --with numpy --with scipy --with imageio-ffmpeg python tools/prepare-audio.py`
5. Listen: `npm run audio:preview` renders every engine's drive (start, idle, pull, cruise, ease off,
   idle, shutdown) and 40 s of every bed through the game's own code into `output/audio/`
   (open `index.html`). Then `npm test`, `npm run test:browser`, and listen in the game.

The bank is about 10 MB of MP3. Unused recordings were moved to
`~/heavy-haul-archive/2026-10-28-unused-recordings/`.
