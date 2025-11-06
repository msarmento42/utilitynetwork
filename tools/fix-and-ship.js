/**
 * Utility Network — Fix & Ship (GitHub + Netlify, monorepo-aware)
 *
 * Requires env:
 *   GITHUB_TOKEN   -> GitHub PAT (repo scope) for msarmento42/utilitynetwork
 *   NETLIFY_TOKEN  -> Netlify PAT (sites:write, deploys:write)
 *
 * What it does:
 *  - Adds/updates root files (workflows, docs, audit script, shared assets).
 *  - For each /sites/<site>:
 *      - Ensures 5 boilerplates exist (robots.txt, ads.txt, privacy.html, terms.html, sitemap.xml).
 *      - Copies network-bar.js + network.json to ./assets/ inside that site.
 *      - Injects GA4 + AdSense + LOCAL network-bar into every .html (one-time, safe).
 *      - Ensures index.html exists (creates a minimal one if missing).
 *  - Creates a Netlify site for each folder and deploys via "files map" API.
 *  - Prints all live *.netlify.app URLs.
 *
 * Notes:
 *  - Uses local asset paths so each site is self-contained.
 *  - You can add custom domains later; sitemaps can be updated then.
 */

const OWNER = "msarmento42";
const REPO  = "utilitynetwork";
const BRANCH = "main";

const GA_ID = "G-083MSQKPFX";
const ADS_PUB = "ca-pub-6175161566333696";

const GH_TOKEN = process.env.GITHUB_TOKEN?.trim();
const NL_TOKEN = process.env.NETLIFY_TOKEN?.trim();

if (!GH_TOKEN || !NL_TOKEN) {
  console.error("Missing GITHUB_TOKEN and/or NETLIFY_TOKEN env vars.");
  process.exit(1);
}

const GH_API = "https://api.github.com";
const NL_API = "https://api.netlify.com/api/v1";

const HEAD_SNIPPET_LOCAL = `<!-- GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
</script>

<!-- AdSense Auto ads -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_PUB}" crossorigin="anonymous"></script>

<!-- Network bar (local copy) -->
<script src="./assets/network-bar.js" defer></script>

<meta name="description" content="Short, unique description for this page.">
<meta name="viewport" content="width=device-width, initial-scale=1">`;

const BOILERPLATES = {
  "robots.txt": `User-agent: *
Allow: /
Sitemap: /sitemap.xml
`,
  "ads.txt": `google.com, pub-6175161566333696, DIRECT, f08c47fec0942fa0
`,
  "privacy.html": `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy</title>
<meta name="description" content="Privacy policy for this site.">
</head><body>
<h1>Privacy Policy</h1>
<p>This site uses Google AdSense Auto ads and Google Analytics 4 for usage insights. Ads and analytics may set cookies and collect usage data in accordance with their policies.</p>
<p>Contact: contact@domain</p>
<p>Last updated: ${new Date().toISOString().slice(0,10)}</p>
</body></html>
`,
  "terms.html": `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Terms</title>
<meta name="description" content="Terms of use for this site.">
</head><body>
<h1>Terms of Use</h1>
<p>All calculators and estimates are provided “as is” for informational purposes only and are not professional advice.</p>
<p>Contact: contact@domain</p>
</body></html>
`,
  "sitemap.xml": `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.netlify.app/</loc></url>
</urlset>
`
};

