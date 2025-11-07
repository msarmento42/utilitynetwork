// scripts/deploy-network.js — fixed: de-duped umbAbs, correct site.id, real deploys, sitemap rewrite,
// umbrella network.json {name,url}, create /shared/components/network-bar.js, and autolink umbrella cards.
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const GA_ID        = process.env.GA_ID || 'G-083MSQKPFX';
const ADS_PUB      = process.env.ADS_PUB || 'ca-pub-6175161566333696';
const UMBRELLA_DIR = process.env.UMBRELLA_DIR || 'sites/utility-network-landing';
const NL_TOKEN     = process.env.NETLIFY_TOKEN || '';
const REUSE_UMBRELLA = (process.env.REUSE_UMBRELLA || '').trim();
const ACCOUNT_SLUG = (process.env.NETLIFY_ACCOUNT_SLUG || '').trim(); // optional: scope to team slug

const POLL_INTERVAL_MS = parseInt(process.env.DEPLOY_POLL_INTERVAL_MS || '3000', 10);
const MAX_WAIT_MS      = parseInt(process.env.DEPLOY_MAX_WAIT_MS      || '600000',10);

if (!NL_TOKEN) { console.error('Missing NETLIFY_TOKEN secret'); process.exit(1); }

const root = process.cwd();
const sitesRoot = path.join(root, 'sites');
const umbAbs = path.join(process.cwd(), UMBRELLA_DIR); // << declare ONCE

function exists(p){ return fs.existsSync(p); }
function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }
function writeFile(p,c){ ensureDir(path.dirname(p)); fs.writeFileSync(p,c); }
function walk(dir, filter){
  const out=[];
  (function go(d){
    for (const de of fs.readdirSync(d,{withFileTypes:true})){
      const p = path.join(d,de.name);
      if (de.isDirectory()) go(p);
      else if (de.isFile() && (!filter || filter(p))) out.push(p);
    }
  })(dir);
  return out;
}
function injectHead(html){
  const hasGA  = html.includes(GA_ID);
  const hasAds = html.includes(ADS_PUB);
  const hasNB1 = html.includes('assets/network-bar.js');
  const hasNB2 = html.includes('shared/components/network-bar.js');
  if (hasGA && hasAds && (hasNB1 || hasNB2)) return html;
  const snippet =
    '<!-- GA4 -->\n' +
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>\n` +
    "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config','" + GA_ID + "');</script>\n\n" +
    "<!-- AdSense Auto ads -->\n" +
    `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_PUB}" crossorigin="anonymous"></script>\n\n` +
    "<!-- Network bar (local) -->\n" +
    `<script src="/shared/components/network-bar.js" defer></script>\n\n` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n';
  const i = html.toLowerCase().lastIndexOf('</head>');
  return i === -1 ? html : (html.slice(0,i) + '\n' + snippet + '\n' + html.slice(i));
}

