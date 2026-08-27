# -*- coding: utf-8 -*-
"""Fill the MIPRO Word template with the paper content.
Keeps the template's styles (papertitle, Author, Affiliation, Abstract, keywords,
Heading1/2/5, BodyText, figurecaption, tablehead, tablecolhead, tablecopy, references,
equation) and its section layout (single-column title block, two-column body)."""
import re, os, shutil, zipfile
from xml.sax.saxutils import escape
from PIL import Image

TPL = 'tpl'                      # unpacked template (converted to docx)
OUT = 'out'
FIGS = {'fig1': '../results/fig1_counts_forecast.png',
        'fig2': '../results/fig2_share_forecast.png',
        'fig3': '../results/fig3_subdomains.png'}
COLW = 4736                      # column width in twips (A4, margins 1037, gap 360)

# ---------------------------------------------------------------- run markup
# {i:text} italic, {b:text} bold, {sup:text}, {sub:text}; plain otherwise
TNR = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
def runs(text, base_rpr='', font=False):
    out = []
    pos = 0
    for m in re.finditer(r'\{(i|b|sup|sub):((?:[^{}]|\{[^{}]*\})*)\}', text):
        if m.start() > pos: out.append(run(text[pos:m.start()], base_rpr, font))
        kind, inner = m.group(1), m.group(2)
        extra = {'i': '<w:i/><w:iCs/>', 'b': '<w:b/><w:bCs/>', 'sup': '<w:vertAlign w:val="superscript"/>', 'sub': '<w:vertAlign w:val="subscript"/>'}[kind]
        # allow one level of nesting (e.g. italic inside subscript)
        if '{' in inner:
            out.append(runs(inner, base_rpr + extra, font))
        else:
            out.append(run(inner, base_rpr + extra, font))
        pos = m.end()
    if pos < len(text): out.append(run(text[pos:], base_rpr, font))
    return ''.join(out)

def run(t, rpr='', font=False):
    if t == '': return ''
    f = TNR if font else ''
    return '<w:r><w:rPr>%s%s</w:rPr><w:t xml:space="preserve">%s</w:t></w:r>' % (f, rpr, escape(t))

def para(style, text, ppr_extra='', font=False):
    return '<w:p><w:pPr><w:pStyle w:val="%s"/>%s<w:rPr></w:rPr></w:pPr>%s</w:p>' % (style, ppr_extra, runs(text, font=font))

def body(text): return para('BodyText', text)
def h1(text): return para('Heading1', text)
def h2(text): return para('Heading2', text)
def h5(text): return para('Heading5', text)
def ref(text):
    return para('references', text, '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr><w:ind w:hanging="0" w:start="0"/>')
def figcap(text):
    return para('figurecaption', text, '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr><w:ind w:hanging="0" w:start="0"/>')
def tabhead(text):
    return para('tablehead', text, '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="6"/></w:numPr><w:ind w:hanging="0" w:start="0"/>')
def equation(text, num):
    tabs = '<w:tabs><w:tab w:val="clear" w:pos="720"/><w:tab w:val="center" w:pos="2369" w:leader="none"/><w:tab w:val="right" w:pos="4738" w:leader="none"/></w:tabs>'
    return ('<w:p><w:pPr><w:pStyle w:val="equation"/>%s<w:rPr></w:rPr></w:pPr><w:r><w:rPr>%s</w:rPr><w:tab/></w:r>%s'
            '<w:r><w:rPr>%s</w:rPr><w:tab/><w:t>(%d)</w:t></w:r></w:p>') % (tabs, TNR, runs(text, font=True), TNR, num)

# ---------------------------------------------------------------- images
rels_extra = []; media = []
def figure(key, rid_num, width_twips=COLW):
    path = FIGS[key]
    w_px, h_px = Image.open(path).size
    cx = int(width_twips / 1440 * 914400); cy = int(cx * h_px / w_px)
    name = 'image%d.png' % rid_num
    media.append((path, name))
    rid = 'rId%d' % (100 + rid_num)
    rels_extra.append('<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/%s"/>' % (rid, name))
    drawing = ('<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="%d" cy="%d"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
               '<wp:docPr id="%d" name="%s"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
               '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
               '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="%d" name="%s"/><pic:cNvPicPr/></pic:nvPicPr>'
               '<pic:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
               '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%d" cy="%d"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
               '</a:graphicData></a:graphic></wp:inline></w:drawing>') % (cx, cy, 10 + rid_num, name, 10 + rid_num, name, rid, cx, cy)
    return '<w:p><w:pPr><w:pStyle w:val="Normal"/><w:keepNext/><w:spacing w:before="120" w:after="0"/><w:jc w:val="center"/><w:rPr></w:rPr></w:pPr><w:r><w:rPr></w:rPr>%s</w:r></w:p>' % drawing

