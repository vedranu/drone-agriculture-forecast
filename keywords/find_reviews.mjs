// Find recent (2023-2026) bibliometric / scientometric reviews of drones in agriculture in OpenAlex.
import fs from 'node:fs';
const KEY = fs.readFileSync(new URL('./openalex_api_key.txt', import.meta.url), 'utf8').trim();
const H = { Authorization: `Bearer ${KEY}` };
const q = '(drone OR drones OR UAV OR UAVs OR "unmanned aerial") AND (agriculture OR agricultural OR farming OR crop) AND (bibliometric OR scientometric OR "science mapping" OR VOSviewer OR bibliometrix)';
const f = encodeURIComponent(`title_and_abstract.search:${q},publication_year:2023-2026,type:article|review`);
const r = await fetch(`https://api.openalex.org/works?filter=${f}&sort=cited_by_count:desc&per-page=40&select=id,doi,title,publication_year,cited_by_count,primary_location,authorships`, { headers: H });
const j = await r.json();
console.log('total', j.meta?.count);
for (const w of j.results || []) {
  const src = w.primary_location?.source?.display_name || '?';
  const au = (w.authorships || []).slice(0, 3).map((a) => a.author.display_name).join('; ');
  console.log(`${w.cited_by_count}\t${w.publication_year}\t${src}\t${w.doi}\t${w.title}\t${au}`);
}
