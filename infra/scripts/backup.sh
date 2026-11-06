#!/usr/bin/env bash
set -euo pipefail

root="${BACKUP_ROOT:-/var/backups/241-apps}"
keep="${BACKUP_KEEP_DAYS:-14}"
day="${BACKUP_DATE:-$(date +%F)}"
as_postgres="${BACKUP_AS_POSTGRES:-runuser -u postgres --}"
databases=(identity academic inventory presence portal admission hr student assessment exam)

umask 077
install -d -m 700 "$root"
target="$root/$day"
install -d -m 700 "$target"

failed=0
for db in "${databases[@]}"; do
  out="$target/$db.dump"
  # shellcheck disable=SC2086
  if $as_postgres pg_dump --format=custom --dbname="$db" --file="$out.partial"; then
    mv "$out.partial" "$out"
    echo "dumped $db"
  else
    rm -f "$out.partial"
    echo "FAILED $db" >&2
    failed=1
  fi
done

cutoff="$(date -d "$day - $((keep - 1)) days" +%F)"
for dir in "$root"/*/; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  [[ "$name" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || continue
  if [[ "$name" < "$cutoff" ]]; then
    rm -rf -- "$dir"
    echo "removed $name"
  fi
done

exit "$failed"
