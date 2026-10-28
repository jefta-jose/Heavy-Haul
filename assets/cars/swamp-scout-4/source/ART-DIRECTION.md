# Active Swamp Scout art direction

Use the bottom-right Swamp Scout panel of the supplied four-scout image as the visual target.
This guide applies to the active scene; the older strict flat-elevation fire-truck guides describe
the earlier asset pipeline.

The vehicle is an olive expedition 4×4 with huge dark mud tires, black steel rims, gray roof cases,
orange roof recovery boards, tan boards over the rear side window, a snorkel and a rear spare.
Keep the spare and equipment on the moving body. Road tires are separate animated assets. The
scout has no trailer.

Aim for premium semi-realistic painted game illustration: clear dark mechanical contours,
weathered metal, layered mud, readable tiny equipment and rich natural surface detail. Show the
vehicle mostly from the side, facing right, with restrained depth in the hood, rack and tire tread.
Use cool humid forest shadows, muted olive foliage and warm restrained nearer highlights.

Generate genuine alpha for the body, wheels, trees, reeds, rocks and logs. Reject colored halos,
checkerboard backgrounds, clipped silhouettes and smoky glows. Keep every candidate version so
its use or rejection can be traced in prompts.json and the art map in car.json.

Preserve body registration when editing: the current canvas is 1774 × 887, origin (900, 650),
235 pixels per metre. Measured axle positions are in car.json (`rig`). The tire sprite is a centered square,
with even lighting suitable for rotation; preserve its hub position, scale and transparent margin.
Never replace the animated rig with a single full-vehicle poster.

The ground image follows the same world height profile as the physics. The bank's tire-contact
row is 500. Far wheels sit behind the body; near wheels and the upper fender overlay articulate
with the suspension. Foreground mud partly hides sunk tires along an irregular edge. Adjacent
panoramas and bank tiles mirror at their boundaries to avoid hard repeating seams.

The world remains still during suspension bounce. Camera height follows the terrain, and zoom
or viewport changes must keep the entire scout framed. Keep phone controls below the tire contact
area so the artwork remains visible while driving.

Verify every selected image loads, compare actual gameplay captures against the reference, inspect
wheel fit at rest and in suspension motion, and check both desktop and phone layouts. The review
folder records the playable render iterations.
