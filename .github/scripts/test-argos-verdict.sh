#!/usr/bin/env bash
# Runs argos-verdict.jq on argos-verdict-cases/: <name>.json in, <name>.expected out, #56.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
fail=0 total=0
for input in "$here"/argos-verdict-cases/*.json; do
  name="$(basename "$input" .json)"
  expected="$(cat "$here/argos-verdict-cases/$name.expected")"
  got="$(jq -r -f "$here/argos-verdict.jq" "$input")"
  total=$((total + 1))
  if [ "${got%% *}" = "$expected" ]; then
    echo "ok   $name: $got"
  else
    echo "FAIL $name: esperava $expected, veio: $got"
    fail=$((fail + 1))
  fi
done
echo "$((total - fail))/$total casos"
[ "$fail" -eq 0 ] && [ "$total" -gt 0 ]
