# Cacophony Trash Archive

This directory stores deprecated source code files and documentation that have been retired from the active codebase.

## Policy
1. Source files and non-reproducible documentation must never be deleted using `rm`.
2. When deprecating a file, move it to this `.trash/` directory using `mv`.
3. Add an entry to this README detailing:
   - Original file path
   - Date moved
   - Reason for deprecation / retirement
4. Note: Reproducible build artifacts (node_modules, dist, .angular, coverage, build caches) are exempt from this rule and may be purged directly.

## Archive Log
| Date | Original Path | Reason for Deprecation |
| :--- | :--- | :--- |
| 2026-09-24 | packages/frontend/src/app/components/phase15-components.spec.ts | Decomposed into co-located component spec files; phase-named monolithic test file retired. |
