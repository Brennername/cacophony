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

> [!IMPORTANT]
> **Execution Directives for Next Frontier Model Implementer:**
> The following phases constitute the highest-priority implementation pipeline above all others, structured for immediate frontier model execution:
>
> 1. **Priority 1: Phase 66 (Clean Slate Real-History Persistence & Model Stat Reset Daemon)**: Real-history persistence, automated cleanup, and model health resets.
> 2. **Priority 2: Phase 67 (Real-Time Stream Tap Filtering & Multi-Task Tap Isolation)**: SSE Last-Event-ID catch-up, multi-task tap isolation, and backpressure governor.
> 3. **Priority 3: Phase 68 (Dynamic Temperature & Top-P Hyperparameter Adaptation Engine)**: Task-type hyperparameter dynamic tuning and model recovery.

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

_RDF Category: security_
_Source: Operations evaluation conducted 2026-09-28. See operations_evaluation.md for full analysis._

### T74.1: HTTP Server Security Hardening (CORS, CSP, Rate Limiting)

- [x] T74.1.1: Replace open CORS origin reflection with allowlist-based validation accepting only localhost, RFC 1918 LAN, Docker internal, and configured custom_domain. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: resolveAllowedOrigin]
- [x] T74.1.2: Tighten Content-Security-Policy removing unsafe-eval, restricting sources to 'self', and adding standard security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy). [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: handleRequest]
- [x] T74.1.3: Implement in-memory token-bucket rate limiter (configurable via cacophony.json) limiting API requests per IP with separate thresholds for read vs mutating endpoints. [File: packages/engine/src/daemon/RateLimiter.ts] [Class: RateLimiter] [Test: npm test -- packages/engine/src/tests/rate_limiter.test.ts]
- [x] T74.1.4: Apply rate limiter middleware to all HTTP routes in CacophonyHttpServer.handleRequest() with configurable burst and sustained rate per client IP. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: handleRequest] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
- [ ] T74.1.5: Write unit tests verifying CORS allowlist rejects untrusted origins, rate limiter enforces token bucket, and security headers are present on all responses. [File: packages/engine/src/tests/http_security.test.ts] [Test: npm test -- packages/engine/src/tests/http_security.test.ts]

### T74.2: Authentication Enforcement & Consistent Auth Middleware

- [ ] T74.2.1: Apply auth middleware consistently to all mutating endpoints (POST, PUT, DELETE routes), not just POST /api/tasks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: handleRequest] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
- [ ] T74.2.2: Default REQUIRE_AUTH to true when network_profile.mode is 'lan_shared' or 'reverse_proxy', requiring explicit opt-out for unauthenticated access. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
- [ ] T74.2.3: Implement read-only role (VIEWER) for dashboard access without task mutation capability. [File: packages/engine/src/auth/AuthService.ts] [Test: npm test -- packages/engine/src/tests/auth_service.test.ts]
- [ ] T74.2.4: Write unit tests verifying auth enforcement on all mutating routes and VIEWER role restrictions. [File: packages/engine/src/tests/auth_enforcement.test.ts] [Test: npm test -- packages/engine/src/tests/auth_enforcement.test.ts]

### T74.3: Docker Hardening & Container Health Monitoring

- [x] T74.3.1: Add HEALTHCHECK instruction to Dockerfile using curl to /api/status with 30s interval and 3 retries. [File: Dockerfile] [Test: docker build && docker inspect --format='{{json .Config.Healthcheck}}']
- [x] T74.3.2: Add healthcheck configurations to all services in docker-compose.yml (engine, Gitea, Mailpit, Redis, Authentik). [File: docker-compose.yml] [Test: docker compose config --services]
- [ ] T74.3.3: Replace Docker socket bind mount for Authentik worker with Docker socket proxy image (ghcr.io/tecnativa/docker-socket-proxy) limiting API access to containers:read. [File: docker-compose.yml] [Service: cacophony-authentik-worker] [Test: docker compose up]
- [ ] T74.3.4: Remove root user directive from Authentik worker and configure proper UID/GID mapping. [File: docker-compose.yml] [Service: cacophony-authentik-worker] [Test: docker compose config]

