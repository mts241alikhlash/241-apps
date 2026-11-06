#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

root="$work/root"
mkdir -p "$root/infra/scripts" "$root/infra/gateway" "$root/apps/academic-web" "$root/apps/hr-web" "$root/services/academic-service" "$root/services/hr-service" "$work/stubs"
cp "$here/rehearsal-build.sh" "$root/infra/scripts/rehearsal-build.sh"
for dir in apps/academic-web apps/hr-web services/academic-service services/hr-service infra/gateway; do : > "$root/$dir/Dockerfile"; done

cat > "$work/stubs/podman" <<STUB
#!/usr/bin/env bash
printf '%s\n' "podman \$*" >> "$work/calls.log"
[[ "\$1 \$2" == "image inspect" ]] && echo 1048576
exit 0
STUB
printf '#!/usr/bin/env bash\nexit 0\n' > "$work/stubs/node"
chmod +x "$work/stubs/podman" "$work/stubs/node"

PATH="$work/stubs:$PATH" bash "$root/infra/scripts/rehearsal-build.sh" academic-web academic-service > "$work/out.log" 2>&1 || { cat "$work/out.log" >&2; fail "build failed"; }

builds="$(grep -c "^podman build" "$work/calls.log")"
[[ "$builds" == 2 ]] || fail "expected 2 builds, got $builds"
grep -q "localhost/241-apps/academic-web:rehearsal" "$work/calls.log" || fail "academic-web not built"
grep -q "localhost/241-apps/academic-service:rehearsal" "$work/calls.log" || fail "academic-service not built"
if grep -q "hr-web\|hr-service\|gateway" "$work/calls.log"; then fail "built a target that was not asked for"; fi

: > "$work/calls.log"
PATH="$work/stubs:$PATH" bash "$root/infra/scripts/rehearsal-build.sh" > "$work/out2.log" 2>&1 || fail "full build failed"
[[ "$(grep -c "^podman build" "$work/calls.log")" == 5 ]] || fail "no filter must build every target"

echo "rehearsal-build test passed"
