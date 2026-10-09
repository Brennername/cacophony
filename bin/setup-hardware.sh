#!/usr/bin/env bash
# Cacophony Contributor Hardware Setup & Profile Detector
# Strictly zero emojis in code, output, and comments.

set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    DRY_RUN=true
  fi
done

echo "=== Cacophony Hardware Onboarding & Profiler ==="
OS_NAME="$(uname -s)"
ARCH_NAME="$(uname -m)"

echo "Operating System: ${OS_NAME} (${ARCH_NAME})"

DETECTED_CATEGORY="CPU_FALLBACK"
DETECTED_PROFILE="cpu"
TOTAL_RAM_MB=0
VRAM_MB=0
GPU_NAME="Generic CPU Compute"
CTX_WINDOW=4096
RECOMMENDED_MODEL="qwen2.5-coder:7b-instruct-q4_K_M"

# 1. System Memory Detection
if [ "${OS_NAME}" = "Linux" ]; then
  if [ -f /proc/meminfo ]; then
    MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_RAM_MB=$((MEM_KB / 1024))
  fi
elif [ "${OS_NAME}" = "Darwin" ]; then
  MEM_BYTES=$(sysctl -n hw.memsize 2>/dev/null || echo "0")
  TOTAL_RAM_MB=$((MEM_BYTES / 1024 / 1024))
fi

echo "Host System RAM: ${TOTAL_RAM_MB} MB"

# 2. Hardware Accelerator Detection
if command -v nvidia-smi >/dev/null 2>&1; then
  DETECTED_CATEGORY="NVIDIA_CUDA"
  DETECTED_PROFILE="nvidia"
  GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -n 1 || echo "NVIDIA CUDA GPU")
  VRAM_RAW=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -n 1 || echo "0")
  VRAM_MB=$(echo "${VRAM_RAW}" | awk '{print int($1)}')
elif [ "${OS_NAME}" = "Darwin" ] && [ "${ARCH_NAME}" = "arm64" ]; then
  DETECTED_CATEGORY="APPLE_SILICON"
  DETECTED_PROFILE="default"
  GPU_NAME=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon SoC")
  VRAM_MB="${TOTAL_RAM_MB}"
elif [ -d "/sys/class/drm" ] && grep -qs "0x1002" /sys/class/drm/card*/device/vendor 2>/dev/null; then
  DETECTED_CATEGORY="AMD_APU_VEGA"
  DETECTED_PROFILE="amd"
  GPU_NAME="AMD Radeon / Vega APU"
  VRAM_MB=4096
elif [ -d "/sys/class/drm" ] && grep -qs "0x8086" /sys/class/drm/card*/device/vendor 2>/dev/null; then
  DETECTED_CATEGORY="INTEL_ARC"
  DETECTED_PROFILE="cpu"
  GPU_NAME="Intel Integrated / Arc Graphics"
  VRAM_MB=4096
fi

# 3. Context & Model Sizing
if [ "${VRAM_MB}" -ge 24000 ]; then
  CTX_WINDOW=32768
  RECOMMENDED_MODEL="deepseek-coder-v2:16b"
elif [ "${VRAM_MB}" -ge 16000 ]; then
  CTX_WINDOW=16384
  RECOMMENDED_MODEL="qwen2.5-coder:14b-instruct-q4_K_M"
elif [ "${VRAM_MB}" -ge 8000 ]; then
  CTX_WINDOW=8192
  RECOMMENDED_MODEL="qwen2.5-coder:7b-instruct-q4_K_M"
else
  CTX_WINDOW=4096
  RECOMMENDED_MODEL="qwen2.5-coder:7b-instruct-q4_K_M"
fi

echo ""
echo "--- Hardware Detection Summary ---"
echo "Device Category:         ${DETECTED_CATEGORY}"
echo "Detected Device Name:    ${GPU_NAME}"
echo "Estimated VRAM:          ${VRAM_MB} MB"
echo "Recommended Profile:     ${DETECTED_PROFILE}"
echo "Optimal Context Window:  ${CTX_WINDOW} tokens"
echo "Primary Model Family:    ${RECOMMENDED_MODEL}"
echo "----------------------------------"
echo ""

if [ "${DRY_RUN}" = "true" ]; then
  echo "Dry-run mode active. No configuration files were modified."
  exit 0
fi

# If not dry run and .env exists, offer profile configuration
if [ -f ".env" ]; then
  echo "Applying profile ${DETECTED_PROFILE} to .env..."
  if grep -q "^COMPOSE_PROFILES=" .env; then
    sed -i "s/^COMPOSE_PROFILES=.*/COMPOSE_PROFILES=${DETECTED_PROFILE}/" .env
  else
    echo "COMPOSE_PROFILES=${DETECTED_PROFILE}" >> .env
  fi
  echo "Updated .env with COMPOSE_PROFILES=${DETECTED_PROFILE}"
fi

echo "Hardware setup complete. Start the arena with: docker compose up -d"
