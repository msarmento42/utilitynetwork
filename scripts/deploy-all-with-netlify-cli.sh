#!/usr/bin/env bash
set -euo pipefail

# --- Config/inputs ---
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITES_DIR="$ROOT/sites"
UMBRELLA_DIR="$SITES_DIR/utility-network-landing"
UMBRELLA_NAME="${UMBRELLA_NAME:-golden-elf-b1aa95}"
GA_ID="${GA_ID:-G-083MSQKPFX}"
ADS_PUB="${ADS_PUB:-ca-pub-6175161566333696}"

# Accept either NETLIFY_AUTH_TOKEN or NETLIFY_TOKEN
NETLIFY_AUTH_TOKEN="${NETLIFY_AUTH_TOKEN:-${NETLIFY_TOKEN:-}}"
if [[ -z "${NETLIFY_AUTH_TOKEN}" ]]; then
  echo "❌ NETLIFY_AUTH_TOKEN not set (or NETLIFY_TOKEN fallback missing)."
  echo "   Add repo secret NETLIFY_TOKEN with your personal access token."
  exit 1
fi
export NETLIFY_AUTH_TOKEN

# --- Helpers ---
nl_api() { # $1=METHOD $2=PATH [$3=data-json]
  local m="$1" p="$2" d="${3:-}"
  if [[ -n "$d" ]]; then
    curl -fsSL -H "Authorization: Bearer ${NETLIFY_AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -X "$m" "https://api.netlify.com/api/v1${p}" \
      --data "$d"
  else
    curl -fsSL -H "Authorization: Bearer ${NETLIFY_AUTH_TOKEN}" \
      -X "$m" "https://api.netlify.com/api/v1${p}"
  fi
}

find_or_create_site() { # $1=preferred-name  -> echoes: "<id> <url>"
  local name="$1"
  local list id url
  list="$(nl_api GET /sites)"
  id="$(echo "$list" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -n1)"
  url="$(echo "$list" | jq -r --arg n "$name" '.[] | select(.name==$n) | (.ssl_url // .url)' | head -n1)"
  if [[ -n "$id" && "$id" != "null" ]]; then
    echo "$id $url"; return 0
  fi
  # Create with preferred name; if name taken, let Netlify pick a random one
  local payload
  payload="$(jq -n --arg name "$name" '{name:$name, force_ssl:true}')"
  local created
  set +e
  created="$(nl_api POST /sites "$payload" 2>/dev/null)"
  if [[ $? -ne 0 ]]; then
    created="$(nl_api POST /sites "$(jq -n '{force_ssl:true}')" )"
  fi
  set -e
  id="$(echo "$created" | jq -r '.id')"
  url="$(echo "$created" | jq -r '(.ssl_url // .url)')"
  echo "$id $url"
}

inject_head_snippets() { # $1=file.html
  local f="$1"
  grep -q "$GA_ID"  "$f" && grep -q "$ADS_PUB" "$f" && return 0
  awk -v ga="$GA_ID" -v ads="$ADS_PUB" '
    BEGIN{IGNORECASE=1}
    /<\/head>/ {
      print "<!-- GA4 -->"
      print "<script async src=\"https://www.googletagmanager.com/gtag/js?id=" ga "\"></script>"
      print "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);} gtag(\"js\", new Date()); gtag(\"config\",\"" ga "\");</script>"
      print "<!-- AdSense Auto ads -->"
      print "<script async src=\"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" ads "\" crossorigin=\"anonymous\"></script>"
      print "<!-- Network bar -->"
      print "<script src=\"assets/network-bar.js\" defer></script>"
    }
    {print}
  ' "$f" > "$f.__tmp" && mv "$f.__tmp" "$f"
}

