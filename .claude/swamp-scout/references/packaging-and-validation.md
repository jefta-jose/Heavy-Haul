# Packaging and validation

Use this reference after image generation or integration. Commands run from the project root.
The asset layout is described in [assets/README.md](../../../assets/README.md).

## Asset handoff

1. Save generated vehicle masters in `assets/cars/<car-id>/source/` and environment masters in
   `assets/seasons/<season-id>/source/`. Keep versioned PNG names (`body-v2.png`); keep rejected
   variants beside them, never overwrite, and record the rejection reason.
2. Record the full prompt, which image was an edit target versus a style reference, and the chosen or
   rejected version in that folder's `source/prompts.json`. Add to it rather than losing iterations.
3. Inspect the image itself and its transparency. Alpha bounds above zero can include faint generation
   noise; transparent corners do not prove that a plant has no colored halo. Inspect the actual
   composite too. Use image-generation/editing tools for changes to the artwork.
4. List the image in the `art` map of `car.json` / `season.json` as `{ "file": "art/<key>.webp",
   "source": "source/<master>.png" }`, then encode:

   ```sh
   npm run art:encode
   ```

   The encoder only changes the format, skips files whose WebP is newer than the master, and writes to
   a temporary file before swapping it in. A build that once read a half-written WebP embedded a broken
   image and the renderer waited forever for it.
5. Keep the registration in `car.json` `rig` consistent with the selected body and wheel. Re-measure
   arches and hubs whenever the body or wheel canvas changes. New rock art needs new collision hulls:
   `uv run --with pillow python tools/art/trace-hulls.py <rock pngs> > rock-hulls.json`.
6. Run `npm run build`. The build bundles `src/` with esbuild and embeds the first playable car and
   season (or `HAUL_CAR` / `HAUL_SEASON`), artwork included, in `dist/heavy-haul.html`. The web font
   is optional; system fonts take over offline.

`npm run dev` watches `src/` and `assets/` (JS, CSS, HTML, JSON, WebP, SVG) and ignores PNG masters
and notes. Restart only this project's dev server if its watcher changes; never kill an unrelated
process on the same port.

## Choose checks to match the change

Rendering or art: build and run the browser check. Vehicle, terrain or physics: also run the vehicle
tests and the full-trail drive. Documentation-only work needs no simulation run.

```sh
npm test               # vehicle behaviour: registration, suspension, feel, brakes, 4x4/DIFF in mud, obstacles
npm run feel           # launch speeds and deep-mud progress per 4x4/DIFF combination
npm run test:route     # drives the whole trail
npx playwright install chromium   # first browser setup only
npm run test:browser   # captures go to output/captures (HAUL_CAPTURES=<dir> to change)
```

`HAUL_CHROMIUM=/path/to/chrome` selects an existing browser. The browser test reads the live game
through the `window.__haul` handle and checks that:

- every selected image loads with external network requests disabled, and the start card is filled
  from `car.json`;
- an upward chassis impulse moves the body relative to the tires while the camera stays still;
- keyboard throttle and brake, touch throttle, gears, 4x4 and DIFF buttons work, and the tires spin;
- the close camera keeps the nose in frame and pause stops physics;
- the deep-mud start sets low range, 4x4 and DIFF;
- terrain sections render, phone-landscape pedals leave tire contact visible, and portrait controls fit.

A passing run still needs a visual review.

## Inspect captures and close the loop

Compare the reference with the real scene in `output/captures/`: `01-desktop` (framing and
cohesion), `02-close` (wheel registration and detail), `03-deep-mud` and `04-water` (ground contact and
wet effects), `05-rocks`, `06-phone` and `07-portrait` (visibility and control layout).

Also drive the real game. Listen for ignition, engine, gear clunks and splashes. Watch the first five
seconds for black flashes, cross a log, a boulder and a deep pothole, and toggle 4x4 and DIFF in mud.

Look for colored cutout edges, clipped tires, gaps between tire and fender, wheel wobble, floating
props, mismatched viewpoints, straight mud cutoffs, hard repeating seams, roof/body clipping and
controls covering the art. Earlier zoom and seam defects were obvious in captures even though the
behaviour checks passed.

If a visible defect remains, fix the responsible asset or renderer behaviour and capture again. Do
not substitute a standalone concept image for a playable result, or claim completion from a
successful build or test alone.

For delivery, point to the built HTML or dev preview, the captures, the asset folder and the exact
prompts. State which checks actually passed and any remaining mismatch.