### T74.4: CI/CD Security Scanning & Quality Gates

- [x] T74.4.1: Add npm audit --audit-level=moderate step to CI pipeline after npm ci. [File: .github/workflows/ci.yml] [Step: security-audit] [Test: Push to branch and verify CI]
- [x] T74.4.2: Add npm run lint step to CI pipeline to enforce consistent code quality. [File: .github/workflows/ci.yml] [Step: lint-check] [Test: Push to branch and verify CI]
- [ ] T74.4.3: Add Docker image scanning step using Trivy or Grype scanning the built container image for CVEs. [File: .github/workflows/ci.yml] [Step: container-scan] [Test: Push to branch and verify CI]
- [ ] T74.4.4: Add code coverage reporting with minimum threshold gate (e.g. 40% initial, incrementally raised). [File: .github/workflows/ci.yml] [Step: coverage-report] [Test: Push to branch and verify CI]

### T74.5: Vault Key Safety & Secret Lifecycle

- [x] T74.5.1: Add startup safety check in CacophonyDaemon rejecting the default all-zeros VAULT_MASTER_KEY with fatal error (bypassed in demo mode). [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: start]
- [x] T74.5.2: Remove hardcoded OIDC client secret from cacophony.example.json and replace with empty string. [File: conf/cacophony.example.json]
- [x] T74.5.3: Add HEROKU_API_KEY placeholder to .env.example for parity with .env usage. [File: .env.example]
- [x] T74.5.4: Document key rotation procedure for VAULT_MASTER_KEY in SECURITY.md including re-encryption steps for existing vault entries. [File: SECURITY.md] [Section: Key Rotation]

### T74.6: Structured Logging & Operational Observability

- [ ] T74.6.1: Create StructuredLogger utility in packages/engine/src/telemetry/ emitting JSON log lines with timestamp, level, module, correlationId, and message. [File: packages/engine/src/telemetry/StructuredLogger.ts] [Class: StructuredLogger] [Test: npm test -- packages/engine/src/tests/structured_logger.test.ts]
- [ ] T74.6.2: Replace bare console.log/console.error calls across CacophonyDaemon, CacophonyHttpServer, and TaskScheduler with StructuredLogger instances. [File: packages/engine/src/daemon/*.ts] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
- [ ] T74.6.3: Add configurable log level (DEBUG, INFO, WARN, ERROR) via LOG_LEVEL env var defaulting to INFO. [File: packages/engine/src/telemetry/StructuredLogger.ts] [Test: npm test -- packages/engine/src/tests/structured_logger.test.ts]
- [ ] T74.6.4: Write unit tests verifying JSON log output format, level filtering, and correlation ID propagation. [File: packages/engine/src/tests/structured_logger.test.ts] [Test: npm test -- packages/engine/src/tests/structured_logger.test.ts]

### T74.7: Database Backup & Recovery Mechanism

- [ ] T74.7.1: Implement DatabaseBackupService in packages/db/src/services/ creating timestamped PGlite directory snapshots. [File: packages/db/src/services/DatabaseBackupService.ts] [Class: DatabaseBackupService] [Test: npm test -- packages/db/src/tests/backup_service.test.ts]
- [ ] T74.7.2: Add POST /api/admin/backup endpoint triggering on-demand database snapshot with configurable retention count. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/admin/backup] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
- [ ] T74.7.3: Add CLI command bin/cacophony backup creating timestamped snapshot for cron-driven automated backups. [File: bin/cacophony] [Command: backup] [Test: bin/cacophony backup --dry-run]
- [ ] T74.7.4: Write unit tests verifying backup creation, retention pruning, and error handling for locked databases. [File: packages/db/src/tests/backup_service.test.ts] [Test: npm test -- packages/db/src/tests/backup_service.test.ts]

### T74.8: Test Code Type Safety Cleanup

- [ ] T74.8.1: Replace `: any` mock types in gitea_deep_integration.test.ts with properly typed mock interfaces. [File: packages/engine/src/tests/gitea_deep_integration.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_deep_integration.test.ts]
- [ ] T74.8.2: Replace `: any` mock types in closed_loop_pr_and_tools.test.ts with properly typed mock interfaces. [File: packages/engine/src/tests/closed_loop_pr_and_tools.test.ts] [Test: npm test -- packages/engine/src/tests/closed_loop_pr_and_tools.test.ts]
- [ ] T74.8.3: Replace `: any` mock types in autonomous_continuous_arena.test.ts and gitea_integration.test.ts. [File: packages/engine/src/tests/autonomous_continuous_arena.test.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
- [ ] T74.8.4: Replace `: any` mock types in GitWorktreeAndWebhook.test.ts and Inference.test.ts. [File: packages/engine/src/gitea/**tests**/GitWorktreeAndWebhook.test.ts] [Test: npm test]

