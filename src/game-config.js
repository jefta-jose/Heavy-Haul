// Everything you might want to tune about how the game plays, one line each. Change a number, save, and the game reloads.

// ---------- camera ----------
// There is no zoom button: every vehicle gets its own fixed zoom from its size (physics.size, metres). Its height fills
// CAMERA_HEIGHT_SHARE of the screen height, and a long rig is framed wide enough that it fits whole (CAMERA_LENGTH_SHARE
// of the width). Pulled back on 2026-11-19 (the Prime Mover's 31% felt too close and long rigs did not fit).
// 1 zoom = 11.8 m of trail across a desktop screen and 6 m from top to bottom; the nose sits at 60% of the screen width.
export const CAMERA_HEIGHT_SHARE = 0.27;       // the vehicle's height fills this share of the screen height
export const CAMERA_LENGTH_SHARE = 0.72;       // its length never takes more than this share of the screen width, so long rigs fit
export const CAMERA_MIN_ZOOM = 1.55;           // never closer than this: small cars show trail around them

// ---------- damage ----------
export const DAMAGE_START_KMH = 20;           // hitting a solid obstacle slower than this does no harm
export const DAMAGE_PER_HIT = 10;              // how much a hit hurts: % of damage for a hit 10 km/h over the start speed; it grows fast with speed
export const DAMAGE_HIT_COOLDOWN_S = 2;     // one obstacle run hurts a few times, not once per tire per log
export const SPEED_SIGN_AREA_GAP_M = 15;      // a speed limit sign, showing DAMAGE_START_KMH, stands at the first obstacle of each group; obstacles closer together than this are one group
export const SPEED_SIGN_HEIGHT_M = 5;         // how tall the sign is drawn, post included

// ---------- roadside scenery and crossings (2026-11-18: every map follows Blackwater Swamp's layout style) ----------
export const ROADSIDE_SINK_M = 0.04;          // how far a roadside piece's foot sits below the road's drawn far edge, metres, so no hairline of sky shows under it
export const SCENERY_FLAT_M = { stiltShack: 10, waterTower: 7, warningSign: 2.5, gatorSign: 2.5 };   // level road kept under each upright roadside piece, metres; leaning pieces (fences, wrecks) follow the ground
export const DAMAGE_SLOWEST_POWER = 0.4;      // power and top speed just before the truck is wrecked (1 = no slowdown)
// At 100% damage the truck is wrecked (engine dead, brakes locked) and the run ends.

// ---------- brakes ----------
export const AIR_BRAKE_MIN_T = 7;             // empty mass, tonnes, from which a vehicle has air brakes (hiss, release, burst); lighter ones (cars, vans, pickups, scouts) have hydraulic brakes and a ratchet handbrake

// ---------- rolling back on slopes ----------
// The parking brake only holds the truck you drive on gentle ground. On a slope steeper than this, uphill or downhill, with neither pedal
// pressed it rolls downhill like a car in neutral: off slowly, gathering speed, held back only by rolling resistance and a share of its
// engine braking. The brake pedal or the handbrake still hold it.
// A wrecked truck is locked.
export const ROLLBACK_SLOPE_DEG = 9;
export const ROLLBACK_ENGINE_BRAKE = 0.12;
export const ROLLBACK_EASE_S = 2;             // the brakes let go gradually over this long, so it creeps off before it gathers speed
export const ROLLBACK_EASE_BRAKE = 0.5;       // how much brake is left the moment it starts to let go (1 = full brake)

// ---------- tipping and crashing ----------
export const TIP_MAX_LENGTH_M = 10;           // only trucks this short or shorter tip backwards from a hit
export const TIP_KICK = 0.8;                  // how hard a hit throws the nose up (radians per second, for a hit 10 km/h over the start speed)
export const CRASH_TURNING = 1.2;             // (rad/s) a truck turning faster than this is mid-flip, not crashed (user, 2026-11-24: flips are allowed)
export const CRASH_SECONDS = 1.2;             // this long on its roof or side and the run is over