// Netlify API helpers
function sha1(buf){ return crypto.createHash('sha1').update(buf).digest('hex'); }
function nl(method, urlPath, body){
  const payload = body ? Buffer.from(JSON.stringify(body)) : null;
  return new Promise((resolve, reject) => {
    const req = https.request({
      method,
      hostname: 'api.netlify.com',
      path: `/api/v1${urlPath}`,
      headers: { 'Authorization': `Bearer ${NL_TOKEN}`, 'Content-Type': 'application/json' }
    }, res => {
      let d=[]; res.on('data', c=>d.push(c));
      res.on('end', () => {
        const text = Buffer.concat(d).toString('utf8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(text)); } catch { resolve({ok:true, raw:text}); }
        } else reject(new Error(`Netlify ${method} ${urlPath} -> ${res.statusCode}: ${text}`));
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
async function nlListSites(){ return nl('GET','/sites'); }
async function nlFindByName(name){ const all = await nlListSites(); return all.find(s => s.name === name); }
async function nlCreateSiteNamed(name){
  if (ACCOUNT_SLUG) return nl('POST', `/accounts/${ACCOUNT_SLUG}/sites`, { name, force_ssl:true });
  return nl('POST','/sites',{ name, force_ssl:true });
}
async function nlCreateSiteRandom(){
  if (ACCOUNT_SLUG) return nl('POST', `/accounts/${ACCOUNT_SLUG}/sites`, { force_ssl:true });
  return nl('POST','/sites',{ force_ssl:true });
}
async function nlCreateSiteSafe(preferred) {
  const safe = preferred.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,50);
  try { return await nlCreateSiteNamed(safe); }
  catch (e1) {
    if (!/422/.test(String(e1)) && !/subdomain/.test(String(e1))) throw e1;
    const suffix = (Date.now().toString(36)+Math.random().toString(36).slice(2,8)).slice(-6);
    const alt = (safe + '-' + suffix).slice(0,50);
    try { return await nlCreateSiteNamed(alt); }
    catch (e2) {
      if (!/422/.test(String(e2)) && !/subdomain/.test(String(e2))) throw e2;
      return await nlCreateSiteRandom();
    }
  }
}
async function waitForReady(deployId){
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const last = await nl('GET', `/deploys/${deployId}`);
    const st = (last && last.state) || 'unknown';
    if (['ready','current','published'].includes(st)) return last;
    console.log(`  • waiting on deploy ${deployId}: state=${st}`);
    await new Promise(r=>setTimeout(r, POLL_INTERVAL_MS));
  }
  console.warn(`⚠️ Timed out waiting for deploy ${deployId}. Continuing.`);
  try { return await nl('GET', `/deploys/${deployId}`); } catch { return { state:'timeout' }; }
}
async function nlDeploy(tag, siteId, files){
  const sid = siteId || '(missing id)';
  console.log(`→ Deploying ${tag} (siteId=${sid}) with ${files.length} files`);
  const map = {}; for (const f of files) map[f.path] = sha1(f.buf);
  const draft = await nl('POST', `/sites/${sid}/deploys`, { files: map, draft:false });
  const deployId = draft.id;
  const required = (draft.required||[]).map(x => x.path || x);
  for (const p of required){
    const f = files.find(x => x.path === p); if (!f) continue;
    await new Promise((resolve,reject)=>{
      const req = https.request({
        method:'PUT', hostname:'api.netlify.com',
        path:`/api/v1/deploys/${deployId}/files${encodeURI(p)}`,
        headers:{ 'Authorization':`Bearer ${NL_TOKEN}`,'Content-Type':'application/octet-stream' }
      }, res => { (res.statusCode>=200&&res.statusCode<300) ? resolve() : reject(new Error(`Upload ${p} failed ${res.statusCode}`)); });
      req.on('error',reject); req.write(f.buf); req.end();
    });
  }
  return await waitForReady(deployId);
}

// Small helper to Title Case folder names nicely
function nicify(name){
  return name.replace(/[-_]/g,' ').replace(/\b\w/g, m => m.toUpperCase());
}

(async () => {
  if (!exists(sitesRoot)) { console.error('No sites/ folder'); process.exit(1); }
  if (!exists(umbAbs))    { console.error(`Umbrella dir not found: ${UMBRELLA_DIR}`); process.exit(1); }

  // Umbrella resources + injection
  const nbUmbPath1 = path.join(umbAbs, 'assets', 'network-bar.js');
  const nbUmbPath2 = path.join(umbAbs, 'shared', 'components', 'network-bar.js'); // what your HTML uses
  ensureDir(path.dirname(nbUmbPath1));
  ensureDir(path.dirname(nbUmbPath2));
  const nb = `(()=>{async function load(){try{const r=await fetch('/assets/network.json',{cache:'no-store'});if(r.ok)return r.json()}catch{}return[]}function render(items){if(!items.length)return;const bar=document.getElementById('network-bar')||document.createElement('nav');bar.id='network-bar';bar.setAttribute('aria-label','Utility Network');bar.style.cssText='display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;padding:.5rem 1rem;background:#f6f6f7;border-bottom:1px solid #e5e7eb;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto';bar.innerHTML=items.map(i=>'<a class="badge" href="'+i.url+'">'+i.name+'</a>').join(' · ');(document.getElementById('network-bar')?document.getElementById('network-bar'):document.body.prepend(bar));}load().then(items=>{render(items);const btns=[...document.querySelectorAll('.grid .card a.btn')];if(btns.length && items.length){btns.forEach((a,i)=>{if(items[i]) a.href = items[i].url;});}})})();\n`;
  writeFile(nbUmbPath1, nb);
  writeFile(nbUmbPath2, nb);

  // Inject GA/Ads/Bar if needed & ensure auto-link snippet exists (handled by network-bar.js)
  for (const f of walk(umbAbs, p=>p.toLowerCase().endsWith('.html'))) {
    const o = fs.readFileSync(f,'utf8'); const u = injectHead(o);
    if (u !== o) fs.writeFileSync(f, u);
  }

  // Discover local micros and list existing Netlify sites once
  const all = fs.readdirSync(sitesRoot, {withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
  const micros = all.filter(s => path.join('sites',s) !== UMBRELLA_DIR);
  const existing = await nlListSites();
  const live = {};

  for (const s of micros) {
    const base = path.join(sitesRoot, s);

    // Ensure minimal site files
    function ensure(p, c){ if (!exists(p)) writeFile(p, c); }
    ensure(path.join(base,'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n');
    ensure(path.join(base,'ads.txt'), 'google.com, pub-6175161566333696, DIRECT, f08c47fec0942fa0\n');
    ensure(path.join(base,'privacy.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy</title></head><body><h1>Privacy Policy</h1><p>This site uses Google AdSense Auto ads and GA4.</p><p>Contact: contact@domain</p></body></html>\n');
    ensure(path.join(base,'terms.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Terms</title></head><body><h1>Terms of Use</h1><p>All calculators are estimates only; not advice.</p></body></html>\n');
    const siteMapPath = path.join(base,'sitemap.xml');
    if (!exists(siteMapPath)) writeFile(siteMapPath, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n');

    // Local network bar (assets/)
    ensureDir(path.join(base,'assets'));
    const nbLocal = path.join(base,'assets','network-bar.js');
    if (!exists(nbLocal)) writeFile(nbLocal, nb);
    const nj = path.join(base,'assets','network.json');
    if (!exists(nj)) writeFile(nj, JSON.stringify([],null,2)+'\n');

    const idx = path.join(base,'index.html');
    if (!exists(idx)) writeFile(idx, '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+nicify(s)+'</title></head><body><h1>'+nicify(s)+'</h1></body></html>');
    for (const f of walk(base, p=>p.toLowerCase().endsWith('.html'))) {
      const o = fs.readFileSync(f,'utf8'); const u = injectHead(o);
      if (u !== o) fs.writeFileSync(f, u);
    }

    // collect files
    const files=[];
    (function gather(d, rel=''){
      for (const de of fs.readdirSync(d,{withFileTypes:true})){
        const p = path.join(d,de.name), r = path.join(rel,de.name);
        if (de.isDirectory()) gather(p,r);
        else if (de.isFile()) files.push({ path: '/' + r.replace(/\\/g,'/'), buf: fs.readFileSync(p) });
      }
    })(base);

    // preferred name & reuse-or-create
    const preferred = ('utility-' + s.replace(/[^a-z0-9-]/gi,'-').toLowerCase()).slice(0,50);
    let site = existing.find(x => x.name === preferred) ||
               existing.find(x => x.name && x.name.startsWith(preferred + '-'));
    if (!site) site = await nlCreateSiteSafe(preferred);

    const siteId = site.site_id || site.id;
    const url1 = (site.ssl_url || site.url || '').replace(/\/*$/,'');

    console.log(`Using site: name=${site.name} id=${siteId} url=${url1||'(pending)'}`);

    // deploy all files
    await nlDeploy(preferred, siteId, files);

    // refresh & get live url
    const listed = await nlFindByName(site.name) || site;
    const liveUrl = (listed.ssl_url || listed.url || url1).replace(/\/*$/,'');
    live[s] = liveUrl;

    // rewrite sitemap & deploy only that file
    const realSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${liveUrl}/</loc></url>\n</urlset>\n`;
    writeFile(siteMapPath, realSitemap);
    await nlDeploy(preferred + '-sitemap', siteId, [{ path:'/sitemap.xml', buf: Buffer.from(realSitemap, 'utf8') }]);

    console.log(`${s} live at ${liveUrl}`);
    await new Promise(r=>setTimeout(r, 1000));
  }

  // Build umbrella list in {name,url} shape your HTML expects
  const list = Object.entries(live).map(([k,u]) => ({ name: nicify(k), url: u }));
  writeFile(path.join(umbAbs,'assets','network.json'), JSON.stringify(list,null,2)+'\n');

  // Gather umbrella files and deploy
  const umbFiles=[];
  (function gatherUmb(d, rel=''){
    for (const de of fs.readdirSync(d,{withFileTypes:true})){
      const p = path.join(d,de.name), r = path.join(rel,de.name);
      if (de.isDirectory()) gatherUmb(p,r);
      else if (de.isFile()) umbFiles.push({ path: '/' + r.replace(/\\/g,'/'), buf: fs.readFileSync(p) });
    }
  })(umbAbs);

  let umbSite;
  if (REUSE_UMBRELLA) {
    umbSite = await nlFindByName(REUSE_UMBRELLA);
    if (!umbSite) throw new Error('Umbrella Netlify site not found: ' + REUSE_UMBRELLA);
  } else {
    umbSite = await nlCreateSiteSafe('utility-umbrella');
  }
  const umbId = umbSite.site_id || umbSite.id;
  await nlDeploy('umbrella', umbId, umbFiles);

  // Include umbrella link at top and deploy just that JSON (so cards/nav update immediately)
  const umbUrl = (umbSite.ssl_url || umbSite.url || '').replace(/\/*$/,'');
  const fullList = [{ name: 'Umbrella', url: umbUrl }, ...list];
  writeFile(path.join(umbAbs,'assets','network.json'), JSON.stringify(fullList,null,2)+'\n');
  await nlDeploy('umbrella-network-json', umbId, [{ path:'/assets/network.json', buf: Buffer.from(JSON.stringify(fullList,null,2)+'\n','utf8') }]);

  console.log('Umbrella:', umbUrl);
  console.log('Micros:', live);
})().catch(e => { console.error(e); process.exit(1); });
