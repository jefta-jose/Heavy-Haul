# Five new seasons: ChatGPT art prompts

Five planned maps, each a muddy season in a new biome on Blackwater Swamp's recipe ([`swamp-summer/README.md`](swamp-summer/README.md)). **No ice and no snow anywhere:** every car is tuned for mud, so each map's soft ground is real wet mud in the biome's colour. Every obstacle comes from the place itself.

| # | Folder | Name | Biome | Mud | Round obstacles |
|---|---|---|---|---|---|
| 1 | `desert-wash` | Coyote Wash | Red-rock desert canyon after a monsoon storm | Red clay flood mud | a rusty steel pipeline section, a weathered |
| 2 | `highland-quarry` | Slatecut Quarry | Rainy highland moor around a slate quarry (the rocky map) | Grey slate slurry and peat | a heavy steel quarry conveyor roller, a thick round timber mine prop of wet dark wood |
| 3 | `jungle-monsoon` | Monsoon Canopy | Rainforest in the wet season (the muddiest map) | Orange-red laterite | a huge smooth hardwood log, a tight round bundle of thick green bamboo poles tied |
| 4 | `volcanic-ash` | Cinder Caldera | Green volcanic island inside an old crater | Black ash mud | a rusty insulated geothermal steam pipe, a smooth charred tree trunk |
| 5 | `mars-colony` | Ares Basin | Young colony on a red planet | Rust-red brine mud | a white and grey habitat conduit pipe, an empty dented gas cylinder lying on its side |

## How to use this

1. Start a **new ChatGPT chat for each season** and paste that season's **Rules** paragraph first. It sets the style, the magenta fallback background and the no-ice rule for the whole chat.
2. Paste the image prompts one at a time, in order. Download each image and save it as the file name shown above the prompt, in `assets/seasons/<folder>/source/`. If ChatGPT drifts (wrong style, text, shadows, perspective), paste the Rules paragraph again, then the prompt.
3. Redo an image only for a real defect: wrong subject, text or logos, a vehicle or ice where there should be none, a tapered round obstacle, a tall spiky prop, or an object touching the image edge. Save redos as `-v2`, `-v3`.
4. When a season's set is done, tell Claude **"<season> art is done"**. Claude does the rest: cuts out the magenta, crops and trims, makes the tiles seamless and the strips wide, measures the horizon, round faces and the speed sign, traces hulls, writes `season.json`, lays out the trail and makes it playable. Keep generating the next season meanwhile.

ChatGPT images are at most 1536×1024, so the panorama is 3:2 rather than 3:1 and the road strips are not as wide as the swamp's; Claude stretches and mirrors them. You do not need to fix that.

**Round obstacles and props must be low.** The game caps anything hard at 0.65 m tall, so a prop that comes back tall or spiky is worth one redo with "make it lower and wider" added.

---

## 1. Coyote Wash (`desert-wash`)

Folder: `assets/seasons/desert-wash/source/`

**Rules** (paste first)

> For every image in this chat: you are making art for a 2D side-scrolling off-road truck game. This season is "Coyote Wash", a red-rock desert canyon after a summer monsoon storm. Palette: terracotta, ochre, cream, sage green and deep turquoise sky. Style: premium semi-realistic hand-painted game illustration with readable dark contours, weathered materials, rich natural texture and soft even daylight, the same style in every image. Objects are drawn in a flat straight-on side view with no perspective; textures are top-down only when I say so. Never draw ice, snow or frost: soft ground is always wet mud. No vehicles unless I ask for a wreck, no people, no animals, and no text, letters, numbers, logos, brands, flags or watermarks unless I give exact wording. Objects go on a real transparent background; if you cannot make one, use a perfectly flat solid magenta #FF00FF background with no gradient, shadow, ground or glow, and no magenta in the object. Show the whole object with a clear margin, nothing touching the image edge. Make each image at the size I give, as large as you can. Generate straight away without asking questions, one image per message. Reply "ready" to this message.

**1. `backdrop-v1.png`** (backdrop)

> Wide landscape image, 1536×1024, fully opaque, side view, no road, no vehicles, no people, no text. Scene: a red-rock desert canyon just after a summer storm, full of life. A warm late-afternoon sun with soft rays breaking through the last torn storm clouds in a deep turquoise sky, a faint rainbow on one side. Big characterful sandstone buttes and mesas in terracotta and cream bands on both sides, then two or three layers of hazier violet mesas fading into the distance. Tall branching cacti, flowering desert shrubs and a few green mesquite trees in the middle ground. A wide shallow red wash with puddles reflecting the sky, along a horizontal line about two thirds of the way down the image. Below that line the bottom third is one flat calm band of a single soft terracotta colour with no detail at all, because a game road covers it. Clean, simple painted game illustration with flat shapes, soft gradients and little fine texture. Bright and full of life, not grey, foggy or hazy.

**2. `road-edge-v1.png`** (roadEdge)

> Wide landscape image, 1536×1024. A long horizontal band of terrain: the front edge of a thick desert canyon road seen straight on from the side. The band is packed red clay with pale sandstone pebbles, dry grass tufts and small roots, with drips of wet red mud hanging below. It runs across the full width of the image and touches the left and right edges at the same height; it is about a third of the image tall and sits in the middle. Its top edge is fairly straight and even, as if it continues back into a flat road; its bottom edge is irregular with small clumps and drips hanging down. Evenly detailed, no big feature, no focal point, no puddles, no tracks, nothing larger than a fist. Everything above and below the band is a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself.

**3. `road-far-v1.png`** (roadFar)

> Wide landscape image, 1536×1024. A long horizontal strip for the far side of a desert canyon road, seen from the side: low sagebrush, bunch grass and small yellow-flowering shrubs on a thin band of red earth. The plants form a low, irregular line along the top of a thin band of dark ground; the bottom of the band is perfectly straight and fully solid. It runs across the full width of the image and touches the left and right edges at the same height, sitting in the lower middle of the image. Soft, slightly hazy and low contrast, because it sits behind the action. No big plants, no trees, no focal point. Everything above the plants and below the band is a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself.

**4. `road-soil-v1.png`** (roadSoil)

> Wide landscape image, 1536×1024, fully opaque, filling the whole canvas. A flat straight-on cut-away cross-section of earth, like the side wall of a trench: layered red and ochre sediment like a canyon wall, with small pebbles and thin pale roots, getting near-black toward the bottom. Subtle horizontal layering, low contrast and calm, because game buttons will sit on top of it. Evenly detailed with no big feature, no horizon, no sky, no grass, no perspective. Left and right edges match in brightness and pattern.

**5. `ground-v1.png`** (ground)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: sun-baked red desert dirt with fine cracks, small pebbles and packed sand. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**6. `wet-mud-v1.png`** (wetmud)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: wet terracotta clay mud, churned and sticky. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**7. `granite-v1.png`** (granite)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: pale sandstone slickrock with fine curved layering. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**8. `deep-mud-v1.png`** (deepMud)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: deep dark red flood mud. It must read as visibly darker, wetter and softer than ordinary mud: matte, with no sky reflections and no bright glints. Uniform scale, soft even light, no perspective, no borders. Opposite edges connect with no visible seam.

