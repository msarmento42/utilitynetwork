#!/usr/bin/env bash
set -euo pipefail

OWNER="msarmento42"
SRC_REPO="utilitynetwork"
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required in env}"

# Map monorepo folder -> new repo name
declare -A MAP=(
  [party-planner-pack]=utility-party-planner
  [cooking-core]=utility-cooking-core
  [home-project-calculators]=utility-home-project-calcs
  [home-energy-cost]=utility-home-energy-cost
  [travel-cost-minis]=utility-travel-cost-minis
  [template-pdf-generators]=utility-template-pdfs
  [work-money-utilities]=utility-work-money-utils
  [shopping-saver-tools]=utility-shopping-saver
  [subscription-tamer]=utility-subscription-tamer
  [holiday-event-minis]=utility-holiday-event-minis
  [cleaning-laundry-lab]=utility-cleaning-laundry
  [moving-storage-planner]=utility-moving-storage
  [yard-garden-planner]=utility-yard-garden
  [home-office-media-setup]=utility-home-office-media
  [time-scheduling-tools]=utility-time-scheduling-tools
  # umbrella:
  [utility-network-landing]=utility-umbrella
)

# 1) Create repos if they don't exist
for slug in "${!MAP[@]}"; do
  repo="${MAP[$slug]}"
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${OWNER}/${repo}")
  if [[ "$code" == "404" ]]; then
    echo "Creating repo ${OWNER}/${repo}"
    curl -sS -H "Authorization: token ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      -d "{\"name\":\"${repo}\",\"private\":false,\"auto_init\":true}" \
      https://api.github.com/user/repos >/dev/null
  else
    echo "Repo ${OWNER}/${repo} already exists"
  fi
done

# 2) Clone source monorepo
rm -rf work && git clone "https://${GITHUB_TOKEN}@github.com/${OWNER}/${SRC_REPO}.git" work
cd work
git config user.email "automation@local"
git config user.name  "automation"

# 3) Split & push each site folder to its repo
for slug in "${!MAP[@]}"; do
  repo="${MAP[$slug]}"
  if [[ ! -d "sites/${slug}" ]]; then
    echo "WARN: sites/${slug} missing, skipping"
    continue
  fi
  echo "Splitting ${slug} -> ${repo}"
  git subtree split --prefix="sites/${slug}" -b "split-${slug}"
  tmpdir=$(mktemp -d)
  git clone "https://${GITHUB_TOKEN}@github.com/${OWNER}/${repo}.git" "${tmpdir}"
  (cd "${tmpdir}" && git checkout -B main && git rm -rf . && git clean -fdx || true)
  git archive "split-${slug}" | (cd "${tmpdir}" && tar -x -f -)
  (cd "${tmpdir}" && git add -A && git commit -m "bootstrap from ${SRC_REPO}/sites/${slug}" && git push -f origin main)
  git branch -D "split-${slug}"
  rm -rf "${tmpdir}"
done

echo "✅ GitHub split complete."
