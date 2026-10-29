# Game design: cars with their loads, garage, fuel and service trucks

How the game is meant to play. Data lives in `assets/` and the code in `src/`; the
**Status** section says what is built.

## Cars carry their own loads

Every car is drawn **with the load it hauls**, so the car and its load are one image. Only the road
wheels are separate sprites. The physics treats the load as part of the car: its mass
(`physics.load.massT`) adds to the chassis and its centre of mass raises the car's. A tall or heavy
load makes the car squat, pitch, roll and burn more fuel. Loads never fall off.

Loads grow with the vehicle. The garage lists five classes from weakest to strongest, with 20 tiers
each:

| Class | Hauls | Examples |
| --- | --- | --- |
| Scouts | 0.15–1.2 t in the bed or on the roof | jerry cans, four oil drums, cement blocks, calves, copper spools |
| Highway | 6–28 t on a semi-trailer drawn into the art | box freight, fuel tanker, container, supercar carrier |
| Heavy duty | 8–30 t on the truck | gravel, long logs, cable drum, a broken-down truck |
| Off-road | 2–20 t on a 6×6 / 8×8 | expedition supplies, an elephant, a space capsule, an orca aquarium |
| Heavy | 11–150 t on a multi-axle lowbed drawn in | ship hull, rocket, locomotive, reactor vessel |

A rig with a trailer drawn in is one rigid body with all its axles. Its car.json lists its powered
axles in `drivenAxles`, so the trailer axles roll free. Tires are fixed per car (`wheelType`, see
`assets/cars/wheel-types.json`): to get something stronger, switch to a different car.

## Garage

Pick a car. Locked silhouettes show the roster still to come. The card shows class, tier, tires,
the load and the gross weight. Delivering pays the trail bonus plus the load's value.

## Tuning

In the garage every car has 12 tuning bars (engine power, top speed, low-range pull, throttle
response, tire grip, brakes, suspension travel, softness and damping, lighter chassis, load capacity,
fuel economy). Each goes from 0 (stock) to 100 in steps of 10 with − / + (or a tap on the bar),
and fills from orange to green. Level 100 multiplies the car's own value by the knob's `max` (for
example ×3 engine power, ×2 grip). The Power, Speed, Grip and Capacity stat bars grow with their
knobs and fill completely at 100. There is no cost for now. Levels are saved per car in the browser,
and the run uses the tuned copy. The knobs live in `src/game/tuning.js` and scale car.json fields, so
they work for every car, including future ones.

## Fuel

Burn follows engine power. 4×4 adds about 8%. Climbing multiplies it (up to ×4 on steep grades),
and so does the load (`1 + 1.5 × load / empty mass`). The burn is in litres and comes out of the car's
own tank (`drivetrain.fuelLitres`), so a bigger tank lasts longer. The card's `stats.fuelEfficiency`
scales it: 70 is the reference, and every 40 points halves or doubles the burn (90 burns ×0.71, 45 burns
×1.54). Refill at the station or with a fuel truck.

## Service trucks

There are no winch posts and no damage: trucks never break, and nothing needs repairing. Every class
has two service trucks (`cars.json` → `service`), bigger, stronger and differently painted and shod
class by class, from scout-sized pickups to 10×10 mining giants:

- **Fuel truck** (top-bar fuel button): only refuels. It has no winch.
- **Breakdown truck** (top-bar breakdown button): only winches and tows.

The buttons call the main truck's own class's trucks. Each can be called **once per run**, and it
starts at the **beginning of the trail**: the player drives it all the way out to the main truck.
After that the button switches to it (a green dot marks it), and tapping it again while driving it
returns to the main truck. Calling is free.

Service trucks **never get stuck** (`physics.neverStuck`: full grip in mud and creek beds, no mud
suction) and **never run out of fuel** (the gauge reads Unlimited). Each is the **most powerful truck
of its class** but **not the fastest**. A breakdown truck's winch (`physics.winchForce`, sized from
`towMassT`) is strong on its own class; on any other vehicle it pulls only 40% of what that
vehicle's own breakdown truck would. A class whose truck has no art yet has none: its button is
greyed out and says "Not available"; no other class's truck is sent instead.

1. The service truck starts at the beginning of the trail, and control switches to it.
2. **Winching works like SnowRunner.** Back the breakdown truck to within **5 m** of the vehicle
   and tap **WINCH** (or W). The hook goes onto the nearest vehicle: the main truck or another service
   truck. Farther away it says "Too far away (N m)". The button pulses when something is in reach and
   stays lit while hooked. The cable keeps the length it was hooked at and does not reel in: **drive
   the breakdown truck away** and it tows the hooked vehicle (a vehicle ahead is pulled from its
   rear, one behind from its front). The cable is a stiff, tension-only spring capped at the winch's
   force, and both vehicles feel it. A towed vehicle's parking brake and engine braking let go so it
   rolls. Tap WINCH again to unhook.
3. Stopped next to the truck, the fuel truck's action button offers **Refuel truck**.
4. Control returns to the main truck. The service truck **stays parked** where it was left.
   **V** or the swap button switches vehicles at any time.

A truck that rolls over is towed back to the last checkpoint for a fee, or the run restarts.

## Sound, engine and handbrake

Every sound is a real recording (credits in the sound panel). Each truck class has its own engine:
the scouts a Dodge Ram 1500 V8, highway trucks a Ford and a Mack semi, heavy-duty trucks Mack dump
trucks, offroad trucks military diesels, heavy haulers construction engines. Throttle and revs blend
idle, cruising and pulling recordings; long recordings play through a seamless grain player, so no
loop is ever heard. Parked vehicles keep idling in the distance.

Driving adds tires on gravel, dirt, rock and mud (louder when the wheels spin), a smooth wade and
churn in water, the load rattling and clanking on rocks and hard bumps, and on trucks the air brakes:
a hydraulic hiss when braking from speed and the pssh when it stops. Trucks beep in reverse. The
season's ambience zones bring in forest birds, swamp insects over the mud, frogs at the crossings and
crows in the dry stretches.

**ENGINE** (or I) turns the engine off and on. A run starts with the key turned: the starter cranks,
then it catches. Off means no drive and no fuel burn; an empty tank stalls it.

**PARK** (or B) is the handbrake: it holds every wheel, even against the throttle, with a ratchet on
the scouts and an air hiss on trucks.

The sound panel (pause menu or garage) sets master, engines, effects and ambience volume, mutes
everything, and lists the sound credits.

## Trail

The trail has rolling hills: steep climbs and drops on rock and dirt (up to about 17%), and mostly
flat mud basins. On top of that come washboard, potholes, deep potholes the tires drop into, stepped
climbs, rock ledges, climbable boulders, crushable rocks, fallen logs and four heavy-mud pits where
the service trucks earn their keep.

## Status

Built:
- cars carrying their loads (mass on the chassis);
- the garage;
- fuel burn with load and grade;
- a fuel and a breakdown truck per class, called once per run from the trail start, never stuck and never dry, with switch, hook-and-tow winch (breakdown, strong on its own class), refuel (fuel) and parked leftovers;
- the steeper trail.

Not built yet:
- tire-type grip on new surfaces (snow, ice, asphalt);
- the upgrade economy.
