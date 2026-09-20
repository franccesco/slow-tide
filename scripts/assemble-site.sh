#!/usr/bin/env bash
# Assemble the static site into a directory for GitHub Pages.
#
#   scripts/assemble-site.sh <out-dir> [previews-ref]
#
# Exports the checked-out commit (minus .github) into <out-dir>,
# then, if the previews branch exists, adds its pull-request snapshots under
# <out-dir>/previews/ so the live site and every open PR preview deploy
# together (Pages replaces the whole site on each deployment).
set -euo pipefail

out="${1:?usage: assemble-site.sh <out-dir> [previews-ref]}"
previews_ref="${2:-origin/previews}"

rm -rf "$out"
mkdir -p "$out"
git archive HEAD | tar -x -C "$out" --exclude='.github'

if git rev-parse --verify --quiet "$previews_ref^{commit}" >/dev/null; then
  mkdir -p "$out/previews"
  git archive "$previews_ref" | tar -x -C "$out/previews"
  # A plain listing of the previews that are live.
  {
    echo '<!doctype html><meta charset="utf-8"><title>Slow Tide PR previews</title>'
    echo '<h1>Pull request previews</h1><ul>'
    for d in "$out"/previews/pr-*/; do
      [ -d "$d" ] || continue
      n="$(basename "$d")"
      echo "<li><a href=\"$n/\">$n</a> · <a href=\"$n/index.html?drafts=1\">with drafts</a></li>"
    done
    echo '</ul>'
  } > "$out/previews/index.html"
fi

echo "site assembled in $out:"
find "$out" -maxdepth 2 -type d | sort
