#!/usr/bin/env bash

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 <search_term> [target_directory]"
    echo "Example: $0 'FocusedDiffBuilder' ."
    exit 1
fi

SEARCH_TERM="$1"
TARGET_DIR="${2:-.}"

echo "=================================================="
echo " Searching project for: '$SEARCH_TERM'"
echo " Target Directory     : '$TARGET_DIR'"
echo "=================================================="

grep -rn \
    --exclude-dir={node_missions,node_modules,.git,dist,build,target,vendor,coverage,__pycache__,data} \
    --exclude="*.lock" \
    --color=always \
    "$SEARCH_TERM" "$TARGET_DIR" || {
        echo "No matches found for '$SEARCH_TERM' in '$TARGET_DIR'."
        exit 0
    }

echo "=================================================="
echo " Search complete."
