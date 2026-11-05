// Everything you might want to tune about how the game plays, one line each. Change a number, save, and the game reloads.

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
export const START_BARRIER_BEHIND_M = 10;     // a wall this far behind the trail start (the truck's middle) stops reversing off the trail; the longest rig's tail sits about 8.5 m back

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

// ---------- coins ----------
export const STARTING_COINS = 20000000;
export const COINS_PER_METRE = 0.5;           // added by themselves as the truck gets further along the trail
export const COINS_PER_CRUSH = 5;             // for each thing crushed
export const COINS_PER_BOG = 50;              // for getting through a deep bog
// What each of an upgrade's four steps costs, and how much more it costs per class.
export const UPGRADE_STEP_COSTS = [400, 800, 1400, 2400];
export const UPGRADE_COST_BY_CLASS = { scout: 1, highway: 1.5, 'heavy-duty': 1.5, offroad: 2, heavy: 3 };

// ---------- powers ----------
// Chosen in the garage, one at a time per truck. Every power runs for a while, then has to recharge.
export const POWER_TIMES = {
  invincible: { seconds: 10, cooldown: 30 },  // no hit does damage; started with the power button
  nitro: { seconds: 5, cooldown: 30 },        // a surge of speed; started with the power button
  brakes: { seconds: 1, cooldown: 15 },       // the brake pedal stops the truck dead; started by braking faster than DAMAGE_START_KMH
};
export const INVINCIBLE_WARN_SECONDS = 3;     // the shield's glow flickers for the last few seconds
export const SHIELD_COLOR = '#b45cff';        // the glow around a truck that can't be damaged
export const SHIELD_WIDTH_M = 0.26;           // how far a power's glow reaches off the truck
export const NITRO_COLOR = '#2f9dff';         // the speedy border around a truck on nitro
export const NITRO_ACCEL = 5;                 // how hard nitro pushes, in m/s² whatever the truck weighs
export const NITRO_TOP_SHARE = 1.6;           // nitro stops pushing at this share of the truck's own top speed
export const INSTANT_BRAKE_RATE = 12;         // how hard instant brakes stop the truck: higher is sharper (12 takes 85 km/h down to a crawl in about a third of a second)

// ---------- music ----------
// loopSeconds is the file's exact length in beats, so it loops on the beat. gain evens out how loud the two files are.
export const MUSIC_TRACKS = { garage: { loopSeconds: 120, gain: 3 }, drive: { loopSeconds: 122.88, gain: 0.45 } };
export const MUSIC_FADE_S = 0.8;              // how long a track takes to fade in or out

// ---------- how damage looks ----------
export const CRACKS_AT_DAMAGE = [25, 50, 75]; // % of damage where each new set of cracks appears
export const CRACK_COUNTS = [7, 16, 30];      // how many cracks each set shows
export const HIT_GLOW_SECONDS = 0.7;          // how long the red glow lasts after a hit
export const HIT_GLOW_COLOR = '#ff2a1a';

// ---------- loading screens ----------
export const LOADER_MIN_MS = 2500;            // how long a loading screen stays up so its fact can be read; a tap skips the rest once loaded
export const LOADER_SLIDE_MS = 4500;          // how long each slide and fact shows if loading takes longer

// ---------- highway ----------
export const HIGHWAY_SIGN_WIDTH_M = 8.5;      // how wide the sign at the start of a highway is drawn
export const SPEED_TRAP_CARD_S = 4;           // how long the top speed card stays up, its fade included
export const SPEED_TRAP_FADE_S = 1;           // how long it takes to fade out at the end

// ---------- how the suspension looks ----------
export const WHEEL_RISE_MAX_SHARE = 0.25;     // how far a wheel can look to rise above its ride height, as a share of its tire's radius; past that the body is drawn lifted over it
export const WHEEL_DROP_MAX_SHARE = 0.3;      // the same below its ride height; past that the body is drawn lowered to it, so a bouncing truck keeps its wheels
export const BODY_LIFT_RESPONSE = 10;         // how fast the drawn body follows those limits, radians per second: higher keeps wheels closer to their limits, lower moves more smoothly
