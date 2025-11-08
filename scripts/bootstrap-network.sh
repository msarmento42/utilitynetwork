#!/usr/bin/env bash
set -euo pipefail

# ====== REQUIRED ENV (set in Codex environment, not inline here) ======
: "${GH_OWNER:?Missing GH_OWNER}"
: "${GH_PAT:?Missing GH_PAT}"
: "${NETLIFY_TOKEN:?Missing NETLIFY_TOKEN}"
: "${GA_ID:?Missing GA_ID}"
: "${ADS_PUB:?Missing ADS_PUB}"
NETLIFY_TEAM="${NETLIFY_TEAM:-}"   # optional

# ----- 15 sites (name -> repo slug -> Netlify site name) -----
read -r -d '' SITES <<'JSON'
[
  {"title":"Work & Money Utilities","slug":"work-money-utilities"},
  {"title":"Home Project Calculators","slug":"home-project-calculators"},
  {"title":"Home Energy Cost","slug":"home-energy-cost"},
  {"title":"Subscription Tamer","slug":"subscription-tamer"},
  {"title":"Shopping Saver Tools","slug":"shopping-saver-tools"},
  {"title":"Party Planner Pack","slug":"party-planner-pack"},
  {"title":"Cooking Core","slug":"cooking-core"},
  {"title":"Travel Cost Minis","slug":"travel-cost-minis"},
  {"title":"Template & PDF Generators","slug":"template-pdf-generators"},
  {"title":"Time & Scheduling Tools","slug":"time-scheduling-tools"},
  {"title":"Cleaning & Laundry Lab","slug":"cleaning-laundry-lab"},
  {"title":"Moving & Storage Planner","slug":"moving-storage-planner"},
  {"title":"Yard & Garden Planner","slug":"yard-garden-planner"},
  {"title":"Home Office & Media Setup","slug":"home-office-media-setup"},
  {"title":"Holiday & Event Minis","slug":"holiday-event-minis"}
]
JSON

api() { curl -sSfL -H "Authorization: token $GH_PAT" -H "Accept: application/vnd.github+json" "$@"; }

mk_file() {
  local repo="$1" path="$2" content="$3"
  local b64
  b64=$(printf '%s' "$content" | base64 -w 0)
  curl -sSfL -X PUT \
    -H "Authorization: token $GH_PAT" \
    -H "Accept: application/vnd.github+json" \
    -d "{\"message\":\"chore: bootstrap\",\"content\":\"$b64\",\"branch\":\"main\"}" \
    "https://api.github.com/repos/${GH_OWNER}/${repo}/contents/${path}" > /dev/null
}

# Ensure netlify CLI + jq are present
if ! command -v netlify >/dev/null 2>&1; then npm i -g netlify-cli >/dev/null; fi
if ! command -v jq >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then sudo apt-get update -y >/dev/null && sudo apt-get install -y jq >/dev/null; fi
fi

# Tally for umbrella linking later
LIVE_LIST_JSON="[]"

while read -r item; do
  title=$(jq -r '.title' <<<"$item")
  slug=$(jq -r '.slug'  <<<"$item")

  echo "=== Creating repo ${slug} …"
  # Create GitHub repo if it doesn't exist
  if ! api -X GET "https://api.github.com/repos/${GH_OWNER}/${slug}" >/dev/null 2>&1; then
    api -X POST "https://api.github.com/user/repos" \
      -d "{\"name\":\"${slug}\",\"private\":false,\"auto_init\":false,\"has_issues\":true,\"has_projects\":false,\"has_wiki\":false}" >/dev/null
  fi

  # Minimal static site (GA4 + AdSense + network bar)
  read -r -d '' INDEX_HTML <<EOF
