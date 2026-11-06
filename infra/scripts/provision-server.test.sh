#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

state="$work/state"
mkdir -p "$work/stubs" "$work/etc" "$work/backup" "$state"
cat > "$work/etc/pg_hba.conf" <<'HBA'
local   all             postgres                                peer
host    all             all             127.0.0.1/32            scram-sha-256
HBA

# the stubs read their state from files, so the test can emulate what the server would look like
# after each run (the network exists, PostgreSQL restarted with the new listen_addresses, ...)
cat > "$work/stubs/docker" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$STUB_LOG"
case "$*" in
  "network ls --format {{.Name}}") cut -d' ' -f1 "$STUB_NETWORKS" ;;
  "network inspect "*" --format {{range .IPAM.Config}}{{.Subnet}} {{end}}")
    awk -v n="$3" '$1 == n { print $2 " "; found = 1 } END { exit(found ? 0 : 1) }' "$STUB_NETWORKS" || exit 1
    ;;
esac
exit 0
STUB
cat > "$work/stubs/psql" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$STUB_LOG"
for arg in "$@"; do
  if [[ "$arg" == "show listen_addresses" ]]; then cat "$STUB_LISTEN"; fi
done
exit 0
STUB
cat > "$work/stubs/systemctl" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$STUB_LOG"
exit 0
STUB
cat > "$work/stubs/ufw" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$STUB_LOG"
[[ "${1:-}" == status ]] && cat "$STUB_UFW"
exit 0
STUB
cat > "$work/stubs/ss" <<'STUB'
#!/usr/bin/env bash
cat "$STUB_SS"
STUB
chmod +x "$work"/stubs/*

run() {
  PATH="$work/stubs:$PATH" STUB_LOG="$work/argv.log" PSQL_CMD=psql \
    STUB_NETWORKS="$state/networks" STUB_LISTEN="$state/listen" STUB_UFW="$state/ufw" STUB_SS="$state/ss" \
    PG_HBA_FILE="$work/etc/pg_hba.conf" PG_HBA_BACKUP_DIR="$work/backup" \
    bash "$here/provision-server.sh" "$@"
}
snapshot() { { cat "$work/etc/pg_hba.conf"; ls "$work/backup"; } | sha256sum; }

printf 'bridge 172.17.0.0/16\npemuda-cirengit_default 172.19.0.0/16\n' > "$state/networks"
printf 'localhost,172.18.0.1\n' > "$state/listen"
: > "$state/ufw"
printf 'LISTEN 0      200    172.30.0.1:5432       0.0.0.0:*\n' > "$state/ss"

before="$(snapshot)"
out="$(run --dry-run 2>&1)" || fail "the dry run failed: $out"
[[ "$(snapshot)" == "$before" ]] || fail "the dry run changed files"
[[ ! -s "$work/argv.log" ]] || fail "the dry run called a tool"
grep -q 'would create the network 241-apps' <<< "$out" || fail "the dry run does not show the network"
grep -q 'would set listen_addresses' <<< "$out" || fail "the dry run does not show PostgreSQL"
grep -q 'would allow' <<< "$out" || fail "the dry run does not show the firewall rules"

: > "$work/argv.log"
out="$(run 2>&1)" || { echo "$out" >&2; fail "provisioning the server failed"; }
grep -qx 'network create --subnet 172.30.0.0/16 --gateway 172.30.0.1 -o com.docker.network.bridge.name=br-241-apps 241-apps' "$work/argv.log" \
  || fail "the network was not created with the fixed subnet, gateway and bridge name"
grep -q "ALTER SYSTEM SET listen_addresses = 'localhost,172.18.0.1,172.30.0.1'" "$work/argv.log" || fail "listen_addresses was not extended"
grep -qx 'restart postgresql@16-main' "$work/argv.log" || fail "PostgreSQL was not restarted after the change"
grep -qx "allow in on br-241-apps from 172.30.0.0/16 to 172.30.0.1 port 5432 proto tcp comment 241-apps postgres" "$work/argv.log" || fail "the postgres rule is missing"
grep -qx "allow in on br-241-apps from 172.30.0.0/16 to 172.30.0.1 port 9000 proto tcp comment 241-apps minio" "$work/argv.log" || fail "the MinIO rule is missing"
grep -q '^local   all             postgres                                peer$' "$work/etc/pg_hba.conf" || fail "the existing pg_hba content was lost"
[[ "$(grep -c 'host    postgres,identity,academic,inventory,presence,portal,admission,hr,student,assessment,exam    mts241    172.30.0.0/16    scram-sha-256' "$work/etc/pg_hba.conf")" == 1 ]] || fail "the pg_hba line is missing or duplicated"
[[ "$(ls "$work/backup" | wc -l)" == 1 ]] || fail "pg_hba.conf was not backed up"

# what the server looks like after that run
printf 'localhost,172.18.0.1,172.30.0.1\n' > "$state/listen"
printf '241-apps 172.30.0.0/16\n' >> "$state/networks"
printf '241-apps postgres\n241-apps minio\n' > "$state/ufw"
cp "$work/etc/pg_hba.conf" "$work/hba-after-first.conf"

: > "$work/argv.log"
out="$(run 2>&1)" || { echo "$out" >&2; fail "the second run failed"; }
grep -q '^network create' "$work/argv.log" && fail "the second run created the network again"
grep -q 'ALTER SYSTEM' "$work/argv.log" && fail "the second run ran ALTER SYSTEM again"
grep -q '^restart ' "$work/argv.log" && fail "the second run restarted PostgreSQL again"
grep -q '^allow ' "$work/argv.log" && fail "the second run added firewall rules again"
cmp -s "$work/hba-after-first.conf" "$work/etc/pg_hba.conf" || fail "the second run changed pg_hba.conf"
[[ "$(ls "$work/backup" | wc -l)" == 1 ]] || fail "the second run backed pg_hba.conf up again"

printf 'bridge 172.17.0.0/16\npemuda-cirengit_default 172.19.0.0/16\nother 172.30.0.0/16\n' > "$state/networks"
before_clash="$(snapshot)"
: > "$work/argv.log"
if run > "$work/clash.log" 2>&1; then fail "a network already on the subnet did not stop the run"; fi
grep -q '^network create' "$work/argv.log" && fail "the network was created despite the clash"
[[ "$(snapshot)" == "$before_clash" ]] || fail "the clash changed files"
grep -q '172.30.0.0/16' "$work/clash.log" || fail "the clash message does not name the subnet"

printf '241-apps 172.30.0.0/16\n' > "$state/networks"
: > "$state/ss"
if run > "$work/nolisten.log" 2>&1; then fail "a missing PostgreSQL listener did not stop the run"; fi
grep -q '172.30.0.1:5432' "$work/nolisten.log" || fail "the failure does not name the listener"

echo "provision-server test passed"
