import fs from 'fs';
import path from 'path';
import { setTimeout as wait } from 'timers/promises';

const API  = process.env.API || 'https://api.vercel.com';
const TOK  = process.env.VERCEL_TOKEN;
const TEAM = process.env.VERCEL_TEAM_SLUG || '';
const QS   = TEAM ? `?slug=${encodeURIComponent(TEAM)}` : '';
const REPO = process.env.REPO_SLUG || 'msarmento42/utilitynetwork';
const PROD = process.env.PROD_BRANCH || 'main';

if (!TOK) { console.error('Missing VERCEL_TOKEN'); process.exit(1); }
const HEAD = { 'Authorization': `Bearer ${TOK}`, 'Content-Type': 'application/json' };

async function jpost(url, body){
  const r = await fetch(url, { method:'POST', headers: HEAD, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${url} -> ${r.status} ${await r.text()}`);
  return r.json();
}
async function jget(url){
  const r = await fetch(url, { headers: HEAD });
  if (!r.ok) throw new Error(`${url} -> ${r.status} ${await r.text()}`);
  return r.json();
}

function exists(p){ try { fs.accessSync(p); return true; } catch { return false; } }
function ensureIndex(dir){
  const idx = path.join(dir, 'index.html');
  if (!exists(idx)) {
    fs.mkdirSync(dir, { recursive:true });
    fs.writeFileSync(idx, `<!doctype html><meta charset="utf-8"><title>${path.basename(dir)}</title><main style="max-width:720px;margin:40px auto;font:16px/1.6 system-ui"><h1>${path.basename(dir)}</h1><p>First deploy placeholder.</p></main>`);
  }
}

async function createProject({ name, root }){
  // Create or fetch project (requires GitHub App access for the repo)
  const body = {
    name,
    framework: null,
    buildCommand: null,
    outputDirectory: ".",
    rootDirectory: root,
    autoExposeSystemEnvs: true,
    gitRepository: { type: "github", repo: REPO }  // auto-deploy on pushes
  };
  try {
    // Create Project: POST /v10/projects
    const created = await jpost(`${API}/v10/projects${QS}`, body);
    return created;
  } catch (e) {
    const msg = String(e.message || e);
    // If already exists, fetch by name: GET /v9/projects/{idOrName}
    if (msg.includes('409') || msg.includes('already exists')) {
      return await jget(`${API}/v9/projects/${encodeURIComponent(name)}${QS}`);
    }
    throw e;
  }
}

async function listProdDeployment(projectId){
  // List Deployments: GET /v6/deployments?projectId=...&state=READY&target=production
  const url = `${API}/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=production&state=READY${QS ? '&slug='+encodeURIComponent(TEAM) : ''}`;
  const res = await jget(url);
  const list = res.deployments || res;
  return list[0] || null;
}

async function listProjectDomains(nameOrId){
  // Project Domains: GET /v9/projects/{idOrName}/domains
  const url = `${API}/v9/projects/${encodeURIComponent(nameOrId)}/domains${QS ? '?slug='+encodeURIComponent(TEAM) : ''}`;
  const res = await jget(url);
  return res.domains || [];
}

async function waitForProdURL(name, id, timeoutMs=600000){
  const start = Date.now();
  let domainUrl = '';
  while (Date.now() - start < timeoutMs) {
    const dep = await listProdDeployment(id);
    if (dep && (dep.readyState === 'READY' || dep.state === 'READY') && dep?.alias?.length){
      domainUrl = `https://${dep.alias[0]}`;
      break;
    }
    const domains = await listProjectDomains(id);
    const vercelApp = domains.find(d => String(d.name||'').endsWith('.vercel.app'));
    if (vercelApp) {
      domainUrl = `https://${vercelApp.name}`;
      break;
    }
    await wait(4000);
  }
  return domainUrl; // may be '' if first build still pending
}

function titleize(slug){
  return slug.replace(/^utility-/, '')
             .replace(/[-_]+/g, ' ')
             .replace(/\b\w/g, m => m.toUpperCase());
}

async function run(){
  const umbrellaName = process.env.UMBRELLA_NAME || 'utility-umbrella';
  const umbrellaRoot = process.env.UMBRELLA_ROOT || 'sites/utility-network-landing';
  const projects = JSON.parse(process.env.PROJECTS_JSON || '[]');

  // Ensure an index.html exists for each project so first deploy isn't empty
  ensureIndex(umbrellaRoot);
  for (const p of projects) ensureIndex(p.root);

  console.log('→ Creating umbrella project:', umbrellaName, 'root=', umbrellaRoot);
  const umb = await createProject({ name: umbrellaName, root: umbrellaRoot });

  const created = [];
  for (const p of projects) {
    console.log('→ Creating micro project:', p.name, 'root=', p.root);
    const prj = await createProject(p);
    created.push({ ...p, id: prj.id });
  }

  // Write a tiny stamp to trigger Git build via Vercel GitHub integration
  const stamp = path.join(process.cwd(), 'scripts', 'vercel-bootstrap-stamp.txt');
  fs.mkdirSync(path.dirname(stamp), { recursive:true });
  fs.writeFileSync(stamp, `bootstrap ${new Date().toISOString()}\n`, { flag:'a' });
  console.log('✓ Wrote build trigger stamp:', stamp);

  console.log('→ Waiting before polling deployments…');
  await wait(6000);

  // Poll production URLs
  const liveEntries = [];
  for (const p of created) {
    const url = await waitForProdURL(p.name, p.id);
    if (url) console.log(`✓ ${p.name} live at ${url}`);
    else console.warn(`⚠️ ${p.name}: production URL not ready yet (placeholder will be used)`);
    liveEntries.push({ name: titleize(p.name), url: url || `https://${p.name}.vercel.app` });
  }

  // Update umbrella network.json
  const listObj = { tools: liveEntries };
  const netPath = path.join(umbrellaRoot, 'assets', 'network.json');
  fs.mkdirSync(path.dirname(netPath), { recursive:true });
  fs.writeFileSync(netPath, JSON.stringify(listObj, null, 2) + '\n');
  console.log('✓ Updated umbrella network.json');

  // Console summary
  console.log('\n--- LIVE MAP ---');
  for (const e of liveEntries) console.log(`${e.name}: ${e.url}`);
  console.log('----------------\n');
}

run().catch(e => { console.error(e); process.exit(1); });
