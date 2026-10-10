"""Static site builder for tristankayser.com

One template + one content file per language  →  index.html, index-de.html, index-af.html,
plus impressum.html, lebenslauf.html, 404.html, sitemap.xml, robots.txt.

Usage:   pip install jinja2  &&  python3 src/build.py
Edit text in src/content/{en,de,af}.json, layout in src/templates/, styles in assets/css/main.css.
"""
import json
import re
import datetime as dt
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
SITE = "https://tristankayser.com"
LANGS = ["en", "de", "af"]
PAGE = {"en": "", "de": "index-de.html", "af": "index-af.html"}   # en lives at "/"
PHONE = "+49 152 3879 5449"   # contact row + Impressum — please confirm it's current
# Tool logos for the marquee (Simple Icons, CC0) — files in src/icons/
LOGOS = [("proxmox", "Proxmox"), ("opnsense", "OPNsense"), ("docker", "Docker"), ("linux", "Linux"), ("debian", "Debian"),
         ("ansible", "Ansible"), ("wireguard", "WireGuard"), ("vmware", "VMware ESXi"), ("windows", "Windows Server"), ("python", "Python"),
         ("gnubash", "Bash"), ("pihole", "Pi-hole"), ("nginxproxymanager", "Nginx Proxy Manager"),
         ("ubuntu", "Ubuntu"), ("vaultwarden", "Vaultwarden"), ("n8n", "n8n"), ("ollama", "Ollama"), ("cisco", "Cisco"), ("postgresql", "PostgreSQL"),
         ("sqlite", "SQLite"), ("git", "Git"), ("github", "GitHub"), ("ubiquiti", "UniFi"), ("paperlessngx", "Paperless-ngx"), ("searxng", "SearXNG"), ("bookstack", "BookStack")]
# generic four-pane window glyph (no official logo in Simple Icons)
WINDOWS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h8v7H3zM13 4h8v7h-8zM3 13h8v7H3zM13 13h8v7h-8z"/></svg>'

TODAY = dt.date.today()
VERSION = TODAY.strftime("%Y%m%d")

