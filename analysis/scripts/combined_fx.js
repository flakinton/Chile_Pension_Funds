(function () {
  // FX position (monitor: SP Sep 2026 holdings, Banco Central Aug 2026 forwards) against Res. Ex. 1195 hedging limits.
  const M = window.MON, el = (id) => document.getElementById(id);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), pc = (v) => `${Math.round(v)}%`;
  const S = (a, k) => a.reduce((s, r) => s + Number(k ? r[k] : r), 0);
  function model() {
    const sw = dash.data('fx_switch').data, fbf = dash.data('fx_by_fund').data;
    const fxAssets = M.forTot / 1000, H = -M.N.usdclpNet[9] / 1000;
    const privF = M.usd(M.sum(M.ALT.ffi)) / 1000, ffi = M.usd(M.T.ff) / 1000, debt = ffi - privF;
    const spH = S(fbf, 'fx_hedges_usd_bn'), spD = S(fbf, 'fc_debt_usd_bn'), spA = S(fbf, 'assets_usd_bn'), spF = S(fbf, 'foreign_usd_bn');
    const kA = M.AUM / 1000 / spA, kH = H / spH; // Sep/May fund size in US$; BCCh Aug / SP May hedges
    const rows = sw.map((r) => {
      const h = r.fx_hedges_now_usd_bn * kH, m = r.min_hedge_usd_bn * kA, m12 = r.min_hedge_first12m_usd_bn * kA;
      return { age: r.cohort, stage: r.stage, h, d: r.fc_debt_target_usd_bn * kA, mx: r.unhedged_max_pct, m12, m, young: r.young };
    });
    // Balances outside the age data (pensioners on programmed withdrawal, others): today's debt and hedges, assumed in 20% stages
    const dOut = debt * (1 - S(sw, 'fc_debt_now_usd_bn') / spD), hOut = H - S(rows, 'h');
    rows.push({ age: 'Outside age data', stage: '8–10 (assumed)', h: hOut, d: dOut, mx: 20, m12: dOut * 0.5, m: dOut * 0.8, young: false, out: true });
    rows.forEach((r) => { r.cush = r.h - r.m; r.x = Math.max(0, r.m - r.h, r.m12 - r.h); });
    const newMin = S(rows, 'm'), new12 = S(rows, 'm12'), young = S(rows.filter((r) => r.young), 'h');
    return { fxAssets, H, privF, ffi, debt, oldMin: 0.5 * debt, spH, spD, spF, kA, rows, newMin, new12, young, extra: S(rows, 'x'),
      free: H - newMin, cohH: S(sw, 'fx_hedges_now_usd_bn'), spMin: S(sw, 'min_hedge_usd_bn'), spFree: S(sw, 'hedge_not_required_usd_bn') };
  }
  function bars(m) {
    const box = el('fr-bars'), W = Math.max(300, box.clientWidth || 480), L = 190, R = 56, rh = 34, top = 8;
    const data = [['Held: US$ sold forward (31 Aug)', m.H, 'var(--c1)'], ["Min, today's rule (≤)", m.oldMin, 'var(--cds-chart-muted)'],
      ['Min, new regime, first 12 months', m.new12, 'var(--c2)'], ['Min, new regime, from Apr 2028', m.newMin, 'var(--c2)']];
    const mx = Math.max(m.debt, m.H) * 1.08, x = (v) => L + (v / mx) * (W - L - R), H = top + data.length * rh + 22;
    let s = `<svg class="cb-bars" width="${W}" height="${H}" role="img" aria-label="Hedges held vs required, US$bn">`;
    data.forEach(([k, v, c], i) => {
      const y = top + i * rh;
      s += `<text x="${L - 8}" y="${y + 17}" text-anchor="end">${k}</text><rect x="${L}" y="${y + 4}" width="${x(v) - L}" height="20" rx="3" fill="${c}"/><text class="v" x="${x(v) + 6}" y="${y + 18}">${f1(v)}</text>`;
    });
    const xd = x(m.debt);
    s += `<line x1="${xd}" x2="${xd}" y1="${top}" y2="${top + data.length * rh}" stroke="var(--color-fg)" stroke-dasharray="4 3"/><text x="${xd}" y="${H - 6}" text-anchor="middle">FC debt ${f1(m.debt)}</text></svg>`;
    box.innerHTML = s;
  }
  function render() {
    const m = model();
    el('fr-verdict').innerHTML = `<b>No, the position does not have to change.</b> The funds sell about US$${f1(m.H)}bn forward against pesos, ${pc(m.H / m.debt * 100)} of their foreign-currency debt. ` +
      `The new regime would require about US$${f1(m.newMin)}bn from April 2028 (US$${f1(m.new12)}bn in the first 12 months), all of it for ages 51 and over, against up to US$${f1(m.oldMin)}bn under today's 50% rule. ` +
      `Every age group carries in more hedges than its minimum. The change, if any, runs the other way: about US$${f1(m.free)}bn of hedges would no longer be required, US$${f1(m.young)}bn of it in the funds for ages up to 50. ` +
      `Unwinding that would mean buying dollars and would lift the net long foreign-currency position from about US$${f1(m.fxAssets - m.H)}bn to between US$${f1(m.fxAssets - m.H + m.young)}bn and US$${f1(m.fxAssets - m.H + m.free)}bn (scenarios below).`;
    el('fr-k-net').textContent = f1(m.fxAssets - m.H);
    el('fr-k-net-s').textContent = `US$bn: foreign assets ${f1(m.fxAssets)} (30 Sep) less ${f1(m.H)} sold forward (31 Aug)`;
    el('fr-k-h').textContent = f1(m.H);
    el('fr-k-h-s').textContent = `US$bn, Banco Central, 31 Aug · ${pc(m.H / m.fxAssets * 100)} of foreign assets, ${pc(m.H / m.debt * 100)} of FC debt`;
    el('fr-k-old').textContent = f1(m.oldMin);
    el('fr-k-new').textContent = f1(m.newMin);
    el('fr-k-new-s').textContent = `US$bn from Apr 2028; ${f1(m.new12)} in the first 12 months (estimate)`;
    el('fr-k-x').textContent = f1(m.extra);
    el('fr-k-free').textContent = f1(m.free);
    el('fr-k-free-s').textContent = `US$bn, of which ${f1(m.young)} in ages up to 50 (estimate)`;
    bars(m);
    const td = (t, c) => `<td${c ? ` class="${c}"` : ''}>${t}</td>`;
    let a = '';
    m.rows.forEach((r) => {
      a += `<tr>${td(r.age)}${td(r.stage)}${td(f1(r.h))}${td(f1(r.d))}${td(pc(r.mx))}${td(f1(r.m12))}${td(f1(r.m))}${td((r.cush >= 0 ? '+' : '') + f1(r.cush), r.cush >= 0 ? 'cb-ok' : 'cb-bad')}${td(f1(r.x))}</tr>`;
    });
    a += `<tr class="cb-tot">${td('Total')}${td('')}${td(f1(m.H))}${td(f1(S(m.rows, 'd')))}${td('')}${td(f1(m.new12))}${td(f1(m.newMin))}${td('+' + f1(m.free), 'cb-ok')}${td(f1(m.extra))}</tr>`;
    a += `<tr><td colspan="9" style="white-space:normal;text-align:left;color:var(--color-fg-muted)">"Outside age data" is the part of the funds not in the SP's balances-by-age table (mainly pensioners on programmed withdrawal). Its hedges are the remainder of the Banco Central total; its debt is today's, and it is assumed to sit in stages with the 20% limit, which is the strictest case.</td></tr>`;
    document.querySelector('#fr-age tbody').innerHTML = a;
    const sc = [["Keep today's hedges", 0], ['Unwind hedges in ages ≤50 (stages 1–4)', m.young], ['Cut every group to the new minimum', m.free]];
    document.querySelector('#fr-scen tbody').innerHTML = sc.map(([k, b]) => `<tr>${td(k)}${td(f1(b))}${td(f1(m.H - b))}${td(f1(m.fxAssets - m.H + b))}${td(pc((m.H - b) / m.fxAssets * 100))}</tr>`).join('') +
      `<tr><td colspan="5" style="white-space:normal;text-align:left;color:var(--color-fg-muted)">US$bn, on today's foreign assets (${f1(m.fxAssets)}). The switch itself moves money from foreign bonds to foreign equity but leaves foreign assets roughly unchanged.</td></tr>`;
    const rr = (k, s, v, hl) => `<tr>${td(k)}${td(s)}<td style="text-align:right"${hl ? ' class="cb-hl"' : ''}>${v}</td></tr>`;
    document.querySelector('#fr-rec tbody').innerHTML =
      `<tr><td colspan="3"><b>Forwards selling foreign currency against pesos</b></td></tr>` +
      rr('All currencies vs CLP or UF', 'SP detailed portfolio (Cuadros 22, 24), 29 May', f1(m.spH), 1) +
      rr('USD-CLP, net US$ sold', 'Banco Central DER_FP_PPM_01, 31 May', f1(-M.N.usdclpNet[6] / 1000)) +
      rr('USD-CLP, net US$ sold', 'Banco Central, 30 Jun', f1(-M.N.usdclpNet[7] / 1000)) +
      rr('USD-CLP, net US$ sold', 'Banco Central, 31 Aug', f1(m.H), 1) +
      rr('Derivatives the SP counts as hedges', 'SP quarterly report, 30 Jun (40.9% of a 81.9 base)', '33.5') +
      `<tr><td colspan="3"><b>Foreign-currency debt</b></td></tr>` +
      rr('Foreign debt, excl. private debt', 'SP detailed portfolio (Cuadro 1), 29 May', f1(m.spD), 1) +
      rr('Offshore fixed income', 'SP Tabla 16, 30 Sep', f1(m.ffi)) +
      rr('… less foreign private debt', 'SP Tabla 16, 30 Sep', f1(m.debt), 1) +
      `<tr><td colspan="3"><b>Foreign assets</b></td></tr>` +
      rr('All foreign investment', 'SP detailed portfolio, 29 May', f1(m.spF)) +
      rr('All foreign investment', 'SP Tabla 16, 30 Sep', f1(m.fxAssets)) +
      `<tr><td colspan="3"><b>Results</b></td></tr>` +
      rr('Hedges as % of FC debt', 'May (SP) · Aug/Sep (this section)', `${pc(m.spH / m.spD * 100)} · ${pc(m.H / m.debt * 100)}`) +
      rr('Hedges as % of foreign assets', 'May (SP) · Aug/Sep', `${pc(m.spH / m.spF * 100)} · ${pc(m.H / m.fxAssets * 100)}`) +
      rr('Minimum hedge, new regime', '"Currency hedging" · this section', `${f1(m.spMin)} · ${f1(m.newMin)}`) +
      rr('Hedges no longer required', '"Currency hedging" · this section', `${f1(m.spFree)} · ${f1(m.free)}`);
    const gap = m.spH - (-M.N.usdclpNet[6] / 1000);
    el('fr-why').innerHTML = [
      `<b>Same answer.</b> Both views put hedges at about nine-tenths of foreign-currency debt and under a third of foreign assets, and neither finds an age group short of the new minimum.`,
      `<b>Timing.</b> The Banco Central's net US$ sales rose from ${f1(-M.N.usdclpNet[6] / 1000)} in May to ${f1(m.H)} in August (+${f1(m.H + M.N.usdclpNet[6] / 1000)}bn), so the August position is more hedged than the May snapshot.`,
      `<b>Currencies covered.</b> In May the SP shows ${f1(m.spH)} against the Banco Central's ${f1(-M.N.usdclpNet[6] / 1000)}. We infer the US$${f1(gap)}bn gap is forwards in other currencies (such as euros) against pesos or UF, which the USD-CLP series leaves out; we have not checked this line by line. If so, the US$${f1(m.H)}bn used here understates total hedges a little, which makes the compliance check conservative.`,
      `<b>SP hedge ratio.</b> The SP's quarterly 40.9% (US$33.5bn on a US$81.9bn base, June) counts only what it classes as hedges against a narrower "hedgeable" base, so it is not comparable to total forwards.`,
      `<b>Foreign-currency debt.</b> ${f1(m.spD)} (May, detailed portfolio) against ${f1(m.debt)} (Sep, Tabla 16 offshore fixed income less ${f1(m.privF)} of foreign private debt): different dates and sources. In US$ it barely moved, while the peso weakened from 892.89 to 970.46.`,
      `<b>Minimum hedge, ${f1(m.spMin)} there vs ${f1(m.newMin)} here.</b> The regime's targets are a share of each fund. At September's weaker peso the funds are ${pc((1 - m.kA) * 100)} smaller in US$, which lowers the minimum; this section also adds the balances outside the age data, assumed at the strict 20% limit, which raises it.`,
      `<b>Hedges no longer required, ${f1(m.spFree)} there vs ${f1(m.free)} here.</b> The "Currency hedging" section counts only hedges that belong to the age data (${f1(m.cohH)} of ${f1(m.spH)}); this section uses the full Banco Central total of ${f1(m.H)}.`,
      `<b>What is not known.</b> Hedges by fund come from the SP's May portfolio; the Banco Central publishes only system totals. Whether young-fund hedges are actually unwound depends on the reference portfolios (and whether their benchmarks are currency-hedged), which the SP has not yet published.`,
    ].map((t) => `<li>${t}</li>`).join('');
  }
  dash.onData(render);
})();
