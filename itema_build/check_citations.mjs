// In-text citations vs. reference list (both directions), as RECITE does.
import * as C from './content_itema.mjs';
const texts = [C.ABSTRACT, C.EVO_TEXT, C.HEAT_TEXT, ...C.BODY.filter((e) => e[0] === 'p').map((e) => e[1])];
const cites = new Set();
for (const t of texts) for (const m of t.matchAll(/\{c:\(([^}]*)\)\}/g)) for (const part of m[1].split(';')) cites.add(part.trim());
const key = (s) => { const m = s.match(/^(.*?),\s*(\d{4}[a-z]?|In Press-[a-z])$/); if (!m) return s; const a = m[1].replace(/ et al\.$/, '').split(/ & |, /)[0].trim(); return `${a}|${m[2]}`; };
const citeKeys = new Map([...cites].map((c) => [key(c), c]));
const refKeys = new Map();
for (const r0 of C.REFS) {
  const r = r0.replace(/^!/, '');
  const y = (r.match(/\((\d{4}[a-z]?|In Press-[a-z])[,)]/) || [])[1];
  let a = r.split(',')[0].trim();
  if (/^Commission Implementing Regulation/.test(r)) a = 'Commission Implementing Regulation (EU) 2019/947';
  if (/^Directive 2009\/128/.test(r)) a = 'Directive 2009/128/EC';
  if (/^DJI Agriculture/.test(r)) a = 'DJI Agriculture';
  if (/^van Eck/.test(r)) a = 'van Eck';
  refKeys.set(`${a}|${y}`, r.slice(0, 60));
}
let ok = true;
for (const [k, c] of citeKeys) if (!refKeys.has(k)) { ok = false; console.log('CITED BUT NOT IN LIST:', c, '->', k); }
for (const [k, r] of refKeys) if (!citeKeys.has(k)) { ok = false; console.log('IN LIST BUT NOT CITED:', r, '->', k); }
const sorted = [...C.REFS].map((r) => r.replace(/^!/, '').toLowerCase().replace(/^van /, 'v'));
for (let i = 1; i < sorted.length; i++) if (sorted[i] < sorted[i - 1]) { console.log('ORDER?', sorted[i - 1].slice(0, 40), '>', sorted[i].slice(0, 40)); }
console.log(ok ? `OK: ${citeKeys.size} cited works = ${refKeys.size} references` : 'MISMATCH');
const all = JSON.stringify(C);
console.log('em dash present:', /—/.test(all), '| en dash present:', /–/.test(all));
