import sys, json
from lxml import etree
NS='{http://www.spensiones.cl/xml}'
out={'c3':[], 'c9':[]}
ctx=etree.iterparse(sys.argv[1], events=('end',), tag=(NS+'tipofondo', NS+'total_fondos', NS+'fondo', NS+'afp_fondo'), huge_tree=True)
seen=set()
for ev, el in ctx:
    t=el.findtext(NS+'titulo') or ''
    key=None
    if t.startswith('CUADRO Nº 3:'): key='c3'
    if t.startswith('CUADRO Nº 9:'): key='c9'
    if key:
        fund = el.get('codigo') or 'TOTAL'
        seen.add((key, el.tag, fund))
        cur=None
        for fi in el.iter(NS+'fila'):
            g=(fi.findtext(NS+'glosa') or '').strip()
            if ':' in g:
                sec,g=g.split(':',1); cur=sec
            for c in fi.find(NS+'columnas'):
                nm=c.findtext(NS+'nombre') or 'TOTAL'
                d=dict(fund=fund, sec=cur, ins=g, unit=(fi.findtext(NS+'unidad_indexada') or '').strip(), afp=nm)
                for sub in c:
                    tg=sub.tag.replace(NS,'')
                    if tg not in ('rut','nombre') and sub.text and sub.text.strip():
                        d[tg]=sub.text.strip()
                out[key].append(d)
    if el.getparent() is not None and el.getparent().tag!=NS+'constitucion_cartera_desagregada':
        pass
    el.clear()
print(seen)
json.dump(out, open('c3_c9.json','w'))
