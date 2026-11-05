import sys, json
from lxml import etree
NS='{http://www.spensiones.cl/xml}'
f=sys.argv[1]
rows=[]; other=[]
ctx=etree.iterparse(f, events=('end',), tag=(NS+'tipofondo', NS+'total_fondos'), huge_tree=True)
for ev, el in ctx:
    t=el.findtext(NS+'titulo') or ''
    if t.startswith('CUADRO Nº 21'):
        fund = el.get('codigo') if el.tag==NS+'tipofondo' else 'TOTAL'
        instr=[g.text.strip() for g in el.find(NS+'instrumentos')]
        for child in el:
            tag=child.tag.replace(NS,'')
            if tag not in ('afp','titulo','subtitulo','instrumentos','notas'):
                other.append((fund, tag))
        for afp in el.findall(NS+'afp'):
            name=afp.findtext(NS+'nombre')
            for ag in afp.findall(NS+'agrupacion'):
                for fi in ag.findall(NS+'fila'):
                    pcts=[]
                    for i,ins in enumerate(fi.find(NS+'columnas')):
                        p=ins.findtext(NS+'porcentaje')
                        if p: pcts.append((instr[i], float(p)))
                    tot=fi.find(NS+'total')
                    rows.append(dict(fund=fund, afp=name, grp=ag.get('nombre'),
                        issuer=(fi.findtext(NS+'glosa') or '').strip(),
                        isin=(fi.findtext(NS+'nemotecnico') or '').strip(),
                        ccy=(fi.findtext(NS+'moneda') or '').strip(),
                        pcts=pcts,
                        clp=float(tot.findtext(NS+'monto_pesos') or 0) if tot is not None else None,
                        usd=float(tot.findtext(NS+'monto_dolares') or 0) if tot is not None else None))
    el.clear()
    while el.getprevious() is not None:
        del el.getparent()[0]
print(len(rows), set(other))
json.dump(rows, open('c21_rows.json','w'))
