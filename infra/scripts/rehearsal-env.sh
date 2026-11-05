#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
state="${REHEARSAL_DIR:-$HOME/.local/share/241-apps-rehearsal}"
tag="${REHEARSAL_TAG:-rehearsal}"
port="${REHEARSAL_TLS_PORT:-8443}"
services=(identity academic inventory presence portal admission hr student assessment exam)
declare -A ports=([identity]=3000 [academic]=3200 [inventory]=3300 [presence]=3400 [portal]=3600 [admission]=3700 [hr]=3800 [student]=3900 [assessment]=4000 [exam]=4100)

umask 077
mkdir -p "$state/env" "$state/caddy"
random() { openssl rand -hex 24; }

hosts_json="$(python3 -c '
import json, sys
lock = json.load(open(sys.argv[1]))
print(json.dumps({app: pin["sslHost"] for app, pin in lock["apps"].items()}))
' "$repo/infra/deployment/lock.json")"

ports_json="{"
for name in "${services[@]}"; do
  ports_json+="\"$name\":\"${ports[$name]}\","
done
ports_json="${ports_json%,}}"

export PROV_DB_HOST=postgres PROV_DB_USER=mts241 PROV_DB_PASSWORD=mts241
PROV_JWT_SECRET="$(random)"
PROV_TOKEN="$(random)"
if [[ -s "$state/admin-password" ]]; then
  PROV_ADMIN_PASSWORD="$(cat "$state/admin-password")"
else
  PROV_ADMIN_PASSWORD="$(random)"
fi
export PROV_JWT_SECRET PROV_TOKEN PROV_ADMIN_PASSWORD
PROV_EXAM_ACCESS_SECRET="$(openssl rand -hex 32)"
PROV_GOOGLE_SECRET="$(random)"
export PROV_EXAM_ACCESS_SECRET PROV_GOOGLE_SECRET PROV_GOOGLE_ID=rehearsal-client.apps.googleusercontent.com
export PROV_S3_KEY=rehearsal PROV_S3_SECRET=rehearsal PROV_S3_ENDPOINT=http://s3:8333 PROV_BUCKET=241-apps
export REHEARSAL_HOSTS="$hosts_json" REHEARSAL_PORT="$port"

for service in "${services[@]}"; do
  target="$state/env/$service-service.env"
  rm -f "$target"
  python3 "$here/provision-env.py" "$repo/services/$service-service/.env.example" "$target" "$service" "$ports_json"
  python3 "$here/rehearsal-env-edit.py" "$target"
done
unset PROV_GOOGLE_ID PROV_GOOGLE_SECRET PROV_EXAM_ACCESS_SECRET PROV_DB_HOST PROV_DB_USER PROV_DB_PASSWORD PROV_JWT_SECRET PROV_TOKEN PROV_S3_KEY PROV_S3_SECRET PROV_S3_ENDPOINT PROV_BUCKET

printf '%s\n' "$PROV_ADMIN_PASSWORD" > "$state/admin-password"
printf 'TRUST_PROXY=2\n' > "$state/compose.env"

mkdir -p "$repo/infra/compose/env"
for service in "${services[@]}"; do
  ln -sf "$state/env/$service-service.env" "$repo/infra/compose/env/$service-service.env"
done
ln -sf "$state/compose.env" "$repo/infra/compose/.env"

dns="$(podman network inspect 241-apps --format '{{range .Subnets}}{{.Gateway}}{{end}}')"
sed "s#^resolver 127.0.0.11#resolver $dns#" "$repo/infra/gateway/nginx.conf" > "$state/nginx.conf"

REHEARSAL_STATE="$state" REHEARSAL_TAG="$tag" python3 "$here/rehearsal-override.py" "$repo/infra/compose/compose.yaml" > "$state/compose.override.yaml"

echo "state: $state"
echo "override: $state/compose.override.yaml"
echo "admin password (printed once, also in $state/admin-password): $PROV_ADMIN_PASSWORD"
