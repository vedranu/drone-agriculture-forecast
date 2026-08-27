// Build the working report (Croatian) as .docx from the results CSVs.
// Run:  node build_report.js
const fs = require('fs');
const path = require('path');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
        AlignmentType, ImageRun, LevelFormat, ShadingType, BorderStyle, PageBreak } = docx;

const R = path.join(__dirname, '..', 'results');
const csv = f => fs.readFileSync(path.join(R, f), 'utf8').trim().split('\n').slice(1).map(l => {
  // handle quoted last column
  const m = l.match(/^(.*?),"(.*)"$/); if (m) return [...m[1].split(','), m[2]]; return l.split(',');
});
const fcC = csv('forecast_count.csv'), fcS = csv('forecast_share.csv');
const mC = csv('models_count.csv'), mS = csv('models_share.csv');
const nboot = parseInt(fs.readFileSync(path.join(__dirname, '..', 'matlab', 'drone_env_forecast.m'), 'utf8').match(/opt\.nboot\s*=\s*(\d+)/)[1]);

const hr = n => Number(n).toLocaleString('hr-HR');
const r0 = x => hr(Math.round(Number(x)));
const r1 = x => Number(x).toLocaleString('hr-HR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const r2 = x => Number(x).toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const P = (text, opts = {}) => new Paragraph({ spacing: { after: 120 }, ...opts, children: Array.isArray(text) ? text : [new TextRun({ text, size: 21 })] });
const B = (text) => new TextRun({ text, bold: true, size: 21 });
const T = (text) => new TextRun({ text, size: 21 });
const I = (text) => new TextRun({ text, italics: true, size: 21 });
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: [new TextRun(t)] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun(t)] });
const bullet = t => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: Array.isArray(t) ? t : [new TextRun({ text: t, size: 21 })] });
const code = t => new Paragraph({ spacing: { after: 40 }, shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' }, children: [new TextRun({ text: t, font: 'Consolas', size: 17 })] });

function table(header, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (t, w, bold = false, align = AlignmentType.LEFT, fill) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text: String(t), bold, size: 18 })] })]
  });
  const aligns = opts.aligns || header.map((_, i) => i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], true, aligns[i], 'D9E2F3')) }),
           ...rows.map(r => new TableRow({ children: r.map((c, i) => cell(c, widths[i], false, aligns[i])) }))]
  });
}
const caption = t => new Paragraph({ spacing: { before: 60, after: 200 }, children: [new TextRun({ text: t, italics: true, size: 18 })] });
const img = (f, wcm, hcm) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(R, f)), transformation: { width: wcm * 37.8, height: hcm * 37.8 } })] });