// ---------- automatic gears ----------
export const AUTO_UP_AT = 0.9;                // shift up to the long gear at this share of the short gear's top speed
export const AUTO_DOWN_AT = 0.45;             // shift back down to the short gear below this share of it
export const GEAR_BLEND_S = 1.2;             // after a shift between the short and long gear, the pull eases from the old gear to the new one over this long
export const AUTO_HOLD_S = 1.2;               // the least time between shifts, so it never hunts between gears
export const REVERSE_AFTER_S = 0.35;          // hold the brake this long at a standstill and the truck starts reversing
export const START_BARRIER_BEHIND_M = 10;     // a wall this far behind the trail start (the truck's middle) stops reversing off the trail; a longer rig starts moved forward until its tail clears it
export const OBSTACLE_APPROACH_M = 10;          // level road kept before every log, pipe or drum run and every climbable prop (and 3 m after), so a truck meets it square, not nose-down out of a roller dip (2026-11-24: the all-truck sweep's rollovers sat at these)
export const OBSTACLE_SIT = 0.1;               // a log, pipe or drum's centre sits this share of its radius above the drawn road: about half of it is sunk in
export const LOG_SHOWN_BELOW_AXIS = 0.6;      // how much of a lying log, pipe or drum shows below its axis, as a share of its radius (the rest is bedded in the road)

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

// ---------- class ladders (npm run rebalance writes these into every car.json and cars.json) ----------
// Each class's cars, in roster order (cars.json `order`), climb from the first car's values by one step per car:
//   kwPerT   engine power per loaded tonne (empty mass + load); the engine's torqueScale is set to give it
//   grip     physics.tireGrip, all surfaces       mudPull  physics.mudPull, deep mud in L (higher = less bog drag)
//   price    the first car you buy (rank 2); every later car costs priceStep more. Rank 1 cars are free.
// Car i (0 = first) gets value + i x step. The first FREE_STARTER_SHARE of a class are rank 1 (free); the rest spread evenly over
// ranks 2 to the top rank (RANK_XP.length).
export const CLASS_LADDER = {
  scout:        { kwPerT: 30, kwPerTStep: 0.5238,  grip: 1.0,  gripStep: 0.0079, mudPull: 1.0, mudPullStep: 0.0262,  price: 6000,  priceStep: 943 },
  highway:      { kwPerT: 20, kwPerTStep: 0.1885, grip: 1.0,  gripStep: 0.0075, mudPull: 1.0, mudPullStep: 0.0242, price: 10800, priceStep: 1615 },
  'heavy-duty': { kwPerT: 18, kwPerTStep: 0.2541,  grip: 1.0,  gripStep: 0.0076, mudPull: 1.0, mudPullStep: 0.0254,  price: 15600, priceStep: 2389 },
  offroad:      { kwPerT: 22, kwPerTStep: 0.3231,  grip: 1.05, gripStep: 0.0075, mudPull: 1.2, mudPullStep: 0.0242, price: 20400, priceStep: 2908 },
  heavy:        { kwPerT: 8,  kwPerTStep: 0.2727,  grip: 1.1,  gripStep: 0.0065, mudPull: 1.5, mudPullStep: 0.0191, price: 25200, priceStep: 3655 },
};

// ---------- rank ----------
// XP needed in total to reach each rank, rank 1 to 40 (user, 2026-11-22: 40 ranks up to 75,000 XP; it was 20 up to 60,000). Each step
// is about 85 XP bigger than the one before: 300 XP to rank 2, 3,550 for the last. Reaching a rank opens the trucks with that
// unlockRank (cars.json), to buy for their price. Each class's first FREE_STARTER_SHARE of trucks (rounded up) are free from the start.
export const RANK_XP = [0, 300, 675, 1150, 1725, 2350, 3075, 3900, 4800, 5775, 6850, 8000, 9250, 10575, 11975, 13475, 15050, 16725, 18475, 20300, 22225, 24250, 26325, 28525, 30775, 33125, 35575, 38075, 40700, 43375, 46150, 49025, 51975, 55000, 58125, 61325, 64625, 68000, 71450, 75000];
export const FREE_STARTER_SHARE = 1 / 20;    // 3 free trucks in a class of 41 to 60
export const STARTING_RANK = 1;              // local testing value; manually reset to 1 for Google Play
export const XP_PER_METRE = 0.035;            // for new ground, as the truck gets further along the trail
export const XP_PER_BOG = 10;                 // for getting through a deep bog
export const XP_PER_DELIVERY = 100;           // for reaching the depot
export const MISSION_BASE_XP = 50;           // a mission pays this x (difficulty 0.6 to 1.8 + twist shares + lock share) x class: about 40 to 150 XP
export const XP_BY_CLASS = { scout: 1, highway: 1.15, 'heavy-duty': 1.3, offroad: 1.45, heavy: 1.6 };   // harder classes earn more

