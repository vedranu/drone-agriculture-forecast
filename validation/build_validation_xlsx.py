# -*- coding: utf-8 -*-
"""Agrodronovi: build Provjera_preciznosti_upita.xlsx — two random samples (drawn from the raw query D AND A),
suggested codes, a final-code column for the authors, a flag whether the record survives the cleaned query
(NOT N), and a summary sheet with live formulas for the cleaned query (precision, Wilson CI, early vs recent test)."""
import json, re
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment
from classify import S100, S50

FONT = 'Arial'
b = Font(name=FONT, size=10, bold=True); n = Font(name=FONT, size=10); small = Font(name=FONT, size=9)
blue = Font(name=FONT, size=10, color='0000FF'); hdr = PatternFill('solid', fgColor='D9E2F3'); yellow = PatternFill('solid', fgColor='FFFF00')
thin = Side(style='thin', color='BFBFBF')
D_TERMS = ['drone', 'drones', 'uav', 'uavs', 'uas', 'rpas', 'unmanned aerial', 'unmanned aircraft', 'remotely piloted aircraft']
N_RE = re.compile(r'\b(drosophila|gal4|transgene|transgenic|bee|bees|honeybee|honeybees|honey bee|bumblebee|apis|urticaria|aneurysm|aneurysms|patients|university of agricultural sciences)\b', re.I)
def in_clean(r): return 'ne' if N_RE.search(r['title'] + ' ' + r['abstract']) else 'da'

def hit_terms(r):
    txt = (r['title'] + ' ' + r['abstract']).lower()
    return ', '.join(t for t in D_TERMS if re.search(r'\b' + re.escape(t) + r'\b', txt)) or '(nije u naslovu/sažetku)'

wb = Workbook()

# ---------------- Kriteriji ----------------
ws = wb.active; ws.title = 'Kriteriji'
lines = [
 ('Ručna provjera preciznosti upita D AND A (OpenAlex) — agrodronovi — kriteriji kodiranja', True),
 ('', False),
 ('Svaki zapis dobiva jednu od tri oznake:', False),
 ('A — RELEVANTAN: zračna bespilotna letjelica (UAV/UAS/dron) je senzorska platforma, aplikator ili predmet rada, A primjena je poljoprivredna: usjevi, voćnjaci, vinogradi, travnjaci za stoku, stoka, poljoprivredno zemljište, prskanje/aplikacija, fenotipizacija, navodnjavanje, zaštita bilja, prinos; uključuje i pregledne radove o UAV-ima u poljoprivredi.', False),
 ('B — GRANIČAN: UAV/dron jest prisutan, ali primjena nije poljoprivredna (mreže, upravljanje i navigacija, šumarstvo, rudarstvo, urbanizam, vojne primjene, dostava) ILI je UAV samo spomenut kao kontekst ili budući rad.', False),
 ('C — NERELEVANTAN: nema zračne bespilotne letjelice („drone“ = trut, „UAS“ = Drosophila GAL4/UAS, ocjena urtikarije, sveučilišni akronim; „yield“ u nepoljoprivrednom smislu; radovi bez UAV pojma u naslovu/sažetku).', False),
 ('', False),
 ('Postupak: prijedlog oznake (stupac J) i obrazloženje (K) generirani su uz pomoć AI; konačnu ocjenu (L) neovisno dodjeljuje autor čitajući naslov i sažetak, a kod nedostupnog sažetka cijeli rad. Stupac N označava ostaje li zapis u ČISTOM upitu (D AND A NOT N, gdje N isključuje Drosophila/GAL4, pčele, medicinske akronime i sveučilišni naziv) — glavna serija rada je čisti upit, pa list „Sažetak“ računa preciznost samo za zapise s „da“; uzorak iz sirovog upita ograničen na čisti upit i dalje je slučajan uzorak čistog upita.', False),
 ('', False),
 ('Uzorci: (a) 100 slučajnih zapisa 2005.–2025. (OpenAlex sample=100, seed=20260828); (b) 50 slučajnih zapisa 2005.–2015. (seed=20260829). Dohvat 28. 8. 2026.', False),
 ('', False),
 ('Za rad se izvještava: preciznost P(A) i P(A ili B) čistog upita s Wilsonovim 95 % intervalom; test razlike ranog i cijelog uzorka; osjetljivost trenda na sirovi upit i na strogi upit bez ekoloških pojmova (list „Osjetljivost_upita“).', False),
]
for i, (t, bold) in enumerate(lines, 1):
    c = ws.cell(row=i, column=1, value=t); c.font = Font(name=FONT, size=11 if bold else 10, bold=bold); c.alignment = Alignment(wrap_text=True, vertical='top')
