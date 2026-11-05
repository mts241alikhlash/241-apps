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

echo "bootstrap test passed ($total_before databases before)"