// ---------- coins ----------
export const STARTING_COINS = 20000;              // local testing value; manually reset to 20000 for Google Play
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
  destroyer: { seconds: 12, cooldown: 40 },   // ploughs through deep mud and smashes every log, pipe, rock and prop it touches
  shockwave: { seconds: 0.9, cooldown: 35 },  // one blast that breaks everything just ahead; `seconds` is how long the ring is drawn
  repair: { seconds: 3, cooldown: 60 },       // fuel and repairs on the spot, poured in over `seconds`
  timefreeze: { seconds: 10, cooldown: 45 },  // the run's clock stops: timed missions and best times do not count these seconds
  lucky: { seconds: 0, cooldown: 40 },        // a random one of the others each tap, for that power's own time
};
export const TIMEFREEZE_COLOR = '#bfe8ff';
export const LUCKY_COLOR = '#f2c21a';
export const DESTROYER_COLOR = '#ff6a1a';     // the fiery glow of a truck on Destroyer
export const SHOCKWAVE_RANGE_M = 32;          // how far ahead of the nose the blast reaches (and SHOCKWAVE_BEHIND_M behind it)
export const SHOCKWAVE_BEHIND_M = 4;
export const SHOCKWAVE_COLOR = '#9fdcff';
export const REPAIR_FUEL = 50;                // % of a tank the Repair power adds
export const REPAIR_DAMAGE = 60;              // % of damage it takes away
export const REPAIR_COLOR = '#39e66a';
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
export const BRAKE_HISS_GAP_S = 1.5;          // a brake hiss or handbrake sound plays at most once in this many seconds, so pumping the pedal does not repeat it
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

// Fuel.
export const GLOBAL_FUEL_BURN_MULTIPLIER = 1.0; // scales every truck's fuel burn

// ---------- a fully upgraded car never gets stuck (user decision, 2026-11-22) ----------
// With all four garage knobs at 100 (tuning.js sets physics.neverStuck) mud and creek beds stop holding the truck: its tyres keep
// at least NEVER_STUCK_MU grip there (less than dirt's 0.95, so mud still feels slippery), and instead of the bog drag that holds a
// slow tyre, mud only slows it with a drag that grows with speed and is nothing at a standstill, so it is slower than firm ground
// but can never pin the truck. At a deep bog's centre the drag is 1 + NEVER_STUCK_BOG_DRAG times as strong.
export const NEVER_STUCK_MU = 0.6;
export const NEVER_STUCK_MUD_DRAG = 0.3;      // m/s² of slowing for each m/s of speed in mud
export const NEVER_STUCK_BOG_DRAG = 2;
export const NEVER_STUCK_CLIMB_MU = 3;          // and at least this grip on logs, pipes and rocks, so a tyre climbs even a steep face
// It can still flip: no truck is held upright, players balance it on the gas and brake (user decision, 2026-11-23).

// ---------- heavy-mud maps (user request, 2026-11-20) ----------
// A map listed here has its mud made harder than its season.json says, so its difficulty is tuned in one place (1 = as written).
//   sink      how far tyres sink, in ordinary mud and in the deep bogs
//   hold      how hard the mud holds a tyre back: bog drag, suction and the deep bogs' extra pull
//   grip      grip left in the mud (under 1 = slicker)
//   bogHalfM  half of each deep bog's length, metres (10 on every other map)
// Where the bogs are is the map's own data: trail.heavyMud in its season.json (one entry per bog centre).
export const MUD_HARDNESS = {
  'gumbo-bottoms': { sink: 1.15, hold: 1.2, grip: 0.92, bogHalfM: 14 },
};

