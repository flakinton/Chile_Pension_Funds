# Builds ofs_data.json: every offshore holding (SP cartera desagregada Cuadro 21) except
# FX forwards/swaps, one row per ISIN, with asset class, instrument and strategy.
import json, re, sys
from collections import defaultdict
r=json.load(open('c21_rows.json'))
INS={'EBC':'Sovereign & central bank bonds','BEE':'Corporate bonds','TBE':'Bank bonds','TBI':'Supranational / intl. bank bonds','BSE':'Securitised bonds','BCE':'Convertible bonds','ELN':'Credit/index-linked notes','CDPE':'Private debt co-investment',
    'CMED':'Debt mutual funds','CIED':'Debt investment funds','ETFB':'Bond ETFs','VDPE':'Private debt vehicles','CFID':'Chilean feeder funds (debt)',
    'AEE':'Foreign shares','ADR':'ADRs','CMEV':'Equity mutual funds','ETFA':'Equity ETFs','CFIV':'Chilean feeder funds (equity)','CFIVA':'Chilean feeder funds (alternatives)',
    'VCPE':'Private equity vehicles','CCPE':'Private equity co-investment','VIPE':'Infrastructure vehicles','VRPE':'Real estate vehicles',
    'CC3':'Bank accounts abroad','CMEVX':'other'}
CLS={'EBC':'FI','BEE':'FI','TBE':'FI','TBI':'FI','BSE':'FI','BCE':'FI','ELN':'FI','CDPE':'FI','CMED':'FI','CIED':'FI','ETFB':'FI','VDPE':'FI','CFID':'FI','CFMD':'FI',
     'AEE':'EQ','ADR':'EQ','CMEV':'EQ','ETFA':'EQ','CFIV':'EQ','CFIVA':'ALT','VCPE':'ALT','CCPE':'ALT','VIPE':'ALT','VRPE':'ALT','CC3':'CASH'}
INS['CFMD']='Chilean mutual funds (debt)'
DIRECT={'EBC','BEE','TBE','TBI','BSE','BCE','ELN','CDPE','AEE','ADR','CC3'}
AFPS=['CAPITAL','CUPRUM','HABITAT','MODELO','PLANVITAL','PROVIDA','UNO']
FUNDS=['A','B','C','D','E']
def fi_strat(ins,n):
    if ins in DIRECT: return 'Direct bonds'
    if ins in ('CFID','CFMD'): return 'Chilean feeder funds'
    if re.search(r'FINANCIAL CAPITAL|CAPITAL FI|FINANCIALS|HYBRID|SUBORDINAT|CONTINGENT|COCO',n): return 'Bank capital / hybrids'
    if ins=='VDPE' or 'PRIVATE' in n or 'DIRECT LENDING' in n: return 'Private debt'
    if 'LIQUIDITY' in n or 'INSTICASH' in n or 'MONEY MARKET' in n or 'ULTRA SHORT' in n: return 'Liquidity / money market'
    if 'CONVERT' in n: return 'Convertibles'
    if re.search(r'\bCLO\b|LOAN|ABS|SECURITI|STRUCTURED|MORTGAGE|CAT BOND|FLOATING RATE',n): return 'CLOs / loans / structured'
    em = re.search(r'EMERGING|FRONTIER|LATIN|LATAM|ASIA|CHINA|BRAZIL|INDIA|MEXIC|AFRICA|EM ',n)
    if em and 'LOCAL' in n: return 'EM local currency'
    if em and re.search(r'CORPORATE|CREDIT|HIGH YIELD',n): return 'EM corporate'
    if em: return 'EM sovereign / blend'
    if re.search(r'HIGH YIELD|HIGH INCOME|FALLEN ANGEL|\bHY\b',n): return 'High yield (DM)'
    if re.search(r'INVESTMENT GRADE|CORPORATE|CREDIT|FINANCIAL',n): return 'IG / credit (DM)'
    return 'Multi-sector / other'