<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="icon" href="data:,">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config','${GA_ID}');</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_PUB}" crossorigin="anonymous"></script>
<script src="assets/network-bar.js" defer></script>
<style>
body{margin:0;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto;background:#fafafa}
header{background:#0b1220;color:#fff;padding:48px 16px}
main{max-width:900px;margin:24px auto;padding:0 16px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-top:16px}
</style>
</head><body>
<header><h1>${title}</h1><p>Fast, simple calculator utilities.</p></header>
<main>
  <div class="card"><p>Welcome! This site is live. Add tools/content in <code>index.html</code> as needed.</p></div>
</main>
</body></html>
EOF

  read -r -d '' NETWORK_BAR <<'EOF'
(()=>{async function load(){try{const r=await fetch('assets/network.json',{cache:'no-store'});if(r.ok)return r.json()}catch{}return[]}function render(items){if(!items.length)return;const bar=document.createElement('nav');bar.setAttribute('aria-label','Utility Network');bar.style.cssText='display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;padding:.5rem 1rem;background:#f6f6f7;border-bottom:1px solid #e5e7eb;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto';const label=document.createElement('span');label.textContent='Network:';label.style.cssText='opacity:.7;margin-right:.25rem';bar.appendChild(label);items.forEach(i=>{const a=document.createElement('a');a.href=i.url;a.textContent=i.name;a.style.cssText='text-decoration:none;padding:.25rem .5rem;border-radius:.375rem;border:1px solid #e5e7eb';a.onmouseenter=()=>a.style.background='#fff';a.onmouseleave=()=>a.style.background='';bar.appendChild(a)});document.body.prepend(bar)}load().then(render)})();
EOF

  mk_file "$slug" "index.html" "$INDEX_HTML"
  mk_file "$slug" "assets/network-bar.js" "$NETWORK_BAR"
  mk_file "$slug" "assets/network.json" "[]"
  mk_file "$slug" "robots.txt" "User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n"
  mk_file "$slug" "ads.txt" "google.com, ${ADS_PUB#ca-}, DIRECT, f08c47fec0942fa0\n"
  mk_file "$slug" "netlify.toml" "[build]\npublish = \".\"\n"
  mk_file "$slug" "README.md" "# ${title}\n\nStatic micro-site. Deployed via Netlify CLI."

  # Build a temp dir for first deploy (avoids cloning)
  tmp="$(mktemp -d)"
  printf '%s' "$INDEX_HTML" > "$tmp/index.html"
  mkdir -p "$tmp/assets"
  printf '%s' "$NETWORK_BAR" > "$tmp/assets/network-bar.js"
  printf '[]' > "$tmp/assets/network.json"
  printf 'User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n' > "$tmp/robots.txt"
  printf 'google.com, %s, DIRECT, f08c47fec0942fa0\n' "${ADS_PUB#ca-}" > "$tmp/ads.txt"
  printf '[build]\npublish = "."\n' > "$tmp/netlify.toml"

  # Create Netlify site (unique subdomain). Capture site_id + URL.
  nl_args=(sites:create --name "${slug}" --json)
  if [[ -n "$NETLIFY_TEAM" ]]; then nl_args+=(--account "$NETLIFY_TEAM"); fi
  site_json=$(NETLIFY_AUTH_TOKEN="$NETLIFY_TOKEN" netlify "${nl_args[@]}")
  site_id=$(echo "$site_json" | jq -r '.site_id // .id // .site_id')
  if [[ -z "${site_id:-}" || "${site_id}" == "null" ]]; then
    echo "Netlify site create failed for ${slug}"
    echo "$site_json"
    rm -rf "$tmp"
    exit 1
  fi

  # First deploy
  NETLIFY_AUTH_TOKEN="$NETLIFY_TOKEN" netlify deploy --prod --dir "$tmp" --site "$site_id" --message "initial deploy" >/dev/null
  # Query live URL
  site_info=$(NETLIFY_AUTH_TOKEN="$NETLIFY_TOKEN" netlify api getSite --data "{\"site_id\":\"$site_id\"}")
  live_url=$(echo "$site_info" | jq -r '.url')

  echo "Live: ${title} -> ${live_url}"
  # Append to list for umbrella/network file later
  LIVE_LIST_JSON=$(echo "$LIVE_LIST_JSON" | jq --arg name "$title" --arg url "$live_url" '. + [{name:$name,url:$url}]')

  rm -rf "$tmp"
done <<<"$(echo "$SITES" | jq -c '.[]')"

echo "----- LIVE SITES -----"
echo "$LIVE_LIST_JSON" | jq -r '.[] | "\(.name): \(.url)"'

# Save a ready-to-paste network.json for your umbrella page
printf '%s\n' "$LIVE_LIST_JSON" > live-network.json
echo "Wrote live-network.json (use this on the umbrella site at assets/network.json)."
