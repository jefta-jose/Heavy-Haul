## The basics

**What is Heavy Haul?**
A 2D side-view off-road truck game: SnowRunner-style physics with Hill Climb Racing controls. You pick a
truck in the garage, drive it along a swamp trail to the depot, and earn coins and XP on the way.


**What is it built with?**
Plain JavaScript (ES modules), an HTML canvas for drawing, the Web Audio API for sound, and
[Planck.js](https://github.com/piqnt/planck.js) (a JavaScript port of Box2D) for physics.
esbuild bundles it, and Capacitor wraps it as an Android app. There is no game engine or framework.

**How do I run it?**
`npm install`, then `npm run dev` and open http://localhost:5173 (on a phone, use your computer's LAN
IP). `npm run android:sync` builds the Android project. Every push to `main` also builds an APK on
GitHub Actions and publishes it as the "latest-build" release.

**Where does everything live?**
- [main.js](main.js): the entry point and game loop.
- [physics/](physics): terrain, obstacles, vehicles, drivetrain and the simulation that ties them together.
- [render/](render): the canvas renderer and its layers (background, ground, mud, props, vehicles).
- [audio/](audio): engines, effects, ambience and music.
- [game/](game): garage, HUD, input, session rules, missions, progress, wallet, tuning.
- `assets/`: all content as data. A truck is `assets/cars/<id>/car.json` plus its art; the map is
  `assets/seasons/swamp-summer/season.json`.

**How do I add a truck or change a map without touching code?**
Content is data. Write a `car.json` with its measurements and set `"status": "playable"`, and it
appears in the garage. Edit `season.json` to move obstacles, bogs, stations and highways. The code only
changes when the data cannot express something.

## Physics and driving

**How fast does the physics run?**
At a fixed 120 steps a second, whatever the screen refresh rate is. Each drawn frame is blended between
the last two physics steps ([interpolate.js](game/interpolate.js)), so the truck moves smoothly on
60, 90 and 120 Hz phones. The physics is deterministic: the same inputs always give the same drive.

**What is a truck, physically?**
One rigid chassis body plus one wheel body per axle, joined by sprung wheel joints
([vehicle.js](physics/vehicle.js)). The load (logs, a tank, a digger) is part of the truck's art and
mass: there are no separate trailers, and loads never fall off.

**How do the suspensions work?**
Each axle's wheel joint is a spring and damper. The spring rate comes from the weight on that axle
divided by the sag set in car.json (`k = load × g / sag`), and damping is a share of critical damping.
These are converted into the frequency and damping ratio Box2D wants (`springFor` in
[vehicle.js](physics/vehicle.js)). Past the end of travel, stiff bump stops take over (`applyBumpStops`).
The suspension upgrade raises travel, sag and damping.

**Why do the wheels sometimes look like they stay in the wheel arches when the suspension moves a lot?**
On purpose, and only in the drawing. If a wheel would be drawn over the cab door or hanging far below
the truck, the body picture is lifted or tilted a little until every wheel looks right (`drawnBodyLift`).
The physics never sees this.

**How does the engine and gearbox work?**
[drivetrain.js](physics/drivetrain.js) turns the pedal into a motor speed and a torque limit for every
wheel joint, from the car's torque curve and gear ratios; the physics solver does the rest. A torque
converter gives extra torque at launch, so take-off is brisk. There are three gears: L (short),
H (long) and R. The automatic box shifts up at 90% of L's top speed and back down at 45%
(`AUTO_UP_AT`, `AUTO_DOWN_AT`). Hold the brake at a standstill to reverse.

**What do AWD and DIFF actually do?**
With AWD off, every axle except the front one is driven; with it on, all of them are. With the diff
open, every driven wheel gets equal torque, so the wheel with the least grip limits them all (one
spinning wheel stops you). With DIFF locked, torque a spinning wheel cannot use goes to the wheels that
still grip. That is why the game tells you to lock DIFF when a wheel spins.

**How does grip work?**
Each surface in `season.json` has a friction value (`mu`): highway and dirt 0.95, gravel and rock 0.85,
river bed 0.55, deep mud 0.32. Each tire type in `assets/cars/wheel-types.json` grips each surface
differently. The grip a wheel has is friction × the load actually pressing it into the ground,
measured from the physics every step.

**Why does every truck manage to move, even the weak ones?**
Each class has a minimum pull: a truck whose engine cannot pull a set share of its own weight in L gets
more torque until it can (`MIN_PULL_BY_CLASS`). Weak trucks are raised; strong ones are left alone.

## The road