---

## Phase 76: Frontend Model Fleet Manager, Download Terminal & Tenancy Controls

_RDF Category: frontend_
_Priority: SPRINT PRIORITY 2_

### T76.1: Model Fleet Console & Installed Model Grid

- [x] T76.1.1: Create ModelFleetService in packages/frontend/src/app/services/model-fleet.service.ts wrapping GET /api/models/installed, POST /api/models/pull, DELETE /api/models/:id, and config APIs with Angular Signals. [File: packages/frontend/src/app/services/model-fleet.service.ts] [Class: ModelFleetService] [Test: npm test]
- [x] T76.1.2: Redesign ModelsViewComponent in packages/frontend/src/app/components/views/models-view.component.ts to include an Installed Fleet Card Grid with parameter size, quantization, memory footprint, and protected tenancy pills. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Template: installed-fleet-grid] [Test: npm test]
- [x] T76.1.3: Add active memory indicator distinguishing models currently warm in VRAM from models dormant on disk. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Signal: warmModelId] [Test: npm test]
- [x] T76.1.4: Add action triggers per card: Benchmark Model button, Delete/Evict button (disabled with tooltip for protected models), and View Telemetry link. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Test: npm test]

### T76.2: Model Download Modal & Piped Terminal Progress Log

- [x] T76.2.1: Create ModelPullModalComponent in packages/frontend/src/app/components/model-pull-modal/model-pull-modal.component.ts with searchable curated catalog (qwen2.5-coder, gemma3, deepseek-coder) and custom tag input. [File: packages/frontend/src/app/components/model-pull-modal/model-pull-modal.component.ts] [Class: ModelPullModalComponent] [Test: npm test]
- [x] T76.2.2: Implement reactive download progress bar computing total downloaded bytes versus total layer size from model_pull_progress SSE stream. [File: packages/frontend/src/app/components/model-pull-modal/model-pull-modal.component.ts] [Signal: pullProgressPercent] [Test: npm test]
- [x] T76.2.3: Build embedded TerminalLogViewer component rendering piped monospace log output from Ollama pull stream with auto-scroll and status indicators. [File: packages/frontend/src/app/components/terminal-log-viewer/terminal-log-viewer.component.ts] [Class: TerminalLogViewerComponent] [Test: npm test]
- [ ] T76.2.4: Write frontend unit tests verifying modal open/close, SSE event binding, and terminal log appending during simulated downloads. [File: packages/frontend/src/app/components/model-pull-modal/model-pull-modal.component.spec.ts] [Test: npm test]

### T76.3: Tenancy Configuration & Whitelist Management Panel

- [x] T76.3.1: Build TenancyConfigPanelComponent in packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.ts with toggles for managedModelsEnabled and autoEvictionEnabled. [File: packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.ts] [Class: TenancyConfigPanelComponent] [Test: npm test]
- [x] T76.3.2: Implement interactive chip tag list for protectedModels whitelist, allowing operators to add and remove protected model wildcards. [File: packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.ts] [Signal: protectedModelsList] [Test: npm test]
- [x] T76.3.3: Add storage quota slider configuring maxDiskStorageGb with visual gauge indicating current disk usage vs quota. [File: packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.ts] [Test: npm test]
- [ ] T76.3.4: Write frontend unit tests validating form bindings, validation rules, and PUT /api/models/config payload generation. [File: packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.spec.ts] [Test: npm test]

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

