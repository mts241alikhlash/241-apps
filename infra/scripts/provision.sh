#!/usr/bin/env bash
set -euo pipefail

dry_run=false
[[ "${1:-}" == "--dry-run" ]] && dry_run=true

root=/srv/241-apps
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
db_password="" minio_root_user="" minio_root_password="" minio_url="" db_host="" admin_password="" public_key=""
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
urlencode() { python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"; }

if ! $dry_run && [[ "$(id -u)" -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi
for tool in git docker psql curl openssl python3 mc; do
  command -v "$tool" > /dev/null || { echo "missing tool: $tool" >&2; $dry_run || exit 1; }
done

step "user deploy"
if ! id deploy > /dev/null 2>&1; then
  act useradd -m -s /bin/bash -G docker deploy
fi

step "docker network 241-apps"
if ! docker network inspect 241-apps > /dev/null 2>&1; then
  act docker network create 241-apps
fi

step "PostgreSQL role $db_role with CREATEDB"
ask db_password "password for the PostgreSQL role $db_role" secret
if $dry_run; then
  echo "    would create or update the role $db_role (LOGIN CREATEDB) with that password"
else
  sudo -u postgres psql -v ON_ERROR_STOP=1 -v pw="$db_password" -f - <<'SQL'
SELECT format('CREATE ROLE mts241 LOGIN CREATEDB PASSWORD %L', :'pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mts241')
\gexec
SELECT format('ALTER ROLE mts241 LOGIN CREATEDB PASSWORD %L', :'pw')
\gexec
SQL
fi

step "MinIO user and policy for bucket $bucket"
ask minio_root_user "MinIO root user"
ask minio_root_password "MinIO root password" secret
ask minio_url "MinIO URL (for example http://127.0.0.1:9000)"
s3_key="$(random)"
s3_secret="$(random)"
if $dry_run; then
  echo "    would create the policy 241-apps-bucket and a service user limited to s3://$bucket"
else
  policy="$(mktemp)"
  cat > "$policy" <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:*"],"Resource":["arn:aws:s3:::$bucket","arn:aws:s3:::$bucket/*"]}]}
JSON
  MC_HOST_provision="${minio_url%%://*}://$minio_root_user:$minio_root_password@${minio_url#*://}"
  export MC_HOST_provision
  mc admin policy create provision 241-apps-bucket "$policy" > /dev/null 2>&1 || mc admin policy create provision 241-apps-bucket "$policy"
  mc admin user add provision "$s3_key" "$s3_secret" > /dev/null
  mc admin policy attach provision 241-apps-bucket --user "$s3_key" > /dev/null 2>&1 || true
  rm -f "$policy"
fi

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

step "service env files"
ask db_host "PostgreSQL host reachable from the containers (for example the docker bridge address)"
ask admin_password "admin password for the first deploy (12 characters or more)" secret
jwt_secret="$(random)"
provisioning_token="$(random)"
encoded_password="$(urlencode "$db_password")"
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
  url="postgresql://$db_role:$encoded_password@$db_host:5432/$service?sslmode=disable"
  sed -E \
    -e "s#^DATABASE_URL=.*#DATABASE_URL=\"$url\"#" \
    -e "s#^DIRECT_URL=.*#DIRECT_URL=\"$url\"#" \
    -e "s#^NODE_ENV=.*#NODE_ENV=production#" \
    -e "s#^PORT=.*#PORT=${ports[$service]}#" \
    -e "s#^JWT_SECRET=.*#JWT_SECRET=$jwt_secret#" \
    -e "s#^PROVISIONING_SERVICE_TOKEN=.*#PROVISIONING_SERVICE_TOKEN=$provisioning_token#" \
    -e "s#^S3_ACCESS_KEY_ID=.*#S3_ACCESS_KEY_ID=$s3_key#" \
    -e "s#^S3_SECRET_ACCESS_KEY=.*#S3_SECRET_ACCESS_KEY=$s3_secret#" \
    -e "s#^S3_ENDPOINT=.*#S3_ENDPOINT=$minio_url#" \
    -e "s#^S3_BUCKET=.*#S3_BUCKET=$bucket#" \
    -e "s#^([A-Z]+)_SERVICE_URL=.*#\1_SERVICE_URL=http://\L\1\E-service:xport#" \
    "$root/services/$service-service/.env.example" > "$target"
  for name in "${services[@]}"; do
    sed -i "s#http://$name-service:xport#http://$name-service:${ports[$name]}#" "$target"
  done
  if [[ "$service" == identity ]]; then
    sed -i "s#^SEED_ADMIN_PASSWORD=.*#SEED_ADMIN_PASSWORD=$admin_password#" "$target"
  fi
  chown deploy:deploy "$target"
  chmod 600 "$target"
  echo "    wrote $target"
done
if ! $dry_run; then
  grep -lE 'example\.com|change-me' "$root"/infra/compose/env/*.env 2> /dev/null | while read -r file; do
    echo "    still holds example values, edit it: $file"
  done
fi

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

step "done"
echo "    next: add the Environment secrets, then approve the first deploy"