**9. `reeds-v1.png`** (reeds)

> Square image, 1024×1024. One roadside plant clump for a red-rock desert canyon after a summer monsoon storm: desert grass, silvery sage and a small paddle cactus with yellow flowers. Flat side view, growing up from one level base line at the bottom of the clump, about as wide as it is tall. Full and lively. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**10. `rock-v1.png`** (rock)

> Landscape image, 1536×1024. One isolated rock for a desert canyon road: a low, broad, wind-rounded sandstone boulder with layered red and cream bands. Flat side view with a slight elevation, about twice as wide as it is tall, with a flat bottom edge that sits on the road. Readable chunky shape with weathered detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**11. `pipe-v1.png`** (pipe)

> Landscape image, 1536×1024. One obstacle lying across a desert canyon road: a rusty steel pipeline section with a bolted flange ring at its near end and desert dust on top. Seen from the side with a slight elevation: its near end is a clean, perfectly round circle facing the viewer, and its body runs straight back behind that circle at exactly the same diameter, with no perspective taper and no narrowing. The end circle is large and fills most of the image height. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**12. `pole-v1.png`** (logCrossing)

> Landscape image, 1536×1024. One obstacle lying across a desert canyon road: a weathered, sun-bleached wooden telegraph pole lying on its side, with deep cracks. Seen from the side with a slight elevation: its near end is a clean, perfectly round circle facing the viewer, and its body runs straight back behind that circle at exactly the same diameter, with no perspective taper and no narrowing. The end circle is large and fills most of the image height. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**13. `branch-pile-v1.png`** (branchPile)

> Landscape image, 1536×1024. One low, wide obstacle on a desert canyon road: a low heap of dry tumbleweeds and dead brush. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**14. `root-tangle-v1.png`** (rootTangle)

> Landscape image, 1536×1024. One low, wide obstacle on a desert canyon road: a low tangle of dead cactus skeleton ribs and dry twisted roots. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**15. `root-network-v1.png`** (rootNetwork)

> Landscape image, 1536×1024. One low, wide obstacle on a desert canyon road: thick exposed desert-tree roots spreading low across a small dirt bank. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**16. `buried-tyres-v1.png`** (buriedTyres)

> Landscape image, 1536×1024. One low, wide obstacle on a desert canyon road: three old truck tyres half buried upright in red sand, side by side. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**17. `boulder-steps-v1.png`** (boulderSteps)

> Landscape image, 1536×1024. One low, wide obstacle on a desert canyon road: a run of flat sandstone ledges rising left to right in two or three low steps. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**18. `concrete-slabs-v1.png`** (concreteSlabs)

> Landscape image, 1536×1024. One low, wide obstacle on a desert canyon road: broken adobe brick blocks beside a cracked slab of old concrete. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**19. `ridge-v1.png`** (iceRidge)

> Landscape image, 1536×1024. One low, wide obstacle on a desert canyon road: a low ridge of dried, cracked red mud crust pushed up by a flood. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**20. `steel-beams-v1.png`** (steelBeams)

> Landscape image, 1536×1024. One low, wide obstacle on a desert canyon road: two rusty railroad rails lying flat on a few old timber sleepers. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**21. `steel-plates-v1.png`** (steelPlates)

> Landscape image, 1536×1024. One low, wide obstacle on a desert canyon road: wind-bent sheets of rusty corrugated iron in a low pile. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**22. `fence-section-v1.png`** (fenceSection)

> Landscape image, 1536×1024. One straight section of roadside fence for a red-rock desert canyon after a summer monsoon storm: barbed-wire ranch fence with three strands on twisted wooden posts. Flat straight-on side view, no perspective, a post or matching flat end at each end so sections can join in a row, standing on one level base line. Weathered. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**23. `shack-v1.png`** (stiltShack)

> Landscape image, 1536×1024. One roadside object for a red-rock desert canyon after a summer monsoon storm: a small adobe ranch hut with a tin roof, a wooden porch, a water barrel and strings of red chillies drying. Flat straight-on side view with no perspective, standing on one straight, level base line. Lived in and full of story, bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**24. `wreck-v1.png`** (rustedPickup)

> Landscape image, 1536×1024. One roadside object for a red-rock desert canyon after a summer monsoon storm: a sun-bleached, rusted wreck of an old ranch pickup with flat tyres, an original design with no badges. Flat straight-on side view with no perspective, standing on one straight, level base line. Lived in and full of story, bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**25. `tower-v1.png`** (waterTower)

> Portrait image, 1024×1536. One roadside object for a red-rock desert canyon after a summer monsoon storm: a tall steel-lattice windmill water pump with a round wooden water tank beside its base. Flat straight-on side view with no perspective, standing on one straight, level base line. Bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**26. `warning-sign-v1.png`** (warningSign)

> Portrait image, 1024×1536. One roadside warning sign on a post, flat straight-on view: a yellow diamond sign with a black flash-flood pictogram of wavy water over a road, on a wooden post. No words, only the pictogram. The post stands on one level base line. Weathered, readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**27. `highway-sign-v1.png`** (highwaySign)

> Landscape image, 1536×1024. One green road sign on two posts, flat straight-on view, with white text exactly "HIGHWAY / COYOTE WASH" on two lines (spell it exactly like that and add nothing else), weathered by the red-rock desert canyon after a summer monsoon storm. The posts stand on one level base line. Clean and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**28. `speed-sign-v1.png`** (speedSign)

> Portrait image, 1024×1536. One round speed-limit sign on a single post, flat straight-on view: a thick red ring around a completely blank white face, with no number, letters or marks inside it at all. The post is dusty galvanised steel. The post stands on one level base line. Clean. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**29. `fuel-station-v1.png`** (fuelStation)

> Landscape image, 1536×1024. One small roadside fuel and repair stop for trucks in a red-rock desert canyon after a summer monsoon storm, flat straight-on side view with no perspective: a simple open canopy on two posts over one old fuel pump, with a small workshop to one side, adobe walls, a stack of tyres, oil drums and a water tank, with agave plants around the base, under a bright turquoise canopy. The space under the canopy stays open. Everything stands on one straight level base line. No vehicles, people, text, logos or numbers. Cheerful and easy to spot from far away. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

---

## 2. Slatecut Quarry (`highland-quarry`)

Folder: `assets/seasons/highland-quarry/source/`

**Rules** (paste first)

> For every image in this chat: you are making art for a 2D side-scrolling off-road truck game. This season is "Slatecut Quarry", a rainy highland moor around an old slate quarry. Palette: slate blue-grey, muted heather purple, moss green, rust orange and silver sky light. Style: premium semi-realistic hand-painted game illustration with readable dark contours, weathered materials, rich natural texture and soft even daylight, the same style in every image. Objects are drawn in a flat straight-on side view with no perspective; textures are top-down only when I say so. Never draw ice, snow or frost: soft ground is always wet mud. No vehicles unless I ask for a wreck, no people, no animals, and no text, letters, numbers, logos, brands, flags or watermarks unless I give exact wording. Objects go on a real transparent background; if you cannot make one, use a perfectly flat solid magenta #FF00FF background with no gradient, shadow, ground or glow, and no magenta in the object. Show the whole object with a clear margin, nothing touching the image edge. Make each image at the size I give, as large as you can. Generate straight away without asking questions, one image per message. Reply "ready" to this message.

