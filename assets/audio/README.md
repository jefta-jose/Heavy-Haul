# Sound: real recordings, one engine per truck class

**To tune anything, start with [SOUND-ENGINE.md](SOUND-ENGINE.md)**: how a sound gets from recording to speakers, what the gas and H / L / R do, and where to change each thing.

Vehicle sounds come from field recordings on Freesound, CC0 except for one CC BY 4.0
recording (the Dodge Ram).
Source credits and licences travel with the game content. There is no engine synthesis.

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

A truck plays its class's engine. `"audio": { "engine": "offroad" }`
in `car.json` picks another, and `crankS`, `airBrakes` or `backupAlarm` there override the class's.

| Class | Recordings |
| --- | --- |
| scout | Dodge Ram 1500 V8 (sketchy.dog, CC BY 4.0): start, idle, cruise, pulling hard |
| highway | Ford LTL 9000 start and shutdown, deep inline-six semi idle, Mack and Peterbilt running and pulling away |
| heavy-duty | Ram Cummins start, recovery-truck idle, construction truck, big diesel on a hill, dump trucks, old truck working hard |
| offroad | diesel truck start, military idle, Humvee and old truck played close to natural speed |
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

## No audible loops

`src/audio/loop-player.js` plays every long recording as overlapping grains of a few seconds, each
from a random place, crossfaded into the next. There is no loop point and no fixed repeat period, and a
player at zero gain schedules nothing. The prep script levels slow loudness swings in each layer.
Rhythmic recordings (wading, footsteps in mud, rocks under a truck) become even `texture` beds offline.

## Effects and ambience

- Tires: `gravel`, `dirt`, `rocks`, `mud`; `mud-spin` grows with wheel slip in mud. Water: `wade` and
  `water-churn`; `splash` and `splash-small` on entry.
- Chassis: `rattle-bed` follows speed, surface and how rough the ride is. Hitting a log, pipe or rock, landing and straining play **what the truck carries**, not its class
  ([load-sounds.js](../../src/audio/load-sounds.js)): each load's name sorts it into a group (`empty`, `gear`, `timber`, `steel`,
  `bulk`, `liquid`, `freight`, `machine`, `cattle`, `chickens`, `elephant`; under 1.25 t freight, steel and machines count as
  `gear`; `"audio": { "load": "<group>" }` in car.json picks one by hand). A group has a `hit` one-shot, a `ride` bed that grows
  with a rough ride and with strain (crawling while the engine works hard), and for animals a `call` (moo, cluck, trumpet) on hard
  knocks. Every truck thumps on landing (`landing`, `landing-heavy` from 12 t) after 0.15 s in the air (`st.airT`) or a hard slam.
  Clips were checked against the approved ones for ringing; `drop` in `sounds.json` leaves out a ringing one-shot.
- Gears and cab: `gear-clunk` for shifts and the AWD / DIFF / H-L levers, `air-pop` for the shift's air on air
  brakes.
- Brakes on trucks with air brakes: `hydraulic-brake` hiss braking from speed, `air-release` when it
  stops, `air-burst` when the pedal lets go. Handbrake: `handbrake-on` / `-off` ratchet on scouts,
  `air-release` / `air-burst` on trucks.
- Refuelling: `hook-clank` as the hose connects, `fuel-pump` and `fuel-flow` while the tank fills.
- Breaking rocks (unchanged, the user likes it): `underbody`, plus the load shaking, chosen by weight: `cargo-light` and `cargo-chains` on
  light scouts, `rattle` and `cargo-heavy-chains` on other trucks, and on the heavy class `rattle` with `cable-strain`.
- Ambience, faded in by the season's `ambience` zones (`season.json`: `{ "sound": "crows", "x": [260, 340], "gain": 1 }`):
  beds `forest`, `frogs`, `rain-heavy`, `rain-light` (the same rain, filtered soft), `wind-desert`, `wind-trees`, `leaves`,
  `cicadas`, `insects`, `stream`, `meadow` and `rumble` (`BEDS` in `vehicle-audio.js`), and calls `crows`, `hawk` and
  `woodpecker` (`CALLS`). A `thunder` zone makes each lightning flash on screen followed by `thunder`, or `thunder-far`
  when it is further off, 0.6 to 2.5 s later. Each map's set is in [docs/sound-plan.md](../../docs/sound-plan.md).
- The back-up alarm and the ignition key tick are the only synthesized sounds.

## Interface feedback

The supplied MP3s in `sound_effects/` ship unchanged, separately from the recorded
vehicle bank. `tools/lib/content.js` includes them in app and standalone builds.

| File | Trigger |
| --- | --- |
| `accept.mp3` | Continue, Drive, Done and primary accept buttons |
| `norma_click.mp3` | Ordinary enabled buttons in menus, garage and HUD |
| `buy-upgrade-car.mp3` | Successful car purchase or paid upgrade |
| `mission_complete.mp3` | Optional mission completion and successful delivery/run completion |
| `mission-failed.mp3` | Broken optional mission or failed run |

Purchases trigger audio after payment succeeds; failed purchases do not play the
buy cue. Finishing a mission at the depot produces one completion cue. A new
failure replaces an ongoing completion cue instead of layering both outcomes.
Button vibrations remain active on supported phones. Master, Effects and Mute
control the sounds; `UI_SOUND_GAINS` sets their relative levels.

## Change or add a sound

1. Find a CC0 (or CC BY, which must be credited) recording. Ask before downloading.
2. Put it in the masters folder and add its entry to `sources.json`, with its SHA-256.
3. Add or change its regions in `sounds.json`. Pick steady stretches on a spectrogram; for an engine layer,
   measure `hz`, and avoid cab-interior recordings and track clanks.
4. Build: `uv run --with numpy --with scipy --with imageio-ffmpeg python tools/prepare-audio.py`
5. Listen: `npm run audio:preview` renders every engine's drive (start, gears, lift off, low-range grind, wheelspin, shutdown),
   40 s of every bed, each map's mix and each load group's drive (`load-<group>.wav`) through the game's own
   code into `output/audio/` (open `index.html`). Then `npm test` and listen in the game. The tests fail if the
   bank holds a clip the game does not play, or a recording nothing uses.
