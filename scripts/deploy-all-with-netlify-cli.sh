#!/usr/bin/env bash
set -Eeuo pipefail
shopt -s nullglob

GA_ID="${GA_ID:-G-083MSQKPFX}"
ADS_PUB="${ADS_PUB:-ca-pub-6175161566333696}"
UMBRELLA_DIR="${UMBRELLA_DIR:-sites/utility-network-landing}"
ACCOUNT="${NETLIFY_ACCOUNT_SLUG:-}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1"; exit 2; }; }
need netlify; need jq
: "${NETLIFY_AUTH_TOKEN:?NETLIFY_AUTH_TOKEN not set (add repo secret NETLIFY_TOKEN)}"

# Return: "name id url"
ensure_site() {
  local name="$1"
  local id url
  id="$(netlify sites:list --json | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' || true)"
  if [[ -z "$id" || "$id" == "null" ]]; then
    if [[ -n "$ACCOUNT" ]]; then
      netlify sites:create --name "$name" --account-slug "$ACCOUNT" --manual >/dev/null
    else
      netlify sites:create --name "$name" --manual >/dev/null
    fi
    id="$(netlify sites:list --json | jq -r --arg n "$name" '.[] | select(.name==$n) | .id')"
  fi
  url="$(netlify sites:list --json | jq -r --arg n "$name" '.[] | select(.name==$n) | (.ssl_url // .url)')"
  echo "$name $id $url"
}

# All sub-sites under sites/, except the umbrella dir
mapfile -t DIRS < <(find sites -maxdepth 1 -mindepth 1 -type d ! -name "$(basename "$UMBRELLA_DIR")" | sort)

declare -A LINKS=()
for d in "${DIRS[@]}"; do
  slug="$(basename "$d")"
  sitename="utility-${slug//[^a-zA-Z0-9-]/-}"
  read -r _ id url < <(ensure_site "$sitename")
  echo "→ Deploying $slug  to $url"
  netlify deploy --dir "$d" --prod --site "$id" --message "auto-deploy: $slug" >/dev/null
  LINKS["$slug"]="$url"
done

# Write umbrella network.json with live URLs
mkdir -p "$UMBRELLA_DIR/assets"
tmp="$(mktemp)"; echo "[" > "$tmp"
first=1
for slug in "${!LINKS[@]}"; do
  # Title case from folder name
  name="$(sed -E "s/[-_]+/ /g; s/(^| )([a-z])/\U\2/g" <<<"$slug")"
  url="${LINKS[$slug]}"
  [[ $first -eq 0 ]] && echo "," >> "$tmp" || first=0
  printf "  {\"name\":\"%s\",\"url\":\"%s\"}" "$name" "$url" >> "$tmp"
done
echo -e "\n]" >> "$tmp"
mv "$tmp" "$UMBRELLA_DIR/assets/network.json"

# Make sure umbrella has GA/Ads and network bar references
idx="$UMBRELLA_DIR/index.html"
if [[ -f "$idx" ]] && ! grep -q "$GA_ID" "$idx"; then
  awk -v ga="$GA_ID" -v ads="$ADS_PUB" \
    'BEGIN{IGNORECASE=1}
      /<\/head>/{print "  <script async src=\"https://www.googletagmanager.com/gtag/js?id=" ga "\"></script>\n  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);} gtag(\"js\", new Date()); gtag(\"config\",\"" ga "\");</script>\n  <script async src=\"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" ads "\" crossorigin=\"anonymous\"></script>\n  <script src=\"assets/network-bar.js\" defer></script>"}{print}' \
    "$idx" > "$idx.tmp" && mv "$idx.tmp" "$idx"
fi

# Deploy umbrella to production
read -r _ umbId umbUrl < <(ensure_site "${UMBRELLA_SITE_NAME:-utility-umbrella}")
echo "→ Deploying umbrella to $umbUrl"
netlify deploy --dir "$UMBRELLA_DIR" --prod --site "$umbId" --message "umbrella deploy" >/dev/null
echo "✅ All sites deployed."
