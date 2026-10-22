// Rough self-plagiarism check: share of 8-word shingles of the ITEMA text that also occur in the published papers.
import fs from 'node:fs';
import JSZip from 'jszip';
const C = await import(process.env.CONTENT || './content_itema.mjs');
const norm = (s) => s.replace(/\{[a-z]+:|\}/g, '').replace(/\[[0-9, ]+\]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
const sh = (w, n = 8) => { const s = new Set(); for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(' ')); return s; };
async function docxText(f) { const z = await JSZip.loadAsync(fs.readFileSync(f)); const x = await z.file('word/document.xml').async('string'); return x.replace(/<w:p[ >]/g, '\n<w:p ').replace(/<[^>]+>/g, ''); }
const R = 'C:/Users/vedra/Desktop/Radovi 2026';
const sources = {};
for (const f of [`${R}/agrodronovi/paper/content_agro.py`, `${R}/ITEMA/paper/content_agro.py`]) if (fs.existsSync(f)) { sources['MIPRO agro (content_agro.py)'] = fs.readFileSync(f, 'utf8'); break; }
sources['Sarajevo EN'] = await docxText(R + '/sarajevo/paper/Sarajevo_UAV_subdomains_EN.docx');
sources['MIPRO ecology rev1'] = await docxText(R + '/_GOTOVO/mipro_drones/paper/MIPRO_2026_Drones_Ecology_Forecast_rev1.docx');
sources['MIPRO agro docx'] = await docxText(R + '/agrodronovi/paper/MIPRO_Drones_Agriculture_Forecast.docx');
const mine = [C.TITLE, C.ABSTRACT, C.EVO_TEXT, C.HEAT_TEXT, ...C.BODY.filter((e) => e[0] === 'p').map((e) => e[1])].filter((x) => typeof x === 'string').join(' ');
const S = sh(norm(mine));
let union = new Set();
for (const [name, txt] of Object.entries(sources)) {
  const O = sh(norm(txt)); const hit = [...S].filter((x) => O.has(x)); hit.forEach((h) => union.add(h));
  console.log(`${name}: ${(100 * hit.length / S.size).toFixed(1)} % of 8-grams shared`);
}
console.log(`Any published source: ${(100 * union.size / S.size).toFixed(1)} % (${union.size}/${S.size})`);
// longest shared runs, to rewrite
const w = norm(mine); let runs = [], cur = [];
for (let i = 0; i + 8 <= w.length; i++) { const g = w.slice(i, i + 8).join(' '); if (union.has(g)) cur.push(i); else if (cur.length) { runs.push(cur); cur = []; } }
if (cur.length) runs.push(cur);
runs.sort((a, b) => b.length - a.length).slice(0, 8).forEach((r) => console.log(`  [${r.length + 7} words] ${w.slice(r[0], r[r.length - 1] + 8).join(' ')}`));
