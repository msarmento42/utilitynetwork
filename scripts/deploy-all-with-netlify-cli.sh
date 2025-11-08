#!/usr/bin/env bash
set -euo pipefail

: "${NETLIFY_AUTH_TOKEN:?NETLIFY_AUTH_TOKEN not set}"
API="https://api.netlify.com/api/v1"
AUTH="Authorization: Bearer ${NETLIFY_AUTH_TOKEN}"

GA_ID="${GA_ID:-G-083MSQKPFX}"
ADS_PUB="${ADS_PUB:-ca-pub-6175161566333696}"
UMBRELLA_NAME="${UMBRELLA_SITE_NAME:-golden-elf-b1aa95}"

# 15 sites [slug | Display Name]
read -r -d "" SITES_JSON << JSON
[
["party-planner-pack","Party Planner Pack"],
["cooking-core","Cooking Core"],
["home-project-calculators","Home Project Calculators"],
["home-energy-cost","Home Energy Cost"],
["travel-cost-minis","Travel Cost Minis"],
["template-pdf-generators","Template & PDF Generators"],
["work-money-utilities","Work & Money Utilities"],
["shopping-saver-tools","Shopping Saver Tools"],
["subscription-tamer","Subscription Tamer"],
["holiday-event-minis","Holiday & Event Minis"],
["cleaning-laundry-lab","Cleaning & Laundry Lab"],
["moving-storage-planner","Moving & Storage Planner"],
["yard-garden-planner","Yard & Garden Planner"],
["home-office-media-setup","Home Office & Media Setup"],
["time-scheduling-tools","Time & Scheduling Tools"]
]
JSON

# Ensure umbrella assets exist
mkdir -p sites/utility-network-landing/assets
[[ -f sites/utility-network-landing/assets/network-bar.js ]] || cat > sites/utility-network-landing/assets/network-bar.js <<JS
(()=>{async function load(){try{const r=await fetch("assets/network.json",{cache:"no-store"});if(r.ok)return r.json()}catch{}return[]}function render(items){if(!items.length)return;const bar=document.createElement("nav");bar.setAttribute("aria-label","Utility Network");bar.style.cssText="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;padding:.5rem 1rem;background:#f6f6f7;border-bottom:1px solid #e5e7eb;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto";const label=document.createElement("span");label.textContent="Utility Network:";label.style.cssText="opacity:.7;margin-right:.25rem";bar.appendChild(label);items.forEach(i=>{const a=document.createElement("a");a.href=i.url||i.href||"#";a.textContent=i.name||i.label||"link";a.style.cssText="text-decoration:none;padding:.25rem .5rem;border-radius:.375rem;border:1px solid #e5e7eb";bar.appendChild(a)});document.body.prepend(bar)}load().then(render)})();
JS
[[ -f sites/utility-network-landing/assets/network.json ]] || echo "[]" > sites/utility-network-landing/assets/network.json

# Fix umbrella index placeholders if present
if [[ -f sites/utility-network-landing/index.html ]]; then
  perl -0777 -pe "s/\$\{GA_ID:-[^}]+\}/$GA_ID/g; s/\$\{ADS_PUB:-[^}]+\}/$ADS_PUB/g" -i sites/utility-network-landing/index.html
fi

# Find or create umbrella site, capture id
umb_id=$(curl -fsSL -H "$AUTH" "$API/sites?name=$UMBRELLA_NAME" | jq -r ".[0].id // empty")
if [[ -z "$umb_id" ]]; then
  umb_id=$(curl -fsSL -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"name\":\"$UMBRELLA_NAME\",\"force_ssl\":true}" "$API/sites" | jq -r ".id")
fi

# Deploy helper
deploy_dir () {
  local dir="$1" site_id="$2" msg="$3"
  netlify deploy --prod --dir "$dir" --site "$site_id" --message "$msg" >/dev/null
}

# Iterate sites, ensure folders, ensure sites exist, deploy, collect URLs
network_items=()

for row in $(echo "$SITES_JSON" | jq -c ".[]"); do
  slug=$(echo "$row" | jq -r ".[0]")
  name=$(echo "$row" | jq -r ".[1]")
  dir="sites/$slug"
  mkdir -p "$dir/assets"
  # Minimal index (GA + Ads + network bar)
  if [[ ! -f "$dir/index.html" ]]; then
    cat > "$dir/index.html" <<HTML
<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>$name</title><link rel="icon" href="data:,">
<script async src="https://www.googletagmanager.com/gtag/js?id=$GA_ID"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);} gtag("js",new Date()); gtag("config","$GA_ID");</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=$ADS_PUB" crossorigin="anonymous"></script>
<script src="assets/network-bar.js" defer></script>
</head><body><h1>$name</h1><p>Bootstrapped.</p></body></html>
HTML
  fi
  # Copy network assets if missing
  cp -n sites/utility-network-landing/assets/network-bar.js "$dir/assets/network-bar.js" || true
  cp -n sites/utility-network-landing/assets/network.json   "$dir/assets/network.json"   || echo "[]" > "$dir/assets/network.json"

  sitename="utility-$slug"
  # Find or create site
  site_id=$(curl -fsSL -H "$AUTH" "$API/sites?name=$sitename" | jq -r ".[0].id // empty")
  if [[ -z "$site_id" ]]; then
    site_id=$(curl -fsSL -H "$AUTH" -H "Content-Type: application/json" \
      -d "{\"name\":\"$sitename\",\"force_ssl\":true}" "$API/sites" | jq -r ".id")
  fi

  # Deploy this micro-site
  deploy_dir "$dir" "$site_id" "bootstrap: $slug"

  # Read live URL
  url=$(curl -fsSL -H "$AUTH" "$API/sites/$site_id" | jq -r ".ssl_url // .url")
  network_items+=( "$(jq -n --arg n "$name" --arg u "$url" "{name:\$n,url:\$u}")" )
done

# Write umbrella network.json array
jq -n "[inputs]" <<< "${network_items[*]}" > sites/utility-network-landing/assets/network.json

# Deploy umbrella
deploy_dir "sites/utility-network-landing" "$umb_id" "umbrella bootstrap"