**1. `backdrop-v1.png`** (backdrop)

> Wide landscape image, 1536×1024, fully opaque, side view, no road, no vehicles, no people, no text. Scene: a highland moor in late spring around an old slate quarry, full of life. Soft silver sunlight breaking through moving clouds, a bright patch of blue sky and rays falling on the hills. Big characterful terraced quarry walls of blue-grey slate with green moss and a thin white waterfall on one side, rolling heather hills and a lone rowan tree on the other, then two or three layers of hazier blue mountains fading into the distance. A still dark mountain lake with reeds and white cotton grass, along a horizontal line about two thirds of the way down the image. Below that line the bottom third is one flat calm band of a single soft grey-green colour with no detail at all, because a game road covers it. Clean, simple painted game illustration with flat shapes, soft gradients and little fine texture. Bright and full of life, not grey, foggy or hazy.

**2. `road-edge-v1.png`** (roadEdge)

> Wide landscape image, 1536×1024. A long horizontal band of terrain: the front edge of a thick highland quarry road seen straight on from the side. The band is packed grey slate chips and dark peat with moss, heather roots and flat slate shards, with drips of dark wet peat hanging below. It runs across the full width of the image and touches the left and right edges at the same height; it is about a third of the image tall and sits in the middle. Its top edge is fairly straight and even, as if it continues back into a flat road; its bottom edge is irregular with small clumps and drips hanging down. Evenly detailed, no big feature, no focal point, no puddles, no tracks, nothing larger than a fist. Everything above and below the band is a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself.

**3. `road-far-v1.png`** (roadFar)

> Wide landscape image, 1536×1024. A long horizontal strip for the far side of a highland quarry road, seen from the side: low heather, cotton grass and bracken on a thin band of dark peat. The plants form a low, irregular line along the top of a thin band of dark ground; the bottom of the band is perfectly straight and fully solid. It runs across the full width of the image and touches the left and right edges at the same height, sitting in the lower middle of the image. Soft, slightly hazy and low contrast, because it sits behind the action. No big plants, no trees, no focal point. Everything above the plants and below the band is a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself.

**4. `road-soil-v1.png`** (roadSoil)

> Wide landscape image, 1536×1024, fully opaque, filling the whole canvas. A flat straight-on cut-away cross-section of earth, like the side wall of a trench: dark peat over fractured slate layers with flat shards and thin roots, getting near-black toward the bottom. Subtle horizontal layering, low contrast and calm, because game buttons will sit on top of it. Evenly detailed with no big feature, no horizon, no sky, no grass, no perspective. Left and right edges match in brightness and pattern.

**5. `ground-v1.png`** (ground)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: crushed grey slate gravel with flat chips and moss in the gaps. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**6. `wet-mud-v1.png`** (wetmud)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: wet grey slate slurry mud, smooth and churned. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**7. `granite-v1.png`** (granite)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: blue-grey slate bedrock with straight cleavage lines and rain-darkened patches. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**8. `deep-mud-v1.png`** (deepMud)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: deep black-brown peat bog with a few drowned grass blades. It must read as visibly darker, wetter and softer than ordinary mud: matte, with no sky reflections and no bright glints. Uniform scale, soft even light, no perspective, no borders. Opposite edges connect with no visible seam.

**9. `reeds-v1.png`** (reeds)

> Square image, 1024×1024. One roadside plant clump for a rainy highland moor around an old slate quarry: heather, white cotton grass and a small fern. Flat side view, growing up from one level base line at the bottom of the clump, about as wide as it is tall. Full and lively. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**10. `rock-v1.png`** (rock)

> Landscape image, 1536×1024. One isolated rock for a highland quarry road: a low, broad, angular slate boulder with layered edges and moss. Flat side view with a slight elevation, about twice as wide as it is tall, with a flat bottom edge that sits on the road. Readable chunky shape with weathered detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**11. `roller-v1.png`** (pipe)

> Landscape image, 1536×1024. One obstacle lying across a highland quarry road: a heavy steel quarry conveyor roller with a short axle stub at its near end, rust and grey slate dust. Seen from the side with a slight elevation: its near end is a clean, perfectly round circle facing the viewer, and its body runs straight back behind that circle at exactly the same diameter, with no perspective taper and no narrowing. The end circle is large and fills most of the image height. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**12. `pit-prop-v1.png`** (logCrossing)

> Landscape image, 1536×1024. One obstacle lying across a highland quarry road: a thick round timber mine prop of wet dark wood with two iron bands. Seen from the side with a slight elevation: its near end is a clean, perfectly round circle facing the viewer, and its body runs straight back behind that circle at exactly the same diameter, with no perspective taper and no narrowing. The end circle is large and fills most of the image height. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**13. `branch-pile-v1.png`** (branchPile)

> Landscape image, 1536×1024. One low, wide obstacle on a highland quarry road: a low scree heap of loose broken slate shards. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**14. `root-tangle-v1.png`** (rootTangle)

> Landscape image, 1536×1024. One low, wide obstacle on a highland quarry road: a low heap of old frayed steel cable mixed with gorse roots. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**15. `root-network-v1.png`** (rootNetwork)

> Landscape image, 1536×1024. One low, wide obstacle on a highland quarry road: tree roots gripping a low slate shelf. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**16. `buried-tyres-v1.png`** (buriedTyres)

> Landscape image, 1536×1024. One low, wide obstacle on a highland quarry road: three huge old dump-truck tyres half buried upright in grey slurry. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**17. `boulder-steps-v1.png`** (boulderSteps)

> Landscape image, 1536×1024. One low, wide obstacle on a highland quarry road: a staircase of flat stacked slate slabs in two or three low steps. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**18. `concrete-slabs-v1.png`** (concreteSlabs)

> Landscape image, 1536×1024. One low, wide obstacle on a highland quarry road: a low stack of split roofing slates on a broken pallet beside a cracked concrete block. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**19. `ridge-v1.png`** (iceRidge)

> Landscape image, 1536×1024. One low, wide obstacle on a highland quarry road: a low ridge of grey slate slurry and gravel pushed up by a bulldozer. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**20. `steel-beams-v1.png`** (steelBeams)

> Landscape image, 1536×1024. One low, wide obstacle on a highland quarry road: two rusty narrow-gauge quarry rails and a broken cart axle lying flat. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**21. `steel-plates-v1.png`** (steelPlates)

> Landscape image, 1536×1024. One low, wide obstacle on a highland quarry road: rusted steel hopper plates and a bent chute in a low pile. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**22. `fence-section-v1.png`** (fenceSection)

> Landscape image, 1536×1024. One straight section of roadside fence for a rainy highland moor around an old slate quarry: a dry-stone wall of stacked slate with a mossy top and flat ends. Flat straight-on side view, no perspective, a post or matching flat end at each end so sections can join in a row, standing on one level base line. Weathered. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**23. `shack-v1.png`** (stiltShack)