---

## Phase 87: Predictive Telemetry Pre-fetching & Caching Optimization

_RDF Category: performance_and_optimization_

### T87.1: Pre-fetching Model Weights into VRAM

- [ ] T87.1.1: Implement `VramPrefetchCoordinator` in `packages/engine/src/inference/VramPrefetchCoordinator.ts` that monitors the `PENDING` queue and pre-loads the next required model into VRAM during the compilation stage of the current task. [File: packages/engine/src/inference/VramPrefetchCoordinator.ts] [Class: VramPrefetchCoordinator] [Test: npm test -- packages/engine/src/tests/vram_prefetch.test.ts]
- [ ] T87.1.2: Add `predictNextModel()` logic to `TaskScheduler` using queue heuristics (e.g., if a front-end task is finishing, a reviewer model will be needed next). [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: predictNextModel] [Test: npm test -- packages/engine/src/tests/scheduler.test.ts]
- [ ] T87.1.3: Expose `POST /api/models/preload` to trigger Ollama background loads without blocking task execution. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/models/preload] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]

---

## Phase 88: Critical Code-Safe Generation & Independent PR Assessment

### T88.1: Critical Work-Item Lineage and Separate Run Boundaries

- [ ] T88.1.1: Critical: Define durable work-item lineage fields for implementation, assessment round, finding, and fix task relationships so every stage can be queried without reopening a completed task. [File: packages/shared-types/src/task.ts] [Test: npm test -- packages/shared-types]
- [ ] T88.1.2: Critical: Add a lifecycle coordinator that completes the implementation task after verified PR publication and enqueues the next stage as separate queue work. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
- [ ] T88.1.3: Critical: Make PR, CI, and webhook callbacks idempotent using stable work-item, head-SHA, and stage-round keys. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]

### T88.2: Critical Multi-Model PR Assessment and Immutable Reports

- [ ] T88.2.1: Critical: Implement independent assessment tasks for distinct eligible models, excluding the implementation model by default, tied to one PR head SHA and assessment round, with read-only repository permissions. [File: packages/engine/src/gitea/PrAssessmentCoordinator.ts] [Class: PrAssessmentCoordinator] [Test: npm test -- packages/engine/src/tests/pr_assessment.test.ts]
- [ ] T88.2.2: Critical: Define and persist structured assessment reports with verdict, severity, category, file/line evidence, rationale, deterministic-fix hint, model identity, and test evidence. [File: packages/shared-types/src/review.ts] [Test: npm test -- packages/engine/src/tests/pr_assessment.test.ts]
- [ ] T88.2.3: Critical: Post each model's report and actionable findings to the corresponding GitHub or Gitea PR, preserving report-to-head-SHA provenance. [File: packages/engine/src/gitea/PrAssessmentPublisher.ts] [Class: PrAssessmentPublisher] [Test: npm test -- packages/engine/src/tests/pr_assessment.test.ts]
- [ ] T88.2.4: Critical: Display assessment round, assessor model, verdict, findings, evidence, CI outcome, and queue stage in task history and PR details. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test]

### T88.3: Critical Statistical Assessor Selection and Agreement Gate

- [ ] T88.3.1: Critical: Select distinct healthy models using role/category success statistics, sample confidence, and recency; record the weight inputs for every assignment. [File: packages/engine/src/scheduler/ModelRoleSelector.ts] [Test: npm test -- packages/engine/src/tests/model_role_selector.test.ts]
- [ ] T88.3.2: Critical: Define an explicit approval policy for required independent verdicts, unresolved critical findings, and required CI checks before merge. [File: packages/engine/src/gitea/AssessmentPolicy.ts] [Test: npm test -- packages/engine/src/tests/pr_assessment.test.ts]
- [ ] T88.3.3: Critical: Start a fresh assessment round whenever the PR head SHA changes and retain earlier reports for audit. [File: packages/db/src/repositories/ReviewReportRepository.ts] [Test: npm test -- packages/db/src/tests/ReviewReportRepository.test.ts]

