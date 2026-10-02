#!/usr/bin/env bash
#
# rebuild-all.sh
#
# Cleanly rebuilds all monorepo packages (shared-types, db, tools, frontend, engine)
# and synchronizes the built distribution bundles directly into the running Docker container
# or restarts the service if needed so changes appear immediately in the live environment.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=========================================================="
echo " Cacophony: Rebuilding All Packages & Applying Changes"
echo "=========================================================="
echo "Working directory: ${REPO_ROOT}"

cd "${REPO_ROOT}"

# 1. Build TypeScript packages in strict dependency order
echo ""
echo "[1/4] Compiling shared-types, db, and tools..."
npm run build --workspace=@cacophony/shared-types
npm run build --workspace=@cacophony/db
npm run build --workspace=@cacophony/tools

# 2. Build Angular frontend (production bundle)
echo ""
echo "[2/4] Building Angular frontend distribution bundle..."
npm run build --workspace=@cacophony/frontend

# 3. Build Node.js backend engine
echo ""
echo "[3/4] Compiling engine backend daemon..."
npm run build --workspace=@cacophony/engine

# 4. Synchronize into running Docker container if active
echo ""
echo "[4/4] Synchronizing built artifacts to runtime container..."
CONTAINER_NAME="cacophony-engine"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}\$"; then
  echo "Container '${CONTAINER_NAME}' is running. Copying updated dist bundles..."
  
  # Copy frontend static distribution
  if [ -d "${REPO_ROOT}/packages/frontend/dist/frontend/browser" ]; then
    docker cp "${REPO_ROOT}/packages/frontend/dist/frontend/browser/." "${CONTAINER_NAME}:/app/packages/frontend/dist/frontend/browser/"
    echo "Frontend browser bundle synchronized to /app/packages/frontend/dist/frontend/browser/"
  fi

  # Copy compiled engine distribution
  if [ -d "${REPO_ROOT}/packages/engine/dist" ]; then
    docker cp "${REPO_ROOT}/packages/engine/dist/." "${CONTAINER_NAME}:/app/packages/engine/dist/"
    echo "Engine distribution synchronized to /app/packages/engine/dist/"
  fi

  # Copy compiled db distribution
  if [ -d "${REPO_ROOT}/packages/db/dist" ]; then
    docker cp "${REPO_ROOT}/packages/db/dist/." "${CONTAINER_NAME}:/app/packages/db/dist/"
    echo "Database distribution synchronized to /app/packages/db/dist/"
  fi

  # Copy compiled shared-types distribution
  if [ -d "${REPO_ROOT}/packages/shared-types/dist" ]; then
    docker cp "${REPO_ROOT}/packages/shared-types/dist/." "${CONTAINER_NAME}:/app/packages/shared-types/dist/"
    echo "Shared-types distribution synchronized to /app/packages/shared-types/dist/"
  fi

  # Copy compiled tools distribution
  if [ -d "${REPO_ROOT}/packages/tools/dist" ]; then
    docker cp "${REPO_ROOT}/packages/tools/dist/." "${CONTAINER_NAME}:/app/packages/tools/dist/"
    echo "Tools distribution synchronized to /app/packages/tools/dist/"
  fi

  # Copy docs directory (ensures taskcade.md is synchronized for seeding)
  if [ -d "${REPO_ROOT}/docs" ]; then
    docker cp "${REPO_ROOT}/docs/." "${CONTAINER_NAME}:/app/docs/"
    echo "Documentation synchronized to /app/docs/"
  fi

  echo "Restarting '${CONTAINER_NAME}' to reload daemon with latest builds..."
  docker restart "${CONTAINER_NAME}" > /dev/null
  echo "Container '${CONTAINER_NAME}' successfully restarted."
else
  echo "Container '${CONTAINER_NAME}' is not currently running."
  echo "Local builds are ready. Run 'docker compose up -d' or 'npm start' to run."
fi

echo ""
echo "=========================================================="
echo " Rebuild and synchronization complete!"
echo " Web UI is live at: http://localhost:24072"
echo " API Status:        http://localhost:24072/api/status"
echo "=========================================================="
