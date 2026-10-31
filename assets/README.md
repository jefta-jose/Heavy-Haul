# Assets

Everything the game shows or reads at runtime lives here; `npm run build` embeds the selected car
and season into one HTML file.

```
assets/
  cars/
    cars.json              100 cars in 5 classes ordered weakest to strongest, each with the load it
                           carries (drawn into its art), plus 10 service trucks (fuel / breakdown per class)
    wheel-types.json       the 7 tire types and their grip per surface
    <car-id>/              one folder per car
      car.json             playable cars only: registration, physics, drivetrain, card text
      art/*.webp           runtime images (master, body, wheel)
      source/              PNG masters, prompts.json, art direction
      README.md            planned cars: art brief and checklist
  seasons/
    <season-id>/
      season.json          trail layout, surfaces, art map and render settings
      art/*.webp           backdrop, midground, bank, ground, props, lane materials
      source/              PNG masters and prompts.json
      rock-hulls.json      collision outlines for rocks
  audio/
    sources.json           every recording: author, page, licence, file hash
    source/*.mp3           the downloaded recordings the bank is cut from
    sounds.json            recipe: engines per truck class, effects, ambience beds
    bank/                  built clips (MP3) and bank.json, embedded by the build
    README.md              credits, preparation and playback
  hud/
    hud.json               icons and garage art to generate
    icons/*.svg            HUD icons, inlined by the build
  references/              target concept images used to direct art generation
```

**A car and its load are one image**: scouts carry small loads, heavy haulers carry huge ones,
and only the wheels are separate. Tires are fixed per car; to get something stronger, switch to
a different car.

The build picks the first `playable` car and season (alphabetically), or the ones named by
`HAUL_CAR` / `HAUL_SEASON`. Art keys in a car and its season must not collide.

Game plan for all of this: [docs/game-design.md](../docs/game-design.md).

Workflow: Codex generates the PNG masters into an item's `source/` folder following
[AGENTS.md](../AGENTS.md); Claude reviews and wires them up following [CLAUDE.md](../CLAUDE.md).
New roster entries get their folders with `npm run scaffold`.

## Manipulating a car (`car.json`)

