# Recorded truck engines

The six playable vehicles use six different real field recordings. Engines are played as Web Audio buffer loops; there is no combustion synthesizer, AudioWorklet or ScriptProcessor engine fallback.

| Vehicle | Recording and author |
| --- | --- |
| Swamp Scout | [F150 V8 start and idle](https://freesound.org/people/Therancher01/sounds/610773/) — Therancher01 |
| Mesa Coyote | [Ram 5.9 Cummins start and idle](https://freesound.org/people/Therancher01/sounds/610771/) — Therancher01 |
| Fuel Runner | [Delivery-truck start and idle](https://freesound.org/people/kyles/sounds/455737/) — kyles |
| Breakdown Wrecker | [Diesel-truck idle](https://freesound.org/people/ibirdfilm/sounds/128160/) — ibirdfilm |
| Ice Breaker | [Close semi-truck idle](https://freesound.org/people/kyles/sounds/637916/) — kyles |
| Mountain Mover | [Heavy construction engine loops](https://freesound.org/people/qubodup/sounds/187564/) — qubodup |

All six source pages declare [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). `sources.json` records each author, title, source page, public high-quality MP3 rendition URL and downloaded-file SHA-256. Those MP3s are retained in `source/`; they are not the original lossless uploads. No SnowRunner game audio is included. These are representative engine recordings, not recordings of the fictional trucks' exact engine specifications.

## Preparation and playback

`tools/prepare-audio.py` trims steady sections, folds 160 ms across each loop boundary, removes subsonic rumble and limits the high end, then level-matches within 0.7 peak headroom. `audio.json` records every clip's source, original time interval, duration and levels. Runtime clips are mono 24 kHz PCM WAV for consistent offline decoding, totaling about 2.94 MB.

Each voice crossfades two different sections of its own recording: a quiet idle and a fuller running layer. Both are based on stationary recordings rather than a full multi-RPM dyno session. RPM changes playback speed within a restrained range; throttle changes the blend and filter opening. Do not promise independently recorded high-RPM or on-load samples where the source only contains idle. Start clips use the same vehicle where available; trucks without a recorded start share the real Cummins cranking excerpt. Engine-off fades the running loops to silence.

`src/audio/engine-dsp.js` retains its historical filename but now contains recording selection, mixing and the Web Audio voice. It maps each current car ID to a distinct source. Only `crankS` and `backupAlarm` are used from legacy `car.json → audio`; the old cylinder, exhaust, turbo, jake and gain synthesis settings no longer create sound. A future unassigned vehicle falls back to a suitable recorded class, so give a new playable vehicle an explicit source when distinct sound is required.

`src/audio/vehicle-audio.js` keeps the existing public interface and saved master/engine/effects/mute controls. Parked engines remain positional. Surface, suspension and UI sounds are still procedural, mixed more quietly; the continuous synthetic climb-strain and reverse-whine layers are removed. The back-up alarm remains.

`tools/lib/content.js` embeds the 18 runtime clips in the single-file HTML build. Playback needs no network, account, API key, external sound library or audio-processing callbacks. Recordings decode once after a user gesture. Decode failure is reported in `audio.status()` rather than falling back to a harsh synthetic engine.

## Rebuild and check

```sh
uv run --with numpy --with scipy --with imageio-ffmpeg python tools/prepare-audio.py
npm run audio:preview
npm test
npm run test:browser
```

The preview command renders the actual recorded-engine Web Audio graph, including its filters and smoothing, to `output/audio/recorded-<car-id>.wav`. Open `output/audio/index.html` to compare them. It checks audible idle, louder loaded running, headroom and silent shutdown; `recorded-report.json` stores levels. These checks do not establish subjective sound quality: audition the previews and the game on speakers and headphones before approving a new recording or mix.

Unit tests check distinct source assignments, downloaded-file hashes, usable PCM levels and loop joins. Browser tests check all clips decode offline and preserve engine/volume/service controls. When changing sound, preserve the engine state machine and physics unless the task explicitly requires changing them.
