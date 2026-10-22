// Builds the ITEMA 2026 paper (.docx) from content_itema.mjs following the ITEMA author guidelines.
// Run: node build_itema.mjs   -> ../paper_itema/ITEMA_2026_Agricultural_Drones.docx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
  FootnoteReferenceRun, ExternalHyperlink, TabStopType, HighlightColor, Math as OMath, MathRun, MathFraction, MathSubScript,
  MathRoundBrackets, MathSquareBrackets, VerticalAlign, TableLayoutType,
} from 'docx';
import * as C from './content_itema.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const FIG = path.join(ROOT, 'figures_itema');
const OUTDIR = path.join(ROOT, 'paper_itema'); fs.mkdirSync(OUTDIR, { recursive: true });
const FONT = 'Times New Roman'; const ORANGE = 'ED7D31';
const TEXTW = 9071;                       // A4 width 11906 - 2 x 1418 margins (twips)

// numbers from the keyword analysis
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'keywords', 'analysis', 'summary.json'), 'utf8'));
const fmt = (n) => n.toLocaleString('en-US');
const TOKENS = { N_REMOVED: fmt(S.n_removed), PCT_REMOVED: (100 * S.n_removed / S.n_retrieved).toFixed(1), N_KW_WORKS: fmt(S.n_works),
  MEAN_KW: S.mean_kw_per_work.toFixed(1), NET_EDGES: fmt(S.edges_global), EVO_TEXT: C.EVO_TEXT, HEAT_TEXT: C.HEAT_TEXT };
const tok = (s) => s.replace(/\{b:([A-Z_]+)\}/g, (m, k) => (k in TOKENS ? TOKENS[k] : m));

// inline markup -> runs
function runs(src, base = {}) {
  const out = []; const s = tok(src); let i = 0;
  const push = (text, o) => { if (text) out.push(new TextRun({ text, font: FONT, ...base, ...o })); };
  while (i < s.length) {
    const j = s.indexOf('{', i);
    if (j < 0) { push(s.slice(i), {}); break; }
    push(s.slice(i, j), {});
    const k = s.indexOf(':', j); const tag = s.slice(j + 1, k);
    if (!['c', 'i', 'b', 'sup', 'sub'].includes(tag)) { push('{', {}); i = j + 1; continue; }
    let depth = 1, e = k + 1; while (e < s.length && depth) { if (s[e] === '{') depth++; else if (s[e] === '}') depth--; e++; }
    const inner = s.slice(k + 1, e - 1);
    const o = tag === 'c' ? { color: ORANGE } : tag === 'i' ? { italics: true } : tag === 'b' ? { bold: true } : tag === 'sup' ? { superScript: true } : { subScript: true };
    out.push(...runs(inner, { ...base, ...o }));
    i = e;
  }
  return out;
}
const P = (children, o = {}) => new Paragraph({ children, spacing: { after: 240, line: 240 }, alignment: AlignmentType.JUSTIFIED, ...o });
const plain = (s) => s.replace(/\{[a-z]+:|\}/g, '');

// ---------- equations (MS Word OMML, centred, number on the right) ----------
const mr = (t) => new MathRun(t);
const sub = (b, s) => new MathSubScript({ children: [mr(b)], subScript: [mr(s)] });
const EQ = {
  1: () => [sub('s', 'ij'), mr('='), new MathFraction({ numerator: [mr('N'), sub('c', 'ij')], denominator: [sub('f', 'i'), sub('f', 'j')] })],
  2: () => [mr('μ'), new MathRoundBrackets({ children: [mr('t')] }), mr('='), new MathFraction({ numerator: [mr('K')],
    denominator: [mr('1+exp'), new MathRoundBrackets({ children: [mr('−r'), new MathRoundBrackets({ children: [mr('t−'), sub('t', 'm')] })] })] })],
};
const { Tab } = await import('docx');
const eqPara = (n) => new Paragraph({
  tabStops: [{ type: TabStopType.CENTER, position: Math.round(TEXTW / 2) }, { type: TabStopType.RIGHT, position: TEXTW }],
  spacing: { before: 120, after: 240 },
  children: [new TextRun({ children: [new Tab()], font: FONT }), new OMath({ children: EQ[n]() }), new TextRun({ children: [new Tab(), `(${n})`], font: FONT })],
});

