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
grep -q 'would write .*sites-available/241-apps for:' <<< "$dry" || fail "the dry run does not show the nginx site"
grep -q 'systemctl enable --now 241-apps-backup.timer' <<< "$dry" || fail "the dry run does not show the backup timer"
grep -q '/var/backups/241-apps' <<< "$dry" || fail "the dry run does not show the backup directory"

root="$work/root"
mkdir -p "$root/infra/compose/env" "$root/infra/deployment"
cp "$repo/infra/deployment/lock.json" "$root/infra/deployment/lock.json"
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
google_id="TESTGOOGLEID7788"
google_secret="TESTGOOGLESECRET7788"
out="$(printf '%s\n' "$db_pw" "http://127.0.0.1:9000" "$key_id" "$key_secret" "postgres" "$admin_pw" "$google_id" "$google_secret" |
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

grep -qx "GOOGLE_CLIENT_SECRET=$google_secret" "$root/infra/compose/env/identity-service.env" || fail "the Google secret did not reach the identity env file"
grep -q "^SSO_APPS=.*account=https://accounts.mts241alikhlash.sch.id/oauth/callback" "$root/infra/compose/env/identity-service.env" || fail "SSO_APPS does not carry the production host names"
grep -qx "SSO_ACCOUNTS_ORIGIN=https://accounts.mts241alikhlash.sch.id" "$root/infra/compose/env/identity-service.env" || fail "SSO_ACCOUNTS_ORIGIN is not the production origin"
grep -qx "S3_ACCESS_KEY_ID=$key_id" "$root/infra/compose/env/identity-service.env" || fail "identity did not get the S3 key (profile photos need it)"
if grep -q "change-me" "$root/infra/compose/env/exam-service.env"; then fail "the exam env file still holds a placeholder"; fi
for s in presence inventory assessment exam; do grep -qx "SCHOOL_TIME_ZONE=Asia/Jakarta" "$root/infra/compose/env/$s-service.env" || fail "$s env file has no SCHOOL_TIME_ZONE"; done

for secret in "$key_id" "$key_secret" "$db_pw" "$admin_pw" "$google_secret"; do
  if grep -qF -- "$secret" "$work/argv.log"; then fail "'$secret' appeared in argv"; fi
  if grep -qF -- "$secret" <<< "$out"; then fail "'$secret' appeared in the output"; fi
done

echo "provision test passed"
