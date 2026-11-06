#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

mkdir -p "$work/stubs"
cat > "$work/stubs/psql" <<'STUB'
#!/usr/bin/env bash
sql=""
for ((i = 1; i <= $#; i++)); do
  [[ "${!i}" == "-c" ]] && { j=$((i + 1)); sql="${!j}"; }
done
if [[ -n "$sql" ]]; then
  printf 'q: %s\n' "$sql" >> "$STUB_LOG"
  case "$sql" in
    *pg_tables*) printf 'inventory_assets\ninventory_categories\n' ;;
    *"+ (SELECT count"*) echo "${STUB_EXISTING:-0}" ;;
    *) echo 3 ;;
  esac
else
  printf 'script:\n' >> "$STUB_LOG"
  cat >> "$STUB_LOG"
fi
STUB
cat > "$work/stubs/pg_restore" <<'STUB'
#!/usr/bin/env bash
printf 'pg_restore %s\n' "$*" >> "$STUB_LOG"
cat > /dev/null
cat <<'SQL'
COPY public._prisma_migrations (id) FROM stdin;
old-migration-row
\.

COPY public.inventory_assets (id) FROM stdin;
asset-1
\.
SQL
STUB
chmod +x "$work/stubs/psql" "$work/stubs/pg_restore"
: > "$work/dump"
export STUB_LOG="$work/log"

run() { PATH="$work/stubs:$PATH" RESTORE_PSQL=psql RESTORE_PG_RESTORE=pg_restore bash "$here/restore-inventory.sh" "$@"; }

if run > "$work/noarg.log" 2>&1; then fail "no dump argument was accepted"; fi

: > "$STUB_LOG"
STUB_EXISTING=5 run "$work/dump" > "$work/refuse.log" 2>&1 && fail "a database with asset rows was not refused"
grep -q "refusing" "$work/refuse.log" || fail "the refusal is not explained"
if grep -q "^script:" "$STUB_LOG"; then fail "something was restored before the refusal"; fi

: > "$STUB_LOG"
run "$work/dump" > "$work/ok.log" 2>&1 || { cat "$work/ok.log" >&2; fail "the restore failed"; }
grep -q "row counts before" "$work/ok.log" || fail "counts are not printed before"
grep -q "row counts after" "$work/ok.log" || fail "counts are not printed after"
grep -q -- "--data-only --disable-triggers" "$STUB_LOG" || fail "pg_restore is not data-only with triggers disabled"
grep -q 'TRUNCATE TABLE "inventory_assets","inventory_categories" CASCADE;' "$STUB_LOG" || fail "the reference tables are not emptied inside the transaction"
if grep -q "_prisma_migrations" <(sed -n '/^script:/,$p' "$STUB_LOG"); then fail "the migration history rows were restored"; fi
grep -q "COPY public.inventory_assets" "$STUB_LOG" || fail "the asset data is missing from the script"
trunc="$(grep -n 'TRUNCATE' "$STUB_LOG" | head -1 | cut -d: -f1)"
copy="$(grep -n 'COPY public.inventory_assets' "$STUB_LOG" | head -1 | cut -d: -f1)"
(( trunc < copy )) || fail "the truncate does not come before the data"

psql_real="${RESTORE_TEST_PSQL:-}"
dump_real="${RESTORE_TEST_DUMP:-$HOME/backups/241apps-polyrepo-20261106/inventory_prod.dump}"
restore_real="${RESTORE_TEST_PG_RESTORE:-}"
if [[ -z "$psql_real" ]] && podman exec 241-apps_postgres_1 true > /dev/null 2>&1; then
  psql_real="podman exec -i 241-apps_postgres_1 psql -U mts241"
  restore_real="podman exec -i 241-apps_postgres_1 pg_restore"
fi
if [[ -n "$psql_real" && -f "$dump_real" ]]; then
  admin() { $psql_real -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -qAt -c "$1"; }
  admin "DROP DATABASE IF EXISTS inventory_restore_test"
  admin "CREATE DATABASE inventory_restore_test"
  trap 'admin "DROP DATABASE IF EXISTS inventory_restore_test" > /dev/null 2>&1 || true; rm -rf "$work"' EXIT
  for migration in "$repo"/services/inventory-service/prisma/migrations/*/migration.sql; do
    $psql_real -d inventory_restore_test --no-psqlrc -v ON_ERROR_STOP=1 -q < "$migration" > /dev/null
  done
  $psql_real -d inventory_restore_test --no-psqlrc -v ON_ERROR_STOP=1 -q -c "CREATE TABLE _prisma_migrations (id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0); INSERT INTO _prisma_migrations (id, checksum, migration_name) VALUES ('new-stack', 'x', '20261004000000_init')"
  real() { RESTORE_DB=inventory_restore_test RESTORE_PSQL="$psql_real" RESTORE_PG_RESTORE="$restore_real" bash "$here/restore-inventory.sh" "$dump_real"; }
  real > "$work/real.log" 2>&1 || { cat "$work/real.log" >&2; fail "the real restore failed"; }
  assets="$($psql_real -d inventory_restore_test --no-psqlrc -qAt -c 'SELECT count(*) FROM inventory_assets')"
  units="$($psql_real -d inventory_restore_test --no-psqlrc -qAt -c 'SELECT count(*) FROM inventory_asset_units')"
  [[ "$assets" == 90 && "$units" == 615 ]] || fail "expected 90 assets and 615 units, got $assets and $units"
  migrations="$($psql_real -d inventory_restore_test --no-psqlrc -qAt -c 'SELECT count(*) FROM _prisma_migrations')"
  [[ "$migrations" == 1 ]] || fail "the migration history of the target was changed ($migrations rows)"
  if real > "$work/real2.log" 2>&1; then fail "a second restore was not refused"; fi
  grep -q refusing "$work/real2.log" || fail "the second restore did not say why it refused"
  echo "real restore: $assets assets, $units units"
else
  echo "real restore skipped: no local Postgres or no dump"
fi

echo "restore-inventory test passed"