### T88.4: Critical Queued Fix Stage and Eviction Fallback

- [ ] T88.4.1: Critical: Add a dedicated PR-finding fix role and a separate fix-task type linked to the original work item, PR, finding IDs, and assessment round. [File: packages/shared-types/src/task.ts] [Test: npm test -- packages/shared-types]
- [ ] T88.4.2: Critical: Implement weighted best-eligible fix-model selection from empirical role/category statistics, with recorded fallback to the next eligible model on eviction or health failure. [File: packages/engine/src/scheduler/ModelRoleSelector.ts] [Test: npm test -- packages/engine/src/tests/model_role_selector.test.ts]
- [ ] T88.4.3: Critical: Route whitelisted deterministic transformations through bounded rules; enqueue all other requested changes as a new fix task that verifies and updates the existing PR. [File: packages/engine/src/gitea/PrFixTaskCoordinator.ts] [Class: PrFixTaskCoordinator] [Test: npm test -- packages/engine/src/tests/pr_fix_task.test.ts]
- [ ] T88.4.4: Critical: Complete the fix task after push and verification, then enqueue a new independent assessment round without resuming the prior task run. [File: packages/engine/src/gitea/PrFixTaskCoordinator.ts] [Test: npm test -- packages/engine/src/tests/pr_fix_task.test.ts]
- [ ] T88.4.5: Critical: Add GitHub and Gitea action workflows that validate and execute only allowlisted deterministic fix envelopes against the PR head, run required checks, and enqueue a separate fix task when a fix cannot be applied or verified. [File: .github/workflows/review-remediation.yml .gitea/workflows/review-remediation.yml] [Test: CI workflow validation]

### T88.5: Critical Code-Safe Incremental Generation and Stub Rejection

- [ ] T88.5.1: Critical: Extend method-scoped generation context with resolved member contracts, references, and explicit peer-edit requests while excluding unrelated sibling implementations. [File: packages/engine/src/context/TypeScriptMethodSplicer.ts] [Test: npm test -- packages/engine/src/tests/method_splicer.test.ts]
- [x] T88.5.2: Critical: Reject placeholder comments, empty stubs, unexplained method removals, and out-of-target edits before writing; retain the original file bytes on rejection. [File: packages/engine/src/testing/GeneratedChangeGuard.ts] [Test: npm test -- packages/engine/src/tests/generated_change_guard.test.ts]
- [ ] T88.5.3: Critical: Add language-adapter contracts for parse, target-symbol range, body validation, surgical splice, and post-edit symbol inventory comparison. [File: packages/engine/src/context/MethodEditAdapter.ts] [Test: npm test -- packages/engine/src/tests/method_splicer.test.ts]

### T88.6: Critical Regression Verification for Review-to-Fix Lifecycle

- [ ] T88.6.1: Critical: Write integration tests for implementation completion -> PR publication -> independent model reports -> queued fix -> updated PR -> new assessment round -> policy-gated merge. [File: packages/engine/src/tests/pr_lifecycle.test.ts] [Test: npm test -- packages/engine/src/tests/pr_lifecycle.test.ts]
- [ ] T88.6.2: Critical: Write integration tests verifying idempotent CI failures create one queue item, retain commit/run evidence, and resume the correct workflow stage. [File: packages/engine/src/tests/ci_failure_queue.test.ts] [Test: npm test -- packages/engine/src/tests/ci_failure_queue.test.ts]
- [ ] T88.6.3: Critical: Write integration tests verifying assessor/fixer eviction does not lose findings, duplicate a completed run, or attribute one model's outcome to another model. [File: packages/engine/src/tests/pr_lifecycle.test.ts] [Test: npm test -- packages/engine/src/tests/pr_lifecycle.test.ts]

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

_All active taskcade failure rehabilitations completed and verified._


