// Keyword co-occurrence network, thematic evolution of keyword clusters and keyword x year heatmap
// for the OpenAlex agro-drone corpus (D AND A NOT N). Input: ../keywords/works_<year>.jsonl
// Output: ../keywords/analysis/*.csv + summary.json.  Run: node analyze_keywords.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { circular } from 'graphology-layout';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IN = path.resolve(HERE, '../keywords');
const OUT = path.join(IN, 'analysis');
fs.mkdirSync(OUT, { recursive: true });

// ---------- settings ----------
const PERIODS = [[2005, 2014], [2015, 2019], [2020, 2022], [2023, 2024], [2025, 2026]];
const TOP_GLOBAL = 60;          // nodes in the overall co-occurrence map
const TOP_PERIOD = 50;          // keywords per period in the thematic evolution
const MIN_COOC = 3;             // minimum co-occurrence for an edge
const HEAT_YEARS = [2014, 2026];
const SEED = 20261022;
const RES_GLOBAL = 1.25;      // Louvain resolution for the overall map
const RES_PERIOD = 1.3;       // Louvain resolution for the period maps (finer themes)
const GENERIC = new Set(['precision agriculture', 'remote sensing', 'smart agriculture']); // not used as cluster labels unless nothing else

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- load ----------
const works = [];
for (const f of fs.readdirSync(IN).filter((f) => /^works_\d{4}\.jsonl$/.test(f)).sort()) {
  for (const line of fs.readFileSync(path.join(IN, f), 'utf8').split('\n')) if (line.trim()) works.push(JSON.parse(line));
}
// residual homonym noise: "RPAS" is stemmed to "RPA" (recombinase polymerase amplification), plus other molecular/physics homonyms
const NOISE = /recombinase|polymerase|crispr|cas1[23]|homologous recombination|random phase approximation|correlation energy|vaccine|antibod|immunoassay|lateral flow|isothermal amplification|nucleic acid|aptamer|replication protein a|\brpa\b/i;
const NOISE_TOPIC = /amplification|crispr|electronic structure|density functional|dna repair|vaccine|immun/i;
const nAll = works.length; const removedTopics = {};
for (let i = works.length - 1; i >= 0; i--) {
  const w = works[i];
  if (w.kw.some(([k]) => NOISE.test(k)) || (w.t && NOISE_TOPIC.test(w.t))) { removedTopics[w.t] = (removedTopics[w.t] || 0) + 1; works.splice(i, 1); }
}
const years = [...new Set(works.map((w) => w.y))].sort((a, b) => a - b);
console.log(`works: ${nAll} retrieved, ${nAll - works.length} removed as homonym noise, ${works.length} kept; years ${years[0]}-${years[years.length - 1]}`);
console.log('  removed (top topics):', Object.entries(removedTopics).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => `${t} ${n}`).join(' | '));

// ---------- keyword normalisation ----------
const STOP = /\b(drones?|uavs?|uas|unmanned|rpas|remotely piloted|aerial vehicles?|aerial systems?|multirotor|quadcopters?|multicopters?)\b/i;
const STOP_EXACT = new Set(['agriculture', 'agricultural', 'farming', 'crop', 'crops']);
const ACR = { ndvi: 'NDVI', lidar: 'LiDAR', yolo: 'YOLO', iot: 'IoT', gis: 'GIS', rgb: 'RGB', cnn: 'CNN', gnss: 'GNSS', rtk: 'RTK', gps: 'GPS', lai: 'LAI', sar: 'SAR', ai: 'AI', '3d': '3D', uav: 'UAV', ndre: 'NDRE', svm: 'SVM', yolov5: 'YOLOv5', yolov7: 'YOLOv7', yolov8: 'YOLOv8', yolov11: 'YOLOv11', yolov10: 'YOLOv10', xgboost: 'XGBoost', 'u-net': 'U-Net', sfm: 'SfM', lstm: 'LSTM', 'lidar-based': 'LiDAR-based', ml: 'ML', dl: 'DL' };
const raw = new Map();
for (const w of works) for (const [k] of w.kw) { const key = k.toLowerCase().trim(); raw.set(key, (raw.get(key) || 0) + 1); }
const canon = new Map(); // key -> canonical key (merge simple plurals)
for (const key of raw.keys()) {
  let c = key;
  const cand = key.endsWith('ies') ? key.slice(0, -3) + 'y' : key.endsWith('s') && key.length > 4 ? key.slice(0, -1) : null;
  if (cand && raw.has(cand)) c = raw.get(cand) >= raw.get(key) ? cand : key;
  canon.set(key, c);
}
for (const [k, c] of canon) if (c !== k && canon.get(c) !== c) canon.set(k, canon.get(c));
const label = (k) => { const s = k.split(' ').map((t) => ACR[t] || t).join(' '); return s.charAt(0).toUpperCase() + s.slice(1); };
for (const w of works) {
  const set = new Set();
  for (const [k] of w.kw) { const c = canon.get(k.toLowerCase().trim()); if (!STOP.test(c) && !STOP_EXACT.has(c)) set.add(c); }
  w.K = [...set];
}

