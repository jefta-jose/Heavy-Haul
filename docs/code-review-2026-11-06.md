# Heavy Haul code review and work plan (2026-11-06)

A full review before the payment work: dependencies, logic, mobile performance, security, dead code
and asset usage. The first part is a **work brief for Codex**, split into what to do now (the game is
still being tested locally and features are still being added) and what to leave until the store
release. The findings behind each task follow in the appendix.

---

# Part 1: Brief for Codex

## Ground rules for every task

- Read `CLAUDE.md`, `README.md` and `docs/game-design.md` first. Their rules win over this document.
- **Do only the phases marked NOW.** Phase 3 and 4 tasks are listed so they are not forgotten; do not
  start them until the user says the game is going to the stores.
- One task per commit, with the task id in the message (for example `N1: fix wallet reset at zero`),
  so any task can be reverted on its own.
- **Physics is deterministic.** A removal or refactor must leave trajectories unchanged. Run
  `npm test` and `npm run test:route` before and after and compare; anything visible also needs
  `npm run test:browser` and a look at `output/captures/`. Run `npm run check` before calling a phase done.
- Never overwrite or delete PNG masters (`assets/**/source/*.png`). Runtime files are `art/*.webp`
  from `npm run art:encode`.
- Gameplay numbers belong in `src/game-config.js`, one per line.
- Other sessions may be editing the tree at the same time: do not revert changes you did not make.
- Keep the game fully playable for local testing after every commit: test coins, every truck open,
  the debug APK from CI and the dev server all keep working.

## Phase 1 (NOW): quick fixes and dead-code removal

Safe, small, no effect on how the game plays.