ensure_basic_files() { # $1=site-dir
  local d="$1"
  mkdir -p "$d/assets"
  [[ -f "$d/robots.txt" ]] || echo -e "User-agent: *\nAllow: /\nSitemap: /sitemap.xml" > "$d/robots.txt"
  [[ -f "$d/ads.txt"    ]] || echo "google.com, pub-6175161566333696, DIRECT, f08c47fec0942fa0" > "$d/ads.txt"
  [[ -f "$d/privacy.html" ]] || echo '<!doctype html><h1>Privacy</h1><p>Uses GA4 & AdSense Auto ads.</p>' > "$d/privacy.html"
  [[ -f "$d/terms.html"   ]] || echo '<!doctype html><h1>Terms</h1><p>Estimates only; not advice.</p>' > "$d/terms.html"
  [[ -f "$d/assets/network-bar.js" ]] || cat > "$d/assets/network-bar.js" <<'JS'
(()=>{async function g(){try{const r=await fetch('assets/network.json',{cache:'no-store'});if(r.ok)return r.json()}catch{}return[]}function r(n){if(!n.length)return;const e=document.createElement('nav');e.setAttribute('aria-label','Utility Network');e.style.cssText='display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;padding:.5rem 1rem;background:#f6f6f7;border-bottom:1px solid #e5e7eb;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto';const t=document.createElement('span');t.textContent='Utility Network:';t.style.cssText='opacity:.7;margin-right:.25rem';e.appendChild(t);n.forEach(i=>{const a=document.createElement('a');a.href=i.url||i.href;a.textContent=i.name||i.label;a.style.cssText='text-decoration:none;padding:.25rem .5rem;border-radius:.375rem;border:1px solid #e5e7eb';e.appendChild(a)});document.body.prepend(e)}g().then(r);})();
JS
  [[ -f "$d/assets/network.json" ]] || echo "[]" > "$d/assets/network.json"
  if [[ -f "$d/index.html" ]]; then
    inject_head_snippets "$d/index.html"
  fi
}

deploy_dir() { # $1=tag $2=site-id $3=dir
  local tag="$1" id="$2" dir="$3"
  echo "→ Deploy $tag  dir=$dir  site=$id"
  netlify deploy --prod --dir "$dir" --site "$id" --message "$tag" >/dev/null
}

# --- Collect micro-sites (everything under sites/ except umbrella) ---
mapfile -t MICROS < <(find "$SITES_DIR" -maxdepth 1 -mindepth 1 -type d -printf "%f\n" | grep -v "^utility-network-landing$" | sort)

# Prepare umbrella list we’ll write later
declare -a LIVE
for s in "${MICROS[@]}"; do
  sd="$SITES_DIR/$s"
  ensure_basic_files "$sd"
  # Ensure has index.html at least
  if [[ ! -f "$sd/index.html" ]]; then
    cat > "$sd/index.html" <<HTML
<!doctype html><meta charset="utf-8"><title>${s}</title><h1 style="font-family:system-ui"> ${s} </h1>
<p>Utility calculator coming soon.</p>
HTML
    inject_head_snippets "$sd/index.html"
  fi

  # Create/find site and deploy
  read -r sid surl < <(find_or_create_site "utility-${s//[^a-zA-Z0-9-]/-}" )
  deploy_dir "$s" "$sid" "$sd"
  LIVE+=("$(jq -nc --arg n "${s//[-_]/ }" --arg u "$surl" '{name:$n,url:$u}')")
done

# Update umbrella network.json and deploy umbrella
mkdir -p "$UMBRELLA_DIR/assets"
jq -s '.' <<<"${LIVE[*]:-[]}" > "$UMBRELLA_DIR/assets/network.json"

# Make sure umbrella has a real index.html
if [[ ! -f "$UMBRELLA_DIR/index.html" ]]; then
  cp -f "$ROOT/umbrella-index.html" "$UMBRELLA_DIR/index.html" 2>/dev/null || true
fi
ensure_basic_files "$UMBRELLA_DIR"

# Deploy umbrella to its named site (existing or new)
read -r umb_id umb_url < <(find_or_create_site "$UMBRELLA_NAME")
deploy_dir "umbrella" "$umb_id" "$UMBRELLA_DIR"

echo "Umbrella: $umb_url"
jq -r '.[].url' "$UMBRELLA_DIR/assets/network.json" | nl -w2 -s'. ' | sed '1s/^/Micros:\n/'
