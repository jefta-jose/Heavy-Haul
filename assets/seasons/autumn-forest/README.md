# Copper Ridge (autumn)

Status: **playable**

Logging roads through wet leaf litter on a ridge-and-valley forest. Built on the swamp's recipe
([`../swamp-summer/README.md`](../swamp-summer/README.md)), with its own layout so it does not drive like the swamp:

- **Ridges and valleys.** Long climbs (up to about 17 %) to rock crests with boulder fields, then down into
  valley bogs. Seven heavy-mud pits, each with one mud hole.
- **Rock staircases.** Pairs of ledges on the climbs (`trail.ramps`).
- **Logging debris.** Corduroy log roads laid across every valley bog (10 to 12 logs), log piles, rotten logs,
  a culvert dump, and a branch pile for every second breakable (`crushables.pileEvery: 2`).
- **Longer, softer rollers** (`rollers.wave` 10 to 17 m) and slicker leaf litter (`surfaces.dirt.mu` 0.88).
- **Three stations**, each followed by a 400 m highway with long, tall waves.

Art: `source/` holds only the masters `season.json` encodes (Codex's handoff: `ART-HANDOFF.md`,
`prompts.json`, `validation.json`). Rock and prop hulls were traced with `tools/art/trace-hulls.py`; round faces
and the speed sign's face come from `validation.json` and were checked against the art.