// ---------- figures ----------
function pngSize(file) { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
let figNo = 0, tabNo = 0;
const FIGW = { fig1_growth_forecast: 15.5, fig2_subdomain_heatmap: 15.5, fig3_cooccurrence_network: 14.0, fig4_thematic_evolution: 14.5, fig5_keyword_heatmap: 13.5 };
function figure(name, caption, source) {
  figNo++;
  const file = path.join(FIG, `${name}.png`); const { w, h } = pngSize(file);
  const wpx = Math.round((FIGW[name] || 15.5) / 2.54 * 96); const hpx = Math.round(wpx * h / w);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: wpx, height: hpx } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { after: 0 }, children: [new TextRun({ text: `Figure ${figNo}. `, bold: true, font: FONT, size: 22 }), ...runs(caption, { size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: `Source: ${source}`, font: FONT, size: 20 })] }),
  ];
}
// ---------- tables (TNR 10, no shading, header bold + centred, other cells left) ----------
const bd = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
function table(caption, header, rows, source) {
  tabNo++;
  const cell = (txt, head) => new TableCell({ borders: { top: bd, bottom: bd, left: bd, right: bd }, margins: { top: 40, bottom: 40, left: 80, right: 80 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: head ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 0 }, children: runs(txt, { size: 20, bold: head || undefined }) })] });
  const t = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.AUTOFIT,
    rows: [new TableRow({ tableHeader: true, children: header.map((h) => cell(h, true)) }), ...rows.map((r) => new TableRow({ children: r.map((c) => cell(c, false)) }))] });
  const capText = caption.replace(/^Table \d+\.\s*/, '');
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 120 }, children: [new TextRun({ text: `Table ${tabNo}. `, bold: true, font: FONT, size: 22 }), ...runs(capText, { size: 22 })] }),
    t,
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 240 }, children: [new TextRun({ text: `Source: ${source}`, font: FONT, size: 20 })] }),
  ];
}

// ---------- front matter ----------
const small = (t, o = {}) => new TextRun({ text: t, font: FONT, size: 20, ...o });
const front = [
  new Paragraph({ spacing: { after: 0 }, children: [small(C.RECEIVED)] }),
  new Paragraph({ spacing: { after: 0 }, children: [small('Accepted: Will be filled by the publisher')] }),
  new Paragraph({ spacing: { after: 480 }, children: [small('Published: Will be filled by the publisher')] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [new TextRun({ text: C.TITLE, bold: true, size: 28, font: FONT })] }),
];
const footnotes = {};
C.AUTHORS.forEach((a, i) => {
  const n = i + 1; const placeholder = /0000-0000-0000-0000/.test(a.orcid);
  footnotes[n] = { children: [new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: C.FOOTNOTES[i], font: FONT, size: 20 })] })] };
  front.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: i === C.AUTHORS.length - 1 ? 360 : 0 }, children: [
    new TextRun({ text: a.name, bold: true, font: FONT, size: 24 }), new FootnoteReferenceRun(n), new TextRun({ text: '  ', font: FONT }),
    placeholder ? new TextRun({ text: 'ORCID iD to be inserted', font: FONT, size: 20, highlight: HighlightColor.YELLOW })
      : new ExternalHyperlink({ link: a.orcid, children: [new TextRun({ text: a.orcid, font: FONT, size: 20, color: '0563C1', underline: {} })] }),
  ] }));
});
front.push(P([new TextRun({ text: 'Abstract: ', bold: true, italics: true, font: FONT }), ...runs(C.ABSTRACT, { italics: true })]));
front.push(P([new TextRun({ text: 'Keywords: ', bold: true, italics: true, font: FONT }), ...runs(C.KEYWORDS, { italics: true })], { spacing: { after: 360 } }));

// ---------- body ----------
const body = [];
for (const el of C.BODY) {
  const [kind] = el;
  if (kind === 'h1' || kind === 'h2') body.push(new Paragraph({ keepNext: true, spacing: { before: kind === 'h1' ? 240 : 120, after: 240 }, children: [new TextRun({ text: el[1], bold: true, font: FONT, size: 24 })] }));
  else if (kind === 'p') body.push(P(runs(el[1])));
  else if (kind === 'eq') body.push(eqPara(el[2]));
  else if (kind === 'fig') body.push(...figure(el[1], el[2], el[3]));
  else if (kind === 'table') body.push(...table(el[1], el[2], el[3], el[4]));
}
body.push(new Paragraph({ keepNext: true, spacing: { before: 240, after: 240 }, children: [new TextRun({ text: 'Acknowledgment', bold: true, font: FONT, size: 24 })] }));
body.push(P(runs(C.ACK)));
body.push(new Paragraph({ keepNext: true, spacing: { before: 240, after: 240 }, children: [new TextRun({ text: 'References', bold: true, font: FONT, size: 24 })] }));
for (const r of C.REFS) {
  const ph = r.startsWith('!'); const txt = ph ? r.slice(1) : r;
  body.push(new Paragraph({ alignment: AlignmentType.LEFT, indent: { left: 567, hanging: 567 }, spacing: { after: 40 },
    children: runs(txt, ph ? { highlight: HighlightColor.YELLOW } : {}) }));
}

const doc = new Document({
  creator: 'Vedran Uroš', lastModifiedBy: 'Vedran Uroš', title: C.TITLE, description: 'ITEMA 2026 full paper',
  styles: { default: { document: { run: { font: FONT, size: 24 }, paragraph: { spacing: { line: 240 } } } } },
  footnotes,
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } },
    children: [...front, ...body] }],
});
const outFile = path.join(OUTDIR, 'ITEMA_2026_Agricultural_Drones.docx');
fs.writeFileSync(outFile, await Packer.toBuffer(doc));
const words = (s) => plain(tok(s)).split(/\s+/).filter(Boolean).length;
console.log(`Written ${outFile}`);
console.log(`Abstract words: ${words(C.ABSTRACT)}; title chars: ${C.TITLE.length}; body words: ${C.BODY.filter((e) => e[0] === 'p').reduce((s, e) => s + words(e[1]), 0)}; figures ${figNo}, tables ${tabNo}, refs ${C.REFS.length}`);
