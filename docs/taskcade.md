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

*See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 32.*

---

## Phase 33: Multi-Hour Autonomous Continuous Arena Stream & Multi-Stack Self-Evolution
*RDF Category: `spec:AutonomousMultiHourArenaCategory`*

### T33.1: Sustained Multi-Hour Autonomous Task Execution Stream (`spec:SustainedTaskStream`)
- [ ] T33.1.1: Multi-Hour Arena Autonomous Workstream:
  - [ ] T33.1.1.1: Seed `TaskcadePlanningService` with comprehensive engineering backlog (3+ hours estimated runtime across multi-language benchmarks, AST refactoring, and deterministic scrub tests).
  - [ ] T33.1.1.2: Enforce ThermalGovernor throttling and Vega APU VRAM headroom preservation during long continuous runs.
  - [ ] T33.1.1.3: Continuous queue replenishment: autonomously ingest tasks from Gitea issues, internal backlog, and failure retries without manual operator intervention.

### T33.2: Multi-Stack Profile Expansion & Cross-Language AST Verification (`spec:MultiStackAstVerification`)
- [ ] T33.2.1: Multi-Stack Benchmark Tasks:
  - [ ] T33.2.1.1: Java/Maven micro-benchmark task: compile and verify Java AST interface signatures and JUnit test execution.
  - [ ] T33.2.1.2: Go struct signature harvesting and unit test runner integration.
  - [ ] T33.2.1.3: TypeScript NodeNext vs Bundler dynamic stack switching verification.

### T33.3: Operational Runbook & Background Process Supervisor (`spec:ProcessSupervisorValidation`)
- [ ] T33.3.1: Daemon Lifecycle & Live Dashboard Monitoring:
  - [ ] T33.3.1.1: Launch Cacophony engine background daemon (`bin/cacophony start --daemon`).
  - [ ] T33.3.1.2: Verify HTTP server listening on port 24161 and serving live Angular dashboard.
  - [ ] T33.3.1.3: Verify SSE event stream `/api/events` actively broadcasting sensor telemetry and execution stage progress.







