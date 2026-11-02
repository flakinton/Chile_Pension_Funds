# Offshore holdings by issuer

Source: SP *cartera agregada y desagregada* XML (May 2026, `cartera_desagregada202605.xml`, ~270 MB, not in the repo).

Run from this folder:

1. `python3 parse21.py <xml>` → `c21_rows.json` (Cuadro 21: foreign holdings by issuer/ISIN, instrument, AFP and fund)
2. `python3 parse3.py <xml>` → `c3_c9.json` (Cuadro 3 valuation rates by instrument type and currency; Cuadro 9 average term)
3. `python3 build_all.py` → `ofs_data.json` (copy to `../dashdata/ofs_data.json`)
4. `python3 render_ofs.py <out.html>` → standalone `dashboard/afp_offshore_holdings.html`
5. `python3 ../build_combined.py` → rebuilds `dashboard/afp_dashboard.html` with the offshore section (`ofs.css`, `ofs.html`, `ofs.js`).

Note: `build_combined.py` and `render_ofs.py` read and write `/mnt/project-files/dashboard`; adjust the path when running elsewhere.
