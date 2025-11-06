// scripts/audit.js (CommonJS)
// Scans /sites/* for GA4 + AdSense tags, basic SEO/A11y, and key files.
const fs = require('fs');
const path = require('path');

const GA_ID = "G-083MSQKPFX";
const ADS_PUB = "ca-pub-6175161566333696";
const ROOT = process.cwd();
const SITES_DIR = path.join(ROOT, "sites");
const mustHave = ["robots.txt","sitemap.xml","ads.txt","privacy.html","terms.html"];

function findAllHtml(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) out.push(...findAllHtml(p));
    else if (f.isFile() && f.name.endsWith(".html")) out.push(p);
  }
  return out;
}

function checkSite(site) {
  const base = path.join(SITES_DIR, site);
  if (!fs.existsSync(base)) return null;
  const htmlFiles = findAllHtml(base);
  const summary = { site, htmlCount: htmlFiles.length, gaFound: false, adsFound: false, jsonLdPages: 0, missingFiles: [], metaIssues: [] };

  for (const mf of mustHave) if (!fs.existsSync(path.join(base, mf))) summary.missingFiles.push(mf);

  for (const f of htmlFiles) {
    const h = fs.readFileSync(f, "utf8");
    if (h.includes(GA_ID)) summary.gaFound = true;
    if (h.includes(ADS_PUB) || h.includes("adsbygoogle.js?client=")) summary.adsFound = true;
    if (h.includes("application/ld+json")) summary.jsonLdPages++;
    if (!/meta\s+name=[\"']description[\"']/i.test(h)) summary.metaIssues.push({ file: f, issue: "no meta description" });
    if (!/meta\s+name=[\"']viewport[\"']/i.test(h)) summary.metaIssues.push({ file: f, issue: "no viewport meta" });
    if (!/<h1\b/i.test(h)) summary.metaIssues.push({ file: f, issue: "no H1" });
    if (!/alt=\"[^\"]+\"/i.test(h)) summary.metaIssues.push({ file: f, issue: "img missing alt text (or weak a11y)" });
  }
  return summary;
}

function main() {
  if (!fs.existsSync(SITES_DIR)) {
    fs.writeFileSync(path.join(ROOT, "reports-audit.json"), JSON.stringify([], null, 2));
    console.log("No /sites directory found. Wrote empty reports-audit.json");
    return;
  }
  const sites = fs.readdirSync(SITES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  const report = sites.map(checkSite).filter(Boolean);
  fs.writeFileSync(path.join(ROOT, "reports-audit.json"), JSON.stringify(report, null, 2));
  console.log("Wrote reports-audit.json");
}

main();
