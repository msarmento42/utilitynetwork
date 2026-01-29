#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITES_DIR = path.join(ROOT, 'sites');
const LANDING_ASSETS = path.join(SITES_DIR, 'utility-network-landing', 'assets');
const OUT = path.join(LANDING_ASSETS, 'network.json');

function listSiteDirs() {
  return fs.readdirSync(SITES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => name !== 'utility-network-landing');
}

function titleFromHtml(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function readTitleForSite(slug) {
  const p = path.join(SITES_DIR, slug, 'index.html');
  if (!fs.existsSync(p)) return null;
  const html = fs.readFileSync(p, 'utf8');
  return titleFromHtml(html);
}

function main() {
  if (!fs.existsSync(LANDING_ASSETS)) fs.mkdirSync(LANDING_ASSETS, { recursive: true });

  const items = listSiteDirs().map(slug => {
    const title = readTitleForSite(slug) || slug;
    // default: host as sub-path on everydayaiworkflows.com
    const url = `/${slug}/index.html`;
    return { slug, name: title.replace(/\s+—.*$/, ''), url };
  });

  fs.writeFileSync(OUT, JSON.stringify(items, null, 2) + '\n');
  console.log(`Wrote ${items.length} entries to ${path.relative(ROOT, OUT)}`);
}

main();
