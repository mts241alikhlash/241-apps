#!/usr/bin/env bash
set -euo pipefail

services=(identity academic admission hr inventory presence portal student assessment exam)

override="${DEPLOY_OVERRIDE:-compose/compose.override.yaml}"

dc() {
  docker compose -f compose/compose.yaml -f "$override" "$@"
}

report() {
  dc ps -a --format '{{.Name}} {{.State}} {{.Health}}'
  echo "==> read logs on the VPS: docker logs --tail 100 <name>"
}

docker_root="$(docker info --format '{{.DockerRootDir}}')"
free_kb="$(df --output=avail -k "$docker_root" | tail -1)"
if (( free_kb < 5 * 1024 * 1024 )); then
  echo "less than 5 GB free under $docker_root; free space before deploying" >&2
  exit 1
fi

gateway_port=8082
holders="$(docker ps --filter "publish=$gateway_port" --format '{{.Names}} {{.Label "com.docker.compose.project"}}')"
while read -r name project; do
  [[ -z "$name" ]] && continue
  if [[ "$project" != "241-apps" ]]; then
    echo "127.0.0.1:$gateway_port is held by container $name outside project 241-apps; stop it first" >&2
    exit 1
  fi
done <<< "$holders"
if [[ -z "$holders" ]] && ss -ltn "sport = :$gateway_port" 2> /dev/null | grep -q LISTEN; then
  echo "127.0.0.1:$gateway_port is held by a process that is not a 241-apps container" >&2
  exit 1
fi

echo "==> bootstrap"
scripts/bootstrap.sh

if [[ "${DEPLOY_PULL:-always}" != never ]]; then
  echo "==> pull"
  dc --profile migrate pull
fi

for service in "${services[@]}"; do
  echo "==> migrate $service"
  if ! dc --profile migrate run --rm "$service-service-migrate"; then
    echo "migration failed: $service" >&2
    exit 1
  fi
done

echo "==> seed permissions"
dc run --rm --entrypoint ./node_modules/.bin/tsx identity-service prisma/seed-permissions.ts

if grep -q '^SEED_ADMIN_PASSWORD=' compose/env/identity-service.env; then
  echo "==> seed admin"
  dc run --rm --entrypoint ./node_modules/.bin/tsx identity-service prisma/seed-admin-minimal.ts
fi

trap report ERR
echo "==> up"
dc up -d --wait --wait-timeout 300

checks="$(python3 - "${services[@]}" <<'PY'
import json
import sys

services = sys.argv[1:]
lock = json.load(open("deployment/lock.json"))
routes = {}
for app, pin in sorted(lock["apps"].items()):
    manifest = json.load(open(f"gateway/manifests/{app}-{pin['routesVersion']}.json"))
    for route in manifest["healthRoutes"]:
        routes.setdefault(route["service"], (pin["sslHost"], route["path"]))
missing = [service for service in services if service not in routes]
if missing:
    sys.exit(f"no health route for: {' '.join(missing)}")
for service in services:
    print(*routes[service])
PY
)"
address="$(dc port gateway 80)"
while read -r host path; do
  echo "==> health $host$path"
  curl -fsS -m 10 --retry 6 --retry-delay 5 --retry-all-errors -o /dev/null -H "Host: $host" "http://$address$path"
done <<< "$checks"

echo "==> remove unused platform images"
pinned="$(python3 - <<'PY'
import json

lock = json.load(open("deployment/lock.json"))
images = [lock["gatewayImage"]]
images += [pin["webImage"] for pin in lock["apps"].values()]
images += [pin["image"] for pin in lock["services"].values()]
print("\n".join(images))
PY
)"
used_images="$(docker ps -aq | xargs -r docker inspect --format '{{.Image}}' 2> /dev/null | sort -u)"
docker image ls --no-trunc --digests --format '{{.ID}} {{.Repository}}@{{.Digest}}' |
  awk '$2 ~ /^ghcr\.io\/mts241alikhlash\// { print $1, $2 }' |
  while read -r id reference; do
    printf '%s\n' "$used_images" | grep -qx "$id" && continue
    printf '%s\n' "$pinned" | grep -qxF "$reference" && continue
    docker image rm "$id" > /dev/null 2>&1 || true
  done

echo "==> deployed $(git rev-parse --short HEAD)"
