#!/usr/bin/env bash
set -euo pipefail

services=(identity academic admission hr inventory presence portal student assessment exam)
prefix="${BOOTSTRAP_DB_PREFIX:-}"
bucket="${BOOTSTRAP_BUCKET:-241-apps}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env_dir="${BOOTSTRAP_ENV_DIR:-$here/../compose/env}"

env_value() {
  grep -E "^$2=" "$env_dir/$1" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
}

pgpass=""
cleanup() { [[ -z "$pgpass" ]] || rm -f "$pgpass"; }
trap cleanup EXIT

if [[ -n "${BOOTSTRAP_PSQL:-}" ]]; then
  read -r -a psql_cmd <<< "$BOOTSTRAP_PSQL"
else
  pgpass="$(mktemp)"
  chmod 600 "$pgpass"
  connection="$(DB_URL="$(env_value identity-service.env DATABASE_URL)" PGPASS_FILE="$pgpass" python3 -c '
import os
from urllib.parse import unquote, urlsplit

parts = urlsplit(os.environ["DB_URL"])
host = os.environ.get("BOOTSTRAP_DB_HOST") or "127.0.0.1"
port = parts.port or 5432
user = unquote(parts.username or "")
password = unquote(parts.password or "")
escaped = password.replace("\\", "\\\\").replace(":", "\\:")
with open(os.environ["PGPASS_FILE"], "w") as handle:
    handle.write(f"{host}:{port}:*:{user}:{escaped}\n")
print(host, port, user)
')"
  read -r PGHOST PGPORT PGUSER <<< "$connection"
  export PGHOST PGPORT PGUSER PGPASSFILE="$pgpass" PGDATABASE=postgres
  psql_cmd=(psql)
fi

q() { "${psql_cmd[@]}" -v ON_ERROR_STOP=1 -Atc "$1"; }

for service in "${services[@]}"; do
  name="${prefix}${service}"
  if [[ -z "$(q "SELECT 1 FROM pg_database WHERE datname = '$name'")" ]]; then
    q "CREATE DATABASE \"$name\"" > /dev/null
    echo "created database $name"
  fi
done

if [[ "${BOOTSTRAP_SKIP_BUCKET:-}" == 1 ]]; then
  exit 0
fi

endpoint="${BOOTSTRAP_S3_ENDPOINT:-$(env_value portal-service.env S3_ENDPOINT)}"
key="${BOOTSTRAP_S3_KEY:-$(env_value portal-service.env S3_ACCESS_KEY_ID)}"
secret="${BOOTSTRAP_S3_SECRET:-$(env_value portal-service.env S3_SECRET_ACCESS_KEY)}"
region="${BOOTSTRAP_S3_REGION:-us-east-1}"
s3curl() {
  printf 'user = "%s:%s"\naws-sigv4 = "aws:amz:%s:s3"\n' "$key" "$secret" "$region" |
    curl -s -o /dev/null -K - "$@"
}

status="$(s3curl -w '%{http_code}' -I "$endpoint/$bucket")"
if [[ "$status" == 200 ]]; then
  exit 0
fi
status="$(s3curl -w '%{http_code}' -X PUT "$endpoint/$bucket")"
if [[ "$status" != 200 && "$status" != 409 ]]; then
  echo "could not create bucket $bucket (HTTP $status)" >&2
  exit 1
fi
echo "created bucket $bucket"
