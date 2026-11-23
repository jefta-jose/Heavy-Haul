// What a vehicle's load sounds like, by what it carries rather than by its class: a pickup with a roof basket and a
// mining truck with ore sound nothing alike, even when both are "off-road". Each car's load (car.json `load.name`) is
// sorted into a group by the words in its name; `"audio": { "load": "<group>" }` in a car.json picks one by hand.
//
// A group has
//   hit    the load shaking on a log, pipe or rock and on landing (a one-shot from the bank)
//   ride   a bed of the load working: louder on a rough ride and while the truck strains (slow, engine working hard)
//   call   an animal's voice now and then on a big jolt (cattle, chickens, an elephant), spaced by `every` seconds
// gain is the group's loudness, gap the least seconds between hits. Every vehicle also thumps on landing (vehicle-audio.js).

export const LOAD_SOUNDS = {
  // nothing carried: only the truck itself (chassis rattle and the landing thump)
  empty: {},
  // small loose kit in a pickup bed or on a roof: spare tyres, tool chests, camping gear
  gear: { hit: 'cargo-light', ride: 'gear-ride', gain: 0.7, gap: 0.5 },
  // logs, lumber and poles knocking against each other and the stakes
  timber: { hit: 'timber-knock', ride: 'timber-ride', gain: 0.85, gap: 0.55 },
  // pipes, beams, rebar, drill masts and spare wheels: dull steel on steel and the chains holding it
  steel: { hit: 'steel-clank', ride: 'steel-ride', gain: 0.7, gap: 0.6 },
  // gravel, ore, coal, rock, bricks and blocks shifting in a body
  bulk: { hit: 'bulk-shift', ride: 'bulk-ride', gain: 0.8, gap: 0.6 },
  // water, fuel, milk and slurry sloshing in a tank
  liquid: { hit: 'slosh', ride: 'slosh-ride', gain: 0.75, gap: 0.7 },
  // a box, container or crates of freight: the body and its contents rattling
  freight: { hit: 'freight-bang', ride: 'freight-ride', gain: 0.75, gap: 0.55 },
  // a machine, vehicle or huge single piece chained down: chains and the strain on them
  machine: { hit: 'cargo-heavy-chains', ride: 'cable-strain', gain: 0.8, gap: 0.9 },
  // live animals: shuffling in the box, and their voices when it gets rough
  cattle: { hit: 'freight-bang', call: 'moo', every: [6, 14], gain: 0.6, gap: 0.6 },
  chickens: { hit: 'cargo-light', call: 'cluck', every: [3, 8], gain: 0.6, gap: 0.5 },
  elephant: { hit: 'freight-bang', call: 'trumpet', every: [10, 22], gain: 0.6, gap: 0.8 },
};

// Words in a load's name, first match wins. Order matters: "fuel bladder" is liquid before anything else, "concrete
// segments" bulk before "concrete" is read as wet concrete, and so on.
const RULES = [
  ['cattle', /\b(cattle|calves|cows?)\b/],
  ['chickens', /\bchicken/],
  ['elephant', /\belephant/],
  ['machine', /\b(giraffe)\b/],   // a giraffe stands still and quiet in its box: only the chains
  ['bulk', /\b(roll-off|dump body)\b/],
  ['liquid', /\b(water|fuel|milk|slurry|wet concrete|foam|jerry ?cans?|bladder|tanker?)\b/],
  ['timber', /\b(logs?|lumber|timber|fence posts|poles|planks)\b/],
  ['bulk', /\b(gravel|ore|coal|rocks?|boulders?|stone|ballast|silt|wood chips|bricks?|blocks|cement|concrete|ice)\b/],
  ['steel', /\b(pipes?|steel|rebar|beams?|drill|drilling|mast|boom|cable|wire|spools?|wheels|tyres|propeller|substructure)\b/],
  ['machine', /\b(excavator|dozer|bulldozer|generator|transformer|turbine|locomotive|machine|machinery|reactor|rocket|submarine|yacht|trawler|hull|container module|cars?|buggy|supercar|truck|6×6|capsule|cask|warhead|satellite|welding|dump body|roll-off|shovel|rig kit|skeleton)\b/],
  ['freight', /\b(freight|cargo|crates?|parcels|container|luggage|supplies|boxes|box|equipment|materials|ammo|reefer|camper|habitat|living|kit|gear|survey|utility)\b/],
  ['gear', /\b(spares?|tyre|wheel|tool|chests?|basket|roof|camp|camping|hay|bales|recovery|medical|generator)\b/],
];

const LIGHT_LOAD_T = 1.25;   // tonnes: lighter freight, steel or machines sound like loose kit

export function loadGroup(car) {
  const chosen = car.audio?.load;
  if (chosen && LOAD_SOUNDS[chosen]) return chosen;
  const name = (car.load?.name ?? '').toLowerCase();
  if (!name) return 'empty';
  const massT = car.load?.massT ?? 0;
  const group = RULES.find(([, re]) => re.test(name))?.[0] ?? (massT > 8 ? 'machine' : 'freight');
  // a light load of boxes, spares or a small machine just rattles about like loose kit
  return massT < LIGHT_LOAD_T && ['freight', 'steel', 'machine'].includes(group) ? 'gear' : group;
}
