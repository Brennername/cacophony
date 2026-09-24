# Cacophony Taskcade: Autonomous Local Model Arena & Code Orchestrator

## Architectural Directives & Operational Rules
- Zero Emojis in any code, comments, documentation, or commits (unless a feature explicitly declares emoji exemption).
- SOLID principles strictly enforced across all modules.
- Strict typing: TypeScript (Node.js/Bun) and modern Angular (v20+ with Signals, Zoneless, Standalone); strictly NO Python in core codebase.
- Database: PGlite (in-process WASM/Node PostgreSQL) with clean abstraction for SQLite, PostgreSQL, and MariaDB.
- Single-concurrency scheduler: Vega APU affinity grouping (minimizes Ollama model unloads), model failure eviction (3-4 consecutive fails), and weighted random fallback.
- Mobile-first responsive UI with Dark Mode (default), Light Mode, and High Contrast Mode adhering to Angular best practices (`docs/SKILL.md`).
- All secrets strictly confined to .env and encrypted vault.
- Zero Hardcoding & Whitebox Configurability: Any option, parameter, hyperparameter, model identifier, context limit, host, IP, or port must be configurable via typed options/config schemas with intelligent defaults, never hardcoded as arbitrary string or numeric literals.
- Network Agnosticism: Dynamic host header/IP resolution across Docker bridge, Wi-Fi LAN, VPN, and reverse proxy domains without hardcoding localhost.
- Never delete source files with rm; move deprecated files to .trash/ with justification documentation.
- Always commit changes, keep workspace clean, and ensure work is production ready.

---

## Taskcade Rotation & History Protocol
1. **Verification Gate**: No task is marked completed `[x]` or rotated without passing its verified automated test suite or operational validation.
2. **Archival Procedure**: When an entire phase or major milestone is fully verified, its completed checklist items are transferred from `docs/taskcade.md` to `docs/taskcade-history.md`.
3. **Traceability**: Each archived phase preserves its task IDs, descriptions, subtask trees, associated git commit hashes, and verification scope.
4. **Token Efficiency**: Active planning and execution in `docs/taskcade.md` remain uncluttered, allowing AI agents and human operators to focus directly on pending work without context exhaustion.
5. **Reference**: See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 16.

---

## Active Milestone Era: Gitea Deep API Integration, Dynamic Branching, Least-Privilege Guardrails & Webhook Orchestration

*See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 40.*

---

## Phase 41: Database Engine Portability, Auto-Vacuuming & Storage Optimization
*RDF Category: *

### T41.1: PGlite WAL Compaction & Automated Vacuum Daemon
  - [ ] T41.1.1: Implement DatabaseMaintenanceService in packages/db/ running periodic VACUUM ANALYZE and checkpoint compaction.
  - [ ] T41.1.2: Add storage size monitoring: track PGlite directory size in data/cacophony_pglite and emit warning if size exceeds threshold.
  - [ ] T41.1.3: Implement telemetry table partitioning: split telemetry_snapshots by week or archive older snapshots to parquet/json files.
  - [ ] T41.1.4: Write integration test verifying database compaction does not lock active task transactions.

### T41.2: Multi-Driver Compatibility Verification (PostgreSQL, SQLite, MariaDB)
  - [ ] T41.2.1: Verify DDL migrations on external PostgreSQL 16+ instance using pg connection string.
  - [ ] T41.2.2: Verify SQLite fallback driver in node:sqlite experimental mode for zero-dependency local runs.
  - [ ] T41.2.3: Document DB_DRIVER and DB_CONNECTION_STRING configuration options in conf/cacophony.example.json.
  - [ ] T41.2.4: Write cross-driver repository test asserting identical CRUD behavior across PGlite and SQLite drivers.


---

## Phase 42: AST Dependency Slicing & Context Token Minimizer
*RDF Category: *

### T42.1: AST Slicing & Focused Import Skeleton Generator
  - [ ] T42.1.1: Implement AstContextSlicer in packages/engine/src/context/ parsing referenced imports and extracting only utilized function/type signatures.
  - [ ] T42.1.2: Replace full file content of secondary dependencies with compact type skeletons in ContextMinimizer.
  - [ ] T42.1.3: Benchmark token reduction: assert at least 40% reduction in prompt token size on multi-file refactoring tasks.
  - [ ] T42.1.4: Write unit tests verifying generated import skeletons preserve type fidelity without breaking compiler verification.


---

## Phase 43: Frontier Fallback Router, Circuit Breaker & Quota Tracking
*RDF Category: *

### T43.1: Frontier Fallback Router with Provider Circuit Breakers
  - [ ] T43.1.1: Implement CircuitBreaker in packages/engine/src/inference/ tracking 429 rate-limits and 5xx errors per external provider (OpenAI, Anthropic, Gemini).
  - [ ] T43.1.2: Automatically fall back to secondary provider or high-reasoning local model (deepseek-r1:8b) when circuit opens.
  - [ ] T43.1.3: Implement TokenQuotaTracker recording daily and monthly token consumption and estimated dollar cost per provider.
  - [ ] T43.1.4: Expose GET /api/config/quotas endpoint returning remaining token budget and circuit breaker health statuses.
