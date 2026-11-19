#!/usr/bin/env bash
# Runs only-base-merges.sh against a throwaway repository, #56.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
cd "$work"; git init -q -b main .
git config user.email t@example.com; git config user.name t
g() { git commit -q --allow-empty "$@"; git rev-parse HEAD; }
echo a > a; git add a; g -m base0 >/dev/null
git checkout -q -b pr; echo p > p; git add p; approved="$(g -m pr)"
git checkout -q main; echo b > b; git add b; g -m base1 >/dev/null; base="$(git rev-parse HEAD)"
git checkout -q pr; git merge -q --no-edit main; clean="$(git rev-parse HEAD)"
git checkout -q -b extra; echo x >> p; git add p; extra="$(g -m extra)"
git checkout -q -b dirty "$approved"; git merge -q --no-commit main; echo y > y; git add y; dirty="$(g -m dirty)"
fail=0
check() { # name expected approved head
  if bash "$here/only-base-merges.sh" "$work/.git" "$3" "$4" "$base"; then got=0; else got=1; fi
  if [ "$got" = "$2" ]; then echo "ok   $1"; else echo "FAIL $1: esperava $2, veio $got"; fail=1; fi
}
check same-head 0 "$approved" "$approved"
check clean-base-merge 0 "${approved:0:7}" "$clean"
check commit-after-merge 1 "$approved" "$extra"
check hand-made-merge 1 "$approved" "$dirty"
check approved-not-ancestor 1 "$base" "$clean"
check unknown-sha 1 deadbee "$clean"
exit "$fail"