// ---------- atmosphere and lens (src/render/layers/atmosphere.js, src/render/lens.js) ----------
// Each map picks its weather in season.json render.atmosphere; these are the shared numbers.
export const WEATHER_COUNTS = { rain: 240, drizzle: 110, ash: 150, embers: 40, leaves: 55, dust: 12, grit: 80, pollen: 60, butterflies: 7, snow: 120 };  // at density 1 on a 1440 × 810 screen
export const WEATHER_PHONE_SHARE = 0.6;       // touch screens draw this share of them
export const WEATHER_NEAR_DEPTH = 0.8;        // particles nearer than this draw in front of the trucks, the rest behind the trail
export const BIRD_FLOCK_EVERY_S = [12, 28];   // a flock crosses the sky this often (random between the two)
export const MIST_BASE = 0.58;                // the fog's thick base, as a share of the screen height from the top (fixed on screen, like the backdrop)
export const LIGHTNING_EVERY_S = [16, 34];    // on a map with lightning
export const TUMBLEWEED_EVERY_S = [3, 9];     // on a map with tumbleweeds, one rolls in this often (at most two at once)
export const LENS_MAX_SPLATS = 8;            // mud and water drops on the camera at once
export const LENS_MUD_S = 2.5;                // how long mud thrown at the camera stays
export const LENS_DROP_S = 2.6;               // how long a water drop stays

// ---------- the shop (user, 2026-11-22): coins, ranks, single trucks and bundles, for real money once payments are added ----------
// Until then every purchase goes through the test store (src/game/store.js) and is granted at once; prices are shown anyway.
// Prices are US dollars as placeholders: the real store will show Google Play's localized prices. A truck bought here is owned
// whatever its rank. See deployment-step-by-step.md (Part 6) for the payment side.
export const NOTIFY_DAYS = [1, 3, 7];           // reminders: days after the player last left the game (src/game/notifications.js)
export const NOTIFY_HOURS = [17, 20];          // between these hours of the evening, local time
export const NOTIFY_ASK_AGAIN_DAYS = 3;        // after 'Not now', ask once more this many days later, then never
export const PRIVACY_URL = 'https://jefta-jose.github.io/Heavy-Haul/privacy-policy.html';   // site/privacy-policy.html, published by .github/workflows/pages.yml; linked from Settings
export const PLAY_VERIFY_URL = '';              // the purchase verifier (functions/verify-purchase); '' grants on the device (testing only, see deployment-step-by-step.md)
export const PLAY_REFUNDS_URL = '';             // the refund check (functions/verify-purchase, entry point voided); '' turns it off (src/game/refunds.js)
export const REFUND_CHECK_HOURS = 12;          // ask about refunds at most this often
export const SHOP_TEST_PURCHASES = true;      // true: BUY grants at once, nothing is charged. Set false only when a real store is wired in
// Prices follow what successful mobile games sell (Hill Climb Racing 1 and 2, CSR 2, Asphalt Legends, Clash Royale, read from
// their App Store listings on 2026-11-24): the standard price points $0.99 / 1.99 / 2.99 / 4.99 / 9.99 / 19.99 / 49.99, coin
// value per dollar that clearly grows with the pack (Hill Climb Racing goes from 75k to 200k coins a dollar), and cheap
// one-time starter packs that are the best value in the shop.
export const SHOP_COIN_PACKS = [               // [coins, price, tag]: 25k coins a dollar at the bottom, 60k at the top
  [25000, 0.99, ''],
  [60000, 1.99, ''],
  [175000, 4.99, 'Popular'],
  [400000, 9.99, ''],
  [1000000, 19.99, ''],
  [3000000, 49.99, 'Best value'],
];
export const SHOP_RANK_PACKS = [               // [ranks gained, price, tag]: moved to market price points on 2026-11-24 (was $10-40;
  [2, 4.99, ''],                            // the games above top out near $20), cheaper per rank in the bigger packs. Only these
  [4, 9.99, ''],                            // packs give ranks; a pack that would pass the top rank cannot be bought
  [5, 11.99, 'Popular'],                    // (at rank 34, +8 is greyed out)
  [8, 19.99, 'Best value'],
];
export const SHOP_CLASS_PACK_PRICE = 12.99;    // every truck of one class
export const SHOP_NEXT_FIVE_PRICE = 4.99;      // the next truck you do not own in every class (five trucks)
export const SHOP_TOP_FIVE_PRICE = 9.99;       // the strongest truck of every class
export const SHOP_ROOKIE_PACK = [50000, 0.99];            // [coins, price]: once only, the coins and a Scout from the middle ranks
export const SHOP_ROOKIE_TRUCK_RANK = 20;      // the Rookie pack's Scout opens at about this rank (user, 2026-11-24: not one unlocked almost at once)
export const SHOP_STARTER_BUNDLE = [300000, 2.99];        // [coins, price]: once only, about 100k coins a dollar (no ranks: only rank packs give those)
export const SHOP_MAPS_PACK_PRICE = 4.99;                 // every map not owned yet (each is 100K coins otherwise)
export const SHOP_EVERYTHING = [1000000, 49.99];          // [coins, price]: every truck, every map and the coins (no ranks)

