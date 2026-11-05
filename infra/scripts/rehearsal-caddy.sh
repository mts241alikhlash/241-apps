#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
state="${REHEARSAL_DIR:-$HOME/.local/share/241-apps-rehearsal}"
port="${REHEARSAL_TLS_PORT:-8443}"
name=rehearsal-caddy
image=docker.io/library/caddy:2

case "${1:-up}" in
  up)
    mkdir -p "$state/caddy/data"
    {
      printf '{\n  auto_https disable_redirects\n  https_port %s\n  http_port 18080\n}\n' "$port"
      python3 -c '
import json, sys
lock = json.load(open(sys.argv[1]))
port = sys.argv[2]
for host in sorted(pin["sslHost"] for pin in lock["apps"].values()):
    print(f"{host}:{port} {{\n  tls internal\n  reverse_proxy 127.0.0.1:8082 {{\n    header_up X-Forwarded-Proto https\n  }}\n}}\n")
print(f"storage.mts241alikhlash.sch.id:{port} {{\n  tls internal\n  reverse_proxy 127.0.0.1:9000\n}}")
' "$repo/infra/deployment/lock.json" "$port"
    } > "$state/caddy/Caddyfile"
    podman rm -f "$name" > /dev/null 2>&1 || true
    podman run -d --name "$name" --network host \
      -v "$state/caddy/Caddyfile:/etc/caddy/Caddyfile:ro,z" \
      -v "$state/caddy/data:/data:z" \
      "$image" > /dev/null
    echo "caddy listening on https port $port"
    ;;
  down)
    podman rm -f "$name" > /dev/null 2>&1 || true
    ;;
  *)
    echo "usage: rehearsal-caddy.sh up|down" >&2
    exit 2
    ;;
esac
