#!/usr/bin/env bash
set -euo pipefail

dry_run=false
[[ "${1:-}" == "--dry-run" ]] && dry_run=true

dir="${NGINX_DIR:-/etc/nginx}"
nginx="${NGINX_BIN:-nginx}"
lock="${PROV_LOCK:?PROV_LOCK is required}"
backup="${NGINX_BACKUP_DIR:-/var/backups/241-apps/nginx-previous}"
site=241-apps
old_site="$dir/sites-available/241apps-production"
available="$dir/sites-available/$site"
enabled="$dir/sites-enabled/$site"
retired=(241apps-production 241apps-exam)

hosts="<every sslHost in lock.json>"
if [[ -f "$lock" ]]; then
  hosts="$(python3 -c '
import json, sys
lock = json.load(open(sys.argv[1]))
print(" ".join(sorted(pin["sslHost"] for pin in lock["apps"].values())))
' "$lock")"
elif ! $dry_run; then
  echo "missing $lock" >&2
  exit 1
fi

if $dry_run; then
  echo "    would read the origin certificate paths and the cloudflare-only include from $old_site"
  echo "    would write $available for: $hosts"
  echo "    would link it into $dir/sites-enabled and run nginx -t"
  echo "    would move ${retired[*]} and 241apps-production.bak-* out of $dir/sites-enabled into $backup"
  echo "    would run nginx -t again, reload nginx, and restore the moved files if that test fails"
  exit 0
fi

[[ -f "$old_site" ]] || { echo "missing $old_site: the current site is the source of the certificate paths" >&2; exit 1; }
cert="$(sed -nE 's/^[[:space:]]*ssl_certificate[[:space:]]+([^;]+);.*/\1/p' "$old_site" | head -1)"
key="$(sed -nE 's/^[[:space:]]*ssl_certificate_key[[:space:]]+([^;]+);.*/\1/p' "$old_site" | head -1)"
include="$(sed -nE 's/^[[:space:]]*include[[:space:]]+([^;]*cloudflare-only[^;]*);.*/\1/p' "$old_site" | head -1)"
if [[ -z "$cert" || -z "$key" || -z "$include" ]]; then
  echo "could not read the certificate paths or the cloudflare-only include from $old_site" >&2
  exit 1
fi

names="$hosts"
cat > "$available" <<CONF
# 241 Apps: Cloudflare (Full strict) -> this nginx -> gateway 127.0.0.1:8082
server {
    listen 80;
    listen [::]:80;
    server_name $names;
    include $include;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $names;

    ssl_certificate     $cert;
    ssl_certificate_key $key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    include $include;

    client_max_body_size 6m;

    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
CONF
ln -sfn "$available" "$enabled"

if ! "$nginx" -t; then
  rm -f "$enabled" "$available"
  echo "nginx -t failed with the new site; it was removed and nothing else changed" >&2
  exit 1
fi

mkdir -p "$backup"
moved=()
for entry in "$dir"/sites-enabled/241apps-production "$dir"/sites-enabled/241apps-exam "$dir"/sites-enabled/241apps-production.bak-*; do
  [[ -e "$entry" || -L "$entry" ]] || continue
  mv "$entry" "$backup/"
  moved+=("$(basename "$entry")")
done

if ! "$nginx" -t; then
  for name in "${moved[@]}"; do
    mv "$backup/$name" "$dir/sites-enabled/$name"
  done
  rm -f "$enabled" "$available"
  echo "nginx -t failed after retiring the old sites; they were restored and the new site removed" >&2
  exit 1
fi

"$nginx" -s reload
echo "    site $site active for: $names"
echo "    retired (copies in $backup): ${moved[*]:-none}"
