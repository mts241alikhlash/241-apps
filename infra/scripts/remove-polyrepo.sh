#!/usr/bin/env bash
set -euo pipefail

dry_run=false
[[ "${1:-}" == "--dry-run" ]] && dry_run=true

old_project=mts241alikhlash-production
old_srv="${OLD_SRV:-/srv/mts241alikhlash}"
old_backups="${OLD_BACKUPS:-/var/backups/241apps}"
authorized_keys="${AUTHORIZED_KEYS:-/home/deploy/.ssh/authorized_keys}"
systemd_dir="${SYSTEMD_DIR:-/etc/systemd/system}"
sbin_dir="${SBIN_DIR:-/usr/local/sbin}"
old_bucket=241-apps-production
old_role=mts241_production
databases=(identity_prod academic_prod inventory_prod presence_prod portal_prod admission_prod hr_prod student_prod assessment_prod exam_prod)
read -r -a psql <<< "${REMOVE_PSQL:-runuser -u postgres -- psql}"
laptop_backup="the home folder, backups/241apps-polyrepo-20261106/"

step() { echo "==> $*"; }
act() {
  if $dry_run; then
    echo "    would run: $*"
  else
    "$@"
  fi
}
safe_rm() {
  local path="$1"
  case "$path" in
    "" | / | /srv | /var | /var/backups | /etc | /home | /usr) echo "refusing to remove '$path'" >&2; exit 1 ;;
  esac
  act rm -rf -- "$path"
}

if ! $dry_run && [[ "${REMOVE_ALLOW_NON_ROOT:-}" != 1 && "$(id -u)" -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

echo "This removes the old polyrepo stack from this server. A full backup of the old databases and configs"
echo "is on the owner's laptop: $laptop_backup"
echo "Names touched: Compose project $old_project, images ghcr.io/mts241alikhlash/* that no container uses,"
echo "databases ${databases[*]}, role $old_role, MinIO bucket $old_bucket and its user, $old_srv,"
echo "the old deploy line in $authorized_keys, 241apps-backup-prod timer and service, $old_backups."
if ! $dry_run; then
  read -r -p "type 'remove polyrepo' to continue: " answer
  [[ "$answer" == "remove polyrepo" ]] || { echo "not confirmed" >&2; exit 1; }
fi

s3_user=""
old_env="$old_srv/production/platform-infra/compose/env/admission-service.env"
if [[ -f "$old_env" ]]; then
  s3_user="$(sed -nE 's/^S3_ACCESS_KEY_ID=(.*)$/\1/p' "$old_env" | head -1)"
fi

step "old Compose project $old_project"
act docker compose -p "$old_project" down

step "old images no container uses"
used="$(docker ps -a -q | xargs -r docker inspect --format '{{.Image}}' | sort -u || true)"
while IFS=$'\t' read -r repository id; do
  [[ "$repository" == ghcr.io/mts241alikhlash/* ]] || continue
  if grep -qxF "$id" <<< "$used"; then
    echo "    keeping $repository ($id): in use"
    continue
  fi
  act docker rmi "$id"
done < <(docker images --no-trunc --format '{{.Repository}}'$'\t''{{.ID}}')

step "old databases and role"
for db in "${databases[@]}"; do
  act "${psql[@]}" --no-psqlrc -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$db\" WITH (FORCE)"
done
act "${psql[@]}" --no-psqlrc -v ON_ERROR_STOP=1 -c "DROP ROLE IF EXISTS $old_role"

step "old MinIO bucket $old_bucket and its user"
if command -v mc > /dev/null 2>&1 && [[ -n "${MC_HOST_polyrepo:-}${REMOVE_MC_ALIAS:-}" ]]; then
  alias_name="${REMOVE_MC_ALIAS:-polyrepo}"
  act mc rb --force --dangerous "$alias_name/$old_bucket"
  if [[ -n "$s3_user" ]]; then
    act mc admin user remove "$alias_name" "$s3_user"
  fi
else
  echo "    no mc alias configured: in the MinIO Console delete the bucket $old_bucket and the user ${s3_user:-<the old access key>}"
fi

step "old deploy key line"
if [[ -f "$authorized_keys" ]]; then
  act sed -i "\\#$old_srv/deploy-entry#d" "$authorized_keys"
fi

step "old backup timer and service"
act systemctl disable --now 241apps-backup-prod.timer
safe_rm "$systemd_dir/241apps-backup-prod.timer"
safe_rm "$systemd_dir/241apps-backup-prod.service"
safe_rm "$sbin_dir/241apps-backup-prod"
act systemctl daemon-reload

step "old folders"
safe_rm "$old_srv"
safe_rm "$old_backups"

step "done"
echo "    untouched: Compose project pemuda-cirengit, nginx sites 9router, pemuda-cirengit, 000-default, storage, storage-console"
