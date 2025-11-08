#!/usr/bin/env bash
set -euo pipefail

OWNER="msarmento42"
: "${NETLIFY_AUTH_TOKEN:?NETLIFY_AUTH_TOKEN is required in env}"

# Reuse the same map as above (copy/paste if executing separately)
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

npm i -g netlify-cli >/dev/null 2>&1 || true

# Helper: get site id by name (empty if not found)
get_site_id() {
  local name="$1"
  netlify sites:list --json 2>/dev/null | jq -r ".[] | select(.name==\"${name}\") | .id" | sed 's/null//'
}

for slug in "${!MAP[@]}"; do
  repo="${MAP[$slug]}"
  site_name="${repo}"            # Netlify subdomain name
  echo "==> Processing ${repo} -> Netlify site ${site_name}"

  work=$(mktemp -d)
  git clone "https://github.com/${OWNER}/${repo}.git" "${work}"
  pushd "${work}" >/dev/null

  # Ensure a minimal netlify.toml (optional: publish is repo root)
  if [[ ! -f netlify.toml ]]; then
    cat > netlify.toml <<'EOT'
[build]
  publish = "."
EOT
  fi

  # Create site if needed (non-interactive) and capture id
  site_id="$(get_site_id "${site_name}")"
  if [[ -z "${site_id}" ]]; then
    # The CLI docs show linking existing projects & using deploy with --site.
    # We'll create by first deploy; if CLI prompts are disabled by token, this works.
    echo "Creating Netlify site ${site_name}"
    netlify sites:create --name "${site_name}" >/dev/null
    site_id="$(get_site_id "${site_name}")"
  fi
  echo "Site id: ${site_id}"

  # First production deploy from repo root
  # (CLI supports --dir and --prod; you can pass --site <id> to target a site)
  netlify deploy --dir "." --prod --site "${site_id}" --message "initial deploy" >/dev/null

  popd >/dev/null
  rm -rf "${work}"
done

echo "✅ Netlify create + deploy complete."
