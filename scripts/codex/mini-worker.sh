#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage:
  scripts/codex/mini-worker.sh code "question"
  scripts/codex/mini-worker.sh web "question"
  scripts/codex/mini-worker.sh research "question"

Runs a read-only Codex CLI worker with gpt-5.4-mini from the current repo.
EOF
}

if [[ $# -lt 2 ]]; then
  usage
  exit 2
fi

mode="$1"
shift
question="$*"

root="$(git rev-parse --show-toplevel)"

case "$mode" in
  code)
    prompt="You are a read-only EweserDB code explorer in this repo. Do not edit files, run write commands, commit, or save memory. Start from the exact question, use targeted rg/file reads, and keep the answer narrow. Return: Findings, Relevant files with line numbers, Uncertainty. Mark each point verified from code or inferred. Question: ${question}"
    ;;
  web)
    prompt="You are a read-only EweserDB web explorer. Browse/search current external sources; do not answer version-sensitive facts from memory. Prefer official docs, primary repos, release notes, and source URLs. Do not inspect local files unless needed to identify package names. Return: Research summary, Sources with what each proved, Recommendation, Open questions. Question: ${question}"
    ;;
  research)
    prompt="You are a read-only EweserDB researcher. Combine targeted local code exploration with current external docs only when useful. Do not edit files, run write commands, commit, or save memory. Separate verified internal findings, external source facts, and inference. Return: Research summary, Internal findings, External findings with URLs, Recommendation, Open questions, Suggested next step. Question: ${question}"
    ;;
  *)
    usage
    exit 2
    ;;
esac

exec codex exec \
  --cd "$root" \
  --model gpt-5.4-mini \
  --sandbox read-only \
  --ask-for-approval never \
  --search \
  "$prompt"
