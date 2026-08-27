// Build "Projekcija_2026_2035.docx" from ../projection outputs.  Run: node build_projection_doc.js
const fs = require('fs'), path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, LevelFormat, ShadingType, BorderStyle } = require('docx');
const P = path.join(__dirname, '..', 'projection'), Dd = path.join(__dirname, '..', 'data');
const csv = f => { const L = fs.readFileSync(f, 'utf8').trim().split('\n'); const h = L[0].split(','); return L.slice(1).map(l => { const m = l.match(/^(.*?),"(.*)"$/); const a = m ? [...m[1].split(','), m[2]] : l.split(','); return Object.fromEntries(h.map((k, i) => [k, a[i]])); }); };
const annual = csv(path.join(Dd, 'openalex_drone_agro_annual.csv'));
const hr0 = x => Math.round(Number(x)).toLocaleString('hr-HR');
const hr1 = x => Number(x).toLocaleString('hr-HR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const T = (t, o = {}) => new TextRun({ text: t, size: 21, ...o });
const Pp = (c, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: Array.isArray(c) ? c : [T(c)] });
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 100 }, children: [new TextRun(t)] });
const bullet = t => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: Array.isArray(t) ? t : [T(t)] });
const cap = t => new Paragraph({ spacing: { before: 60, after: 200 }, children: [new TextRun({ text: t, italics: true, size: 18 })] });
const img = (f, w, h) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(P, f)), transformation: { width: w * 37.8, height: h * 37.8 } })] });
function table(header, rows, widths, aligns, hl = []) {
  const cell = (t, w, bold, align, fill) => new TableCell({ width: { size: w, type: WidthType.DXA }, shading: fill ? { type: ShadingType.CLEAR, fill } : undefined, margins: { top: 30, bottom: 30, left: 70, right: 70 }, children: [new Paragraph({ alignment: align, children: [new TextRun({ text: String(t), bold, size: 17 })] })] });
  return new Table({ width: { size: widths.reduce((a, b) => a + b), type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], true, aligns[i], 'D9E2F3')) }),
      ...rows.map((r, ri) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], false, aligns[i], hl.includes(ri) ? 'FFF2CC' : undefined)) }))] });
}
const R = AlignmentType.RIGHT, L = AlignmentType.LEFT;
const wide = f => { const rows = csv(f); const years = [...new Set(rows.map(r => r.year))]; return years.map(y => { const o = { year: y }; rows.filter(r => r.year === y).forEach(r => { o[r.model] = r; }); return o; }); };
const core = wide(path.join(P, 'core', 'forecast_count.csv')), share = wide(path.join(P, 'core', 'forecast_share.csv'));
const subs = ['sub_crop_monitoring', 'sub_spraying', 'sub_weeds', 'sub_irrigation', 'sub_disease_pest', 'sub_yield', 'sub_livestock'];
const slab = { sub_crop_monitoring: 'Praćenje usjeva', sub_spraying: 'Prskanje', sub_weeds: 'Korovi', sub_irrigation: 'Navodnjavanje', sub_disease_pest: 'Bolesti/štetnici', sub_yield: 'Prinos', sub_livestock: 'Stočarstvo' };
const subw = Object.fromEntries(subs.map(s => [s, wide(path.join(P, s, 'forecast_count.csv'))]));
const obs = y => annual.find(r => r.year === String(y));

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } }, paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: '1F3864' }, paragraph: { outlineLevel: 0 } }] },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: L, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{ properties: { page: { margin: { top: 1300, bottom: 1300, left: 1300, right: 1300 } } }, children: [
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Projekcija korištenja agrodronova u poljoprivredi 2026.–2035.', bold: true, size: 32, color: '1F3864' })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Godišnja projekcija znanstvene produkcije (OpenAlex) na temelju podataka 2005.–2025.; izlaz skripte drone_env_projection_10y.m (1000 bootstrap replika za jezgru, 200 za poddomene). Dopuna radnog dokumenta od 28. 8. 2026.', italics: true, size: 19, color: '595959' })] }),

    H1('1. Kratki odgovor'),
    Pp([T('Ako se nastavi dinamika iz 2005.–2025., broj radova o dronovima u poljoprivredi (čisti upit) raste s ', {}), T(`${hr0(obs(2025).core_drone_agro)} (2025.)`, { bold: true }), T(' na oko '), T(`${hr0(core[2].qaicc_average.q50)} u 2028.`, { bold: true }), T(` [90 %: ${hr0(core[2].qaicc_average.q05)}–${hr0(core[2].qaicc_average.q95)}], `), T(`${hr0(core[4].qaicc_average.q50)} u 2030.`, { bold: true }), T(` [${hr0(core[4].qaicc_average.q05)}–${hr0(core[4].qaicc_average.q95)}] i `), T(`${hr0(core[9].qaicc_average.q50)} u 2035.`, { bold: true }), T(` [${hr0(core[9].qaicc_average.q05)}–${hr0(core[9].qaicc_average.q95)}]. `), T('Modeli se slažu do 2028./2029.; nakon toga se razilaze između zasićenja na ~21 000 radova godišnje (logistički), vrhunca 2033. (Bass) te nastavka eksponencijalnog rasta (~52 000 u 2035.). Interval za 2035. je zato širok i to je nalaz, ne slabost metode.')]),
    Pp([T('Udio te teme u poljoprivrednoj literaturi je mnogo predvidljiviji: s '), T(`${hr1(obs(2025).core_drone_agro / obs(2025).agro_only * 1000)} na 1 000 (2025.)`, { bold: true }), T(` raste na ${hr1(share[4].qaicc_average.q50)} u 2030. [${hr1(share[4].qaicc_average.q05)}–${hr1(share[4].qaicc_average.q95)}] i ${hr1(share[9].qaicc_average.q50)} u 2035. [${hr1(share[9].qaicc_average.q05)}–${hr1(share[9].qaicc_average.q95)}]; logistički model (težina 0,91) daje plato od 13,8 na 1 000, a 2025. je tek na 62 % platoa — za razliku od ekologije (85 %), udio agrodronova ima još zamjetan prostor rasta prije zasićenja.`)]),

    H1('2. Jezgra: broj radova godišnje'),
    table(['Godina', 'Eksponencijalni', 'Logistički', 'Gompertz', 'Bass', 'Prosjek modela', '90 % interval'],
      core.map(r => [r.year, hr0(r.exponential.point), hr0(r.logistic.point), hr0(r.gompertz.point), hr0(r.bass.point), hr0(r.qaicc_average.q50), `${hr0(r.qaicc_average.q05)} – ${hr0(r.qaicc_average.q95)}`]),
      [900, 1400, 1300, 1300, 1200, 1500, 2100], [L, R, R, R, R, R, R], [2, 4, 6, 9]),
    cap('Tablica 1. Točkaste procjene po modelu i QAICc-ponderirani prosjek (medijan) s 90 % negativno-binomnim bootstrap intervalom, 1000 replika. Težine modela: eksponencijalni 0,39, logistički 0,16, Gompertz 0,29, Bass 0,15. Označene godine = horizonti 3/5/7/10 g.'),
    img('fig_projection_core.png', 11, 8.3),
    cap('Slika 1. Opaženi broj radova 2010.–2025. (točke), četiri modela rasta (linije), prosjek modela (kvadrati) i 90 % interval (sivo), log-skala.'),

    H1('3. Jezgra: udio u poljoprivrednoj literaturi (na 1 000 radova)'),
    table(['Godina', 'Eksponencijalni', 'Logistički', 'Gompertz', 'Prosjek modela', '90 % interval'],
      share.map(r => [r.year, hr1(r.exponential.point), hr1(r.logistic.point), hr1(r.gompertz.point), hr1(r.qaicc_average.q50), `${hr1(r.qaicc_average.q05)} – ${hr1(r.qaicc_average.q95)}`]),
      [900, 1500, 1400, 1400, 1600, 2200], [L, R, R, R, R, R], [2, 4, 6, 9]),
    cap('Tablica 2. Projekcija udjela (nazivnik: radovi koji sadrže poljoprivredne pojmove, isti način pretrage). Težine: logistički 0,91, Gompertz 0,09, eksponencijalni ≈ 0 (prikazan samo kao usporedba).'),

    H1('4. Poddomene'),
    table(['Godina', ...subs.map(s => slab[s])],
      [2025, 2028, 2030, 2032, 2035].map(y => [String(y), ...subs.map(s => y === 2025 ? hr0(obs(2025)[s]) : (r => `${hr0(r.qaicc_average.q50)} [${hr0(r.qaicc_average.q05)}–${hr0(r.qaicc_average.q95)}]`)(subw[s].find(r => r.year === String(y))))]),
      [800, 1300, 1250, 1250, 1300, 1300, 1200, 1250], [L, R, R, R, R, R, R, R]),
    cap('Tablica 3. Poddomene: opaženo 2025. i projekcija (prosjek modela [90 % interval], 200 replika). Poddomenski upiti se preklapaju. Kod navodnjavanja, bolesti/štetnika i prinosa dominira eksponencijalni model (težine 0,54–0,58), pa su intervali uski i podcjenjuju stvarnu nesigurnost dugoročnog oblika krivulje; kod praćenja usjeva dominira Gompertz (0,91).'),
    img('fig_projection_subdomains.png', 16.5, 10.5),
    cap('Slika 2. Projekcija po poddomenama (log-skala): opaženo 2010.–2025., prosjek modela i 90 % interval do 2035.'),

    H1('5. Kako čitati i citirati projekciju'),
    bullet('Za rad preporučujem citirati prosjek modela s intervalom za 2028. i 2030. te raspon modela (ne prosjek) za 2035. — na 10 godina pitanje „koji oblik krivulje" dominira nad svakom statističkom nesigurnošću.'),
    bullet('Robustan je zaključak o udjelu: plato ~13,8 na 1 000, potvrđen i backtestom (ishodište 2022.: MAPE 7,6 % za logistički, 28,5 % za eksponencijalni).'),
    bullet('Najbrže raste podatkovno vođena agronomija (predviđanje prinosa, navodnjavanje/vodni stres, bolesti i štetnici — CAGR 40–51 % u zadnjih 10 godina); stočarstvo i korovi rastu najsporije. Prskanje raste 36 %/god. i čini UAV aktuatorom — u EU ograničeno Direktivom 2009/128/EZ, pa je europski rast pretežno senzorski.'),
    bullet('Ograničenja: OpenAlex (širi od Scopusa), preciznost upita mijenja se kroz vrijeme (61 % ukupno, 37 % rano razdoblje), 2025. dijelom artefakt indeksiranja (bez 2025. logistički K pada s 21 000 na ~5 300), preklapanje poddomena, model nesigurnosti samo unutar četiri parametarska oblika. Sve je opisano u codebook.md i radnom dokumentu.'),
    bullet('Reprodukcija: matlab/drone_env_projection_10y.m (MATLAB ~10 min ukupno) → projection/<serija>/forecast_count.csv; python/build_projection.py slaže Excel i slike.'),
  ] }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(path.join(P, 'Projekcija_2026_2035.docx'), b); console.log('written'); });