// Root-level bootstrap files (CI, docs, shared)
const ROOT_FILES = {
  ".github/workflows/ci.yml": `name: CI (lint + audit)
on:
  pull_request:
  push:
    branches: [ ${BRANCH} ]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install linters
        run: npm i -g htmlhint
      - name: Generate audit report
        run: |
          node scripts/audit.js || echo "audit script not present in repo; add scripts/audit.js to enable checks"
      - name: Enforce GA4 & AdSense present (soft until audit.js exists)
        run: |
          if [ -f reports-audit.json ]; then
            node -e "const r=require('./reports-audit.json'); const bad=r.filter(x=>!x.gaFound||!x.adsFound||x.missingFiles.length); if(bad.length){console.error('Critical audit failures:', bad); process.exit(1);}"; \
            echo 'Audit OK'
          else
            echo 'reports-audit.json not found; skipping hard enforcement for now';
          fi
      - name: HTML lint (soft fail)
        run: npx htmlhint 'sites/**/*.html' || true
`,
  ".github/workflows/site-health.yml": `name: Site Health (weekly Lighthouse)
on:
  schedule:
    - cron: '0 9 * * 1'
  workflow_dispatch:
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - name: Run Lighthouse (requires LH_URLS secret)
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: \${{ secrets.LH_URLS || 'https://example.com' }}
          uploadArtifacts: true
          temporaryPublicStorage: true
`,
  ".github/pull_request_template.md": `## Summary
- Site(s) touched:
- What changed:
- Why (metric/insight):

## Checks
- [ ] GA4 \`${GA_ID}\` present
- [ ] AdSense auto ads snippet present
- [ ] robots/sitemap/ads.txt updated
- [ ] JSON-LD validated (FAQ/HowTo/SoftwareApplication)
- [ ] CWV safe (no layout shift from ads)
`,
  ".github/ISSUE_TEMPLATE/site-implementation.md": `---
name: Site implementation task
about: Add or improve a micro-site
labels: site, growth
---

## Site
- [ ] Party Planner
- [ ] Cooking Core
- [ ] Home Projects
- [ ] Travel Cost
- [ ] Work & Money
- [ ] Templates/PDF
- [ ] Holiday Minis
- [ ] Sports Helpers
- [ ] Home Energy
- [ ] Dog-Friendly

## What to add/change
- Page template(s):
- Inputs & validation:
- JSON-LD type(s):
- Internal links:
- Notes from keyword cluster:

## Done when
- [ ] Deployed preview ✅
- [ ] Audit passes (GA/Ads/robots/sitemap/ads.txt)
- [ ] 1–2 Lighthouse runs ≥ 85 perf/SEO
`,
  "docs/PROJECT_BRIEF.md": `# Utility Network — Project Brief
Goal: hands-off AdSense income (Auto ads) ≤ 1 hr/month.
GA4: ${GA_ID} · AdSense: ${ADS_PUB}
Monorepo: 10 micro-sites + umbrella. Cross-site nav via /assets/network.json (per site when deployed).
`,
  "docs/ROADMAP.md": `# Roadmap
- Add CI + audit
- Ensure GA/Ads + boilerplates per site
- JSON-LD across calculators (FAQ/HowTo/SoftwareApplication)
- Wire local network bar in each site
- Deploy all to Netlify (one per folder)
- After domains: update ads.txt/sitemaps + Search Console
`,
  "scripts/audit.js": `// CI audit — checks /sites/* for GA/Ads + key files.
const fs = require('fs'), path = require('path');
const GA = "${GA_ID}", ADS = "${ADS_PUB}";
const ROOT = process.cwd(), SITES = path.join(ROOT,'sites');
const KEY = ["robots.txt","sitemap.xml","ads.txt","privacy.html","terms.html"];
function findHtml(dir){if(!fs.existsSync(dir))return[];const out=[];for(const de of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,de.name);if(de.isDirectory())out.push(...findHtml(p));else if(de.isFile()&&/\\.html$/i.test(de.name))out.push(p);}return out;}
function check(site){const base=path.join(SITES,site), html=findHtml(base);const s={site,html:html.length,ga:false,ads:false,missing:[],meta:[]};
for(const k of KEY) if(!fs.existsSync(path.join(base,k))) s.missing.push(k);
for(const f of html){const h=fs.readFileSync(f,'utf8');if(h.includes(GA))s.ga=true;if(h.includes(ADS)||h.includes("adsbygoogle.js?client="))s.ads=true;
if(!/meta\\s+name=[\"']description[\"']/i.test(h))s.meta.push({f,issue:"no meta description"});
if(!/meta\\s+name=[\"']viewport[\"']/i.test(h))s.meta.push({f,issue:"no viewport"});
if(!/<h1\\b/i.test(h))s.meta.push({f,issue:"no H1"});}
return s;}
(function(){if(!fs.existsSync(SITES)){fs.writeFileSync('reports-audit.json','[]');return;}
const sites=fs.readdirSync(SITES,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
const rep=sites.map(check);fs.writeFileSync('reports-audit.json',JSON.stringify(rep,null,2));console.log('Audit ok');})();
`,
  // root-level placeholders (informational)
  "shared/assets/network.json": `[]`,
  "shared/components/network-bar.js": `// Fallback network bar (unused after local copy).
// Real runtime will use ./assets/network-bar.js inside each site.
`,
  "CODEOWNERS": `* @${OWNER}\n`
};

