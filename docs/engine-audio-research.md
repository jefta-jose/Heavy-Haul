# Heavy truck engine audio: research and implementation

Research performed 28 October 2026 after the random-recording and short fixed-loop implementations were rejected in listening.

## Findings from primary sources

- [Saber truck sound documentation](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truck/truckdata/sounds/) exposes separate idle, low, high, heavy-load, acceleration, rev, start, stop, transition and turbo sound slots. This describes authoring inputs; it does **not** disclose SnowRunner's runtime engine simulation or exact mixing algorithms.
- [SCS truck engine documentation](https://modding.scssoft.com/wiki/Documentation/Engine/Sound/TruckEngine) treats RPM, load, engine brake and lifecycle as separate controls and discourages combining different engine banks. This is a useful model for a responsive truck engine, rather than a throttle-triggered prerecorded acceleration.
- [SCS recording metadata](https://modding.scssoft.com/index.php?title=Documentation/Engine/Units/sound_engine_data) defines a recording's reference RPM and overlapping playback RPM ranges. A pitch multiplier must relate target RPM to the recording's reference RPM.
- [Crankcase Audio's explanation of REV](https://www.crankcaseaudio.com/) describes resynthesis that can progress through an acceleration at the game's rate or hold a steady operating point. This explains why replaying an acceleration recording at normal speed cannot track a player's pedal.
- [REV quickstart](https://media.gowwise.com/documents/library/CrankcaseAudioREV_Quickstart_Guide_en.pdf) explains harmonic/cycle tracking and warns that harmonic identification can be wrong by an octave and contaminated by road/wind noise. RPM estimates require validation; energy alone cannot identify physical engine load.

## Problems found in this project

1. Random multi-second excerpts replayed the original driver's rev changes.
2. The replacement fixed 1.42-second loop removed those sweeps but repeated audibly and used an arbitrary narrow pitch range.
3. Running layers for a class combined unrelated engines, causing character changes between idle, driving and pulling.
4. Slope alone was used as a load estimate, ignoring mud, cargo, rolling resistance and wheel traction.
5. Keyboard/touch input and main-loop assignment were binary. Partial pedal pressure never reached the simulation.
6. Earlier automated checks proved files decoded and rendered, not that engine response sounded convincing.

## Implemented replacement

The approved scout's original audio path stays in use. The four diesel classes use new WAV grain atlases derived from existing, credited source recordings. One running-engine recording supplies each class. Each grain records source time, estimated RPM, relative-energy load category and harmonic-confidence score. Original sources and their hashes stay intact.

Playback selects nearby RPM/load excerpts, uses target RPM divided by the excerpt's estimated RPM for pitch, and overlaps windowed grains. Combustion cadence follows requested RPM. Non-repeating excerpt/cycle selection varies texture without autonomous rev sweeps. It does not replay a short fixed loop. Pedal position controls load response and filter brightness independently from RPM. Runtime load uses wheel-joint reaction torque relative to commanded drivetrain torque; no vehicle physics parameters were changed. Startup uses the existing recorded starter, and shutdown runs the engine cadence down rather than playing a different truck's shutdown.

Gamepad triggers provide analog pedals. Pointer pedals remain full on initial press, with a downward drag reducing pressure and an upward drag increasing it; pressure-sensitive pens use their pressure value. Keyboard keys remain full/on or released/off. Ordinary touch screens cannot measure actual finger force. The main loop now preserves numeric pedal values.

`tools/engine_atlas.py` builds the atlases and is called by `tools/prepare-audio.py`, so a normal audio rebuild retains this design. `tools/audio-preview.js` supports explicit RPM ramps, load controls and separate response previews.

## Material limitations

These are field recordings, **not calibrated on-/off-load dyno recordings**. Reference RPM comes from an assumed cylinder count and dominant combustion-band harmonic. Octave errors and machinery/background contamination are possible. The load categories are recording-energy proxies, not measured torque states. Highway material spans only about 750–1200 estimated source RPM; playing higher revs requires more transposition. Heavy-duty material has limited low-idle coverage. Existing starter recordings can still have a different engine character from the running recording.

The implementation fixes the parameter/control architecture and prepares replaceable assets. It does not establish SnowRunner-equivalent or production-quality realism. A calibrated recording set for each engine, with known RPM and on/off-load sweeps plus matched startup/shutdown, remains the strongest asset improvement. No proprietary game audio was copied and no paid recordings were purchased.

## Verification and listening

Unit tests check analog controls, load feedback, frame selection, asset bounds and attribution. Browser checks cover decoding and game integration. Offline Web Audio renders exercise pedal/load changes at identical RPM, lift-off, RPM ramps, steady pedal, shifts and shutdown. Response previews and numeric reports are written under `output/audio/response-*`. Rendering, RMS and continuity checks cannot substitute for listening approval; treat these as reviewable candidates until the player judges them in-game.


Validation results for this revision: `npm test`, `npm run test:route`, `npm run test:browser`, and the final `node --test tests/audio.test.js` passed. `node tools/audio-response.js` passed its controlled rendered-response assertions for all four diesels. Full/light pedal RMS ratios at the same RPM were 1.57 highway, 1.49 heavy-duty, 1.47 off-road and 1.51 heavy. Additional load raised RMS by approximately 23–31%; shutdown tails were zero. Raw WAV peaks stayed below 0.62. These measurements establish responsive, unclipped output, not listening acceptance.

Reproduce the listening comparison with `node tools/audio-response.js`; open `output/audio/response-index.html`. The phase timings are printed on that page. Raw measurements are in `output/audio/response-checks.json`.


## Off-road sound revision

Ice Breaker and its off-road class now use the existing CC0 Humvee convoy recording (`fs-160357`) instead of the APC pull-away recording (`fs-405086`). The source comparison showed substantially steadier recording level. This profile uses a 2.8 kHz source low-pass, stricter within-grain stability selection, ten combustion cycles per grain instead of six, a 2.6 kHz runtime cutoff, equal-power crossfades, and recording leveling before pedal/load volume. These settings are stored on this class's atlas; other classes retain their defaults. Pedal/RPM/load mapping stays in place. Compare `output/audio/response-offroad-before.wav` with `output/audio/offroad-smooth-offroad.wav`.