> Landscape image, 1536×1024. One roadside object for a rainy highland moor around an old slate quarry: a small stone hut with a slate roof, a rusty stove pipe, a wooden door and a rain barrel. Flat straight-on side view with no perspective, standing on one straight, level base line. Lived in and full of story, bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**24. `wreck-v1.png`** (rustedPickup)

> Landscape image, 1536×1024. One roadside object for a rainy highland moor around an old slate quarry: a rusted wreck of an old quarry tipper truck, an original design with no badges. Flat straight-on side view with no perspective, standing on one straight, level base line. Lived in and full of story, bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**25. `tower-v1.png`** (waterTower)

> Portrait image, 1024×1536. One roadside object for a rainy highland moor around an old slate quarry: a rusty steel quarry winding tower with a big spoked wheel at the top. Flat straight-on side view with no perspective, standing on one straight, level base line. Bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**26. `warning-sign-v1.png`** (warningSign)

> Portrait image, 1024×1536. One roadside warning sign on a post, flat straight-on view: a yellow triangle sign with a black falling-rocks pictogram, on a steel post. No words, only the pictogram. The post stands on one level base line. Weathered, readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**27. `highway-sign-v1.png`** (highwaySign)

> Landscape image, 1536×1024. One green road sign on two posts, flat straight-on view, with white text exactly "HIGHWAY / SLATECUT QUARRY" on two lines (spell it exactly like that and add nothing else), weathered by the rainy highland moor around an old slate quarry. The posts stand on one level base line. Clean and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**28. `speed-sign-v1.png`** (speedSign)

> Portrait image, 1024×1536. One round speed-limit sign on a single post, flat straight-on view: a thick red ring around a completely blank white face, with no number, letters or marks inside it at all. The post is grey steel. The post stands on one level base line. Clean. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**29. `fuel-station-v1.png`** (fuelStation)

> Landscape image, 1536×1024. One small roadside fuel and repair stop for trucks in a rainy highland moor around an old slate quarry, flat straight-on side view with no perspective: a simple open canopy on two posts over one old fuel pump, with a small workshop to one side, a stone workshop with a slate roof, a stack of tyres and oil drums, with heather around the base, under a bright yellow canopy. The space under the canopy stays open. Everything stands on one straight level base line. No vehicles, people, text, logos or numbers. Cheerful and easy to spot from far away. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

---

## 3. Monsoon Canopy (`jungle-monsoon`)

Folder: `assets/seasons/jungle-monsoon/source/`

**Rules** (paste first)

> For every image in this chat: you are making art for a 2D side-scrolling off-road truck game. This season is "Monsoon Canopy", a tropical rainforest in the wet season. Palette: emerald and lime greens, laterite orange, warm gold light and teal shadows. Style: premium semi-realistic hand-painted game illustration with readable dark contours, weathered materials, rich natural texture and soft even daylight, the same style in every image. Objects are drawn in a flat straight-on side view with no perspective; textures are top-down only when I say so. Never draw ice, snow or frost: soft ground is always wet mud. No vehicles unless I ask for a wreck, no people, no animals, and no text, letters, numbers, logos, brands, flags or watermarks unless I give exact wording. Objects go on a real transparent background; if you cannot make one, use a perfectly flat solid magenta #FF00FF background with no gradient, shadow, ground or glow, and no magenta in the object. Show the whole object with a clear margin, nothing touching the image edge. Make each image at the size I give, as large as you can. Generate straight away without asking questions, one image per message. Reply "ready" to this message.

**1. `backdrop-v1.png`** (backdrop)

> Wide landscape image, 1536×1024, fully opaque, side view, no road, no vehicles, no people, no text. Scene: a tropical rainforest in the monsoon, full of life. Warm golden light breaking through after rain, soft rays slanting through steam rising from the trees, a bright blue sky with towering white clouds. Giant characterful rainforest trees with buttress roots and hanging vines in the foreground on both sides, palms, tree ferns and banana plants, then two or three layers of hazier green jungle hills fading into the distance with a thin waterfall on one hill. A wide calm brown river with water lilies and reeds, along a horizontal line about two thirds of the way down the image. Below that line the bottom third is one flat calm band of a single soft green-brown colour with no detail at all, because a game road covers it. Clean, simple painted game illustration with flat shapes, soft gradients and little fine texture. Bright and full of life, not grey, foggy or hazy.

**2. `road-edge-v1.png`** (roadEdge)

> Wide landscape image, 1536×1024. A long horizontal band of terrain: the front edge of a thick rainforest road seen straight on from the side. The band is packed orange laterite earth with moss, small ferns, roots and small stones, with drips of wet red-orange mud hanging below. It runs across the full width of the image and touches the left and right edges at the same height; it is about a third of the image tall and sits in the middle. Its top edge is fairly straight and even, as if it continues back into a flat road; its bottom edge is irregular with small clumps and drips hanging down. Evenly detailed, no big feature, no focal point, no puddles, no tracks, nothing larger than a fist. Everything above and below the band is a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself.

**3. `road-far-v1.png`** (roadFar)

> Wide landscape image, 1536×1024. A long horizontal strip for the far side of a rainforest road, seen from the side: low ferns, broad leaves and young palm shoots on a thin band of dark earth. The plants form a low, irregular line along the top of a thin band of dark ground; the bottom of the band is perfectly straight and fully solid. It runs across the full width of the image and touches the left and right edges at the same height, sitting in the lower middle of the image. Soft, slightly hazy and low contrast, because it sits behind the action. No big plants, no trees, no focal point. Everything above the plants and below the band is a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself.

**4. `road-soil-v1.png`** (roadSoil)

> Wide landscape image, 1536×1024, fully opaque, filling the whole canvas. A flat straight-on cut-away cross-section of earth, like the side wall of a trench: deep orange-red laterite with dark root layers and pebbles, getting near-black toward the bottom. Subtle horizontal layering, low contrast and calm, because game buttons will sit on top of it. Evenly detailed with no big feature, no horizon, no sky, no grass, no perspective. Left and right edges match in brightness and pattern.

**5. `ground-v1.png`** (ground)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: packed orange laterite dirt with scattered leaf litter and small stones. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**6. `wet-mud-v1.png`** (wetmud)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: slick wet orange-red laterite mud, churned. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**7. `granite-v1.png`** (granite)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: dark wet rock with moss in the cracks. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**8. `deep-mud-v1.png`** (deepMud)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: deep dark red-brown jungle bog with a few fallen leaves. It must read as visibly darker, wetter and softer than ordinary mud: matte, with no sky reflections and no bright glints. Uniform scale, soft even light, no perspective, no borders. Opposite edges connect with no visible seam.

**9. `reeds-v1.png`** (reeds)

> Square image, 1024×1024. One roadside plant clump for a tropical rainforest in the wet season: ferns, one broad banana leaf and a plant with red flowers. Flat side view, growing up from one level base line at the bottom of the clump, about as wide as it is tall. Full and lively. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**10. `rock-v1.png`** (rock)

> Landscape image, 1536×1024. One isolated rock for a rainforest road: a low, broad, mossy dark boulder with small ferns on top. Flat side view with a slight elevation, about twice as wide as it is tall, with a flat bottom edge that sits on the road. Readable chunky shape with weathered detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**11. `log-v1.png`** (logCrossing)

