#!/usr/bin/env bash
set -euo pipefail

OWNER="msarmento42"
UMBRELLA_REPO="utility-umbrella"
UMBRELLA_SITE_NAME="golden-elf-b1aa95"

: "${NETLIFY_AUTH_TOKEN:?NETLIFY_AUTH_TOKEN is required in env}"

# Map network repositories to friendly display names.
declare -A LABELS=(
  [utility-party-planner]="Party Planner Pack"
  [utility-cooking-core]="Cooking Core"
  [utility-home-project-calcs]="Home Project Calculators"
  [utility-home-energy-cost]="Home Energy Cost"
  [utility-travel-cost-minis]="Travel Cost Minis"
  [utility-template-pdfs]="Template & PDF Generators"
  [utility-work-money-utils]="Work & Money Utilities"
  [utility-shopping-saver]="Shopping Saver Tools"
  [utility-subscription-tamer]="Subscription Tamer"
  [utility-holiday-event-minis]="Holiday & Event Minis"
  [utility-cleaning-laundry]="Cleaning & Laundry Lab"
  [utility-moving-storage]="Moving & Storage Planner"
  [utility-yard-garden]="Yard & Garden Planner"
  [utility-home-office-media]="Home Office & Media Setup"
  [utility-time-scheduling-tools]="Time & Scheduling Tools"
)

npm i -g netlify-cli >/dev/null 2>&1 || true

# Build network.json from the live Netlify site list
tmp_json=$(mktemp)
netlify sites:list --json > "${tmp_json}"

# Collect items in a stable order
network='['
for repo in $(printf '%s\n' "${!LABELS[@]}" | sort); do
  name="${LABELS[$repo]}"
  url=$(jq -r --arg n "$repo" '.[] | select(.name==$n) | (.ssl_url // .url)' "${tmp_json}")
  [[ -z "$url" || "$url" == "null" ]] && continue
  network="${network}{\"name\":\"${name}\",\"url\":\"${url}\"},"
done
if [[ "${network}" == "[" ]]; then
  network='[]'
else
  network="${network%,}]"
fi

# Update umbrella repo & deploy
work=$(mktemp -d)
git clone "https://github.com/${OWNER}/${UMBRELLA_REPO}.git" "${work}"
pushd "${work}" >/dev/null

mkdir -p assets
echo "${network}" | jq '.' > assets/network.json

# safety: ensure umbrella has an index and includes the fetch to assets/network.json
if ! grep -qi 'assets/network.json' index.html; then
  echo "NOTE: umbrella index.html should fetch assets/network.json to render links."
fi

git add assets/network.json
git commit -m "wire live network.json" || true
git push

site_id=$(netlify sites:list --json | jq -r ".[] | select(.name==\"${UMBRELLA_SITE_NAME}\") | .id")
netlify deploy --dir "." --prod --site "${site_id}" --message "umbrella update" >/dev/null

popd >/dev/null
rm -rf "${work}" "${tmp_json}"

echo "✅ Umbrella wired & redeployed."
