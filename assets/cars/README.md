# Cars

`cars.json` is the roster: 100 vehicles in five classes ordered weakest to strongest (scout,
highway, heavy-duty, offroad, heavy), 20 tiers each, with better tires (`wheelType`, see
`wheel-types.json`) and bigger loads further down. **Each car carries its load as part of its
art and mass** (`load`): four oil drums on a scout up to a submarine on a heavy hauler's lowbed. It
also lists 4 service trucks (fuel and breakdown, small to huge, `towMassT`) that are called out in
play to winch, refuel or repair. Each entry has its specs and an art brief. Folders for new entries: `npm run scaffold`.

A car becomes playable when its folder has `car.json` and art. `swamp-scout-4/car.json` is the
reference; its sections are:

| Section | Contents |
| --- | --- |
| card fields | `name`, `number`, `class`, `drive`, `tagline`, `description`, `stats`, `biomes` |
| `art` | `master` (start screen), `body` (road wheels removed), `wheel`: `{file, source}` |
| `rig` | image registration: body origin and pixels per metre, axle x and hub height (metres, front first), tire radius, wheel pivot and art radius, far-wheel offset, `archCircles` (body pixels `[x, y, r]`, the fender cut-outs), exhaust, winch and nose points |
| `physics` | empty mass, centre of mass, size, wheel mass, collision boxes, suspension; `load` (mass and centre of mass of the load drawn in); service trucks also `winchForce` |
| `drivetrain` | torque curve × `torqueScale`, converter boost, drive-speed ramp, throttle rise, gears, brakes, open-diff grip, fuel |

Fit the wheels to the arches before tuning anything else (see the swamp-scout skill).