> Landscape image, 1536×1024. One obstacle lying across a rainforest road: a huge smooth hardwood log with orange-brown bark and patches of moss. Seen from the side with a slight elevation: its near end is a clean, perfectly round circle facing the viewer, and its body runs straight back behind that circle at exactly the same diameter, with no perspective taper and no narrowing. The end circle is large and fills most of the image height. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**12. `bamboo-v1.png`** (rottenLog)

> Landscape image, 1536×1024. One obstacle lying across a rainforest road: a tight round bundle of thick green bamboo poles tied with vine rope, the ends cut clean and flat. Seen from the side with a slight elevation: its near end is a clean, perfectly round circle facing the viewer, and its body runs straight back behind that circle at exactly the same diameter, with no perspective taper and no narrowing. The end circle is large and fills most of the image height. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**13. `branch-pile-v1.png`** (branchPile)

> Landscape image, 1536×1024. One low, wide obstacle on a rainforest road: a low heap of fallen palm fronds and broken branches. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**14. `root-tangle-v1.png`** (rootTangle)

> Landscape image, 1536×1024. One low, wide obstacle on a rainforest road: a low tangle of thick vines and creepers fallen across the road. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**15. `root-network-v1.png`** (rootNetwork)

> Landscape image, 1536×1024. One low, wide obstacle on a rainforest road: the huge buttress roots of a rainforest tree spreading low across the ground. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**16. `buried-tyres-v1.png`** (buriedTyres)

> Landscape image, 1536×1024. One low, wide obstacle on a rainforest road: three old truck tyres half buried upright in orange mud with ferns growing through them. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**17. `boulder-steps-v1.png`** (boulderSteps)

> Landscape image, 1536×1024. One low, wide obstacle on a rainforest road: two or three low steps of mossy, vine-covered old carved stone blocks, not any real temple. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**18. `concrete-slabs-v1.png`** (concreteSlabs)

> Landscape image, 1536×1024. One low, wide obstacle on a rainforest road: broken concrete culvert pieces overgrown with moss. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**19. `ridge-v1.png`** (iceRidge)

> Landscape image, 1536×1024. One low, wide obstacle on a rainforest road: a low ridge of washed-up river gravel and driftwood. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**20. `steel-beams-v1.png`** (steelBeams)

> Landscape image, 1536×1024. One low, wide obstacle on a rainforest road: rusty steel bridge girders lying flat, wrapped in creepers. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**21. `steel-plates-v1.png`** (steelPlates)

> Landscape image, 1536×1024. One low, wide obstacle on a rainforest road: rusty corrugated roof sheets in a low pile with leaves. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**22. `fence-section-v1.png`** (fenceSection)

> Landscape image, 1536×1024. One straight section of roadside fence for a tropical rainforest in the wet season: a bamboo rail fence lashed with rope. Flat straight-on side view, no perspective, a post or matching flat end at each end so sections can join in a row, standing on one level base line. Weathered. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**23. `shack-v1.png`** (stiltShack)

> Landscape image, 1536×1024. One roadside object for a tropical rainforest in the wet season: a wooden house on stilts with a palm-thatch roof, a ladder, laundry hanging and potted plants. Flat straight-on side view with no perspective, standing on one straight, level base line. Lived in and full of story, bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**24. `wreck-v1.png`** (rustedPickup)

> Landscape image, 1536×1024. One roadside object for a tropical rainforest in the wet season: an overgrown rusted wreck of an old jungle four-by-four with vines growing through it, an original design with no badges. Flat straight-on side view with no perspective, standing on one straight, level base line. Lived in and full of story, bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**25. `tower-v1.png`** (waterTower)

> Portrait image, 1024×1536. One roadside object for a tropical rainforest in the wet season: a tall wooden rainwater tank on stilts with a tin roof. Flat straight-on side view with no perspective, standing on one straight, level base line. Bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**26. `warning-sign-v1.png`** (warningSign)

> Portrait image, 1024×1536. One roadside warning sign on a post, flat straight-on view: a yellow diamond sign with a black landslide pictogram, on a wooden post. No words, only the pictogram. The post stands on one level base line. Weathered, readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**27. `highway-sign-v1.png`** (highwaySign)

> Landscape image, 1536×1024. One green road sign on two posts, flat straight-on view, with white text exactly "HIGHWAY / MONSOON CANOPY" on two lines (spell it exactly like that and add nothing else), weathered by the tropical rainforest in the wet season. The posts stand on one level base line. Clean and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**28. `speed-sign-v1.png`** (speedSign)

> Portrait image, 1024×1536. One round speed-limit sign on a single post, flat straight-on view: a thick red ring around a completely blank white face, with no number, letters or marks inside it at all. The post is mossy wood. The post stands on one level base line. Clean. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**29. `fuel-station-v1.png`** (fuelStation)

> Landscape image, 1536×1024. One small roadside fuel and repair stop for trucks in a tropical rainforest in the wet season, flat straight-on side view with no perspective: a simple open canopy on two posts over one old fuel pump, with a small workshop to one side, a timber workshop with a tin roof, a stack of tyres and oil drums, with banana plants around the base, under a bright red canopy. The space under the canopy stays open. Everything stands on one straight level base line. No vehicles, people, text, logos or numbers. Cheerful and easy to spot from far away. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

---

## 4. Cinder Caldera (`volcanic-ash`)

Folder: `assets/seasons/volcanic-ash/source/`

**Rules** (paste first)

> For every image in this chat: you are making art for a 2D side-scrolling off-road truck game. This season is "Cinder Caldera", a green volcanic island inside an old crater. Palette: charcoal black, vivid moss green, sulphur yellow accents, sea blue and white steam. Style: premium semi-realistic hand-painted game illustration with readable dark contours, weathered materials, rich natural texture and soft even daylight, the same style in every image. Objects are drawn in a flat straight-on side view with no perspective; textures are top-down only when I say so. Never draw ice, snow or frost: soft ground is always wet mud. No vehicles unless I ask for a wreck, no people, no animals, and no text, letters, numbers, logos, brands, flags or watermarks unless I give exact wording. Objects go on a real transparent background; if you cannot make one, use a perfectly flat solid magenta #FF00FF background with no gradient, shadow, ground or glow, and no magenta in the object. Show the whole object with a clear margin, nothing touching the image edge. Make each image at the size I give, as large as you can. Generate straight away without asking questions, one image per message. Reply "ready" to this message.

**1. `backdrop-v1.png`** (backdrop)

> Wide landscape image, 1536×1024, fully opaque, side view, no road, no vehicles, no people, no text. Scene: the inside of an old volcanic crater on a green island, full of life. A bright morning sun with soft rays in a clear blue sky with a few white clouds. Big characterful black basalt cliffs and hexagonal columns covered in vivid green moss on both sides, a calm volcano cone with a thin white plume of steam in the distance, then two or three layers of hazier blue-green ridges fading behind it. White steam rising gently from small vents. A calm turquoise crater lake with black sand and green grass, along a horizontal line about two thirds of the way down the image. Below that line the bottom third is one flat calm band of a single soft dark green colour with no detail at all, because a game road covers it. Clean, simple painted game illustration with flat shapes, soft gradients and little fine texture. Bright and full of life, not grey, foggy or hazy.

