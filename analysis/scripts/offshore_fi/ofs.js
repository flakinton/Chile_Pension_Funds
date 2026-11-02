(function(){
const D = window.OFS_DATA;
const $ = id => document.getElementById('ofs-'+id);
const AFPS = D.afps, FUNDS = D.funds, INS = D.ins, DIRECT = new Set(D.direct);
const CLSN = {FI:'Fixed income', EQ:'Equity', ALT:'Alternatives', CASH:'Bank accounts abroad'};
const AFPN = a => a.charAt(0)+a.slice(1).toLowerCase().replace('Planvital','PlanVital');
const f0 = v => v.toLocaleString('en-US',{maximumFractionDigits:0});
const f1 = v => v.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
const f2 = v => v.toFixed(2);
const bn = v => 'US$'+f1(v/1000)+'bn';
const pct = (v,t) => t ? (100*v/t).toFixed(1)+'%' : '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sum = (a,f) => a.reduce((s,x)=>s+f(x),0);
const group = (a,key) => { const m=new Map(); a.forEach(x=>{const k=key(x); if(!m.has(k)) m.set(k,[]); m.get(k).push(x);}); return m; };
const bar = (v,max,alt) => `<div class="hb${alt?' alt':''}"><div class="b" style="width:${Math.max(0,90*v/max)}px"></div>${f0(v)}</div>`;
const ALL = D.rows.map(r => ({issuer:r[0], isin:r[1], ccy:r[2], ins:r[3], strat:r[4], usd:r[5], afp:r[6], fund:r[7], cls:r[8]}));
const Y = {}; D.yields.forEach(([fu,afp,ins,unit,y])=>{ if(fu==='TOTAL'&&afp==='TOTAL') Y[ins+'|'+unit]=y; });
const TERM = {}; D.terms.forEach(([fu,afp,ins,d])=>{ if(fu==='TOTAL'&&afp==='TOTAL') TERM[ins]=d/365; });

let CLS = 'ALL', R = ALL, TOT = 0;
const TXT = {
  ALL:{strat:'Strategy mix', stratSub:'Grouped by asset class. Labels inside each class come from fund names, so treat them as a guide.', directH:'Direct holdings: issuers', directSub:'Bonds, shares and bank accounts the funds hold in their own name. Click an issuer to see its ISINs.', fundsH:'Funds, ETFs and managers', fundsSub:'Each foreign fund, ETF or private-markets manager, with all share classes or vehicles added together.',
    alert:'<b>Most of the offshore book is held through funds.</b> SP shows which fund or ETF the AFPs own, not what the fund holds, and gives no yields for funds. To look through to the underlying holdings or get yields, run the ISINs from the CSV through Bloomberg or use each fund\'s factsheet.'},
  FI:{strat:'Strategy mix', stratSub:'SP does not tag fund strategy. I grouped each fund by keywords in its name (emerging, local, high yield, convertible, CLO…), so treat the split as a guide.', directH:'Direct bonds: issuers', directSub:'Bonds the funds hold in their own name. The yield is SP\'s average valuation rate for that instrument type and currency across all funds (Cuadro 3). SP does not publish a yield per bond, so two issuers in the same type and currency show the same rate. Click an issuer to see its ISINs.', fundsH:'Funds and managers', fundsSub:'Each foreign debt fund the AFPs hold, all share classes added together. SP has no yield for these. The ISINs are in the full list below and in the CSV, so you can pull yield to worst and duration from Bloomberg or the managers\' factsheets.',
    alert:'<b>What SP doesn\'t publish.</b> SP gives yields only as averages by instrument type and currency, not per bond, and gives no yields at all for funds and ETFs, which hold most of this book. To get yields for the whole book, run the ISINs from the CSV through Bloomberg (yield to worst, duration) or use each fund\'s factsheet.'},
  EQ:{strat:'Region', stratSub:'Region read from the fund or ETF name (for example S&P 500, Korea, Latin America). US-listed ETFs with no region in the name, such as the Vanguard sector ETFs, count as US. Treat the split as a guide.', directH:'Direct shares: issuers', directSub:'Foreign shares and ADRs held directly. They are a very small part of offshore equity. Click an issuer to see its ISINs.', fundsH:'Equity funds and ETFs', fundsSub:'Each foreign equity mutual fund and ETF, all share classes added together. SP does not show the stocks inside them.',
    alert:'<b>Almost all offshore equity is held through funds and ETFs.</b> Direct shares are about 0.1% of the total. SP shows each fund, not its holdings, so look-through to sectors or single stocks needs the funds\' own holdings files.'},
  ALT:{strat:'Type', stratSub:'By SP instrument: private equity vehicles and co-investments, infrastructure, real estate, and Chilean funds that SP files as alternatives.', directH:'', directSub:'', fundsH:'Managers', fundsSub:'Private-markets vehicles grouped by manager (SP reports these by manager, mostly without an ISIN). The amounts are reported values, which usually lag public markets.',
    alert:'<b>Alternatives are reported at the manager\'s valuation.</b> SP gives the manager and the type of vehicle, but not the fund vintage or the commitments still to be drawn. Private debt vehicles (US$1.8bn) are counted under fixed income.'}
};

function kpis(){
  const dir = sum(R.filter(r=>DIRECT.has(r.ins)), r=>r.usd);
  const nfund = new Set(R.filter(r=>!DIRECT.has(r.ins)).map(r=>r.issuer)).size;
  let k;
  if (CLS==='ALL'){
    const c = cl => sum(ALL.filter(r=>r.cls===cl), r=>r.usd);
    k = [['Offshore holdings', bn(TOT), R.length+' ISINs and vehicles'],
         ['Equity', bn(c('EQ')), pct(c('EQ'),TOT)+' of offshore'],
         ['Fixed income', bn(c('FI')), pct(c('FI'),TOT)+' of offshore'],
         ['Alternatives', bn(c('ALT')), pct(c('ALT'),TOT)+' of offshore · cash abroad '+bn(c('CASH'))]];
  } else if (CLS==='FI'){
    const ust = sum(R.filter(r=>r.issuer==='GOVERNMENT OF UNITED STATES'), r=>r.usd), mx = sum(R.filter(r=>r.issuer==='GOVERNMENT OF MEXICO'), r=>r.usd);
    k = [['Offshore fixed income', bn(TOT), R.length+' ISINs'], ['Held directly as bonds', bn(dir), pct(dir,TOT)+' of the total'],
         ['Through funds, ETFs and vehicles', bn(TOT-dir), nfund+' funds and managers'], ['US Treasuries', bn(ust), 'Mexico (govt) '+bn(mx)]];
  } else if (CLS==='EQ'){
    const us = sum(R.filter(r=>r.strat==='US'), r=>r.usd), etf = sum(R.filter(r=>r.ins==='ETFA'), r=>r.usd);
    k = [['Offshore equity', bn(TOT), R.length+' ISINs'], ['Through ETFs', bn(etf), pct(etf,TOT)+' of the total'],
         ['Through mutual funds', bn(sum(R.filter(r=>r.ins==='CMEV'||r.ins==='CFIV'), r=>r.usd)), nfund+' funds and ETFs'], ['US equity', bn(us), pct(us,TOT)+' · direct shares '+bn(dir)]];
  } else {
    const pe = sum(R.filter(r=>r.strat==='Private equity'), r=>r.usd);
    k = [['Offshore alternatives', bn(TOT), R.length+' vehicles'], ['Private equity', bn(pe), pct(pe,TOT)+' of the total'],
         ['Infrastructure', bn(sum(R.filter(r=>r.strat==='Infrastructure'), r=>r.usd)), 'real estate '+bn(sum(R.filter(r=>r.strat==='Real estate'), r=>r.usd))],
         ['Managers', String(nfund), 'largest: '+(()=>{const g=[...group(R,r=>r.issuer)].map(([k,v])=>[k,sum(v,r=>r.usd)]).sort((a,b)=>b[1]-a[1])[0];return g?g[0].toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())+' '+bn(g[1]):'';})()]];
  }
  $('kpis').innerHTML = k.map(([l,v,n])=>`<div class="kpi"><div class="l">${l}</div><div class="v">${v}</div><div class="n">${n}</div></div>`).join('');
}

function mix(){
  $('mix-p').hidden = CLS!=='ALL'; if (CLS!=='ALL') return;
  const cols = [...AFPS.map((a,i)=>[AFPN(a),r=>r.afp[i]]), ...FUNDS.map((f,i)=>['Fund '+f,r=>r.fund[i]])];
  const cls = ['EQ','FI','ALT','CASH'];
  const tots = cols.map(([,f])=>sum(ALL,f));
  let h = `<tr><th>Asset class</th>${cols.map(([l],i)=>`<th${i===AFPS.length?' style="border-left:1px solid var(--line)"':''}>${l}</th>`).join('')}<th>Total</th></tr>`;
  cls.forEach(c=>{ const rs=ALL.filter(r=>r.cls===c);
    h += `<tr><td>${CLSN[c]}</td>${cols.map(([,f],i)=>`<td${i===AFPS.length?' style="border-left:1px solid var(--line)"':''}>${f0(sum(rs,f))} <span class="dim">${pct(sum(rs,f),tots[i]).replace('.0%','%')}</span></td>`).join('')}<td>${f0(sum(rs,r=>r.usd))}</td></tr>`; });
  h += `<tr class="tot"><td>Total</td>${tots.map((t,i)=>`<td${i===AFPS.length?' style="border-left:1px solid var(--line)"':''}>${f0(t)}</td>`).join('')}<td>${f0(TOT)}</td></tr>`;
  $('mix').innerHTML = h;
}

function route(){
  const dir = sum(R.filter(r=>DIRECT.has(r.ins)), r=>r.usd);
  $('route-sub').textContent = CLS==='ALT' ? 'All through vehicles and co-investments managed by private-markets firms.' :
    `${pct(dir,TOT)} is held directly. The rest goes through foreign mutual funds, investment funds, ETFs and private-markets vehicles, where SP shows the fund but not what is inside it.`;
  const g = group(R, r=>r.ins); const rows=[...g].map(([k,v])=>[k,sum(v,r=>r.usd),v.length]).sort((a,b)=>b[1]-a[1]);
  const max = rows.length ? rows[0][1] : 1;
  const sect = (title, rs) => rs.length ? `<tr class="grp"><td colspan="4">${title} · US$${f0(sum(rs,r=>r[1]))}mn</td></tr>` + rs.map(([k,v,n])=>`<tr><td>${esc(INS[k]||k)} <span class="tag">${k==='CFIVA'?'CFIV':k}</span></td><td>${bar(v,max,!DIRECT.has(k))}</td><td>${pct(v,TOT)}</td><td>${n}</td></tr>`).join('') : '';
  $('route').innerHTML = `<tr><th>Instrument</th><th>US$ mn</th><th>Share</th><th>Rows</th></tr>`
    + sect('Held directly', rows.filter(r=>DIRECT.has(r[0]))) + sect('Funds, ETFs and vehicles', rows.filter(r=>!DIRECT.has(r[0])))
    + `<tr class="tot"><td>Total</td><td>${f0(TOT)}</td><td>100%</td><td>${R.length}</td></tr>`;
}

function strat(){
  $('strat-h').textContent = TXT[CLS].strat; $('strat-sub').textContent = TXT[CLS].stratSub;
  const block = rs => { const g=[...group(rs,r=>r.strat)].map(([k,v])=>[k,sum(v,r=>r.usd),new Set(v.map(r=>r.issuer)).size]).sort((a,b)=>b[1]-a[1]); return g; };
  const all = block(R); const max = all.length ? all[0][1] : 1;
  const line = ([k,v,n]) => `<tr><td>${k}</td><td>${bar(v,max,!k.startsWith('Direct'))}</td><td>${pct(v,TOT)}</td><td>${n}</td></tr>`;
  let h = `<tr><th>${CLS==='EQ'?'Region':CLS==='ALT'?'Type':'Strategy'}</th><th>US$ mn</th><th>Share</th><th>Issuers / funds</th></tr>`;
  if (CLS==='ALL') ['EQ','FI','ALT','CASH'].forEach(c=>{ const rs=R.filter(r=>r.cls===c); h += `<tr class="grp"><td colspan="4">${CLSN[c]} · US$${f0(sum(rs,r=>r.usd))}mn</td></tr>` + block(rs).map(line).join(''); });
  else h += all.map(line).join('');
  h += `<tr class="tot"><td>Total</td><td>${f0(TOT)}</td><td>100%</td><td></td></tr>`;
  $('strat').innerHTML = h;
  const nd = all.filter(r=>!r[0].startsWith('Direct') && r[0]!=='Bank accounts');
  $('fs').innerHTML = `<option value="">All ${CLS==='EQ'?'regions':CLS==='ALT'?'types':'strategies'}</option>` + nd.map(r=>`<option>${r[0]}</option>`).join('');
}

let DIM = 'afp';
function dim(){
  const cols = DIM==='afp' ? AFPS : FUNDS, idx = DIM==='afp' ? 'afp' : 'fund', lab = DIM==='afp' ? AFPN : (f=>'Fund '+f);
  const key = CLS==='ALL' ? (r=>CLSN[r.cls]) : (r=>r.strat);
  const g=[...group(R,key)].map(([k,v])=>[k,v,sum(v,r=>r.usd)]).sort((a,b)=>b[2]-a[2]);
  const colTot = cols.map((_,i)=>sum(R,r=>r[idx][i]));
  const drs = R.filter(r=>DIRECT.has(r.ins));
  let h = `<tr><th>${CLS==='ALL'?'Asset class':CLS==='EQ'?'Region':CLS==='ALT'?'Type':'Strategy'}</th>${cols.map(c=>`<th>${lab(c)}</th>`).join('')}<th>Total</th></tr>`;
  h += g.map(([k,v,t])=>`<tr><td>${k}</td>${cols.map((_,i)=>{const x=sum(v,r=>r[idx][i]);return `<td${Math.abs(x)<0.5?' class="dim"':''}>${f0(x)}</td>`}).join('')}<td>${f0(t)}</td></tr>`).join('');
  h += `<tr class="tot"><td>Total</td>${colTot.map(x=>`<td>${f0(x)}</td>`).join('')}<td>${f0(TOT)}</td></tr>`;
  if (CLS!=='ALT') h += `<tr><td class="dim">Of which held directly</td>${cols.map((_,i)=>`<td class="dim">${pct(sum(drs,r=>r[idx][i]),colTot[i])}</td>`).join('')}<td class="dim">${pct(sum(drs,r=>r.usd),TOT)}</td></tr>`;
  $('dimt').innerHTML = h;
}

function direct(){
  const dr = R.filter(r=>DIRECT.has(r.ins));
  $('direct-p').hidden = !dr.length; if (!dr.length) return;
  $('direct-h').textContent = TXT[CLS].directH; $('direct-sub').textContent = TXT[CLS].directSub;
  const fi = r => r.cls==='FI';
  const g = [...group(dr, r=>r.issuer)].map(([k,v])=>({k,v,t:sum(v,r=>r.usd)})).sort((a,b)=>b.t-a.t);
  const max = g[0].t;
  const yt = CLS!=='EQ';
  let h = `<tr><th>Issuer</th><th>US$ mn</th><th>Type</th><th>Currencies</th><th>ISINs</th>${yt?'<th>Avg yield %</th><th>Avg term (y)</th>':''}<th>Top holder</th></tr>`;
  g.forEach((o,i)=>{
    const types=[...new Set(o.v.map(r=>r.ins))], ccys=[...new Set(o.v.map(r=>r.ccy))];
    let wy=0, ww=0, wt=0, wt2=0;
    o.v.forEach(r=>{ if(!fi(r)||r.usd<=0) return; const y=Y[r.ins+'|'+r.ccy]; if(y!==undefined){wy+=y*r.usd; ww+=r.usd;} const t=TERM[r.ins]; if(t){wt+=t*r.usd; wt2+=r.usd;} });
    const top = AFPS.map((a,j)=>[a,sum(o.v,r=>r.afp[j])]).sort((a,b)=>b[1]-a[1])[0];
    h += `<tr class="iss" data-i="${i}" style="cursor:pointer"><td class="t">▸ ${esc(o.k)}</td><td>${bar(o.t,max)}</td><td class="l">${types.join(', ')}</td><td class="l">${esc(ccys.join(', '))}</td><td>${o.v.length}</td>${yt?`<td>${ww?f2(wy/ww):'–'}</td><td>${wt2?f1(wt/wt2):'–'}</td>`:''}<td class="l">${AFPN(top[0])} ${f0(top[1])}</td></tr>`;
    h += o.v.slice().sort((a,b)=>b.usd-a.usd).map(r=>{const y=fi(r)?Y[r.ins+'|'+r.ccy]:undefined; return `<tr class="det d${i}" hidden><td class="t dim" style="padding-left:24px">${esc(r.isin)}</td><td class="dim">${f1(r.usd)}</td><td class="l dim">${r.ins}</td><td class="l dim">${esc(r.ccy)}</td><td></td>${yt?`<td class="dim">${y!==undefined?f2(y):'–'}</td><td></td>`:''}<td class="l dim">${AFPS.map((a,j)=>r.afp[j]>0.05?AFPN(a)+' '+f0(r.afp[j]):'').filter(Boolean).join(' · ')}</td></tr>`;}).join('');
  });
  h += `<tr class="tot"><td>Total held directly</td><td>${f0(sum(dr,r=>r.usd))}</td><td colspan="${yt?6:4}"></td></tr>`;
  const t = $('direct'); t.innerHTML = h;
  t.querySelectorAll('tr.iss').forEach(tr=>tr.onclick=()=>{const rs=t.querySelectorAll('.d'+tr.dataset.i); const open=rs[0].hidden; rs.forEach(x=>x.hidden=!open); tr.firstChild.textContent=tr.firstChild.textContent.replace(open?'▸':'▾',open?'▾':'▸');});
}

function yieldTerm(){
  const show = CLS==='FI' || CLS==='ALL'; $('yt').hidden = !show; if (!show) return;
  const sel = $('yf');
  if (!sel.options.length){ sel.innerHTML = [['TOTAL','All funds'],...FUNDS.map(f=>[f,'Fund '+f])].map(([v,l])=>`<option value="${v}">${l}</option>`).join(''); sel.onchange = yieldTerm; }
  const fu = sel.value, rs = D.yields.filter(y=>y[0]===fu);
  const keys = [...new Set(rs.map(y=>y[2]+'|'+y[3]))].sort();
  const cols = [...AFPS,'TOTAL'];
  let h = `<tr><th>Type · currency</th>${cols.map(c=>`<th>${c==='TOTAL'?'System':AFPN(c)}</th>`).join('')}<th>Weight</th></tr>`;
  keys.forEach(k=>{ const [ins,u]=k.split('|'); const by=Object.fromEntries(rs.filter(y=>y[2]===ins&&y[3]===u).map(y=>[y[1],y])); const w=by.TOTAL?by.TOTAL[5]:0;
    h += `<tr><td>${ins} <span class="dim">${u==='NO'?'other':u}</span></td>${cols.map(c=>`<td${c==='TOTAL'?' style="font-weight:500"':''}>${by[c]&&!(ins==='CDPE'&&by[c][4]===0)?f2(by[c][4]):'<span class="dim">–</span>'}</td>`).join('')}<td class="dim">${w.toFixed(2)}%</td></tr>`; });
  $('yield').innerHTML = h;
  const ins = ['EBC','BEE','TBE','TBI','BSE','BCE','TOTAL EXTRANJERO'], tc = ['TOTAL',...FUNDS];
  const get = (f,i) => { const t = D.terms.find(x=>x[0]===f&&x[1]==='TOTAL'&&x[2]===i); return t&&t[3]>0 ? f1(t[3]/365) : '<span class="dim">–</span>'; };
  $('term').innerHTML = `<tr><th>Type</th>${tc.map(c=>`<th>${c==='TOTAL'?'All':'Fund '+c}</th>`).join('')}</tr>` + ins.map(i=>`<tr${i==='TOTAL EXTRANJERO'?' class="tot"':''}><td>${i==='TOTAL EXTRANJERO'?'All direct foreign':i}</td>${tc.map(c=>`<td>${get(c,i)}</td>`).join('')}</tr>`).join('');
}

function funds(){
  $('funds-h').textContent = TXT[CLS].fundsH; $('funds-sub').textContent = TXT[CLS].fundsSub;
  const s = $('fs').value;
  const fr = R.filter(r=>!DIRECT.has(r.ins) && (!s || r.strat===s));
  const g = [...group(fr, r=>r.issuer+'|'+r.ins)].map(([k,v])=>({k:k.split('|'),v,t:sum(v,r=>r.usd)})).sort((a,b)=>b.t-a.t);
  const max = g.length ? g[0].t : 1;
  let h = `<tr><th>${CLS==='ALT'?'Manager':'Fund / manager'}</th><th>US$ mn</th><th>Type</th><th>${CLS==='EQ'?'Region':CLS==='ALT'?'Asset':'Strategy'}</th><th>Ccy</th><th>${CLS==='ALT'?'Vehicles':'Classes'}</th>${AFPS.map(a=>`<th>${AFPN(a)}</th>`).join('')}</tr>`;
  h += g.slice(0,300).map(o=>`<tr><td class="t">${esc(o.k[0])}</td><td>${bar(o.t,max,true)}</td><td class="l">${o.k[1]==='CFIVA'?'CFIV':o.k[1]}</td><td class="l">${o.v[0].strat}</td><td class="l">${esc([...new Set(o.v.map(r=>r.ccy))].join(', '))}</td><td>${o.v.length}</td>${AFPS.map((a,j)=>{const x=sum(o.v,r=>r.afp[j]);return `<td${x<0.5?' class="dim"':''}>${Math.abs(x)<0.05?'–':f0(x)}</td>`}).join('')}</tr>`).join('');
  h += `<tr class="tot"><td>Total${g.length>300?' (top 300 shown)':''}</td><td>${f0(sum(fr,r=>r.usd))}</td><td colspan="${4+AFPS.length}"></td></tr>`;
  $('funds').innerHTML = h;
}
$('fs').onchange = funds;

let sortK='usd', sortD=-1;
function listFilt(){
  const s = $('q').value.trim().toUpperCase(), rr = $('froute').value, a = $('fafp').value;
  return R.filter(x => (!s || (x.issuer+' '+x.isin+' '+x.ccy+' '+x.strat).toUpperCase().includes(s))
    && (!rr || (rr==='D'?DIRECT.has(x.ins):rr==='F'?!DIRECT.has(x.ins):x.ins===rr)) && (a==='' || Math.abs(x.afp[+a])>0.005));
}
function list(){
  const a = $('fafp').value;
  const cols = [['issuer','Issuer / fund'],['isin','ISIN'],['ccy','Ccy'],['ins','Type'],['strat','Strategy'],['usd','US$ mn'],...FUNDS.map((f,i)=>['F'+i,'Fund '+f])];
  const val = (x,k) => /^F\d$/.test(k) ? x.fund[+k[1]] : x[k];
  const rs = listFilt().sort((x,y)=>{const u=val(x,sortK),v=val(y,sortK); return (u>v?1:u<v?-1:0)*sortD;});
  const amt = x => a==='' ? x.usd : x.afp[+a];
  $('cnt').textContent = rs.length+' rows · US$'+f0(sum(rs,amt))+'mn'+(a===''?'':' held by '+AFPN(AFPS[+a]))+(rs.length>400?' · first 400 shown':'');
  let h = '<tr>'+cols.map(([k,l])=>`<th class="s" data-k="${k}">${l}${k===sortK?(sortD<0?' ↓':' ↑'):''}</th>`).join('')+(a===''?'':`<th>${AFPN(AFPS[+a])}</th>`)+'</tr>';
  h += rs.slice(0,400).map(x=>`<tr><td class="t">${esc(x.issuer)}</td><td class="l">${esc(x.isin)}</td><td class="l">${esc(x.ccy)}</td><td class="l">${x.ins==='CFIVA'?'CFIV':x.ins}</td><td class="l">${x.strat}</td><td>${f1(x.usd)}</td>${x.fund.map(v=>`<td${Math.abs(v)<0.05?' class="dim"':''}>${Math.abs(v)<0.05?'–':f1(v)}</td>`).join('')}${a===''?'':`<td>${f1(x.afp[+a])}</td>`}</tr>`).join('');
  const t = $('all'); t.innerHTML = h;
  t.querySelectorAll('th.s').forEach(th=>th.onclick=()=>{ if(sortK===th.dataset.k) sortD=-sortD; else {sortK=th.dataset.k; sortD=(sortK==='usd'||/^F\d$/.test(sortK))?-1:1;} list(); });
}
['q','froute','fafp'].forEach(id=>$(id).oninput=list);
$('fafp').innerHTML = '<option value="">All AFPs</option>' + AFPS.map((a,i)=>`<option value="${i}">${AFPN(a)}</option>`).join('');
$('csv').onclick = () => {
  const head = ['asset_class','issuer','isin','currency','instrument','instrument_name','strategy','usd_mn_total',...AFPS.map(a=>'usd_mn_'+a.toLowerCase()),...FUNDS.map(f=>'usd_mn_fund_'+f),'sp_avg_yield_type_ccy_pct'];
  const q2 = s => /[",\n]/.test(String(s)) ? '"'+String(s).replace(/"/g,'""')+'"' : s;
  const lines = [head.join(',')].concat(listFilt().map(x=>{const y=x.cls==='FI'&&DIRECT.has(x.ins)?Y[x.ins+'|'+x.ccy]:undefined; return [CLSN[x.cls],x.issuer,x.isin,x.ccy,x.ins==='CFIVA'?'CFIV':x.ins,INS[x.ins],x.strat,x.usd,...x.afp,...x.fund,y!==undefined?y:''].map(q2).join(',');}));
  const b = new Blob(['﻿'+lines.join('\n')],{type:'text/csv'}); const u = URL.createObjectURL(b);
  const l = document.createElement('a'); l.href=u; l.download='afp_offshore_holdings_2026-05'+(CLS==='ALL'?'':'_'+CLS.toLowerCase())+'.csv'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(()=>URL.revokeObjectURL(u),1000);
};

function draw(){
  R = CLS==='ALL' ? ALL : ALL.filter(r=>r.cls===CLS); TOT = sum(R,r=>r.usd);
  $('clsnote').textContent = CLS==='ALL' ? '' : CLSN[CLS]+': US$'+f0(TOT)+'mn of US$'+f0(sum(ALL,r=>r.usd))+'mn offshore';
  const ins=[...new Set(R.map(r=>r.ins))];
  $('froute').innerHTML = '<option value="">All instruments</option><option value="D">Held directly</option><option value="F">Funds and vehicles</option>' + ins.map(k=>`<option value="${k}">${k==='CFIVA'?'CFIV (alternatives)':k} · ${esc(INS[k]||k)}</option>`).join('');
  $('alert').innerHTML = TXT[CLS].alert;
  kpis(); mix(); route(); strat(); dim(); direct(); yieldTerm(); funds(); list();
}
document.querySelectorAll('#ofs-cls button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#ofs-cls button').forEach(x=>x.classList.toggle('on',x===b)); CLS=b.dataset.v; draw();});
document.querySelectorAll('#ofs-dim button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#ofs-dim button').forEach(x=>x.classList.toggle('on',x===b)); DIM=b.dataset.v; dim();});
draw();
})();
