# Cars

`cars.json` is the roster: 100 vehicles in five classes ordered weakest to strongest (scout, highway, heavy-duty, offroad,
heavy), 20 per class, one per unlock rank (rank 1 is the free starter), ranked by power, plus one breakdown truck per class
(`service`). Rebuilt on 2026-11-12: every kind of vehicle, inspired by SnowRunner and Forza Horizon (4×4s, SUVs, pickups,
buggies, rally cars, supercars on off-road tyres, vans, semis, work and army trucks, amphibians, mining giants), as original
designs. Loads are optional: many vehicles carry nothing; those with a load carry it in their own art and mass (`load`).
Tyres are fixed (`wheelType`, see `wheel-types.json`; no snow chains). There is no length cap: the game's zoom frames long rigs.

Each folder's `README.md` is the Codex brief. Folders for new entries: `npm run scaffold` (`-- --refresh` rewrites
README-only folders, `-- --prune` drops folders of removed entries).

A vehicle becomes playable when its folder has `car.json` and art. Its sections:

| Section | Contents |
| --- | --- |
| card fields | `name`, `number`, `class`, `drive`, `tagline`, `description`, `stats`, `biomes` |
| `art` | `master` (start screen), `body` (road wheels removed), `wheel`: `{file, source}` |
| `rig` | image registration: body origin and pixels per metre, axle x and hub height (metres, front first), tire radius, wheel pivot and art radius, far-wheel offset (`farWheelOffset`, always `[0.2, 0.13]`), `archCircles` (body pixels `[x, y, r]`, the fender cut-outs), exhaust, winch and nose points |
| `physics` | empty mass, centre of mass, size, wheel mass, collision boxes, suspension; `load` (mass and centre of mass of the load drawn in, if any); service trucks also `winchForce` |
| `drivetrain` | torque curve × `torqueScale`, converter boost, drive-speed ramp, throttle rise, gears, brakes, open-diff grip, fuel |

Fit the wheels to the arches before tuning anything else (see the swamp-scout skill).