**2. `road-edge-v1.png`** (roadEdge)

> Wide landscape image, 1536×1024. A long horizontal band of terrain: the front edge of a thick volcanic island road seen straight on from the side. The band is packed black volcanic gravel and ash with bright green moss and small lava stones, with drips of black ash mud hanging below. It runs across the full width of the image and touches the left and right edges at the same height; it is about a third of the image tall and sits in the middle. Its top edge is fairly straight and even, as if it continues back into a flat road; its bottom edge is irregular with small clumps and drips hanging down. Evenly detailed, no big feature, no focal point, no puddles, no tracks, nothing larger than a fist. Everything above and below the band is a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself.

**3. `road-far-v1.png`** (roadFar)

> Wide landscape image, 1536×1024. A long horizontal strip for the far side of a volcanic island road, seen from the side: low moss hummocks, tall coastal grass and small yellow flowers on a thin band of black earth. The plants form a low, irregular line along the top of a thin band of dark ground; the bottom of the band is perfectly straight and fully solid. It runs across the full width of the image and touches the left and right edges at the same height, sitting in the lower middle of the image. Soft, slightly hazy and low contrast, because it sits behind the action. No big plants, no trees, no focal point. Everything above the plants and below the band is a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself.

**4. `road-soil-v1.png`** (roadSoil)

> Wide landscape image, 1536×1024, fully opaque, filling the whole canvas. A flat straight-on cut-away cross-section of earth, like the side wall of a trench: layered black and dark red volcanic ash with small porous stones, getting near-black toward the bottom. Subtle horizontal layering, low contrast and calm, because game buttons will sit on top of it. Evenly detailed with no big feature, no horizon, no sky, no grass, no perspective. Left and right edges match in brightness and pattern.

**5. `ground-v1.png`** (ground)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: dark grey cinder gravel with porous red and black stones. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**6. `wet-mud-v1.png`** (wetmud)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: wet black ash mud, smooth and churned. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**7. `granite-v1.png`** (granite)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: dark basalt bedrock with hexagonal cracks. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**8. `deep-mud-v1.png`** (deepMud)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: deep wet black ash bog. It must read as visibly darker, wetter and softer than ordinary mud: matte, with no sky reflections and no bright glints. Uniform scale, soft even light, no perspective, no borders. Opposite edges connect with no visible seam.

**9. `reeds-v1.png`** (reeds)

> Square image, 1024×1024. One roadside plant clump for a green volcanic island inside an old crater: bright moss, coastal grass and small yellow wildflowers. Flat side view, growing up from one level base line at the bottom of the clump, about as wide as it is tall. Full and lively. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**10. `rock-v1.png`** (rock)

> Landscape image, 1536×1024. One isolated rock for a volcanic island road: a low, broad, porous black lava boulder with patches of moss. Flat side view with a slight elevation, about twice as wide as it is tall, with a flat bottom edge that sits on the road. Readable chunky shape with weathered detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**11. `steam-pipe-v1.png`** (pipe)

> Landscape image, 1536×1024. One obstacle lying across a volcanic island road: a rusty insulated geothermal steam pipe with a silver cladding band and a flange at its near end. Seen from the side with a slight elevation: its near end is a clean, perfectly round circle facing the viewer, and its body runs straight back behind that circle at exactly the same diameter, with no perspective taper and no narrowing. The end circle is large and fills most of the image height. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**12. `charred-trunk-v1.png`** (logCrossing)

> Landscape image, 1536×1024. One obstacle lying across a volcanic island road: a smooth charred tree trunk with black and silver bark. Seen from the side with a slight elevation: its near end is a clean, perfectly round circle facing the viewer, and its body runs straight back behind that circle at exactly the same diameter, with no perspective taper and no narrowing. The end circle is large and fills most of the image height. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**13. `branch-pile-v1.png`** (branchPile)

> Landscape image, 1536×1024. One low, wide obstacle on a volcanic island road: a low heap of light, porous grey pumice stones. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**14. `root-tangle-v1.png`** (rootTangle)

> Landscape image, 1536×1024. One low, wide obstacle on a volcanic island road: a low tangle of twisted, hardened ropy lava crust. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**15. `root-network-v1.png`** (rootNetwork)

> Landscape image, 1536×1024. One low, wide obstacle on a volcanic island road: bright green moss and creeping roots over a low black lava shelf. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**16. `buried-tyres-v1.png`** (buriedTyres)

> Landscape image, 1536×1024. One low, wide obstacle on a volcanic island road: three old truck tyres half buried upright in black sand. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**17. `boulder-steps-v1.png`** (boulderSteps)

> Landscape image, 1536×1024. One low, wide obstacle on a volcanic island road: two or three low steps of hexagonal basalt columns cut flat at different heights. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**18. `concrete-slabs-v1.png`** (concreteSlabs)

> Landscape image, 1536×1024. One low, wide obstacle on a volcanic island road: broken concrete foundation slabs from an old hut, with moss. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**19. `ridge-v1.png`** (iceRidge)

> Landscape image, 1536×1024. One low, wide obstacle on a volcanic island road: a low ridge of black sand and cinders pushed up by a plough. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**20. `steel-beams-v1.png`** (steelBeams)

> Landscape image, 1536×1024. One low, wide obstacle on a volcanic island road: rusty steel pipe supports and beams lying flat. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**21. `steel-plates-v1.png`** (steelPlates)

> Landscape image, 1536×1024. One low, wide obstacle on a volcanic island road: rusty steel sheets with a faded yellow stripe in a low pile. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**22. `fence-section-v1.png`** (fenceSection)

> Landscape image, 1536×1024. One straight section of roadside fence for a green volcanic island inside an old crater: a low wall of piled lava stones with a wooden rail on top and flat ends. Flat straight-on side view, no perspective, a post or matching flat end at each end so sections can join in a row, standing on one level base line. Weathered. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**23. `shack-v1.png`** (stiltShack)

> Landscape image, 1536×1024. One roadside object for a green volcanic island inside an old crater: a small timber hut with a grass turf roof, a red door and a steaming hot-water barrel beside it. Flat straight-on side view with no perspective, standing on one straight, level base line. Lived in and full of story, bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**24. `wreck-v1.png`** (rustedPickup)

> Landscape image, 1536×1024. One roadside object for a green volcanic island inside an old crater: a rusted wreck of an old island utility truck half buried in ash, an original design with no badges. Flat straight-on side view with no perspective, standing on one straight, level base line. Lived in and full of story, bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**25. `tower-v1.png`** (waterTower)

> Portrait image, 1024×1536. One roadside object for a green volcanic island inside an old crater: a tall silver geothermal steam tank with pipes and a small plume of steam. Flat straight-on side view with no perspective, standing on one straight, level base line. Bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**26. `warning-sign-v1.png`** (warningSign)

