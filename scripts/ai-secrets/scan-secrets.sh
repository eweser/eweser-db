#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --source "$root" --redact --no-banner
  exit 0
fi

if command -v trufflehog >/dev/null 2>&1; then
  trufflehog filesystem "$root" --no-update --fail --exclude-paths .gitignore
  exit 0
fi

echo "gitleaks/trufflehog not installed; running fallback staged-diff scan." >&2

if ! git diff --cached --quiet; then
  scan_target=(git diff --cached -U0)
else
  scan_target=(git grep -n -I -E)
fi

pattern='^\+.*(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{32,}|-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----)'

if "${scan_target[@]}" | grep -E "$pattern" >/dev/null; then
  echo "Potential high-risk secret detected. Install gitleaks or trufflehog for full details." >&2
  "${scan_target[@]}" | grep -E "$pattern" >&2
  exit 1
fi

echo "Fallback staged-diff secret scan passed." >&2