// -------------------- Helpers --------------------
async function gh(path, init={}) {
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${GH_TOKEN}`,
      "Accept": "application/vnd.github+json",
      ...(init.headers||{})
    }
  });
  if (!res.ok) throw new Error(`GitHub ${path} -> ${res.status} ${await res.text()}`);
  return res;
}
async function ghGetContent(p) {
  const r = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(p)}?ref=${BRANCH}`);
  return r.json();
}
function b64(s){ return Buffer.from(s).toString("base64"); }
async function ghGetIfExists(p){ try{ return await ghGetContent(p);}catch(e){ if(String(e).includes("404")) return null; throw e; } }
async function ghPutFile(p, content, message, sha=null){
  const body = { message, content: b64(content), branch: BRANCH };
  if (sha) body.sha = sha;
  const r = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(p)}`, { method:"PUT", body: JSON.stringify(body) });
  return r.json();
}
async function ghList(dir){
  const r = await ghGetContent(dir);
  return Array.isArray(r) ? r : [];
}
async function ghRaw(url){
  const r = await fetch(url); if(!r.ok) throw new Error(`raw ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

// HTML injection
function injectHead(htmlBuf){
  const html = htmlBuf.toString("utf8");
  if (html.includes(GA_ID) && html.includes(ADS_PUB)) return htmlBuf;
  const i = html.toLowerCase().lastIndexOf("</head>");
  if (i === -1) return htmlBuf;
  const out = html.slice(0,i) + "\n" + HEAD_SNIPPET_LOCAL + "\n" + html.slice(i);
  return Buffer.from(out, "utf8");
}

// -------------------- Netlify --------------------
async function nl(path, init={}){
  const res = await fetch(`${NL_API}${path}`, {
    ...init,
    headers: { "Authorization": `Bearer ${NL_TOKEN}`, "Content-Type":"application/json", ...(init.headers||{}) }
  });
  if (!res.ok) throw new Error(`Netlify ${path} -> ${res.status} ${await res.text()}`);
  return res;
}
async function nlCreateSite(name){ // direct deploy site (no repo linking)
  const body = { name, force_ssl:true };
  const r = await nl(`/sites`, { method:"POST", body: JSON.stringify(body) });
  return r.json(); // { site_id, name, ssl_url, url }
}
const crypto = await import("node:crypto");
function sha1(buf){ return crypto.createHash("sha1").update(buf).digest("hex"); }
async function nlDeployFiles(site_id, files){ // files: [{path,buf}]
  const map = {}; for (const f of files) map[f.path] = sha1(f.buf);
  const draftRes = await nl(`/sites/${site_id}/deploys`, { method:"POST", body: JSON.stringify({ files: map, draft:false }) });
  const draft = await draftRes.json();
  const id = draft.id, required = (draft.required || []).map(x => x.path || x);
  for (const p of required){
    const f = files.find(x => x.path === p); if(!f) continue;
    const up = await fetch(`${NL_API}/deploys/${id}/files${encodeURI(p)}`, {
      method:"PUT",
      headers: { "Authorization": `Bearer ${NL_TOKEN}`, "Content-Type":"application/octet-stream" },
      body: f.buf
    });
    if (!up.ok) throw new Error(`Upload ${p} failed ${up.status} ${await up.text()}`);
  }
  // poll
  for(let i=0;i<40;i++){
    const s = await (await nl(`/deploys/${id}`)).json();
    if (s.state === "ready") return s;
    await new Promise(r=>setTimeout(r,1500));
  }
  throw new Error("Deploy not ready");
}