// ---------- maps (user, 2026-11-22): two are free, the rest are bought once with coins in the garage's Seasons page ----------
export const FREE_SEASONS = ['swamp-summer', 'spring-thaw'];   // Blackwater Swamp (the default map) and Meltwater Pass (the first card)
export const SEASON_PRICE = 100000;           // coins for each other map

// ---------- the feel of the run ----------
export const SLOWMO_BUMP = 0.92;              // a landing this hard plays briefly in slow motion
export const SLOWMO_SCALE = 0.45, SLOWMO_SECONDS = 0.35;
// Big air is a real jump (user, 2026-11-24: not a crawl over a log): every wheel off the ground for AIR_MIN_S, leaving the
// ground at AIR_MIN_KMH or more (a highway crest, a fast roller) and at least AIR_MIN_HEIGHT_M up at its highest
export const AIR_MIN_S = 0.8;
export const AIR_MIN_KMH = 45;
export const AIR_MIN_HEIGHT_M = 0.8;
export const COINS_PER_AIR_S = 40;            // and pays this a second in the air
export const CRUSH_STREAK_S = 2.5;            // things crushed this close together make a streak; 3 or more get a call-out

// ---------- ghost of the best run ----------
export const GHOST_SAMPLE_S = 0.1;            // the best delivery on each map is recorded this often and replayed beside you
export const GHOST_ALPHA = 0.38;

// ---------- a storm rolls in (2026-11-24) ----------
// Some runs on these maps turn wet partway along: rain fades in and the mud loses grip.
export const STORM_MAPS = ['swamp-summer', 'autumn-forest', 'gumbo-bottoms', 'spring-thaw', 'jungle-monsoon', 'highland-quarry'];
export const STORM_CHANCE = 0.35;             // the share of runs that get one
export const STORM_STARTS_AT = [0.2, 0.55];   // where along the trail it starts (share of its length)
export const STORM_RAMP_S = 18;               // how long the rain takes to set in
export const STORM_RAIN = 0.9;                // rain density at its heaviest
export const WET_MUD_GRIP_LOSS = 0.15;        // mud grip lost in full rain (a fully upgraded truck keeps its never-stuck grip)

// ---------- coming back every day ----------
export const DAILY_COINS = 15000;             // the daily challenge (one contract a day, among the missions)
export const WEEKLY_COINS = 60000;            // the weekly challenge (harder: two twists)
export const STREAK_COINS = [2000, 3000, 4000, 6000, 8000, 10000, 25000];   // day 1 to 7 of coming back in a row; then it starts over

// ---------- Google Play Games: leaderboards and achievements ----------
// Ids come from Play Console (Grow > Play Games Services > Leaderboards / Achievements). An empty id is skipped, so nothing is
// sent until they are filled in. Leaderboards: the fastest delivery on each map, in milliseconds, lower is better.
export const PLAY_LEADERBOARDS = {
  'swamp-summer': '', 'spring-thaw': '', 'autumn-forest': '', 'desert-wash': '', 'gumbo-bottoms': '',
  'highland-quarry': '', 'jungle-monsoon': '', 'volcanic-ash': '',
};
// Achievements: `stat` is a counter the game keeps (achievements.js); `of` is the goal. Make one with of > 1 incremental in
// Play Console with exactly that many steps.
export const PLAY_ACHIEVEMENTS = [
  { id: '', stat: 'deliveries', of: 1, name: 'First delivery' },
  { id: '', stat: 'deliveries', of: 50, name: 'Fifty deliveries' },
  { id: '', stat: 'bogs', of: 100, name: 'Bog walker: 100 deep bogs' },
  { id: '', stat: 'crushes', of: 500, name: 'Crusher: 500 things crushed' },
  { id: '', stat: 'classes', of: 5, name: 'Every class delivered' },
  { id: '', stat: 'storms', of: 10, name: 'Storm chaser: 10 deliveries in the rain' },
  { id: '', stat: 'dailies', of: 7, name: 'Seven daily challenges' },
  { id: '', stat: 'bigAir', of: 1, name: 'Airborne: 2 s in the air' },
  { id: '', stat: 'rank', of: 40, name: 'Top rank' },
];
