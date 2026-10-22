// Fetch Crossref metadata for every DOI cited in the ITEMA paper and print APA-relevant fields.
const DOIS = ['10.1016/j.joi.2017.08.007', '10.1287/mnsc.15.5.215', '10.1088/1742-5468/2008/10/P10008', '10.1002/asi.23329',
  '10.1007/b97636', '10.1016/j.joi.2010.10.002', '10.1016/j.inpa.2022.02.002', '10.3390/drones6110354', '10.1080/01431161.2017.1410300',
  '10.1016/j.ijforecast.2006.03.001', '10.1371/journal.pone.0098853', '10.1016/j.tplants.2018.11.007', '10.1016/j.rse.2019.111599',
  '10.2307/1907187', '10.1016/j.ijforecast.2006.01.005', '10.48550/arXiv.2205.01833', '10.1016/j.compag.2022.107017',
  '10.1080/01621459.1968.10480934', '10.3934/era.2022218', '10.1371/journal.pone.0058210', '10.3390/info10110349',
  '10.1002/asi.21075', '10.3389/fpls.2017.01111', '10.1007/s11119-012-9274-5', '10.5281/zenodo.22238128'];
for (const d of DOIS) {
  try {
    const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(d)}?mailto=vuros@veleknin.hr`);
    if (!r.ok) { console.log(`${d} -> HTTP ${r.status}`); continue; }
    const m = (await r.json()).message;
    const au = (m.author || []).map((a) => `${a.family}, ${a.given || ''}`).join('; ');
    const yr = (m.issued?.['date-parts']?.[0] || [])[0];
    console.log(`${d} | ${au} | ${yr} | ${(m.title || [''])[0]} | ${(m['container-title'] || [''])[0]} | vol ${m.volume || ''} (${m.issue || ''}) | pp ${m.page || m['article-number'] || ''}`);
  } catch (e) { console.log(`${d} -> ${e.message}`); }
}
