#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

mkdir -p "$work/stubs" "$work/backups"
cat > "$work/stubs/pg_dump" <<'STUB'
#!/usr/bin/env bash
db="" file=""
for arg in "$@"; do
  case "$arg" in
    --dbname=*) db="${arg#--dbname=}" ;;
    --file=*) file="${arg#--file=}" ;;
  esac
done
printf '%s\n' "$*" >> "$STUB_LOG"
[[ "$db" == "${STUB_FAIL:-}" ]] && exit 1
echo "dump of $db"
[[ -z "$file" ]] || echo "dump of $db" > "$file"
STUB
chmod +x "$work/stubs/pg_dump"

export STUB_LOG="$work/pg_dump.log"
for old in 2026-10-20 2026-10-23 2026-10-24 2026-11-05; do mkdir -p "$work/backups/$old"; done
mkdir -p "$work/backups/not-a-date"

run() { PATH="$work/stubs:$PATH" BACKUP_ROOT="$work/backups" BACKUP_DATE=2026-11-06 BACKUP_AS_POSTGRES=env bash "$here/backup.sh"; }

run > "$work/out.log" 2>&1 || { cat "$work/out.log" >&2; fail "backup failed"; }

today="$work/backups/2026-11-06"
[[ "$(stat -c %a "$today")" == 700 ]] || fail "the day directory is not mode 700"
[[ "$(stat -c %a "$work/backups")" == 700 ]] || fail "the backup root is not mode 700"
dumps=("$today"/*.dump); count="${#dumps[@]}"
[[ "$count" == 10 ]] || fail "expected 10 dumps, got $count"
for db in identity academic inventory presence portal admission hr student assessment exam; do
  [[ -s "$today/$db.dump" ]] || fail "no dump for $db"
done
grep -q -- "--format=custom" "$work/pg_dump.log" || fail "pg_dump did not use the custom format"
# the dump runs as postgres and the backup tree is root-only, so this shell must create the file
grep -q -- "--file=" "$work/pg_dump.log" && fail "pg_dump was asked to write the file itself"

[[ ! -d "$work/backups/2026-10-20" && ! -d "$work/backups/2026-10-23" ]] || fail "directories older than 14 days were kept"
[[ -d "$work/backups/2026-10-24" && -d "$work/backups/2026-11-05" ]] || fail "directories inside 14 days were removed"
[[ -d "$work/backups/not-a-date" ]] || fail "a directory that is not a date was removed"

rm -rf "$today"
if STUB_FAIL=hr run > "$work/out2.log" 2>&1; then fail "a failed dump did not fail the run"; fi
[[ ! -e "$today/hr.dump" && ! -e "$today/hr.dump.partial" ]] || fail "a partial dump was left behind"
[[ -s "$today/exam.dump" ]] || fail "one failed database stopped the others"

grep -q "^ExecStart=/usr/local/sbin/241-apps-backup$" "$repo/infra/systemd/241-apps-backup.service" || fail "the service does not run the installed script"
grep -q "^Type=oneshot$" "$repo/infra/systemd/241-apps-backup.service" || fail "the service is not oneshot"
grep -q "^OnCalendar=\*-\*-\* 02:00:00 Asia/Jakarta$" "$repo/infra/systemd/241-apps-backup.timer" || fail "the timer is not 02:00 WIB"
grep -q "^Persistent=true$" "$repo/infra/systemd/241-apps-backup.timer" || fail "the timer is not persistent"
grep -q "^WantedBy=timers.target$" "$repo/infra/systemd/241-apps-backup.timer" || fail "the timer is not installable"

echo "backup test passed"
