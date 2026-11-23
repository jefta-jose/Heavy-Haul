# Sound plan: every map sounds like itself

Written 2026-11-23. The rules from earlier feedback still apply: only real recordings (no synthesis), nothing
ringing or tonal, no hiss that sounds like a snake, nothing that audibly loops, and every recording is CC0 with its
source in `assets/audio/sources.json`.

## Where it stood

All eight maps shared the same three sounds: a forest bed, frogs and crows. Monsoon Canopy showed rain and lightning
in silence. Coyote Wash had blowing dust and tumbleweeds with no wind, and Cinder Caldera had embers and ash with no
rumble.

## Phase 1: a soundscape for each map (new CC0 recordings)

| Map | What you see | New sounds |
| --- | --- | --- |
| Blackwater Swamp | summer swamp, pollen, butterflies | cicadas in the dry stretches, under the forest and frogs |
| Meltwater Pass | spring drizzle, melting snow | light rain over the whole map, a tumbling mountain stream near the water |
| Copper Ridge | autumn leaves blowing | autumn wind in the trees, leaves skittering across the road, woodpeckers |
| Coyote Wash | dust, grit, tumbleweeds | desert wind instead of the forest, a hawk instead of crows |
| Gumbo Bottoms | drizzle, frogs | light rain, plus a swamp insect chorus |
| Slatecut Quarry | open meadow, pollen | meadow birds and insects, a light wind on the high ground |
| Monsoon Canopy | rain, storm, lightning | heavy rain over everything, and **thunder after every lightning flash**, a moment later, like real distance |
| Cinder Caldera | ash, embers | the volcano's deep rumble and a low wind, no birds |

The thunder follows the lightning on screen: the flash comes first and the rumble 0.6 to 2.5 s later, louder when the
gap is short.

### Recordings (all CC0, Freesound public HQ previews)

| Sound | Recording | Length |
| --- | --- | --- |
| rain-heavy | jmbphilmes, "Rain heavy 2 (rural)" (200272) | 1:09 |
| thunder | Dave Welsh, "Thunder Clap OWB KY" (194364) | 1:16 |
| thunder (2) | lennyboy, "Thunder.ogg" (244053) | 0:16 |
| wind-desert | felix.blume, "Wind singing in the mountain" (165526) | 3:50 |
| wind-trees | straget, "Autumn wind grabs the trees" (403764) | 3:40 |
| leaves | kvgarlic, "Wind-blown leaves skittering across asphalt" (253535) | 3:47 |
| cicadas | dethrok, "Cicadas" (272169) | 0:46 |
| insects | mariethompson, "Swamp at night with crickets and cicadas" (516927) | 0:33 |
| stream | darthbaul, "Tumbling stream in mountain forest" (262647) | 1:01 |
| meadow | Tonmeister88, "Mountain meadow, birds, insects" (454841) | 1:11 |
| rumble | Halion, "Earth-01" (17785) | 1:45 |
| hawk | kvgarlic, "Hawk, winter" (377759) | 0:14 |
| woodpecker | DjangoAltona, "FX Woodpecker" (102972) | 1:37 |

They come to about 26 MB of masters, kept outside the repo. Each bed is cut to 32–50 s for the bank, so the game
grows by 5.8 MB, and a bed is decoded only when its map plays it. Light rain is the heavy rain recording
played quieter and filtered softer, not a second file.

## Phase 2: later, if you want it (ask first)

- A petrol engine for the buggies, rally cars and supercars, so they stop sounding like a diesel pickup.
- Music for each map instead of one road track (needs tracks you choose).
- Rain drumming on the truck's roof in Monsoon Canopy.

## How it is built

- Map sounds are data: `ambience` zones in each `season.json`. A bed (`rain-heavy`, `wind-desert`, ...) fades in
  over its stretch of road; a call (`crows`, `hawk`, `woodpecker`) plays now and then from random sides.
- Lightning in `src/render/layers/atmosphere.js` tells the audio, which schedules the thunder.
- `tools/prepare-audio.py` cuts the beds from the masters, as it does for the forest and frogs.
