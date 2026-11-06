#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
infra="$(cd "$here/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

mkdir -p "$work/stubs"
cat > "$work/stubs/nginx" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "nginx $*" >> "$STUB_LOG"
if [[ "$1" == "-t" ]]; then
  n="$(grep -c '^nginx -t' "$STUB_LOG")"
  [[ "$n" == "${STUB_FAIL_AT:-0}" ]] && exit 1
fi
exit 0
STUB
chmod +x "$work/stubs/nginx"

fixture() {
  local dir="$1"
  rm -rf "$dir"
  mkdir -p "$dir/sites-available" "$dir/sites-enabled" "$dir/snippets"
  cat > "$dir/sites-available/241apps-production" <<'CONF'
server {
    listen 443 ssl http2;
    server_name accounts.example.test;
    ssl_certificate     /etc/ssl/cloudflare/origin.pem;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;
    include snippets/cloudflare-only.conf;
}
CONF
  cp "$dir/sites-available/241apps-production" "$dir/sites-enabled/241apps-production"
  cp "$dir/sites-available/241apps-production" "$dir/sites-enabled/241apps-exam"
  cp "$dir/sites-available/241apps-production" "$dir/sites-enabled/241apps-production.bak-20261030-133349"
  cp "$dir/sites-available/241apps-production" "$dir/sites-enabled/241apps-production.bak-examhost-1793368112"
  for other in 9router pemuda-cirengit 000-default storage storage-console default; do
    echo "# $other" > "$dir/sites-available/$other"
    ln -s "$dir/sites-available/$other" "$dir/sites-enabled/$other"
  done
  echo "# media" > "$dir/sites-enabled/241apps-media"
  : > "$dir/snippets/cloudflare-only.conf"
}

run() {
  PATH="$work/stubs:$PATH" STUB_LOG="$work/nginx.log" NGINX_DIR="$work/nginx" NGINX_BACKUP_DIR="$work/backup" PROV_LOCK="$infra/deployment/lock.json" bash "$here/provision-nginx.sh" "$@"
}
snapshot() { (cd "$work/nginx" && ls -R . && cat sites-available/*) | sha256sum; }

fixture "$work/nginx"
before="$(snapshot)"
run --dry-run > "$work/dry.log" 2>&1 || fail "dry run failed"
[[ "$(snapshot)" == "$before" ]] || fail "the dry run changed files"
[[ ! -s "$work/nginx.log" ]] || fail "the dry run called nginx"

: > "$work/nginx.log"
run > "$work/out.log" 2>&1 || { cat "$work/out.log" >&2; fail "provisioning the site failed"; }

site="$work/nginx/sites-available/241-apps"
for host in $(python3 -c 'import json,sys; print(" ".join(p["sslHost"] for p in json.load(open(sys.argv[1]))["apps"].values()))' "$infra/deployment/lock.json"); do
  grep -q "$host" "$site" || fail "host $host missing from the site"
done
grep -q "exam.mts241alikhlash.sch.id" "$site" || fail "the exam host is missing"
grep -q "ssl_certificate     /etc/ssl/cloudflare/origin.pem;" "$site" || fail "the certificate path was not carried over"
grep -q "ssl_certificate_key /etc/ssl/cloudflare/origin.key;" "$site" || fail "the key path was not carried over"
grep -q "include snippets/cloudflare-only.conf;" "$site" || fail "the cloudflare-only include was not carried over"
grep -q "proxy_pass http://127.0.0.1:8082;" "$site" || fail "the gateway upstream is wrong"
[[ -L "$work/nginx/sites-enabled/241-apps" ]] || fail "the site is not linked"

for gone in 241apps-production 241apps-exam 241apps-production.bak-20261030-133349 241apps-production.bak-examhost-1793368112; do
  [[ ! -e "$work/nginx/sites-enabled/$gone" ]] || fail "$gone is still enabled"
  [[ -e "$work/backup/$gone" ]] || fail "$gone was not kept in the backup folder"
done
for kept in 9router pemuda-cirengit 000-default storage storage-console default 241apps-media; do
  [[ -e "$work/nginx/sites-enabled/$kept" ]] || fail "$kept was removed"
done
[[ "$(grep -c '^nginx -t' "$work/nginx.log")" == 2 ]] || fail "expected two nginx -t runs"
grep -q "^nginx -s reload" "$work/nginx.log" || fail "nginx was not reloaded"
first_test="$(grep -n '^nginx -t' "$work/nginx.log" | head -1 | cut -d: -f1)"
reload_line="$(grep -n '^nginx -s reload' "$work/nginx.log" | cut -d: -f1)"
(( first_test < reload_line )) || fail "reload happened before the test"

fixture "$work/nginx"
rm -rf "$work/backup"
: > "$work/nginx.log"
if STUB_FAIL_AT=2 run > "$work/fail2.log" 2>&1; then fail "a failing second nginx -t did not fail the run"; fi
for back in 241apps-production 241apps-exam 241apps-production.bak-20261030-133349 241apps-production.bak-examhost-1793368112; do
  [[ -e "$work/nginx/sites-enabled/$back" ]] || fail "$back was not restored"
done
[[ ! -e "$work/nginx/sites-enabled/241-apps" && ! -e "$work/nginx/sites-available/241-apps" ]] || fail "the new site stayed after a failed test"
if grep -q "^nginx -s reload" "$work/nginx.log"; then fail "nginx was reloaded after a failed test"; fi

fixture "$work/nginx"
: > "$work/nginx.log"
if STUB_FAIL_AT=1 run > "$work/fail1.log" 2>&1; then fail "a failing first nginx -t did not fail the run"; fi
[[ -e "$work/nginx/sites-enabled/241apps-production" ]] || fail "the old site was touched after the first test failed"
[[ ! -e "$work/nginx/sites-enabled/241-apps" ]] || fail "the new site stayed after the first test failed"

echo "provision-nginx test passed"
