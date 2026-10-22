// Retrieves per-work keywords/topics for the core query D AND A NOT N (OpenAlex), 2005-2026.
// Output: keywords/works_core.jsonl (one compact record per work) + keywords/fetch_log.txt
// Run: node fetch_keywords.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAILTO = 'vuros@veleknin.hr';
const D = '(drone OR drones OR UAV OR UAVs OR UAS OR "unmanned aerial" OR "unmanned aircraft" OR RPAS OR "remotely piloted aircraft")';
const A = '(agriculture OR agricultural OR "precision agriculture" OR "precision farming" OR "smart farming" OR farm OR farms OR farming OR farmland OR crop OR crops OR cropland OR yield OR irrigation OR fertilizer OR fertiliser OR fertilization OR pesticide OR pesticides OR spraying OR herbicide OR weed OR weeds OR phenotyping OR livestock OR cattle OR orchard OR orchards OR vineyard OR vineyards OR agronomy OR agronomic OR "plant disease" OR "crop disease" OR "soil moisture" OR paddy OR "arable land")';
const N = '(drosophila OR gal4 OR transgene OR transgenic OR bee OR bees OR honeybee OR honeybees OR "honey bee" OR bumblebee OR apis OR urticaria OR aneurysm OR aneurysms OR patients OR "university of agricultural sciences")';
const Q = `${D} AND ${A} NOT ${N}`;
const FILTER = `title_and_abstract.search:${Q},publication_year:2005-2026,type:article|review`;
const SELECT = 'id,publication_year,cited_by_count,keywords,primary_topic';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Optional free API key (never printed, file is git-ignored): keywords/openalex_api_key.txt
const KEYFILE = path.join(HERE, 'openalex_api_key.txt');
const API_KEY = fs.existsSync(KEYFILE) ? fs.readFileSync(KEYFILE, 'utf8').trim() : '';
const HEADERS = { 'User-Agent': `itema-agrodrones (mailto:${MAILTO})` };
if (API_KEY) HEADERS.Authorization = `Bearer ${API_KEY}`;
const PAUSE = API_KEY ? 250 : 1100;
async function getJSON(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return await res.json();
      if (res.status === 429 || res.status >= 500) { const t = await res.text(); if (/Insufficient budget/.test(t)) throw new Error('OpenAlex daily budget exhausted - add keywords/openalex_api_key.txt or wait for midnight UTC'); await sleep(2000 * (i + 1)); continue; }
      throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    } catch (e) { if (i === tries - 1) throw e; await sleep(2000 * (i + 1)); }
  }
}
const base = 'https://api.openalex.org/works';
const enc = encodeURIComponent;

// 1) annual check counts (to compare with the 28 Aug 2026 series)
const g = await getJSON(`${base}?filter=${enc(FILTER)}&group_by=publication_year&per-page=50&mailto=${MAILTO}`);
const annual = Object.fromEntries(g.group_by.map((x) => [x.key, x.count]));
const log = [`Retrieved ${new Date().toISOString()}`, `Query: ${Q}`, `Total meta count: ${g.meta.count}`,
  'Annual: ' + Object.keys(annual).sort().map((k) => `${k}:${annual[k]}`).join(' ')];
console.log(log.join('\n'));

// 2) all works, year by year with page-based paging (no API key needed; 1 req/s for long Boolean queries).
// Resumable: each completed year is written to works_<year>.jsonl and skipped on re-run.
const YEARS = Object.keys(annual).map(Number).sort((a, b) => a - b);
let total = 0;
for (const y of YEARS) {
  const fn = path.join(HERE, `works_${y}.jsonl`);
  if (fs.existsSync(fn)) { total += fs.readFileSync(fn, 'utf8').trim().split('\n').length; continue; }
  const fy = enc(`title_and_abstract.search:${Q},publication_year:${y},type:article|review`);
  const pages = Math.ceil(annual[y] / 200);
  const lines = [];
  for (let p = 1; p <= pages; p++) {
    await sleep(PAUSE);
    const j = await getJSON(`${base}?filter=${fy}&select=${SELECT}&per-page=200&page=${p}&mailto=${MAILTO}`);
    for (const w of j.results) {
      lines.push(JSON.stringify({
        id: w.id.replace('https://openalex.org/', ''),
        y: w.publication_year,
        c: w.cited_by_count,
        kw: (w.keywords || []).map((k) => [k.display_name, Math.round((k.score || 0) * 1000) / 1000]),
        t: w.primary_topic ? w.primary_topic.display_name : null,
        sf: w.primary_topic?.subfield?.display_name ?? null,
        f: w.primary_topic?.field?.display_name ?? null,
      }));
    }
  }
  fs.writeFileSync(fn, lines.join('\n') + '\n');
  total += lines.length;
  console.log(`${y}: ${lines.length} records (${pages} pages)`);
}
log.push(`Records written: ${total}`);
fs.writeFileSync(path.join(HERE, 'fetch_log.txt'), log.join('\n') + '\n');
console.log(`DONE ${total}`);
