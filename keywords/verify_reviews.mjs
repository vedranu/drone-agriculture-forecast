// Abstracts (OpenAlex) + bibliographic metadata (Crossref) for candidate references.
import fs from 'node:fs';
const KEY = fs.readFileSync(new URL('./openalex_api_key.txt', import.meta.url), 'utf8').trim();
const DOIS = ['10.1016/j.compag.2024.109501', '10.3390/su15043557', '10.3389/fpls.2024.1435016', '10.1007/s42853-024-00240-1',
  '10.3390/drones8090476', '10.11591/ijece.v14i1.pp878-890', '10.1016/j.compag.2022.107017'];
const unInv = (inv) => { if (!inv) return '(no abstract)'; const a = []; for (const [w, ps] of Object.entries(inv)) for (const p of ps) a[p] = w; return a.join(' '); };
for (const d of DOIS) {
  const cr = await (await fetch(`https://api.crossref.org/works/${d}?mailto=vuros@veleknin.hr`)).json().catch(() => null);
  const m = cr?.message || {};
  const au = (m.author || []).map((a) => `${a.family}, ${a.given || ''}`).join('; ');
  console.log(`\n=== ${d}\nCR: ${au} | ${(m.issued?.['date-parts'] || [[]])[0][0]} | ${(m.title || [''])[0]} | ${(m['container-title'] || [''])[0]} | vol ${m.volume || ''} (${m.issue || ''}) | ${m.page || m['article-number'] || ''}`);
  const oa = await (await fetch(`https://api.openalex.org/works/doi:${d}?select=abstract_inverted_index`, { headers: { Authorization: `Bearer ${KEY}` } })).json().catch(() => null);
  console.log('ABS: ' + unInv(oa?.abstract_inverted_index).slice(0, 1600));
}
