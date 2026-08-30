#!/usr/bin/env bash
set -Eeuo pipefail

APP_RUNTIME_ENV="staging"
ENV_FILE="/etc/vc-organic/staging.env"
RELEASE_ROOT="/opt/vc-organic-staging-releases"
CURRENT_LINK="/opt/vc-organic-staging-current"
PREVIOUS_LINK="/opt/vc-organic-staging-previous"
ECOSYSTEM_FILE="ops/ecosystem.staging.config.js"
API_PROCESS="vc-organic-api-staging"
WEB_PROCESS="vc-organic-web-staging"
API_PORT="8281"
WEB_PORT="3000"
API_HEALTH_URL="http://127.0.0.1:${API_PORT}/health"
WEB_HEALTH_URL="http://127.0.0.1:${WEB_PORT}"
LOCK_FILE="/tmp/vc-organic-staging-deploy.lock"
COMMIT_REF="${1:-origin/migration/frontend-v2}"
REPO_URL="${VC_ORGANIC_REPO_URL:-$(git config --get remote.origin.url 2>/dev/null || true)}"

if [[ -z "${REPO_URL}" ]]; then
  echo "VC_ORGANIC_REPO_URL or a git remote origin is required." >&2
  exit 1
fi

exec 9>"${LOCK_FILE}"
flock -n 9 || { echo "Another staging deployment is already running." >&2; exit 1; }

source_env() {
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  export APP_RUNTIME_ENV NODE_ENV="production" PORT="${API_PORT}"
}

require_env() {
  [[ -f "${ENV_FILE}" ]] || { echo "Missing ${ENV_FILE}" >&2; exit 1; }
  source_env
  for key in JWT_SECRET MONGODB_URI UPLOAD_PATH; do
    [[ -n "${!key:-}" ]] || { echo "${key} is required in ${ENV_FILE}" >&2; exit 1; }
  done
}

resolve_commit() {
  git fetch origin migration/frontend-v2
  git rev-parse "${COMMIT_REF}^{commit}"
}

prepare_release() {
  local commit="$1"
  local release_dir="${RELEASE_ROOT}/${commit}"
  mkdir -p "${RELEASE_ROOT}"
  if [[ ! -d "${release_dir}/.git" ]]; then
    git clone --no-checkout "${REPO_URL}" "${release_dir}"
  fi
  git -C "${release_dir}" fetch origin migration/frontend-v2
  git -C "${release_dir}" checkout --force "${commit}"
  git -C "${release_dir}" clean -fdx
  echo "${release_dir}"
}

install_and_build() {
  local release_dir="$1"
  source_env
  export NEXT_PUBLIC_API_BASE_URL="https://api-staging.vcorganics.com"
  export NEXT_PUBLIC_API_URL="https://api-staging.vcorganics.com"
  export NEXT_PUBLIC_APP_ENV="staging"
  npm ci --prefix "${release_dir}"
  npm run build -w apps/web --prefix "${release_dir}"
}

assert_port_not_foreign() {
  local port="$1"
  local expected="$2"
  local listeners
  listeners="$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  [[ -z "${listeners}" ]] && return 0
  if pm2 jlist | node -e "
const fs=require('fs');
const service='${expected}';
const pids=new Set(String('${listeners}').split(/\\s+/).filter(Boolean));
const apps=JSON.parse(fs.readFileSync(0,'utf8'));
const ok=apps.some(app => app.name === service && pids.has(String(app.pid)));
process.exit(ok ? 0 : 1);
"; then
    return 0
  fi
  echo "Port ${port} is already owned by a non-${expected} listener: ${listeners}" >&2
  exit 1
}

health_check() {
  local url="$1"
  local label="$2"
  for _ in {1..30}; do
    if curl -fsS --max-time 3 "${url}" >/dev/null; then
      echo "${label} health check passed: ${url}"
      return 0
    fi
    sleep 2
  done
  echo "${label} health check failed: ${url}" >&2
  return 1
}

rollback() {
  if [[ -L "${PREVIOUS_LINK}" ]]; then
    local previous
    previous="$(readlink -f "${PREVIOUS_LINK}")"
    ln -sfn "${previous}" "${CURRENT_LINK}"
    pm2 startOrReload "${previous}/${ECOSYSTEM_FILE}" --only "${API_PROCESS},${WEB_PROCESS}" --update-env
    pm2 save
    echo "Rolled back to ${previous}" >&2
  fi
}

retain_releases() {
  local active previous
  active="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
  previous="$(readlink -f "${PREVIOUS_LINK}" 2>/dev/null || true)"
  find "${RELEASE_ROOT}" -mindepth 1 -maxdepth 1 -type d | while read -r dir; do
    [[ "${dir}" == "${active}" || "${dir}" == "${previous}" ]] && continue
    rm -rf "${dir}"
  done
}

main() {
  require_env
  local commit release_dir old_active
  commit="$(resolve_commit)"
  release_dir="$(prepare_release "${commit}")"
  old_active="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
  install_and_build "${release_dir}"
  APP_RUNTIME_ENV="${APP_RUNTIME_ENV}" node "${release_dir}/scripts/deploy-check.js" --env staging --no-health --no-pm2 --no-cwd --no-port
  assert_port_not_foreign "${API_PORT}" "${API_PROCESS}"
  assert_port_not_foreign "${WEB_PORT}" "${WEB_PROCESS}"
  [[ -n "${old_active}" ]] && ln -sfn "${old_active}" "${PREVIOUS_LINK}"
  ln -sfn "${release_dir}" "${CURRENT_LINK}"
  if ! pm2 startOrReload "${release_dir}/${ECOSYSTEM_FILE}" --only "${API_PROCESS},${WEB_PROCESS}" --update-env; then
    rollback
    exit 1
  fi
  if ! health_check "${API_HEALTH_URL}" "API" || ! health_check "${WEB_HEALTH_URL}" "Web"; then
    rollback
    exit 1
  fi
  pm2 save
  retain_releases
  echo "Staging deployed ${commit}"
}

main "$@"
