#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VERCEL_TOKEN:-}" || -z "${VERCEL_TEAM:-}" ]]; then
  echo "Missing VERCEL_TOKEN or VERCEL_TEAM in env"; exit 1
fi

# dir -> project name map (unique, DNS-safe)
declare -A MAP=(
  [utility-network-landing]=utility-umbrella
  [party-planner-pack]=utility-party-planner
  [cooking-core]=utility-cooking-core
  [work-money-utilities]=utility-work-and-money
  [home-energy-cost]=utility-home-energy-cost
  [template-pdf-generators]=utility-templates
  [travel-cost-minis]=utility-travel-cost
  [shopping-saver-tools]=utility-shopping-saver
  [subscription-tamer]=utility-subscription-tamer
  [cleaning-laundry-lab]=utility-cleaning-laundry
  [moving-storage-planner]=utility-moving-storage
  [yard-garden-planner]=utility-yard-garden
  [home-project-calculators]=utility-home-project-calcs
  [home-office-media-setup]=utility-home-office-media
  [time-and-scheduling-tools]=utility-time-scheduling
)

ROOT="sites"
NETWORK_JSON="$ROOT/utility-network-landing/assets/network.json"
mkdir -p "$(dirname "$NETWORK_JSON")"
echo "[]" > "$NETWORK_JSON"

function add_link () {
  local name="$1" url="$2"
  # append to JSON array
  tmp=$(mktemp)
  jq --arg n "$name" --arg u "$url" '. += [{"name":$n,"url":$u}]' "$NETWORK_JSON" > "$tmp"
  mv "$tmp" "$NETWORK_JSON"
}

# ensure jq is available
command -v jq >/dev/null 2>&1 || { sudo apt-get update && sudo apt-get install -y jq; }

# Deploy micro-sites first
for dir in "${!MAP[@]}"; do
  [[ "$dir" == "utility-network-landing" ]] && continue
  path="$ROOT/$dir"
  [[ -d "$path" ]] || { echo "Skip missing $path"; continue; }

  proj="${MAP[$dir]}"
  echo "==> Linking $path to Vercel project '$proj' (scope: $VERCEL_TEAM)"
  vercel link --cwd "$path" --project "$proj" --yes --scope "$VERCEL_TEAM" --token "$VERCEL_TOKEN" >/dev/null

  echo "==> Deploying $proj"
  url=$(vercel deploy --cwd "$path" --prod --yes --scope "$VERCEL_TEAM" --token "$VERCEL_TOKEN" \
        | awk '/https:\/\//{u=$0} END{print u}')
  if [[ -z "$url" ]]; then
    echo "Failed to capture URL for $proj"; exit 1
  fi
  echo "Live: $url"
  add_link "$(echo "$proj" | sed 's/utility-//; s/-/ /g; s/\b\(.\)/\u\1/g')" "$url"
done

# Now deploy umbrella (after network.json is populated)
echo "==> Link umbrella"
vercel link --cwd "$ROOT/utility-network-landing" --project utility-umbrella --yes --scope "$VERCEL_TEAM" --token "$VERCEL_TOKEN" >/dev/null
echo "==> Deploy umbrella"
vercel deploy --cwd "$ROOT/utility-network-landing" --prod --yes --scope "$VERCEL_TEAM" --token "$VERCEL_TOKEN"

