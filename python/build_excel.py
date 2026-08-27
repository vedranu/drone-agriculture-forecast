"""Build the Excel workbook with all data used in the analysis."""
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment

D = '../data/'; R = '../results/'
annual = pd.read_csv(D + 'openalex_drone_agro_annual.csv')
raw = pd.read_csv(D + 'raw_openalex_counts.csv')
reg = pd.read_csv(D + 'registry_indicators.csv')
mc = pd.read_csv(R + 'models_count.csv'); ms = pd.read_csv(R + 'models_share.csv')
fc = pd.read_csv(R + 'forecast_count.csv'); fs = pd.read_csv(R + 'forecast_share.csv')

FONT = 'Arial'
hdr_fill = PatternFill('solid', fgColor='D9E2F3')
in_font = Font(name=FONT, size=10, color='0000FF')          # hardcoded data (blue)
f_font = Font(name=FONT, size=10, color='000000')            # formulas (black)
b_font = Font(name=FONT, size=10, bold=True)
thin = Side(style='thin', color='BFBFBF')

wb = Workbook()

def style_header(ws, row, ncol):
    for c in range(1, ncol + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = b_font; cell.fill = hdr_fill
        cell.alignment = Alignment(wrap_text=True, vertical='center')
        cell.border = Border(bottom=thin)

def autosize(ws, widths=None, default=14):
    for c in range(1, ws.max_column + 1):
        ws.column_dimensions[get_column_letter(c)].width = (widths or {}).get(c, default)

# ---------------- README ----------------
ws = wb.active; ws.title = 'README'
lines = [
 ('Agrodronovi — dronovi u poljoprivredi: podaci za analizu i predviđanje', True),
 ('Izvor: OpenAlex (https://api.openalex.org), endpoint /works, group_by=publication_year; datum dohvata 28. 8. 2026.', False),
 ('Filtri zajednički svim upitima: title_and_abstract.search:<UPIT>, publication_year:2000-2026, type:article|review', False),
 ('URL-predložak: https://api.openalex.org/works?filter=title_and_abstract.search:<UPIT>,publication_year:2000-2026,type:article|review&group_by=publication_year&per-page=50&mailto=<e-mail>', False),
 ('', False),
 ('Listovi:', True),
 ('  Annual — jedan redak = jedna godina; dohvaćeni brojevi plavo, formule crno. Ovo je ulaz za MATLAB skriptu (CSV verzija: openalex_drone_agro_annual.csv). Glavna serija core_drone_agro = čisti upit (D AND A NOT N); core_drone_agro_raw = sirovi upit.', False),
 ('  Raw_long — isti podaci u dugom formatu (serija, godina, broj), kako su ispisani iz API-ja.', False),
 ('  Queries — točne definicije svih Booleovih upita.', False),
 ('  Aggregates — zemlje, časopisi, polja, otvoreni pristup, citiranost za core upit 2005–2025.', False),
 ('  Registry — FAA / AESA / EASA / HACZ registarski pokazatelji s izvorima (pomoćno; Eurostat nema seriju o dronovima).', False),
 ('  Model_results — izlaz skripte drone_env_forecast.m (Octave, 1000 bootstrap replika): modeli i predviđanja. NISU ulazni podaci.', False),
 ('', False),
 ('Boje: plavo = dohvaćeni/uneseni podaci, crno = formule.', False),
 ('Napomene: 2026. je nepotpuna godina (complete_year = 0) i ne ulazi u fit. Poddomene (sub_*) se preklapaju i nisu podskup core_drone_agro.', False),
 ('Skok u 2025. u svim serijama dijelom je artefakt indeksiranja OpenAlexa (vidi codebook.md).', False),
]
for i, (t, b) in enumerate(lines, 1):
    c = ws.cell(row=i, column=1, value=t); c.font = Font(name=FONT, size=11 if b else 10, bold=b)
ws.column_dimensions['A'].width = 160

# ---------------- Annual ----------------
ws = wb.create_sheet('Annual')
cols = list(annual.columns)  # year, 13 series, complete_year
hdr = cols + ['', 'share_per_1000_agro', 'share_of_drone_lit', 'core_yoy_growth', 'share_subfield1102_per_1000']
units = ['godina'] + ['broj radova'] * (len(cols) - 2) + ['1 = puna godina'] + ['', 'core/agro_only×1000', 'core/drone_only', '(core_t/core_t-1)−1', 'core/subfield1102×1000']
ws.append(hdr); ws.append(units)
style_header(ws, 1, len(hdr))
for c in range(1, len(hdr) + 1):
    ws.cell(row=2, column=c).font = Font(name=FONT, size=9, italic=True, color='595959')
n = len(annual)
ci = {name: i + 1 for i, name in enumerate(cols)}
L = lambda name: get_column_letter(ci[name])
for r, row in enumerate(annual.itertuples(index=False), start=3):
    for c, v in enumerate(row, start=1):
        cell = ws.cell(row=r, column=c, value=int(v)); cell.font = in_font
        if c > 1: cell.number_format = '#,##0'
    ws.cell(row=r, column=1).number_format = '0'
    core, env, dr, f23 = L('core_drone_agro'), L('agro_only'), L('drone_only'), L('subfield1102_agronomy')
    k = len(cols) + 2
    ws.cell(row=r, column=k, value=f'=IF({env}{r}>0,{core}{r}/{env}{r}*1000,"")').number_format = '0.00'
    ws.cell(row=r, column=k + 1, value=f'=IF({dr}{r}>0,{core}{r}/{dr}{r},"")').number_format = '0.0%'
    ws.cell(row=r, column=k + 2, value=(f'=IF({core}{r-1}>0,{core}{r}/{core}{r-1}-1,"")' if r > 3 else '')).number_format = '0.0%'
    ws.cell(row=r, column=k + 3, value=f'=IF({f23}{r}>0,{core}{r}/{f23}{r}*1000,"")').number_format = '0.00'
    for cc in range(k, k + 4): ws.cell(row=r, column=cc).font = f_font
last = n + 2
# summary block
sr = last + 2
ws.cell(row=sr, column=1, value='Sažetak (formule, potpune godine 2005–2025)').font = b_font
rows_2005, rows_2025 = 3 + 5, 3 + 25   # year 2000 is row 3
core = L('core_drone_agro')
summary = [
 ('Ukupno radova 2005–2025', f'=SUM({core}{rows_2005}:{core}{rows_2025})', '#,##0'),
 ('CAGR 2005–2025', f'=({core}{rows_2025}/{core}{rows_2005})^(1/20)-1', '0.0%'),
 ('CAGR 2015–2025', f'=({core}{rows_2025}/{core}{rows_2005+10})^(1/10)-1', '0.0%'),
 ('Udio na 1000 (2005)', f'={get_column_letter(len(cols)+2)}{rows_2005}', '0.00'),
 ('Udio na 1000 (2025)', f'={get_column_letter(len(cols)+2)}{rows_2025}', '0.00'),
]
for i, (lab, f, fmt) in enumerate(summary, start=sr + 1):
    ws.cell(row=i, column=1, value=lab).font = Font(name=FONT, size=10)
    c = ws.cell(row=i, column=2, value=f); c.font = f_font; c.number_format = fmt
ws.cell(row=sr + 7, column=1, value='Izvor: OpenAlex API, dohvat 28. 8. 2026.; upiti na listu Queries.').font = Font(name=FONT, size=9, italic=True)
ws.freeze_panes = 'B3'
autosize(ws, {1: 8}, 15)
ws.cell(row=1, column=1).comment = Comment('publication_year u OpenAlexu; 2026 je nepotpuna (dohvat 26. 8. 2026.)', 'Claude')

# ---------------- Raw_long ----------------
ws = wb.create_sheet('Raw_long')
ws.append(list(raw.columns)); style_header(ws, 1, 3)
for row in raw.itertuples(index=False):
    ws.append([row.series, int(row.year), int(row.count)])
for r in range(2, ws.max_row + 1):
    for c in range(1, 4): ws.cell(row=r, column=c).font = in_font
    ws.cell(row=r, column=3).number_format = '#,##0'
ws.freeze_panes = 'A2'; autosize(ws, {1: 20, 2: 8, 3: 12})

# ---------------- Queries ----------------
ws = wb.create_sheet('Queries')
Dq = '(drone OR drones OR UAV OR UAVs OR UAS OR "unmanned aerial" OR "unmanned aircraft" OR RPAS OR "remotely piloted aircraft")'
Aq = '(agriculture OR agricultural OR "precision agriculture" OR "precision farming" OR "smart farming" OR farm OR farms OR farming OR farmland OR crop OR crops OR cropland OR yield OR irrigation OR fertilizer OR fertiliser OR fertilization OR pesticide OR pesticides OR spraying OR herbicide OR weed OR weeds OR phenotyping OR livestock OR cattle OR orchard OR orchards OR vineyard OR vineyards OR agronomy OR agronomic OR "plant disease" OR "crop disease" OR "soil moisture" OR paddy OR "arable land")'
Nq = '(drosophila OR gal4 OR transgene OR transgenic OR bee OR bees OR honeybee OR honeybees OR "honey bee" OR bumblebee OR apis OR urticaria OR aneurysm OR aneurysms OR patients OR "university of agricultural sciences")'
Xq = '(forest OR forests OR forestry OR wildlife OR ecology OR ecological OR biodiversity OR habitat OR wetland OR wetlands OR "protected area" OR wildfire OR marine OR coastal)'
Q = [
 ('D (dron)', Dq, 'sastavni dio'), ('A (poljoprivreda)', Aq, 'sastavni dio'), ('N (isključenje šuma)', Nq, 'sastavni dio'), ('X (ekološki pojmovi)', Xq, 'sastavni dio'),
 ('core_drone_agro', 'D AND A NOT N', 'brojnik (glavna serija)'), ('core_drone_agro_raw', 'D AND A', 'sirovi upit (osjetljivost, uzorci)'), ('strict_noenv', 'D AND A NOT N NOT X', 'strogi upit'),
 ('agro_only', 'A', 'nazivnik 1'), ('subfield1102_agronomy', 'filter primary_topic.subfield.id:1102 (Agronomy and Crop Science)', 'nazivnik 2'), ('field11_agbio', 'filter primary_topic.field.id:11', 'nazivnik 3'), ('all_works', 'bez tekstualnog filtra', 'nazivnik 4'), ('drone_only', 'D', 'kontekst'),
 ('sub_crop_monitoring', 'D AND ("crop monitoring" OR "crop growth" OR phenotyping OR "vegetation index" OR NDVI OR "crop health" OR canopy OR "biomass estimation" OR "leaf area index") AND (crop OR crops OR agriculture OR agricultural OR farm OR farming)', 'poddomena'),
 ('sub_spraying', 'D AND (spraying OR sprayer OR spray OR pesticide OR pesticides OR herbicide OR fungicide OR "fertilizer application" OR "variable rate application" OR "plant protection")', 'poddomena'),
 ('sub_weeds', 'D AND (weed OR weeds OR "weed detection" OR "weed mapping" OR "site-specific weed")', 'poddomena'),
 ('sub_irrigation', 'D AND (irrigation OR "water stress" OR "soil moisture" OR evapotranspiration OR drought) AND (crop OR crops OR agriculture OR agricultural OR farm OR farming OR field)', 'poddomena'),
 ('sub_disease_pest', 'D AND ("plant disease" OR "crop disease" OR "disease detection" OR pest OR pests OR "pest detection" OR infestation) AND (crop OR crops OR agriculture OR agricultural OR farm OR plant)', 'poddomena'),
 ('sub_yield', 'D AND ("yield prediction" OR "yield estimation" OR "yield forecasting" OR "yield mapping" OR "grain yield") AND (crop OR crops OR agriculture OR agricultural OR farm OR wheat OR maize OR rice OR soybean)', 'poddomena'),
 ('sub_livestock', 'D AND (livestock OR cattle OR sheep OR grazing OR pasture OR "animal husbandry" OR herd)', 'poddomena'),
 ('HR_core', 'D AND A NOT N, filter authorships.countries:HR, 2005–2025', 'HR brojnik'), ('HR_all', 'filter authorships.countries:HR, 2005–2025', 'HR nazivnik'),
]
ws.append(['Serija', 'Upit (title_and_abstract.search) / filtar', 'Uloga']); style_header(ws, 1, 3)
for q in Q:
    ws.append(list(q))
for r in range(2, ws.max_row + 1):
    for c in range(1, 4):
        ws.cell(row=r, column=c).font = Font(name=FONT, size=10); ws.cell(row=r, column=c).alignment = Alignment(wrap_text=True, vertical='top')
autosize(ws, {1: 20, 2: 110, 3: 14})

# ---------------- Aggregates ----------------
ws = wb.create_sheet('Aggregates')
agg = [
 ('Zemlje (authorships.countries), sirovi upit 2005–2025, top 15', [('China', 4421), ('United States', 3239), ('India', 1857), ('Germany', 737), ('United Kingdom', 690), ('Spain', 641), ('Brazil', 615), ('Italy', 611), ('Australia', 559), ('Canada', 505), ('Japan', 483), ('South Korea', 471), ('France', 386), ('Indonesia', 357), ('Russia', 324)]),
 ('Časopisi (primary_location.source), top 15', [('Remote Sensing', 1026), ('Computers and Electronics in Agriculture', 582), ('Drones', 368), ('Agronomy', 364), ('Sensors', 329), ('Frontiers in Plant Science', 297), ('Agriculture', 292), ('Zenodo', 264), ('ISPRS Archives', 240), ('Smart Agricultural Technology', 201), ('IEEE Access', 182), ('Precision Agriculture', 167), ('Applied Sciences', 140), ('Scientific Reports', 132), ('Int. J. Agricultural and Biological Engineering', 121)]),
 ('Primarno polje (primary_topic.field), top 8', [('Agricultural and Biological Sciences', 5988), ('Environmental Science', 5904), ('Engineering', 3007), ('Computer Science', 1175), ('Biochemistry, Genetics and Molecular Biology', 783), ('Earth and Planetary Sciences', 772), ('Medicine', 487), ('Social Sciences', 345)]),
 ('Primarna tema (primary_topic), top 10', [('Remote Sensing in Agriculture', 3078), ('Smart Agriculture and AI', 2364), ('Remote Sensing and LiDAR Applications', 1091), ('UAV Applications and Optimization', 816), ('Plant Surface Properties and Treatments', 614), ('Robotic Path Planning Algorithms', 303), ('Remote Sensing and Land Use', 259), ('3D Surveying and Cultural Heritage', 248), ('Robotics and Sensor-Based Localization', 175), ('Soil erosion and sediment transport', 172)]),
 ('Otvoreni pristup (čisti upit)', [('OA = true', 13290), ('OA = false', 5216)]),
 ('Citiranost (sirovi upit, cited_by_count)', [('> 99 citata', 942), ('> 49 citata', 2276), ('> 9 citata', 7738), ('ukupno radova sirovi (article+review)', 19740), ('ukupno radova čisti', 18506), ('broj zemalja', 164)]),
]
r = 1
for title, items in agg:
    ws.cell(row=r, column=1, value=title).font = b_font; r += 1
    ws.cell(row=r, column=1, value='Stavka').font = b_font; ws.cell(row=r, column=2, value='Broj radova').font = b_font
    style_header(ws, r, 2); r += 1
    for k, v in items:
        ws.cell(row=r, column=1, value=k).font = Font(name=FONT, size=10)
        c = ws.cell(row=r, column=2, value=v); c.font = in_font; c.number_format = '#,##0'; r += 1
    r += 1
ws.cell(row=r, column=1, value='Izvor: OpenAlex API group_by upiti nad D AND A (sirovi upit), 2005–2025, type:article|review; dohvat 28. 8. 2026.').font = Font(name=FONT, size=9, italic=True)
autosize(ws, {1: 55, 2: 14})

# ---------------- Registry ----------------
ws = wb.create_sheet('Registry')
ws.append(list(reg.columns)); style_header(ws, 1, 5)
for row in reg.itertuples(index=False):
    ws.append([row.indicator, row.geo, int(row.year), int(row.value), row.source_note])
for rr in range(2, ws.max_row + 1):
    for c in range(1, 6): ws.cell(row=rr, column=c).font = in_font if c == 4 else Font(name=FONT, size=10)
    ws.cell(row=rr, column=4).number_format = '#,##0'
ws.cell(row=ws.max_row + 2, column=1, value='Napomena: FAA godišnje vrijednosti = objavljeni mjesečni prosjek × 12 (približno). Eurostat nema vremensku seriju o dronovima (provjereno 26. 8. 2026.).').font = Font(name=FONT, size=9, italic=True)
autosize(ws, {1: 42, 2: 6, 3: 8, 4: 12, 5: 80})

# ---------------- Model_results ----------------
ws = wb.create_sheet('Model_results')
r = 1
def dump(title, df, r, fmt=None):
    ws.cell(row=r, column=1, value=title).font = b_font; r += 1
    ws.append([]);
    for c, h in enumerate(df.columns, 1): ws.cell(row=r, column=c, value=h)
    style_header(ws, r, len(df.columns)); r += 1
    for row in df.itertuples(index=False):
        for c, v in enumerate(row, 1):
            cell = ws.cell(row=r, column=c, value=(float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else v))
            cell.font = Font(name=FONT, size=10)
            if isinstance(v, float) and fmt: cell.number_format = fmt
        r += 1
    return r + 1
r = dump('Modeli — broj radova (target = count), 2005–2025', mc, r, '0.000')
r = dump('Modeli — udio (target = share, offset env_only)', ms, r, '0.000')
r = dump('Predviđanje — broj radova godišnje (point, q05, q50, q95 = 90 % NB bootstrap, 1000 replika)', fc, r, '#,##0')
r = dump('Predviđanje — udio na 1000 radova o okolišu', fs, r, '0.00')
ws.cell(row=r, column=1, value='Izlaz skripte drone_env_forecast.m (GNU Octave 8.4, seed 20260826). Ovo su rezultati, ne ulazni podaci; ponovno pokretanje u MATLAB-u daje iste točkaste procjene i neznatno drukčije bootstrap intervale.').font = Font(name=FONT, size=9, italic=True)
autosize(ws, {1: 16}, 13)

wb.save('../data/Agrodronovi_podaci.xlsx')
print('saved')
