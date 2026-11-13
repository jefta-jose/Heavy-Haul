// Everything you might want to tune about how the game plays, one line each. Change a number, save, and the game reloads.

// ---------- camera ----------
// How far out the camera sits for every truck in a class: 1 = 11.8 m of trail across a desktop screen, so 1.6 = 19 m.
// Lower is closer. The truck's nose sits at 60% of the screen, so the class's longest truck (scout 8.1 m, offroad 11.8,
// heavy-duty 13.7, highway 16.4, heavy 16.5) still fits behind it. Phones show a little more. Overrides car.json camera.zoom.
// Scout, highway and heavy-duty look right; offroad and heavy were raised on 2026-11-06 because their tall trucks
// filled the screen (they now show a truck's height at about the same share as highway and heavy-duty).
export const ZOOM_BY_CLASS = { scout: 1.6, offroad: 2.2, 'heavy-duty': 2.0, highway: 2.3, heavy: 2.85 };
// Service trucks are often taller than their class's trucks, so while you drive one the camera eases out to at
// least its height (physics.size[1], metres) divided by this; never closer than its class's zoom. Lower shows more.
export const SERVICE_HEIGHT_PER_ZOOM = 1.6;
// The zoom button (C) cycles these multiples of the vehicle's own zoom, so a long rig can be shown whole; remembered on the device.
export const ZOOM_STEPS = [1, 1.3, 1.7];

// ---------- damage ----------
export const DAMAGE_START_KMH = 20;           // hitting a solid obstacle slower than this does no harm
export const DAMAGE_PER_HIT = 10;              // how much a hit hurts: % of damage for a hit 10 km/h over the start speed; it grows fast with speed
export const DAMAGE_HIT_COOLDOWN_S = 2;     // one obstacle run hurts a few times, not once per tire per log
export const SPEED_SIGN_AREA_GAP_M = 15;      // a speed limit sign, showing DAMAGE_START_KMH, stands at the first obstacle of each group; obstacles closer together than this are one group
export const SPEED_SIGN_HEIGHT_M = 5;         // how tall the sign is drawn, post included
export const DAMAGE_SLOWEST_POWER = 0.4;      // power and top speed just before the truck is wrecked (1 = no slowdown)

// ---------- tipping and crashing ----------
export const TIP_MAX_LENGTH_M = 10;           // only trucks this short or shorter tip backwards from a hit
export const TIP_KICK = 0.8;                  // how hard a hit throws the nose up (radians per second, for a hit 10 km/h over the start speed)
export const CRASH_SECONDS = 1.2;             // this long on its roof or side and the run is over

// ---------- automatic gears ----------
export const AUTO_UP_AT = 0.9;                // shift up to the long gear at this share of the short gear's top speed
export const AUTO_DOWN_AT = 0.45;             // shift back down to the short gear below this share of it
export const AUTO_HOLD_S = 1.2;               // the least time between shifts, so it never hunts between gears
export const REVERSE_AFTER_S = 0.35;          // hold the brake this long at a standstill and the truck starts reversing
export const START_BARRIER_BEHIND_M = 10;     // a wall this far behind the trail start (the truck's middle) stops reversing off the trail; a longer rig starts moved forward until its tail clears it

// ---------- fuel and stations ----------
// How long a full tank lasts at full gas, in seconds. Fuel burns over time, so being stuck drains it. Stations are
// 812 m apart: at a realistic 3 to 4 m/s over the obstacles, this reaches the next one with some to spare.
export const FUEL_TANK_SECONDS_BY_CLASS = { scout: 340, highway: 340, 'heavy-duty': 340, offroad: 340, heavy: 340 };
export const FUEL_IDLE_SHARE = 0.3;           // burn with the engine idling, as a share of full gas
export const STATION_BAY_M = 16;              // how long the bay is: the middle of the truck has to stop inside it
export const STATION_WIDTH_M = 12;            // how wide the building is drawn; it leans with the ground across this width
export const STATION_STOP_KMH = 2;            // slower than this counts as stopped
export const STATION_FILL_SECONDS = 6;        // an empty tank to full
export const STATION_REPAIR_SECONDS = 10;     // 100% damage to none

