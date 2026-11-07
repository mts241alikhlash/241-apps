#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
prefix="bt$$_"
bucket="bt$$-241-apps"
psql_cmd="${BOOTSTRAP_TEST_PSQL:-podman exec -i 241-apps_postgres_1 psql -U mts241 -d postgres}"
s3="${BOOTSTRAP_TEST_S3_ENDPOINT:-http://127.0.0.1:9000}"
services=(identity academic admission hr inventory presence portal student assessment exam)

fail() { echo "FAIL: $*" >&2; exit 1; }
q() { read -r -a cmd <<< "$psql_cmd"; "${cmd[@]}" -v ON_ERROR_STOP=1 -Atc "$1"; }

cleanup() {
  for s in "${services[@]}"; do q "DROP DATABASE IF EXISTS \"${prefix}${s}\"" > /dev/null 2>&1 || true; done
  curl -s -o /dev/null -X DELETE --aws-sigv4 "aws:amz:us-east-1:s3" --user "test:test" "$s3/$bucket" || true
}
trap cleanup EXIT

total_before="$(q "SELECT count(*) FROM pg_database")"
other_before="$(q "SELECT string_agg(datname, ',' ORDER BY datname) FROM pg_database WHERE datname NOT LIKE '${prefix}%'")"

run() {
  BOOTSTRAP_PSQL="$psql_cmd" BOOTSTRAP_DB_PREFIX="$prefix" BOOTSTRAP_BUCKET="$bucket" \
    BOOTSTRAP_S3_ENDPOINT="$s3" BOOTSTRAP_S3_KEY=test BOOTSTRAP_S3_SECRET=test \
    bash "$here/bootstrap.sh"
}

run > /dev/null
count="$(q "SELECT count(*) FROM pg_database WHERE datname LIKE '${prefix}%'")"
[[ "$count" -eq "${#services[@]}" ]] || fail "expected ${#services[@]} databases after the first run, got $count"

run > /dev/null || fail "the second run did not exit 0"
count="$(q "SELECT count(*) FROM pg_database WHERE datname LIKE '${prefix}%'")"
[[ "$count" -eq "${#services[@]}" ]] || fail "the second run changed the database count to $count"

other_after="$(q "SELECT string_agg(datname, ',' ORDER BY datname) FROM pg_database WHERE datname NOT LIKE '${prefix}%'")"
[[ "$other_before" == "$other_after" ]] || fail "another database was touched"

status="$(curl -s -o /dev/null -w '%{http_code}' -I --aws-sigv4 "aws:amz:us-east-1:s3" --user "test:test" "$s3/$bucket")"
[[ "$status" == 200 ]] || fail "the bucket was not created (HEAD $status)"

work="$(mktemp -d)"
trap 'rm -rf "$work"; cleanup' EXIT
real_curl="$(command -v curl)"
mkdir -p "$work/stubs" "$work/env"
cat > "$work/stubs/psql" <<STUB
#!/usr/bin/env bash
printf '%s\n' "\$@" >> "$work/argv.log"
printf '%s\n' "\$PGPASSFILE" >> "$work/pgpass.paths"
printf '%s\n' "\$PGHOST:\$PGPORT:\$PGUSER" >> "$work/conn.log"
cat "\$PGPASSFILE" >> "$work/pgpass.seen"
read -r -a cmd <<< "$psql_cmd"
exec "\${cmd[@]}" -v ON_ERROR_STOP=1 "\$@"
STUB
cat > "$work/stubs/curl" <<STUB
#!/usr/bin/env bash
printf '%s\n' "\$@" >> "$work/argv.log"
exec "$real_curl" "\$@"
STUB
chmod +x "$work/stubs/psql" "$work/stubs/curl"
printf 'DATABASE_URL="postgresql://mts241:PGSECRET9@localhost:5433/identity?sslmode=disable"\n' > "$work/env/identity-service.env"
printf 'S3_ENDPOINT=%s\nS3_ACCESS_KEY_ID=KEYIDSECRET9\nS3_SECRET_ACCESS_KEY=S3SECRET9\n' "$s3" > "$work/env/portal-service.env"

PATH="$work/stubs:$PATH" BOOTSTRAP_ENV_DIR="$work/env" BOOTSTRAP_DB_PREFIX="$prefix" BOOTSTRAP_BUCKET="$bucket" \
  bash "$here/bootstrap.sh" > /dev/null || fail "the run with env files and stubs failed"

[[ -s "$work/argv.log" ]] || fail "the stubs recorded no arguments"
grep -q 'ON_ERROR_STOP' "$work/argv.log" || fail "psql was not called through the stub"
grep -q 'aws:amz' "$work/pgpass.seen" 2> /dev/null && fail "unexpected content in the password file"
grep -q 'PGSECRET9' "$work/pgpass.seen" || fail "the password did not reach psql through PGPASSFILE"
for secret in PGSECRET9 KEYIDSECRET9 S3SECRET9 'postgresql://'; do
  if grep -qF -- "$secret" "$work/argv.log"; then fail "'$secret' appeared in argv"; fi
done
while read -r pgpass_path; do
  [[ ! -e "$pgpass_path" ]] || fail "the password file $pgpass_path was left behind"
done < "$work/pgpass.paths"

[[ "$(head -1 "$work/conn.log")" == "127.0.0.1:5433:mts241" ]] || fail "bootstrap connected to $(head -1 "$work/conn.log"), not the loopback"
grep -q '^127\.0\.0\.1:5433:' "$work/pgpass.seen" || fail "the password file does not match the connection host"

: > "$work/conn.log"
PATH="$work/stubs:$PATH" BOOTSTRAP_ENV_DIR="$work/env" BOOTSTRAP_DB_HOST=db.example.test BOOTSTRAP_DB_PREFIX="$prefix" \
  BOOTSTRAP_BUCKET="$bucket" bash "$here/bootstrap.sh" > /dev/null || fail "the run with BOOTSTRAP_DB_HOST failed"
[[ "$(head -1 "$work/conn.log")" == "db.example.test:5433:mts241" ]] || fail "BOOTSTRAP_DB_HOST was ignored: $(head -1 "$work/conn.log")"

echo "bootstrap test passed ($total_before databases before)"