> Portrait image, 1024×1536. One roadside warning sign on a post, flat straight-on view: a yellow triangle sign with a black pictogram of hot steam rising from the ground, on a steel post. No words, only the pictogram. The post stands on one level base line. Weathered, readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**27. `highway-sign-v1.png`** (highwaySign)

> Landscape image, 1536×1024. One green road sign on two posts, flat straight-on view, with white text exactly "HIGHWAY / CINDER CALDERA" on two lines (spell it exactly like that and add nothing else), weathered by the green volcanic island inside an old crater. The posts stand on one level base line. Clean and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**28. `speed-sign-v1.png`** (speedSign)

> Portrait image, 1024×1536. One round speed-limit sign on a single post, flat straight-on view: a thick red ring around a completely blank white face, with no number, letters or marks inside it at all. The post is black steel. The post stands on one level base line. Clean. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**29. `fuel-station-v1.png`** (fuelStation)

> Landscape image, 1536×1024. One small roadside fuel and repair stop for trucks in a green volcanic island inside an old crater, flat straight-on side view with no perspective: a simple open canopy on two posts over one old fuel pump, with a small workshop to one side, a black timber workshop with a grass turf roof, a stack of tyres and oil drums, with moss around the base, under a bright sulphur-yellow canopy. The space under the canopy stays open. Everything stands on one straight level base line. No vehicles, people, text, logos or numbers. Cheerful and easy to spot from far away. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

---

## 5. Ares Basin (`mars-colony`)

Folder: `assets/seasons/mars-colony/source/`

**Rules** (paste first)

> For every image in this chat: you are making art for a 2D side-scrolling off-road truck game. This season is "Ares Basin", a young colony on a red planet. Palette: rust red, butterscotch sky, dusty rose, basalt grey, greenhouse green and cool blue accents. Style: premium semi-realistic hand-painted game illustration with readable dark contours, weathered materials, rich natural texture and soft even daylight, the same style in every image. Objects are drawn in a flat straight-on side view with no perspective; textures are top-down only when I say so. Never draw ice, snow or frost: soft ground is always wet mud. No vehicles unless I ask for a wreck, no people, no animals, and no text, letters, numbers, logos, brands, flags or watermarks unless I give exact wording. Objects go on a real transparent background; if you cannot make one, use a perfectly flat solid magenta #FF00FF background with no gradient, shadow, ground or glow, and no magenta in the object. Show the whole object with a clear margin, nothing touching the image edge. Make each image at the size I give, as large as you can. Generate straight away without asking questions, one image per message. Reply "ready" to this message.

**1. `backdrop-v1.png`** (backdrop)

> Wide landscape image, 1536×1024, fully opaque, side view, no road, no vehicles, no people, no text. Scene: a broad crater basin on a red planet at a young colony, full of life and hope. A small bright sun low in a butterscotch sky fading to soft blue around the sun, two tiny moons and thin pale clouds. Big characterful layered rust-red mesas and eroded crater walls on both sides, then two or three layers of hazier dusty-rose ridges and a huge distant volcano fading into the distance. A cluster of glowing domes and greenhouses full of green plants, slim antenna masts and solar panels in the middle ground, with no flags or logos. A flat dusty plain with a shallow dark pond, along a horizontal line about two thirds of the way down the image. Below that line the bottom third is one flat calm band of a single soft rust colour with no detail at all, because a game road covers it. Clean, simple painted game illustration with flat shapes, soft gradients and little fine texture. Bright and full of life, not grey, foggy or hazy.

**2. `road-edge-v1.png`** (roadEdge)

> Wide landscape image, 1536×1024. A long horizontal band of terrain: the front edge of a thick red-planet colony road seen straight on from the side. The band is packed rust-red dust and grit with dark basalt pebbles and small pale rocks, with drips of wet dark red mud hanging below. It runs across the full width of the image and touches the left and right edges at the same height; it is about a third of the image tall and sits in the middle. Its top edge is fairly straight and even, as if it continues back into a flat road; its bottom edge is irregular with small clumps and drips hanging down. Evenly detailed, no big feature, no focal point, no puddles, no tracks, nothing larger than a fist. Everything above and below the band is a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself.

**3. `road-far-v1.png`** (roadFar)

> Wide landscape image, 1536×1024. A long horizontal strip for the far side of a red-planet colony road, seen from the side: low dark rocks, small dust drifts and a few hardy green shrubs in round planters on a thin band of rust earth. The plants form a low, irregular line along the top of a thin band of dark ground; the bottom of the band is perfectly straight and fully solid. It runs across the full width of the image and touches the left and right edges at the same height, sitting in the lower middle of the image. Soft, slightly hazy and low contrast, because it sits behind the action. No big plants, no trees, no focal point. Everything above the plants and below the band is a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself.

**4. `road-soil-v1.png`** (roadSoil)

> Wide landscape image, 1536×1024, fully opaque, filling the whole canvas. A flat straight-on cut-away cross-section of earth, like the side wall of a trench: layered rust, ochre and dark basalt sediment with small stones, getting near-black toward the bottom. Subtle horizontal layering, low contrast and calm, because game buttons will sit on top of it. Evenly detailed with no big feature, no horizon, no sky, no grass, no perspective. Left and right edges match in brightness and pattern.

**5. `ground-v1.png`** (ground)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: fine rust-red dust and gravel with dark pebbles. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**6. `wet-mud-v1.png`** (wetmud)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: wet dark red mud with faint pale salt edges, churned. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**7. `granite-v1.png`** (granite)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: dark grey basalt plate with fine red dust in the cracks. Uniform scale and soft even light, fine natural variation, no perspective, no horizon, no borders, no big landmark, no cast shadows. It must tile: opposite edges connect with no visible seam.

**8. `deep-mud-v1.png`** (deepMud)

> Square image, 1024×1024, fully opaque, filling the whole canvas. A seamless top-down texture seen from directly above: deep wet near-black red bog. It must read as visibly darker, wetter and softer than ordinary mud: matte, with no sky reflections and no bright glints. Uniform scale, soft even light, no perspective, no borders. Opposite edges connect with no visible seam.

**9. `reeds-v1.png`** (reeds)

> Square image, 1024×1024. One roadside plant clump for a young colony on a red planet: a small hardy plant with leafy green shoots growing in a round white planter. Flat side view, growing up from one level base line at the bottom of the clump, about as wide as it is tall. Full and lively. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**10. `rock-v1.png`** (rock)

> Landscape image, 1536×1024. One isolated rock for a red-planet colony road: a low, broad, wind-carved dark basalt boulder with rust dust on top. Flat side view with a slight elevation, about twice as wide as it is tall, with a flat bottom edge that sits on the road. Readable chunky shape with weathered detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**11. `conduit-v1.png`** (pipe)

> Landscape image, 1536×1024. One obstacle lying across a red-planet colony road: a white and grey habitat conduit pipe with ribbed couplings and a cap at its near end, dusty. Seen from the side with a slight elevation: its near end is a clean, perfectly round circle facing the viewer, and its body runs straight back behind that circle at exactly the same diameter, with no perspective taper and no narrowing. The end circle is large and fills most of the image height. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**12. `gas-cylinder-v1.png`** (oilDrum)

