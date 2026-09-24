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

*See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 30.*

---

## Phase 31: Closed-Loop PR Review & Self-Remediation Workflow with Missing Tool Diagnostic Guidance
*RDF Category: `spec:ClosedLoopRemediationAndDiagnosticsCategory`*

### T31.1: End-to-End Autonomous PR Lifecycle & Scheduler Integration (`spec:ClosedLoopPrWorkflow`)
- [ ] T31.1.1: Closed-Loop PR Review & Remediation Coordinator:
  - [ ] T31.1.1.1: Implement `ClosedLoopPrCoordinator` in `@cacophony/engine/gitea`: coordinates `AutomatedPrWorkflow` and `AutomatedPrReviewLoop` with `TaskScheduler`.
  - [ ] T31.1.1.2: When `AutomatedPrReviewLoop` returns `remediationRequired: true` (`REQUEST_CHANGES` with inline comments), automatically synthesize and enqueue a high-priority (`P0`) remediation task targeting the existing worktree and branch.
  - [ ] T31.1.1.3: Ensure remediation tasks bypass duplicate branch creation, focus on flagged lines from review comments, and execute automated test suites.
  - [ ] T31.1.1.4: When review verdict is `APPROVED`, trigger automated squash merge via `GiteaApiClient.mergePullRequest` and record resolution in `task_stages` and `pr_reviews` tables.

### T31.2: System Tool Availability & Missing Dependency Diagnostic Engine (`spec:MissingToolsDiagnostics`)
- [ ] T31.2.1: Host System Capability & Tool Scanner:
  - [ ] T31.2.1.1: Define `ToolRequirement` and `SystemToolsDiagnosticReport` interfaces in `@cacophony/shared-types` identifying key binary capabilities: `radeontop`, `lm-sensors`, `btop`, `vulkan-tools` (`vulkaninfo`), `pciutils` (`lspci`), `mesa-utils`, `rocm-smi`, `nvidia-smi`.
  - [ ] T31.2.1.2: Implement `SystemToolScanner` in `@cacophony/engine/hardware`: tests `which <tool>` or executes probe to determine installation status, version, and feature enablement.
  - [ ] T31.2.1.3: Expose `GET /api/hardware/tools` REST endpoint returning complete diagnostic report with missing tools, affected capabilities, and copy-paste installation commands.
- [ ] T31.2.2: Mobile-First Frontend Missing Tools Guidance Widget:
  - [ ] T31.2.2.1: Update Angular `FleetViewComponent` and `HardwareMonitorComponent` to dynamically query `/api/hardware/tools`.
  - [ ] T31.2.2.2: If missing tools are detected, render high-visibility, mobile-friendly alert card listing disabled functionality and one-click copy-paste command for `sudo apt install`.
  - [ ] T31.2.2.3: Automatically hide or mark as verified when all required utilities are installed.

### T31.3: Automated Verification & Integration Suite (`spec:ClosedLoopVerification`)
- [ ] T31.3.1: Unit & Integration Tests:
  - [ ] T31.3.1.1: Write unit tests verifying `ClosedLoopPrCoordinator` lifecycle: task creation -> PR publish -> review evaluation -> remediation enqueuing on change request -> auto-merge on approval.
  - [ ] T31.3.1.2: Write unit tests for `SystemToolScanner` verifying accurate detection of present vs missing binaries and installation command generation.
  - [ ] T31.3.1.3: Run full monorepo test suite (`npm test`) asserting 100% pass rate.



