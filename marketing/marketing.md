# Heavy Haul: marketing kit

Everything here is for making marketing content and Play Store graphics with ChatGPT (or a designer). Attach the images
each prompt names: ChatGPT keeps the trucks and maps on-model far better when it can see them.

## The game in one breath

**Heavy Haul** is a 2D side-on off-road trucking game for Android.
- **Trucks:** 269 original trucks in five classes: Scouts (4×4 pickups, buggies and rally cars), Highway (semis and car
  carriers), Heavy Duty (dump trucks, cranes, fire engines), Off-road (6×6 and 8×8 expedition and army trucks, amphibians)
  and Heavy (mining giants, locomotive and rocket haulers, 12×12 rigs).
- **Maps:** 8 hand-painted maps, each with its own weather and sounds:
  - Blackwater Swamp (Louisiana bayou, summer)
  - Meltwater Pass (Cascade foothills, spring drizzle)
  - Copper Ridge (Vermont logging roads, autumn)
  - Coyote Wash (Utah canyons, dust and tumbleweeds)
  - Gumbo Bottoms (flooded Mississippi bottomland)
  - Slatecut Quarry (North Wales slate country)
  - Monsoon Canopy (Borneo rainforest, storms and thunder)
  - Cinder Caldera (Azores volcano, ash and embers)
- **Driving:** low range, AWD and DIFF lock to get through deep bogs, logs, pipes and rock gardens. A fully upgraded truck
  with AWD and DIFF on never gets stuck, but anything can still flip: you balance it on the gas and brake.
- **Loads:** many trucks carry one: logs, ore, pipes, fuel, a yacht, a locomotive, an elephant family.
- **Missions:**
  - Every map has featured story contracts, like "Bayou Doctor" (insulin for the stilt houses) and "Before the Flood"
    (beat the monsoon).
  - Every truck has its own signature haul on its home map.
- **Progression:** 40 ranks, upgrades (engine, suspension, speed, grip), powers (Nitro, Invincible), coins and a shop.

Tagline ideas: "Big rigs. Bad roads. No tow truck coming." · "269 trucks. 8 wild maps. One deep bog at a time."

## Art rules for anything ChatGPT makes
- Original designs only: **no real truck makes, badges, grilles or logos** (no Volvo, Kenworth, BelAZ and so on).
- Every tyre is a perfect circle, sized to its truck, all wheels on one level ground line in side views.
- The game's look: painterly, richly detailed, saturated but natural colour, mud and wear on the trucks, warm light.
- The **Heavy Haul logo** (`images/brand/heavy-haul-logo.png`) is used exactly as it is. Don't redraw or restyle it.

## What's in `images/`

| Folder | What | Use |
|---|---|---|
| `brand/` | `heavy-haul-logo.png` (the master, 1254×1254), `icon-512.png` (Play icon), `feature-graphic-1024x500.png` (current Play banner) | logo and store basics |
| `trucks/<class>/` | **Singles:** every truck alone on white, 1600 px wide (269 files, named by truck id) | reference for one truck, hero art, social posts |
| `sheets/` | **Multiples:** `class-<class>-N.jpg` (every truck of a class, with name, drive, rank and load), `fleet-overview.jpg` (the three strongest of each class), `lineup-to-scale.jpg` (one of each class at true size), `maps.jpg` (all 8 maps) | "the fleet" posts, choosing heroes, giving ChatGPT the style |
| `maps/` | each map's painted backdrop | backgrounds for banners and posts |
| `gameplay/` | real screenshots: `landscape-<map>.jpg` (1920×1080, a hero truck on every map), `phone-<map>.jpg` (1996×998, exactly 2:1, phone HUD), `garage-*.jpg` (trucks, maps, missions, shop and upgrade screens) | Play Store screenshots, as is or framed with captions |

Hero truck per map in the screenshots:
- Blackwater Swamp: Mire King, carrying an elephant
- Meltwater Pass: Fjord Otter
- Copper Ridge: Log Giant
- Coyote Wash: Baja Hammer
- Gumbo Bottoms: Amphibian
- Slatecut Quarry: Quarry Colossus
- Monsoon Canopy: Rescue Hawk
- Cinder Caldera: Magma

## Play Store requirements (so the prompts ask for the right sizes)
- **Icon:** 512×512 PNG. Done: `brand/icon-512.png`.
- **Feature graphic:** 1024×500 JPG or PNG. It shows on top of the listing and in promotions, and the play button covers its
  centre when there's a video.
