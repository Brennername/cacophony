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
- The Integrity Rule (Zero Integrity Traps): All agents (local and frontier) must operate with strict engineering integrity:
  1. Never fake or short-circuit test passes (e.g. inserting dummy "Passed!" prints, removing assertions, or mocking tests to artificially simulate 100% pass rate). Tests must perform authentic validation of production invariants.
  2. Never execute destructive bypasses (e.g. dropping database tables or deleting configuration to avoid schema migrations or typing mismatches). Always author backward-compatible migrations and robust type unions.
  3. Transactional Integrity: When a task fails verification or remediation, all modified files must be safely rolled back to their pre-task snapshot so the repository remains pristine.
  4. Genuine Problem Resolution: Always resolve root causes rather than masking symptoms or bypassing guardrails.
- Showcase / Demo Mode Mock Preservation: Mock elimination tasks (such as Phase 48) apply to production paths, component stubs, and UI mocks, but must NEVER eliminate or break `MockInferenceStreamProvider` or `FallbackTelemetryProvider` when running under `DEMO_MODE=true` / `SIMULATION_MODE=true` (T71.3). The visual showcase and simulated zero-hardware demonstration mode must remain fully preserved and operational.
- Always commit changes, keep workspace clean, and ensure work is production ready.

---

## Taskcade Rotation & History Protocol

1. **Verification Gate**: No task is marked completed `[x]` or rotated without passing its verified automated test suite or operational validation.
2. **Archival Procedure**: When an entire phase or major milestone is fully verified, its completed checklist items are transferred from `docs/taskcade.md` to `docs/taskcade-history.md`.
3. **Traceability**: Each archived phase preserves its task IDs, descriptions, subtask trees, associated git commit hashes, and verification scope.
4. **Token Efficiency**: Active planning and execution in `docs/taskcade.md` remain uncluttered, allowing AI agents and human operators to focus directly on pending work without context exhaustion.
5. **Reference**: See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 44, plus fully verified Phases 45-64, 70, 73, 75, 77-86, and 89-95.

---

## Active Milestone Era: Gitea Deep API Integration, Dynamic Branching, Least-Privilege Guardrails & Webhook Orchestration

_See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 44, plus fully verified Phases 45-64, 70, 73, 75, 77-86, and 89-95._

---

## Active Sprint Priority Queue & Immediate Execution Order

> [!NOTE]
> Phase 102 is active: Focused strictly on unit testing, component spec coverage, and edge-case verification across frontend components and backend services. Major architectural pipeline implementations will be conducted via frontier models.

---

## Phase 102: Comprehensive Unit Test Expansion & Edge-Case Coverage

