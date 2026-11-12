# Meltwater Pass (spring)

Status: **playable**

A mountain pass in the thaw: grey gravel, dirty snow and meltwater. Built on the swamp's recipe
([`../swamp-summer/README.md`](../swamp-summer/README.md)), with its own layout so it does not drive like the swamp:

- **One long climb and descent.** From the valley floor to a summit at about 48 m and back down, with the
  highways following the grade.
- **Rocky fords.** Shallow dips filled with stones (`trail.rockGardens`) where the creeks cross; nine boulder
  fields in all, on wet rock (`surfaces.rock.mu` 0.78).
- **Rock staircases.** Runs of two or three ledges on every climb (twelve `trail.ramps`).
- **Slush basins.** Short, slick mud (`surfaces.mud.mu` 0.28) with seven heavy pits.
- **Culverts and drums.** Mostly pipe and oil-drum runs, a log ford, few logs.
- **Short, choppy rollers** (`rollers.wave` 4.5 to 7.5 m).
- **Four stations**, each followed by a 400 m highway with short, gentle waves.

Art: `source/` holds only the masters `season.json` encodes (Codex's handoff: `ART-HANDOFF.md`,
`prompts.json`, `validation.json`). Rock and prop hulls were traced with `tools/art/trace-hulls.py`; round faces
and the speed sign's face come from `validation.json` and were checked against the art.
