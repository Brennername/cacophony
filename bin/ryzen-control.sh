#!/usr/bin/env bash
# ==============================================================================
# Cacophony Ryzen Power & Thermal Adjustment Control Utility
# Wraps ryzenadj to tune TDP, PPT limits, and temperature thresholds for AMD APUs
# ==============================================================================

set -euo pipefail

RYZENADJ_BIN="${RYZENADJ_PATH:-/home/nexen/gitclones/RyzenAdj/build/ryzenadj}"

if [[ ! -x "${RYZENADJ_BIN}" ]]; then
  echo "Error: ryzenadj binary not found or not executable at '${RYZENADJ_BIN}'." >&2
  echo "Please build it or export RYZENADJ_PATH=/path/to/ryzenadj" >&2
  exit 1
fi

# Ensure executed with root / sudo permissions (required to write PCI / SMU registers)
SUDO_CMD=""
if [[ $EUID -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
  else
    echo "Error: ryzenadj requires root permissions (sudo)." >&2
    exit 1
  fi
fi

print_usage() {
  cat << 'EOF'
Usage: ./bin/ryzen-control.sh <command> [arguments]

Commands:
  info, status                     Display current power metrics, limits, and temperatures
  monitor                          Live 1-second refresh of Wattage, Temp, and Limits
  table                            Dump full raw SMU power metric table
  
Profiles (Anti-Throttle & Pacing):
  smooth, anti-spike               Flat Pacing: 30W STAPM, 35W Fast, 30W Slow, Max 80C (Recommended for 24/7 arena)
  eco, quiet                       Preset: 18W TDP (STAPM 18W, Fast 22W, Slow 18W, Max 75C)
  balanced                         Preset: 28W TDP (STAPM 28W, Fast 35W, Slow 28W, Max 82C)
  performance                      Preset: 38W TDP (STAPM 38W, Fast 45W, Slow 38W, Max 86C)
  max, aggressive                  Preset: 48W TDP (STAPM 48W, Fast 55W, Slow 48W, Max 90C)
  
Manual Tuning:
  set-watts <stapm_w> [fast_w]     Set custom power targets in Watts (e.g. set-watts 30 34)
  set-temp <max_celsius>           Set custom thermal cutoff limit in Celsius (e.g. set-temp 80)
  set-flat <watts> [temp_c]        Set exact flat power (Fast = Slow = STAPM) with temp cap
  custom <args...>                 Pass raw arguments directly to ryzenadj

Examples:
  ./bin/ryzen-control.sh smooth
  ./bin/ryzen-control.sh monitor
  ./bin/ryzen-control.sh set-flat 32 80
EOF
}

CMD="${1:-info}"
shift || true

case "${CMD}" in
  info|status)
    echo "[ryzen-control] Querying AMD APU telemetry..."
    ${SUDO_CMD} "${RYZENADJ_BIN}" -i
    ;;

  monitor)
    echo "[ryzen-control] Starting live telemetry monitor (Press Ctrl+C to stop)..."
    while true; do
      clear
      echo "=== AMD Ryzen 9 5900HX Power & Thermal Telemetry ($(date +%T)) ==="
      ${SUDO_CMD} "${RYZENADJ_BIN}" -i 2>/dev/null | grep -E "STAPM|PPT|THM|CCLK" || true
      sleep 1
    done
    ;;

  table)
    echo "[ryzen-control] Querying full SMU table..."
    ${SUDO_CMD} "${RYZENADJ_BIN}" --dump-table
    ;;

  smooth|anti-spike)
    echo "[ryzen-control] Applying ANTI-SPIKE / FLAT PACING Profile..."
    echo "  STAPM: 30W, Fast PPT: 35W, Slow PPT: 30W, APU Slow: 30W, Max Temp: 80C"
    ${SUDO_CMD} "${RYZENADJ_BIN}" \
      --stapm-limit=30000 \
      --fast-limit=35000 \
      --slow-limit=30000 \
      --apu-slow-limit=30000 \
      --tctl-temp=80
    echo "[ryzen-control] Anti-spike curve applied."
    ;;

  eco|quiet)
    echo "[ryzen-control] Applying ECO / QUIET Profile (18W sustained, 22W boost, max 75C)..."
    ${SUDO_CMD} "${RYZENADJ_BIN}" \
      --stapm-limit=18000 \
      --fast-limit=22000 \
      --slow-limit=18000 \
      --apu-slow-limit=18000 \
      --tctl-temp=75
    echo "[ryzen-control] Profile applied successfully."
    ;;

  balanced)
    echo "[ryzen-control] Applying BALANCED Profile (28W sustained, 35W boost, max 82C)..."
    ${SUDO_CMD} "${RYZENADJ_BIN}" \
      --stapm-limit=28000 \
      --fast-limit=35000 \
      --slow-limit=28000 \
      --apu-slow-limit=28000 \
      --tctl-temp=82
    echo "[ryzen-control] Profile applied successfully."
    ;;

  performance)
    echo "[ryzen-control] Applying PERFORMANCE Profile (38W sustained, 45W boost, max 86C)..."
    ${SUDO_CMD} "${RYZENADJ_BIN}" \
      --stapm-limit=38000 \
      --fast-limit=45000 \
      --slow-limit=38000 \
      --apu-slow-limit=38000 \
      --tctl-temp=86
    echo "[ryzen-control] Profile applied successfully."
    ;;

  max|aggressive)
    echo "[ryzen-control] Applying MAX Profile (48W sustained, 55W boost, max 90C)..."
    ${SUDO_CMD} "${RYZENADJ_BIN}" \
      --stapm-limit=48000 \
      --fast-limit=55000 \
      --slow-limit=48000 \
      --apu-slow-limit=48000 \
      --tctl-temp=90
    echo "[ryzen-control] Profile applied successfully."
    ;;

  set-flat)
    WATTS="${1:-}"
    if [[ -z "${WATTS}" ]]; then
      echo "Error: Must provide flat target Watts (e.g. ./bin/ryzen-control.sh set-flat 30 [temp_c])" >&2
      exit 1
    fi
    TEMP_C="${2:-80}"
    MW=$(( WATTS * 1000 ))
    echo "[ryzen-control] Applying perfectly flat power curve: ${WATTS}W (${MW}mW) across STAPM, Fast, and Slow with ${TEMP_C}C cap..."
    ${SUDO_CMD} "${RYZENADJ_BIN}" \
      --stapm-limit="${MW}" \
      --fast-limit="${MW}" \
      --slow-limit="${MW}" \
      --apu-slow-limit="${MW}" \
      --tctl-temp="${TEMP_C}"
    echo "[ryzen-control] Flat curve applied."
    ;;

  set-watts)
    STAPM_W="${1:-}"
    if [[ -z "${STAPM_W}" ]]; then
      echo "Error: Must provide sustained target Watts (e.g. ./bin/ryzen-control.sh set-watts 30)" >&2
      exit 1
    fi
    FAST_W="${2:-$(( STAPM_W + (STAPM_W / 4) ))}"
    
    STAPM_MW=$(( STAPM_W * 1000 ))
    FAST_MW=$(( FAST_W * 1000 ))
    
    echo "[ryzen-control] Setting custom power: STAPM=${STAPM_W}W (${STAPM_MW}mW), FAST=${FAST_W}W (${FAST_MW}mW)..."
    ${SUDO_CMD} "${RYZENADJ_BIN}" \
      --stapm-limit="${STAPM_MW}" \
      --slow-limit="${STAPM_MW}" \
      --fast-limit="${FAST_MW}"
    echo "[ryzen-control] Power limits applied."
    ;;

  set-temp)
    TEMP_C="${1:-}"
    if [[ -z "${TEMP_C}" ]]; then
      echo "Error: Must provide temperature limit in Celsius (e.g. ./bin/ryzen-control.sh set-temp 80)" >&2
      exit 1
    fi
    echo "[ryzen-control] Setting Tctl temperature limit to ${TEMP_C}C..."
    ${SUDO_CMD} "${RYZENADJ_BIN}" --tctl-temp="${TEMP_C}"
    echo "[ryzen-control] Temperature limit applied."
    ;;

  custom)
    echo "[ryzen-control] Executing raw ryzenadj with: $*"
    ${SUDO_CMD} "${RYZENADJ_BIN}" "$@"
    ;;

  -h|--help|help)
    print_usage
    ;;

  *)
    echo "Unknown command: ${CMD}" >&2
    print_usage
    exit 1
    ;;
esac
