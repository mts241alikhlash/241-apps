#!/usr/bin/env bash
set -euo pipefail

dry_run=false
[[ "${1:-}" == "--dry-run" ]] && dry_run=true

docker_bin="${DOCKER_BIN:-docker}"
psql_cmd="${PSQL_CMD:-runuser -u postgres -- psql}"
systemctl_bin="${SYSTEMCTL_BIN:-systemctl}"
ufw_bin="${UFW_BIN:-ufw}"
ss_bin="${SS_BIN:-ss}"
pg_hba_file="${PG_HBA_FILE:-/etc/postgresql/16/main/pg_hba.conf}"
pg_hba_backup_dir="${PG_HBA_BACKUP_DIR:-/var/backups/241-apps}"
pg_service="${PG_SERVICE:-postgresql@16-main}"

network="${PROV_NETWORK:-241-apps}"
subnet="${PROV_SUBNET:-172.30.0.0/16}"
gateway="${PROV_GATEWAY:-172.30.0.1}"
bridge="${PROV_BRIDGE:-br-241-apps}"
db_role="${PROV_DB_ROLE:-mts241}"
hba_databases="${PROV_HBA_DATABASES:-postgres,identity,academic,inventory,presence,portal,admission,hr,student,assessment,exam}"
hba_line="host    $hba_databases    $db_role    $subnet    scram-sha-256"
read -r -a psql <<< "$psql_cmd"

step() { echo "==> $*"; }

step "docker network $network"
if $dry_run; then
  echo "    would create the network $network with subnet $subnet, gateway $gateway and bridge name $bridge when it is missing or wrong"
else
  for name in $($docker_bin network ls --format '{{.Name}}'); do
    [[ "$name" == "$network" ]] && continue
    other="$($docker_bin network inspect "$name" --format '{{range .IPAM.Config}}{{.Subnet}} {{end}}' 2> /dev/null || true)"
    if [[ "$other" == *"$subnet"* ]]; then
      echo "another docker network ($name) already uses $subnet" >&2
      exit 1
    fi
  done
  if ! network_subnet="$($docker_bin network inspect "$network" --format '{{range .IPAM.Config}}{{.Subnet}} {{end}}' 2> /dev/null)"; then
    $docker_bin network create --subnet "$subnet" --gateway "$gateway" -o com.docker.network.bridge.name="$bridge" "$network"
    network_subnet="$subnet "
    echo "    created the network $network"
  fi
  if [[ "$network_subnet" != *"$subnet"* ]]; then
    echo "network $network does not use $subnet (found ${network_subnet:-nothing}): recreate it by hand" >&2
    exit 1
  fi
  echo "    $network uses $subnet, gateway $gateway, bridge $bridge"
fi

step "postgresql listen_addresses and pg_hba"
changed=false
if $dry_run; then
  echo "    would set listen_addresses to include $gateway (when it does not already)"
  echo "    would append the pg_hba line for $db_role from $subnet (when it is missing) and restart $pg_service"
else
  listen="$("${psql[@]}" -tAc 'show listen_addresses' | tr -d '[:space:]')"
  if [[ ",$listen," == *",$gateway,"* || "$listen" == *"*"* ]]; then
    echo "    listen_addresses already covers $gateway ($listen)"
  else
    "${psql[@]}" -v ON_ERROR_STOP=1 -q -c "ALTER SYSTEM SET listen_addresses = '$listen,$gateway'"
    echo "    listen_addresses set to $listen,$gateway (effective after the restart)"
    changed=true
  fi
  if grep -qxF "$hba_line" "$pg_hba_file"; then
    echo "    $pg_hba_file already allows $db_role from $subnet"
  else
    install -d -m 700 "$pg_hba_backup_dir"
    cp -a "$pg_hba_file" "$pg_hba_backup_dir/pg_hba.conf.$(date +%Y%m%d%H%M%S)"
    printf '%s\n' "$hba_line" >> "$pg_hba_file"
    echo "    $pg_hba_file now allows $db_role from $subnet (previous copy in $pg_hba_backup_dir)"
    changed=true
  fi
  if $changed; then
    $systemctl_bin restart "$pg_service"
    echo "    restarted $pg_service"
  fi
fi

step "firewall"
if $dry_run; then
  echo "    would allow $subnet to reach $gateway on 5432 and 9000 through $bridge"
else
  for entry in 5432:"241-apps postgres" 9000:"241-apps minio"; do
    port="${entry%%:*}"
    comment="${entry#*:}"
    if $ufw_bin status | grep -qF "$comment"; then
      echo "    ufw already allows $comment"
    else
      $ufw_bin allow in on "$bridge" from "$subnet" to "$gateway" port "$port" proto tcp comment "$comment"
      echo "    ufw allows $comment"
    fi
  done
fi

step "verify"
if $dry_run; then
  echo "    would check that PostgreSQL listens on $gateway:5432"
  exit 0
fi
if ! $ss_bin -ltn | grep -q "$gateway:5432"; then
  echo "no PostgreSQL listener on $gateway:5432 after the change: check $pg_hba_file and $pg_service" >&2
  exit 1
fi
echo "    PostgreSQL listens on $gateway:5432"
if ! $ss_bin -ltn | grep -q ':9000'; then
  echo "    warning: nothing listens on port 9000, the containers need MinIO there" >&2
fi
