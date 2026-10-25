#!/usr/bin/env bash
# ==============================================================================
# bin/codeql-scan.sh
#
# Local CodeQL Security & Quality Static Analysis Scanner
# Enables developers to execute GitHub CodeQL queries locally prior to pushing
# code to GitHub or remote repositories, preventing security alerts in CI.
#
# Usage:
#   ./bin/codeql-scan.sh [options]
#
# Options:
#   --quick          Only analyze modified/critical packages instead of full repo
#   --suite <suite>  Specify custom query suite (default: javascript-code-scanning.qls)
#   --db <path>      Specify database location (default: /tmp/cacophony-codeql-db)
#   --help           Show this help text
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

QUERY_SUITE="codeql/javascript-queries:codeql-suites/javascript-code-scanning.qls"
DB_PATH="${TMPDIR:-/tmp}/cacophony-codeql-db"
OUTPUT_FORMAT="csv"
REPORT_OUTPUT="${TMPDIR:-/tmp}/codeql-report-$(date +%s).csv"
THREADS="0" # 0 uses all available cores

# Parse command line options
while [[ $# -gt 0 ]]; do
  case "$1" in
    --suite)
      QUERY_SUITE="$2"
      shift 2
      ;;
    --db)
      DB_PATH="$2"
      shift 2
      ;;
    --threads)
      THREADS="$2"
      shift 2
      ;;
    --help)
      echo "Usage: ./bin/codeql-scan.sh [OPTIONS]"
      echo ""
      echo "Run GitHub CodeQL code scanning analysis locally before pushing."
      echo ""
      echo "Options:"
      echo "  --suite <name>    CodeQL query suite (default: codeql/javascript-queries:codeql-suites/javascript-code-scanning.qls)"
      echo "  --db <path>       Path to create/reuse CodeQL database (default: /tmp/cacophony-codeql-db)"
      echo "  --threads <num>   Number of threads (default: 0 for all cores)"
      echo "  --help            Display this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information."
      exit 1
      ;;
  esac
done

# 1. Resolve CodeQL binary
CODEQL_BIN=""
if command -v codeql &>/dev/null; then
  CODEQL_BIN="codeql"
elif [[ -x "${HOME}/.local/bin/codeql" ]]; then
  CODEQL_BIN="${HOME}/.local/bin/codeql"
elif command -v gh &>/dev/null && gh codeql version &>/dev/null; then
  CODEQL_BIN="gh codeql"
fi

if [[ -z "${CODEQL_BIN}" ]]; then
  echo "[ERROR] CodeQL CLI executable was not found."
  echo ""
  echo "To install CodeQL locally via GitHub CLI extension:"
  echo "  gh extension install github/gh-codeql"
  echo "  mkdir -p ~/.local/bin && ln -sf ~/.local/share/gh/extensions/gh-codeql/dist/release/v*/codeql ~/.local/bin/codeql"
  echo ""
  echo "Or download the official CodeQL bundle from:"
  echo "  https://github.com/github/codeql-action/releases"
  exit 1
fi

echo "[INFO] Using CodeQL: $(${CODEQL_BIN} version --format=terse)"
echo "[INFO] Repository Root: ${REPO_ROOT}"

# 2. Ensure query pack is downloaded
echo "[INFO] Verifying CodeQL query pack: codeql/javascript-queries..."
${CODEQL_BIN} pack download codeql/javascript-queries >/dev/null 2>&1 || true

# 3. Create or refresh CodeQL database
echo "[INFO] Creating CodeQL database at ${DB_PATH}..."
rm -rf "${DB_PATH}"

CONFIG_ARGS=()
if [[ -f "${REPO_ROOT}/.github/codeql/codeql-config.yml" ]]; then
  CONFIG_ARGS+=("--codescanning-config=${REPO_ROOT}/.github/codeql/codeql-config.yml")
fi

${CODEQL_BIN} database create "${DB_PATH}" \
  --language=javascript-typescript \
  --source-root="${REPO_ROOT}" \
  "${CONFIG_ARGS[@]}" \
  --overwrite \
  --quiet

echo "[INFO] Database creation complete."

# 4. Execute CodeQL analysis
echo "[INFO] Running analysis suite: ${QUERY_SUITE}..."
${CODEQL_BIN} database analyze "${DB_PATH}" "${QUERY_SUITE}" \
  --format="${OUTPUT_FORMAT}" \
  --output="${REPORT_OUTPUT}" \
  --threads="${THREADS}"

# 5. Interpret analysis results
TOTAL_FINDINGS=0
if [[ -f "${REPORT_OUTPUT}" && -s "${REPORT_OUTPUT}" ]]; then
  TOTAL_FINDINGS=$(wc -l < "${REPORT_OUTPUT}" | tr -d ' ')
fi

echo ""
echo "=============================================================================="
echo "                           CodeQL Scan Summary                                "
echo "=============================================================================="

if [[ "${TOTAL_FINDINGS}" -eq 0 ]]; then
  echo "[SUCCESS] Zero CodeQL security or code quality issues detected."
  echo "[SUCCESS] Codebase passed all GitHub code scanning checks."
  rm -f "${REPORT_OUTPUT}"
  exit 0
else
  echo "[FAILURE] ${TOTAL_FINDINGS} CodeQL security/quality alert(s) detected!"
  echo ""
  echo "Detailed Findings:"
  echo "------------------------------------------------------------------------------"
  while IFS=',' read -r rule_name alert_msg severity file_path start_line start_col end_line end_col; do
    # Remove surrounding quotes from CSV fields
    rule_name=$(echo "${rule_name}" | sed 's/^"//;s/"$//')
    alert_msg=$(echo "${alert_msg}" | sed 's/^"//;s/"$//')
    file_path=$(echo "${file_path}" | sed 's/^"//;s/"$//')
    start_line=$(echo "${start_line}" | sed 's/^"//;s/"$//')
    severity=$(echo "${severity}" | sed 's/^"//;s/"$//')
    
    echo "  * [${severity}] ${file_path}:${start_line}"
    echo "    Rule: ${rule_name}"
    echo "    Details: ${alert_msg}"
    echo ""
  done < "${REPORT_OUTPUT}"
  echo "------------------------------------------------------------------------------"
  echo "Report saved at: ${REPORT_OUTPUT}"
  echo "Please remediate the above security warnings before pushing to GitHub."
  exit 1
fi