// -------------------- Main ops --------------------
async function ensureRootFiles(){
  for (const [p,c] of Object.entries(ROOT_FILES)){
    const ex = await ghGetIfExists(p);
    await ghPutFile(p, c, ex ? `chore: update ${p}` : `chore: add ${p}`, ex?.sha);
  }
}
async function listSites(){
  const items = await ghList("sites");
  return items.filter(x => x.type === "dir").map(x => x.name);
}
async function listFilesUnder(site, dir=`sites/${site}`, acc=[]){
  const entries = await ghList(dir);
  for (const e of entries){
    if (e.type === "dir") await listFilesUnder(site, e.path, acc);
    else if (e.type === "file") acc.push(e);
  }
  return acc;
}
async function put(p, content, msg){
  const ex = await ghGetIfExists(p);
  await ghPutFile(p, content, ex ? `chore: ${msg}` : `chore: ${msg}`, ex?.sha);
}
async function ensureBoilerplates(site){
  const base = `sites/${site}`;
  for (const [fn,content] of Object.entries(BOILERPLATES)){
    await put(`${base}/${fn}`, content, `${site}: ${fn}`);
  }
}
async function ensureLocalAssets(site){
  const base = `sites/${site}/assets`;
  const networkBar = `(() => {
  async function load(){ try{ const r = await fetch('./network.json', {cache:'no-store'}); if(r.ok) return r.json(); }catch{} return []; }
  function render(items){
    if(!items.length) return;
    const bar = document.createElement('nav');
    bar.setAttribute('aria-label','Utility Network');
    bar.style.cssText = 'display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;padding:.5rem 1rem;background:#f6f6f7;border-bottom:1px solid #e5e7eb;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto';
    const label = document.createElement('span'); label.textContent='Utility Network:'; label.style.cssText='opacity:.7;margin-right:.25rem'; bar.appendChild(label);
    items.forEach(i=>{ const a=document.createElement('a'); a.href=i.href; a.textContent=i.label;
      a.style.cssText='text-decoration:none;padding:.25rem .5rem;border-radius:.375rem;border:1px solid #e5e7eb';
      a.onmouseenter=()=>a.style.background='#fff'; a.onmouseleave=()=>a.style.background=''; bar.appendChild(a); });
    document.body.prepend(bar);
  }
  load().then(render);
})();\n`;
  await put(`${base}/network-bar.js`, networkBar, `${site}: assets/network-bar.js`);
  await put(`${base}/network.json`, JSON.stringify([], null, 2) + "\n", `${site}: assets/network.json`);
}
async function ensureIndex(site){
  const base = `sites/${site}`;
  let hasIndex = false;
  const files = await ghList(base);
  for (const e of files) if (e.type === "file" && e.name.toLowerCase() === "index.html") hasIndex = true;
  if (!hasIndex){
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${site}</title></head><body>
<h1>${site}</h1><p>Welcome! This site is part of the Utility Network.</p>
</body></html>`;
    await put(`${base}/index.html`, html, `${site}: add index.html`);
  }
}
async function injectHeadInAllHtml(site){
  const files = await listFilesUnder(site);
  for (const f of files){
    if (!/\.html$/i.test(f.name)) continue;
    const raw = await ghRaw(f.download_url);
    const upd = injectHead(raw);
    if (Buffer.compare(raw, upd) !== 0){
      const meta = await ghGetContent(f.path);
      await ghPutFile(f.path, upd.toString("utf8"), `feat(${site}): inject GA4/AdSense/local network`, meta.sha);
    }
  }
}
async function collectFilesForDeploy(site){
  const files = await listFilesUnder(site);
  const out = [];
  const prefix = `sites/${site}/`;
  for (const f of files){
    const webPath = "/" + f.path.slice(prefix.length);
    const buf = await ghRaw(f.download_url);
    out.push({ path: webPath, buf });
  }
  return out;
}

// MAIN
(async function(){
  console.log("Ensure root files...");
  await ensureRootFiles();

  console.log("Enumerate sites...");
  const sites = await listSites();
  if (!sites.length) throw new Error("No /sites/* found.");
  console.log("Sites:", sites);

  const liveMap = {}; // Label -> URL
  for (const s of sites){
    console.log(`\n=== Prepare ${s} ===`);
    await ensureBoilerplates(s);
    await ensureLocalAssets(s);
    await ensureIndex(s);
    await injectHeadInAllHtml(s);

    console.log(`Create/deploy Netlify site for ${s}...`);
    const nice = `utility-${s.replace(/[^a-z0-9-]/gi,'-').toLowerCase()}`.slice(0,50);
    const created = await nlCreateSite(nice);
    const files = await collectFilesForDeploy(s);
    await nlDeployFiles(created.site_id, files);
    const url = created.ssl_url || created.url;
    const label = s.replace(/[-_]/g,' ').replace(/\b\w/g, m => m.toUpperCase());
    liveMap[label] = url;
    console.log(`${s} -> ${url}`);
  }

  console.log("\nAll live URLs:");
  console.log(liveMap);

  console.log("\nDone.");
})().catch(e => { console.error(e); process.exit(1); });