- [ ] T102.1.1: Write unit tests verifying `TerminalLogViewerComponent` log line rendering, auto-scrolling, and ANSI escape code sanitation. [Files: packages/frontend/src/app/components/terminal-log-viewer/terminal-log-viewer.component.ts, packages/frontend/src/app/components/terminal-log-viewer/terminal-log-viewer.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.2: Write unit tests verifying `ProcessInspectorComponent` process selection, terminal output display, and status badge rendering. [Files: packages/frontend/src/app/components/process-inspector/process-inspector.component.ts, packages/frontend/src/app/components/process-inspector/process-inspector.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.3: Write unit tests verifying `QueueManagerComponent` status filtering, priority badges, and task cancellation dispatches. [Files: packages/frontend/src/app/components/queue-manager/queue-manager.component.ts, packages/frontend/src/app/components/queue-manager/queue-manager.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.4: Write unit tests verifying `ExplorationControlComponent` epsilon slider reactivity, model strategy selection, and budget persistence. [Files: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts, packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.5: Write unit tests verifying `AuthCallbackComponent` query parameter token extraction, error state handling, and router navigation. [Files: packages/frontend/src/app/components/auth-callback/auth-callback.component.ts, packages/frontend/src/app/components/auth-callback/auth-callback.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.2.1: Write unit tests verifying `AmdVegaTelemetryProvider` sysfs path discovery, missing node handling, and APU fallback metrics. [Files: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts, packages/engine/src/tests/amd_vega_telemetry.test.ts] [Test: node --test packages/engine/dist/tests/amd_vega_telemetry.test.js]
- [ ] T102.2.2: Write unit tests verifying `ModelVramCatalog` model parameter footprint sizing across 3B, 7B, 8B, 14B, and 16B parameter scales with dynamic context window limits. [Files: packages/engine/src/hardware/ModelVramCatalog.ts, packages/engine/src/tests/model_vram_catalog.test.ts] [Test: node --test packages/engine/dist/tests/model_vram_catalog.test.js]
- [ ] T102.2.3: Write unit tests verifying `ThermalGovernor` throttling state transitions, cooldown timers, and recovery thresholds under fluctuating sensor readings. [Files: packages/engine/src/telemetry/ThermalGovernor.ts, packages/engine/src/tests/thermal_governor.test.ts] [Test: node --test packages/engine/dist/tests/thermal_governor.test.js]
- [ ] T102.2.4: Write unit tests verifying `RateLimiter` client IP tracking, sliding window expiry, and HTTP 429 rejection responses. [Files: packages/engine/src/daemon/RateLimiter.ts, packages/engine/src/tests/rate_limiter.test.ts] [Test: node --test packages/engine/dist/tests/rate_limiter.test.js]
- [ ] T102.2.5: Write unit tests verifying `JwtValidator` HS256 signature verification, expired token rejection, and malformed payload handling. [Files: packages/engine/src/auth/JwtValidator.ts, packages/engine/src/tests/jwt_validator.test.ts] [Test: node --test packages/engine/dist/tests/jwt_validator.test.js]

---

## Phase 101: Test Command Scoping Regression Mitigation, Orphaned Subtask Reconciliation, and Automated Epoch Recovery

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-101-test-command-scoping-regression-mitigation-orphaned-subtask-reconciliation-and-automated-epoch-recovery)_

---

## Phase 100: Deterministic Guardrails, AST Inline Template Elimination, Resilient Seed Loading & Automated Regression Mitigation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-100-deterministic-guardrails-ast-inline-template-elimination-resilient-seed-loading--automated-regression-mitigation)_


---

## Phase 47: Queue Execution Recovery, Stale Task Reclamation & Scheduler Resilience

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-47-queue-execution-recovery-stale-task-reclamation--scheduler-resilience)_

---

## Phase 55: Multi-Armed Bandit Model Exploration & Empirical Reward Engine

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-55-multi-armed-bandit-model-exploration--empirical-reward-engine)_

---

## Phase 56: Distributed Heterogeneous Fleet Orchestration & Hardware Telemetry

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-56-distributed-heterogeneous-fleet-orchestration--hardware-telemetry)_

---

## Phase 57: Rolling 100-Task Success Meter & Failure-to-Success Quality Telemetry

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-57-rolling-100-task-success-meter--failure-to-success-quality-telemetry)_

---

## Phase 59: Live Test Execution Stream & Dedicated Testing Panel (Refactoring 'Processes' View to 'Testing')

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-59-live-test-execution-stream--dedicated-testing-panel-refactoring-processes-view-to-testing)_

---

## Phase 60: Real Multi-Armed Bandit Implementation (Thompson Sampling, UCB-1 & Epsilon-Greedy Wireup)

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-60-real-multi-armed-bandit-implementation-thompson-sampling-ucb-1--epsilon-greedy-wireup)_

---

## Phase 62: AST Context Slicing, Import Pruning & Focused Prompt Generation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-62-ast-context-slicing-import-pruning--focused-prompt-generation)_

---

## Phase 63: Automated Remediation Loop & Compiler Diagnostic Feedback Propagation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-63-automated-remediation-loop--compiler-diagnostic-feedback-propagation)_

---

## Phase 64: Gitea Autonomous Worktree Management, PR Automation & Review Verdicts

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-64-gitea-autonomous-worktree-management-pr-automation--review-verdicts)_

---

## Phase 65: Mobile-First Testing View Polish, Responsive Process Manager & Live Test Telemetry

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-65-mobile-first-testing-view-polish-responsive-process-manager--live-test-telemetry)_

---

## Phase 66: Clean Slate Real-History Persistence & Model Stat Reset Daemon

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-66-clean-slate-real-history-persistence--model-stat-reset-daemon)_

---

## Phase 67: Real-Time Stream Tap Filtering & Multi-Task Tap Isolation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-67-real-time-stream-tap-filtering--multi-task-tap-isolation)_

---

## Phase 68: Multi-Model Load Balancer & VRAM-Aware Task Placement

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-68-multi-model-load-balancer--vram-aware-task-placement)_

---

## Phase 69: Telemetry Visual Redesign, Hardware Safety Limits & Self-Healing Pipeline Remediation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-69-telemetry-visual-redesign-hardware-safety-limits--self-healing-pipeline-remediation)_

---

## Phase 70: Schematic Code Generators, Import Scaffolding & Zero-Boilerplate Generation Architecture

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-70-schematic-code-generators-import-scaffolding--zero-boilerplate-generation-architecture)_

