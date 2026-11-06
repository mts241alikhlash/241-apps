#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

root="$work/root"
mkdir -p "$root/infra/scripts" "$root/infra/compose/env" "$work/stubs" "$work/state"
cp "$here/rehearsal-down.sh" "$root/infra/scripts/rehearsal-down.sh"
printf '#!/usr/bin/env bash\nprintf "%%s\\n" "caddy $*" >> "%s/calls.log"\n' "$work" > "$root/infra/scripts/rehearsal-caddy.sh"
: > "$root/infra/compose/compose.yaml"
: > "$work/state/compose.override.yaml"
: > "$root/infra/compose/env/identity-service.env"
: > "$root/infra/compose/.env"

cat > "$work/stubs/docker" <<STUB
#!/usr/bin/env bash
printf '%s\n' "docker \$*" >> "$work/calls.log"
if [[ "\$1" == ps ]]; then
  [[ -n "\${STUB_LEFTOVER:-}" ]] && echo "241-apps-hr-service-1"
  echo "241-apps_postgres_1"
fi
exit 0
STUB
cat > "$work/stubs/podman" <<STUB
#!/usr/bin/env bash
printf '%s\n' "podman \$*" >> "$work/calls.log"
if [[ "\$1" == images ]]; then
  printf '%s\n' localhost/241-apps/academic-web:rehearsal localhost/241-apps/hr-service:rehearsal localhost/241-apps/hr-service:custom docker.io/library/caddy:2 docker.io/library/postgres:16
fi
exit 0
STUB
chmod +x "$work/stubs/docker" "$work/stubs/podman"

run() { PATH="$work/stubs:$PATH" REHEARSAL_DIR="$work/state" bash "$root/infra/scripts/rehearsal-down.sh"; }

run > "$work/out.log" 2>&1 || { cat "$work/out.log" >&2; fail "teardown failed"; }

log="$work/calls.log"
line() { grep -n -m1 -- "$1" "$log" | cut -d: -f1; }
for step in "docker compose" "caddy down" "podman network rm 241-apps" "podman rmi localhost/241-apps/academic-web:rehearsal" "podman image prune -f" "podman start 241-apps_postgres_1 241-apps_s3_1"; do
  [[ -n "$(line "$step")" ]] || fail "missing step: $step"
done
prev=0
for step in "docker compose" "caddy down" "podman network rm 241-apps" "podman rmi localhost/241-apps/academic-web:rehearsal" "podman image prune -f" "podman start 241-apps_postgres_1 241-apps_s3_1"; do
  n="$(line "$step")"
  (( n > prev )) || fail "step out of order: $step"
  prev="$n"
done
grep -q "docker compose .*down -v" "$log" || fail "compose was not brought down with -v"
grep -q "podman rmi .*localhost/241-apps/hr-service:rehearsal" "$log" || fail "hr-service rehearsal image not removed"
if grep -q "hr-service:custom\|caddy:2\|postgres:16" <(grep "podman rmi" "$log"); then fail "removed an image that is not a rehearsal tag"; fi
if grep -qE "prune -a|system prune|volume prune|volume rm|241-apps_postgres-data|241-apps_s3-data" "$log"; then fail "touched dev data or pruned everything"; fi
[[ "$(grep -c "system df" "$log")" -ge 2 ]] || fail "system df not printed before and after"
[[ ! -e "$root/infra/compose/env/identity-service.env" && ! -e "$root/infra/compose/.env" ]] || fail "links not removed"

run > "$work/out2.log" 2>&1 || fail "second run failed"

if STUB_LEFTOVER=1 run > "$work/out3.log" 2>&1; then fail "a leftover project container did not fail the teardown"; fi
grep -q "241-apps-hr-service-1" "$work/out3.log" || fail "the leftover container is not named"

echo "rehearsal-down test passed"