- **Phone screenshots:** 2 to 8, each side 320 to 3840 px, and the long side at most twice the short side (16:9 is safe). To be featured, give at least 4 landscape
  screenshots at 1080 px or more. The `landscape-*` shots qualify as they are.
- **Tablet screenshots** (optional): 7- and 10-inch. The 1920×1080 shots work.
- **Short description:** at most 80 characters. **Full description:** at most 4000.
- **Promo video** (optional): a YouTube link.

---

## Prompts for ChatGPT

Paste one at a time. Each starts with the images to attach.

### 1. Play Store feature graphic (1024×500)
Attach: `brand/heavy-haul-logo.png`, `gameplay/landscape-autumn-forest.jpg`, `gameplay/landscape-volcanic-ash.jpg`,
`sheets/fleet-overview.jpg`.

> Create a Google Play feature graphic for my mobile game Heavy Haul, exactly 1024×500 pixels, landscape. Use the attached
> Heavy Haul logo exactly as it is, unchanged, on the left third, about 420 px tall. On the right, a dramatic side-on scene
> in the same painterly style as the attached gameplay screenshots: a big off-road truck from the attached fleet sheet,
> crawling through deep mud over logs on a forest trail at golden hour, mud spraying from its tyres. Every tyre must be a
> perfect circle and all wheels must sit on the ground. No real truck brands, badges or logos anywhere. Keep the centre of
> the image free of important detail, because a play button may cover it. No other text besides the logo. Rich, warm,
> saturated colour, high detail.

### 2. Alternative feature graphics (one per season, for seasonal promotions)
Attach: the logo, the map's `gameplay/landscape-<map>.jpg` and `maps/<map>.jpg`.

> Create a 1024×500 Google Play feature graphic for Heavy Haul in the style of the attached screenshot. Theme: [Monsoon
> Canopy: a 6×6 rescue truck in a jungle thunderstorm, lightning over the canopy, rain streaks, a flooded trail]. Put the
> attached logo, unchanged, top left at about 300 px tall. Side-on view, the truck crossing from right to left. Perfect
> circular tyres on the ground, no real brands, no extra text, keep the centre clear.

Swap the theme for the other maps:
- Copper Ridge: a log truck under red and gold autumn trees, leaves blowing across the road.
- Coyote Wash: a desert racer in red-rock canyons, dust and tumbleweeds.
- Cinder Caldera: a mining dump truck under a smoking volcano, glowing embers and ash.
- Blackwater Swamp: an 8×8 carrying an elephant through the bayou, Spanish moss.
- Slatecut Quarry: a giant ore hauler in a slate quarry.
- Meltwater Pass: a pickup in spring drizzle by a waterfall.
- Gumbo Bottoms: an amphibious truck in brown floodwater.

### 3. Captioned Play Store screenshots (16:9, 1920×1080)
Attach: one `gameplay/landscape-<map>.jpg` at a time, plus the logo.

