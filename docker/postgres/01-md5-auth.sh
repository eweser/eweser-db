#!/bin/bash
# Re-set the superuser password using md5 encryption so that Node postgres
# clients connecting over TCP (docker bridge NAT) can authenticate.
# postgres:17 defaults to scram-sha-256 storage which some client versions
# cannot negotiate over non-localhost TCP paths.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
SET password_encryption = 'md5';
ALTER USER "$POSTGRES_USER" WITH PASSWORD '$POSTGRES_PASSWORD';
EOSQL
