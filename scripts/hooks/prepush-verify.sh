#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if git rev-parse --verify @{upstream} >/dev/null 2>&1; then
  range="@{upstream}...HEAD"
else
  range="HEAD"
fi

mapfile -t changed_files < <(git diff --name-only --diff-filter=ACMR "$range")

if [[ ${#changed_files[@]} -eq 0 ]]; then
  exit 0
fi

eslint_files=()
prettier_files=()

for file in "${changed_files[@]}"; do
  [[ -f "$file" ]] || continue
  case "$file" in
    *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs)
      eslint_files+=("$file")
      prettier_files+=("$file")
      ;;
    *.json|*.md|*.css|*.scss|*.html|*.yml|*.yaml)
      prettier_files+=("$file")
      ;;
  esac
done

if [[ ${#eslint_files[@]} -gt 0 ]]; then
  npx eslint --max-warnings=0 --no-warn-ignored "${eslint_files[@]}"
fi

if [[ ${#prettier_files[@]} -gt 0 ]]; then
  npx prettier --check "${prettier_files[@]}"
fi