// ---------- engine pull ----------
// The least a truck in each class can pull in its short gear, as a share of its own weight. Weak trucks are raised
// to this and stronger ones are left alone. Higher is more fun and less heavy.
export const MIN_PULL_BY_CLASS = { scout: 0.9, highway: 0.7, 'heavy-duty': 0.65, offroad: 0.8, heavy: 0.6 };

// ---------- recovery trucks ----------
export const SERVICE_TORQUE_MULTIPLIER = 1.6; // more pulling power without changing gearing or top speed
export const SERVICE_GRIP_MULTIPLIER = 1.8;   // traction to move both the recovery truck and its load
export const SERVICE_WINCH_MULTIPLIER = 1.5;  // stronger cable on the class the truck serves

// ---------- rank ----------
// XP needed in total to reach each rank, rank 1 to 20. Reaching a rank opens one more truck in every class, to buy for its
// price (cars.json: unlockRank and price). The weakest truck of each class is free from the start.
export const RANK_XP = [0, 300, 1050, 2175, 3600, 5400, 7500, 9975, 12675, 15600, 18900, 22425, 26250, 30300, 34650, 39225, 44025, 49125, 54450, 60000];
export const STARTING_RANK = 20;              // local testing value; manually reset to 1 for Google Play
export const XP_PER_METRE = 0.035;            // for new ground, as the truck gets further along the trail
export const XP_PER_BOG = 10;                 // for getting through a deep bog
export const XP_PER_DELIVERY = 100;           // for reaching the depot
export const MISSION_BASE_XP = 100;          // a mission's XP before its difficulty (x0.6 to x1.8), twists and truck lock; a full scout run earns about 700
export const XP_BY_CLASS = { scout: 1, highway: 1.15, 'heavy-duty': 1.3, offroad: 1.45, heavy: 1.6 };   // harder classes earn more

// ---------- coins ----------
export const STARTING_COINS = 50000000;              // local testing value; manually reset to 20000 for Google Play
export const COINS_PER_METRE = 0.5;           // added by themselves as the truck gets further along the trail
export const COINS_PER_CRUSH = 5;             // for each thing crushed
export const COINS_PER_BOG = 50;              // for getting through a deep bog
// What each of an upgrade's four steps costs, and how much more it costs per class.
export const UPGRADE_STEP_COSTS = [400, 800, 1400, 2400];
export const UPGRADE_COST_BY_CLASS = { scout: 1, highway: 1.5, 'heavy-duty': 1.5, offroad: 2, heavy: 3 };

// ---------- powers ----------
// Chosen in the garage, one at a time per truck. Every power runs for a while, then has to recharge.
export const POWER_TIMES = {
  invincible: { seconds: 15, cooldown: 30 },  // no hit does damage; started with the power button
  nitro: { seconds: 15, cooldown: 30 },       // a surge of speed; started with the power button
};
// Nitro arms an instant brake: the next tap on the brake, at any speed, during the boost, the recharge or long after, stops
// the truck dead over this long (a tap is enough; it finishes the stop itself) and is used up. Without it nitro ended in
// the obstacles past the highway.
export const NITRO_BRAKE_SECONDS = 1;
export const NITRO_COLOR = '#2f9dff';         // the speedy border around a truck on nitro
export const NITRO_ACCEL = 5;                 // how hard nitro pushes, in m/s² whatever the truck weighs
export const NITRO_TOP_SHARE = 1.6;           // nitro stops pushing at this share of the truck's own top speed
export const INVINCIBLE_WARN_SECONDS = 3;     // the shield's glow flickers for the last few seconds
export const SHIELD_COLOR = '#b45cff';        // the glow around a truck that can't be damaged
export const SHIELD_WIDTH_M = 0.26;           // how far a power's glow reaches off the truck
export const GUIDE_SPACING_M = 1.6;           // the winch guide: metres between chevrons on the road
export const GUIDE_SIZE_M = 1.1;              // and how long each chevron is
export const TOW_RELEASE_M = 10;             // a towed truck this far from where it was hooked, all wheels on firm ground, is out: the arrow says release
export const STUCK_GLOW_S = 4;               // seconds of gas without moving before the breakdown button glows
export const BRAKE_HISS_GAP_S = 1.5;          // a brake hiss or handbrake sound plays at most once in this many seconds, so pumping the pedal does not repeat it
export const SWITCH_BUSY_S = 0.9;             // the full-screen wait after switching trucks or calling the breakdown truck lasts at least this long
export const INSTANT_BRAKE_RATE = 12;         // how hard nitro's instant brake stops the truck: higher is sharper (12 takes 85 km/h down to a crawl in about a third of a second)