ICON_PATHS = {
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    "proxy": '<rect x="2" y="3" width="20" height="6" rx="1"/><rect x="2" y="15" width="20" height="6" rx="1"/><line x1="12" y1="9" x2="12" y2="15"/>',
    "filter": '<polygon points="22,3 2,3 10,12.5 10,19 14,21 14,12.5"/>',
    "lock": '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10 15 15 0 014-10z"/>',
    "eye": '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "chip": '<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    "chat": '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 9h8M8 13h5"/>',
    "bot": '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M12 3v4"/><circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/>',
    "bulb": '<path d="M12 2a7 7 0 017 7c0 2.4-1.2 4.5-3 5.7V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.3C6.2 13.5 5 11.4 5 9a7 7 0 017-7z"/><line x1="9" y1="22" x2="15" y2="22"/>',
    "code": '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    "gear": '<circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    "doc": '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    "book": '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    "server": '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    "users": '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
}
ICONS = {k: f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{v}</svg>' for k, v in ICON_PATHS.items()}

GOLD, BLUE, CREAM = "#FFBD38", "#4aa8d8", "rgba(255,230,203,.62)"
FLOW_NODES = [  # (label, sub, y, tone, services[(name, tone)])
    ("NODE 1", "Edge / Routing", 120, "g", [("Nginx Proxy Manager", "g"), ("Pi-hole", "g"), ("Vaultwarden", "g"), ("Beszel", "b"), ("Paperless-ngx", "b"), ("PBS Backup", "b")]),
    ("NODE 2", "AI / Compute", 300, "b", [("LLM VM · llama-swap", "b"), ("LibreChat", "b"), ("Hermes Agent", "b"), ("Ollama [P2000]", "b"), ("Firecrawl + SearXNG", "b")]),
    ("NODE 3", "Apps / Services", 470, "b", [("n8n", "b"), ("BookStack", "b"), ("wger", "b"), ("WordPress", "b"), ("Anubis", "g"), ("RustDesk", "b")]),
]


def flow_svg(t):
    """Animated network diagram (SMIL). Paused automatically for reduced motion."""
    col = {"g": GOLD, "b": BLUE}
    rgba = {"g": "255,189,56", "b": "74,168,216"}
    o = [f'<svg class="flow" viewBox="20 30 880 550" role="img" aria-labelledby="flowT flowD" xmlns="http://www.w3.org/2000/svg" style="font-family:\'Departure Mono\',monospace">',
         f'<title id="flowT">{t["flow_label"]}</title><desc id="flowD">{t["flow_desc"]}</desc>']
    trunk = ["M110,290 C160,290 190,290 220,290", "M300,290 C340,290 360,290 380,290"]
    for d in trunk:
        o.append(f'<path d="{d}" stroke="rgba(255,189,56,.35)" stroke-width="1.5" fill="none"/>')
    branches = []
    for label, sub, y, tone, svcs in FLOW_NODES:
        d = f"M380,290 C420,290 430,{y} 510,{y}"
        branches.append(d)
        o.append(f'<path d="{d}" stroke="rgba({rgba[tone]},.3)" stroke-width="1" fill="none"/>')
        n = len(svcs)
        for i, (name, st) in enumerate(svcs):
            sy = y - (n - 1) * 13 + i * 26
            o.append(f'<path d="M590,{y} C620,{y} 645,{sy} 680,{sy}" stroke="rgba({rgba[st]},.2)" stroke-width=".7" fill="none"/>')
            o.append(f'<circle cx="688" cy="{sy}" r="3" fill="{col[st]}" opacity=".75"/><text x="700" y="{sy + 3.5}" fill="{col[st]}" font-size="13">{name}</text>')
    # animated packets
    for i, (d, dur, beg) in enumerate([(trunk[0], 2.5, 0), (trunk[1], 2, .6)] + [(b, 2.4, 1 + i * .4) for i, b in enumerate(branches)]):
        r = 2.6 if i < 2 else 2
        o.append(f'<circle fill="{GOLD}" r="{r}" opacity="0"><animateMotion dur="{dur}s" begin="{beg}s" repeatCount="indefinite" path="{d}"/>'
                 f'<animate attributeName="opacity" values="0;.9;.9;0" dur="{dur}s" begin="{beg}s" repeatCount="indefinite"/></circle>')
    # WAN + firewall
    o.append(f'<rect x="40" y="272" width="70" height="36" rx="18" fill="rgba(255,189,56,.07)" stroke="rgba(255,189,56,.45)"/>'
             f'<text x="75" y="294" text-anchor="middle" fill="{GOLD}" font-family="Unbounded,sans-serif" font-weight="600" font-size="11" letter-spacing="1">WAN</text>')
    o.append(f'<rect x="220" y="266" width="80" height="48" rx="4" fill="rgba(255,189,56,.06)" stroke="rgba(255,189,56,.5)"/>'
             f'<path transform="translate(252 272) scale(.66)" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="{GOLD}" stroke-width="1.5"/>'
             f'<text x="260" y="308" text-anchor="middle" fill="{CREAM}" font-size="11">OPNsense</text>')
    for label, sub, y, tone, _ in FLOW_NODES:
        o.append(f'<rect x="510" y="{y - 22}" width="80" height="44" rx="4" fill="rgba({rgba[tone]},.06)" stroke="rgba({rgba[tone]},.5)"/>'
                 f'<circle cx="521" cy="{y - 12}" r="3" fill="{col[tone]}"/>'
                 f'<text x="552" y="{y - 1}" text-anchor="middle" fill="{col[tone]}" font-family="Unbounded,sans-serif" font-weight="600" font-size="12" letter-spacing=".5">{label}</text>'
                 f'<text x="550" y="{y + 13}" text-anchor="middle" fill="{CREAM}" font-size="9.5">{sub}</text>')
    o.append(f'<circle cx="40" cy="560" r="3.5" fill="{GOLD}"/><text x="50" y="564" fill="{CREAM}" font-size="12">{t["legend_net"]}</text>'
             f'<circle cx="260" cy="560" r="3.5" fill="{BLUE}"/><text x="270" y="564" fill="{CREAM}" font-size="12">{t["legend_svc"]}</text>')
    o.append("</svg>")
    return "".join(o)


def logo_svg(slug):
    if slug == "windows":
        return WINDOWS_SVG
    raw = (SRC / "icons" / f"{slug}.svg").read_text(encoding="utf-8")
    raw = re.sub(r"<title>.*?</title>", "", raw)
    return raw.replace('<svg role="img"', '<svg aria-hidden="true" focusable="false"', 1)


def url_for(lang):
    return f"{SITE}/{PAGE[lang]}"


def alternates():
    alts = [{"hreflang": l, "href": url_for(l)} for l in LANGS]
    alts.append({"hreflang": "x-default", "href": url_for("en")})
    return alts


def person_jsonld(t):
    data = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Tristan Kayser",
        "url": f"{SITE}/",
        "image": f"{SITE}/assets/img/portrait-800.webp",
        "jobTitle": t["hero"]["sub"],
        "description": t["meta"]["description"],
        "worksFor": {"@type": "Organization", "name": "IT-Works GmbH",
                     "address": {"@type": "PostalAddress", "addressLocality": "Uhingen", "addressCountry": "DE"}},
        "address": {"@type": "PostalAddress", "addressLocality": "Eislingen/Fils", "addressRegion": "Baden-Württemberg", "addressCountry": "DE"},
        "alumniOf": [{"@type": "CollegeOrUniversity", "name": "Technische Hochschule Ulm"},
                     {"@type": "School", "name": "Deutsche Höhere Privatschule Windhoek"}],
        "knowsLanguage": ["de", "en", "af"],
        "knowsAbout": ["Proxmox VE", "OPNsense", "Windows Server", "Active Directory", "Linux", "Ansible", "Networking", "Virtualisation", "Python"],
        "sameAs": ["https://github.com/Intersepter"],
    }
    return json.dumps(data, ensure_ascii=False)


