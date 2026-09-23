# Cacophony Taskcade: Autonomous Local Model Arena & Code Orchestrator

## Architectural Directives & Operational Rules
- Zero Emojis in any code, comments, documentation, or commits (unless a feature explicitly declares emoji exemption).
- SOLID principles strictly enforced across all modules.
- Strict typing: TypeScript (Node.js/Bun) and modern Angular (v20+ with Signals, Zoneless, Standalone); strictly NO Python in core codebase.
- Database: PGlite (in-process WASM/Node PostgreSQL) with clean abstraction for SQLite, PostgreSQL, and MariaDB.
- Single-concurrency scheduler: Vega APU affinity grouping (minimizes Ollama model unloads), model failure eviction (3-4 consecutive fails), and weighted random fallback.
- Mobile-first responsive UI with Dark Mode (default), Light Mode, and High Contrast Mode adhering to Angular best practices (`docs/SKILL.md`).
- All secrets strictly confined to .env and encrypted vault.
- Zero Hardcoding & Whitebox Configurability: Any option, parameter, hyperparameter, model identifier, context limit, or threshold must be configurable via typed options/config schemas with intelligent defaults, never hardcoded as arbitrary string or numeric literals.
- Never delete source files with rm; move deprecated files to .trash/ with justification documentation.
- Always commit changes, keep workspace clean, and ensure work is production ready.

---

## Taskcade Rotation & History Protocol
1. **Verification Gate**: No task is marked completed `[x]` or rotated without passing its verified automated test suite or operational validation.
2. **Archival Procedure**: When an entire phase or major milestone is fully verified, its completed checklist items are transferred from `docs/taskcade.md` to `docs/taskcade-history.md`.
3. **Traceability**: Each archived phase preserves its task IDs, descriptions, subtask trees, associated git commit hashes, and verification scope.
4. **Token Efficiency**: Active planning and execution in `docs/taskcade.md` remain uncluttered, allowing AI agents and human operators to focus directly on pending work without context exhaustion.
5. **Reference**: See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 10.

---

## Active Phase 6 Outstanding Item
- [x] T6.1.4: Implement automated code formatter invocation (Prettier / ESLint programmatic autofix) integrated into `CodeScrubber` pipeline.

---

## Active Taskcade Status: All Phases (1 through 16) Completed & Archived
*All milestones and phases are fully implemented, verified with automated tests, and documented in [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md).*

---

### Monorepo Verification Summary
- **Unit & Integration Suite**: 120 tests in `@cacophony/engine` passing 100%.
- **Frontend Standalone Suite**: 9 unit tests in `@cacophony/frontend` passing 100%.
- **Tool & Sandbox Suite**: 12 tests in `@cacophony/tools` passing 100%.
- **Zero Emojis**: 100% compliant across all source files, documentation, and commits.
- **Configurability**: 100% whitebox configurable via typed schemas and `.env`.
- **Containers**: Multi-stage production `Dockerfile` and `docker-compose.yml` operational.

