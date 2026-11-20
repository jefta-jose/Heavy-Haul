# Wheel library

New vehicles reuse one of these accepted wheels instead of getting a wheel of their own (user decision, 2026-11-20).
Codex no longer draws `wheel-v1.png`. It composites the named library wheel into the master instead, so the garage card
and the trail show the same tyre.

Every library wheel is a native 1254 × 1254 px sprite, centred at about (627, 627), with a tread radius of about 547–588 px.
The runtime file is `assets/cars/<donor>/art/wheel.webp`.

| Key | Donor | Tyre type | Look | Suits |
|---|---|---|---|---|
| AT-steel | `overland-owl-12` | all-terrain | black tyre, black 8-hole steel rim | 4×4s, pickups, buggies |
| AT-alloy | `sandpiper-9` | all-terrain | black tyre, black six-spoke alloy | modern or electric 4×4s, sports trucks |
| AT-truck | `fuel-runner-11` | all-terrain | black tyre, silver truck disc with hand holes | road tractors, semi-trailers, vans |
| AT-tan | `crane-carrier-11` | all-terrain | brown tyre, beige heavy truck disc | work trucks, cranes, utility trucks |
| AT-olive | `steppe-liner-11` | all-terrain | brown tyre, olive steel rim | expedition and military-style trucks |
| MT-steel | `mudskipper-11` | mud-terrain | chunky lugs, black 8-hole steel rim | mud 4×4s, log trucks, farm trucks |
| MT-spoke | `hill-jackal-7` | mud-terrain | chunky lugs, dark ten-spoke rim | army trucks, armoured vehicles |
| MT-olive | `ural-bear-7` | mud-terrain | chunky lugs, olive military disc | army cargo and supply trucks |
| FL-black | `floodwalker-9` | flotation | wide balloon tyre with paddle lugs, black rim | swamp crawlers, amphibians |
| GI-yellow | `titan-tipper-11` | giant | giant chevron tread, yellow rim | mining haulers, loaders |
| GI-steel | `kraken-20` | giant | giant chevron tread, grey steel rim | mining haulers, heavy movers |

## Hooking up a car that uses a library wheel

- **car.json:** `art.wheel` becomes `{ "file": "../<donor>/art/wheel.webp", "sourceSize": [1254, 1254] }`. It has no `source`, so `art:encode` skips it.
- **Rig:** `rig.wheelPivot` and `rig.wheelArtRadius` come from the donor's car.json.
- **Drafting the rig:** run `tools/art/draft-rig.py` with `--wheel ../../<donor>/art/wheel.webp`.
- **Previews:** `tools/art/preview-car.py` must scale the 512 px runtime wheel by `512 / sourceSize` when there is no source PNG.
- **Picking a donor:** match the tyre type to the car's `wheelType` in `cars.json`.
- **Never delete a donor's `art/wheel.webp`**, even when deleting unused assets.