ws.column_dimensions['A'].width = 150

# ---------------- sample sheets ----------------
def sample_sheet(name, rows, codes, title):
    ws = wb.create_sheet(name)
    ws.cell(row=1, column=1, value=title).font = Font(name=FONT, size=11, bold=True)
    ws.cell(row=2, column=1, value='Žuti stupac = KONAČNA OCJENA (A/B/C), popunite ili potvrdite; prijedlog (AI) je samo pomoć.').font = Font(name=FONT, size=9, italic=True)
    head = ['#', 'Godina', 'Naslov', 'Časopis / izvor', 'OpenAlex tema', 'OpenAlex ID (poveznica)', 'DOI', 'UAV pojam', 'Sažetak (skraćen)', 'Prijedlog (AI)', 'Obrazloženje prijedloga', 'KONAČNA OCJENA', 'Napomena ocjenjivača', 'U čistom upitu (da/ne)']
    for c, h in enumerate(head, 1):
        cell = ws.cell(row=4, column=c, value=h); cell.font = b; cell.fill = hdr; cell.alignment = Alignment(wrap_text=True, vertical='center'); cell.border = Border(bottom=thin)
    for i, r in enumerate(rows, start=5):
        code, reason = codes[r['n']]
        vals = [r['n'], r['year'], r['title'] or '(bez naslova)', r['venue'], r['topic'], r['id'], r['doi'], hit_terms(r), (r['abstract'][:700] + ('…' if len(r['abstract']) > 700 else '')) or '(sažetak nije dostupan — otvoriti poveznicu)', code, reason, code, '', in_clean(r)]
        for c, v in enumerate(vals, 1):
            cell = ws.cell(row=i, column=c, value=v); cell.font = n; cell.alignment = Alignment(wrap_text=True, vertical='top')
        ws.cell(row=i, column=6).hyperlink = r['id']; ws.cell(row=i, column=6).font = Font(name=FONT, size=10, color='0563C1', underline='single')
        ws.cell(row=i, column=12).fill = yellow; ws.cell(row=i, column=12).alignment = Alignment(horizontal='center', vertical='top')
        ws.row_dimensions[i].height = 75
    last = 4 + len(rows)
    dv = DataValidation(type='list', formula1='"A,B,C"', allow_blank=True); ws.add_data_validation(dv); dv.add(f'L5:L{last}')
    for c, w in enumerate([4, 7, 40, 22, 22, 26, 20, 14, 70, 9, 34, 11, 26, 12], 1): ws.column_dimensions[get_column_letter(c)].width = w
    ws.freeze_panes = 'D5'; ws.auto_filter.ref = f'A4:N{last}'
    return last

rows100 = json.load(open('sample_rows.json')); rows50 = json.load(open('sample_rows_early.json'))
l100 = sample_sheet('Uzorak_100', rows100, S100, 'Uzorak A: 100 slučajnih zapisa sirovog upita, 2005.–2025. (seed 20260828)')
l50 = sample_sheet('Uzorak_50_rano', rows50, S50, 'Uzorak B: 50 slučajnih zapisa sirovog upita, 2005.–2015. (seed 20260829)')

