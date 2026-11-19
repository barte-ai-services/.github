#!/usr/bin/env bash
# Exits 0 when <head> adds nothing to <approved> but clean merges of <base>, #56: the head that
# auto-merge.yml's update-branch writes on top of a reviewed commit. Same check as argos.yml's
# inherited opinion (#39): from the head down the first parents to the approved commit, each commit
# is a merge whose second parent is in the base and whose tree is the one `git merge-tree` writes,
# and the diff against the base keeps its patch-id. Any doubt exits 1.
# Usage: only-base-merges.sh <git-dir> <approved sha, 7+ hex> <head sha> <base sha>
set -euo pipefail
export GIT_DIR="$1"
approved="$(git rev-parse --verify --quiet "$2^{commit}")" || exit 1
head="$3" base="$4"
[ "$approved" != "$head" ] || exit 0
git merge-base --is-ancestor "$approved" "$head" || exit 1
commit="$head"
for _ in $(seq 20); do
  if [ "$commit" = "$approved" ]; then
    patch() { git diff --binary --no-color --no-ext-diff "$base...$1" | git patch-id --verbatim | cut -d' ' -f1; }
    before="$(patch "$approved")"
    [ -n "$before" ] && [ "$before" = "$(patch "$head")" ] && exit 0
    exit 1
  fi
  read -r -a parents <<<"$(git rev-list --parents -n1 "$commit")"
  [ "${#parents[@]}" -eq 3 ] || exit 1
  git merge-base --is-ancestor "${parents[2]}" "$base" || exit 1
  tree="$(git merge-tree --write-tree "${parents[1]}" "${parents[2]}")" || exit 1
  [ "$tree" = "$(git rev-parse "$commit^{tree}")" ] || exit 1
  commit="${parents[1]}"
done
exit 1
