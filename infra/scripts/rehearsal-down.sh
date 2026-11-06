#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
state="${REHEARSAL_DIR:-$HOME/.local/share/241-apps-rehearsal}"
tag="${REHEARSAL_TAG:-rehearsal}"

echo "==> before"
podman system df || true

echo "==> stop the Compose project"
docker compose -f "$repo/infra/compose/compose.yaml" -f "$state/compose.override.yaml" --profile storage down -v || true

echo "==> stop the TLS front"
bash "$here/rehearsal-caddy.sh" down || true

echo "==> remove the env links"
rm -f "$repo"/infra/compose/env/*-service.env "$repo/infra/compose/.env"

echo "==> remove the network"
podman network rm 241-apps > /dev/null 2>&1 || true

leftover="$(docker ps --filter label=com.docker.compose.project=241-apps --format '{{.Names}}' | grep -vE 'postgres|s3' || true)"
if [[ -n "$leftover" ]]; then
  echo "containers of project 241-apps still running:" >&2
  echo "$leftover" >&2
  exit 1
fi

echo "==> remove the rehearsal images"
while IFS= read -r image; do
  [[ -n "$image" ]] || continue
  podman rmi "$image" > /dev/null 2>&1 || true
done < <(podman images --format '{{.Repository}}:{{.Tag}}' | grep -E "^localhost/241-apps/[^:]+:${tag}\$" || true)
podman image prune -f > /dev/null 2>&1 || true

echo "==> start the dev storage"
podman start 241-apps_postgres_1 241-apps_s3_1 > /dev/null 2>&1 || true

echo "==> after"
podman system df || true
