# Codebook — agrodronovi: dronovi u poljoprivredi (bibliometrijski i registarski podaci)

Datum dohvata: 28. kolovoza 2026. (OpenAlex API, upiti izvedeni s računala vedran-pc). Ista metodologija kao u projektu „dronovi u ekologiji“ (mipro_drones), s poljoprivrednim skupom pojmova.
Datoteke: `openalex_drone_agro_annual.csv` (glavni skup), `raw_openalex_counts.csv` (dugi format), `registry_indicators.csv` (pomoćni, FAA/AESA/EASA/HACZ, preuzet iz projekta o ekologiji).

## 1. Izvor i način dohvata

- OpenAlex `/works`, `group_by=publication_year`, filtri `type:article|review`, `publication_year:2000-2026`, pretraga `title_and_abstract.search` (Booleov upit, stemming).
- URL-predložak: `https://api.openalex.org/works?filter=title_and_abstract.search:<UPIT>,publication_year:2000-2026,type:article|review&group_by=publication_year&per-page=50&mailto=<e-mail>`
- OpenAlex se retroaktivno mijenja; datum dohvata je dio definicije podataka.

## 2. Definicije upita

**D (dron):** `(drone OR drones OR UAV OR UAVs OR UAS OR "unmanned aerial" OR "unmanned aircraft" OR RPAS OR "remotely piloted aircraft")`

**A (poljoprivreda):** `(agriculture OR agricultural OR "precision agriculture" OR "precision farming" OR "smart farming" OR farm OR farms OR farming OR farmland OR crop OR crops OR cropland OR yield OR irrigation OR fertilizer OR fertiliser OR fertilization OR pesticide OR pesticides OR spraying OR herbicide OR weed OR weeds OR phenotyping OR livestock OR cattle OR orchard OR orchards OR vineyard OR vineyards OR agronomy OR agronomic OR "plant disease" OR "crop disease" OR "soil moisture" OR paddy OR "arable land")`

**N (isključenje šuma):** `(drosophila OR gal4 OR transgene OR transgenic OR bee OR bees OR honeybee OR honeybees OR "honey bee" OR bumblebee OR apis OR urticaria OR aneurysm OR aneurysms OR patients OR "university of agricultural sciences")` — uvedeno nakon ručne provjere: „UAS“ u Drosophila GAL4/UAS sustavu, „drone“ = trut, medicinski akronimi i naziv sveučilišta činili su velik dio šuma, osobito u ranim godinama.

**X (ekološki pojmovi, za strogi upit):** `(forest OR forests OR forestry OR wildlife OR ecology OR ecological OR biodiversity OR habitat OR wetland OR wetlands OR "protected area" OR wildfire OR marine OR coastal)`

| Serija | Upit | Uloga |
|---|---|---|
| `core_drone_agro` | D AND A NOT N | **Brojnik (glavna serija)** — čisti upit |
| `core_drone_agro_raw` | D AND A | Sirovi upit (analiza osjetljivosti; iz njega su vučeni uzorci za provjeru preciznosti) |
| `strict_noenv` | D AND A NOT N NOT X | Strogi upit bez ekoloških/šumarskih pojmova (osjetljivost) |
| `agro_only` | A | **Nazivnik 1** — poljoprivredna literatura pretražena na isti način |
| `subfield1102_agronomy` | `primary_topic.subfield.id:1102` (Agronomy and Crop Science) | Nazivnik 2 — klasifikacijski |
| `field11_agbio` | `primary_topic.field.id:11` (Agricultural and Biological Sciences) | Nazivnik 3 — klasifikacijski, širi |
| `all_works` | bez filtra | Nazivnik 4 — rast baze |
| `drone_only` | D | Kontekst — sva dronska literatura |
| `sub_crop_monitoring` | D AND ("crop monitoring" OR "crop growth" OR phenotyping OR "vegetation index" OR NDVI OR "crop health" OR canopy OR "biomass estimation" OR "leaf area index") AND (crop OR crops OR agriculture OR agricultural OR farm OR farming) | Poddomena 1: praćenje usjeva / fenotipizacija |
| `sub_spraying` | D AND (spraying OR sprayer OR spray OR pesticide OR pesticides OR herbicide OR fungicide OR "fertilizer application" OR "variable rate application" OR "plant protection") | Poddomena 2: prskanje / aplikacija |
| `sub_weeds` | D AND (weed OR weeds OR "weed detection" OR "weed mapping" OR "site-specific weed") | Poddomena 3: korovi |
| `sub_irrigation` | D AND (irrigation OR "water stress" OR "soil moisture" OR evapotranspiration OR drought) AND (crop OR crops OR agriculture OR agricultural OR farm OR farming OR field) | Poddomena 4: navodnjavanje / vodni stres |
| `sub_disease_pest` | D AND ("plant disease" OR "crop disease" OR "disease detection" OR pest OR pests OR "pest detection" OR infestation) AND (crop OR crops OR agriculture OR agricultural OR farm OR plant) | Poddomena 5: bolesti i štetnici |
| `sub_yield` | D AND ("yield prediction" OR "yield estimation" OR "yield forecasting" OR "yield mapping" OR "grain yield") AND (crop OR crops OR agriculture OR agricultural OR farm OR wheat OR maize OR rice OR soybean) | Poddomena 6: predviđanje prinosa |
| `sub_livestock` | D AND (livestock OR cattle OR sheep OR grazing OR pasture OR "animal husbandry" OR herd) | Poddomena 7: stočarstvo |
| `HR_core` | D AND A NOT N, `authorships.countries:HR` (2005–2025) | Hrvatski autori |
| `HR_all` | `authorships.countries:HR` | Nazivnik za HR |
| `complete_year` | 1 = puna godina; 0 = 2026. | 2026. se ne koristi u fitu |