# ---------------- summary with formulas ----------------
ws = wb.create_sheet('Sažetak', 1)
ws.cell(row=1, column=1, value='Sažetak provjere preciznosti ČISTOG upita (samo zapisi s „da“ u stupcu N; sve formule)').font = Font(name=FONT, size=11, bold=True)
def block(r0, sheet, last, label):
    rng = f"'{sheet}'!$L$5:$L${last}"; crng = f"'{sheet}'!$N$5:$N${last}"
    ws.cell(row=r0, column=1, value=label).font = b
    labels = ['n (ocijenjeno)', 'A — relevantan', 'B — graničan', 'C — nerelevantan', 'P(A) stroga preciznost', 'P(A ili B) šira preciznost', 'Wilson 95 % donja, P(A)', 'Wilson 95 % gornja, P(A)', 'Wilson 95 % donja, P(A∪B)', 'Wilson 95 % gornja, P(A∪B)']
    for i, lab in enumerate(labels, 1): ws.cell(row=r0 + i, column=1, value=lab).font = n
    nA, nB, nC, nn = f'B{r0+2}', f'B{r0+3}', f'B{r0+4}', f'B{r0+1}'
    ws.cell(row=r0 + 1, column=2, value=f'=COUNTIFS({rng},"A",{crng},"da")+COUNTIFS({rng},"B",{crng},"da")+COUNTIFS({rng},"C",{crng},"da")')
    ws.cell(row=r0 + 2, column=2, value=f'=COUNTIFS({rng},"A",{crng},"da")'); ws.cell(row=r0 + 3, column=2, value=f'=COUNTIFS({rng},"B",{crng},"da")'); ws.cell(row=r0 + 4, column=2, value=f'=COUNTIFS({rng},"C",{crng},"da")')
    ws.cell(row=r0 + 5, column=2, value=f'=IF({nn}>0,{nA}/{nn},"")'); ws.cell(row=r0 + 6, column=2, value=f'=IF({nn}>0,({nA}+{nB})/{nn},"")')
    def wilson(p, N, lo):
        z = 1.96; sgn = '-' if lo else '+'
        return f'=IF({N}>0,(({p}+{z}^2/(2*{N})){sgn}{z}*SQRT({p}*(1-{p})/{N}+{z}^2/(4*{N}^2)))/(1+{z}^2/{N}),"")'
    ws.cell(row=r0 + 7, column=2, value=wilson(f'B{r0+5}', nn, True)); ws.cell(row=r0 + 8, column=2, value=wilson(f'B{r0+5}', nn, False))
    ws.cell(row=r0 + 9, column=2, value=wilson(f'B{r0+6}', nn, True)); ws.cell(row=r0 + 10, column=2, value=wilson(f'B{r0+6}', nn, False))
    for i in range(1, 11):
        c = ws.cell(row=r0 + i, column=2); c.font = n; c.number_format = '0' if i <= 4 else '0.0%'
    return r0 + 11