// ---------- interface feedback ----------
// Supplied interface sounds, scaled by the saved master and effects volumes.
export const UI_SOUND_GAINS = { 'ui-click': 0.5, 'ui-confirm': 0.22, 'ui-buy': 0.45, 'mission-complete': 0.25, 'mission-failed': 0.3 };

// ---------- music ----------
// loopSeconds records each file's duration; gain matches the tracks to the existing listening levels.
export const MUSIC_TRACKS = { garage: { loopSeconds: 145.776, gain: 0.52 }, drive: { loopSeconds: 114.984, gain: 0.45 } };
export const MUSIC_SEAM_S = 0.06;             // the crossfade where a music track comes round to its start again (src/audio/music.js)
export const MUSIC_FADE_S = 0.8;              // how long a track takes to fade in or out

// ---------- how damage looks ----------
export const CRACKS_AT_DAMAGE = [25, 50, 75]; // % of damage where each new set of cracks appears
export const CRACK_COUNTS = [7, 16, 30];      // how many cracks each set shows
export const HIT_GLOW_SECONDS = 0.7;          // how long the red glow lasts after a hit
export const HIT_GLOW_COLOR = '#ff2a1a';

// ---------- loading screens ----------
export const LOADER_MIN_MS_LAUNCH = 6000;     // how long the launch loading screen stays up so its facts can be read; a tap skips the rest once loaded
export const LOADER_MIN_MS_DRIVE = 5000;      // the same after tapping DRIVE
export const LOADER_MIN_MS_GARAGE = 3500;     // the same on the way back to the garage
export const LOADER_SLIDE_MS = 8000;          // how long each slide and its facts show if loading takes longer

// ---------- highway ----------
export const HIGHWAY_SIGN_WIDTH_M = 8.5;      // how wide the sign at the start of a highway is drawn
export const SPEED_TRAP_FROM_END_M = 20;       // the speed camera stands this far before each highway's end, where trucks are at their fastest;
                                              // the highway banner stands again just past it, so the speed is caught before the driver brakes
export const SPEED_TRAP_CARD_S = 4;           // how long the top speed card stays up, its fade included
export const SPEED_TRAP_FADE_S = 1;           // how long it takes to fade out at the end

// ---------- how the suspension looks ----------
export const WHEEL_RISE_MAX_SHARE = 0.25;     // how far a wheel can look to rise above its ride height, as a share of its tire's radius; past that the body is drawn lifted over it
export const WHEEL_DROP_MAX_SHARE = 0.3;      // the same below its ride height; past that the body is drawn lowered to it, so a bouncing truck keeps its wheels
export const BODY_LIFT_RESPONSE = 10;         // how fast the drawn body follows those limits, radians per second: higher keeps wheels closer to their limits, lower moves more smoothly

// Fuel, recovery reach and service grip.
export const GLOBAL_FUEL_BURN_MULTIPLIER = 1.0; // scales every truck's fuel burn
export const WINCH_BAY_SLACK_M = 4.5;        // recovery bay = the service truck's own length plus this (about 11 m for the Mechanic Scout, 20 m for the Colossus); the whole truck must fit inside
export const WINCH_BAY_OFFSET_M = 2;          // clear gap ahead of the stranded truck before the recovery bay
export const CROSS_CLASS_PULL = 0.4;         // winch force share on a truck of another class
export const NEVER_STUCK_MU = 0.85;          // minimum grip in soft ground for service tires
export const SPAWN_REACH = 14;           // a called service truck parks within this of the main truck
