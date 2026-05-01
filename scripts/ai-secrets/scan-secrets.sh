#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

mode="${1:---staged}"

if command -v gitleaks >/dev/null 2>&1; then
  if [[ "$mode" == "--all" ]]; then
    gitleaks dir "$root" --redact --no-banner
  elif [[ "$mode" == "--staged" ]]; then
    gitleaks protect --source "$root" --staged --redact --no-banner
  fi
elif command -v trufflehog >/dev/null 2>&1; then
  if [[ "$mode" == "--all" || "$mode" == "--staged" ]]; then
    trufflehog filesystem "$root" --no-update --fail --exclude-paths .gitignore
  fi
else
  echo "gitleaks/trufflehog not installed; running fallback secret scan." >&2
fi

secret_pattern='AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{32,}|xox[baprs]-[A-Za-z0-9-]{20,}|-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----|postgres(ql)?://[^[:space:]'"'"'"]+:[^[:space:]'"'"'"]+@|[A-Fa-f0-9]{64}|(SECRET|PASSWORD|TOKEN|API_KEY|ACCESS_KEY|PRIVATE_KEY)[A-Z0-9_]*[[:space:]]*[:=][[:space:]]*['"'"'"]?[^[:space:]'"'"'"]{8,}'
allow_pattern='\.test\.ts:|changeme|change-me|dev-secret|dev-sync-secret|dev-webhook-secret|local[a-z-]*secret|test-secret|test-agent-token|tok_valid|your-|example|placeholder|PLACEHOLDER|replace-with|random-32|strong-random|localhost|127\.0\.0\.1|postgresql://user:pass|postgresql://eweser:changeme|postgres://test:test|re_test_key|turnstile-secret|prod_[a-z_]*secret|_TTL_SECONDS|SECRET_PATTERNS|\$\{|\$\(|\$\{\{|<[^>]+>|openssl rand|process\.env|secrets\.NPM_TOKEN|z\.string|secretSchema|__IMPECCABLE_'
blocked_path_pattern='(^|/)(docs/personal/|storage_railway_[^/]*\.json$|\.mcp\.json$|railway-deployment-handoff\.md$)'

scan_staged() {
  git diff --cached -U0 -- . \
    | grep -E '^\+' \
    | grep -Ev '^\+\+\+' \
    | grep -E "(${secret_pattern})" \
    | grep -Evi "(${allow_pattern})" || true
}

scan_tracked() {
  git grep -n -I -E "$secret_pattern" -- . \
    | grep -Evi "(${allow_pattern})" || true
}

scan_staged_paths() {
  git diff --cached --name-only --diff-filter=ACMR -- . \
    | grep -E "$blocked_path_pattern" || true
}

scan_tracked_paths() {
  git ls-files \
    | grep -E "$blocked_path_pattern" || true
}

matches=""
case "$mode" in
  --staged)
    matches="$(printf '%s\n%s' "$(scan_staged)" "$(scan_staged_paths)")"
    ;;
  --tracked | --all)
    matches="$(printf '%s\n%s' "$(scan_tracked)" "$(scan_tracked_paths)")"
    ;;
  *)
    echo "Usage: $0 [--staged|--tracked|--all]" >&2
    exit 2
    ;;
esac

if [[ -n "$matches" ]]; then
  printf '%s\n' "$matches" >&2
  echo "Potential high-risk secret detected. Remove it or replace it with a placeholder before committing/pushing." >&2
  exit 1
fi

echo "Secret scan passed." >&2
