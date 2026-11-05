#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
infra="$(cd "$here/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

mkdir -p "$work/infra/scripts" "$work/infra/compose/env" "$work/infra/deployment" "$work/infra/gateway" "$work/stubs"
cp "$here/deploy.sh" "$work/infra/scripts/deploy.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$work/infra/scripts/bootstrap.sh"
: > "$work/infra/compose/compose.yaml"
: > "$work/infra/compose/env/identity-service.env"
cp "$infra/deployment/lock.json" "$work/infra/deployment/lock.json"
cp -r "$infra/gateway/manifests" "$work/infra/gateway/manifests"

cat > "$work/stubs/docker" <<STUB
#!/usr/bin/env bash
printf '%s\n' "docker \$*" >> "$work/calls.log"
if [[ "\$1" == ps && -n "\${STUB_FOREIGN:-}" ]]; then printf 'intruder\t127.0.0.1:8082->80/tcp\n'; exit 0; fi
if [[ "\$1" == inspect && -n "\${STUB_FOREIGN:-}" ]]; then echo "someone-else"; exit 0; fi
case "\$1 \$2" in
  "info --format")
    if [[ "\$3" == *DockerRootDir* && -n "\${STUB_NO_DOCKER_ROOT:-}" ]]; then exit 1; fi
    echo "$work"
    ;;
  "compose -f") if [[ "\$*" == *" port gateway 80"* ]]; then echo "127.0.0.1:8082"; fi ;;
esac
exit 0
STUB
printf '#!/usr/bin/env bash\nexit 0\n' > "$work/stubs/curl"
printf '#!/usr/bin/env bash\nexit 1\n' > "$work/stubs/ss"
printf '#!/usr/bin/env bash\ncat > /dev/null\nexit 0\n' > "$work/stubs/xargs"
cat > "$work/stubs/df" <<'STUB'
#!/usr/bin/env bash
printf 'Avail\n99999999\n'
STUB
chmod +x "$work"/stubs/* "$work/infra/scripts/bootstrap.sh"

: > "$work/calls.log"
env -u DEPLOY_PULL -u DEPLOY_OVERRIDE bash -c "cd '$work/infra' && PATH='$work/stubs:$PATH' bash scripts/deploy.sh" > "$work/out.log" 2>&1 || { cat "$work/out.log" >&2; fail "the default deploy failed"; }
grep -q 'compose -f compose/compose.yaml -f compose/compose.override.yaml --profile migrate pull' "$work/calls.log" || fail "the default deploy did not pull with compose.override.yaml"

: > "$work/calls.log"
DEPLOY_PULL=never DEPLOY_OVERRIDE=/somewhere/override.yaml bash -c "cd '$work/infra' && PATH='$work/stubs:$PATH' bash scripts/deploy.sh" > "$work/out.log" 2>&1 || { cat "$work/out.log" >&2; fail "the knob deploy failed"; }
if grep -q ' pull' "$work/calls.log"; then fail "DEPLOY_PULL=never still pulled"; fi
grep -q 'compose -f compose/compose.yaml -f /somewhere/override.yaml' "$work/calls.log" || fail "DEPLOY_OVERRIDE was not used"

STUB_NO_DOCKER_ROOT=1 bash -c "cd '$work/infra' && PATH='$work/stubs:$PATH' bash scripts/deploy.sh" > "$work/out.log" 2>&1 || { cat "$work/out.log" >&2; fail "the deploy did not fall back to the Podman storage root"; }

: > "$work/calls.log"
if STUB_FOREIGN=1 bash -c "cd '$work/infra' && PATH='$work/stubs:$PATH' bash scripts/deploy.sh" > "$work/out.log" 2>&1; then fail "a foreign container on 8082 did not stop the deploy"; fi
grep -q 'held by container intruder outside project 241-apps' "$work/out.log" || fail "the refusal message is missing"
if grep -qE 'compose .* (pull|run|up)' "$work/calls.log"; then fail "the deploy changed something before refusing"; fi

echo "deploy test passed"