def main():
    env = Environment(loader=FileSystemLoader(SRC / "templates"), autoescape=True,
                      trim_blocks=True, lstrip_blocks=True)
    content = {l: json.loads((SRC / "content" / f"{l}.json").read_text(encoding="utf-8")) for l in LANGS}
    common = dict(site=SITE, year=TODAY.year, version=VERSION, base="", noindex=False, jsonld=None,
                  og_type="website", canonical=None, alternates=[])

    for lang in LANGS:
        t = content[lang]

        def lang_switch(_lang=lang):
            cur = ' aria-current="page"'
            links = "".join(
                '<a href="%s" hreflang="%s" lang="%s"%s>%s</a>' % (PAGE[l] or "./", l, l, cur if l == _lang else "", l.upper())
                for l in LANGS)
            return Markup(f'<nav class="lang-switch" aria-label="{content[_lang]["ui"]["lang_label"]}">{links}</nav>')

        html = env.get_template("index.html.j2").render(
            **{**common, **dict(canonical=url_for(lang), alternates=alternates(), jsonld=person_jsonld(t))}, t=t, lang=lang, locale=t["locale"],
            og_locale_alt=[content[l]["locale"] for l in LANGS if l != lang],
            title=t["meta"]["title"], description=t["meta"]["description"], og_alt=t["meta"]["og_alt"],
            flow_svg=Markup(flow_svg(t["homelab"])), lang_switch=lang_switch, phone=PHONE,
            logos=[{"name": nm, "svg": Markup(logo_svg(sl))} for sl, nm in LOGOS],
            github_svg=Markup(logo_svg("github").replace('<svg ', '<svg class="gh" ', 1)))
        out = "index.html" if lang == "en" else PAGE[lang]
        (ROOT / out).write_text(html, encoding="utf-8")
        print("✓", out)

    de = content["de"]
    pages = {
        "impressum.html": dict(title="Impressum & Datenschutz — Tristan Kayser",
                               description="Impressum und Datenschutzerklärung von tristankayser.com",
                               canonical=f"{SITE}/impressum.html", phone=PHONE,
                               stand=f"{['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][TODAY.month-1]} {TODAY.year}"),
        "lebenslauf.html": dict(title="Lebenslauf — Tristan Kayser",
                                description="Lebenslauf von Tristan Kayser, Auszubildender Fachinformatiker für Systemintegration (PDF).",
                                canonical=f"{SITE}/lebenslauf.html"),
        "404.html": dict(title="404 — Signal lost · Tristan Kayser", description="Page not found.",
                         noindex=True, base="/"),
    }
    for name, extra in pages.items():
        ctx = {**common, "t": content["en"] if name == "404.html" else de, "lang": "de" if name != "404.html" else "en", "locale": "de_DE",
               "og_locale_alt": [], "og_alt": de["meta"]["og_alt"], **extra}
        (ROOT / name).write_text(env.get_template(name + ".j2").render(**ctx), encoding="utf-8")
        print("✓", name)

    # sitemap with hreflang alternates
    alt_xml = "".join(f'\n    <xhtml:link rel="alternate" hreflang="{a["hreflang"]}" href="{a["href"]}"/>' for a in alternates())
    urls = "".join(f"\n  <url>\n    <loc>{url_for(l)}</loc>\n    <lastmod>{TODAY.isoformat()}</lastmod>{alt_xml}\n  </url>" for l in LANGS)
    urls += "".join(f"\n  <url>\n    <loc>{SITE}/{p}</loc>\n    <lastmod>{TODAY.isoformat()}</lastmod>\n  </url>" for p in ["lebenslauf.html", "impressum.html"])
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        f'xmlns:xhtml="http://www.w3.org/1999/xhtml">{urls}\n</urlset>\n', encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    print("✓ sitemap.xml, robots.txt")


if __name__ == "__main__":
    main()
