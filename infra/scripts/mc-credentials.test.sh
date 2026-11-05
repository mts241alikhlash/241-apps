#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fail() { echo "FAIL: $*" >&2; exit 1; }
parse() { python3 "$here/mc-credentials.py"; }

out="$(printf '%s\n' '{"status":"success","accessKey":"AK1","secretKey":"SK1","expiration":"1970-01-01T00:00:00Z"}' | parse)"
[[ "$out" == "AK1 SK1" ]] || fail "accesskey create output parsed as '$out'"

out="$(printf '%s\n%s\n' '{"status":"info","message":"working"}' '{"status":"success","accessKey":"AK2","secretKey":"SK2"}' | parse)"
[[ "$out" == "AK2 SK2" ]] || fail "multi-line output parsed as '$out'"

if printf '%s\n' '{"status":"error","error":{"message":"denied"}}' | parse > /dev/null 2>&1; then
  fail "an error document was accepted"
fi
if printf '%s\n' 'not json' | parse > /dev/null 2>&1; then
  fail "text output was accepted"
fi
if printf '%s\n' '{"status":"success","accessKey":"AK3"}' | parse > /dev/null 2>&1; then
  fail "a document without a secret key was accepted"
fi

echo "mc-credentials test passed"