**How did you build the road?**
One height profile, sampled every 25 cm, shared by the physics and the drawing
([terrain.js](physics/terrain.js)). It is built in layers:
1. **Shape:** hand-placed key points (`trail.keys`) joined by a smooth curve that never overshoots.
2. **Texture:** value noise, rougher on rock and dirt and calm on gravel, blended across zone borders.
3. **Features:** washboard runs, potholes, mounds, stepped ledges and rock slabs, placed by a seeded
   random generator, so the trail is the same every time.
4. **Authored pieces:** mud holes, ramps and rock gardens listed in `season.json`.
5. **Rolling bumps** on every open stretch, and smooth long waves on the highways.

The ground is a chain of physics edges along that profile, one per surface zone.

**Why does the road look thick when the tires only touch a line?**
The physics trail is a line; the thick road with its far edge, near edge and soil underneath is drawn
around it ([ground.js](render/layers/ground.js)). Its size is a share of the screen height, so it looks
right at every truck's zoom. None of it affects the physics.

**How do the bumps work?**
The rolling bumps (`trail.rollers` in `season.json`) are uneven humps 6.5 to 11 m long and 0.45 to 0.85 m
tall, each with its crest off-centre, so no two match. They fade out around bogs, holes, obstacle runs,
ramps, rock gardens, stations and the start and depot, so they never stack on top of something else.
`intensity` scales them all.

**Why do tires sink in mud?**
There are two heights: the drawn surface (`visH`) and the one tires actually rest on (`colH`). In mud
`colH` is lower (`surfaces.mud.sink`), and lower again in the deep bogs (`heavySink`), so tires sit in
the mud instead of on top of it.

**How do the deep bogs work?**
Ten deep bogs (`trail.heavyMud`), each with one mud hole. In mud, tires lose grip in patches, and a
bog drag holds a slow tire back. In a deep bog the drag grows with the weight on the tire, so every
class gets stuck in proportion, but tires carrying under 2.5 t are held less (`bogRefT`), so a light
scout can wiggle through. The fix is L, AWD, DIFF, and if that fails, the breakdown truck.

**How come the highway has no obstacles?**
Highways are listed in `season.json` (`trail.highways`, four of them, 250 m each) and treated as calm
ground: the terrain removes all noise and features there and leaves only the long smooth waves, and
obstacles are never placed within reach of calm ground. A highway can still list stones that break
under any truck (`rockEvery`), but none do now. It is a place to go fast: a speed camera near each
highway's end shows your speed.

**What are the ruts?**
Drawing only ([mud.js](render/layers/mud.js)). Tires press a depth profile into the ground as they
roll: deeper in mud, deeper with every pass and where a wheel spins. They last the whole run and clear
on a new run. Physical ruts were tried and dropped: after a few passes they made the trail impassable.

## Obstacles and damage

**What are the obstacles?**
- Runs of 4 to 6 logs, pipes, oil drums, corduroy logs or rotten logs across the trail (`trail.obstacleRuns`).
- Boulders whose collision shapes are traced from the rock art, so what you see is what you hit.
- Props such as root tangles, concrete slabs and branch piles (`trail.propKinds`).
- Stones and branch piles that break under the tires (`trail.crushables`), worth coins.

Built in [obstacles.js](physics/obstacles.js); their sizes are scaled by `trail.obstacleScale`.

**How does damage work?**
Hitting a solid obstacle faster than 20 km/h hurts (`DAMAGE_START_KMH`), and the harm grows with the
square of the speed over that. One obstacle run hurts a few times, not once per tire per log, because
of a 2-second cooldown. Damage cuts power and top speed (down to 40% just before wrecked), shows
cracks on the truck at 25, 50 and 75%, and at 100% the engine dies and the run is over. Speed limit
signs stand before each group of obstacles. Things that break under your truck never hurt it.

**Can the truck flip?**
Yes. On its roof or side for 1.2 seconds ends the run (`CRASH_SECONDS`). Short trucks (10 m or less) are
also thrown nose-up by hard hits.

## Fuel and stations

**How does the fuel work?**
Fuel burns over time while the engine runs, so being stuck still drains it. A full tank lasts about
340 seconds at full throttle, 30% of that rate at idle (`FUEL_TANK_SECONDS_BY_CLASS`,
`FUEL_IDLE_SHARE`). A truck's fuel-efficiency stat and the engine upgrade make it burn less. Service
trucks never run out.

**Where do I refuel?**
At the four fuel stations, 812 m apart (`trail.stations`). Stop with the middle of the truck inside the
bay and it refuels (empty to full in 6 s) and repairs (fully in 10 s) at the same time, whether you drove
in or were towed in. A truck refuelled from empty starts itself.

**What happens if I run out?**
The run ends unless you call the breakdown truck to tow you to a station.

## Help: the breakdown truck and winch

