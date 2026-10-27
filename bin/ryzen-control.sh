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

get_cpu_epp() {
  local sample="/sys/devices/system/cpu/cpu0/cpufreq/energy_performance_preference"
  if [[ -f "${sample}" ]]; then
    local cur
    cur="$(cat "${sample}" 2>/dev/null || echo "unknown")"
    echo "[ryzen-control] CPU energy performance preference: ${cur}"
  fi
}

set_cpu_epp() {
  local pref="${1:-balance_power}"
  echo "[ryzen-control] Setting CPU energy performance preference to '${pref}'..."
  local count=0
  for epp_file in /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference; do
    if [[ -f "${epp_file}" ]]; then
      if [[ -n "${SUDO_CMD}" ]]; then
        echo "${pref}" | ${SUDO_CMD} tee "${epp_file}" >/dev/null
      else
        echo "${pref}" > "${epp_file}"
      fi
      count=$(( count + 1 ))
    fi
  done
  echo "[ryzen-control] Successfully set EPP to '${pref}' across ${count} CPU cores."
}

print_usage() {
  cat << 'EOF'
Usage: ./bin/ryzen-control.sh <command> [arguments]

Commands:
  info, status                     Display current power metrics, limits, and temperatures
  monitor                          Live 1-second refresh of Wattage, Temp, and Limits
  table                            Dump full raw SMU power metric table
  
Profiles (Anti-Throttle & Pacing):
  goose, goose-clock               Goose: 35W STAPM, 38W Fast, 90C, GFX Clock 1700MHz, CPU EPP balance_power
  sweet-spot, gpu-boost            Sweet Spot: 32W STAPM, 36W Fast, 88C Tctl, VRM SoC 22A, CPU EPP balance_power
  smooth, anti-spike               Flat Pacing: 30W STAPM, 35W Fast, 30W Slow, Max 80C (Recommended for 24/7 arena)
  eco, quiet                       Preset: 18W TDP (STAPM 18W, Fast 22W, Slow 18W, Max 75C)
  balanced                         Preset: 28W TDP (STAPM 28W, Fast 35W, Slow 28W, Max 82C)
  performance                      Preset: 38W TDP (STAPM 38W, Fast 45W, Slow 38W, Max 86C)
  max, aggressive                  Preset: 48W TDP (STAPM 48W, Fast 55W, Slow 48W, Max 90C)
  
CPU & Manual Tuning:
  cpu-epp <preference>             Set CPU energy performance preference (e.g. balance_power, balance_performance)
  cpu-reset                        Reset CPU energy performance preference to default (balance_performance)
  set-gfx <mhz>                    Target specific iGPU clock speed in MHz (e.g. set-gfx 1600)
  set-watts <stapm_w> [fast_w]     Set custom power targets in Watts (e.g. set-watts 30 34)
  set-temp <max_celsius>           Set custom thermal cutoff limit in Celsius (e.g. set-temp 80)
  set-flat <watts> [temp_c]        Set exact flat power (Fast = Slow = STAPM) with temp cap
  custom <args...>                 Pass raw arguments directly to ryzenadj

Examples:
  ./bin/ryzen-control.sh goose
  ./bin/ryzen-control.sh sweet-spot
  ./bin/ryzen-control.sh set-gfx 1700
  ./bin/ryzen-control.sh monitor
EOF
}

CMD="${1:-info}"
shift || true

case "${CMD}" in
  info|status)
    echo "[ryzen-control] Querying AMD APU telemetry..."
    get_cpu_epp
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

  goose|goose-clock)
    echo "[ryzen-control] Applying GOOSE Profile (High GPU MHz with controlled heat)..."
    echo "  Power: 35W sustained, 38W boost, Max Temp: 90C"
    echo "  Target GFX Clock: 1700 MHz"
    echo "  VRM SoC Current: 24A sustained, 30A max"
    echo "  VRM VDD Current: 70A sustained, 90A max"
    echo "  CPU EPP: balance_power (keeps CPU cool and routes power to iGPU)"
    set_cpu_epp "balance_power"
    ${SUDO_CMD} "${RYZENADJ_BIN}" \
      --stapm-limit=35000 \
      --fast-limit=38000 \
      --slow-limit=35000 \
      --apu-slow-limit=35000 \
      --tctl-temp=90 \
      --vrmsoc-current=24000 \
      --vrmsocmax-current=30000 \
      --vrm-current=70000 \
      --vrmmax-current=90000 \
      --gfx-clk=1700 \
      --max-performance
    echo "[ryzen-control] Goose profile applied successfully."
    ;;

  sweet-spot|sweetspot|gpu-boost)
    echo "[ryzen-control] Applying SWEET-SPOT (GPU Priority) Profile..."
    echo "  Power: 32W sustained, 36W boost, Max Temp: 88C"
    echo "  VRM SoC Current: 22A sustained, 28A max"
    echo "  VRM VDD Current: 65A sustained, 85A max"
    echo "  CPU EPP: balance_power (restricts CPU burst to allocate thermal/power headroom to iGPU)"
    set_cpu_epp "balance_power"
    ${SUDO_CMD} "${RYZENADJ_BIN}" \
      --stapm-limit=32000 \
      --fast-limit=36000 \
      --slow-limit=32000 \
      --apu-slow-limit=32000 \
      --tctl-temp=88 \
      --vrmsoc-current=22000 \
      --vrmsocmax-current=28000 \
      --vrm-current=65000 \
      --vrmmax-current=85000 \
      --max-performance
    echo "[ryzen-control] Sweet-spot profile applied successfully."
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

  cpu-epp)
    PREF="${1:-balance_power}"
    set_cpu_epp "${PREF}"
    ;;

  cpu-reset)
    echo "[ryzen-control] Resetting CPU energy performance preference to balanced default..."
    set_cpu_epp "balance_performance"
    ;;

  set-gfx)
    GFX_MHZ="${1:-}"
    if [[ -z "${GFX_MHZ}" ]]; then
      echo "Error: Must provide target GPU MHz (e.g. ./bin/ryzen-control.sh set-gfx 1600)" >&2
      exit 1
    fi
    echo "[ryzen-control] Requesting iGPU clock ${GFX_MHZ} MHz..."
    ${SUDO_CMD} "${RYZENADJ_BIN}" --gfx-clk="${GFX_MHZ}"
    echo "[ryzen-control] Target GFX clock applied."
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
