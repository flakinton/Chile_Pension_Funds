# Builds dashboard/afp_dashboard.html: one offline page that joins
# afp_portfolio_monitor.html, generational_funds_transition.html and a new
# section on whether today's FX position must change under Res. Ex. 1195.
# Run: python3 build_combined.py  (reads and writes /mnt/project-files/dashboard)
import re, os
D = '/mnt/project-files/dashboard'
mon = open(f'{D}/afp_portfolio_monitor.html').read()
fg = open(f'{D}/generational_funds_transition.html').read()

# --- generational funds page: head style, head scripts (d3 + data shim), body
fg_head = fg[fg.index('<head>'):fg.index('</head>')]
fg_style = re.search(r'<style>(.*?)</style>', fg_head, re.S).group(1)
fg_scripts = ''.join(re.findall(r'<script>.*?</script>', fg_head, re.S))
fg_body = fg[fg.index('<div id="dash-root">') + len('<div id="dash-root">'):fg.rindex('</div></body>')]

# --- monitor: scope its CSS under #mon, wrap its script so globals don't clash
mon_style = re.search(r'<style>(.*?)</style>', mon, re.S).group(1)
mon_body = mon[mon.index('<div class="wrap">'):mon.index('<script>')]
mon_js = re.search(r'<script>(.*?)</script>', mon, re.S).group(1)

def scope_sel(sel):
    sel = sel.strip()
    if sel.startswith(':root[data-theme="dark"]'):
        return None
    if sel.startswith(':root') or sel == 'body':
        return '#mon'
    return '#mon ' + sel

def scope_rules(css):
    out = []
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sels = [s for s in (scope_sel(x) for x in m.group(1).split(',')) if s]
        if sels:
            out.append(','.join(sels) + '{' + m.group(2) + '}')
    return '\n'.join(out)

mon_style = re.sub(r'/\*.*?\*/', '', mon_style, flags=re.S)
media = re.search(r'@media \(prefers-color-scheme:dark\)\{(.*?\})\}', mon_style, re.S)
plain = mon_style.replace(media.group(0), '')
mon_css = scope_rules(plain) + '\n@media (prefers-color-scheme:dark){' + scope_rules(media.group(1)) + '}\n'
# share the page's surface colours and font so both halves look like one page
mon_css += ('#mon{--bg:var(--color-bg);--surface:var(--color-panel);--fg:var(--color-fg);--muted:var(--color-fg-muted);'
            '--line:var(--color-border-line);--display:var(--font-anthropic-sans);padding:0;background:transparent}\n'
            '#mon .wrap{max-width:none}\n#mon .panel,#mon .kpi,#mon .fxbar,#mon .alert{border-radius:var(--cds-radius)}\n')

mon_body = mon_body.replace('id="kpis"', 'id="mon-kpis"')
mon_body = mon_body.replace('<h1>AFP Portfolio Monitor</h1>', '<h2 class="part">Portfolio monitor</h2>')
mon_js = mon_js.replace('getElementById("kpis")', 'getElementById("mon-kpis")')
mon_js = '(function(){\n' + mon_js + '\nwindow.MON={FX:FX,AUM:AUM,forTot:forTot,T:T,N:N,ALT:ALT,usd:usd,sum:sum};\n})();\n'

new_css = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'combined_fx.css')).read()
new_html = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'combined_fx.html')).read()
new_js = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'combined_fx.js')).read()

page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AFP Dashboard</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>{fg_style}
{mon_css}
{new_css}</style>
{fg_scripts}
</head><body><div id="dash-root">
{new_html}
<div id="mon">
{mon_body}
</div>
<script>{mon_js}</script>
<div id="fgx">
{fg_body}
</div>
<script>{new_js}</script>
<p class="cb-foot">Combined offline copy built 22 Oct 2026 from afp_portfolio_monitor.html (SP and Banco Central data, Sep/Aug 2026) and generational_funds_transition.html (SP data, May–Jun 2026). Numbers marked as estimates are our calculations, not published figures.</p>
</div></body></html>
'''
open(f'{D}/afp_dashboard.html', 'w').write(page)
print(len(page))
