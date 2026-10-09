# tristankayser.com

Personal portfolio of Tristan Kayser — Fachinformatiker für Systemintegration (apprentice). Static site on GitHub Pages, EN / DE / AF.

## Edit & build

```bash
pip install jinja2 pillow
python3 src/build.py          # renders index.html, index-de.html, index-af.html, impressum.html, lebenslauf.html, 404.html, sitemap.xml, robots.txt
python3 src/build_assets.py   # only when photos change: WebP versions, dithered backgrounds, OG image
```

- **Text:** `src/content/en.json`, `de.json`, `af.json` (same keys in all three)
- **Layout:** `src/templates/*.j2`
- **Styles / effects:** `assets/css/main.css`, `assets/js/main.js`
- Generated HTML files are committed, because GitHub Pages serves the repo root as-is. Don't edit them by hand.

## Privacy

Everything is self-hosted: fonts (`assets/fonts`), GSAP, ScrollTrigger and Lenis (`assets/js/vendor`) and images. No Google Fonts, no CDNs, no cookies, no tracking. Before every deploy, run:

```bash
grep -rlE "googleapis|gstatic|cdnfonts|jsdelivr|cdnjs|unpkg|unsplash" --include=*.html --include=*.css --include=*.js . | grep -v vendor
```

## Credits

Space Mono, Syne (SIL OFL) · Departure Mono (SIL OFL) · GSAP 3.13 (free licence) · Lenis (MIT)
