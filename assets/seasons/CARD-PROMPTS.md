# Season cards: ChatGPT prompts

One picture per map for the garage's **Seasons** cards (the Hill Climb Racing style menu, 2026-11-18). Until a map has its
card, the garage shows a crop of its panorama instead.

## How to use this

1. Start one ChatGPT chat and paste the **Rules** paragraph first. It holds for every card.
2. Paste one card prompt at a time. Save each image as `assets/seasons/<folder>/card.png` (the folder is in the heading).
3. Redo a card only for a real defect: text or logos, a vehicle or person, a frame or border, or a busy picture that is hard
   to read when small.
4. Tell Claude **"season cards are done"** (or name the ones that are). Claude encodes each to `art/card.webp`, adds it to
   that map's `season.json` as `art.card`, and deletes the PNG.

**Rules** (paste first)

> For every image in this chat: you are making a landscape card for the map-select menu of a 2D side-scrolling off-road truck
> game called Heavy Haul. Each card is a small, bold, instantly readable picture of one map. Landscape 1536×1024, fully opaque,
> filling the whole canvas. Style: premium semi-realistic hand-painted game illustration with readable dark contours, rich
> colour and soft even daylight, like the key art of a polished mobile driving game. Composition for every card: a muddy dirt
> road winds from the lower left across rolling ground to the distance, with one strong landmark in the middle distance and
> open sky in the top third. Keep the picture simple, with big shapes that still read at the size of a thumb. No vehicles, no
> people, no animals in the foreground, no text, no letters, no logos, no signs with writing, no frame, no border, no vignette,
> no snow and no ice.

## Blackwater Swamp (`swamp-summer`)

> Card for "Blackwater Swamp", a Louisiana bayou in summer. A dark muddy track with puddles curves through the swamp past giant
> bald cypress trees hung with Spanish moss, their knees standing in still green water with lily pads. Warm late-afternoon
> light through the canopy, a few orange autumn-tinged leaves, a heron far off on a log. Greens, olive and warm gold.

## Copper Ridge (`autumn-forest`)

> Card for "Copper Ridge", a logging road in the Vermont hills in autumn. A rutted muddy logging track climbs between maples
> and birches in blazing red, orange and gold, with a neat stack of cut logs beside the road and a wooded ridge glowing copper
> in the distance under a clear blue sky. Fallen leaves on the mud.

## Meltwater Pass (`spring-thaw`)

> Card for "Meltwater Pass", a mountain pass in the Cascade foothills during the spring thaw. A wet grey gravel road climbs
> over rocky ground beside a fast meltwater creek, with dark pines, fresh green meadow and wildflowers, and a big rocky peak
> streaked with waterfalls in the distance. Fresh, cool blues and greens, puddles reflecting the sky. No snow on the ground.

## Coyote Wash (`desert-wash`)

> Card for "Coyote Wash", a red-rock desert canyon just after a summer monsoon storm. A muddy brown dirt road winds between
> saguaro cacti and flowering desert shrubs toward a huge banded terracotta and cream sandstone butte, with rain puddles on
> the ground and the last storm clouds breaking into a deep turquoise sky with a faint rainbow.

## Slatecut Quarry (`highland-quarry`)

> Card for "Slatecut Quarry", a rainy highland moor around an old slate quarry. A grey slate-gravel road with dark peat mud
> crosses purple heather and white cotton grass toward a stepped grey slate quarry face with two thin waterfalls and a small
> rusty mine headframe, under bright breaking rain clouds with soft sun rays over green hills.

## Monsoon Canopy (`jungle-monsoon`)

> Card for "Monsoon Canopy", a rainforest in the wet season. An orange laterite mud road runs under a towering rainforest tree
> with huge buttress roots, past ferns, banana leaves and red heliconia flowers, toward misty green jungle hills with a white
> waterfall. Warm golden light breaking through after rain, everything glistening.

## Cinder Caldera (`volcanic-ash`)

> Card for "Cinder Caldera", a green volcanic island inside an old crater. A black cinder road crosses bright green moss and
> grass past columns of dark basalt toward a turquoise crater lake, with soft white steam rising from vents and a distant cone
> volcano under a clear blue sky with white clouds.