| Id | Task | Done when |
|---|---|---|
| N1 | **Wallet reset bug.** [src/game/wallet.js:6](../src/game/wallet.js) uses `if (saved > 0)`, so a saved balance of exactly 0 is replaced by `STARTING_COINS` on the next launch. Read the key, and if it exists (`!== null`) accept any finite number ≥ 0. | Spending to 0, reloading, still shows 0. Add a unit test. |
| N2 | **Test mode switch.** Keep the test economy for local play, but behind one flag: add `export const TEST_MODE = true;` to `game-config.js`, and give `STARTING_COINS` / `STARTING_RANK` a test value and a release value (`TEST_MODE ? 20000000 : <release>`; release values: coins 0, rank 1, unless the user picks others). Do **not** turn test mode off. | Flipping `TEST_MODE` to `false` gives a fresh player rank 1 with only the free starters owned; it stays `true` in the commit. |
| N3 | **Input:** in [src/game/input.js:42-43](../src/game/input.js) add `!e.repeat` to Q and E, and in `main.js` make `setMode` ignore calls unless `session.state === 'play'`. | Holding Q toggles AWD once; Q in the garage does nothing. |
| N4 | **Small cleanups in main.js:** remove the unused `const far` (line 128), drop the ignored argument to `roleName`, and remove the `loader.set(...)` calls and the progress arithmetic in `launchProgress` (`loader.set` is a no-op). Keep the readiness and 20 s timeout logic. Remove `set()` from loader.js. | Launch, DRIVE and back-to-garage screens behave as before. |
| N5 | **Comments that no longer match:** particles.js says "Pooled" (it is not; fix the comment or pool them, see P6); session.js:120's "30 s grace" comment belongs on the fuel path (`emptyT = -30`), not the rollover line. | |
| N6 | **`terrain.js:215`:** `trail.waters.map` → handled by the water removal in N8; if N8 is skipped, use `(trail.waters ?? [])`. | |
| N7 | **Remove bridges.** No season has any (`trail.bridges` is `[]`). Delete `src/physics/bridges.js` and `src/render/layers/bridges.js`, and their uses: simulation.js lines 7, 40, 71, 403 and the `driveH` override at 236 (pass `terrain`); terrain.js lines 120, 201-207 and `driveH` / `bridgeAt` / `bridges` in the return at 222; obstacles.js:26 (bridge check in `reserved`); renderer.js lines 9, 26, 52, 55; sprite-cache.js `bridgePlank` / `bridgeFrame` / `bridgeSteelFrame` keys (45-51) and the `bridgeWood` pattern (68); mud.js:40 `bridgeAt?.` check and the "bridges none" comment; hud.js:213-215 bridge branch (keep "Log crossing"); game.css `.chip.bridge` (~229, ~3989) and `[data-surf="bridge"]` (~3983); the bridge assertion in tests/terrain.test.js:101-104. Keep the `wood` surface: logs use it. | `grep -ri bridge src tests` finds nothing; routes identical before and after. |
| N8 | **Remove open water.** No season has any (`trail.waters` is `[]`). Delete `drawPools`, `drawWaterBack`, `drawWater` from water.js and their calls in renderer.js (7, 52, 56); delete the buoyancy and wading loop in simulation.js (342-359) and `st.inWater` with it; delete `inWater` and the water-level block in terrain.js (118-119, 214-219); drop the 'River crossing' label in hud.js:214 and the `st.inWater` check in vehicle-audio.js:234; update the waters assertion in terrain.test.js. **Keep** `waterAt`'s heavy-mud branch and `drawRipples` (bog splashes and ripples), and keep the `wade` / `water-churn` sound beds (they follow `renderer.water`, which the bogs drive). Move what is left of water.js into mud.js or rename it `mud-pools.js`. | Bogs still splash, ripple and make the wade sound; routes identical. |
| N9 | **Delete dead files:** `tests/_probe.mjs`; `android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java`; `android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java`; `tools/art/slice-garage.py` (it reads `assets/garage-v2`, which no longer exists). | CI Android build still passes. |
| N10 | **Delete unused icons:** `assets/hud/icons/distance.svg`, `engine.svg`, `handbrake.svg`, `load-condition.svg`, `garage-nitro.svg` (no nitro power; it is inlined into every page for nothing). | Garage and HUD icons all still show. |
| N11 | **Unused CSS:** remove `#drivenTxt`, `#fuelTxt`, `.card-biomes`, `.card-stats`, `.hbrake`, `.mapcard`, `.sname`, `.srow`, `.ssub`, `.sval`, `.stationnext`, `.tripline` after confirming with grep that nothing (HTML, JS, template strings) uses them. | Browser captures unchanged. |
| N12 | **Unused exports:** drop `export` from names used only in their own file (`grossTonnes`, `missionXp`, `MAX_RANK`, `rankProgress`, `FRAMING`, `TIRE_CATEGORY`, `setWheelMass`, `setBodyMass`, `applyBumpStops`, `springFor`, `DEFAULT_VOLUMES`) unless a test or tool imports them. Remove `interp.reset` and `loader.kept`. | `npm test` passes. |
| N13 | **Move stray gameplay numbers** into `game-config.js`: `GLOBAL_FUEL_BURN_MULTIPLIER`, `WINCH_REACH`, `CROSS_CLASS_PULL`, `NEVER_STUCK_MU`, `SPAWN_REACH` (simulation.js). Same values. | Routes identical. |
| N14 | **esbuild 0.24.0 → 0.28.x**, pinned exactly. Fixes the `npm audit` advisory (not exploitable here: it affects `serve`, which is unused). | `npm run build` and `npm run android:web` work; `npm audit` clean. |
| N15 | **Docs:** CLAUDE.md says the heavy class was deleted and is planned; all 105 roster trucks are playable (commit 7e116ab). Update that paragraph and the "Size cap" paragraph. Fix the `.gitignore` typo "sogning". | |

## Phase 2 (NOW): mobile performance

These help local testing on the phone too (smaller APK, faster installs, less memory). Each needs a
look on a real phone or `npm run test:browser` plus the captures.