# ---------------------------------------------------------------- tables
BORD = '<w:tcBorders><w:top w:val="single" w:sz="2" w:space="0" w:color="000000"/><w:start w:val="single" w:sz="2" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="2" w:space="0" w:color="000000"/><w:end w:val="single" w:sz="2" w:space="0" w:color="000000"/></w:tcBorders>'
def table(widths, header, rows, aligns=None):
    aligns = aligns or ['left'] + ['center'] * (len(header) - 1)
    def cell(t, w, style, al):
        return ('<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/>%s<w:vAlign w:val="center"/></w:tcPr>'
                '<w:p><w:pPr><w:pStyle w:val="%s"/><w:jc w:val="%s"/><w:rPr></w:rPr></w:pPr>%s</w:p></w:tc>') % (w, BORD, style, al, runs(t))
    tr_hdr = '<w:tr><w:trPr><w:tblHeader w:val="true"/><w:cantSplit w:val="true"/></w:trPr>' + ''.join(cell(h, widths[i], 'tablecolhead', 'center') for i, h in enumerate(header)) + '</w:tr>'
    trs = ''.join('<w:tr><w:trPr><w:cantSplit w:val="true"/></w:trPr>' + ''.join(cell(c, widths[i], 'tablecopy', aligns[i]) for i, c in enumerate(r)) + '</w:tr>' for r in rows)
    grid = ''.join('<w:gridCol w:w="%d"/>' % w for w in widths)
    return ('<w:tbl><w:tblPr><w:tblW w:w="%d" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/>'
            '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:start w:w="57" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:end w:w="57" w:type="dxa"/></w:tblCellMar></w:tblPr>'
            '<w:tblGrid>%s</w:tblGrid>%s%s</w:tbl>') % (sum(widths), grid, tr_hdr, trs)
SPACER = '<w:p><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:before="0" w:after="120"/><w:rPr><w:sz w:val="8"/></w:rPr></w:pPr></w:p>'

# ================================================================ CONTENT
import sys, importlib
mod = importlib.import_module(sys.argv[1] if len(sys.argv) > 1 else 'content')
outfile = sys.argv[2] if len(sys.argv) > 2 else 'MIPRO_Drones_Agriculture_Forecast.docx'
TITLE, AUTHORS, AFFILS, EMAIL, ABSTRACT, KEYWORDS, SECTIONS, ACK, REFERENCES = (mod.TITLE, mod.AUTHORS, mod.AFFILS, mod.EMAIL, mod.ABSTRACT, mod.KEYWORDS, mod.SECTIONS, mod.ACK, mod.REFERENCES)
ABSTRACT_LABEL = getattr(mod, 'ABSTRACT_LABEL', 'Abstract'); KEYWORDS_LABEL = getattr(mod, 'KEYWORDS_LABEL', 'Keywords')
ACK_TITLE = getattr(mod, 'ACK_TITLE', 'Acknowledgment'); REF_TITLE = getattr(mod, 'REF_TITLE', 'References')
FIG_LABEL = getattr(mod, 'FIG_LABEL', None); TABLE_LABEL = getattr(mod, 'TABLE_LABEL', None)

doc = open(os.path.join(TPL, 'word/document.xml'), encoding='utf-8').read()
head = doc[:doc.index('<w:body>') + len('<w:body>')]
sect1 = re.search(r'<w:p><w:pPr><w:pStyle w:val="Normal"/><w:sectPr>.*?</w:sectPr>.*?</w:p>', doc, re.S)
if not sect1:
    sect1 = re.search(r'<w:p>(?:(?!</w:p>).)*?<w:sectPr><w:type w:val="nextPage"/>.*?</w:sectPr>.*?</w:p>', doc, re.S)