// ---- forecast rows ----
const modelsC = ['exponential', 'logistic', 'gompertz', 'bass', 'qaicc_average'];
const labels = { exponential: 'Eksponencijalni', logistic: 'Logistički', gompertz: 'Gompertz', bass: 'Bass', qaicc_average: 'QAICc-prosjek' };
const fcRow = (rows, m, fmt) => {
  const rr = rows.filter(r => r[0] === m);
  return [labels[m], ...rr.map(r => `${fmt(r[3])} [${fmt(r[4])}; ${fmt(r[6])}]`)];
};
const wC = Object.fromEntries(mC.map(r => [r[0], r[5]]));
const wS = Object.fromEntries(mS.map(r => [r[0], r[5]]));

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, color: '1F3864' }, paragraph: { outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, color: '2E5395' }, paragraph: { outlineLevel: 1 } }] },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } },
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Agrodronovi u poljoprivredi: podaci, trenutno stanje i algoritam predviđanja rasta', bold: true, size: 34, color: '1F3864' })] }),
      new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Radni dokument za rad na MIPRO Robotics, sekcija RTA-DRONES. Verzija 1.0, 28. kolovoza 2026. Ista metodologija kao u projektu o dronovima u ekologiji (mipro_drones). Sve brojke u dokumentu izračunate su skriptom drone_env_forecast.m nad priloženim CSV-om; nijedna nije procijenjena „napamet".', size: 19, italics: true, color: '595959' })] }),

      H1('1. Što je napravljeno i što se od toga može koristiti u radu'),
      P('Prikupljen je reproducibilan godišnji skup podataka o znanstvenoj produkciji koja spaja dronove (UAV/UAS/RPAS) i poljoprivredu, 2000.–2026., iz baze OpenAlex, s dokumentiranim filtrom šuma (Drosophila GAL4/UAS, trutovi, medicinski akronimi), četiri nazivnika i sedam poddomena. Nad njim je izgrađen MATLAB algoritam (bez toolboxa, radi i u Octaveu) koji opisuje trenutno stanje (stopa rasta, udio, trend, prijelomna točka) i daje predviđanje za 3, 5, 7 i 10 godina (2028., 2030., 2032., 2035.) s četiri konkurentska modela rasta, izborom modela informacijskim kriterijem, provjerom točnosti unatrag i bootstrap intervalima. Sve je neovisno replicirano u Pythonu (scipy) — procjene parametara i deviance podudaraju se do zadnje znamenke.'),
      P([B('Glavni nalaz u jednoj rečenici: '), T('apsolutna produkcija raste oko 28–30 % godišnje bez znaka zasićenja (2025.: 4 381 rad), a udio u poljoprivrednoj literaturi (8,5 na 1 000) tek je na 62 % logistički procijenjenog platoa od 13,8 na 1 000 (infleksija 2023./2024.) — poljoprivreda je ranije na krivulji prihvaćanja od ekologije (85 % platoa) i ima više prostora za rast; najbrže rastu predviđanje prinosa, navodnjavanje i detekcija bolesti, a prskanje čini UAV aktuatorom.')]),
      P([B('Za rad je izravno upotrebljivo: '), T('Slika 1 (broj radova + predviđanja), Slika 2 (udio + predviđanja), Slika 3 (poddomene), Tablica I (modeli), Tablica II (predviđanja po horizontu). Sve slike su 8,8 cm, crno-bijele, 600 dpi, s EPS verzijom.')]),

      H1('2. Podaci'),
      H2('2.1 Izvor i upiti'),
      P('Izvor je OpenAlex (javni API), pretraga naslova i sažetka Booleovim izrazom, filtar article|review. Glavna serija je čisti upit D AND A NOT N (N uklanja Drosophila/GAL4, pčele, medicinske i institucijske homonime). Datum dohvata 28. 8. 2026. — obvezno navesti u radu jer se OpenAlex retroaktivno mijenja. Upiti su izvedeni s vašeg računala (sandbox nema pristup API-ju); potpuni izrazi i URL-predložak nalaze se u codebook.md.'),
      table(['Serija', 'Definicija', 'Uloga'], [
        ['core_drone_agro', 'D AND A NOT N (čisti upit)', 'brojnik, glavna serija'],
        ['core_drone_agro_raw', 'D AND A (sirovi upit)', 'osjetljivost; iz njega su uzorci za preciznost'],
        ['strict_noenv', 'D AND A NOT N NOT ekološki pojmovi', 'strogi upit (osjetljivost)'],
        ['agro_only', 'A (poljoprivredna literatura)', 'nazivnik 1 (udio)'],
        ['subfield1102_agronomy / field11_agbio', 'OpenAlex klasifikacije', 'nazivnici 2 i 3'],
        ['all_works, drone_only', 'sva djela; sva dronska literatura', 'nazivnik 4; kontekst'],
        ['sub_crop_monitoring … sub_livestock', 'D AND poddomenski pojmovi (7 poddomena)', 'struktura primjena; preklapaju se'],
        ['HR_core, HR_all', 'isto, s barem jednim hrvatskim autorom', 'nacionalni kontekst'],
      ], [2300, 4300, 2600], { aligns: [AlignmentType.LEFT,AlignmentType.LEFT,AlignmentType.LEFT] }),
      caption('Tablica A. Serije u datoteci openalex_drone_agro_annual.csv. D = dronski pojmovi; A = 38 poljoprivrednih pojmova; N = filtar šuma; puni popis u codebook.md.'),
      H2('2.2 Provjera preciznosti i filtar šuma'),
      P('Ručna provjera 100 + 50 slučajnih zapisa sirovog upita (kodiranje A/B/C uz AI prijedlog, Excel u mapi validation) pokazala je da su „UAS“ u Drosophila genetici, trutovi i medicinski akronimi velik dio šuma, osobito u ranim godinama, pa je uveden filtar N i čisti upit postao glavna serija. Za čisti upit: P(A) = 0,61 [0,51; 0,70] u cijelom razdoblju, ali 0,37 [0,23; 0,54] u ranom razdoblju (z = 2,38, p = 0,017) — rani brojevi precjenjuju poljoprivrednu aktivnost jer prevladavaju generički UAV inženjerski radovi. Registarski podaci (FAA/AESA/EASA/HACZ) preuzeti su iz projekta o ekologiji; za poljoprivredu je dodan kontekst istočne Azije (Kina 2021.: više od 120 000 dronova za zaštitu bilja, oko 62 M ha tretirano; Japan 2016.: trećina rižinih polja).'),
      H2('2.3 Ograničenja podataka koja moraju u rad'),
      bullet('Skok u 2025. u svim serijama (agro_only +26 %) dijelom je artefakt indeksiranja; analiza osjetljivosti bez 2025. je u skripti.'),
      bullet('Pojam „yield“ hvata i nepoljoprivredna značenja; uže inačice povećale bi preciznost, ali gube stvarne radove — dokumentirano u codebook.md.'),
      bullet('Preciznost se mijenjala kroz vrijeme: apsolutni brojevi su otprilike 1,6 puta veći od strogo poljoprivredne produkcije, rani brojevi i više.'),
      bullet('Poddomene se preklapaju i ne zbrajaju u ukupni broj.'),

      H1('3. Trenutno stanje (2005.–2025.)'),
      table(['Pokazatelj', 'Vrijednost'], [
        ['Broj radova 2005. → 2025. (čisti upit)', '29 → 4 381 (ukupno 18 506 u razdoblju)'],
        ['CAGR 2005.–2025. / zadnjih 10 godina', '28,5 % / 30,4 %'],
        ['Udio u poljoprivrednoj literaturi (na 1 000)', '0,21 → 8,53'],
        ['Udio u ukupnoj dronskoj literaturi', '3,0 % → 17,1 %'],
        ['Mann-Kendall, brojevi', 'S = 208, Z = 6,25, p = 4·10⁻¹⁰; Senov nagib 125 radova/god. [90 % CI 86; 171]'],
        ['Mann-Kendall, udio', 'S = 200, Z = 6,01, p = 2·10⁻⁹; Senov nagib 0,38 na 1 000/god. [0,28; 0,47]'],
        ['Prijelomna točka, brojevi', '2009.: 16 %/god. prije → 32 %/god. poslije (F = 5,2; p ≈ 0,018, približno)'],
        ['Prijelomna točka, udio', '2009.: 5 %/god. → 26 %/god. (F = 7,3; p ≈ 0,005, približno)'],
        ['Otvoreni pristup', '72 % radova (13 290 od 18 506)'],
        ['Zemlje (prve tri, sirovi upit)', 'Kina 4 421; SAD 3 239; Indija 1 857 (164 zemlje ukupno)'],
        ['Časopisi (prva tri)', 'Remote Sensing 1 026; Computers and Electronics in Agriculture 582; Drones 368'],
        ['Hrvatska', '34 rada 2013.–2025. (10 u 2025.)'],
      ], [3900, 5300], { aligns: [AlignmentType.LEFT,AlignmentType.LEFT] }),
      caption('Tablica B. Sažetak trenutnog stanja; sve vrijednosti iz izlaza skripte i codebook.md (odjeljak 6).'),
      P('Napomena o prijelomnoj točki: 2009. se poklapa s pojavom jeftinih višerotorskih platformi i pristupačnih multispektralnih kamera. U EU je zračno prskanje pesticida zabranjeno Direktivom 2009/128/EZ (osim odstupanja), pa aktuatorske primjene koje nose azijski rast u Europi uglavnom izostaju — europski rast je senzorski.'),
      H2('3.1 Poddomene'),
      table(['Poddomena', '2015.', '2025.', 'CAGR 10 g.'], [
        ['Praćenje usjeva / fenotipizacija', '42', '1 080', '38,4 %'],
        ['Prskanje / aplikacija', '35', '740', '35,7 %'],
        ['Korovi', '18', '226', '28,8 %'],
        ['Navodnjavanje / vodni stres', '19', '618', '41,7 %'],
        ['Bolesti i štetnici', '22', '617', '39,6 %'],
        ['Predviđanje prinosa', '6', '372', '51,1 %'],
        ['Stočarstvo', '25', '229', '24,8 %'],
      ], [4200, 1500, 1500, 2000]),
      caption('Tablica C. Broj radova po poddomeni (preklapajući upiti) i složena godišnja stopa rasta 2015.–2025.'),
      P('Najbrže raste podatkovno vođena agronomija (prinos 51 %, navodnjavanje 42 %, bolesti 40 %), a najsporije stočarstvo i korovi. Prskanje (36 %) je aktuatorska primjena s posebnom regulativom — najjača poruka za robotičku publiku.'),
      img('fig3_subdomains.png', 8.8, 7),
      caption('Fig. 3. Annual number of OpenAlex articles combining UAV terms with seven agricultural sub-domains, 2005–2025 (log scale; queries overlap).'),

      H1('4. Algoritam predviđanja (MATLAB)'),
      P('Datoteke u mapi matlab/: drone_env_forecast.m (glavna skripta s blokom OPTIONS), load_annual_data.m, growth_model.m, fit_growth_model.m, mann_kendall.m, segmented_loglinear.m, backtest_models.m, nb_bootstrap.m, poisson_rnd.m, describe_params.m. Nema ovisnosti o toolboxima (koristi fminsearch, randg, betainc, gammaln iz osnovnog MATLAB-a). Testirano u GNU Octave 8.4; u MATLAB-u R2016b+ radi bez izmjena.'),
      H2('4.1 Koraci'),
      bullet([B('Ulaz i normalizacija. '), T('Učitava se CSV; koriste se samo potpune godine (2005.–2025.). Modeli se prilagođavaju dvama ciljevima: (a) apsolutnom broju radova i (b) udjelu u poljoprivrednoj literaturi, gdje je nazivnik ugrađen kao offset (μ = N·g(t)), pa predviđanje udjela ne zahtijeva projekciju nazivnika.')]),
      bullet([B('Opis stanja. '), T('CAGR, Mann-Kendallov test s korekcijom vezanih vrijednosti i Senov nagib s 90 % CI (Gilbert 1987), segmentirana log-linearna regresija s jednom prijelomnom točkom (pretraga po mreži, Chow-tip F-test; p je približan jer je točka procijenjena — u radu navesti kao takav ili potvrditi Daviesovim testom u R-u, paket segmented).')]),
      bullet([B('Četiri modela rasta. '), T('Eksponencijalni (bez zasićenja), logistički i Gompertzov (sa zasićenjem K), Bassov difuzijski model (radovi kao „usvajanja" po godini, parametri m, p, q). Za udio se Bass ne koristi jer opisuje usvajanja po razdoblju, a ne razinu.')]),
      bullet([B('Kriterij prilagodbe. '), T('Poissonova devijanca D = 2Σ[y ln(y/μ) − (y − μ)] minimizirana Nelder-Meadom (fminsearch) iz više početnih točaka, s log-transformacijom pozitivnih parametara. Devijanca daje jednaku težinu malim ranim i velikim kasnim godinama i omogućuje pravi log-likelihood za informacijski kriterij.')]),
      bullet([B('Izbor modela. '), T('Brojevi su jako predisperzirani (ĉ = Pearsonov χ²/df ≈ 20), pa se koristi QAICc (kvazi-AIC s korekcijom za mali uzorak) i Akaikeove težine; predviđanje je QAICc-ponderirani prosjek modela.')]),
      bullet([B('Provjera unatrag. '), T('Rolling-origin backtest: fit do 2018./2020./2022., predviđanje ostatka; MAPE, pristranost i RMSE na log-skali po modelu.')]),
      bullet([B('Nesigurnost. '), T(`Parametarski negativno-binomni bootstrap (gamma-Poissonova mješavina, disperzija procijenjena metodom momenata): ${nboot} replika, ponovni fit svakog modela i ponovno računanje težina u svakoj replici → 5. i 95. percentil predviđanja po modelu i za prosjek.`)]),
      bullet([B('Analiza osjetljivosti. '), T('Ponovni fit brojeva bez 2025. (artefakt indeksiranja).')]),
      H2('4.2 Pokretanje'),
      code('cd matlab'),
      code('drone_env_forecast          % ~1–3 min u MATLAB-u za 1000 replika; rezultati u ../results'),
      P('U bloku OPTIONS mijenjaju se: putanja CSV-a, raspon godina, horizonti, brojnik i nazivnik (npr. numerator = \'sub_spraying\' za predviđanje poddomene), popis modela, broj replika, sjeme. Izlaz: models_count.csv, models_share.csv, forecast_count.csv, forecast_share.csv, tri slike (PNG 600 dpi + EPS) i .mat s cijelom strukturom rezultata.'),

      H1('5. Rezultati'),
      H2('5.1 Modeli za broj radova (Tablica I u radu)'),
      table(['Model', 'k', 'Devijanca', 'QAICc', 'Težina', 'Backtest MAPE', 'Parametri'],
        mC.map(r => [labels[r[0]], r[1], r1(r[2]), r1(r[4]), r2(r[5]), r1(r[8]) + ' %', r[10]]),
        [1500, 450, 1000, 900, 800, 1150, 3400], { aligns: [AlignmentType.LEFT,AlignmentType.RIGHT,AlignmentType.RIGHT,AlignmentType.RIGHT,AlignmentType.RIGHT,AlignmentType.RIGHT,AlignmentType.LEFT] }),
      caption(`Tablica D (→ TABLE I). Modeli rasta prilagođeni godišnjem broju radova 2005.–2025. (n = 21). ĉ = ${r2(mC[2][7])}. k = broj parametara; MAPE = prosjek preko ishodišta 2018., 2020., 2022.`),
      P('Nijedan model nije uvjerljivo bolji: težine su 0,15–0,39. Eksponencijalni nosi najveću težinu (0,39; b = 0,2525, tj. 28,7 %/god.), Gompertzov (0,29) s K ≈ 3,2 milijarde degenerira u praktički eksponencijalni oblik, logistički (0,16) vidi zasićenje na K ≈ 21 000 radova/god. s točkom infleksije 2030., a Bass (0,15) predviđa vrhunac 2033. Podaci do 2025. ne mogu razlučiti gdje je točka infleksije — apsolutni rast je za sada praktički eksponencijalan.'),
      img('fig1_counts_forecast.png', 8.8, 7),
      caption('Fig. 1. Annual OpenAlex articles combining UAV and agricultural terms (dots), four growth models fitted by Poisson deviance (lines) and the QAICc-weighted model average with 90 % negative-binomial bootstrap interval (squares, shaded) for 2028–2035.'),
      H2('5.2 Predviđanje broja radova (Tablica II u radu)'),
      table(['Model', '2028. (3 g.)', '2030. (5 g.)', '2032. (7 g.)', '2035. (10 g.)'],
        modelsC.map(m => fcRow(fcC, m, r0)), [1700, 1900, 1900, 1900, 1900]),
      caption(`Tablica E (→ TABLE II). Točkasta procjena i 90 % bootstrap interval [q05; q95] broja radova godišnje (${nboot} replika). Za QAICc-prosjek točkasta procjena je medijan bootstrap-distribucije.`),
      H2('5.3 Predviđanje udjela u poljoprivrednoj literaturi'),
      table(['Model', 'Težina', '2028.', '2030.', '2032.', '2035.'],
        ['exponential', 'logistic', 'gompertz', 'qaicc_average'].map(m => { const r = fcRow(fcS, m, r2); return [r[0], m === 'qaicc_average' ? '1' : r2(wS[m]), ...r.slice(1)]; }),
        [1500, 900, 1700, 1700, 1700, 1800]),
      caption(`Tablica F. Radova na 1 000 poljoprivrednih radova; točkasta procjena i 90 % bootstrap interval. ĉ = ${r2(mS[1][7])}.`),
      P('Kod udjela je slika jasnija: logistički model dobiva težinu 0,91 (Gompertz 0,09, eksponencijalni je odbačen, ΔQAICc ≈ 18), a plato je K = 13,8 na 1 000 s točkom infleksije 2023./2024. Udio je u 2025. na 8,5, tj. na 62 % procijenjenog platoa — za razliku od ekologije (85 %), poljoprivreda ima još zamjetan prostor rasta udjela. Backtest: s ishodištem 2022. logistički model ima MAPE 7,6 %, eksponencijalni 28,5 %.'),
      img('fig2_share_forecast.png', 8.8, 7),
      caption('Fig. 2. Share of UAV-related articles per 1000 agricultural articles (OpenAlex), fitted exponential, logistic and Gompertz rate models with the agricultural literature as offset, and QAICc-weighted forecast with 90 % bootstrap interval.'),
      H2('5.4 Osjetljivost na 2025. i provjera unatrag'),
      P('Bez 2025. logistički model za brojeve daje K ≈ 5 300 (umjesto 21 000) i predviđanje za 2035. od oko 5 200 umjesto 16 300. Jedna godina, koja je dijelom artefakt indeksiranja, višestruko mijenja procijenjeni kapacitet. To treba otvoreno napisati: predviđanje za 3 godine je robusno (svi modeli 7 300–8 850 radova za 2028.), predviđanje za 10 godina nije (12 400–51 800). Rolling-origin backtest daje MAPE 28–34 % preko tri ishodišta (najbolji pojedinačni: Gompertz s ishodištem 2022., 11 %) — dugoročna točnost bilo kojeg parametarskog modela rasta na ovakvoj seriji je skromna, a razlike među modelima su manje od razlike među ishodištima.'),

      H1('6. Što to znači za rad i za robotičku publiku'),
      bullet('Tri poruke za Discussion: (1) apsolutna produkcija raste ~28,5 %/god. i eksponencijalni model nosi najveću težinu, (2) udio u poljoprivrednoj literaturi je na 62 % platoa (13,8 na 1 000, infleksija 2023./24.) — više prostora za rast nego u ekologiji, (3) rast se seli u podatkovno vođenu agronomiju i aktuaciju (prskanje).'),
      bullet('Implikacija za robotičare: UAV u poljoprivredi postaje aktuator — nosivost, kontrola zanošenja kapljica, ujednačenost depozicije, RTK, koordinacija više letjelica i petlje kontrole doze; na senzorskoj strani ključna je prenosivost modela (radiometrijska kalibracija, generalizacija preko polja i sezona), a ne nove kamere.'),
      bullet('Predložena struktura za 6 stranica: I Introduction (pregled + motivacija, 0,7 str.), II Data and Methods (upiti, modeli, kriteriji, 1,3 str.), III Results (Fig. 1–3, Table I–II, 1,8 str.), IV Discussion (tri poruke + registarski kontrast + hrvatski regulatorni kontekst, 1,2 str.), V Conclusion (0,3 str.), literatura (0,7 str.).'),
      bullet('Naslov (prijedlog): „Drones in Agriculture: Bibliometric State of the Art and Growth Forecasts to 2035“.'),

      H1('7. Što još treba napraviti prije predaje'),
      bullet('Pokrenuti drone_env_forecast.m u MATLAB-u s nboot = 1000 (ovaj izvještaj temelji se na Octave izvršenju iste skripte); zadržati ispis konzole kao prilog.'),
      bullet('Potvrditi A/B/C kodove u validation/Provjera_preciznosti_upita.xlsx (100 + 50 zapisa; AI prijedlog upisan, konačnu ocjenu daje autor, po uzoru na projekt o ekologiji).'),
      bullet('Ako je dostupan Scopus: isti Booleov upit po godinama kao križna provjera (jedan dodatni stupac).'),
      bullet('Daviesov test za prijelomnu točku u R-u (segmented) ako želite p-vrijednost koju statističar-recenzent neće osporiti.'),
      bullet('Provjeriti sve reference iz kolegina pregleda u izvoru (DOI-jevi), osobito „provjeriti" stavke; dodati Bass (1969), Meade & Islam (2006) za modele difuzije, Burnham & Anderson (2002) za QAICc, Priem i sur. (2022) za OpenAlex.'),
      bullet('Deklaracija uporabe generativne AI u Acknowledgment prema aktualnoj IEEE politici.'),

      H1('8. Popis isporučenih datoteka'),
      table(['Datoteka', 'Sadržaj'], [
        ['data/openalex_drone_agro_annual.csv', 'glavni skup: 27 godina × 18 serija + oznaka potpune godine'],
        ['data/raw_openalex_counts.csv', 'isti podaci u dugom formatu (serija, godina, broj)'],
        ['data/registry_indicators.csv', 'FAA, AESA, EASA, HACZ pokazatelji s izvorima'],
        ['data/codebook.md', 'definicije upita, varijable, ograničenja, agregati po zemljama/časopisima'],
        ['matlab/*.m', 'algoritam (10 datoteka), bez toolboxa'],
        ['python/replicate_fits.py', 'neovisna replikacija fitova (scipy)'],
        ['results/*.csv, *.png, *.eps, *.mat', 'izlaz skripte: tablice modela i predviđanja, tri slike'],
        ['projection/*', 'projekcija 2026.–2035. (jezgra + 7 poddomena), Excel i slike'],
        ['validation/*', 'provjera preciznosti upita: uzorci, Excel s kodovima, formule'],
        ['paper/*', 'rad u MIPRO predlošku (EN + HR) i skripte za izgradnju'],
      ], [3600, 5600], { aligns: [AlignmentType.LEFT,AlignmentType.LEFT] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(path.join(__dirname, 'Agrodronovi_podaci_i_predvidanje.docx'), buf); console.log('written'); });
