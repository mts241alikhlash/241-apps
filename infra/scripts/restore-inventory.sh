#!/usr/bin/env bash
set -euo pipefail

dump="${1:-}"
[[ -n "$dump" && -f "$dump" ]] || { echo "usage: restore-inventory.sh <inventory_prod.dump>" >&2; exit 2; }

db="${RESTORE_DB:-inventory}"
read -r -a psql <<< "${RESTORE_PSQL:-runuser -u postgres -- psql}"
read -r -a pg_restore <<< "${RESTORE_PG_RESTORE:-pg_restore}"

q() { "${psql[@]}" --dbname="$db" --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 -c "$1"; }

tables="$(q "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' ORDER BY tablename")"
[[ -n "$tables" ]] || { echo "database $db has no tables: run the first deploy before restoring" >&2; exit 1; }

counts() {
  local table
  while IFS= read -r table; do
    printf '%s %s\n' "$table" "$(q "SELECT count(*) FROM \"$table\"")"
  done <<< "$tables"
}

existing="$(q "SELECT (SELECT count(*) FROM inventory_assets) + (SELECT count(*) FROM inventory_asset_units) + (SELECT count(*) FROM inventory_loans) + (SELECT count(*) FROM inventory_histories)")"
if [[ "$existing" != 0 ]]; then
  echo "refusing: $db already has asset, unit, loan or history rows ($existing)" >&2
  exit 1
fi

echo "==> row counts before"
counts

truncate_list=""
while IFS= read -r table; do
  truncate_list+="${truncate_list:+,}\"$table\""
done <<< "$tables"
{
  echo "TRUNCATE TABLE $truncate_list CASCADE;"
  "${pg_restore[@]}" --data-only --disable-triggers --no-owner -f - < "$dump" | awk '
    /^COPY public\._prisma_migrations / { skip = 1 }
    !skip { print }
    skip && /^\\\.$/ { skip = 0 }
  '
} | "${psql[@]}" --dbname="$db" --no-psqlrc --single-transaction --set=ON_ERROR_STOP=1 --quiet > /dev/null

echo "==> row counts after"
counts