> Landscape image, 1536×1024. One obstacle lying across a red-planet colony road: an empty dented gas cylinder lying on its side, white with a blue band and no writing. Seen from the side with a slight elevation: its near end is a clean, perfectly round circle facing the viewer, and its body runs straight back behind that circle at exactly the same diameter, with no perspective taper and no narrowing. The end circle is large and fills most of the image height. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**13. `branch-pile-v1.png`** (branchPile)

> Landscape image, 1536×1024. One low, wide obstacle on a red-planet colony road: a low heap of brittle rust-red rock crust and dust-caked foam packing. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**14. `root-tangle-v1.png`** (rootTangle)

> Landscape image, 1536×1024. One low, wide obstacle on a red-planet colony road: a low tangle of frayed cables and torn parachute cord from a supply drop. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**15. `root-network-v1.png`** (rootNetwork)

> Landscape image, 1536×1024. One low, wide obstacle on a red-planet colony road: a low tangle of dark plant-growing tubes and roots spilling from a cracked greenhouse tray. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**16. `buried-tyres-v1.png`** (buriedTyres)

> Landscape image, 1536×1024. One low, wide obstacle on a red-planet colony road: three original-design metal mesh rover wheels half buried upright in red dust. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**17. `boulder-steps-v1.png`** (boulderSteps)

> Landscape image, 1536×1024. One low, wide obstacle on a red-planet colony road: two or three low steps of layered rust sandstone ledges. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**18. `concrete-slabs-v1.png`** (concreteSlabs)

> Landscape image, 1536×1024. One low, wide obstacle on a red-planet colony road: printed red building bricks beside a cracked landing-pad slab. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**19. `ridge-v1.png`** (iceRidge)

> Landscape image, 1536×1024. One low, wide obstacle on a red-planet colony road: a low ridge of red dust drift with a crusted top. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**20. `steel-beams-v1.png`** (steelBeams)

> Landscape image, 1536×1024. One low, wide obstacle on a red-planet colony road: bent aluminium truss beams from a solar array lying flat. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**21. `steel-plates-v1.png`** (steelPlates)

> Landscape image, 1536×1024. One low, wide obstacle on a red-planet colony road: scorched heat-shield panels and hull plates from a crashed lander in a low pile. Flat side view, about three times as wide as it is tall, with a flat bottom edge that sits on the road and a rounded or stepped top with no tall spikes. Weathered, readable detail. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**22. `fence-section-v1.png`** (fenceSection)

> Landscape image, 1536×1024. One straight section of roadside fence for a young colony on a red planet: guide-rope posts with small orange marker lights and a rope between them. Flat straight-on side view, no perspective, a post or matching flat end at each end so sections can join in a row, standing on one level base line. Weathered. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**23. `shack-v1.png`** (stiltShack)

> Landscape image, 1536×1024. One roadside object for a young colony on a red planet: a small cylindrical habitat module on short legs with a round window, an airlock door and a glowing green greenhouse bay, no flags or logos. Flat straight-on side view with no perspective, standing on one straight, level base line. Lived in and full of story, bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**24. `wreck-v1.png`** (rustedPickup)

> Landscape image, 1536×1024. One roadside object for a young colony on a red planet: an abandoned dusty six-wheel colony rover with a cracked canopy, an original design with no badges, flags or logos. Flat straight-on side view with no perspective, standing on one straight, level base line. Lived in and full of story, bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**25. `tower-v1.png`** (waterTower)

> Portrait image, 1024×1536. One roadside object for a young colony on a red planet: a tall white water and oxygen storage tank on a lattice frame, with pipes and a small antenna. Flat straight-on side view with no perspective, standing on one straight, level base line. Bright and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**26. `warning-sign-v1.png`** (warningSign)

> Portrait image, 1024×1536. One roadside warning sign on a post, flat straight-on view: a yellow triangle sign with a black dust-storm pictogram of a swirl over a road, on a steel post. No words, only the pictogram. The post stands on one level base line. Weathered, readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**27. `highway-sign-v1.png`** (highwaySign)

> Landscape image, 1536×1024. One green road sign on two posts, flat straight-on view, with white text exactly "HIGHWAY / ARES BASIN" on two lines (spell it exactly like that and add nothing else), weathered by the young colony on a red planet. The posts stand on one level base line. Clean and readable. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**28. `speed-sign-v1.png`** (speedSign)

> Portrait image, 1024×1536. One round speed-limit sign on a single post, flat straight-on view: a thick red ring around a completely blank white face, with no number, letters or marks inside it at all. The post is white steel. The post stands on one level base line. Clean. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

**29. `fuel-station-v1.png`** (fuelStation)

> Landscape image, 1536×1024. One small roadside fuel and repair stop for trucks in a young colony on a red planet, flat straight-on side view with no perspective: a simple open canopy on two posts over one old fuel pump, with a small workshop to one side, a domed workshop module, spare metal mesh rover wheels and gas cylinders, with green planters around the base, under a bright orange canopy, no flags or logos. The space under the canopy stays open. Everything stands on one straight level base line. No vehicles, people, text, logos or numbers. Cheerful and easy to spot from far away. Put it on a transparent background; if you cannot make real transparency, use a perfectly flat solid magenta (#FF00FF) background with no gradient, texture, shadow, ground or glow, and keep magenta out of the object itself. The whole object is visible with a clear margin on every side, nothing touches the image edge, no ground under it and no drop shadow.

---

## How each map should play (for Claude at integration)

Start from the swamp's `season.json`; these are starting numbers, tuned with `npm run test:route`.

1. **Coyote Wash:** firm, fast dirt (`dirt.mu` 0.92) and long rollers between short heavy red-clay bogs in the wash beds (`mud.mu` 0.30, `sink` 0.28). Many sandstone ledges (`ramps`), crushables on rock. Pipe and pole runs.
2. **Slatecut Quarry:** the rock map. Many `rockGardens` and `boulderSteps`, wet slate (`rock.mu` 0.74), short choppy rollers, few but deep peat bogs (`mud.mu` 0.30, `sink` 0.24). Roller and pit-prop runs.
3. **Monsoon Canopy:** the mud map. Long `heavyMud` stretches, creeks, slick laterite (`mud.mu` 0.26, `sink` 0.30), big hardwood log and bamboo runs, buttress root networks. Gentle hills so the mud is the challenge.
4. **Cinder Caldera:** one climb up the crater rim and down to the floor. Loose cinder dirt (`dirt.mu` 0.82), sharp basalt (`rock.mu` 0.9), black ash bogs on the crater floor (`mud.mu` 0.32, `sink` 0.26). Steam-pipe runs.
5. **Ares Basin:** big slow rollers and dune-like humps, rust dust (`dirt.mu` 0.85), brine bogs in the crater lows (`mud.mu` 0.30, `sink` 0.26). Normal gravity: it is a look, not a physics change. Conduit and cylinder runs.

File names map to `art` keys as in the spring-thaw `season.json` (`shack` is `stiltShack`, `wreck` is `rustedPickup`, `tower` is `waterTower`, `ridge` is `iceRidge`, the two round files are the season's round obstacle kinds). The existing `forest` ambience is wrong for the desert, volcano and Mars; a wind or quiet ambience is a separate audio request.