def eq_strat(ins,n,isin):
    if ins in ('AEE','ADR'): return 'Direct shares'
    if ins=='CFIV': return 'Chilean feeder funds'
    R=[('Latin America',r'LATIN|LATAM|ARGENTIN|BRAZIL|MEXIC|CHILE|PERU|COLOMBIA|ANDEAN'),
       ('China',r'CHINA|CHINESE|HONG KONG|\bHK\b'),('Korea',r'KOREA'),('Taiwan',r'TAIWAN'),('India',r'INDIA'),('Japan',r'JAPAN|NIPPON|TOPIX|NIKKEI'),
       ('EM broad',r'EMERGING|\bEM\b|FRONTIER|RUSSIA'),('Asia / Pacific (other)',r'ASIA|PACIFIC|ASEAN|AUSTRALIA|INDONESIA|SINGAPORE'),
       ('Europe',r'EUROPE|EURO|UNITED KINGDOM|GERMAN|FRANCE|\bUK\b|BRITISH|SWITZ|ITALY|SPAIN|STOXX|DAX'),
       ('US',r'S&P|SP 500|\bSP\b|NASDAQ|\bUS\b|U\.S\.|USA|RUSSELL|AMERICAN|STOCKS?PLUS|DOW JONES|SELECT SECTOR'),
       ('Global',r'GLOBAL|WORLD|ACWI|INTERNATIONAL|ALL COUNTRY|MSCI')]
    n=re.sub(r'GLOBAL INVESTORS SERIES|WORLD FUNDS|GLOBAL STRATEGY FUND|GLOBAL X FUNDS|GLOBAL X ','',n)
    for lab,pat in R:
        if re.search(pat,n): return lab
    if isin.startswith('US'): return 'US'
    return 'Global'
ALTS={'VCPE':'Private equity','CCPE':'Private equity','VIPE':'Infrastructure','VRPE':'Real estate','CFIVA':'Chilean feeder funds'}
H={}
for x in r:
    if len(x['pcts'])!=1: continue
    ins=x['pcts'][0][0]
    if ins=='CFIV' and x['grp']=='ACTIVOS ALTERNATIVOS': ins='CFIVA'
    if ins not in CLS: continue
    k=(x['isin'] or x['issuer'])+'|'+ins
    h=H.setdefault(k, dict(isin=x['isin'], issuer=x['issuer'], ccy=x['ccy'].split()[0] if x['ccy'].strip() else '', ins=ins, usd=0, afp=defaultdict(float), fund=defaultdict(float)))
    if x['fund']=='TOTAL': h['usd']+=x['usd']; h['afp'][x['afp']]+=x['usd']
    else: h['fund'][x['fund']]+=x['usd']
rows=[]
for h in H.values():
    if abs(h['usd'])<0.005 and not any(abs(v)>0.005 for v in h['fund'].values()): continue
    c=CLS[h['ins']]; n=h['issuer'].upper()
    s = fi_strat(h['ins'],n) if c=='FI' else eq_strat(h['ins'],n,h['isin']) if c=='EQ' else ALTS.get(h['ins'],'Cash') if c=='ALT' else 'Bank accounts'
    rows.append([h['issuer'],h['isin'],h['ccy'],h['ins'],s,round(h['usd'],2),[round(h['afp'].get(a,0),2) for a in AFPS],[round(h['fund'].get(f,0),2) for f in FUNDS],c])
rows.sort(key=lambda z:-z[5])
d=json.load(open('c3_c9.json'))
FID={'EBC','BEE','TBE','TBI','BSE','BCE','ELN','CDPE'}
yl=[[x['fund'],x['afp'],x['ins'],x['unit'],float(x['tasa_interes']),float(x.get('porcentaje',0))] for x in d['c3'] if x['sec']=='EXTS' and 'tasa_interes' in x]
tm=[[x['fund'],x['afp'],x['ins'],int(x['plazo'])] for x in d['c9'] if x['ins'] in FID|{'TOTAL EXTRANJERO'} and 'plazo' in x]
json.dump(dict(rows=rows,afps=AFPS,funds=FUNDS,ins=INS,direct=sorted(DIRECT),yields=yl,terms=tm,asof='29 May 2026'),open('ofs_data.json','w'),separators=(',',':'))
agg=defaultdict(float); st=defaultdict(float)
for z in rows: agg[z[8]]+=z[5]; st[(z[8],z[4])]+=z[5]
print(len(rows), {k:round(v) for k,v in agg.items()}, round(sum(agg.values())))
for k,v in sorted(st.items(), key=lambda kv:(kv[0][0],-kv[1])):
    if k[0]!='FI': print(k, round(v))
