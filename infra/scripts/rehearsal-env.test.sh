#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
infra="$(cd "$here/.." && pwd)"
repo="$(cd "$infra/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

mkdir -p "$work/root/infra/scripts" "$work/root/infra/compose" "$work/root/infra/deployment" "$work/root/infra/gateway" "$work/stubs" "$work/state"
cp "$here/rehearsal-env.sh" "$here/provision-env.py" "$here/rehearsal-override.py" "$work/root/infra/scripts/"
cp "$infra/compose/compose.yaml" "$work/root/infra/compose/compose.yaml"
cp "$infra/deployment/lock.json" "$work/root/infra/deployment/lock.json"
cp "$infra/gateway/nginx.conf" "$work/root/infra/gateway/nginx.conf"
for dir in "$repo"/services/*-service; do
  name="$(basename "$dir")"
  mkdir -p "$work/root/services/$name"
  cp "$dir/.env.example" "$work/root/services/$name/.env.example"
done

cat > "$work/stubs/podman" <<STUB
#!/usr/bin/env bash
printf '%s\n' "podman \$*" >> "$work/calls.log"
case "\$1 \$2" in
  "network inspect")
    [[ -f "$work/network-created" ]] || { echo "Error: network not found" >&2; exit 1; }
    echo "10.89.0.1"
    ;;
  "network create") : > "$work/network-created" ;;
esac
exit 0
STUB
chmod +x "$work/stubs/podman"

PATH="$work/stubs:$PATH" REHEARSAL_DIR="$work/state" bash "$work/root/infra/scripts/rehearsal-env.sh" > "$work/out.log" 2>&1 || { cat "$work/out.log" >&2; fail "rehearsal-env.sh failed without an existing network"; }

grep -q "podman network create 241-apps" "$work/calls.log" || fail "the network was not created"

expected="$(sed -e "s#^resolver 127.0.0.11#resolver 10.89.0.1#" -e "s/\(proxy_set_header   Host   *\)\\\$host;/\1\\\$http_host;/" "$infra/gateway/nginx.conf")"
[[ "$expected" == "$(cat "$work/state/nginx.conf")" ]] || fail "the rehearsal nginx.conf is not the current gateway render with the Podman resolver"
grep -q "location \^~ /_app/" "$work/state/nginx.conf" || fail "the rehearsal nginx.conf has no /_app/ location"
[[ -s "$work/state/compose.override.yaml" ]] || fail "no override written"

: > "$work/calls.log"
PATH="$work/stubs:$PATH" REHEARSAL_DIR="$work/state" bash "$work/root/infra/scripts/rehearsal-env.sh" > "$work/out2.log" 2>&1 || fail "second run failed"
if grep -q "network create" "$work/calls.log"; then fail "the existing network was created again"; fi

echo "rehearsal-env test passed"
