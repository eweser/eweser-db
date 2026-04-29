#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
This helper intentionally does not mint long-lived AWS credentials.

Use your normal AWS SSO or STS flow to create short-lived credentials for the
current shell, then pass only the minimum required env vars to the agent. Do not
commit generated credentials, .env files, or AWS profile exports.
EOF
