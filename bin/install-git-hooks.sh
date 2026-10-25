#!/usr/bin/env bash
# ==============================================================================
# bin/install-git-hooks.sh
#
# Configures local git hooks to intercept security and code quality regressions
# before they are pushed to GitHub or remote repositories.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOOKS_DIR="${REPO_ROOT}/.git/hooks"

if [[ ! -d "${HOOKS_DIR}" ]]; then
  echo "[ERROR] .git directory not found at ${REPO_ROOT}/.git."
  exit 1
fi

PRE_PUSH_HOOK="${HOOKS_DIR}/pre-push"

cat > "${PRE_PUSH_HOOK}" << 'EOF'
#!/usr/bin/env bash
# Git pre-push hook: Runs local CodeQL security and quality scans.
# To bypass in an emergency, use: SKIP_CODEQL=1 git push
# or: git push --no-verify

if [[ "${SKIP_CODEQL:-0}" == "1" ]]; then
  echo "[INFO] SKIP_CODEQL is set. Bypassing local CodeQL gate."
  exit 0
fi

echo "[INFO] Running pre-push CodeQL security & quality scan..."
if [[ -x "./bin/codeql-scan.sh" ]]; then
  ./bin/codeql-scan.sh
else
  echo "[WARN] ./bin/codeql-scan.sh not found or not executable. Skipping."
fi
EOF

chmod +x "${PRE_PUSH_HOOK}"
echo "[SUCCESS] Git pre-push hook installed at ${PRE_PUSH_HOOK}."