---

## Phase 71: Dataset Schema Versioning & Pluggable Compute / Inference Profiles

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-71-dataset-schema-versioning--pluggable-compute--inference-profiles)_

---

## Phase 72: Taskcade Metadata Specifiers, Granular Pipeline Hints & Agent Ingestion Protocol

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-72-taskcade-metadata-specifiers-granular-pipeline-hints--agent-ingestion-protocol)_

---


## Phase 74: Security Hardening, Operational Resilience & Infrastructure Mitigations

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-74-security-hardening-operational-resilience--infrastructure-mitigations)_

---

## Phase 76: Frontend Model Fleet Manager, Download Terminal & Tenancy Controls

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-76-frontend-model-fleet-manager-download-terminal--tenancy-controls)_

---

## Phase 80: Multi-Stage Staging (Gitea) to Production (GitHub) Release Gate & Batched Promotion Pipeline

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-80-multi-stage-staging-gitea-to-production-github-release-gate--batched-promotion-pipeline)_

---

## Phase 81: Autonomous Project File Ingestion, Architectural Decomposer & Acceptance Criteria Engine

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-81-autonomous-project-file-ingestion-architectural-decomposer--acceptance-criteria-engine)_

---

## Phase 82: Arena Telemetry Epoching & Clean-Slate Model Health Reset Engine

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-82-arena-telemetry-epoching--clean-slate-model-health-reset-engine)_

---

## Phase 83: Heterogeneous Hardware Detection, Zero-Config Hardware Profiler & Contributor Onboarding Engine

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-83-heterogeneous-hardware-detection-zero-config-hardware-profiler--contributor-onboarding-engine)_

---

## Phase 84: Auto-Mode Hardening & Bi-Directional GitHub Issue Sync

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-84-auto-mode-hardening--bi-directional-github-issue-sync)_

---

## Phase 85: Multi-Window Convergence Analytics, Git Regression Pinpointing & Plateau Intervention Dispatcher

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-85-multi-window-convergence-analytics-git-regression-pinpointing--plateau-intervention-dispatcher)_

---

## Phase 86: Distributed Fleet Load Balancing & Elastic Worker Scaling

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-86-distributed-fleet-load-balancing--elastic-worker-scaling)_

## Phase 87: Predictive Telemetry Pre-fetching & Caching Optimization

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-87-predictive-telemetry-pre-fetching--caching-optimization)_

---

## Phase 88: Critical Code-Safe Generation & Independent PR Assessment

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-88-critical-code-safe-generation--independent-pr-assessment)_

---

## Phase 89: Two-Tier Review Gates, Anti-Stub AST Enforcement & Role-Tiered Model Routing

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-89-two-tier-review-gates-anti-stub-ast-enforcement--role-tiered-model-routing)_

---

## Phase 96: Granular Test Suites, Strict Typing Hardening & Edge-Case Guardrails

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-96-granular-test-suites-strict-typing-hardening--edge-case-guardrails)_

---

## Phase 97: Hardware Diagnostics, Sensor Parsing & Dynamic Resolver Unit Tests

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-97-hardware-diagnostics-sensor-parsing--dynamic-resolver-unit-tests)_

---

## Phase 98: Heuristic Scrubbers, AST Parsers & Commit Generators Hardening

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-98-heuristic-scrubbers-ast-parsers--commit-generators-hardening)_

---

## Phase 99: Commit-to-Task Attribution, Deterministic Task Rehabilitation & Resilient Failure Requeue Pipeline

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-99-commit-to-task-attribution-deterministic-task-rehabilitation--resilient-failure-requeue-pipeline)_

---

## Rehabilitated Taskcade Queue

### Task taskcade-t97.1.1.2.2 Rehabilitation [2026-10-14T23:26:09.210Z]
- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T97.1.1: Write unit tests verifying lm-sensors regex parser extracts Celsius values acros (`taskcade-t97.1.1.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t97.1.1.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T97.1.1: Write unit tests verifying lm-sensors regex parser extracts Celsius values acros [Role: type_specialist] [Files: packages/engine/src/tests/sensors_parser.test.ts]
  - [x] `taskcade-t97.1.1.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T97.1.1: Write unit tests verifying lm-sensors regex parser extracts Celsius values acros [Role: implementer] [Files: packages/engine/src/tests/sensors_parser.test.ts]


_All active taskcade failure rehabilitations completed and verified. Archived in [`docs/taskcade-history.md`](taskcade-history.md)_
