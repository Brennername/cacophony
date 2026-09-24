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

*See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 31.*

---

## Phase 32: Autonomous Continuous Arena Engine & Self-Taskcade Database Grooming
*RDF Category: `spec:AutonomousContinuousExecutionCategory`*

### T32.1: Autonomous Taskcade Self-Grooming & In-Database Task Planning (`spec:DatabaseTaskcadeGroomer`)
- [ ] T32.1.1: Database-Native Taskcade Storage & Grooming Engine:
  - [ ] T32.1.1.1: Define `TaskcadePlanningService` in `@cacophony/engine`: parses high-level system objectives and decomposes them directly into `tasks` and `task_stages` tables in PGlite.
  - [ ] T32.1.1.2: Implement autonomous queue replenishment: when active queue drops below threshold, automatically trigger Frontier/Ollama task decomposition from backlog objectives.
  - [ ] T32.1.1.3: Provide database status sync between PGlite and `docs/taskcade.md` tracking execution lifecycle state.

### T32.2: Continuous Autonomous Code Generation & Self-Healing Execution Daemon (`spec:AutonomousExecutionDaemon`)
- [ ] T32.2.1: Continuous Execution Loop Integration:
  - [ ] T32.2.1.1: Connect `TaskScheduler.setExecutionHandler` to an autonomous worker pipeline: Context Minimizer -> Ollama/Frontier Code Generation -> Deterministic Rule Pipeline -> Scoped Test Verification -> Git Checkpoint.
  - [ ] T32.2.1.2: If generation or compilation fails, automatically trigger `ClosedLoopTestRemediator` with compiler/LSP error feedback.
  - [ ] T32.2.1.3: Enable continuous background execution mode capable of running sustained multi-hour task streams safely within Vega APU thermal limits.

### T32.3: Verification & Operational System Startup (`spec:ContinuousOperationalValidation`)
- [ ] T32.3.1: Verification & Startup:
  - [ ] T32.3.1.1: Verify end-to-end task execution loop with synthetic unit tasks.
  - [ ] T32.3.1.2: Run full monorepo test suite (`npm test`).
  - [ ] T32.3.1.3: Start background daemon with initial work queue.





