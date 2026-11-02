# Integration review: rejected body registration

Resolved on 2026-11-01: `body-v5.png` is now selected in `prompts.json`. Built-in image generation supplied replacement wheel-well interiors; the user explicitly authorized local compositing to preserve the master's other pixels. `body-v5-validation.json` records exact RGBA equality outside the two wheel regions, unchanged cab/tank/bed pixels, opaque upper wells, transparent lower wheel regions and matching 1984 × 793 dimensions. `body-v5-review.png` provides a contrasting-background preview. Rejected variants remain alongside it.

Original rejection: `body-v1.png`, previously selected in `prompts.json`.

Reference master: `vehicle-master-v2.png` (1984 × 793).

Rule broken: AGENTS.md requires the body to preserve the master's position, scale, camera and every non-wheel detail, so the two line up pixel for pixel. The canvas dimensions match, but the cab and door were shifted approximately 17 pixels to the right in the body edit. Transparent canvas padding did not correct the artwork registration. This is visible in `output/captures/art-review/fjord-registration.png`, whose grids use the original image coordinates.

CLAUDE.md, Hook up a car, step 1 requires stopping integration when an image fails review. No playable config or runtime art was added.

## Exact generation request

Edit target: `assets/cars/fjord-otter-10/source/vehicle-master-v2.png`. Save a new `body-v2.png`; preserve all previous versions. Remove only both road tires and rims. Replace each upper wheel arch with an opaque painted dark wheel-well liner, chassis, axle and suspension from the fender lip down to the ORIGINAL master hub line. Never leave transparency above that line. Below the hub line and under the chassis stays transparent. Keep the water tank, its cage and straps, bed, cab, door, windows, hood, bumpers, rock sliders, skid plates and every other non-wheel detail at exactly the master's pixel coordinates. Do not redraw, shift, recenter or rescale any retained part. Keep the exact 1984 × 793 canvas. Use the master as the edit target, not the rejected body. Premium semi-realistic painted game illustration, soft even daylight, true transparent background, no ground or shadow, no text, logos or watermark. strictly flat 2D side profile, camera perpendicular to the near side at hub height, no perspective, all tires the same size on one level line, no far-side tires.

Verify the new body against a registered overlay of the master before selecting it. Matching dimensions alone is insufficient. Record the actual prompt, edit target and rejection reason in `prompts.json` when the revision is generated.
