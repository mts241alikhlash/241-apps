#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
services=(identity academic inventory presence portal admission hr student assessment exam)

fail() { echo "FAIL: $*" >&2; exit 1; }

dry="$(bash "$here/provision.sh" --dry-run 2>&1)" || fail "the dry run failed without mc on PATH"
grep -q 'MinIO access key: prompt' <<< "$dry" || fail "the dry run does not show the MinIO access key prompt"
if grep -q '\bmc\b' <<< "$dry"; then fail "the dry run still mentions mc"; fi

root="$work/root"
mkdir -p "$root/infra/compose/env"
for s in "${services[@]}"; do
  mkdir -p "$root/services/$s-service"
  cp "$repo/services/$s-service/.env.example" "$root/services/$s-service/.env.example"
done

real_python="$(command -v python3)"
real_install="$(command -v install)"
mkdir -p "$work/stubs"
cat > "$work/stubs/python3" <<STUB
#!/usr/bin/env bash
printf '%s\n' "\$@" >> "$work/argv.log"
exec "$real_python" "\$@"
STUB
cat > "$work/stubs/install" <<STUB
#!/usr/bin/env bash
printf '%s\n' "\$@" >> "$work/argv.log"
exec "$real_install" "\$@"
STUB
chmod +x "$work/stubs/python3" "$work/stubs/install"

key_id="TESTKEYID7788"
key_secret="TESTKEYSECRET7788"
db_pw="TESTDBPW7788"
admin_pw="TESTADMINPW7788"
out="$(printf '%s\n' "$db_pw" "http://127.0.0.1:9000" "$key_id" "$key_secret" "postgres" "$admin_pw" |
  PATH="$work/stubs:$PATH" DEPLOY_ROOT="$root" PROVISION_ONLY_ENV=1 bash "$here/provision.sh" 2>&1)" || fail "the env-only run failed: $out"

for s in "${services[@]}"; do
  file="$root/infra/compose/env/$s-service.env"
  [[ -f "$file" ]] || fail "$file was not written"
  [[ "$(stat -c %a "$file")" == 600 ]] || fail "$file is not mode 600"
done
portal="$root/infra/compose/env/portal-service.env"
grep -qx "S3_ACCESS_KEY_ID=$key_id" "$portal" || fail "the key id did not reach the portal env file"
grep -qx "S3_SECRET_ACCESS_KEY=$key_secret" "$portal" || fail "the key secret did not reach the portal env file"
grep -q "^SEED_ADMIN_PASSWORD=$admin_pw" "$root/infra/compose/env/identity-service.env" || fail "the admin password did not reach the identity env file"

for secret in "$key_id" "$key_secret" "$db_pw" "$admin_pw"; do
  if grep -qF -- "$secret" "$work/argv.log"; then fail "'$secret' appeared in argv"; fi
  if grep -qF -- "$secret" <<< "$out"; then fail "'$secret' appeared in the output"; fi
done

echo "provision test passed"