Poddomene se preklapaju i nisu podskup glavne serije.

## 3. Ručna provjera preciznosti (28. 8. 2026.)

Uzorci iz sirovog upita: 100 zapisa 2005.–2025. (seed 20260828) i 50 zapisa 2005.–2015. (seed 20260829); prijedlog oznake uz pomoć AI, konačnu ocjenu dodjeljuju autori. Kodiranje: A = UAV + poljoprivredna primjena; B = UAV bez poljoprivredne primjene ili samo spomenut; C = nema UAV-a. Zapisi koje isključuje N označeni su stupcem „U čistom upitu“; ograničenje slučajnog uzorka nadskupa na podskup ostaje slučajan uzorak podskupa.
Rezultat za čisti upit (prijedlog AI, prije potvrde autora): 2005.–2025. n = 94, P(A) = 0,61 [0,51; 0,70], P(A∪B) = 0,91; rano razdoblje n = 35, P(A) = 0,37 [0,23; 0,54]; razlika značajna (z = −2,38, p = 0,017) — u ranom razdoblju prevladavaju UAV inženjerski radovi koji poljoprivredu samo spominju (B). Sirovi upit: dodatnih 6 % (recentno) odnosno 30 % (rano) zapisa bilo je C (Drosophila, pčele, akronimi) — zato je čisti upit glavna serija.
Datoteke: `validation/Provjera_preciznosti_upita.xlsx`, `validation/classify.py`, `validation/*.json`.

## 4. Poznata ograničenja

1. Skok u 2025. u svim serijama (agro_only +26 %, all_works +18 %) dijelom je artefakt indeksiranja OpenAlexa; normalizacija ga ublažava, skripta radi i analizu osjetljivosti bez 2025.
2. Pojam „yield“ hvata i nepoljoprivredna značenja (materijali, financije, „yields“ kao glagol); uže inačice („crop yield“, „grain yield“) povećale bi preciznost, ali bi izgubile dio stvarnih poljoprivrednih radova (npr. o polijeganju pšenice), pa nisu korištene u glavnoj seriji.
3. Preciznost se mijenjala kroz vrijeme (odjeljak 3): apsolutni brojevi precjenjuju strogo poljoprivrednu produkciju za ~1,6×, a njezin je rast nešto brži od rasta serije.
4. OpenAlex je širi od Scopusa/WoS-a; apsolutni brojevi nisu usporedivi s tim bazama, trendovi i udjeli jesu.
5. `type:article` uključuje mnoge konferencijske radove.

## 5. Agregati (28. 8. 2026., sirovi upit D AND A, 2005–2025, N = 19 740; čisti upit N = 18 506, OA 13 290 = 71,8 %)

- Zemlje (prvih 5, sirovi upit): Kina 4 421; SAD 3 239; Indija 1 857; Njemačka 737; UK 690. Ukupno 164 zemlje.
- Časopisi (prvih 5): Remote Sensing 1 026; Computers and Electronics in Agriculture 582; Drones 368; Agronomy 364; Sensors 329.
- Primarno polje: Agricultural and Biological Sciences 5 988; Environmental Science 5 904; Engineering 3 007; Computer Science 1 175.
- Primarna tema: Remote Sensing in Agriculture 3 078; Smart Agriculture and AI 2 364; Remote Sensing and LiDAR Applications 1 091; UAV Applications and Optimization 816; Plant Surface Properties and Treatments (prskanje) 614.
- Citiranost (sirovi): 942 rada s > 99 citata; 2 276 s > 49; 7 738 s > 9. Hrvatska (čisti upit): 34 rada 2013.–2025. (10 u 2025.).
