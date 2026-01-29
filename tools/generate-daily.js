#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUEUE = path.join(ROOT, 'content', 'queue.json');
const TEMPLATE = path.join(ROOT, 'templates', 'site-index.html');
const SITES_DIR = path.join(ROOT, 'sites');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function saveJson(p, v) {
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
}

function render(tpl, vars) {
  return tpl
    .replaceAll('{{TITLE}}', vars.title)
    .replaceAll('{{DESCRIPTION}}', vars.description)
    .replaceAll('{{SLUG}}', vars.slug)
    .replaceAll('{{CATEGORY}}', vars.category)
    .replaceAll('{{CTA}}', vars.cta)
    .replaceAll('{{DATE}}', vars.date)
    .replaceAll('{{YEAR}}', String(vars.year));
}

function main() {
  const queue = loadJson(QUEUE);
  if (!Array.isArray(queue) || queue.length === 0) {
    console.error('Queue is empty:', QUEUE);
    process.exit(1);
  }
  const item = queue.shift();
  const slug = item.slug;

  const outDir = path.join(SITES_DIR, slug);
  if (fs.existsSync(outDir)) {
    console.error(`Site already exists: sites/${slug}`);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  const now = new Date();
  const vars = {
    title: item.title,
    description: item.description,
    slug,
    category: item.category || 'workflows',
    cta: item.cta || 'Get started',
    date: now.toISOString().slice(0,10),
    year: now.getUTCFullYear(),
  };

  fs.writeFileSync(path.join(outDir, 'index.html'), render(tpl, vars));

  // Minimal policy pages for trust signals
  fs.writeFileSync(path.join(outDir, 'privacy.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Privacy — ${item.title}</title><link rel="canonical" href="https://everydayaiworkflows.com/${slug}/privacy.html"><h1>Privacy</h1><p>This site does not collect personal data beyond standard web logs. Ads may use cookies.</p><p><a href="/utility-network-landing/index.html">Back</a></p>`);
  fs.writeFileSync(path.join(outDir, 'terms.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Terms — ${item.title}</title><link rel="canonical" href="https://everydayaiworkflows.com/${slug}/terms.html"><h1>Terms</h1><p>Provided as-is for informational purposes. You are responsible for how you use workflows and outputs.</p><p><a href="/utility-network-landing/index.html">Back</a></p>`);

  // write updated queue
  saveJson(QUEUE, queue);

  // update network.json
  const { execSync } = require('child_process');
  execSync('node tools/generate-network.js', { cwd: ROOT, stdio: 'inherit' });

  console.log(`Generated sites/${slug}/ (and updated queue + network.json)`);
}

main();
