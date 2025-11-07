// scripts/deploy-network.js
// Deploys every sites/<folder> as its own Netlify site, writes live URLs into
// sites/utility-network-landing/assets/network.json, then deploys the umbrella too.

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const GA_ID        = process.env.GA_ID || 'G-083MSQKPFX';
const ADS_PUB      = process.env.ADS_PUB || 'ca-pub-6175161566333696';
const UMBRELLA_DIR = process.env.UMBRELLA_DIR || 'sites/utility-network-landing';
const NL_TOKEN     = process.env.NETLIFY_TOKEN || '';
const REUSE_UMBRELLA = (process.env.REUSE_UMBRELLA || '').trim();

if (!NL_TOKEN) {
  console.error('Missing NETLIFY_TOKEN secret'); process.exit(1);
}

const root = process.cwd();
const sitesRoot = path.join(root, 'sites');

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
  const hasNB  = html.includes('assets/network-bar.js');
  if (hasGA && hasAds && hasNB) return html;
  const snippet =
    '<!-- GA4 -->\n' +
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>\n` +
    "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config','" + GA_ID + "');</script>\n\n" +
    "<!-- AdSense Auto ads -->\n" +
    `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_PUB}" crossorigin="anonymous"></script>\n\n` +
    "<!-- Network bar (local) -->\n" +
    `<script src="assets/network-bar.js" defer></script>\n\n` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n';
  const i = html.toLowerCase().lastIndexOf('</head>');
  return i === -1 ? html : (html.slice(0,i) + '\n' + snippet + '\n' + html.slice(i));
}

// Netlify API
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
async function nlCreateSite(name){ return nl('POST','/sites',{ name, force_ssl:true }); }
async function nlDeploy(siteId, files){
  const map = {}; for (const f of files) map[f.path] = sha1(f.buf);
  const draft = await nl('POST', `/sites/${siteId}/deploys`, { files: map, draft:false });
  const id = draft.id;
  const required = (draft.required||[]).map(x => x.path || x);
  for (const p of required){
    const f = files.find(x => x.path === p); if (!f) continue;
    await new Promise((resolve,reject)=>{
      const req = https.request({
        method:'PUT',
        hostname:'api.netlify.com',
        path:`/api/v1/deploys/${id}/files${encodeURI(p)}`,
        headers:{ 'Authorization':`Bearer ${NL_TOKEN}`,'Content-Type':'application/octet-stream' }
      }, res => { (res.statusCode>=200&&res.statusCode<300) ? resolve() : reject(new Error(`Upload ${p} failed ${res.statusCode}`)); });
      req.on('error',reject); req.write(f.buf); req.end();
    });
  }
  for (let i=0;i<40;i++){
    const st = await nl('GET', `/deploys/${id}`);
    if (st.state === 'ready') return st;
    await new Promise(r=>setTimeout(r,1500));
  }
  throw new Error('Deploy did not become ready in time');
}