> This is a real screenshot of my game Heavy Haul. Turn it into a Google Play store screenshot at 1920×1080: keep the
> screenshot itself unchanged and recognisable, scale it to about 88% and place it slightly lower and centred, with a
> rounded corner and a soft shadow, over a dark, blurred version of the same scene. Add one bold caption at the top in
> chunky condensed capitals, white with a yellow (#F2C21A) highlight on the key word: "[CAPTION]". Small Heavy Haul logo,
> unchanged, in the top-left corner. No other text, no device frame.

Captions to use, one per screenshot:
1. "269 TRUCKS. **ZERO** TOW TRUCKS." (Copper Ridge log truck)
2. "LOCK THE **DIFF**. CRAWL THE BOG." (Gumbo Bottoms amphibian)
3. "HAUL **ANYTHING**. EVEN AN ELEPHANT." (Blackwater Swamp, Mire King)
4. "8 WILD MAPS. **REAL** WEATHER." (Monsoon Canopy storm)
5. "FROM PICKUPS TO **MINING GIANTS**" (Slatecut Quarry)
6. "STORY **MISSIONS** ON EVERY MAP" (use `garage-missions-desktop.jpg`)
7. "UPGRADE TILL IT **NEVER** GETS STUCK" (use `garage-upgrade-desktop.jpg`)
8. "VOLCANOES. ASH. **NO BRAKES?**" (Cinder Caldera)

### 4. Phone screenshots in portrait (9:16), if you want them
Attach: two `gameplay/phone-<map>.jpg` shots.

> Make a 1080×1920 portrait Google Play screenshot for Heavy Haul from the two attached landscape gameplay screenshots:
> stack them vertically, each unchanged with rounded corners, on a dark mud-brown textured background. A bold caption
> above in condensed capitals: "[CAPTION]". The attached logo, unchanged, small at the bottom. No device frames.

### 5. The fleet poster (social media, 1080×1350)
Attach: `sheets/fleet-overview.jpg`, `sheets/lineup-to-scale.jpg`, the logo.

> Design a 1080×1350 social media poster for Heavy Haul called "THE FLEET". Arrange about ten of the attached trucks in a
> dramatic side-on line-up, smallest (a 4×4 scout) in front to the largest (a mining giant) at the back, on a muddy trail
> at sunset, in the painterly style of the attached art. Keep each truck's design exactly as shown: colours, loads, wheel
> count. Every tyre a perfect circle on the ground. No real brands. Logo unchanged at the top, "269 TRUCKS · 5 CLASSES"
> under it.

### 6. Truck of the week (social media, square 1080×1080)
Attach: one single from `trucks/<class>/<id>.jpg` and its map's `maps/<map>.jpg`.

> Create a 1080×1080 "Truck of the Week" post for Heavy Haul. Place the attached truck, keeping its design exactly, side-on
> on a trail in the attached map, mid-action (splashing through mud or climbing a log). Add a dark slanted info plate in the
> bottom left with the truck's name "[NAME]", its class "[CLASS]" and one line "[ONE-LINE HOOK]". Logo unchanged, small,
> top right. Perfect circular tyres, no real brands.

### 7. Short video / trailer script (30 seconds)
Attach: `sheets/maps.jpg`, `sheets/fleet-overview.jpg`.

> Write a 30-second trailer script for my mobile game Heavy Haul, as a shot list with timings, on-screen text and sound
> notes. The game: [paste "The game in one breath" above]. Beats: a pickup stuck in a bog, AWD and DIFF on, it claws out;
> quick cuts through the 8 maps (rain, autumn leaves, desert dust, volcano ash); bigger and bigger trucks (a log truck, a
> rocket hauler, a mining giant); a near-rollover saved on the brake; an elephant on the back of an 8×8; the logo. Upbeat,
> gritty, no voice-over, 6 to 8 words of on-screen text at most per shot.

### 8. Store listing text
> Write the Google Play listing for my game Heavy Haul. [paste "The game in one breath"]. Give me: (1) three options for
> the 80-character short description; (2) a full description under 4000 characters: hook paragraph, then sections with
> short bulleted lists (trucks, maps, missions, upgrades, controls), friendly and punchy, no false claims, no mention of
> real truck brands; (3) 10 keywords players would search for. It's free to play with optional in-app purchases (coins,
> rank packs, trucks, maps, a $0.99 rookie pack), and there are no ads.

### 9. Social media calendar (one month)
> Make a 4-week social media plan for Heavy Haul (Instagram, TikTok, YouTube Shorts): 3 posts a week. Mix truck of the week,
> map spotlights, "can it get through?" mud challenges, mission stories (Bayou Doctor, Before the Flood, Ash Fall
> Evacuation), behind-the-scenes and player challenges. For each: format, caption, hashtags, and which images from my kit
> to use (trucks/<class>/<id>.jpg, maps/<map>.jpg, gameplay/landscape-<map>.jpg, sheets/*.jpg).

### 10. Press / launch announcement
> Write a short launch announcement (200 words) and a one-paragraph press blurb for Heavy Haul, an Android off-road
> trucking game. [paste "The game in one breath"]. Tone: confident, fun, specific numbers. End with "Get it on Google Play".

## Making more images yourself
- Truck singles and sheets: rebuild from the game's art. The script is in this conversation's history; ask Claude to "rebuild
  the marketing images" after adding trucks.
- Fresh gameplay screenshots: `node tools/shots.mjs maps marketing/images/gameplay` (a hero truck on every map, at
  1920×1080 and phone size). Change the heroes in `tools/shots.mjs` (the `heroes` list).
- Garage screenshots at four sizes: `node tools/shots.mjs pages` (writes to `output/sweep/`).
