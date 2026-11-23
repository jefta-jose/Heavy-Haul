// The shop's catalogue as a CSV for Google Play Console (Monetize > Products > In-app products), one row per product:
// id, kind (consumable / non-consumable), title, description, price in US dollars. Prices are the placeholder SHOP_* numbers
// in src/game-config.js; Play converts them to local prices. Writes output/play-products.csv.
//   node tools/play-products.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadContent } from './lib/content.js';
import { createShop } from '../src/game/shop.js';

const content = loadContent();
const progress = { owns: () => false, rank: 1, maxRank: 40, price: () => 0, reachRank: () => [], grant: () => [] };
const shop = createShop({ content: { ...content, cars: content.cars.map(c => ({ ...c, artUri: {} })) }, progress, wallet: { add() {}, coins: 0 }, storage: null });
const csv = v => `"${String(v).replace(/"/g, '""')}"`;
const rows = shop.catalogue().map(o => [o.id, o.kind === 'truck' ? 'non-consumable' : 'consumable', o.title, o.sub, o.price.toFixed(2)]);
const out = path.join(ROOT, 'output/play-products.csv');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, ['id,kind,title,description,price_usd', ...rows.map(r => r.map(csv).join(','))].join('\n') + '\n');
console.log(`${rows.length} products -> ${path.relative(ROOT, out)}`);
