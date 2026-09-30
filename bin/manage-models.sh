#!/usr/bin/env bash
#
# bin/manage-models.sh
#
# Manages Ollama model lifecycle for Cacophony Arena on the host APU:
# 1. Shows current host model storage footprint and VRAM residency.
# 2. Removes redundant/uncalibrated models (phi4-mini, deepseek-r1:14b, redundant 4k tags).
# 3. Pulls or confirms verified high-velocity arena models:
#    - deepseek-r1:8b (Primary reasoning & architectural decomposition)
#    - qwen2.5-coder:7b-instruct-q4_K_M (Primary implementer & test engineer)
#    - gemma3:4b-it-qat (Code reviewer & fast validator)
#    - qwen2.5-coder:3b (High-speed slot-fill & micro-remediation)
# 4. Cleans and re-seeds the Cacophony Arena task queue with diverse model assignments.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=========================================================="
echo " Cacophony: Arena Model Fleet Lifecycle & Queue Groomer"
echo "=========================================================="
echo "Working directory: ${REPO_ROOT}"
echo ""

# Ensure Ollama is responsive
if ! command -v ollama >/dev/null 2>&1; then
  echo "Error: 'ollama' CLI not found on host PATH. Please ensure Ollama is installed."
  exit 1
fi

echo "--- [Stage 1/4] Current Host Model Fleet ---"
ollama list
echo ""

# Models to safely evict
MODELS_TO_EVICT=(
  "phi4-mini:latest"
  "deepseek-r1:14b"
  "deepseek-r1:8b-4k"
  "gemma3:4b-it-qat-4k"
  "qwen2.5-coder:7b-4k"
)

# Models to verify / pull
TARGET_MODELS=(
  "deepseek-coder-v2:16b"
  "qwen2.5-coder:14b"
  "deepseek-r1:8b"
  "qwen2.5-coder:7b-instruct-q4_K_M"
  "gemma3:4b-it-qat"
  "qwen2.5-coder:3b"
)

echo "--- [Stage 2/4] Evicting Redundant & Outlier Models ---"
INSTALLED_MODELS=$(ollama list | awk 'NR>1 {print $1}')

for model in "${MODELS_TO_EVICT[@]}"; do
  if echo "${INSTALLED_MODELS}" | grep -q "^${model}\$"; then
    echo "Evicting model: ${model}..."
    ollama rm "${model}" || echo "Warning: Failed to remove ${model}, continuing..."
  else
    echo "Model '${model}' not installed; skipping eviction."
  fi
done

echo ""
echo "--- [Stage 3/4] Pulling / Verifying Recommended Arena Fleet ---"
for model in "${TARGET_MODELS[@]}"; do
  echo "Verifying model: ${model}..."
  ollama pull "${model}"
done

echo ""
echo "--- [Stage 4/4] Synchronizing Container & Re-grooming Arena Queue ---"
# Rebuild and sync dist bundles to ensure daemon and frontend load target configs
if [ -f "${REPO_ROOT}/bin/rebuild-all.sh" ]; then
  "${REPO_ROOT}/bin/rebuild-all.sh"
fi

# Seed fresh, diverse tasks across the 4 newly calibrated models
echo ""
echo "Purging old unassigned pending tasks..."
curl -s -X DELETE "http://localhost:24072/api/tasks" > /dev/null || true

echo "Seeding Phase 78 in-house PR lifecycle tasks with calibrated fleet assignments..."
curl -s -X POST "http://localhost:24072/api/tasks/seed?limit=12&phase=Phase%2078" | grep -o '{"success":[^}]*}' || true

echo ""
echo "=========================================================="
echo " Model fleet management and queue grooming complete!"
echo " Current installed models:"
ollama list
echo ""
echo " Current arena queue status:"
curl -s http://localhost:24072/api/status | grep -o '{"arena":[^}]*}' || true
echo "=========================================================="
