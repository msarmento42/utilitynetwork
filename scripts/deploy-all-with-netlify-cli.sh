#!/usr/bin/env bash
set -euo pipefail
: "${NETLIFY_AUTH_TOKEN:?NETLIFY_AUTH_TOKEN not set}"
UMBRELLA="${UMBRELLA_SITE_NAME:-golden-elf-b1aa95}"

nicify(){ sed -E 's/[-_]+/ /g; s/\b(.)/\U\1/g' <<<"$1"; }

mapfile -t MICROS < <(ls -1 sites | grep -v '^utility-network-landing$')

if ! command -v jq >/dev/null; then
  echo "jq is required"; exit 1
fi

ALLSITES_JSON="$(netlify api listSites)"
get_site_id_by_name(){ local n="$1" sid; jq -r --arg n "$n" '.[]|select(.name==$n)|.id' <<<"$ALLSITES_JSON" | head -n1; }
ensure_site(){
  local wanted="$1" sid
  sid="$(get_site_id_by_name "$wanted")"
  if [ -z "${sid}" ]; then
    echo "Creating Netlify site: $wanted"
    local created; created="$(netlify sites:create --name "$wanted" --json)"
    echo "$created" | jq '.'
    sid="$(echo "$created" | jq -r '.id')"
    ALLSITES_JSON="$(netlify api listSites)"
  fi
  echo "$sid"
}

declare -A LIVE
for slug in "${MICROS[@]}"; do
  dir="sites/$slug"
  name="utility-$(echo "$slug" | tr -cs 'a-z0-9-' '-' | tr -s '-')"
  sid="$(ensure_site "$name")"
  echo "::group::Deploy $slug -> $name ($sid)"
  out="$(netlify deploy --prod --dir "$dir" --site "$sid" --json)"
  echo "$out" | jq '.'
  url="$(echo "$out" | jq -r '.deploy_ssl_url // .url // .deploy_url // empty')"
  [ -n "$url" ] || { echo "No URL returned for $slug"; exit 1; }
  LIVE["$slug"]="$url"
  echo "::endgroup::"
end

tmp="$(mktemp)"; echo "[" > "$tmp"
for slug in "${MICROS[@]}"; do
  title="$(nicify "$slug")"; url="${LIVE[$slug]}"
  echo "  {\"name\":\"$title\",\"url\":\"$url\"}," >> "$tmp"
end
sed -i '$ s/,$//' "$tmp"; echo "]" >> "$tmp"
mkdir -p sites/utility-network-landing/assets
cp "$tmp" sites/utility-network-landing/assets/network.json; rm -f "$tmp"

umb_id="$(ensure_site "$UMBRELLA")"
echo "::group::Deploy umbrella -> $UMBRELLA ($umb_id)"
out="$(netlify deploy --prod --dir sites/utility-network-landing --site "$umb_id" --json)"
echo "$out" | jq '.'
echo "::endgroup::"
