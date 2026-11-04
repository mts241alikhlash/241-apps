#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
entry="$here/deploy-entry.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

g() { git -c user.email=test@example.invalid -c user.name=test -c init.defaultBranch=main "$@"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

g init --quiet "$work/origin"
mkdir -p "$work/origin/infra/scripts"
cat > "$work/origin/infra/scripts/deploy.sh" <<'EOF'
#!/usr/bin/env bash
git rev-parse HEAD > "$DEPLOY_ROOT/../called"
EOF
chmod +x "$work/origin/infra/scripts/deploy.sh"
echo one > "$work/origin/tracked.txt"
g -C "$work/origin" add .
g -C "$work/origin" commit --quiet -m one
g -C "$work/origin" switch --quiet -c side
g -C "$work/origin" commit --quiet --allow-empty -m side
side_sha="$(g -C "$work/origin" rev-parse HEAD)"
g -C "$work/origin" switch --quiet main

g clone --quiet "$work/origin" "$work/241-apps"

echo two > "$work/origin/tracked.txt"
g -C "$work/origin" commit --quiet -am two
main_sha="$(g -C "$work/origin" rev-parse HEAD)"

run() { SSH_ORIGINAL_COMMAND="$1" DEPLOY_ROOT="$work/241-apps" bash "$entry"; }
expect_exit() {
  local want="$1" input="$2" got=0
  run "$input" >/dev/null 2>&1 || got=$?
  [[ "$got" -eq "$want" ]] || fail "'$input' exited $got, expected $want"
  [[ ! -e "$work/called" ]] || fail "'$input' reached deploy.sh"
}

expect_exit 2 ""
expect_exit 2 "production $main_sha"
expect_exit 2 "$main_sha extra"
expect_exit 2 "${main_sha:0:7}"
expect_exit 2 "${main_sha^^}"
expect_exit 2 ";id"
expect_exit 2 "\$(id)"
expect_exit 2 "$side_sha"
expect_exit 2 "$(printf '0%.0s' {1..40})"

echo "touch \"\$DEPLOY_ROOT/../called\"" >> "$work/241-apps/infra/scripts/deploy.sh"
expect_exit 1 "$main_sha"
g -C "$work/241-apps" checkout --quiet -- infra/scripts/deploy.sh

run "$main_sha" >/dev/null
[[ "$(cat "$work/called")" == "$main_sha" ]] || fail "deploy did not run $main_sha"

echo "deploy-entry test passed"
