#!/usr/bin/env bash
# Automated Gitea OAuth2 Application Registration Script
# Runs inside or alongside Gitea container to register cacophony-dashboard OAuth2 app
# eliminates manual UI setup.

set -euo pipefail

APP_NAME="${1:-cacophony-dashboard}"
REDIRECT_URI="${2:-http://localhost:24072/auth/callback}"
GITEA_CONTAINER="${3:-cacophony-gitea}"

echo "Configuring Gitea OAuth2 application: ${APP_NAME}..."

# Execute gitea admin command inside container
if command -v docker >/dev/null 2>&1; then
  docker exec "${GITEA_CONTAINER}" su-exec gitea gitea admin auth add-oauth \
    --name "${APP_NAME}" \
    --provider "cacophony" \
    --key "${APP_NAME}" \
    --secret "${GITEA_OAUTH_CLIENT_SECRET:-cacophony-dev-secret}" \
    --auto-discover-url "" \
    || true
fi

echo "OAuth2 registration check completed."
