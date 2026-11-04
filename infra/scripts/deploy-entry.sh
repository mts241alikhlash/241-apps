#!/usr/bin/env bash
set -euo pipefail

root="${DEPLOY_ROOT:-/srv/241-apps}"
read -r -a args <<< "${SSH_ORIGINAL_COMMAND:-}"

if [[ "${#args[@]}" -ne 1 ]]; then
  echo "usage: <40-character sha>" >&2
  exit 2
fi
sha="${args[0]}"
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "invalid sha: $sha" >&2
  exit 2
fi

exec 9> "$root/.git/deploy.lock"
if ! flock -w 900 9; then
  echo "another deploy is still running" >&2
  exit 1
fi

cd "$root/infra"
git fetch --quiet --prune --tags origin
if ! git merge-base --is-ancestor "$sha" origin/main 2> /dev/null; then
  echo "$sha is not on origin/main" >&2
  exit 2
fi
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "tracked files are modified in $PWD" >&2
  exit 1
fi
git checkout --quiet --detach "$sha"
exec scripts/deploy.sh
