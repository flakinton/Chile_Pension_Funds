# Writes the standalone dashboard/afp_offshore_holdings.html from ofs.css/.html/.js + ofs_data.json
import json, os, sys
H = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1] if len(sys.argv)>1 else '/mnt/project-files/dashboard/afp_offshore_holdings.html'
rd = lambda f: open(os.path.join(H,f)).read()
data = open(os.path.join(H,'ofs_data.json')).read() if os.path.exists(os.path.join(H,'ofs_data.json')) else open(os.path.join(H,'..','dashdata','ofs_data.json')).read()
page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AFP Offshore Holdings</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Schibsted+Grotesk:wght@400;500;700&display=swap">
<style>body{{margin:0;background:#f3f5f7;padding:24px 16px}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]) body{{background:#0e161d}}}}
:root[data-theme="dark"] body{{background:#0e161d}}
{rd('ofs.css')}</style></head>
<body><div id="ofs">
{rd('ofs.html')}
</div>
<script>window.OFS_DATA={data};</script>
<script>{rd('ofs.js')}</script>
</body></html>
'''
open(out,'w').write(page); print(out, len(page))