sect1_xml = sect1.group(0)
sect2 = re.search(r'<w:p>(?:(?!</w:p>).)*?<w:sectPr><w:type w:val="continuous"/>.*?<w:cols .*?</w:sectPr>.*?</w:p>', doc, re.S).group(0)
tail = doc[doc.rindex('<w:p>'):]           # last paragraph + final sectPr + </w:body></w:document>

parts = [head]
# ---- title block (section 1, single column)
parts.append(para('papertitle', TITLE))
parts.append(para('Normal', ''))
parts.append(para('Author', AUTHORS))
for a in AFFILS: parts.append(para('Affiliation', a))
parts.append(para('Affiliation', EMAIL))
parts.append(para('Affiliation', ''))
parts.append(sect1_xml)
# ---- body (section 2, two columns)
parts.append('<w:p><w:pPr><w:pStyle w:val="Abstract"/><w:rPr></w:rPr></w:pPr>'
             '<w:r><w:rPr><w:rStyle w:val="StyleAbstractItalicChar"/><w:b w:val="false"/><w:bCs/></w:rPr><w:t>' + ABSTRACT_LABEL + '</w:t></w:r>'
             '<w:r><w:rPr></w:rPr><w:t xml:space="preserve">—' + escape(ABSTRACT) + '</w:t></w:r></w:p>')
parts.append(para('keywords', KEYWORDS_LABEL + '—' + KEYWORDS))
fig_i = 0
for item in SECTIONS:
    kind = item[0]
    if kind == 'h1': parts.append(h1(item[1]))
    elif kind == 'h2': parts.append(h2(item[1]))
    elif kind == 'p': parts.append(body(item[1]))
    elif kind == 'eq': parts.append(equation(item[1], item[2]))
    elif kind == 'fig':
        fig_i += 1
        parts.append(figure(item[1], fig_i)); parts.append(figcap(item[2]))
    elif kind == 'table':
        parts.append(tabhead(item[1])); parts.append(table(item[2], item[3], item[4], item[5] if len(item) > 5 else None)); parts.append(SPACER)
    elif kind == 'sponsors': parts.append(para('sponsors', item[1]))
parts.append(h5(ACK_TITLE))
parts.append(body(ACK))
parts.append(h5(REF_TITLE))
for r in REFERENCES: parts.append(ref(r))
parts.append(sect2)
parts.append(tail)
xml = ''.join(parts)

# ---------------------------------------------------------------- write package
if os.path.exists(OUT): shutil.rmtree(OUT)
shutil.copytree(TPL, OUT)
open(os.path.join(OUT, 'word/document.xml'), 'w', encoding='utf-8').write(xml)
rels_path = os.path.join(OUT, 'word/_rels/document.xml.rels')
rels = open(rels_path, encoding='utf-8').read().replace('</Relationships>', ''.join(rels_extra) + '</Relationships>')
open(rels_path, 'w', encoding='utf-8').write(rels)
os.makedirs(os.path.join(OUT, 'word/media'), exist_ok=True)
for src, name in media: shutil.copy(src, os.path.join(OUT, 'word/media', name))
# add "a:" namespace not needed (declared inline). Zip.
if FIG_LABEL or TABLE_LABEL:
    npath = os.path.join(OUT, 'word/numbering.xml'); nx = open(npath, encoding='utf-8').read()
    if FIG_LABEL: nx = nx.replace('<w:lvlText w:val="Figure %1. "/>', '<w:lvlText w:val="%s %%1. "/>' % FIG_LABEL)
    if TABLE_LABEL: nx = nx.replace('<w:lvlText w:val="TABLE %1. "/>', '<w:lvlText w:val="%s %%1. "/>' % TABLE_LABEL)
    open(npath, 'w', encoding='utf-8').write(nx)
if os.path.exists(outfile): os.remove(outfile)
z = zipfile.ZipFile(outfile, 'w', zipfile.ZIP_DEFLATED)
for root, _, files in os.walk(OUT):
    for f in files:
        full = os.path.join(root, f); z.write(full, os.path.relpath(full, OUT))
z.close()
print('written', outfile, 'words in body ~', len(re.sub(r'<[^>]+>', ' ', xml).split()))
