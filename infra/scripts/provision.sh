#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

dry_run=false
[[ "${1:-}" == "--dry-run" ]] && dry_run=true

root="${DEPLOY_ROOT:-/srv/241-apps}"
only_env="${PROVISION_ONLY_ENV:-}"
repo_url="${PROVISION_REPO_URL:-https://github.com/mts241alikhlash/241-apps.git}"
bucket=241-apps
db_role=mts241
services=(identity academic inventory presence portal admission hr student assessment exam)
declare -A ports=([identity]=3000 [academic]=3200 [inventory]=3300 [presence]=3400 [portal]=3600 [admission]=3700 [hr]=3800 [student]=3900 [assessment]=4000 [exam]=4100)

step() { echo "==> $*"; }
act() {
  if $dry_run; then
    echo "    would run: $*"
  else
    "$@"
  fi
}
db_password="" minio_url="" s3_key="" s3_secret="" db_host="" admin_password="" public_key=""
ask() {
  local -n target="$1"
  local label="$2" secret="${3:-}"
  if $dry_run; then
    target="<$label>"
    echo "    would prompt for: $label"
    return
  fi
  if [[ -n "$secret" ]]; then
    read -rs -p "$label: " target
    echo
  else
    read -r -p "$label: " target
  fi
}
random() { openssl rand -hex 24; }

if ! $dry_run && [[ -z "$only_env" && "$(id -u)" -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi
for tool in git docker psql curl openssl python3; do
  command -v "$tool" > /dev/null || { echo "missing tool: $tool" >&2; $dry_run || [[ -n "$only_env" ]] || exit 1; }
done

ask db_password "password for the PostgreSQL role $db_role" secret
if [[ -z "$only_env" ]]; then
step "user deploy"
if ! id deploy > /dev/null 2>&1; then
  act useradd -m -s /bin/bash -G docker deploy
fi

step "docker network 241-apps"
if ! docker network inspect 241-apps > /dev/null 2>&1; then
  act docker network create 241-apps
fi

step "PostgreSQL role $db_role with CREATEDB"
if $dry_run; then
  echo "    would create or update the role $db_role (LOGIN CREATEDB) with that password"
else
  escaped_password="${db_password//\'/\'\'}"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -f - <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$db_role') THEN
    CREATE ROLE $db_role LOGIN CREATEDB PASSWORD '$escaped_password';
  END IF;
END
\$\$;
ALTER ROLE $db_role LOGIN CREATEDB PASSWORD '$escaped_password';
SQL
fi

fi

need_env=false
for service in "${services[@]}"; do
  [[ -f "$root/infra/compose/env/$service-service.env" ]] || need_env=true
done

step "MinIO access key: prompt"
if $need_env; then
  ask minio_url "MinIO URL (for example http://127.0.0.1:9000)"
  ask s3_key "MinIO access key id (bound to a policy limited to bucket $bucket)"
  ask s3_secret "MinIO secret key" secret
  if ! $dry_run && [[ -z "$s3_key" || -z "$s3_secret" ]]; then
    echo "the access key id and the secret key are required" >&2
    exit 1
  fi
else
  echo "    env files exist, no access key needed"
fi

if [[ -z "$only_env" ]]; then
step "checkout of infra at $root"
if [[ ! -d "$root/.git" ]]; then
  act git clone --filter=blob:none --no-checkout "$repo_url" "$root"
  act git -C "$root" sparse-checkout set --no-cone '/infra/' '/services/*/.env.example'
  act git -C "$root" checkout main
fi
act chown -R deploy:deploy "$root"

step "compose override"
if [[ ! -f "$root/infra/compose/compose.override.yaml" ]]; then
  if $dry_run; then
    echo "    would copy compose.override.example.yaml (gateway on 127.0.0.1:8082)"
  else
    cp "$root/infra/compose/compose.override.example.yaml" "$root/infra/compose/compose.override.yaml"
  fi
fi

fi

step "service env files"
if $need_env; then
  ask db_host "PostgreSQL host reachable from the containers (for example the docker bridge address)"
  ask admin_password "admin password for the first deploy (12 characters or more)" secret
  PROV_JWT_SECRET="$(random)"
  PROV_TOKEN="$(random)"
  export PROV_DB_HOST="$db_host" PROV_DB_USER="$db_role" PROV_DB_PASSWORD="$db_password"
  export PROV_JWT_SECRET PROV_TOKEN PROV_ADMIN_PASSWORD="$admin_password"
  export PROV_S3_KEY="$s3_key" PROV_S3_SECRET="$s3_secret" PROV_S3_ENDPOINT="$minio_url" PROV_BUCKET="$bucket"
fi
ports_json="{"
for name in "${services[@]}"; do
  ports_json+="\"$name\":\"${ports[$name]}\","
done
ports_json="${ports_json%,}}"
for service in "${services[@]}"; do
  target="$root/infra/compose/env/$service-service.env"
  if [[ -f "$target" ]]; then
    echo "    keeping existing $target"
    continue
  fi
  if $dry_run; then
    echo "    would write $target from services/$service-service/.env.example"
    continue
  fi
  python3 "$here/provision-env.py" "$root/services/$service-service/.env.example" "$target" "$service" "$ports_json"
  [[ -n "$only_env" ]] || chown deploy:deploy "$target"
  echo "    wrote $target"
done
unset PROV_DB_HOST PROV_DB_USER PROV_DB_PASSWORD PROV_JWT_SECRET PROV_TOKEN PROV_ADMIN_PASSWORD PROV_S3_KEY PROV_S3_SECRET PROV_S3_ENDPOINT PROV_BUCKET
if ! $dry_run; then
  grep -lE 'example\.com|change-me' "$root"/infra/compose/env/*.env 2> /dev/null | while read -r file; do
    echo "    still holds example values, edit it: $file"
  done
fi

if [[ -z "$only_env" ]]; then
step "authorized_keys for deploy"
ask public_key "SSH public key of the deploy workflow (one line)"
entry="restrict,command=\"$root/infra/scripts/deploy-entry.sh\" $public_key"
if $dry_run; then
  echo "    would append the key with the forced command to /home/deploy/.ssh/authorized_keys"
else
  install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
  touch /home/deploy/.ssh/authorized_keys
  if ! grep -qF "$public_key" /home/deploy/.ssh/authorized_keys; then
    echo "$entry" >> /home/deploy/.ssh/authorized_keys
  fi
  chown deploy:deploy /home/deploy/.ssh/authorized_keys
  chmod 600 /home/deploy/.ssh/authorized_keys
fi
fi

step "done"
echo "    next: add the Environment secrets, then approve the first deploy"
