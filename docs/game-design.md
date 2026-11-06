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

A rig with a trailer drawn in is one rigid body with all its axles, and every axle is powered. Tires are fixed per car (`wheelType`, see
`assets/cars/wheel-types.json`): to get something stronger, switch to a different car.

## Garage

A dark truck bay with the chosen car parked on the floor and its name at its wheels. Every car parks in the same box whatever its length, and the previous and next buttons either side of it never move. Across the top: the four seasons, the classes, then the class's cars (locked entries for what is still to come); the arrows on that row only scroll it. A bar along the floor always shows the car's spec numbers and upgrade levels, with Drive at the end. The menu at the side pops up the Upgrades card (the tuning knobs) and the Sound card over the garage. Delivering pays the trail bonus plus the load's value.

## Tuning

In the garage every car has four tuning knobs, each grouping several specs. A car's weight and load
are not tunable: every car runs the ones it comes with.

| Knob | Moves (multiplier at level 100) |
| --- | --- |
| Engine | torque ×2.5, throttle response ×2, fuel economy ×1.6 |
| Suspension | travel ×1.8, softer springs ×1.6, firmer shocks ×1.8 |
| Speed | longer gears: top ×1.7, low range and reverse ×1.3 |
| Grip | tire grip ×1.8, brakes ×2.5, mud pull ×2 (mud drag halved, in L only) |

Each knob goes from 0 (stock) to 100 in steps of 25 (four taps to full) with − / + (or a tap on the bar), and every car
can take all four to 100. The Power, Speed and Grip stat bars grow with Engine, Speed and Grip; the
Capacity bar shows the car's own load and does not change. Levels are saved per car in the browser (saves from the older 12-knob panel are
dropped), and the run uses the tuned copy. The knobs live in `src/game/tuning.js` and scale car.json
fields, so they work for every car, including future ones.

Ruts are drawn where the tires roll: deeper in mud and where a wheel spins, lighter on dirt and
gravel. They last for the run and clear when a new run starts or the player goes back to the garage;
they do not change the physics.

## Fuel

Fuel burns over time, not distance: a full tank lasts about 340 seconds at full gas, less burn at idle, none with the engine off. Being stuck drains the tank. A better engine and the card's `stats.fuelEfficiency` make it last longer.

**Fuel stations** are the only way to refill. There are four on the swamp trail, evenly spaced 812 m apart on firm ground, marked on the progress bar, with the distance to the next one always on screen. Stop in a station's marked bay and the truck refuels and repairs together, over a few seconds; leave early and you keep what you got. A towed truck counts too, and its engine restarts by itself. All the numbers are in `src/game-config.js`.

## Service trucks

There are no winch posts. Trucks take damage from hard hits and from straining the long gear in a bog; see Damage below. Every class
has a breakdown truck (`cars.json` → `service`), bigger, stronger and differently painted and shod
class by class, from scout-sized pickups to 10×10 mining giants:

- **Breakdown truck** (top-bar breakdown button): only winches and tows.

The button calls the main truck's own class's truck. It can be called **once per run**, and it
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
3. Tow the truck into a fuel station's bay to refuel and repair it. This is the way out when the tank is dry or the damage is getting close to 100%, so tow early.
4. Control returns to the main truck. The service truck **stays parked** where it was left.
   **V** or the swap button switches vehicles at any time.

A truck that rolls over, or reaches 100% damage, ends the run: it restarts from the beginning of the trail.

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

## Maps

Every map follows Blackwater Swamp: a simple, living background, a thick road that rolls in uneven bumps, deep bogs with mud holes, huge logs, rocks and pipes, and plenty of breakables. See `assets/seasons/swamp-summer/README.md`.

## Truck sizes

No truck is longer than 16.8 m with its load, so one set of obstacle sizes suits them all. The heavy class has no trucks in the game right now: its art, the Ice Breaker's and ten highway trucks' were deleted on 2026-11-04, and they will be redrawn within that cap. Their wheels have to make sense for the truck and load (the hard rule in `AGENTS.md`).

## Damage

Hitting a solid obstacle at speed damages the truck: a red glow, a damage bar, cracks on the body at 25, 50 and 75%, and less power and top speed as it gets worse. Breakables never hurt. Bogs never damage a truck. Trucks up to 10 m also get thrown nose-up by a hard hit, and can go over. At 100% the engine dies, and a wreck or a crash means starting again from the beginning of the trail. All the numbers are in `src/game-config.js`.

## Controls

The player has gas, brake, AWD and DIFF. Gears shift themselves: the short gear from rest, the long gear once it runs out of revs. Holding the brake at a stop starts reversing. Each class has a minimum pull, so no truck feels dead. All the numbers are in `src/game-config.js`.

## Speed limit signs

A sign stands at the first of every group of things that can hurt a truck: logs, pipes, hard rocks and solid props. It shows the speed above which a hit does damage, painted on from `DAMAGE_START_KMH` in `src/game-config.js`, so it always matches the real limit. The game works out where they go from the obstacles themselves, so a new map needs no sign data.

## Highway

