#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

mkdir -p "$work/stubs"
for tool in docker psql systemctl mc; do
  cat > "$work/stubs/$tool" <<STUB
#!/usr/bin/env bash
printf '%s\n' "$tool \$*" >> "\$STUB_LOG"
if [[ "$tool" == docker ]]; then
  case "\$1" in
    ps) echo c1 ;;
    inspect) echo sha256:inuse ;;
    images)
      printf 'ghcr.io/mts241alikhlash/old-web\tsha256:old1\n'
      printf 'ghcr.io/mts241alikhlash/hr-service\tsha256:inuse\n'
      printf 'ghcr.io/mts241alikhlash/old-service\tsha256:old2\n'
      printf 'docker.io/library/caddy\tsha256:caddy\n'
      printf 'docker.io/library/postgres\tsha256:pg\n'
      ;;
  esac
fi
exit 0
STUB
  chmod +x "$work/stubs/$tool"
done
printf '#!/usr/bin/env bash\ncat > /dev/null\n' > "$work/stubs/xargs-unused"

fixture() {
  rm -rf "$work/root"
  mkdir -p "$work/root/srv/production/platform-infra/compose/env" "$work/root/backups/2026-11-05" "$work/root/systemd" "$work/root/sbin" "$work/root/home"
  echo "S3_ACCESS_KEY_ID=old-s3-user" > "$work/root/srv/production/platform-infra/compose/env/admission-service.env"
  echo x > "$work/root/backups/2026-11-05/a.dump"
  : > "$work/root/systemd/241apps-backup-prod.timer"
  : > "$work/root/systemd/241apps-backup-prod.service"
  : > "$work/root/systemd/241-apps-backup.timer"
  : > "$work/root/sbin/241apps-backup-prod"
  : > "$work/root/sbin/241-apps-backup"
  {
    echo "restrict,command=\"$work/root/srv/deploy-entry production\" ssh-ed25519 AAAAold old"
    echo "restrict,command=\"/srv/241-apps/infra/scripts/deploy-entry.sh\" ssh-ed25519 AAAAnew new"
  } > "$work/root/home/authorized_keys"
}

run() {
  PATH="$work/stubs:$PATH" STUB_LOG="$work/log" REMOVE_ALLOW_NON_ROOT=1 REMOVE_PSQL=psql MC_HOST_polyrepo=http://placeholder \
    OLD_SRV="$work/root/srv" OLD_BACKUPS="$work/root/backups" AUTHORIZED_KEYS="$work/root/home/authorized_keys" \
    SYSTEMD_DIR="$work/root/systemd" SBIN_DIR="$work/root/sbin" bash "$here/remove-polyrepo.sh" "$@"
}
tree() { (cd "$work/root" && ls -R . && cat home/authorized_keys) | sha256sum; }

fixture
before="$(tree)"
: > "$work/log"
run --dry-run > "$work/dry.log" 2>&1 || { cat "$work/dry.log" >&2; fail "dry run failed"; }
[[ "$(tree)" == "$before" ]] || fail "the dry run changed files"
if grep -qE "^(docker (compose|rmi)|psql|mc|systemctl)" "$work/log"; then fail "the dry run ran a mutating command"; fi
grep -q "would run: docker compose -p mts241alikhlash-production down" "$work/dry.log" || fail "the dry run does not list the compose down"
grep -q "full backup" "$work/dry.log" || fail "the backup notice is not printed"

: > "$work/log"
if echo "no" | run > "$work/refused.log" 2>&1; then fail "a wrong confirmation was accepted"; fi
[[ "$(tree)" == "$before" ]] || fail "files changed without confirmation"
if grep -qE "^(docker (compose|rmi)|psql|mc|systemctl)" "$work/log"; then fail "a command ran without confirmation"; fi

: > "$work/log"
echo "remove polyrepo" | run > "$work/real.log" 2>&1 || { cat "$work/real.log" >&2; fail "the removal failed"; }

grep -q "^docker compose -p mts241alikhlash-production down$" "$work/log" || fail "the old project was not brought down (and only down)"
grep -qE "^docker rmi sha256:old1$" "$work/log" || fail "an unused old image was not removed"
grep -qE "^docker rmi sha256:old2$" "$work/log" || fail "an unused old image was not removed"
if grep -qE "^docker rmi sha256:(inuse|caddy|pg)$" "$work/log"; then fail "an image in use or from another registry was removed"; fi
drops="$(grep -c 'DROP DATABASE IF EXISTS' "$work/log")"
[[ "$drops" == 10 ]] || fail "expected 10 dropped databases, got $drops"
for db in identity academic inventory presence portal admission hr student assessment exam; do
  grep -q "DROP DATABASE IF EXISTS \"${db}_prod\"" "$work/log" || fail "${db}_prod was not dropped"
  if grep -q "DROP DATABASE IF EXISTS \"$db\" " "$work/log"; then fail "the new database $db was dropped"; fi
done
grep -q "DROP ROLE IF EXISTS mts241_production" "$work/log" || fail "the old role was not dropped"
if grep -q "DROP ROLE IF EXISTS mts241\b" "$work/log"; then fail "the new role was dropped"; fi
grep -q "^mc rb --force --dangerous polyrepo/241-apps-production$" "$work/log" || fail "the old bucket was not removed"
grep -q "^mc admin user remove polyrepo old-s3-user$" "$work/log" || fail "the old MinIO user was not removed"
grep -q "^systemctl disable --now 241apps-backup-prod.timer$" "$work/log" || fail "the old timer was not disabled"

[[ ! -e "$work/root/srv" && ! -e "$work/root/backups" ]] || fail "the old folders remain"
[[ ! -e "$work/root/systemd/241apps-backup-prod.timer" && ! -e "$work/root/systemd/241apps-backup-prod.service" && ! -e "$work/root/sbin/241apps-backup-prod" ]] || fail "the old backup units remain"
[[ -e "$work/root/systemd/241-apps-backup.timer" && -e "$work/root/sbin/241-apps-backup" ]] || fail "the new backup units were removed"
grep -q "AAAAnew" "$work/root/home/authorized_keys" || fail "the new deploy key was removed"
if grep -q "AAAAold" "$work/root/home/authorized_keys"; then fail "the old deploy key line remains"; fi

if grep -qiE "pemuda|9router|storage|000-default|volume|prune|system |rm -rf /( |$)|down -v|down --volumes" "$work/log"; then fail "a command touched something outside the list"; fi

fixture
PATH="$work/stubs:$PATH" STUB_LOG="$work/log" REMOVE_ALLOW_NON_ROOT=1 REMOVE_PSQL=psql OLD_SRV=/ OLD_BACKUPS="$work/root/backups" AUTHORIZED_KEYS="$work/root/home/authorized_keys" SYSTEMD_DIR="$work/root/systemd" SBIN_DIR="$work/root/sbin" bash "$here/remove-polyrepo.sh" --dry-run > "$work/guard.log" 2>&1 && true
if echo "remove polyrepo" | PATH="$work/stubs:$PATH" STUB_LOG="$work/log" REMOVE_ALLOW_NON_ROOT=1 REMOVE_PSQL=psql OLD_SRV=/ OLD_BACKUPS="$work/root/backups" AUTHORIZED_KEYS="$work/root/home/authorized_keys" SYSTEMD_DIR="$work/root/systemd" SBIN_DIR="$work/root/sbin" bash "$here/remove-polyrepo.sh" > "$work/guard2.log" 2>&1; then fail "a root path was accepted for removal"; fi
grep -q "refusing to remove" "$work/guard2.log" || fail "the root path refusal is not explained"

echo "remove-polyrepo test passed"