(async () => {
  if (!exists(sitesRoot)) { console.error('No sites/ folder'); process.exit(1); }
  const umbAbs = path.join(root, UMBRELLA_DIR);
  if (!exists(umbAbs)) { console.error(`Umbrella dir not found: ${UMBRELLA_DIR}`); process.exit(1); }

  // Umbrella: ensure assets + injection
  const nbUmbPath = path.join(umbAbs, 'assets', 'network-bar.js');
  ensureDir(path.dirname(nbUmbPath));
  if (!exists(nbUmbPath)) {
    const nb = `(()=>{async function load(){try{const r=await fetch('assets/network.json',{cache:'no-store'});if(r.ok)return r.json()}catch{}return[]}function render(items){if(!items.length)return;const bar=document.createElement('nav');bar.setAttribute('aria-label','Utility Network');bar.style.cssText='display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;padding:.5rem 1rem;background:#f6f6f7;border-bottom:1px solid #e5e7eb;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto';const label=document.createElement('span');label.textContent='Utility Network:';label.style.cssText='opacity:.7;margin-right:.25rem';bar.appendChild(label);items.forEach(i=>{const a=document.createElement('a');a.href=i.href;a.textContent=i.label;a.style.cssText='text-decoration:none;padding:.25rem .5rem;border-radius:.375rem;border:1px solid #e5e7eb';a.onmouseenter=()=>a.style.background='#fff';a.onmouseleave=()=>a.style.background='';bar.appendChild(a)});document.body.prepend(bar)}load().then(render)})();\n`;
    writeFile(nbUmbPath, nb);
  }
  const netJsonUmb = path.join(umbAbs, 'assets', 'network.json');
  if (!exists(netJsonUmb)) writeFile(netJsonUmb, JSON.stringify([],null,2)+'\n');

  for (const f of walk(umbAbs, p=>p.toLowerCase().endsWith('.html'))) {
    const o = fs.readFileSync(f,'utf8'); const u = injectHead(o);
    if (u !== o) fs.writeFileSync(f, u);
  }
  // add a visible list if missing
  const umbIndex = path.join(umbAbs,'index.html');
  if (exists(umbIndex)) {
    let html = fs.readFileSync(umbIndex,'utf8');
    if (!html.includes('id="utility-network-list"')) {
      const hook = '</body>'; const at = html.toLowerCase().lastIndexOf(hook);
      const snippet =
        '\n<div id="utility-network-list" style="max-width:720px;margin:24px auto;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fff">' +
        '<h2 style="margin-top:0">Live Tools</h2><ul id="un-list"></ul></div>\n' +
        "<script>fetch('assets/network.json',{cache:'no-store'}).then(r=>r.json()).then(items=>{const ul=document.getElementById('un-list');if(!ul)return;items.forEach(i=>{const li=document.createElement('li');const a=document.createElement('a');a.href=i.href;a.textContent=i.label;a.rel='noopener';li.appendChild(a);ul.appendChild(li);});}).catch(console.error);</script>\n";
      if (at !== -1) { html = html.slice(0,at) + snippet + html.slice(at); fs.writeFileSync(umbIndex, html); }
    }
  }

  // Deploy micro-sites
  const all = fs.readdirSync(sitesRoot, {withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
  const micros = all.filter(s => path.join('sites',s) !== UMBRELLA_DIR);
  const live = {};
  for (const s of micros) {
    const base = path.join(sitesRoot, s);
    // Minimal boilerplates & assets
    function ensure(p, c){ if (!exists(p)) writeFile(p, c); }
    ensure(path.join(base,'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n');
    ensure(path.join(base,'ads.txt'), 'google.com, pub-6175161566333696, DIRECT, f08c47fec0942fa0\n');
    ensure(path.join(base,'privacy.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy</title></head><body><h1>Privacy Policy</h1><p>This site uses Google AdSense Auto ads and GA4.</p><p>Contact: contact@domain</p></body></html>\n');
    ensure(path.join(base,'terms.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Terms</title></head><body><h1>Terms of Use</h1><p>All calculators are estimates only; not advice.</p></body></html>\n');
    ensure(path.join(base,'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://example.netlify.app/</loc></url>\n</urlset>\n');
    const assets = path.join(base,'assets'); ensureDir(assets);
    const nb = path.join(assets,'network-bar.js'); if (!exists(nb)) writeFile(nb, fs.readFileSync(nbUmbPath,'utf8'));
    const nj = path.join(assets,'network.json'); if (!exists(nj)) writeFile(nj, JSON.stringify([],null,2)+'\n');
    const idx = path.join(base,'index.html'); if (!exists(idx)) writeFile(idx, '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+s+'</title></head><body><h1>'+s+'</h1></body></html>');
    for (const f of walk(base, p=>p.toLowerCase().endsWith('.html'))) {
      const o = fs.readFileSync(f,'utf8'); const u = injectHead(o);
      if (u !== o) fs.writeFileSync(f, u);
    }

    // Collect files
    const files=[];
    (function gather(d, rel=''){
      for (const de of fs.readdirSync(d,{withFileTypes:true})){
        const p = path.join(d,de.name), r = path.join(rel,de.name);
        if (de.isDirectory()) gather(p,r);
        else if (de.isFile()) files.push({ path: '/' + r.replace(/\\/g,'/'), buf: fs.readFileSync(p) });
      }
    })(base);

    // Create + deploy
    const name = ('utility-' + s.replace(/[^a-z0-9-]/gi,'-').toLowerCase()).slice(0,50);
    const created = await nlCreateSite(name);
    await nlDeploy(created.site_id, files);
    const url = created.ssl_url || created.url;
    live[s] = url;
    console.log(s, '->', url);
  }

  // Update umbrella network.json and deploy umbrella
  const list = Object.entries(live).map(([k,u]) => ({
    label: k.replace(/[-_]/g,' ').replace(/\b\w/g, m => m.toUpperCase()),
    href: u
  }));
  writeFile(path.join(umbAbs,'assets','network.json'), JSON.stringify(list,null,2)+'\n');

  // Gather umbrella files
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
    umbSite = await nlCreateSite('utility-umbrella');
  }
  await nlDeploy(umbSite.site_id, umbFiles);
  const umbUrl = umbSite.ssl_url || umbSite.url;

  // Re-deploy umbrella including itself in list
  const fullList = [{ label: 'Umbrella', href: umbUrl }, ...list];
  writeFile(path.join(umbAbs,'assets','network.json'), JSON.stringify(fullList,null,2)+'\n');
  const umbFiles2=[];
  (function gatherUmb2(d, rel=''){
    for (const de of fs.readdirSync(d,{withFileTypes:true})){
      const p = path.join(d,de.name), r = path.join(rel,de.name);
      if (de.isDirectory()) gatherUmb2(p,r);
      else if (de.isFile()) umbFiles2.push({ path: '/' + r.replace(/\\/g,'/'), buf: fs.readFileSync(p) });
    }
  })(umbAbs);
  await nlDeploy(umbSite.site_id, umbFiles2);

  console.log('Umbrella:', umbUrl);
  console.log('Micros:', live);
})().catch(e => { console.error(e); process.exit(1); });