Right after each fuel station comes 250 m of highway (`trail.highways` in `season.json`), then normal road again. It is the place to use speed: long, smooth waves instead of bumps, so the truck rises and dips gradually, a sign at the start, and nothing on it at all, so it stays clean.

An invisible speed camera sits 20 m before the end of each one, where trucks are at their fastest. As the truck passes, a small fiery red chip just under the power chip, the same size, shows how fast it is going at that moment, stays up for a few seconds and fades (`src/game/speed-trap.js`). Nothing is saved. It only counts when the truck drives itself, not when towed.

## Roadside scenery

Fences, a stilt shack, rusted pickups, water towers and alligator warning signs stand along the road's far edge (`trail.scenery` in `season.json`), so the swamp feels lived in and abandoned. They are drawing only and trucks never touch them. The towers are rare landmarks, the shacks and pickups come now and then, a gator sign stands before every deep bog, and fences run along the open stretches. None stands on a station, a highway sign or camera, or a speed limit sign.

## Ranks and buying trucks

The player has a rank from 1 to 20, reached with XP (`RANK_XP` in `src/game-config.js`: 200 XP for rank 2, up to 40,000 for rank 20). XP comes from driving, scaled by the main truck's class, so harder classes earn more (`XP_BY_CLASS`): new ground (0.05 per metre), every deep bog cleared (40) and every delivery (600). Being towed earns nothing.

Every class has 20 trucks, ordered weakest to strongest by power, and each has an `unlockRank` from 1 to 20 in `assets/cars/cars.json`, one per rank. Each class's weakest truck (rank 1) is owned from the start. Reaching a rank opens one more truck in every class, five in all, but it still has to be bought for its `price` (the class's tier-1 price times its rank). In the garage a locked truck shows a padlock and "Rank N", greyed out; an open one shows its price; an owned one shows nothing. Drive becomes Buy with the price for an open truck, and "Requires rank N" for a locked one. Upgrades and powers only work on owned trucks. The rank and an XP bar sit left of the coins. A rank-up is announced on the road, and the delivery screen shows the XP earned. Rank, XP and owned trucks are saved in the browser (`src/game/progress.js`).

## Missions

Most XP comes from missions, picked in the garage's Missions card, one at a time (`assets/missions/missions.json`, `src/game/missions.js`). Four are on offer: always a delivery in the class driven least so far, so players use every class, plus three of the other kinds: against the clock, no breakdown truck, under 25% damage, passing a speed camera fast, crushing 40 things, and driving through 6 deep bogs without a tow. The chosen one shows as a chip under the power chip, with how it is going. Live ones finish the moment they are done; the rest at the depot. A finished mission pays its XP once (class deliveries scale by the class, like all XP), shows on the delivery screen, and a fresh list is drawn. Failing costs nothing: the mission stays chosen for the next run.

## Coins

Coins add themselves: 0.5 per metre of new ground, 5 per thing crushed, 50 per deep bog cleared, plus the delivery pay at the depot. They are kept when a run ends early. They buy upgrades in the garage: four steps of 400, 800, 1,400 and 2,400, costing more on bigger classes, and selling a step refunds it. All the numbers are in `src/game-config.js`.

## Powers

Powers do what upgrades can't. The garage's Powers card holds them, and each truck has its own: the player chooses one at a time for the truck in the garage, free of charge, and it stays on for that truck, run after run, until they choose another; tapping the one that is on turns it off. The choice is saved per truck in the browser. Only the main truck uses one, and a chip at the top right of the road says which.

Every power runs for a while and then recharges, and starts ready on every run.

- **Invincible:** the power button (S on a keyboard) stops all hit damage and the throw from a hit for 10 seconds, with a violet glow around the truck that flickers for the last 3. It then recharges for 30 seconds. It does not stop a rollover.
- **Instant brakes:** braking on the ground faster than `DAMAGE_START_KMH` (20 km/h) starts it, so ordinary slow braking never uses it up: for 1 second the pedal takes the truck's speed straight off, whatever it weighs. It then recharges for 15 seconds, with normal brakes until it is ready.

The numbers are in `src/game-config.js`. A Nitro power was removed on 2026-11-06: its speed always ended in a wreck in the obstacles just past the highway.

## Garage, screens and music

The garage art is listed in `assets/hud/hud.json`; every entry reaches the style sheet as `--hud-<id>`. Heavy trucks, heavy screens: nothing in the garage bounces or gleams, and it moves slowly or not at all. Loading screens (`src/game/loader.js`, `assets/loaders/loaders.json`) look like a big truck game's: a full-screen photo of heavy trucks at work drifts slowly and cross-fades to the next, the season's name and place sit at the top left (after DRIVE, the truck, its load and the trail instead of the place), one real fact about trucks (from `assets/loaders/truck-facts.json`) sits at the bottom left, and a tire (an inline SVG, spun by CSS) turns at the bottom right, so it is always perfectly round. Until any photo exists the season's panorama stands in. A tap skips the wait once loading is done. The loading screen fades in over the garage on DRIVE and fades out to it on the way back. Two music tracks in `assets/audio/music/` play one at a time, garage and road, with their own Music volume; their settings are in `src/game-config.js`.