// ---------- helpers ----------
const csv = (rows) => rows.map((r) => r.map((v) => (typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\n') + '\n';
function docFreq(ws) { const m = new Map(); for (const w of ws) for (const k of w.K) m.set(k, (m.get(k) || 0) + 1); return m; }
function topK(freq, n) { return [...freq.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map((e) => e[0]); }
function cooc(ws, keys) {
  const idx = new Map(keys.map((k, i) => [k, i])); const C = new Map();
  for (const w of ws) {
    const ks = w.K.filter((k) => idx.has(k)).map((k) => idx.get(k)).sort((a, b) => a - b);
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const id = ks[i] * 10000 + ks[j]; C.set(id, (C.get(id) || 0) + 1); }
  }
  return [...C.entries()].map(([id, c]) => [Math.floor(id / 10000), id % 10000, c]);
}
// association strength (van Eck & Waltman 2009): s_ij = N c_ij / (f_i f_j)
function buildGraph(ws, keys, freq) {
  const N = ws.length; const G = new Graph({ type: 'undirected' });
  keys.forEach((k) => G.addNode(k, { freq: freq.get(k) }));
  const edges = cooc(ws, keys).filter((e) => e[2] >= MIN_COOC);
  for (const [i, j, c] of edges) G.addEdge(keys[i], keys[j], { c, weight: (N * c) / (freq.get(keys[i]) * freq.get(keys[j])) });
  // isolated nodes: attach to strongest partner with weight from c>=1 to keep them in a cluster
  return G;
}
function clusters(G, seed, resolution = 1.0) {
  const comm = louvain(G, { getEdgeWeight: 'weight', rng: mulberry32(seed), resolution });
  return comm;
}
const meanYear = (ws, k) => { let s = 0, n = 0; for (const w of ws) if (w.K.includes(k)) { s += w.y; n++; } return n ? s / n : NaN; };

// ---------- 1) overall co-occurrence map ----------
const freqAll = docFreq(works);
const gKeys = topK(freqAll, TOP_GLOBAL);
const G = buildGraph(works, gKeys, freqAll);
const comm = clusters(G, SEED, RES_GLOBAL);
// clusters with fewer than 3 keywords are merged into the cluster they co-occur with most (same rule as the period maps)
{
  const size = {}; for (const k of gKeys) size[comm[k]] = (size[comm[k]] || 0) + 1;
  for (const k of gKeys) {
    if (size[comm[k]] >= 3) continue;
    const score = {};
    G.forEachEdge(k, (e, a, s, t) => { const o = s === k ? t : s; if (size[comm[o]] >= 3) score[comm[o]] = (score[comm[o]] || 0) + a.c; });
    const best = Object.keys(score).sort((x, y) => score[y] - score[x])[0];
    if (best !== undefined) { size[comm[k]]--; comm[k] = isNaN(+best) ? best : +best; size[comm[k]]++; }
  }
}
// renumber clusters by total frequency (1 = largest)
const cTot = {}; for (const k of gKeys) cTot[comm[k]] = (cTot[comm[k]] || 0) + freqAll.get(k);
const order = Object.keys(cTot).sort((a, b) => cTot[b] - cTot[a]);
const cMap = Object.fromEntries(order.map((c, i) => [c, i + 1]));
circular.assign(G, { scale: 100 });
forceAtlas2.assign(G, { iterations: 1500, getEdgeWeight: 'weight', settings: { gravity: 1.5, scalingRatio: 12, strongGravityMode: false, edgeWeightInfluence: 1, linLogMode: false, adjustSizes: false, barnesHutOptimize: false, slowDown: 2 } });
const kwYearMean = Object.fromEntries(gKeys.map((k) => [k, meanYear(works, k)]));
const nodeRows = [['keyword', 'label', 'freq', 'cluster', 'x', 'y', 'mean_year', 'mean_citations']];
for (const k of gKeys) {
  const a = G.getNodeAttributes(k);
  const cit = works.filter((w) => w.K.includes(k)); const mc = cit.reduce((s, w) => s + (w.c || 0), 0) / cit.length;
  nodeRows.push([k, label(k), a.freq, cMap[comm[k]], +a.x.toFixed(3), +a.y.toFixed(3), +kwYearMean[k].toFixed(2), +mc.toFixed(1)]);
}
fs.writeFileSync(path.join(OUT, 'network_nodes.csv'), csv(nodeRows));
const edgeRows = [['source', 'target', 'cooc', 'assoc_strength']];
G.forEachEdge((e, a, s, t) => edgeRows.push([s, t, a.c, +a.weight.toFixed(4)]));
fs.writeFileSync(path.join(OUT, 'network_edges.csv'), csv(edgeRows));
const clusterSummary = order.map((c, i) => { const ks = gKeys.filter((k) => comm[k] === +c || String(comm[k]) === c).sort((a, b) => freqAll.get(b) - freqAll.get(a)); return { cluster: i + 1, n: ks.length, total: cTot[c], top: ks.slice(0, 8).map(label), mean_year: +(ks.reduce((s, k) => s + kwYearMean[k] * freqAll.get(k), 0) / cTot[c]).toFixed(2) }; });
console.log('Global clusters:'); for (const c of clusterSummary) console.log(`  C${c.cluster} (${c.n} kw, mean yr ${c.mean_year}): ${c.top.join('; ')}`);

// ---------- 2) thematic evolution of keyword clusters ----------
const evoNodes = [['period', 'period_label', 'cluster_id', 'label', 'n_keywords', 'occurrences', 'share_of_period', 'n_docs_period', 'keywords']];
const evoLinks = [['from_id', 'to_id', 'shared_keywords', 'inclusion_index', 'weighted_occ', 'shared']];
const periodClusters = [];
PERIODS.forEach(([a, b], pi) => {
  const ws = works.filter((w) => w.y >= a && w.y <= b);
  if (ws.length < 50) return;
  const fr = docFreq(ws); const keys = topK(fr, TOP_PERIOD);
  const Gp = buildGraph(ws, keys, fr); const cm = clusters(Gp, SEED + pi, RES_PERIOD);
  const groups = {}; for (const k of keys) (groups[cm[k]] ||= []).push(k);
  // clusters with fewer than 3 keywords are merged into their most strongly connected larger cluster
  const big = Object.keys(groups).filter((c) => groups[c].length >= 3);
  for (const c of Object.keys(groups)) {
    if (groups[c].length >= 3 || !big.length) continue;
    for (const k of groups[c]) {
      let best = big[0], bw = -1;
      for (const b of big) { let s = 0; for (const m of groups[b]) if (Gp.hasEdge(k, m)) s += Gp.getEdgeAttribute(k, m, 'c'); if (s > bw) { bw = s; best = b; } }
      groups[best].push(k);
    }
    delete groups[c];
  }
  const totalOcc = keys.reduce((s, k) => s + fr.get(k), 0);
  const list = Object.values(groups).map((ks) => ks.sort((x, y) => fr.get(y) - fr.get(x)))
    .map((ks) => ({ ks, occ: ks.reduce((s, k) => s + fr.get(k), 0) })).sort((x, y) => y.occ - x.occ);
  const plabel = a === b ? `${a}` : `${a}-${b}`;
  const out = list.map((g, ci) => {
    const id = `P${pi + 1}C${ci + 1}`;
    // label = the two most frequent keywords of the cluster
    const spec = g.ks.filter((k) => !GENERIC.has(k)); const lab = (spec.length >= 2 ? spec : g.ks).slice(0, 2).map(label).join(' / ');
    evoNodes.push([pi + 1, plabel, id, lab, g.ks.length, g.occ, +(g.occ / totalOcc).toFixed(4), ws.length, g.ks.map(label).join('; ')]);
    return { id, ks: new Set(g.ks), fr, occ: g.occ };
  });
  periodClusters.push({ pi, plabel, out, n: ws.length });
});
for (let p = 0; p + 1 < periodClusters.length; p++) {
  for (const A of periodClusters[p].out) for (const B of periodClusters[p + 1].out) {
    const shared = [...A.ks].filter((k) => B.ks.has(k));
    if (!shared.length) continue;
    const incl = shared.length / Math.min(A.ks.size, B.ks.size);
    if (incl < 0.1) continue;
    const wocc = shared.reduce((s, k) => s + A.fr.get(k) / periodClusters[p].n + B.fr.get(k) / periodClusters[p + 1].n, 0);
    evoLinks.push([A.id, B.id, shared.length, +incl.toFixed(3), +wocc.toFixed(4), shared.map(label).join('; ')]);
  }
}
fs.writeFileSync(path.join(OUT, 'evolution_nodes.csv'), csv(evoNodes));
fs.writeFileSync(path.join(OUT, 'evolution_links.csv'), csv(evoLinks));
console.log('Thematic evolution:'); for (const r of evoNodes.slice(1)) console.log(`  ${r[1]} ${r[2]} (${r[4]} kw, ${(100 * r[6]).toFixed(0)} %): ${r[3]}`);

// ---------- 3) keyword x year heatmap (documents per 1,000 corpus documents) ----------
const hy = years.filter((y) => y >= HEAT_YEARS[0] && y <= HEAT_YEARS[1]);
const nYear = Object.fromEntries(hy.map((y) => [y, works.filter((w) => w.y === y).length]));
const lastY = hy[hy.length - 1];
const recent = works.filter((w) => w.y >= lastY - 1); const base5 = works.filter((w) => w.y >= 2015 && w.y <= 2019);
const fR = docFreq(recent), fB = docFreq(base5);
const shR = (k) => (fR.get(k) || 0) / recent.length, shB = (k) => (fB.get(k) || 0) / base5.length;
const cand = [...fR.keys()].filter((k) => (fR.get(k) || 0) >= 40);
const established = cand.sort((a, b) => shR(b) - shR(a)).slice(0, 10);
const emerging = cand.filter((k) => !established.includes(k)).sort((a, b) => (shR(b) + 1e-4) / (shB(b) + 2e-3) - (shR(a) + 1e-4) / (shB(a) + 2e-3)).slice(0, 10);
const heatKeys = [...established, ...emerging];
const peakYear = (k) => { let best = hy[0], bv = -1; for (const y of hy) { const v = works.filter((w) => w.y === y && w.K.includes(k)).length / nYear[y]; if (v > bv) { bv = v; best = y; } } return best; };
const heatRows = [['keyword', 'label', 'group', 'growth_ratio', ...hy]];
for (const k of heatKeys) {
  const row = hy.map((y) => +(1000 * works.filter((w) => w.y === y && w.K.includes(k)).length / nYear[y]).toFixed(2));
  heatRows.push([k, label(k), established.includes(k) ? 'established' : 'emerging', +((shR(k) + 1e-4) / (shB(k) + 2e-3)).toFixed(2), ...row]);
}
fs.writeFileSync(path.join(OUT, 'heatmap_keywords.csv'), csv(heatRows));
fs.writeFileSync(path.join(OUT, 'top_keywords.csv'), csv([['keyword', 'label', 'freq_all', 'freq_recent', 'freq_2015_2019'], ...topK(freqAll, 100).map((k) => [k, label(k), freqAll.get(k), fR.get(k) || 0, fB.get(k) || 0])]));
const summary = { retrieved_years: [years[0], years[years.length - 1]], n_retrieved: nAll, n_removed: nAll - works.length, n_works: works.length, n_with_keywords: works.filter((w) => w.K.length).length,
  mean_kw_per_work: +(works.reduce((s, w) => s + w.K.length, 0) / works.length).toFixed(2), distinct_keywords: new Set(works.flatMap((w) => w.K)).size,
  global_clusters: clusterSummary, edges_global: G.size, heat_years: hy, heat_established: established.map(label), heat_emerging: emerging.map(label) };
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
console.log('Heatmap established:', established.map(label).join('; '));
console.log('Heatmap emerging:', emerging.map(label).join('; '));
console.log(JSON.stringify({ n: summary.n_works, withKW: summary.n_with_keywords, meanKW: summary.mean_kw_per_work, distinct: summary.distinct_keywords, edges: summary.edges_global }));
