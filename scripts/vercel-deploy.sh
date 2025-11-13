#!/usr/bin/env bash
set -euo pipefail

: "${VERCEL_TOKEN:?Missing VERCEL_TOKEN in env}"
: "${VERCEL_TEAM:?Missing VERCEL_TEAM in env}"

# optional: speed up installs in CI
export CI=1

# Umbrella first
echo "Deploying umbrella: sites/utility-network-landing"
vercel deploy sites/utility-network-landing \
  --prod --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_TEAM"

# Then each micro-site (adjust list if needed)
for d in \
  party-planner-pack cooking-core work-money-utilities home-energy-cost \
  template-pdf-generators travel-cost-minis cleaning-laundry-lab \
  moving-storage-planner yard-garden-planner home-project-calculators \
  shopping-saver-tools subscription-tamer holiday-event-minis \
  home-office-media-setup time-scheduling-tools
do
  echo "Deploying $d"
  vercel deploy "sites/$d" \
    --prod --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_TEAM"
done
