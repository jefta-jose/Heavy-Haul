# Autumn Forest art handoff

Existing `backdrop-v1.png` is preserved. The 26 remaining roles were generated with built-in imagegen and corrected non-destructively.

Natural assets use woodland clay, copper leaf litter, tawny bracken, warm grey granite and logging timber. Fuel-stop canopy, sign panels and cabin accents use brighter hand-painted colours.

Highway wording: **HIGHWAY / AUTUMN FOREST**. Speed face stays blank for the dynamic engine number. Warning panel uses a falling-tree pictogram. `reeds` is autumn grass/bracken, `stiltShack` is a logging cabin; historical filenames are role-compatible names, not swamp content.

## Selected files

| Role | PNG | Dimensions |
| --- | --- | --- |
| roadEdge | [road-edge-v2.png](road-edge-v2.png) | 2172 × 724 |
| roadFar | [road-far-v2.png](road-far-v2.png) | 2172 × 724 |
| roadSoil | [road-soil-v2.png](road-soil-v2.png) | 2172 × 724 |
| ground | [ground-v2.png](ground-v2.png) | 1536 × 1536 |
| wetmud | [wet-mud-v2.png](wet-mud-v2.png) | 1536 × 1536 |
| granite | [granite-v2.png](granite-v2.png) | 1536 × 1536 |
| deepMud | [deep-mud-v2.png](deep-mud-v2.png) | 1774 × 887 |
| mudHole | [mud-hole-v2.png](mud-hole-v2.png) | 1872 × 985 |
| fuelStation | [fuel-station-v2.png](fuel-station-v2.png) | 1648 × 1136 |
| highwaySign | [highway-sign-v2.png](highway-sign-v2.png) | 1638 × 1126 |
| speedSign | [speed-sign-v2.png](speed-sign-v2.png) | 1058 × 1769 |
| warningSign | [warning-sign-v2.png](warning-sign-v2.png) | 1044 × 1755 |
| reeds | [reeds-v2.png](reeds-v2.png) | 1622 × 1622 |
| rock | [rock-v2.png](rock-v2.png) | 1886 × 999 |
| logCrossing | [log-crossing-v3.png](log-crossing-v3.png) | 1906 × 1019 |
| corduroyLog | [corduroy-log-v3.png](corduroy-log-v3.png) | 1892 × 1005 |
| rottenLog | [rotten-log-v3.png](rotten-log-v3.png) | 1852 × 965 |
| pipe | [pipe-v2.png](pipe-v2.png) | 1908 × 1021 |
| oilDrum | [oil-drum-v3.png](oil-drum-v3.png) | 1774 × 887 |
| rootTangle | [root-tangle-v2.png](root-tangle-v2.png) | 2346 × 898 |
| concreteSlab | [concrete-slab-v2.png](concrete-slab-v2.png) | 2296 × 848 |
| branchPile | [branch-pile-v2.png](branch-pile-v2.png) | 2322 × 874 |
| fenceSection | [fence-section-v2.png](fence-section-v2.png) | 1654 × 1142 |
| stiltShack | [mossy-porch-v2.png](mossy-porch-v2.png) | 1642 × 1130 |
| rustedPickup | [rusted-pickup-v3.png](rusted-pickup-v3.png) | 1884 × 997 |
| waterTower | [water-tower-v2.png](water-tower-v2.png) | 1060 × 1771 |

## Measurements and validation

`prompts.json` records exact prompts, native dimensions, rejection reasons, revisions and per-role checks. `validation.json` lists selected assets, alpha bounds, strip crop suggestions and approximate round-face/sign measurements. Measurements are in final full-canvas pixels unless marked cropped. Claude should verify physics registration in game.

Square texture and vegetation exports were resized from native 1254 px; this adds no new painted detail. All selected exports meet the 1500 px long-side minimum. Road materials have pixel-identical opposite edges and were visually checked in 2×2 repeats. Cutouts were inspected on light and dark backgrounds after alpha repair.

No source code, rosters, season configuration or runtime WebP files were changed. This is an artwork handoff, not a playable-map validation. Preserve all originals; integrate only the selected versions.
