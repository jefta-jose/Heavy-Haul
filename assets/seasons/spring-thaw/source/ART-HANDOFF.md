# Spring Thaw art handoff

Existing `backdrop-v1.png` is preserved. The 26 remaining roles were generated with built-in imagegen and corrected non-destructively.

Natural assets use cold grey gravel, dark thawing mud, damp timber, small dirty snow remnants and fresh green shoots. Fuel-stop canopy, sign panels, hut trim and steel water tower use brighter hand-painted blue and butter-yellow accents.

Highway wording: **HIGHWAY / SPRING THAW**. Speed face stays blank for the dynamic engine number. Warning panel uses a skidding-car pictogram with snowflake. `reeds` is fresh grass and unfolding fern, `stiltShack` is a maintenance hut; historical filenames are role-compatible names, not swamp content.

## Selected files

| Role | PNG | Dimensions |
| --- | --- | --- |
| roadEdge | [road-edge-v2.png](road-edge-v2.png) | 2172 × 724 |
| roadFar | [road-far-v2.png](road-far-v2.png) | 2172 × 724 |
| roadSoil | [road-soil-v1.png](road-soil-v1.png) | 2172 × 724 |
| ground | [ground-v2.png](ground-v2.png) | 1536 × 1536 |
| wetmud | [wet-mud-v2.png](wet-mud-v2.png) | 1536 × 1536 |
| granite | [granite-v2.png](granite-v2.png) | 1536 × 1536 |
| deepMud | [deep-mud-v2.png](deep-mud-v2.png) | 1774 × 887 |
| mudHole | [mud-hole-v2.png](mud-hole-v2.png) | 1890 × 1003 |
| fuelStation | [fuel-station-v2.png](fuel-station-v2.png) | 1616 × 1104 |
| highwaySign | [highway-sign-v2.png](highway-sign-v2.png) | 1594 × 1082 |
| speedSign | [speed-sign-v2.png](speed-sign-v2.png) | 990 × 1701 |
| warningSign | [warning-sign-v2.png](warning-sign-v2.png) | 1052 × 1764 |
| reeds | [reeds-v3.png](reeds-v3.png) | 1608 × 1096 |
| rock | [rock-v2.png](rock-v2.png) | 1872 × 985 |
| logCrossing | [log-crossing-v3.png](log-crossing-v3.png) | 1774 × 887 |
| corduroyLog | [corduroy-log-v3.png](corduroy-log-v3.png) | 1838 × 951 |
| rottenLog | [rotten-log-v3.png](rotten-log-v3.png) | 1774 × 887 |
| pipe | [pipe-v3.png](pipe-v3.png) | 1774 × 887 |
| oilDrum | [oil-drum-v4.png](oil-drum-v4.png) | 1916 × 1029 |
| rootTangle | [root-tangle-v2.png](root-tangle-v2.png) | 2328 × 880 |
| concreteSlab | [concrete-slab-v2.png](concrete-slab-v2.png) | 2274 × 826 |
| branchPile | [branch-pile-v2.png](branch-pile-v2.png) | 2312 × 864 |
| fenceSection | [fence-section-v2.png](fence-section-v2.png) | 1644 × 1132 |
| stiltShack | [mossy-porch-v2.png](mossy-porch-v2.png) | 1624 × 1112 |
| rustedPickup | [rusted-pickup-v2.png](rusted-pickup-v2.png) | 1868 × 981 |
| waterTower | [water-tower-v2.png](water-tower-v2.png) | 1030 × 1741 |

## Measurements and validation

`prompts.json` records exact prompts, native dimensions, rejection reasons, revisions and per-role checks. `validation.json` lists selected assets, alpha bounds, strip crop suggestions and approximate round-face/sign measurements. Measurements are in final full-canvas pixels unless marked cropped. Claude should verify physics registration in game.

The three square road textures were resized from native 1254 px to 1536 px; this adds no new painted detail. Vegetation was generated natively at 1536 × 1024 px. All selected exports meet the 1500 px long-side minimum. Road materials have pixel-identical opposite edges and were visually checked in 2×2 repeats. Cutouts were inspected on light and dark backgrounds after alpha repair.

No source code, rosters, season configuration or runtime WebP files were changed. This is an artwork handoff, not a playable-map validation. Preserve all originals; integrate only the selected versions.
