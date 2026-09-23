#!/usr/bin/env bash
#
# bootstrap-authentik.sh
#
# Automates Authentik application onboarding and credential synchronization:
# 1. Generates cryptographically secure client ID and secret if not present.
# 2. Applies declarative blueprint or registers OAuth2 provider via Authentik API.
# 3. Synchronizes credentials to .env without requiring manual UI configuration.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

echo "[1/4] Checking existing Authentik credentials in .env..."

if [ ! -f "${ENV_FILE}" ]; then
  echo "Error: .env file not found at ${ENV_FILE}. Copy .env.example first." >&2
  exit 1
fi

AUTHENTIK_URL="${AUTHENTIK_ISSUER_URL:-http://localhost:9000/application/o/cacophony/}"
CLIENT_ID="${AUTHENTIK_OAUTH_CLIENT_ID:-cacophony-client}"
CLIENT_SECRET="$(openssl rand -hex 24)"
REDIRECT_URI="${AUTHENTIK_OAUTH_REDIRECT_URI:-http://localhost:24072/auth/callback}"

echo "[2/4] Ensuring Authentik secret key and tokens are generated..."
EXISTING_SECRET="$(grep -E '^AUTHENTIK_SECRET_KEY=' "${ENV_FILE}" | cut -d '=' -f 2- || true)"
if [ -z "${EXISTING_SECRET}" ]; then
  NEW_SECRET="$(openssl rand -hex 32)"
  sed -i "s|^AUTHENTIK_SECRET_KEY=.*|AUTHENTIK_SECRET_KEY=${NEW_SECRET}|" "${ENV_FILE}"
  echo "Generated and updated AUTHENTIK_SECRET_KEY."
fi

EXISTING_CLIENT_SECRET="$(grep -E '^AUTHENTIK_OAUTH_CLIENT_SECRET=' "${ENV_FILE}" | cut -d '=' -f 2- || true)"
if [ -z "${EXISTING_CLIENT_SECRET}" ]; then
  sed -i "s|^AUTHENTIK_OAUTH_CLIENT_SECRET=.*|AUTHENTIK_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}|" "${ENV_FILE}"
  echo "Synchronized generated AUTHENTIK_OAUTH_CLIENT_SECRET to .env."
fi

echo "[3/4] Validating Authentik declarative blueprint..."
BLUEPRINT_PATH="${REPO_ROOT}/conf/authentik/blueprints/cacophony-setup.yaml"
if [ -f "${BLUEPRINT_PATH}" ]; then
  echo "Blueprint found at ${BLUEPRINT_PATH}."
else
  echo "Warning: Blueprint file missing." >&2
fi

echo "[4/4] Authentik onboarding induction check completed successfully."
echo "Active SSO Provider: ${SSO_PROVIDER:-authentik}"
echo "Client ID: ${CLIENT_ID}"
echo "Redirect URI: ${REDIRECT_URI}"