**How do I get unstuck?**
Each class has a breakdown truck. Tap its button in the top bar once per run: it starts at the
beginning of the trail and you drive it out to your truck. Back it within 5 m, tap WINCH to hook the
nearest vehicle, and drive away to tow it. After that, the same button switches between the two trucks.

**How does the winch work?**
As a stiff cable that only pulls, never pushes, with damping and a maximum force
(`pullCable` in [simulation.js](physics/simulation.js)). It keeps the length it had when hooked and
never reels in: you tow by driving. It pulls full strength on trucks of its own class, much weaker on
others. Breakdown trucks never get stuck in mud and never run out of fuel.

**Why do towed trucks not earn coins?**
So a rescue cannot be used to farm. Distance, bogs, crushes and missions only count while you drive
your own truck under its own power.

## Garage, progress and money

**How do rank and unlocks work?**
XP comes from new ground, each bog cleared, deliveries and missions, and harder classes earn more
(`XP_BY_CLASS`). Each of the 20 ranks opens one more truck in every class, which you then buy with
coins. Each class's weakest truck is free.

**What are the classes?**
Five, weakest to strongest: scout, highway, heavy-duty, offroad, heavy. Each has 20 trucks and one
breakdown truck, and each class has one camera zoom (`ZOOM_BY_CLASS`). Nothing is longer than 16.8 m,
load included.

**How do upgrades work?**
Four knobs in the garage ([tuning.js](game/tuning.js)): engine, suspension, speed and grip, each 0 to
100 in steps of 25, and every truck can max all four. Each knob scales several car.json values at once
(engine: torque, throttle response, fuel economy; speed: longer gears; grip: tire grip, brakes, mud
pull). Weight and load are never tuned. Selling a step refunds it.

**What are powers?**
One per truck, chosen in the garage. Invincible: tap the shield and no hit hurts for 10 s (30 s
recharge). Instant brakes: braking above 20 km/h stops the truck dead (15 s recharge).

**How do I earn coins?**
0.5 coins per new metre, 5 per thing crushed, 50 per bog, plus the trail bonus and the load's value at
the depot.

**Why do I have 20 million coins and every truck open?**
Test mode. `STARTING_COINS` and `STARTING_RANK` in [game-config.js](game-config.js) are set for
testing and will be reset before release.

**Where is my progress saved?**
In the browser's (or app WebView's) local storage on your device: coins, rank, owned trucks, upgrades,
powers, missions and sound volumes. Clearing app data resets it. There are no accounts or servers.

**What are missions?**
Optional goals picked in the garage, one at a time, for extra XP: deliver with a class, beat a time,
no help, little damage, a speed at a camera, crushing, bogs ([missions.js](game/missions.js)). Failing
costs nothing.

## Camera and screen

**How does the camera follow the truck?**
A critically damped spring fed the truck's velocity, with the truck's nose at 60% of the screen width,
so you see ahead ([view.js](game/view.js)). Vertically it follows the slope of the ground ahead, not
the suspension bounce, and never lets the truck leave the screen.

**Why is there no zoom button?**
Obstacles are one size for every truck, so each class has one fixed zoom, tuned to fit its longest
truck with room ahead.

**Why does it look blurrier on a slow phone?**
If frames run slow for a couple of seconds, the canvas resolution steps down (not below 80% on phones)
and climbs back after a steady spell ([main.js](main.js), `adapt`).

## Sound

**Are the engine sounds synthesized?**
No. Every class has real engine recordings (idle, part throttle, hard pull, coasting) blended and
pitched by revs ([engine.js](audio/engine.js)). The revs you hear come from a sound-only model that
climbs through gears, so the voice is not one held note; it never affects the physics. Synthesized
engines were tried and rejected. Credits for the recordings are in `assets/audio/sources.json`.

**Why is there no sound until I tap?**
Browsers and phones keep sound off until the first tap or key press.

## Art

**Who made the art?**
Codex generated it from prompts (each truck's prompts are kept in its folder). Every truck is one side
image (body plus load) and one wheel image, measured so each wheel sits on its painted hub to within
3 px.

**Why are there no shadows under the trucks?**
They were removed on purpose.

**Why don't the loads move?**
Loads are part of the truck's art and mass. Animated loads were tried and dropped.

## Testing

**How is it tested?**
- `npm test`: physics, vehicles, tuning, terrain, audio and the roster rules (including the 16.8 m cap).
- `npm run test:route`: drives the whole trail headless, using L, AWD, DIFF and the breakdown truck in the bogs.
- `npm run test:browser`: plays the real build in a headless browser and saves screenshots to `output/captures/`.
- `npm run check`: all three.

**I found a bug. What should I send?**
The truck, roughly where on the trail (the distance to the depot on the HUD), what you pressed, and a
screen recording if you can. Because the physics is deterministic, a clear description usually
reproduces it.