rA = 3; r = block(rA, 'Uzorak_100', l100, 'Uzorak A (2005.–2025.; od 100 sirovih zapisa oni u čistom upitu)')
rB = r + 1; r = block(rB, 'Uzorak_50_rano', l50, 'Uzorak B (2005.–2015.; od 50 sirovih zapisa oni u čistom upitu)')
nA_, aA_, pA_ = f'B{rA+1}', f'B{rA+2}', f'B{rA+5}'; nB_, aB_, pB_ = f'B{rB+1}', f'B{rB+2}', f'B{rB+5}'
# two-proportion z test A vs B for P(A)
ws.cell(row=r + 1, column=1, value='Razlika P(A): uzorak B (rano) − uzorak A (cijelo razdoblje)').font = b
ws.cell(row=r + 2, column=1, value='razlika udjela').font = n; ws.cell(row=r + 2, column=2, value=f'={pB_}-{pA_}').number_format = '0.0%'
ws.cell(row=r + 3, column=1, value='z (dvoproporcijski test, združeni p)').font = n
ws.cell(row=r + 3, column=2, value=f'=IF(AND({nA_}>0,{nB_}>0),({pB_}-{pA_})/SQRT((({aA_}+{aB_})/({nA_}+{nB_}))*(1-({aA_}+{aB_})/({nA_}+{nB_}))*(1/{nA_}+1/{nB_})),"")').number_format = '0.00'
ws.cell(row=r + 4, column=1, value='p (dvostrano)').font = n; ws.cell(row=r + 4, column=2, value=f'=IF(B{r+3}="","",2*(1-NORMSDIST(ABS(B{r+3}))))').number_format = '0.000'
ws.cell(row=r + 5, column=1, value='Tumačenje: p < 0,05 → preciznost je u ranom razdoblju bila niža (više generičkih UAV inženjerskih radova koji poljoprivredu samo spominju); strogo poljoprivredna produkcija stoga raste još brže nego serija upita, a apsolutni brojevi su precijenjeni.').font = small
ws.cell(row=r + 7, column=1, value='Napomena: formule se odnose na stupac L (KONAČNA OCJENA) oba lista; prazne ćelije se ne broje.').font = small
ws.column_dimensions['A'].width = 62; ws.column_dimensions['B'].width = 14

# ---------------- query sensitivity ----------------
ws = wb.create_sheet('Osjetljivost_upita')
ws.cell(row=1, column=1, value='Osjetljivost na definiciju upita (OpenAlex, dohvat 28. 8. 2026.): sirovi D AND A; čisti = sirovi NOT N (glavna serija); strogi = čisti NOT ekološki pojmovi').font = Font(name=FONT, size=10, bold=True)
import pandas as pd
a = pd.read_csv('../data/openalex_drone_agro_annual.csv'); a = a[(a.year >= 2005) & (a.year <= 2025)]
for c, h in enumerate(['Godina', 'core_drone_agro_raw', 'core_drone_agro (čisti)', 'strict_noenv', 'omjer čisti/sirovi', 'omjer strogi/čisti'], 1):
    cell = ws.cell(row=3, column=c, value=h); cell.font = b; cell.fill = hdr
for i, row in enumerate(a.itertuples(index=False), start=4):
    ws.cell(row=i, column=1, value=int(row.year)).font = n
    ws.cell(row=i, column=2, value=int(row.core_drone_agro_raw)).font = blue; ws.cell(row=i, column=3, value=int(row.core_drone_agro)).font = blue; ws.cell(row=i, column=4, value=int(row.strict_noenv)).font = blue
    ws.cell(row=i, column=5, value=f'=C{i}/B{i}').number_format = '0.00'; ws.cell(row=i, column=6, value=f'=D{i}/C{i}').number_format = '0.00'
ws.cell(row=26, column=1, value='CAGR 2005–2025').font = b
for c in 'BCD': ws[f'{c}26'] = f'=({c}24/{c}4)^(1/20)-1'; ws[f'{c}26'].number_format = '0.0%'
ws.cell(row=27, column=1, value='CAGR 2015–2025').font = b
for c in 'BCD': ws[f'{c}27'] = f'=({c}24/{c}14)^(1/10)-1'; ws[f'{c}27'].number_format = '0.0%'
ws.cell(row=29, column=1, value='N = (drosophila OR gal4 OR transgene OR transgenic OR bee OR bees OR honeybee OR honeybees OR "honey bee" OR bumblebee OR apis OR urticaria OR aneurysm OR aneurysms OR patients OR "university of agricultural sciences"); ekološki pojmovi = (forest OR forests OR forestry OR wildlife OR ecology OR ecological OR biodiversity OR habitat OR wetland OR wetlands OR "protected area" OR wildfire OR marine OR coastal).').font = small
for c, w in zip('ABCDEF', [12, 20, 22, 14, 18, 18]): ws.column_dimensions[c].width = w

wb.save('Provjera_preciznosti_upita.xlsx'); print('saved')