Use [Swamp Scout's config](cars/swamp-scout-4/car.json) as a worked example. Start with garage
upgrades set to stock: saved upgrades modify engine torque, gearing, grip, suspension and mass
on top of these values. Change one setting at a time, initially by about 10%, and compare on the
same trail. Keep JSON valid: no comments or trailing commas.

### Quick changes

| Desired change | Setting | What to do |
| --- | --- | --- |
| More pulling power | `drivetrain.torqueScale` | Increase it; this multiplies the entire torque curve. More power can also cause wheelspin. |
| Higher top speed | `drivetrain.gears.H` | Decrease the ratio. This reduces wheel torque, so a loaded car may struggle to reach the new speed. |
| Stronger low gear | `drivetrain.gears.L` | Increase the ratio for more wheel torque and less speed. |
| Change reverse speed | `drivetrain.gears.R` | Decrease for faster reverse; increase for slower, stronger reverse. |
| Quicker accelerator response | `drivetrain.throttleRise` | Increase it. |
| More tire traction | `physics.tireGrip` | Add or increase this multiplier; its default is `1`. |
| Different surface strengths | `wheelType` | Select a tire type from `cars/wheel-types.json`; the current simulation applies its grip relative to mud-terrain, with the differences softened by half. |
| Less bouncing | `physics.suspension.damping` | Increase moderately; excessive damping can make suspension movement sluggish. |
| Softer springs | `physics.suspension.sag` | Increase it; spring stiffness is calculated from axle load divided by sag. |
| More suspension movement | `physics.suspension.travelUp`, `travelDown` | Increase compression or extension travel respectively. |
| Less tipping | `physics.centreOfMass[1]` | Lower the vertical centre of mass. |
| Shift weight forward | `physics.centreOfMass[0]` | Increase the horizontal coordinate. |
| Heavier vehicle | `physics.mass` | Increase chassis mass in kilograms. Wheel and physical cargo masses are additional. |
| Stronger brakes | `drivetrain.brakeTorque` | Increase it. |
| Greater fuel range | `drivetrain.fuelLitres` | Increase tank capacity; this does not reduce litres burned per second. |
| Lower fuel consumption | `drivetrain.fuelBurn` or `stats.fuelEfficiency` | Lower `fuelBurn` (default `1`), or increase `fuelEfficiency`. |
| Wider camera view | `camera.zoom` | Increase it to show more world; decrease it for a closer view. |

For example, changing high gear from `15` to `12` allows 25% more theoretical wheel speed but
provides 20% less wheel torque at the same engine torque. Changing `torqueScale` from `0.17` to
`0.187` increases engine torque by 10%.

### Card information and tire selection

`id` identifies the car; keep it consistent with its folder and roster. `name`, `number`, `class`,
`drive`, `tagline`, `description`, `stats` and `biomes` describe it in the garage. Class also
affects service recovery rules. `status` records content availability.

`drive` is a label such as `4×4`; powered axles are controlled by `drivetrain.drivenAxles`.
`stats.power` and `stats.grip` are display bars, not engine or friction controls. However,
`stats.fuelEfficiency` **does affect fuel consumption**: adding 40 halves its fuel-burn multiplier.
`wheelType` also affects actual traction, using the surface grip table in
[wheel-types.json](cars/wheel-types.json). Changing the type does not replace the wheel image.

### Engine and drivetrain details

| Field under `drivetrain` | Meaning |
| --- | --- |
| `idleRpm` | Minimum target RPM while the engine is running. |
| `governedRpm` | RPM ceiling used to calculate maximum driven wheel speed; enough torque is still needed to reach it. |
| `inertia` | Time scale for engine RPM response. Higher makes RPM react more slowly. |
| `efficiency` | Multiplier for torque transmitted to the wheels. |
| `torqueCurve` | Ordered `[RPM, torque]` points, interpolated between entries and multiplied by `torqueScale`. |
| `torqueScale` | Overall engine torque multiplier. |
| `converterBoost` | Additional launch torque. At rest, the converter multiplier is `1 + converterBoost`. |
| `converterCoupleRpm` | Wheel-derived engine RPM at which the launch boost fades to zero. Higher keeps boost active longer. |
| `driveRamp.base` | Normal rate of increase in commanded engine-equivalent RPM. |
| `driveRamp.launch` | Extra command ramp near standstill. |
| `driveRamp.launchUntilRpm` | RPM range over which that extra launch ramp fades away. |
| `driveRamp.maxSlipRpm` | Maximum commanded RPM lead over wheel-derived RPM. |
| `throttleRise` | Rate at which throttle builds toward pedal input. |
| `engineBrake` | Coasting resistance when throttle is released. |
| `exhaustBrake` | Additional braking when wheel speed exceeds the selected gear's governed speed. |
| `gears.H`, `gears.L`, `gears.R` | Reduction ratios: higher means stronger and slower; lower means faster and weaker. |
| `brakeTorque` | Wheel brake torque limit, also used by the handbrake. |
| `openDiffGrip` | Multiplier on the grip-based torque allowance with the differential unlocked. |
| `drivenAxles` | Optional powered axle indexes, starting at `0`. Omit trailer axles. If absent, all axles are eligible; AWD off excludes axle `0`. |
| `fuelLitres` | Fuel tank capacity in litres. |
| `fuelBurn` | Optional fuel consumption multiplier, default `1`. |

Drive-ramp settings change how quickly the drivetrain requests speed; they cannot compensate
for inadequate torque or grip. Keep torque-curve RPM points in increasing order and retain a
sensible torque drop near the RPM limit.

### Physics, collisions and cargo

Physics distances are metres and masses are kilograms, except cargo `massT`, which is tonnes.
Local coordinates use positive X toward the front and positive Y upward.

| Field under `physics` | Meaning |
| --- | --- |
| `mass` | Chassis mass, before adding physical cargo and wheel bodies. |
| `centreOfMass` | `[x, y]` balance point. Lower Y resists tipping; changing X redistributes axle loads. |
| `size` | `[length, height]` used to calculate rotational inertia. Does not resize artwork or collision boxes. |
| `wheelMass` | Mass of each simulated wheel body, one per axle. Higher increases rotational inertia and unsprung mass. |
| `tireGrip` | Optional overall tire-friction multiplier, default `1`. |
| `suspension.sag` | Loaded sag used to calculate spring stiffness; larger values make softer springs. Keep positive. |
| `suspension.travelUp` | Upward compression travel before the bump stop acts. |
| `suspension.travelDown` | Downward extension travel before the travel limit acts. |
| `suspension.damping` | Suppresses spring oscillations. |
| `bodyBoxes` | Collision rectangles: `[leftX, rightX, bottomY, topY, density]`. |
| `winchForce` | Recovery force limit. Current winch activation requires a service vehicle; this alone does not enable a normal car's winch. |
| `load.massT` | Cargo mass added to the chassis, in tonnes. |
| `load.centreOfMass` | Cargo balance point `[x, y]`; defaults to the chassis centre of mass when absent. |

The code sets chassis mass explicitly after creating collision boxes, so changing box density
is not a way to change vehicle weight. Adjust the boxes when the invisible collision shape
does not fit the body or its cargo.

**Top-level `load` and `physics.load` have different jobs.** Top-level `load.name` and
`load.massT` supply the cargo label and delivery reward. Actual cargo weight and balance come
from `physics.load`. Keep the masses consistent when cargo should affect both handling and
rewards. Swamp Scout currently lists a top-level 0.2-tonne load without a separate physical
load entry; the vehicle builder does not separately add that listed weight.

### Artwork registration and camera

`art.master`, `art.body` and `art.wheel` each contain a runtime `file` and a recorded `source`
path. Changing `source` alone does not replace the runtime image.

| Field under `rig` | Meaning |
| --- | --- |
| `bodyOrigin` | Body-image pixel coordinate `[x, y]` that corresponds to the physics origin. Image Y increases downward. |
| `pixelsPerMetre` | Body artwork scale. Higher makes the same image occupy fewer metres. |
| `axles` | Axle X positions in metres, front first. Each entry creates one simulated wheel body. |
| `wheelY` | Corresponding vertical wheel registration positions in metres. |
| `radius` | Physical and rendered tire radius in metres. |
| `wheelScale` | Optional per-axle tire-radius multipliers; normally omit for equal tires. |
| `wheelPivot` | Rotation centre `[x, y]` in wheel-image pixels. |
| `wheelArtRadius` | Tire radius within the wheel image, in pixels; used to scale it to the physical radius. |
| `farWheelOffset` | Visual offset for the far-side wheels. |
| `archCircles` | Body-image circles `[x, y, radius]` in pixels controlling fender overlays above the tires. |
| `exhaust` | Exhaust particle emission point in local metres. |
| `winch` | Winch cable attachment point in local metres. |
| `refuelPoint` | Optional fuel-hose connection point in local metres. |
| `nose` | Front extent used by camera framing and some attachment defaults. |

Keep `axles` and `wheelY` arrays aligned. Changing axle positions, tire radius or wheel height
affects physics as well as appearance. Moving artwork registration does not move collision
boxes. `camera.zoom` controls framing: higher shows more world, lower brings the view closer.
