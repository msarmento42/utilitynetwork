# Utility Network — Monorepo
Monorepo containing **11 static micro-sites** + umbrella landing. Designed for **AdSense Auto ads** and **GA4**, deployable to **Vercel** or **Netlify** as a multi-project monorepo.

## Quick Start
1. Push this repo to GitHub.
2. In Vercel, create one Project per folder in `sites/` (Root Directory = `sites/<folder>`, no build).
3. Edit `config/sites.json` with real domains, then push a commit. The **Sync Network** action will run automatically.

## Scripts
- `python tools/sync_network.py` — writes each site's `/assets/network.json` and patches sitemap/robots with domain.
- `python tools/replace_ids.py --ga4 G-XXXX --adsense ca-pub-XXXX` — swap IDs across all HTML.
- `python tools/replace_contact.py --domain example.com` — set `contact@` email everywhere (or `--map` for per-site).

## CI
- **Sync Network** on push to `main` auto-updates network + sitemaps and auto-commits.
- **HTML Sanity** ensures every site has an `index.html`.
