#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
tag="${REHEARSAL_TAG:-rehearsal}"
only="${REHEARSAL_ONLY:-}"
cd "$repo"

node infra/gateway/generate.mjs --check

targets=()
for dir in apps/*; do
  [[ -f "$dir/Dockerfile" ]] && targets+=("$dir")
done
for dir in services/*; do
  [[ -f "$dir/Dockerfile" ]] && targets+=("$dir")
done
targets+=(infra/gateway)

for dir in "${targets[@]}"; do
  name="$(basename "$dir")"
  [[ "$dir" == infra/gateway ]] && name=gateway
  if [[ -n "$only" && "$name" != "$only" ]]; then
    continue
  fi
  echo "==> build $name"
  podman build -q -f "$dir/Dockerfile" -t "localhost/241-apps/$name:$tag" . > /dev/null
  size="$(podman image inspect --format '{{.Size}}' "localhost/241-apps/$name:$tag")"
  echo "    localhost/241-apps/$name:$tag $((size / 1024 / 1024)) MB"
done
