---
name: swamp-scout
description: Generate, integrate, and refine detailed painted 2.5D off-road game art using the approved Swamp Scout workflow, including wheel-to-arch fitting, SnowRunner-style driving feel, recorded engine sounds, and smooth frame rates. Use for reference-matched vehicles, separate animated tires, layered terrain, obstacles and scenery, drivetrain or audio tuning, or performance fixes in Heavy Haul and similar fixed-camera driving scenes.
---

# Swamp Scout: reference art into a playable game

Reproduce the quality of the approved Swamp Scout using **high-resolution painted layers connected
to real driving physics**. The active renderer is Canvas 2D with a 2.5D presentation. Authored vehicle
width, tire tread, overlapping layers, parallax, ground contact and suspension create the depth.
The approved result came from generating complete illustrated assets and integrating them into the
moving game. Surface textures on the earlier primitive 3D model did not reach this visual target.

Preserve the user's chosen subject, biome and loadout. The current example is the olive Swamp Scout 4
with huge tires and roof gear as its load; every car carries its load in its own art. Its dimensions
and tuning are examples to adapt for a different vehicle.
This skill does not require adding new gameplay features or changing an unrelated rendering pipeline.

The project root is two directories above this file. Run project commands from that root.

## Start with the approved evidence

Inspect the user's reference and actual game output before changing artwork:

- [Original four-scout reference](../../assets/references/four-scout-trucks.png): the bottom-right **4. SWAMP SCOUT** panel is this vehicle's target.
- The car: [car.json](../../assets/cars/swamp-scout-4/car.json) (art map, rig registration, physics, drivetrain), [art direction](../../assets/cars/swamp-scout-4/source/ART-DIRECTION.md) and [prompts](../../assets/cars/swamp-scout-4/source/prompts.json).
- The season: [season.json](../../assets/seasons/swamp-summer/season.json) and its [prompts and rejected variants](../../assets/seasons/swamp-summer/source/prompts.json).
- The roster of future vehicles and their art briefs: [cars.json](../../assets/cars/cars.json).
- Live captures: run `npm run test:browser` and inspect `output/captures/`.

Use the painted scout workflow for this approved scene. The older `.claude/skills/00-style-bible.md`
and fire-truck guides describe the previous strict side-elevation pipeline; their camera and spare-tire
rules should not override the supplied scout reference or the user's current instructions.

## Workflow

1. **Establish the visual target.** Identify the exact reference vehicle or panel. Match its silhouette,
   viewpoint, material detail, lighting and palette. Favor readable dark mechanical contours,
   weathered olive paint, convincing rubber, and rich natural textures for the current scout.
2. **Generate the assembled vehicle first.** Use the reference as a design/style input. Get a complete,
   clean, transparent vehicle with wheels and equipment; inspect it before deriving moving parts.
3. **Derive registered layers.** Edit that master to remove every road wheel while retaining the spare,
   body, roof gear and chassis. Generate a matching centered wheel separately with soft even lighting.
   Preserve the body canvas, pose and scale. Measure the arches and hub pivots; update registration
   before assembling the rig. See [generation and iteration](references/generation-and-iteration.md).
4. **Generate the environment as separate assets.** Use an opaque panorama, transparent midground trees,
   a side-view bank strip, a top-down soil tile, and transparent reeds, logs and rocks. Keep their camera,
   lighting and style coherent. Genuine alpha and clean silhouettes matter at game scale.
5. **Fit the wheels to the arches.** Measure each flare's inner edge, store `archCircles`, and size
   the tire radius and hub height so the tread fills the arch with no gap under the fender. Verify an
   offline composite before playing.
6. **Integrate immediately.** Make the body pitch and rise from the physics chassis and move each wheel
   from its physics axle. Add far tires, contact shadows, the arch-cut fender overlay, foreground mud and
   layered scenery. Keep terrain anchored to the physical height field. Read
   [registration and rendering](references/registration-and-rendering.md) for the exact implementation.
7. **Tune the feel, sound and frame rate.** Aim for a brisk take-off and a smooth drive. 4x4 and DIFF
   must change mud progress clearly and show a green or red outline when toggled. Give the trail
   obstacles that are physical. Use the class's recorded engine from the sound bank (assets/audio), never synthesized engines.
   Keep frames steady by caching resampled sprites and avoiding per-frame filters. Read
   [feel, audio and performance](references/feel-audio-and-performance.md).
8. **Compare gameplay captures, then refine the largest visible mismatch.** Regenerate the relevant image
   or fix its integration, capture again, and inspect the result. Continue within the user's requested
   scope until the reference's level of detail and a coherent moving scene are reached. A new concept
   picture alone does not demonstrate the finished game. Fourteen generated variants and ten selected
   images describe this run, not a required quota for future work.
9. **Package and verify.** Preserve PNG masters, encode selected runtime images (`npm run art:encode`), update the
   `art` map in `car.json` / `season.json` and build. Check real movement, wheel fit, scrolling, camera stability and the relevant viewport sizes.
   Use [packaging and validation](references/packaging-and-validation.md).

Use the available image-generation tool for visual generation and semantic edits. In this environment,
the approved run used built-in `imagegen`; apply the available imagegen guidance when using it. Save
project-bound results into the requested workspace folder and record exact prompts and reference roles.
Keep accepted assets usable if generation is temporarily unavailable, and report any required missing
capability accurately. A finished existing asset does not need regeneration merely to use this skill.

## Completion criteria

- The actual playable vehicle and environment carry the reference's detail and palette.
- The body and wheels animate independently; tires spin about their hub without obvious wobble.
- Each tire fills its arch: no gap under the fender, and no springs or liners drawn over the tread.
- The vehicle takes off briskly, then drives smoothly. 4x4 and DIFF are clearly felt in mud and flash a
  green or red outline. Logs, boulders, potholes and bumps are physical and climbable.
- Sound: ignition, a V8 engine without whistle, gear and drivetrain clunks, reverse, splashes, crunches,
  at a comfortable volume.
- Steady frame rate with no black flashes at start-up: sprites are cached per zoom, there are no
  per-frame canvas or CSS filters, and adaptive resolution is deferred to the start of a frame.
- Far tires, fender overlap, shadows and irregular ground occlusion make contact convincing.
- Suspension bounce does not shake the landscape; zoom and resize preserve vehicle framing.
- Scrolling has no hard texture joins, colored alpha halos or blank edges.
- Controls leave the vehicle readable at the requested display sizes.
- Selected artwork, registration, prompts and playable review captures are saved in the project.

Report the working preview/build, saved art and prompt locations, checks actually run, and any remaining
visible mismatch. Treat a user-requested new direction as a new target, rather than enforcing this
specific olive scout or swamp on unrelated work.
