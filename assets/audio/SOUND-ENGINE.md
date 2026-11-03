# How the sound engine works, and where to tune it

Follow a sound from the recording to your speakers, then look up what to change. The numbers come from the
code and the current `sounds.json`. The tables marked "measured" were logged from a real Prime Mover in
the physics on 2026-11-03. If you change the tuning, those tables go stale, but the formulas still explain them.

**Jump to:** [Where to edit](#where-to-edit) · [The class engines](#the-engine-of-each-class) ·
[What gas does](#what-the-gas-pedal-does) · [What H, L and R do](#what-h-l-and-r-do) ·
[Heavy trucks, worked through](#worked-example-a-heavy-truck) · [Every other sound](#every-other-sound) ·
[Cookbook](#tuning-cookbook) · [Known weak spots](#known-weak-spots)

## The whole path

```
BUILD TIME (only when you rebuild the bank)

  ~/heavy-haul-archive/audio-masters/*.mp3     the full field recordings (not in the repo)
        │   sources.json: credit, download URL, hash of each one
        ▼
  sounds.json   the recipe: which seconds of which recording become which sound, plus each class's settings
        │
        ▼   tools/prepare-audio.py   cuts, filters, flattens pitch, levels, encodes
        │
  bank/*.mp3 + bank/bank.json     the only audio the game ever sees

RUN TIME (every frame while playing)

  physics state (pedal, speed, wheel slip, gear, torque)
        │
        ▼   src/audio/engine.js
  stepRevs()    the sound's own revs and gears     → the revs the HUD needle shows
        │
        ▼
  engineMix()   how loud and how fast each layer plays
        │
        ▼
  layers → low-pass filter → voice volume → Engines slider → compressor → Master slider → speakers
                                                                ▲
  effects (src/audio/vehicle-audio.js) → Effects slider ────────┘
  ambience ──────────────────────────→ Ambience slider ───────────→ straight to Master
```

**Physics RPM doesn't drive the engine sound.** In H the physics RPM sits near `idle + 600` (about 1350) at most
speeds, which would be one held note. So the sound has its own revs. Nothing in the audio affects how a truck drives, so
you can tune sound freely without touching the handling. Exhaust smoke still follows the physics RPM.

## Where to edit

| To change | Edit | Then |
| --- | --- | --- |
| Which recording or seconds a sound uses, class settings (`gears`, `stall`, `revUp`, `pitch`...) | [`sounds.json`](sounds.json) | Rebuild the bank |
| How revs and gears behave, how layers blend (all classes) | [`src/audio/engine.js`](../../src/audio/engine.js) | Save |
| When an effect plays and how loud | [`src/audio/vehicle-audio.js`](../../src/audio/vehicle-audio.js) | Save |
| Seamless looping | [`src/audio/loop-player.js`](../../src/audio/loop-player.js) | Save |
| One truck uses another class's engine, or its own crank time, air brakes or alarm | that truck's `car.json`, `"audio": { ... }` | Save |
| Where forest, frogs and crows are heard | the season's `season.json`, `ambience` | Save |
| Your own listening volumes | the in-game sound panel | Saved in the browser |

Rebuild the bank (also needed for any `sounds.json` change, since the game reads `bank.json`, never `sounds.json`):

```bash
uv run --with numpy --with scipy --with imageio-ffmpeg python tools/prepare-audio.py
```

For a quick try of a number, edit `bank/bank.json` directly, but copy the value you like into `sounds.json`,
because the next rebuild overwrites `bank.json`.

Listen:

```bash
npm run audio:preview
```

That renders every engine and bed through the game's own code into `output/audio/index.html`. The preview follows set
speeds and doesn't use the physics, so also check in the game with `npm run dev`.

## The engine of each class

A truck plays its class's engine, service trucks included. `tools/lib/content.js` (`resolveAudio`) picks it: the
`car.json` `audio.engine` if set, otherwise the truck's `class`.

### The layers

| Layer | What it is | When you hear it |
| --- | --- | --- |
| `start` | The starter and catch, one clip | While cranking |
| `idle` | Sitting at idle | Pedal up, revs near idle |
| `coast` | Off the pedal with revs up | Pedal up, moving |
| `on` | Part throttle, one or more recordings at different revs | Light to medium effort |
| `pull` | Working hard, one or more at different revs | Heavy effort |
| `sub` | Deep rumble under everything (heavy class only) | Always while running |
| `stop` | Recorded shutdown (highway only) | Engine off; the others wind down in pitch over 1.4 s |

A layer's **rpm** is what it was recorded at. The game plays it at `current revs ÷ layer rpm`, so every layer stays
in tune with the others. That speed is limited to 0.62–1.55, because beyond that it stops sounding real.

### Class settings (`sounds.json`)

| Setting | Meaning | scout | highway | heavy-duty | offroad | heavy |
| --- | --- | --- | --- | --- | --- | --- |
| `idleRpm` | Revs at idle | 795 | 700 | 856 | 885 | 880 |
| `governedRpm` | Revs at the top | 2300 | 2100 | 2100 | 1700 | 1900 |
| `gears` | Top km/h of each sound gear in H | 13, 26, 42, 60 | 12, 22, 34, 50 | 15, 28, 50 | 14, 26, 48 | 16, 28, 44 |
| `shiftS` | Seconds a shift takes | 0.30 | 0.42 | 0.45 | 0.40 | 0.55 |
| `grain`, `fade` | Optional. Seconds each piece of a driving layer plays and blends; longer hides looping. Offroad 6–12 and 1.2; the others use the default 2.5–5 and 0.5 | | | | | |
| `holdS` | Least seconds between shifts | 3 | 3 | 3 | 3 | 3.5 |
| `revUp` | Rev climb speed (share of range per second) | 1.7 | 1.0 | 1.05 | 1.2 | 0.65 |
| `revDown` | Rev fall speed | 1.2 | 0.75 | 0.8 | 0.85 | 0.5 |
| `stall` | Revs reached at full pedal from rest (0 idle, 1 top) | 0.36 | 0.32 | 0.30 | 0.34 | 0.28 |
| `cutoff` | Filter brightness in Hz (see [the mix](#the-mix)) | 7000 | 6000 | 5500 | 9000 | 4800 |
| `pitch` | Lowers or raises the whole engine | 1 | 1 | 1 | 0.97 | 0.86 |
| `crankS` | Starter time; **also sets the physics crank time** | 1.1 | 1.9 | 1.7 | 1.7 | 2.0 |
| `airBrakes` | Air hiss, not a lever ratchet | no | yes | yes | yes | yes |

### Which recordings

The `rpm` column is the value in `bank.json`, already adjusted for the class's `pitch`. Values marked `~` are estimates,
because the firing frequency couldn't be measured reliably.

**Scout: Dodge Ram 1500 V8** (the one CC BY recording, credited in the game)

| Layer | rpm | Recording |
| --- | --- | --- |
| start, idle | 795 (idle) | Ram |
| on | 1470 | Ram, cruising |
| pull | 1575 | Ram, pulling hard |
| coast | 1470 | Ram cruise, low-passed at 1300 Hz |

**Highway: inline-six semi tractor**

| Layer | rpm | Recording |
| --- | --- | --- |
| start / stop | | Ford LTL 9000 |
| idle | 700 | Deep semi idle (`fs-637916`) |
| on | 860, 1070 | Mack semi running (`fs-451373`) |
| on | 1360 | Mack/Peterbilt delivery truck (`fs-637922`) |
| pull | 1040 | Mack pulling from a stop sign (`fs-669417`) |
| pull | 1720 | Mack/Peterbilt rev (`fs-637922`) |
| coast | 1320 | Mack semi, with +8 dB added below 220 Hz (`fs-453635`) |

**Heavy-duty: vocational diesels**

| Layer | rpm | Recording |
| --- | --- | --- |
| start | | Ram 5.9 Cummins |
| idle | 856 | Recovery truck idle, with +9 dB added below 220 Hz (`wrecker-diesel`) |
| on | 1140 | Large construction truck (`fs-870859`) |
| on | 1690 | Big diesel on a hill (`fs-637914`) |
| pull | 880, 1710 | Dump trucks (`fs-637507`) |
| pull | ~1500 | Old truck working hard (`fs-487152`) |
| coast | 1700 | Big diesel on a hill, as it recedes (`fs-637914`) |

**Offroad: military diesels**

| Layer | rpm | Recording |
| --- | --- | --- |
| start | | Diesel truck on dirt (`fs-406885`) |
| idle | 912 | Military vehicle humming (`fs-182793`) |
| on | ~1216 | Old truck, with added lows (`fs-438083`) |
| on | ~1495 | Humvee in a convoy (`fs-160357`), the main driving sound, rumble cut below 130 Hz, `gain` 1.6 |
| coast | ~1216 | Old truck, muffled (`fs-438083`) |

Offroad has no `pull` layers: the short hard-revving APC clips looped and sounded strained. Its layers play close to natural speed.

**Heavy: earthmovers, pitched down to 0.86**

| Layer | rpm | Recording |
| --- | --- | --- |
| start | | Big diesel water truck, pitched to 0.85 (`fs-406886`) |
| idle | 1023 | Bulldozer idling (`fs-389584`) |
| on | 1135 | Bulldozer under steady load (`fs-389584`) |
| on | 1860 | Second bulldozer (`fs-165199`) |
| pull | 1814 | Second bulldozer, working (`fs-165199`) |
| pull | ~2209 | Volvo wheel loader revving (`fs-404968`) |
| coast | ~2093 | Excavator (`fs-187563`) |
| sub | 1181 | Large generator, for rumble (`fs-606933`) |

Applies to all heavy trucks, plus the Mega Tanker and Colossus Wrecker.

## What the engine listens to

`voice.set()` in `engine.js` reads these from the physics every frame:

| Input | Comes from | Used for |
| --- | --- | --- |
| Pedal | `st.throttle`: your pedal, rising at the car's `throttleRise` per second (1.8 on the Prime Mover, so about 0.55 s to full), falling at 3 per second | Effort, revs, shift points |
| Demand 0–1 | `engineTelemetry()`: torque the wheels are taking ÷ torque available | How hard the engine sounds |
| Speed | `st.speed` | Revs through the gears |
| Wheel slip | `st.slip`, in m/s, the worst wheel | Revs racing |
| Gear | `ctl.gear` | H shifts, L and R don't |

Keyboard and a finger on a touch screen are always full pedal. Only a gamepad trigger, a mouse drag or a pen gives part throttle.

From those it works out **load**, the most important number in the mix:

```
load = pedal × (0.35 + 0.65 × demand)
```

During a shift, load drops to `pedal × 0.12`, so the note dips.

## How the revs move (`stepRevs`)

Revs run from 0 (idle) to 1 (top). To real rpm: `idleRpm + revs × (governedRpm − idleRpm)`.

```
wheel  = speed ÷ top speed of the current gear
race   = (1 − stall) × (slip eased from 1 m/s to 5 m/s)
free   = stall × pedal^0.7  +  race × pedal         (0 while shifting or pedal up)
target = the larger of wheel and free, at most 1.04

climb limit = revUp × (0.35 + 0.65 × pedal)
fall limit  = revDown, or 3 × revDown while shifting
```

Each frame revs move toward the target at `7 × the gap`, held to those limits.

**Choosing a gear:** gears follow speed smoothed over about 0.5 s, so one bump can't flip them.

```
upshift   when smoothed speed ÷ this gear's top  > 0.62 + 0.33 × pedal      (not with the pedal up)
downshift when smoothed speed ÷ lower gear's top < 0.45
no shift within holdS seconds of the last one
```

Below 3 km/h (smoothed) it drops straight to first with no clunk, so a hard stop doesn't downshift during the next pull-away.
Moving the lever from L or R to H lands in the gear that fits the current speed, also with no sound-gear shift.

So there are three things that can set the revs:

- **Launching:** `free` wins, and revs hold at the stall (0.28 on heavy).
- **Rolling:** `wheel` wins, so revs climb with speed and drop at each shift.
- **Wheelspin:** `race` adds on top, so the engine screams toward the top without the truck moving.

## The mix

`engineMix()` turns revs and load into a volume for each layer:

| Load | What you hear |
| --- | --- |
| 0 | Off-load layers only: `idle` near idle revs, moving to `coast` by revs 0.24 |
| 0.03 → 0.30 | Fades from off-load to on-load |
| 0.30 → 0.50 | All `on` |
| 0.50 → 0.85 | Fades from `on` to `pull` |
| 0.85 → 1 | All `pull` |

Within `on` or `pull`, the two recordings nearest the current rpm crossfade. Below the lowest one or above the highest, that one
plays alone.

| Output | Formula | Effect |
| --- | --- | --- |
| Volume | `0.78 + 0.42 × load` | About 3.7 dB louder from idle to full effort |
| Brightness | `cutoff × (0.42 + 0.40 × load + 0.18 × revs)` | Opens up as you push; the main "muffled off-gas, open on-gas" feeling |
| Sub | `0.55 + 0.45 × load` | Heavy class only |

The start and stop clips skip the brightness filter.

## What the gas pedal does

More pedal changes six things at once:

1. **Load**, which picks the layers, using the formula above.
2. **Volume**, up to about +3.7 dB.
3. **Brightness.**
4. **Launch revs:** `stall × pedal^0.7`, so half pedal gives 62% of the stall revs.
5. **Rev climb speed:** from 35% of `revUp` at a touch to 100% at full.
6. **Shift point:** upshifts at `0.62 + 0.33 × pedal` of a gear's range, so 95% at full pedal and about 70% at quarter pedal, with at least `holdS` between shifts.

**Pedal alone can't always reach `pull`.** With demand 0.2, full pedal gives load 0.48, so you stay on `on`. The `pull` layers
need the truck to actually be working: demand over about 0.25 to start and over about 0.77 to fully arrive.

**Lifting off** drops load to 0 right away, whatever the revs. You get `coast` at speed and `idle` when slow, the
filter closes and the volume falls.

## What H, L and R do

| | H | L | R |
| --- | --- | --- | --- |
| Sound gears | The class's `gears` list | One | One |
| Shifts | Yes, with clunk and dip | None | None |
| Top of the rev range | Each gear's km/h | That truck's physical L top speed | That truck's physical R top speed |
| Extra sounds | | | Back-up alarm, except scouts |

The L and R top speed is worked out per truck: `governedRpm ÷ gear ratio × tire radius`. On a Prime Mover that's 16.4 km/h
in L, 21 km/h in R and 38.9 km/h in H. So at the same speed, L revs far higher, and it never gets relief from a shift.
The class `gears` list applies only to H, while L and R follow `car.json`. A speed tune in the garage that changes those
ratios changes the L and R sound too, but not H.

Pressing the gear button plays `gear-clunk` twice, 130 ms apart: the first at 0.60 and the second at 0.30, lower in L than H.

**L also starts out sounding easier.** The extra gearing means the engine has torque to spare at first, so demand starts low.
In the table below, L at 1 s has demand 0.24 where H has 0.83. It sounds calm, then fills in as it nears its top speed.

## Worked example: a heavy truck

Measured on a Prime Mover driving the trail from near its start, over mixed dirt and rock, so wheel slip is part of these numbers. "Layers" lists anything above 0.15 volume. The physics RPM is included to
show how little it relates to the sound.

**Full pedal in H** (shifts at 1.8 and 5.3 s)

| Time | km/h | Physics RPM | Sound RPM | Gear | Demand | Load | Layers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 s | 12 | 1204 | 1419 | 1 | 0.83 | 0.89 | pull1 |
| 2 s | 22 | 1331 | 1689 | 2 | 0.67 | 0.78 | pull1 |
| 4 s | 30 | 1978 | 1939 | 2 | 1.00 | 1.00 | pull1, pull2 |
| 8 s | 26 | 2102 | 1613 | 3 | 0.86 | 0.91 | pull1 |
| 12 s | 29 | 2014 | 1561 | 3 | 0.92 | 0.95 | pull1 |

**Half pedal in H** (one shift, at 2.2 s): stays on `on1` and `on2`, one step quieter and darker

| Time | km/h | Sound RPM | Gear | Load | Brightness | Layers |
| --- | --- | --- | --- | --- | --- | --- |
| 1 s | 8 | 1284 | 1 | 0.45 | 3215 Hz | on1, on2 |
| 4 s | 16 | 1499 | 2 | 0.48 | 3459 Hz | on1, on2 |
| 12 s | 15 | 1449 | 2 | 0.50 | 3458 Hz | on1, on2 |

**Full pedal in L**: no shifts, the climb is long and smooth

| Time | km/h | Sound RPM | Demand | Load | Layers |
| --- | --- | --- | --- | --- | --- |
| 1 s | 6 | 1224 | 0.24 | 0.51 | on1, on2 |
| 2 s | 9 | 1452 | 0.39 | 0.60 | on1, on2, pull1 |
| 4 s | 15 | 1742 | 0.68 | 0.79 | pull1 |
| 8 s | 14 | 1808 | 1.00 | 1.00 | pull1 |

## Every other sound

All of it is in `api.update` and the small functions above it in `vehicle-audio.js`. Beds are continuous and one-shots fire once.
Only the driven truck makes these sounds, apart from the engine, which every truck on the trail has.

### Continuous

| Sound | Plays when | Volume | Pitch |
| --- | --- | --- | --- |
| `gravel`, `dirt`, `rocks` | Rolling on that surface; wood uses `dirt` | `roll × 0.55`; `roll` = `min(1, m/s ÷ 4) × min(1.3, 0.6 + 0.3 × log10(1 + tonnes))` | Rises with speed, lower on big tires |
| `mud` | On mud | larger of `roll × 0.55` and `min(0.8, slip × 0.18 + roll × 0.4)` | `0.9 + min(0.3, slip × 0.05)` |
| `mud-spin` | In mud with slip over 0.5 m/s | `min(0.85, (slip − 0.5) × 0.28)` | `0.85 + min(0.35, slip × 0.06)` |
| `rattle-bed` | Out of water | `min(0.75, (min(1, m/s ÷ 7) × 0.32 + rough × 0.55) × surface)`; rock 1, gravel 0.75, wood 0.7, dirt 0.55, mud 0.35 | `0.85 + m/s × 0.03` |
| `wade`, `water-churn` | In water | By depth and speed | Rises with speed |
| `winch-motor`, `cable-strain` | Any truck's cable under load | 0.32 and 0.55 | Fixed |
| `fuel-pump`, `fuel-flow` | While refuelling | 0.42 and 0.40 | Fixed |
| `forest`, `frogs` | The season's zones | `zone weight × 0.6` | Fixed |

### One-shots

| Sound | Plays when | Volume |
| --- | --- | --- |
| `gear-clunk` | Sound-gear shift (0.38); 4×4 and DIFF (0.40 on, 0.32 off); H, L, R button | Lower pitch over 30 t |
| `air-pop` | Each shift on air-brake trucks | 0.14 |
| `underbody` + load shake | Crushing a rock | Scales with rock size |
| Load sound, by class | A tire touches a log, pipe or rock while moving. Change them in `HIT_SOUNDS` at the top of `vehicle-audio.js` | `gain × min(1, 0.55 + m/s × 0.12)` |
| `cargo-heavy-chains` | Highway, at most every 0.7 s | `gain` 0.65 |
| `rattle` | Heavy duty, at most every 0.6 s | `gain` 0.7 |
| `cargo-chains` | Off-road, at most every 0.6 s | `gain` 0.7 |
| `cable-strain`, 2.5 s burst | Heavy, at most every 1.5 s | `gain` 0.8 |
| `cargo-light`, `cargo-chains` | Load shake under 8 t | |
| `rattle`, `cargo-heavy-chains` | Load shake, other trucks from 8 t | |
| `rattle`, `cable-strain` | Load shake, heavy class including its service trucks | |
| `hydraulic-brake` | Hard braking above 3 m/s, air-brake trucks | `min(0.7, 0.2 + m/s × 0.05)` |
| `air-release`, `air-burst` | Stopped on the brakes, then released; also the handbrake on air-brake trucks | 0.55 and 0.30 (handbrake 0.70 and 0.50) |
| `handbrake-on`, `handbrake-off` | Handbrake on scouts | 0.80 |
| `hook-clank`, chain | Winch on or off; hose on or off | 0.85 on, 0.60 off; hose 0.50 |
| `splash`, `splash-small` | Entering water | By impact |
| `crow`, `crow-far` | Crow zones, every 2.5–9.5 s | Random, panned |

Only two sounds are synthesized: the ignition key tick (`api.key`) and the back-up alarm (1040 Hz, level 0.035, in `api.start`).

### Other trucks and distance

A truck you aren't driving plays at `0.8 ÷ (1 + metres ÷ 10)`, and its brightness is multiplied by `1 ÷ (1 + metres ÷ 18)`.

### The final volume

```
layer volume × engine volume (0.78–1.20) × distance × Engines slider (default 0.8)
  × compressor (−12 dB threshold, 3:1) × Master slider (default 0.8) × 0.9
```

Effects go the same way through the Effects slider. Ambience skips the compressor.

## Tuning cookbook

`[rebuild]` means rebuild the bank. `[all classes]` means the code is shared, so it changes every class.

**Character of one class**

| I want | Change |
| --- | --- |
| Heavy trucks deeper | Lower `pitch` in `engines.heavy` `[rebuild]`. Start clip has its own `start.pitch` |
| More rumble on heavy | Increase `sub` in `engineMix` (`0.55 + load × 0.45`) `[all classes, but only heavy has a sub]` |
| Rumble on another class | Add a `sub` block to that class in `sounds.json` `[rebuild]` |
| A different recording for a layer | Change `source` and `regions`, plus `hz` or `rpm` `[rebuild]` |
| A thin layer fuller | Add `"lowShelf": [220, 6]` (Hz, dB) to the layer `[rebuild]` |
| One layer louder or quieter | Its `gain` in `sounds.json`, for example the offroad Humvee at 1.6 `[rebuild]` |
| A class brighter or darker | `cutoff` `[rebuild]` |
| A class to feel lighter or heavier | `revUp`, `revDown`, `shiftS` `[rebuild]` |
| A shutdown clip on another class | Add a `stop` block, as on highway `[rebuild]` |

**Gas and effort**

| I want | Change |
| --- | --- |
| Gas to change the sound more | Widen `level: 0.78 + load * 0.42` and the `cutoff` line in `engineMix` `[all classes]` |
| `pull` to arrive sooner | Lower both numbers in `ease(0.5, 0.85, load)` `[all classes]` |
| Full pedal to always sound hard, even with no resistance | Raise `0.35` in `engineLoad` `[all classes]` |
| Higher launch revs | `stall` `[rebuild]` |
| A faster reaction to the pedal | `revUp` `[rebuild]`, or `tau` in `voice.set` `[all classes]` |
| More or less scream on wheelspin | `ease(1, 5, slip)` in `stepRevs`: lower numbers race sooner `[all classes]` |

**Gears**

| I want | Change |
| --- | --- |
| Fewer or more shifts in H | Edit the class's `gears` list `[rebuild]`. Too short and revs sit on the limiter, so size them to how fast the class really accelerates |
| More time between shifts | `holdS` `[rebuild]` |
| Shifts later or earlier | `upAt = 0.62 + 0.33 * pedal` in `stepRevs` `[all classes]` |
| Less hunting up and down | Lower `0.45` in the downshift line of `stepRevs`, or raise `holdS` |
| A louder or quieter shift | `gear-clunk` and `air-pop` values in `engineEvent` `[all classes]` |
| A deeper dip on a shift | `pedal * 0.12` in `voice.set` `[all classes]` |
| L to rev differently, sound only | The `tops` argument in `voice.set` `[all classes]`. Avoid `gears.L` in `car.json`, because that changes the physics |

**Effects and the rest**

| I want | Change |
| --- | --- |
| Louder or quieter effect | Its number in `api.update` or its function, per the tables above |
| A different effect recording | Its entry in `sounds.json` `effects` `[rebuild]` |
| Engines louder against effects, for everyone | `DEFAULT_VOLUMES` in `vehicle-audio.js` (saved browser values win) |
| Parked trucks quieter or farther | The `setLevel` line in `api.update` |
| One truck on another class's engine | `"audio": { "engine": "heavy" }` in its `car.json` |
| Crows or frogs elsewhere | `ambience` in `season.json` |

### Recipe fields (`sounds.json`)

| Field | On | Meaning |
| --- | --- | --- |
| `source` | all | Recording ID from `sources.json` |
| `regions` / `region` | all | Seconds to cut, as `[start, end]`; several are joined by crossfades |
| `hz` | engine layers | Firing frequency measured there; rpm = `hz × 120 ÷ cylinders` |
| `rpm` | engine layers | Use when `hz` can't be measured |
| `flatten` | engine layers | `[low, high]` Hz search band. Follows a rev sweep and resamples it to `hz`, so it doesn't rev by itself |
| `gain` | engine layers | Makes one layer louder or quieter than the others, 1 is normal |
| `leveling` | engine layers | 0–1, how much loudness swings are evened out (default 0.65) |
| `highpass`, `lowpass`, `band` | all | Filters, in Hz |
| `lowShelf` | all | `[Hz, dB]`, adds lows |
| `pitch` | start / stop | Pitches that clip only |
| `kind` | effects | `clip` one cut; `loop` joined steady regions; `texture` smooth bed from many small grains (`seconds`, `grain`, `density`); `oneshots` the `count` loudest events of `len` seconds |

## Known weak spots

Found while measuring for this guide. None are fixed yet, and I can't judge any of them by ear.

1. **Shifts can still reverse on rough ground.** They're always at least `holdS` apart, but at light pedal on broken ground, speed swings can still
   cause an upshift followed by a downshift a few seconds later. Raise `holdS` if it bothers you.
2. **Heavy trucks lug on a slowed-down recording.** The lowest heavy `pull` is 1814 rpm, but trucks lug around 1170, so it plays at about 0.64 speed
   (the limit is 0.62, and below about 1125 rpm its pitch stops following the revs). It stays in tune but may sound dragged. A heavy `pull` recorded at low
   revs would fix it. The Scout's single `on` and `pull` layers have the same limit near idle.
3. **Heavy spends most of its time on one layer.** At full pedal in H, `pull1` is the main layer throughout. More anchors would add variety.
4. **Short layers repeat sooner.** `pull2` on heavy and `pull1` on highway are about 3–6 s. They rarely hold for long, but check them
   if you hear repetition.
5. **Estimated rpms.** Values marked `~` above aren't measured, so they may be slightly out of tune against their neighbours.
6. **All classes load at start.** Every clip is decoded when sound starts, even for classes not on the trail. That costs memory on phones.

## Files at a glance

| File | Role |
| --- | --- |
| [`sounds.json`](sounds.json) | The recipe and class settings. **Most tuning starts here** |
| [`sources.json`](sources.json) | Credit, licence, URL and hash of every recording |
| [`bank/`](bank/) | Generated. Don't edit, except for a quick trial in `bank.json` |
| [`README.md`](README.md) | Shorter overview and how to add a sound |
| [`tools/prepare-audio.py`](../../tools/prepare-audio.py) | Builds the bank |
| [`tools/audio-preview.js`](../../tools/audio-preview.js) | Renders previews through the game's code |
| [`tools/lib/content.js`](../../tools/lib/content.js) | Picks each truck's engine and embeds the bank |
| [`src/audio/engine.js`](../../src/audio/engine.js) | Engine: `engineLoad`, `stepRevs`, `engineMix`, `createEngineVoice` |
| [`src/audio/vehicle-audio.js`](../../src/audio/vehicle-audio.js) | Effects, ambience and volume sliders |
| [`src/audio/loop-player.js`](../../src/audio/loop-player.js) | Seamless looping, using random overlapping grains |
| [`tests/audio.test.js`](../../tests/audio.test.js) | Fails on unused clips, wrong engines, or gears and mix that break |