| Id | Task | Done when |
|---|---|---|
| P1 | **Smaller runtime wheels (saves ~50 MB).** `art/wheel.webp` is encoded at the master's 1254 px but drawn at 60–200 px. Encode it at 512 px (`encode-webp.py` already supports a per-entry `width`). The rig's `wheelPivot` and `wheelArtRadius` are in *source* pixels, and vehicle.js:35/56 and sprite-cache.js:100 multiply by the decoded image's own size, so: have the encoder record `art.wheel.sourceSize: [w, h]` in car.json when it resizes, and make the renderer draw the wheel at `sourceSize * s` (and scale its cache factor by `sourceSize[0] / img.width`). `preview-car.py` reads the PNG and needs no change. Do not touch the PNG masters or the measured pivots. Encode only cars: `npm run art:encode -- --cars <ids> --method 2`. | Every wheel sits exactly where it did (compare captures before and after for three cars of different classes); shipped wheel total under 15 MB. |
| P2 | **Smaller masters (saves 30–45 MB).** `art/master.webp` (47.8 MB in total) is only the garage picture. Encode it at about 1000 px wide with the same `width` option; the garage scales it anyway. | Garage truck looks the same on desktop and phone. |
| P3 | **Stream the music.** music.js decodes a whole 2-minute MP3 (about 40 MB of PCM) on every garage↔road switch. Play it through an `<audio loop>` element connected with `createMediaElementSource` for volume and fades; keep the per-track `gain` and fade times. | Music still loops, fades and follows the Music slider; memory drops (Chrome task manager). |
| P4 | **Pause sound in the background.** Suspend the vehicle AudioContext on `document.hidden` and resume on return (music already does). Start the back-up alarm oscillator only while reversing instead of running it at gain 0 forever. | No CPU use from audio while the app is in the background. |
| P5 | **HUD writes only on change.** hud.js:198-216 sets `textContent` / `style.width` every frame; keep the last value and write only when it changes. | Same HUD, fewer style recalcs in a Performance trace. |
| P6 | **Fewer allocations at 120 Hz.** Precompute a `heavy` Float32Array in terrain.js beside `HV`/`HC` and sample it in `mudAt` instead of building an object per call (pre-solve, mudDrag, mud bubbles); reuse objects in interpolate.js instead of 5 new closures per body per frame; pool particles (reuse dead entries). | Routes identical; fewer GC pauses in a Performance trace. |
| P7 | **Ruts drawn once.** mud.js runs `drawRuts` in `surface`, `foreground` and again for every sunk far tire via `farLip`, each time calling `visH` per vertex 6–8 times. Compute the per-cell `mid` heights once per frame and reuse them. | Ruts look identical; frame time in a deep bog drops. |

## Phase 3 (LATER, before the store release): do not start now

These would get in the way of local testing (debug tools, test coins, quick installs) or rewrite
history. Leave them until the user decides to publish.

| Id | Task |
|---|---|
| R1 | Set `TEST_MODE = false` (from N2) in the release build only; consider making it a build flag (`HAUL_RELEASE=1 npm run android:web`). |
| R2 | **Release build:** upload keystore kept out of the repo, `bundleRelease` (AAB), Play App Signing, `minifyEnabled true`. A separate workflow; keep the debug latest-build release for testers. |
| R3 | **One versioned save record** (`{ v: 1, coins, xp, owned, tuning, powers, missions }`) written in one `setItem`, with a migration from `hh_wallet`, `hh_progress`, `hh_tuning_levels`, `hh_powers`, `hh_missions`. Today buying a truck writes the wallet and the progress separately, so a kill in between loses the coins. |
| R4 | **Content-Security-Policy** in the app build, e.g. `default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'`; widen `connect-src` only for the billing host. |
| R5 | `innerHTML` with template strings in hud.js:175 and :189 → `textContent` with a `<b>`/`<i>` element (safe today, matters once anything comes from a server). |
| R6 | Pin CI actions to commit SHAs (let Dependabot bump them). |
| R7 | Decide `android:allowBackup` and drop `android:largeHeap` once P1–P3 are in. |
| R8 | Move the 673 MB of PNG masters to Git LFS or cloud storage (`.git` is 2.5 GB). This **rewrites history**: only with the user, after every clone and session is pushed. |
| R9 | Remove old worktrees in `.claude/worktrees/` (840 MB), only after checking no session uses them. |
| R10 | iOS: add `@capacitor/ios` and an Xcode project when the App Store is targeted (only Android exists now). |

## Phase 4 (LATER): payments

Design first with the user (what is sold: premium trucks, a starter pack, remove-ads, coin packs).
Then: a maintained Capacitor billing plugin (RevenueCat or `cordova-plugin-purchase`), purchases
verified by a server or RevenueCat, entitlements granted from the verified receipt (never from a
`localStorage` flag), restore purchases from the store, and an economy decision on upgrade sell-back
(today upgrades refund 100%, so coins have no sink). Needs R2 and R3 first.

---

# Implementation record

Implemented on 2026-11-06, against baseline `bec35b3`. Only the NOW phases were performed.
Each implementation commit names its task; N6 is covered by N8's removal of the water field.
`TEST_MODE` remains `true`, with 20,000,000 test coins and starting rank 20. Release-mode tests
substitute the flag only in their test bundles and verify rank 1, zero coins and five free starters.

