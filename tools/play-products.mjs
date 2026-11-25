// The shop's catalogue as a CSV for Google Play Console (Monetize with Play > Products > One-time products), one row per product:
// id, kind (every product is consumable), title, description, price in US dollars. Prices are the placeholder SHOP_* numbers
// in src/game-config.js; Play converts them to local prices. Writes output/play-products.csv.
//   node tools/play-products.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadContent } from './lib/content.js';
import { createShop } from '../src/game/shop.js';

const content = loadContent();
const progress = { owns: () => false, rank: 1, maxRank: 40, price: () => 0, reachRank: () => [], grant: () => [] };
// every paid map, as the garage gives them to the shop: without it the "Every map" bundle was left out of the list
import { FREE_SEASONS } from '../src/game-config.js';
const seasonsDir = path.join(ROOT, 'assets/seasons');
const paidMaps = fs.readdirSync(seasonsDir).filter(id => fs.existsSync(path.join(seasonsDir, id, 'season.json')))
  .filter(id => JSON.parse(fs.readFileSync(path.join(seasonsDir, id, 'season.json'), 'utf8')).status === 'playable' && !FREE_SEASONS.includes(id));
const maps = { ids: paidMaps, owns: () => false, grant() {} };
const shop = createShop({ content: { ...content, cars: content.cars.map(c => ({ ...c, artUri: {} })) }, progress, wallet: { add() {}, coins: 0 }, storage: null, maps });
const csv = v => `"${String(v).replace(/"/g, '""')}"`;
// the Rookie pack's truck is the nearest Scout to SHOP_ROOKIE_TRUCK_RANK the player doesn't own, so Play's fixed description
// can't name it: the garage card shows the actual truck
const describe = o => o.id === 'bundle_rookie' ? o.sub.replace(/\+ .*$/, '+ a Scout truck') : o.sub;
const rows = shop.products().map(o => [o.id, 'consumable', o.title, describe(o), o.price.toFixed(2)]);
const out = path.join(ROOT, 'output/play-products.csv');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, ['id,kind,title,description,price_usd', ...rows.map(r => r.map(csv).join(','))].join('\n') + '\n');
console.log(`${rows.length} products -> ${path.relative(ROOT, out)}`);
