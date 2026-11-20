# Gumbo Bottoms (summer)

Status: **playable**

The heavy-mud map (user request, 2026-11-20): a flooded river bottomland where the whole road is sticky black-brown clay,
built to test the most powerful trucks.

- **All mud:** one mud zone from end to end; no dirt, rock or highway anywhere.
- **Deep bogs everywhere:** 32 deep bogs (`trail.heavyMud`), about one every 85 m, each 28 m long with one mud hole at its
  centre. Only the four station bays and the depot are kept out of a bog.
- **Harder than other maps:** the mud starts from Blackwater Swamp's numbers (`surfaces.mud`) and is made harder by
  `MUD_HARDNESS['gumbo-bottoms']` in `src/game-config.js`: `sink`, `hold` (bog drag, suction, deep-bog pull), `grip` and
  `bogHalfM` (half a bog's length; 10 m on other maps). Tune the difficulty there.
- **Layout:** each gap between bogs holds one thing, kept 6 m clear of the bog edges: a run of cypress logs or culvert
  pipes, two low obstacles, or roadside scenery. A warning sign stands before every third bog. Checkpoints sit about every
  250 m, mid-gap; stations at 640, 1280, 1920 and 2560 m. `node tools/content/tidy-layout.js` keeps roadside pieces off
  crossings, low obstacles, stations and deep bogs.
- **Round obstacles:** cypress logs (`log`, the `logCrossing` art) and corrugated culvert pipes (`culvert`, the `pipe` art),
  both solid.
- **Low obstacles:** brush piles (break under the tyres), root mounds, cypress root mats, buried tyres, muddy boulders,
  concrete rubble and clay berms (the `iceRidge` key).
- **Ambience:** forest, frogs at every other bog, crows near the stations; light drizzle.

Art: ChatGPT images (2026-11-20) prepared once into `art/`: trimmed sprites, seamless tiles, the strips made seamless and
1600 px wide, the backdrop mirrored to 3:1, the log and culvert turned 35° so they run back into the road. The measurements
(hulls, faces, crops, horizon) are written into `season.json` and `rock-hulls.json`; prompts in `PROMPTS.md`. The masters
were deleted afterwards (user decision, 2026-11-20), so the art entries have no `source`.