| Tasks | Result |
|---|---|
| N1–N5 | Preserve saved zero balances; central test-economy switch; ignore repeated Q/E and garage mode changes; remove loading no-ops and stale comments. |
| N6–N8 | Remove bridge and open-water physics/rendering. Retain log crossings, bog splash levels, ripples and wade/churn sound beds in `mud-pools.js`. The only remaining `bridge` text in source/tests is the valid truck ID `stonebridge-6`. |
| N9–N12 | Remove obsolete probes, Android example tests, garage slicing script, unused icons/CSS and internal exports. Keep the loader's internal preloaded images; remove its unused public `kept` property. |
| N13–N15 | Move the five requested constants without changing values; pin esbuild 0.28.2; correct the roster/size-cap documentation and signing typo. |
| P1 | All 105 wheels encoded at 512 × 512; preserve original `sourceSize` for drawing, cache sizing and power glows. All rig pivots and radii stay unchanged. |
| P2 | All 105 garage masters encoded at 1000 px wide. PNG sources and road-body WebPs are untouched. |
| P3–P4 | Stream music through looping media elements with the existing gains/fades; pause media and vehicle audio in the background; create and stop the reversing oscillator as needed. |
| P5–P7 | Avoid unchanged HUD property writes; reuse interpolation getters/vectors and particle entries; cache mud heaviness for rendering and rut heights across rendering passes. |

Physics keeps an allocation-free scalar `mudHeavyAt` with the original smoothstep arithmetic.
Interpolating the Float32 rendering table in physics would change forces, so physics deliberately
does not use that approximation. `mudAt` also accepts reusable output storage for rendering.

Runtime asset totals (bytes, all 105 trucks):

| Files | Before | After |
|---|---:|---:|
| Wheels | 61,855,898 | 11,535,682 |
| Garage masters | 47,813,652 | 16,465,152 |
| Combined saving | | 81,668,716 |

Validation:

- Confirmed all 105 wheel dimensions and source-size records, all 105 garage-master widths,
  and unchanged non-art data for every `car.json`. No PNG master changed.
- Inspected original/current wheel composites for Swamp Scout, Mire King and Prime Mover, plus
  the garage and road at desktop and 844 × 390 phone viewports. The full browser suite passes 4/4.
- Full route test passes. Every leg's driving time, rescue count and winching time matches baseline.
  An additional seven-position trace hashes position, velocity, angle and angular velocity for the
  chassis and every road wheel after each of 2,400 fixed steps per position. Before/after SHA-256:
  `cb580087c6059a2073d205e90b7499aead96b2b56c4d5fdf059877d00818574e`.
- The changed unit suites pass 35/35, including zero-wallet reloads, release progression, held-key
  toggles, streaming/crossfading/volume/background music, reverse-alarm lifetime, and interpolation
  restoration and teleport handling.
- Baseline `npm test`: 86/90 pass; final `npm run check`: 91/94 unit tests pass.
  The rank test's test-mode mismatch is now fixed. Three existing
  physics expectations still fail unchanged: the spaced pipe crossing, high-range cruise speed
  (10.0 km/h), and AWD/DIFF progress without either mode (60.4 m). They are not new regressions;
  changing driving physics to satisfy them is outside this refactor. Consequently `npm run check`
  remains nonzero at its unit-test stage; route and browser checks were run separately.
- `npm run build`, `npm run android:web`, `npm run android:sync` and `npm audit` pass;
  audit reports zero vulnerabilities. The dev server served HTTP 200 on port 5174
  (5173 was already occupied and was left alone). The Android web bundle is 0.78 MB plus 99.6 MB of assets.
- Native Android `assembleDebug` passes: 93 tasks executed using Gradle 8.14.3 and Java 21.
  The generated debug APK is 104,012,678 bytes; its signature and ZIP integrity pass verification,
  and it contains all 105 wheel assets. SDK/toolchain dependencies were installed outside the repo;
  the CI workflow and signing configuration are unchanged.
- A headless 150-frame deep-bog rendering benchmark reduced `visH` calls from 282,000 to 184,800.
  Median render time was 0.6 ms in both runs; 95th percentile was 1.9 ms before / 1.6 ms after.
  These timings are indicative, not a substitute for profiling on a real phone.
- Instrumented music decoding across garage → road: 85,688,056 bytes of decoded PCM allocated
  before; zero music PCM allocations and two media-element sources after. Unit tests also verify
  background suspension and track disposal. Real-phone memory/GC profiling remains a device check.

Logs, deterministic trace scripts, benchmark scripts and extra comparison captures are in
`/tmp/heavy-haul-review/`; normal browser captures are in `output/captures/` (both untracked).
No release/payment tasks, CI publishing changes or history rewrites were performed.
