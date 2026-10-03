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
5. **Reference**: See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 44.

---

## Active Milestone Era: Gitea Deep API Integration, Dynamic Branching, Least-Privilege Guardrails & Webhook Orchestration

*See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 44.*

---

## Active Sprint Priority Queue & Immediate Execution Order

> [!IMPORTANT]
> **Execution Directives for Next Frontier Model Implementer:**
> The following phases constitute the highest-priority implementation pipeline, aligned with sovereign Auto Mode, Staging-to-Production promotion, and hardware democratized contribution:
> 1. **Priority 1: Phase 82 (Arena Telemetry Epoching & Clean-Slate Model Health Reset Engine)**: Clear dirty bootstrap failure-cascade statistics, advance to Epoch 2, reset model eviction counters to 0, restore all evicted models (`gemma3:4b-it-qat`) to `ACTIVE`, and establish epoch-aware rolling metrics.
> 2. **Priority 2: Phase 80 (Multi-Stage Staging to Production Promotion Gate & Batched Promotion Pipeline)**: Implement the quarantine gauntlet between Gitea staging and public GitHub: full monorepo build verification (`npm run build`), 100% test gate, secret/hygiene scrubber, and batched release milestone PR bundling.
> 3. **Priority 3: Phase 84 (Auto-Mode Sovereign Loop Hardening & Bi-Directional GitHub Issue Sync)**: Defocus manual Plan and Build modes in favor of 24/7 sovereign Auto Mode; add pre-commit build gates in worktrees and poll public GitHub issues into the local queue.
> 4. **Priority 4: Phase 81 (Autonomous Project File Ingestion, Architectural Decomposer & Acceptance Criteria Engine)**: Enable drop-in spec file ingestion (`docs/spec.md`, `README.md`) that autonomously derives SOLID architectures, data schemas, machine-testable acceptance criteria, and topologically sequenced tasks.
> 5. **Priority 5: Phase 83 (Heterogeneous Hardware Detection, Zero-Config Hardware Profiler & Contributor Onboarding Engine)**: Implement pluggable telemetry and hyperparameter auto-sizing for external contributors running NVIDIA CUDA, Apple Silicon Metal, Intel Arc, or CPU inference.


---


## Phase 45: Real-Time Stream Tap Filtering, Telemetry HUD Metrics & Visual Pacing Alerts
*RDF Category: telemetry*

### T45.1: Real-Time Telemetry HUD Stream Filtering & Visual Pacing Alerts
  - [x] T45.1.1: Implement TelemetryHudBridge in packages/engine/src/telemetry/ streaming high-frequency AMD Vega sensor readouts (VRAM, APU frequency, edge temp, PPT watts) to WebSocket/SSE clients.
  - [x] T45.1.2: Add visual thermal pacing alert thresholds in frontend TelemetryBar for Nominal (<70C), Warm (70-79C), Elevated (80-89C), and Danger (>=90C).
  - [x] T45.1.3: Integrate automated pacing status in DashboardViewComponent showing active model pacing delays (0s, 5s, 15s).
  - [x] T45.1.4: Write frontend unit tests verifying reactive signal updates on telemetry threshold crossings.

---

## Phase 46: End-to-End Autonomous Pipeline Integration: Multi-Stage Telemetry, Git Worktrees & PR Automation
*RDF Category: orchestration*

### T46.1: Live Pipeline Multi-Stage Transitions & Real-Time Stepper Telemetry
  - [x] T46.1.1: Connect AutonomousWorkerPipeline stages (Planning, Generation, Scrubbing, Testing, Review, Merge) to stageRepo records and broadcast stage transitions over SSE. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T46.1.2: Update TaskInspectorComponent stage stepper to dynamically highlight active pipeline stages in real-time instead of hardcoded stage numbers. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test]
  - [x] T46.1.3: Persist generated code diffs directly into task.logSnippet so Code Diffs tab in TaskDetailModalComponent displays actual diffs. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T46.1.4: Write unit tests verifying stage transition broadcasts and stage timing telemetry. [File: packages/engine/src/tests/stage_telemetry.test.ts] [Test: npm test -- packages/engine/src/tests/stage_telemetry.test.ts]

### T46.2: Git Worktree Branch Isolation & Autonomous Gitea PR Publication
  - [x] T46.2.1: Integrate GitWorktreeManager with AutonomousWorkerPipeline: create ephemeral branch `task/<priority>-<taskId>` per task execution. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T46.2.2: Commit verified code modifications to task branch using git worktree without touching main workspace. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T46.2.3: Wire AutomatedPrPublisher to open pull requests in Gitea automatically upon test passing. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T46.2.4: Write integration tests verifying automated branch creation, commit creation, and PR publication workflow. [File: packages/engine/src/tests/gitea_integration.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]

---

## Phase 47: Queue Execution Recovery, Stale Task Reclamation & Scheduler Resilience
*RDF Category: persistence*

### T47.1: Stale Running Task Auto-Reclamation on Engine Startup
  - [x] T47.1.1: Implement TaskRepository.reclaimStaleRunningTasks(timeoutMinutes: number) transitioning tasks stranded in RUNNING state back to PENDING. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.reclaimStaleRunningTasks] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T47.1.2: Invoke reclaimStaleRunningTasks during CacophonyDaemon startup sequence before TaskScheduler.start(). [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: CacophonyDaemon.start] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [x] T47.1.3: Add REST endpoint POST /api/tasks/reclaim to trigger manual or scheduled reclamation of orphan running tasks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks/reclaim] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T47.1.4: Write unit tests verifying that stranded RUNNING tasks are cleanly requeued with failure counts preserved. [File: packages/db/src/__tests__/Database.test.ts] [Test: npm test --workspace=@cacophony/db dist/__tests__/Database.test.js]

### T47.2: Task Execution Timeout & Deadlock Watchdog
  - [x] T47.2.1: Add watchdog timer in TaskScheduler aborting tasks exceeding per-model max execution timeout. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Class: TaskScheduler] [Test: npm test -- packages/engine/src/tests/scheduler_timeout.test.ts]
  - [x] T47.2.2: Add ExecutionTimeoutError classification to FailureClassifier tagging tasks aborted by watchdog. [File: packages/engine/src/analytics/FailureClassifier.ts] [Class: FailureClassifier] [Test: npm test -- packages/engine/src/tests/failure_classifier.test.ts]
  - [x] T47.2.3: Record TIMEOUT stage failure in StageRepository with elapsed duration and partial output log. [File: packages/db/src/repositories/StageRepository.ts] [Method: StageRepository.recordStageCompletion] [Test: npm test -- packages/db/src/tests/StageRepository.test.ts]
  - [x] T47.2.4: Write unit tests simulating stalled LLM stream triggers watchdog timeout and transitions task to FAILED. [File: packages/engine/src/tests/scheduler_timeout.test.ts] [Test: npm test -- packages/engine/src/tests/scheduler_timeout.test.ts]

### T47.3: Scheduler Task Dispatch Backpressure & APU Temperature Governor
  - [x] T47.3.1: Implement thermal backpressure check in TaskScheduler.tick() delaying dispatch when edge temp exceeds 85C with emergency shutdown cutoff at 105C. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: TaskScheduler.tick] [Test: npm test -- packages/engine/src/tests/thermal_governor.test.ts]
  - [x] T47.3.2: Expose scheduler backpressure state (isBackpressured, backpressureReason) in GET /api/status. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/status] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T47.3.3: Update ArenaStateStore to consume scheduler backpressure state and reflect in frontend UI status badge. [File: packages/frontend/src/app/services/arena-state.store.ts] [Class: ArenaStateStore] [Test: npm test]
  - [x] T47.3.4: Write unit tests verifying scheduler pauses task dispatch during high thermal load and resumes automatically when cool. [File: packages/engine/src/tests/thermal_backpressure.test.ts] [Test: npm test -- packages/engine/src/tests/thermal_backpressure.test.ts]

### T47.4: PGlite Database Reconnection & Lockfile Recovery
  - [ ] T47.4.1: Implement stale lockfile detection in PGliteDriver recovering cleanly from unclean container restarts. [File: packages/db/src/drivers/PGliteDriver.ts] [Class: PGliteDriver] [Test: npm test -- packages/db/src/tests/pglite_driver.test.ts]
  - [ ] T47.4.2: Add health check query verification (SELECT 1) with retry backoff in PGliteDriver.connect(). [File: packages/db/src/drivers/PGliteDriver.ts] [Method: PGliteDriver.connect] [Test: npm test -- packages/db/src/tests/pglite_driver.test.ts]
  - [ ] T47.4.3: Implement safe database disconnect and lock release on process SIGTERM and SIGINT in CacophonyDaemon. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: CacophonyDaemon.stop] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [ ] T47.4.4: Write unit tests verifying PGlite driver re-establishes connection and handles concurrency locks gracefully. [File: packages/db/src/tests/pglite_resilience.test.ts] [Test: npm test -- packages/db/src/tests/pglite_resilience.test.ts]

### T47.5: Continuous Queue Ingestion & Priority-Based Preemption
  - [ ] T47.5.1: Enhance TaskRepository.listPending() to order by effective priority considering both base priority and wait age. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.listPending] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T47.5.2: Implement starvation prevention bumping tasks waiting longer than 15 minutes up one priority level. [File: packages/engine/src/scheduler/QueueGroomer.ts] [Class: QueueGroomer] [Test: npm test -- packages/engine/src/tests/queue_groomer.test.ts]
  - [ ] T47.5.3: Add batch task creation endpoint POST /api/tasks/batch for atomic bulk enqueue of decomposed epics. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks/batch] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T47.5.4: Write unit tests validating that P0 tasks preempt lower-priority tasks while preventing starvation of P2 tasks. [File: packages/engine/src/tests/priority_preemption.test.ts] [Test: npm test -- packages/engine/src/tests/priority_preemption.test.ts]

### T47.6: Queue Seed Dispatcher for Self-Hosting Bootstrap
  - [x] T47.6.1: Create TaskcadeSeedLoader reading pending tasks from docs/taskcade.md and parsing them into typed TaskRecord objects. [File: packages/engine/src/scheduler/TaskcadeSeedLoader.ts] [Class: TaskcadeSeedLoader] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts]
  - [x] T47.6.2: Add CLI command bin/seed-queue.ts to enqueue uncompleted checklist items from active taskcade phase. [File: bin/seed-queue.ts] [Test: node bin/seed-queue.ts --dry-run]
  - [x] T47.6.3: Implement duplicate task prevention ensuring identical task IDs or titles are not re-enqueued. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.createIfNotExists] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T47.6.4: Write integration tests verifying seed loader correctly extracts markdown task items and registers them in DB. [File: packages/engine/src/tests/seed_loader.test.ts] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts]

---

## Phase 48: UI Mock Elimination & Full-Stack Service Wiring
*RDF Category: frontend*
*Note: Targets production UI and component stub mocks only. Preserves `MockInferenceStreamProvider` and `FallbackTelemetryProvider` for `DEMO_MODE=true` / `SIMULATION_MODE=true` visual showcase functionality.*

### T48.1: Eliminate Mock in FrontierModalComponent via Real Decomposition API
  - [ ] T48.1.1: Add backend endpoint POST /api/tasks/decompose invoking FrontierTaskDecomposer.decomposeEpic(). [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks/decompose] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T48.1.2: Remove simulateDecomposition() setTimeout mock in FrontierModalComponent and call /api/tasks/decompose via fetch. [File: packages/frontend/src/app/components/frontier-modal/frontier-modal.component.ts] [Method: FrontierModalComponent.decomposeWithFrontier] [Test: npm test]
  - [ ] T48.1.3: Wire FrontierModalComponent.commitTasks() to call POST /api/tasks/batch to persist decomposed tasks directly to database. [File: packages/frontend/src/app/components/frontier-modal/frontier-modal.component.ts] [Method: FrontierModalComponent.commitTasks] [Test: npm test]
  - [ ] T48.1.4: Write frontend unit tests verifying FrontierModalComponent states (analyzing, previews rendered, commit dispatched). [File: packages/frontend/src/app/components/frontier-modal/frontier-modal.component.spec.ts] [Test: npm test]

### T48.2: Eliminate Mock in FleetViewComponent via Dynamic Hardware & Node Queries
  - [ ] T48.2.1: Initialize nodes signal in FleetViewComponent as empty array instead of hardcoded node-master-vega dummy objects. [File: packages/frontend/src/app/components/views/fleet-view.component.ts] [Class: FleetViewComponent] [Test: npm test]
  - [ ] T48.2.2: Implement FleetNodeManager in engine registering local engine as node-local on startup with live telemetry. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Class: FleetNodeManager] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [ ] T48.2.3: Update GET /api/fleet/nodes in CacophonyHttpServer to return live registered nodes from FleetNodeManager. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/fleet/nodes] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T48.2.4: Write frontend unit tests verifying FleetViewComponent displays real node telemetry and handles empty node lists cleanly. [File: packages/frontend/src/app/components/views/fleet-view.component.spec.ts] [Test: npm test]

### T48.3: Eliminate Mock in GanttTransportComponent via Real Stage Spans
  - [x] T48.3.1: Remove hardcoded default fake spans array from GanttTransportComponent inputs and default to empty array. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.ts] [Class: GanttTransportComponent] [Test: npm test]
  - [x] T48.3.2: Bind TaskInspectorComponent to pass live task stage spans into app-gantt-transport [spans]="activeTaskSpans()". [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Class: TaskInspectorComponent] [Test: npm test]
  - [x] T48.3.3: Implement activeTaskSpans computed signal in TaskInspectorComponent fetching /api/tasks/:id/gantt for current task. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Computed: activeTaskSpans] [Test: npm test]
  - [x] T48.3.4: Write frontend unit tests verifying GanttTransportComponent renders real stage timelines with correct millisecond offsets. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.spec.ts] [Test: npm test]

### T48.4: Eliminate Mock in RepoStateService & RepoMapViewerComponent via AST Harvester
  - [ ] T48.4.1: Implement WorkspaceSymbolHarvester in packages/engine/src/repomap/ using TypeScript Compiler API to extract actual symbols. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Class: WorkspaceSymbolHarvester] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [ ] T48.4.2: Replace static symbols in GET /api/repomap with live output from WorkspaceSymbolHarvester. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/repomap] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T48.4.3: Update RepoStateService.fetchRepoSymbols() to handle dynamic node centrality and symbol types without static fallbacks. [File: packages/frontend/src/app/services/repo-state.service.ts] [Method: RepoStateService.fetchRepoSymbols] [Test: npm test]
  - [ ] T48.4.4: Write unit tests verifying that TypeScript classes, interfaces, and methods in packages/ are correctly mapped to RepoSymbolNode. [File: packages/engine/src/tests/symbol_harvester.test.ts] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]

### T48.5: Eliminate Mock in CheckpointTimelineComponent via Git Shadow Checkpoints
  - [ ] T48.5.1: Implement GitCheckpointManager in packages/engine/src/gitea/ querying git log --tags=checkpoint-* for shadow commit history. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Class: GitCheckpointManager] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [ ] T48.5.2: Replace static single checkpoint in GET /api/checkpoints with dynamic checkpoint records from GitCheckpointManager. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/checkpoints] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T48.5.3: Add POST /api/checkpoints/:id/revert endpoint executing git checkout or git reset to target checkpoint. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/checkpoints/:id/revert] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T48.5.4: Write frontend unit tests verifying CheckpointTimelineComponent dispatches undo/redo requests to revert API. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.spec.ts] [Test: npm test]

### T48.6: Mount and Wire ExecutionModeSelectorComponent Across App & Backend
  - [ ] T48.6.1: Add executionMode signal ('plan' | 'build' | 'auto') to ArenaStateStore with localStorage persistence. [File: packages/frontend/src/app/services/arena-state.store.ts] [Signal: executionMode] [Test: npm test]
  - [ ] T48.6.2: Bind ExecutionModeSelectorComponent in app.ts to ArenaStateStore.executionMode with two-way signal binding. [File: packages/frontend/src/app/app.ts] [Template: app-execution-mode-selector] [Test: npm test]
  - [ ] T48.6.3: Add GET/PUT /api/config/execution-mode endpoints in CacophonyHttpServer syncing safety mode with engine daemon. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: /api/config/execution-mode] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T48.6.4: Write frontend unit tests verifying safety mode toggling updates store, notifies backend, and adjusts UI indicators. [File: packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.spec.ts] [Test: npm test]

### T48.7: Wire ExplorationControlComponent to Real BanditTaskScheduler Telemetry
  - [ ] T48.7.1: Add GET /api/bandit/arms endpoint in CacophonyHttpServer exposing live BanditTaskScheduler arm statistics. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/bandit/arms] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T48.7.2: Add PUT /api/bandit/policy endpoint in CacophonyHttpServer dynamically updating active exploration policy and epsilon. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: PUT /api/bandit/policy] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T48.7.3: Remove hardcoded dummy arms from ExplorationControlComponent and fetch real arms from /api/bandit/arms on init. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Class: ExplorationControlComponent] [Test: npm test]
  - [ ] T48.7.4: Write frontend unit tests verifying policy selection and epsilon slider changes call backend API and update signals. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm test]

### T48.8: Wire LspTestLoopPanelComponent to Real Language Server Diagnostics
  - [ ] T48.8.1: Implement LspDiagnosticCollector in packages/engine/src/lsp/ running TypeScript compiler diagnostics across modified files. [File: packages/engine/src/lsp/LspDiagnosticCollector.ts] [Class: LspDiagnosticCollector] [Test: npm test -- packages/engine/src/tests/lsp_collector.test.ts]
  - [ ] T48.8.2: Replace empty array in GET /api/diagnostics with real compiler error/warning diagnostics from LspDiagnosticCollector. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/diagnostics] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T48.8.3: Wire RepomapViewComponent to pass live diagnostics and scoped test runner state into LspTestLoopPanelComponent. [File: packages/frontend/src/app/components/views/repomap-view.component.ts] [Class: RepomapViewComponent] [Test: npm test]
  - [ ] T48.8.4: Write frontend unit tests verifying LspTestLoopPanelComponent renders error pills with line numbers and triggers reRunTests. [File: packages/frontend/src/app/components/lsp-test-loop-panel/lsp-test-loop-panel.component.spec.ts] [Test: npm test]

### T48.9: Mobile-First Shell Fit & Responsive Viewport Elimination of Pinch-to-Zoom
  - [x] T48.9.1: Constrain ExecutionModeSelectorComponent and SessionTabsComponent with :host display block, width 100%, and min-width 0, removing the 140px fixed option width blowout. [File: packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.ts] [Test: npm test]
  - [x] T48.9.2: Constrain HardwareMonitorComponent badges, subtext, and sensors-grid using minmax(0, 1fr) and flexible high-water mark badge widths. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Test: npm test]
  - [x] T48.9.3: Add word-break break-all and overflow-wrap anywhere to TaskInspectorComponent terminal logs and enable touch scrolling on stepper container. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test]
  - [x] T48.9.4: Add global viewport shield to styles.css ensuring all media, tables, pre/code blocks, and component hosts conform to 100% viewport width without horizontal scrollbars. [File: packages/frontend/src/styles.css] [Test: npm test]

---

## Phase 49: Centralized Multi-Stage Telemetry Engine & Live Operational Console
*RDF Category: telemetry*

### T49.1: Instrument AutonomousWorkerPipeline for All Six Pipeline Stages
  - [ ] T49.1.1: Record 'planning' stage in stageRepo on task dispatch: duration of context assembly and focus file discovery. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Stage: planning] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T49.1.2: Record 'generation' stage in stageRepo: duration of LLM inference, total input tokens, total output tokens, and average tok/s. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Stage: generation] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T49.1.3: Record 'scrub' stage in stageRepo: AST parameter correction checks, placeholder stub detection, and rule diff summary. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Stage: scrub] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T49.1.4: Record 'git_commit' stage in stageRepo: worktree branch creation, commit SHA, and changed file list. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Stage: git_commit] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]

### T49.2: Broadcast Real-Time Stage Transitions Over Server-Sent Events
  - [ ] T49.2.1: Add event types 'stage_start', 'stage_progress', and 'stage_complete' to SSE event contract in shared-types. [File: packages/shared-types/src/index.ts] [Type: SseEventType] [Test: npm test -- packages/engine/src/tests/sse_stream.test.ts]
  - [ ] T49.2.2: Emit SSE events from AutonomousWorkerPipeline at the boundary of each pipeline stage transition. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: broadcastStageTransition] [Test: npm test -- packages/engine/src/tests/sse_stream.test.ts]
  - [ ] T49.2.3: Update ArenaStateStore to listen for 'stage_start' and 'stage_complete' events and update active task signals. [File: packages/frontend/src/app/services/arena-state.store.ts] [Method: handleSseMessage] [Test: npm test]
  - [ ] T49.2.4: Write unit tests verifying that SSE clients receive properly serialized stage transition payloads in real-time. [File: packages/engine/src/tests/sse_stage_events.test.ts] [Test: npm test -- packages/engine/src/tests/sse_stage_events.test.ts]

### T49.3: Centralized Operational Log Stream in TaskInspectorComponent
  - [ ] T49.3.1: Create OperationalLogAggregator in engine interleaving LLM tokens, rule scrubber logs, compiler stdout, and git output. [File: packages/engine/src/telemetry/OperationalLogAggregator.ts] [Class: OperationalLogAggregator] [Test: npm test -- packages/engine/src/tests/log_aggregator.test.ts]
  - [ ] T49.3.2: Expose unified operational log stream via GET /api/tasks/:id/operational-log for active and historical tasks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/tasks/:id/operational-log] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T49.3.3: Replace token-only terminal in TaskInspectorComponent with tabbed or unified console showing compiler and test outputs. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Class: TaskInspectorComponent] [Test: npm test]
  - [ ] T49.3.4: Write frontend unit tests verifying that terminal display updates when test execution stdout or review comments arrive. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.spec.ts] [Test: npm test]

### T49.4: Dynamically Bind TaskInspector Stepper to Active Stage
  - [ ] T49.4.1: Create activeStageIndex computed signal in TaskInspectorComponent mapping stage name to step index 1 through 6. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Computed: activeStageIndex] [Test: npm test]
  - [ ] T49.4.2: Replace static .step.done and .step.active CSS classes with dynamic [class.done] and [class.active] bindings. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Template: stepper-container] [Test: npm test]
  - [ ] T49.4.3: Add error state styling to stepper circle when active stage status is 'FAILURE'. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Style: .step.failed] [Test: npm test]
  - [ ] T49.4.4: Write frontend unit tests verifying stepper advances correctly across Planning, Generation, Scrub, Test, Review, Merge. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.spec.ts] [Test: npm test]

### T49.5: Dynamically Bind StageProgressBarComponent to Current Stage
  - [ ] T49.5.1: Compute currentStageNumber (1-6) and activeStageLabel dynamically from task's active stage record in store. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Class: TaskInspectorComponent] [Test: npm test]
  - [ ] T49.5.2: Replace hardcoded currentStageNumber="3" and activeStageLabel="3/7 Generation" with dynamic inputs. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Template: app-stage-progress-bar] [Test: npm test]
  - [ ] T49.5.3: Calculate progressPercent based on completed stages count (e.g. 1/6 = 16%, 2/6 = 33%, etc.). [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Computed: taskProgressPercent] [Test: npm test]
  - [ ] T49.5.4: Write frontend unit tests verifying StageProgressBarComponent updates fill width and label as stages advance. [File: packages/frontend/src/app/components/stage-progress-bar/stage-progress-bar.component.spec.ts] [Test: npm test]

### T49.6: Populate TaskDetailModalComponent Stages Tab with Real Stage Telemetry
  - [ ] T49.6.1: Ensure GET /api/tasks/:id populates stages array with full records from StageRepository. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/tasks/:id] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T49.6.2: Format stage log accordion in TaskDetailModalComponent to display tokens, duration, and formatted stdout/stderr. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: stages-list] [Test: npm test]
  - [ ] T49.6.3: Add visual status badges (PENDING, RUNNING, SUCCESS, FAILURE) with distinct accessible color coding per stage. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Styles: stage-status] [Test: npm test]
  - [ ] T49.6.4: Write frontend unit tests verifying that all recorded execution stages render in chronological order with correct durations. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm test]

### T49.7: Populate TaskDetailModalComponent Code Diffs Tab with Unified Git Diffs
  - [ ] T49.7.1: Capture git diff of modified focus files inside worktree before commit in AutonomousWorkerPipeline. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: captureWorktreeDiff] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T49.7.2: Store captured diff in task.logSnippet or dedicated diff_summary column in tasks table. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updateLogSnippet] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T49.7.3: Render syntax-highlighted git diff (+ added, - deleted) in Code Diffs tab of TaskDetailModalComponent. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: diff-content] [Test: npm test]
  - [ ] T49.7.4: Write frontend unit tests verifying that Code Diffs tab displays actual patch lines when task modifies code. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm test]

### T49.8: Populate TaskDetailModalComponent Test Stderr Tab with Real Runner Output
  - [ ] T49.8.1: Persist test stdout and stderr snippets into test_execution stage logOutput in StageRepository. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T49.8.2: Extract test stderr from test_execution stage in TaskDetailModalComponent to populate Test Stderr tab. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Computed: testStderrContent] [Test: npm test]
  - [ ] T49.8.3: Add empty state message ("No test failures or stderr warnings recorded") when test suite passed with zero errors. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: tab-stderr] [Test: npm test]
  - [ ] T49.8.4: Write frontend unit tests verifying Test Stderr tab correctly displays assertion failures from failed test runs. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm test]

---

## Phase 50: Git Worktree Isolation & Ephemeral Task Branch Lifecycle
*RDF Category: orchestration*

### T50.1: Git Worktree Allocation on Task Dispatch
  - [ ] T50.1.1: Implement GitWorktreeManager.createWorktreeForTask(taskId, branchName) creating isolated directory under /workspaces. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: GitWorktreeManager.createWorktreeForTask] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.1.2: Derive deterministic branch name task/<priority>-<taskId>-<slug> from task attributes. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: generateBranchName] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.1.3: Update task record in TaskRepository with targetBranch name upon worktree allocation. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updateTargetBranch] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T50.1.4: Write unit tests verifying that worktrees are created on separate isolated branches without locking root repo. [File: packages/engine/src/tests/git_worktrees.test.ts] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]

### T50.2: Redirect File Write Operations & Scrubber Hooks to Worktree
  - [ ] T50.2.1: Update AutonomousWorkerPipeline to write generated code into worktree path instead of workspaceRoot. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [ ] T50.2.2: Pass worktree directory as projectRoot to RulePipelineEngine pre-write and post-write hooks. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [ ] T50.2.3: Ensure root workspace remains completely clean (git status porcelain is empty) during task execution. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Assertion: rootWorkspaceClean] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [ ] T50.2.4: Write unit tests confirming that code edits happen exclusively within the task's assigned worktree folder. [File: packages/engine/src/tests/worktree_isolation.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_isolation.test.ts]

### T50.3: Execute Sandboxed Test Runner Inside Worktree CWD
  - [ ] T50.3.1: Configure SandboxedProcessRunner options to use worktree path as execution cwd. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [RunnerOption: cwd] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [ ] T50.3.2: Symlink or reference root node_modules into ephemeral worktree to prevent redundant npm install overhead. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: linkDependencies] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.3.3: Capture test runner exit code and stdout/stderr executed directly within worktree environment. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [ ] T50.3.4: Write unit tests verifying test suite executes against modified files in worktree and reports accurate pass/fail. [File: packages/engine/src/tests/worktree_test_runner.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_test_runner.test.ts]

### T50.4: Automated Git Commit Generation with Strict Conventional Formatting
  - [ ] T50.4.1: Stage modified focus files using git add inside the worktree directory. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: stageFiles] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.4.2: Create commit with message feat(arena): [taskId] <title> omitting emojis and authoring as Cacophony Agent. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: commitWorktree] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.4.3: Extract git commit SHA and record commit metadata in task_stages git_commit record. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [ ] T50.4.4: Write unit tests verifying git commit creation, commit message formatting, and SHA extraction. [File: packages/engine/src/tests/git_commit.test.ts] [Test: npm test -- packages/engine/src/tests/git_commit.test.ts]

### T50.5: Git Worktree Teardown & Safe Pruning
  - [ ] T50.5.1: Implement GitWorktreeManager.removeWorktree(taskId) safely unmounting and removing worktree directory. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: GitWorktreeManager.removeWorktree] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.5.2: Execute git worktree prune on task finalization to keep git repository metadata clean. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: pruneWorktrees] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.5.3: Ensure worktree cleanup occurs in a finally block so failures and timeouts still clean up disk space. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Block: finally] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [ ] T50.5.4: Write unit tests verifying that worktree folders are cleanly deleted after task completion. [File: packages/engine/src/tests/worktree_cleanup.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_cleanup.test.ts]

### T50.6: Worktree Collision Detection & Stale Directory Eviction
  - [ ] T50.6.1: Check if worktree directory already exists prior to allocation and force-prune orphaned worktrees. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: ensureCleanWorktreeDir] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.6.2: Add orphan worktree garbage collection sweep on CacophonyDaemon startup. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: sweepOrphanWorktrees] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [ ] T50.6.3: Implement worktree disk usage quota check warning if total worktrees exceed configured storage threshold. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: checkWorktreeDiskUsage] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.6.4: Write unit tests verifying collision avoidance when consecutive tasks have identical branch identifiers. [File: packages/engine/src/tests/worktree_collision.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_collision.test.ts]

### T50.7: Git Status & Changed File Telemetry Capture
  - [ ] T50.7.1: Query git status --porcelain inside worktree after test pass to verify exact list of modified files. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: getChangedFiles] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.7.2: Verify no untracked binaries, node_modules artifacts, or secret files (.env) are included in change set. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: validateCleanChangeset] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [ ] T50.7.3: Persist changed file paths and line delta metrics (added/deleted counts) into task record. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updateMetrics] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T50.7.4: Write unit tests ensuring changesets containing prohibited files are rejected before commit creation. [File: packages/engine/src/tests/changeset_validation.test.ts] [Test: npm test -- packages/engine/src/tests/changeset_validation.test.ts]

---

## Phase 51: Autonomous Gitea PR Publication & Webhook Synchronization
*RDF Category: orchestration*

### T51.1: Push Ephemeral Task Branch to Gitea Remote
  - [ ] T51.1.1: Implement GitWorktreeManager.pushBranch(branchName) pushing committed branch to Gitea origin. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: pushBranch] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T51.1.2: Resolve Gitea authenticated push URL using configured GITEA_API_TOKEN from secret vault. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: getAuthenticatedRemoteUrl] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T51.1.3: Add retry backoff for network push operations handling transient Docker network latency. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: pushWithRetry] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T51.1.4: Write integration tests verifying branch push creates branch on local Gitea instance. [File: packages/engine/src/tests/gitea_push.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_push.test.ts]

### T51.2: Open Gitea Pull Request via REST API
  - [ ] T51.2.1: Call GiteaApiClient.createPullRequest() specifying head branch, base branch (master), title, and body. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Method: publishPullRequest] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T51.2.2: Generate structured markdown PR description including prompt directive, focus files, and test output. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Method: generatePrBody] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T51.2.3: Record pr_url and pr_number in tasks table and broadcast 'pr_opened' event over SSE. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updatePrUrl] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T51.2.4: Write integration tests verifying PR creation returns valid PR number and HTML URL from Gitea. [File: packages/engine/src/tests/gitea_pr_creation.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_pr_creation.test.ts]

### T51.3: Update Gitea Commit Status Checks
  - [ ] T51.3.1: Implement GiteaApiClient.createCommitStatus(owner, repo, sha, statusPayload) setting commit status. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Method: createCommitStatus] [Test: npm test -- packages/engine/src/tests/gitea_api_client.test.ts]
  - [ ] T51.3.2: Report 'pending' status when task begins verification tests, and 'success' upon test passing. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Method: updateCommitCheck] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T51.3.3: Set commit status context to "cacophony/test-suite" with description showing execution duration. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Constant: COMMIT_STATUS_CONTEXT] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T51.3.4: Write unit tests verifying that commit status payloads conform to Gitea OpenAPI commit status schema. [File: packages/engine/src/tests/gitea_commit_status.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_commit_status.test.ts]

### T51.4: Register Gitea Webhooks for Real-Time Notification
  - [ ] T51.4.1: Implement GiteaWebhookBootstrap ensuring repo webhook pointing to /api/webhooks/gitea exists on startup. [File: packages/engine/src/gitea/GiteaWebhookReceiver.ts] [Method: ensureWebhookRegistered] [Test: npm test -- packages/engine/src/tests/gitea_webhooks.test.ts]
  - [ ] T51.4.2: Sign webhook payloads with shared secret and verify HMAC-SHA256 signature in GiteaWebhookReceiver. [File: packages/engine/src/gitea/GiteaWebhookReceiver.ts] [Method: verifySignature] [Test: npm test -- packages/engine/src/tests/gitea_webhooks.test.ts]
  - [ ] T51.4.3: Handle pull_request events ('opened', 'closed', 'reopened', 'synchronized') updating task state in DB. [File: packages/engine/src/gitea/GiteaWebhookReceiver.ts] [Method: handlePullRequestEvent] [Test: npm test -- packages/engine/src/tests/gitea_webhooks.test.ts]
  - [ ] T51.4.4: Write unit tests verifying that valid webhook events trigger appropriate repository state updates. [File: packages/engine/src/tests/gitea_webhooks.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_webhooks.test.ts]

### T51.5: Gitea OAuth2 & API Token Secure Lifecycle
  - [ ] T51.5.1: Implement GiteaTokenRotator checking token expiration and requesting fresh tokens via OAuth2 refresh grant. [File: packages/engine/src/gitea/GiteaOAuthProvider.ts] [Method: refreshToken] [Test: npm test -- packages/engine/src/tests/gitea_auth.test.ts]
  - [ ] T51.5.2: Store updated access and refresh tokens encrypted in secret_vault table using AES-256-GCM. [File: packages/db/src/repositories/VaultRepository.ts] [Method: VaultRepository.saveSecret] [Test: npm test -- packages/db/src/tests/VaultRepository.test.ts]
  - [ ] T51.5.3: Fallback gracefully to GITEA_API_TOKEN environment variable when OAuth2 token is unavailable. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Method: resolveAuthHeader] [Test: npm test -- packages/engine/src/tests/gitea_api_client.test.ts]
  - [ ] T51.5.4: Write unit tests verifying encrypted storage and retrieval of Gitea authentication tokens. [File: packages/engine/src/tests/gitea_token_vault.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_token_vault.test.ts]

### T51.6: PR Link Display in Frontend Task Lists & Modals
  - [ ] T51.6.1: Update TaskHistoryComponent to render clickable Gitea PR link badge with external link icon. [File: packages/frontend/src/app/components/task-history/task-history.component.ts] [Template: pr-link-badge] [Test: npm test]
  - [ ] T51.6.2: Ensure TaskDetailModalComponent overview tab renders active PR URL linking directly to Gitea web UI. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: pr-link] [Test: npm test]
  - [ ] T51.6.3: Add PR status badge ('OPEN', 'MERGED', 'CLOSED') dynamically based on Gitea PR state. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Component: PrStatusBadge] [Test: npm test]
  - [ ] T51.6.4: Write frontend unit tests verifying that PR link badges display correctly when task.prUrl is populated. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm test]

### T51.7: Gitea Webhook Heartbeat & Connection Health Telemetry
  - [ ] T51.7.1: Add Gitea connection status check (HTTP reachability and API latency) in GET /api/status. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/status] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T51.7.2: Broadcast 'gitea_status' event over SSE when Gitea connectivity transitions between ONLINE and OFFLINE. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: checkGiteaHealth] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T51.7.3: Display Gitea service status indicator in frontend TelemetryBar alongside database and Ollama indicators. [File: packages/frontend/src/app/components/views/dashboard-view.component.ts] [Template: gitea-status-indicator] [Test: npm test]
  - [ ] T51.7.4: Write unit tests verifying Gitea health check accurately detects network timeouts and server errors. [File: packages/engine/src/tests/gitea_health.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_health.test.ts]

---

## Phase 52: Autonomous Code Review Loop & Remediation Requeue Engine
*RDF Category: orchestration*

### T52.1: Execution Mode Guard: Plan, Build, and Auto Routing
  - [ ] T52.1.1: Implement ExecutionSafetyGuard in AutonomousWorkerPipeline enforcing mode constraints. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Class: ExecutionSafetyGuard] [Test: npm test -- packages/engine/src/tests/safety_modes.test.ts]
  - [ ] T52.1.2: In 'plan' mode: simulate task execution, generate diff preview, do NOT commit or push, mark COMPLETED. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Mode: plan] [Test: npm test -- packages/engine/src/tests/safety_modes.test.ts]
  - [ ] T52.1.3: In 'build' mode: apply edits and run tests, commit to branch and open PR, pause for human approval. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Mode: build] [Test: npm test -- packages/engine/src/tests/safety_modes.test.ts]
  - [ ] T52.1.4: In 'auto' mode: execute full closed loop: generate, test, commit, PR, review with model, and auto-merge. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Mode: auto] [Test: npm test -- packages/engine/src/tests/safety_modes.test.ts]

### T52.2: Automated PR Reviewer Model Dispatch
  - [ ] T52.2.1: Select best available model (e.g. deepseek-r1:8b or qwen2.5-coder:7b) for the 'reviewer' role. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: selectReviewerModel] [Test: npm test -- packages/engine/src/tests/pr_review_loop.test.ts]
  - [ ] T52.2.2: Assemble review prompt with architectural directives, PR unified diff, original task directive, and test output. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: assembleReviewPrompt] [Test: npm test -- packages/engine/src/tests/pr_review_loop.test.ts]
  - [ ] T52.2.3: Execute inference with reviewer model and stream review tokens into review stage stream tap. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: evaluatePullRequest] [Test: npm test -- packages/engine/src/tests/pr_review_loop.test.ts]
  - [ ] T52.2.4: Write unit tests verifying that reviewer prompt includes full diff context and architectural guidelines. [File: packages/engine/src/tests/reviewer_prompt.test.ts] [Test: npm test -- packages/engine/src/tests/reviewer_prompt.test.ts]

### T52.3: Structural Review Verdict Parsing
  - [x] T52.3.1: Implement ReviewVerdictParser extracting VERDICT: APPROVE | REQUEST_CHANGES | REJECT from model response. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Class: ReviewVerdictParser] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]
  - [ ] T52.3.2: Extract line-level review comments: file path, line number, severity ('blocker' | 'warning' | 'nit'), comment text. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: parseInlineComments] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]
  - [ ] T52.3.3: Handle ambiguous or unformatted model outputs by defaulting to REQUEST_CHANGES with explanatory note. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: handleUnparseableReview] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]
  - [x] T52.3.4: Write unit tests covering diverse model response formats to ensure robust verdict and comment extraction. [File: packages/engine/src/tests/verdict_parser.test.ts] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]

### T52.4: Post Review Comments & Verdict to Gitea PR
  - [ ] T52.4.1: Call GiteaApiClient.submitReview(owner, repo, prNumber, reviewPayload) with verdict and summary notes. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Method: submitReview] [Test: npm test -- packages/engine/src/tests/gitea_api_client.test.ts]
  - [ ] T52.4.2: Post inline review comments to specific diff lines using Gitea PR review comment API. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Method: postInlineReviewComments] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T52.4.3: Persist full review record into pr_reviews database table for audit and historical analysis. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: persistReviewRecord] [Test: npm test -- packages/engine/src/tests/pr_review_loop.test.ts]
  - [ ] T52.4.4: Write integration tests verifying review submission appears on Gitea PR conversation timeline. [File: packages/engine/src/tests/gitea_review_submission.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_review_submission.test.ts]

### T52.5: Auto-Merge on Approval via Gitea API
  - [ ] T52.5.1: If verdict is APPROVE, execute squash-and-merge via GiteaApiClient.mergePullRequest(). [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Method: executeCycle] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [ ] T52.5.2: Format squash merge title Merge PR #<num>: <taskTitle> and commit message summarizing changes. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Method: executeCycle] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [ ] T52.5.3: Delete ephemeral task branch on Gitea remote following successful squash merge. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Method: deleteBranch] [Test: npm test -- packages/engine/src/tests/gitea_api_client.test.ts]
  - [ ] T52.5.4: Transition task status to COMPLETED and record completedAt timestamp. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updateStatus] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]

### T52.6: Automated Remediation Requeue on Changes Requested
  - [ ] T52.6.1: If verdict is REQUEST_CHANGES, synthesize a P0 remediation task remedy-<taskId>-<timestamp>. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Method: executeCycle] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [ ] T52.6.2: Format remediation prompt embedding reviewer notes, flagged comments, and original task directives. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Method: synthesizeRemediationPrompt] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [ ] T52.6.3: Target existing task branch so remediation worker commits fixes directly onto the active PR branch. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Property: targetBranch] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [ ] T52.6.4: Enqueue remediation task into TaskRepository with priority P0 and status PENDING. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.create] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]

### T52.7: Remediation Stage Telemetry & Stage Stepper Extension
  - [ ] T52.7.1: Record 'remediation' stage in task_stages recording reviewer feedback and remediation attempt counter. [File: packages/db/src/repositories/StageRepository.ts] [Stage: remediation] [Test: npm test -- packages/db/src/tests/StageRepository.test.ts]
  - [ ] T52.7.2: Broadcast 'remediation_enqueued' event over SSE notifying frontend of kick-back for revisions. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Event: remediation_enqueued] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T52.7.3: Update TaskInspectorComponent to render remediation loop indicator when task has been kicked back. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Component: RemediationBadge] [Test: npm test]
  - [ ] T52.7.4: Write unit tests verifying remediation cycle increments failure count and creates correctly targeted P0 task. [File: packages/engine/src/tests/remediation_cycle.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_cycle.test.ts]

### T52.8: Reviewer Model Failure Handling & Escalation
  - [ ] T52.8.1: Limit max consecutive remediation cycles to 3 attempts before marking task as ESCALATED_FOR_HUMAN_REVIEW. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Constant: MAX_REMEDIATION_CYCLES] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [ ] T52.8.2: Add label 'needs-human-review' to Gitea PR when max automated remediation attempts are exhausted. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Method: addIssueLabels] [Test: npm test -- packages/engine/src/tests/gitea_api_client.test.ts]
  - [ ] T52.8.3: Post summary of automated failure causes to Gitea PR comment thread for human developer triage. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Method: postEscalationSummary] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [ ] T52.8.4: Write unit tests verifying escalation logic and Gitea label application when remediation loop exceeds threshold. [File: packages/engine/src/tests/review_escalation.test.ts] [Test: npm test -- packages/engine/src/tests/review_escalation.test.ts]

---

## Phase 53: AST Symbol Graph Extraction & Interactive RepoMap Engine
*RDF Category: repomap*

### T53.1: TypeScript Compiler API Symbol Harvester Implementation
  - [ ] T53.1.1: Initialize ts.createProgram() pointing to tsconfig.base.json to parse workspace source files. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: initializeProgram] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [x] T53.1.2: Traverse AST nodes extracting ts.SyntaxKind.ClassDeclaration, InterfaceDeclaration, and FunctionDeclaration. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: visitNode] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [ ] T53.1.3: Extract symbol identifiers, exported flags, file paths, line ranges, and JSDoc documentation comments. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: extractSymbolMetadata] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [ ] T53.1.4: Write unit tests verifying all exported classes and functions in packages/engine are extracted accurately. [File: packages/engine/src/tests/symbol_harvester.test.ts] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]

### T53.2: Graph Centrality Computation & Edge Mapping
  - [x] T53.2.1: Extract import and export statements to construct directed dependency edges between symbol nodes. [File: packages/engine/src/repomap/SymbolGraphBuilder.ts] [Class: SymbolGraphBuilder] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]
  - [ ] T53.2.2: Compute in-degree and PageRank centrality score [0.0, 1.0] for each architectural symbol. [File: packages/engine/src/repomap/SymbolGraphBuilder.ts] [Method: computeCentrality] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]
  - [ ] T53.2.3: Identify core architectural hub classes (highest centrality) for context minimization prioritization. [File: packages/engine/src/repomap/SymbolGraphBuilder.ts] [Method: getHubSymbols] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]
  - [ ] T53.2.4: Write unit tests verifying that highly imported base utilities have higher centrality scores than leaf modules. [File: packages/engine/src/tests/symbol_graph.test.ts] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]

### T53.3: REST API: GET /api/repomap with In-Memory Caching
  - [ ] T53.3.1: Expose GET /api/repomap returning array of RepoSymbolNode with id, name, kind, filePath, centrality. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/repomap] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T53.3.2: Cache symbol graph in memory and invalidate automatically on task completion or file modification. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: invalidateCache] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [ ] T53.3.3: Support query parameter ?kind=class|interface|function to filter returned symbol types. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/repomap] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T53.3.4: Write integration tests verifying /api/repomap returns 200 with complete architectural symbol inventory. [File: packages/engine/src/tests/repomap_endpoint.test.ts] [Test: npm test -- packages/engine/src/tests/repomap_endpoint.test.ts]

### T53.4: Interactive SVG Graph Rendering in RepoMapViewerComponent
  - [ ] T53.4.1: Render symbol nodes with radius scaled proportionally to centrality score in RepoMapViewerComponent. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Template: svg-graph] [Test: npm test]
  - [ ] T53.4.2: Color-code nodes by kind: classes (blue), interfaces (purple), functions (green), methods (amber). [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Style: node-color] [Test: npm test]
  - [ ] T53.4.3: Implement zoom and pan controls supporting smooth exploration of dense workspace symbol networks. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Method: onGraphPan] [Test: npm test]
  - [ ] T53.4.4: Write frontend unit tests verifying SVG circles and labels are generated for all supplied symbol nodes. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.spec.ts] [Test: npm test]

### T53.5: Symbol Search, Filtering & Detail Drawer
  - [ ] T53.5.1: Add search input in RepoMapViewerComponent filtering visible nodes in real-time by symbol name or file path. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Signal: searchQuery] [Test: npm test]
  - [ ] T53.5.2: Open side drawer on node click showing full symbol details: export status, line number, and dependents. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Method: selectSymbol] [Test: npm test]
  - [ ] T53.5.3: Add "Copy File Path" button in symbol detail drawer for quick developer copy to clipboard. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Method: copyFilePath] [Test: npm test]
  - [ ] T53.5.4: Write frontend unit tests verifying search query filter updates displayed SVG node count accurately. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.spec.ts] [Test: npm test]

### T53.6: Incremental AST Invalidation on File System Changes
  - [ ] T53.6.1: Connect WorkspaceSymbolHarvester to file system watcher triggering incremental re-parse on file save. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: watchFiles] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [ ] T53.6.2: Broadcast 'repomap_updated' event over SSE when symbol graph changes due to completed tasks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Event: repomap_updated] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T53.6.3: Update RepoStateService to re-fetch /api/repomap on receiving 'repomap_updated' SSE event. [File: packages/frontend/src/app/services/repo-state.service.ts] [Method: setupSseListener] [Test: npm test]
  - [ ] T53.6.4: Write integration tests verifying that modifying a class in packages/ updates symbol graph without server restart. [File: packages/engine/src/tests/incremental_ast.test.ts] [Test: npm test -- packages/engine/src/tests/incremental_ast.test.ts]

---

## Phase 54: Git Shadow Micro-Checkpoints & Interactive Time Travel Engine
*RDF Category: git*

### T54.1: Git Shadow Checkpoint Creation Before & After Every Stage
  - [ ] T54.1.1: Implement GitCheckpointManager.createCheckpoint(taskId, stageName, message) creating git shadow commit ref. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: createCheckpoint] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [ ] T54.1.2: Store checkpoint refs under hidden namespace refs/cacophony/checkpoints/<taskId>-<stageName>. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Constant: CHECKPOINT_REF_PREFIX] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [ ] T54.1.3: Trigger pre-stage checkpoint before code generation and post-stage checkpoint after rule scrubbing. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/checkpoint_pipeline.test.ts]
  - [ ] T54.1.4: Write unit tests verifying that git shadow checkpoint commits preserve exact working tree state. [File: packages/engine/src/tests/git_checkpoints.test.ts] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]

### T54.2: REST API: GET /api/checkpoints Listing Real Historical Snapshots
  - [ ] T54.2.1: Query git for all refs in refs/cacophony/checkpoints/ returning commit hash, message, date, and changed files. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: listCheckpoints] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [ ] T54.2.2: Map git log output to typed CheckpointRecord array in GET /api/checkpoints. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/checkpoints] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T54.2.3: Support query parameter ?taskId=id to filter checkpoints associated with a specific task execution. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/checkpoints] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T54.2.4: Write integration tests verifying /api/checkpoints returns chronological checkpoint history. [File: packages/engine/src/tests/checkpoints_endpoint.test.ts] [Test: npm test -- packages/engine/src/tests/checkpoints_endpoint.test.ts]

### T54.3: REST API: POST /api/checkpoints/:id/revert One-Click Rollback
  - [x] T54.3.1: Implement GitCheckpointManager.revertToCheckpoint(checkpointId) checking out snapshot into workspace. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: revertToCheckpoint] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [ ] T54.3.2: Verify working tree has no uncommitted changes before executing rollback, or create safety backup checkpoint. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: safeRollback] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [ ] T54.3.3: Return rollback result: reverted commit hash, affected files count, and updated workspace git status. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/checkpoints/:id/revert] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T54.3.4: Write unit tests verifying workspace rollback restores exact prior file contents. [File: packages/engine/src/tests/checkpoint_revert.test.ts] [Test: npm test -- packages/engine/src/tests/checkpoint_revert.test.ts]

### T54.4: Wire CheckpointTimelineComponent Undo and Redo Operations
  - [ ] T54.4.1: Connect Undo button in CheckpointTimelineComponent to call POST /api/checkpoints/:id/revert for prior checkpoint. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts] [Method: triggerUndo] [Test: npm test]
  - [ ] T54.4.2: Connect Redo button in CheckpointTimelineComponent to advance to the next forward checkpoint. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts] [Method: triggerRedo] [Test: npm test]
  - [ ] T54.4.3: Dynamically compute canUndo and canRedo boolean signals based on activeCheckpointId position in array. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts] [Computed: canUndo] [Test: npm test]
  - [ ] T54.4.4: Write frontend unit tests verifying undo/redo buttons disable appropriately at boundaries and trigger API calls. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.spec.ts] [Test: npm test]

### T54.5: Visual Diff Comparison Against Selected Checkpoint
  - [ ] T54.5.1: Add endpoint GET /api/checkpoints/:id/diff returning unified diff between checkpoint and current workspace. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/checkpoints/:id/diff] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T54.5.2: Open diff preview drawer in CheckpointTimelineComponent when clicking on a checkpoint row. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts] [Template: checkpoint-diff-drawer] [Test: npm test]
  - [ ] T54.5.3: Highlight lines added (+ green) and lines removed (- red) in checkpoint diff view. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts] [Style: diff-line] [Test: npm test]
  - [ ] T54.5.4: Write frontend unit tests verifying diff drawer opens on checkpoint selection and renders diff text. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.spec.ts] [Test: npm test]

### T54.6: Checkpoint Retention Policy & Garbage Collection
  - [ ] T54.6.1: Implement GitCheckpointManager.pruneOldCheckpoints(maxAgeDays: number, maxCount: number) cleaning old refs. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: pruneOldCheckpoints] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [ ] T54.6.2: Add automated checkpoint garbage collection task to daily maintenance schedule in CacophonyDaemon. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: runDailyMaintenance] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [ ] T54.6.3: Expose manual checkpoint pruning endpoint POST /api/checkpoints/prune. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/checkpoints/prune] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T54.6.4: Write unit tests verifying that pruning deletes refs older than retention window while preserving recent checkpoints. [File: packages/engine/src/tests/checkpoint_pruning.test.ts] [Test: npm test -- packages/engine/src/tests/checkpoint_pruning.test.ts]

---

## Phase 55: Multi-Armed Bandit Model Exploration & Empirical Reward Engine
*RDF Category: orchestration*

### T55.1: Persist Bandit Arm Records & Beta Distributions in Database
  - [ ] T55.1.1: Write SQL migration creating table bandit_arms (arm_id, model_id, role, alpha, beta, total_reward, trials_count). [File: packages/db/src/migrations/005_bandit_arms.sql] [Migration: 005_bandit_arms.sql] [Test: npm test -- packages/db/src/tests/migrations.test.ts]
  - [ ] T55.1.2: Implement BanditRepository in packages/db/src/repositories/ with CRUD and transactional reward increment operations. [File: packages/db/src/repositories/BanditRepository.ts] [Class: BanditRepository] [Test: npm test -- packages/db/src/tests/BanditRepository.test.ts]
  - [ ] T55.1.3: Initialize BanditTaskScheduler from bandit_arms database records on engine startup. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: loadFromRepository] [Test: npm test -- packages/engine/src/tests/bandit_scheduler.test.ts]
  - [ ] T55.1.4: Write unit tests verifying persistent storage and reloading of Alpha/Beta posterior distributions. [File: packages/db/src/tests/bandit_persistence.test.ts] [Test: npm test -- packages/db/src/tests/bandit_persistence.test.ts]

### T55.2: REST API: GET /api/bandit/arms & PUT /api/bandit/policy
  - [ ] T55.2.1: Implement GET /api/bandit/arms returning all candidate model arms with win rates, trials, alpha, beta, and tok/s. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/bandit/arms] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T55.2.2: Implement PUT /api/bandit/policy accepting { policy, explorationRate, ucbConstant } and updating scheduler. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: PUT /api/bandit/policy] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T55.2.3: Broadcast 'bandit_updated' event over SSE when arm rewards are updated or policy changes. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Event: bandit_updated] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T55.2.4: Write integration tests verifying policy changes via API take immediate effect in dispatch decisions. [File: packages/engine/src/tests/bandit_api.test.ts] [Test: npm test -- packages/engine/src/tests/bandit_api.test.ts]

### T55.3: Empirical Reward Update Hook in AutonomousWorkerPipeline
  - [ ] T55.3.1: Calculate empirical reward score [0.0, 1.0] upon task completion based on test pass, review approval, and tok/s. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: calculateReward] [Test: npm test -- packages/engine/src/tests/bandit_scheduler.test.ts]
  - [ ] T55.3.2: Hook reward calculation into AutonomousWorkerPipeline finalization updating arm Alpha (success) or Beta (failure). [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: finalizeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T55.3.3: Persist updated Alpha/Beta distributions to BanditRepository after every task execution. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: recordReward] [Test: npm test -- packages/engine/src/tests/bandit_scheduler.test.ts]
  - [ ] T55.3.4: Write unit tests verifying that successful task runs increase arm Alpha and boost future selection probability. [File: packages/engine/src/tests/bandit_rewards.test.ts] [Test: npm test -- packages/engine/src/tests/bandit_rewards.test.ts]

### T55.4: Wire ExplorationControlComponent to Real Multi-Armed Bandit Telemetry
  - [ ] T55.4.1: Fetch live arms and active policy from GET /api/bandit/arms on component ngOnInit in ExplorationControlComponent. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Method: ngOnInit] [Test: npm test]
  - [ ] T55.4.2: Connect policy buttons (Epsilon-Greedy, UCB-1, Thompson Sampling) to PUT /api/bandit/policy. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Method: setPolicy] [Test: npm test]
  - [ ] T55.4.3: Connect epsilon slider input to PUT /api/bandit/policy with 300ms debounce. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Method: onEpsilonChange] [Test: npm test]
  - [ ] T55.4.4: Write frontend unit tests verifying policy change triggers API PUT and updates local activePolicy signal. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm test]

### T55.5: Statistical Role Promotion & Demotion Evaluation
  - [ ] T55.5.1: Implement evaluateRolePromotions(role: AgentRole) in BanditTaskScheduler using Welch's t-test for statistical significance. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: evaluateRolePromotions] [Test: npm test -- packages/engine/src/tests/role_promotions.test.ts]
  - [ ] T55.5.2: Promote arm to PRIMARY role model when win rate exceeds current primary with p < 0.05 confidence. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: promoteArm] [Test: npm test -- packages/engine/src/tests/role_promotions.test.ts]
  - [ ] T55.5.3: Record promotion event in model_health_profiles and broadcast 'model_promoted' SSE notification. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Event: model_promoted] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T55.5.4: Write unit tests simulating trial series verifying that superior model earns promotion over baseline. [File: packages/engine/src/tests/role_promotions.test.ts] [Test: npm test -- packages/engine/src/tests/role_promotions.test.ts]

### T55.6: Pareto Frontier 2D Visualization: Quality vs Velocity vs VRAM
  - [ ] T55.6.1: Compute 2D Pareto optimal frontier points (winRatePct vs tokensPerSec) in ExplorationControlComponent. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Computed: paretoFrontier] [Test: npm test]
  - [ ] T55.6.2: Render interactive scatter plot with SVG showing each model arm positioned by tok/s (X) and win rate (Y). [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Template: pareto-scatter] [Test: npm test]
  - [ ] T55.6.3: Draw frontier envelope connecting non-dominated Pareto optimal models. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Template: pareto-envelope] [Test: npm test]
  - [ ] T55.6.4: Write frontend unit tests verifying Pareto frontier calculation identifies dominant models correctly. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm test]

---

## Phase 56: Distributed Heterogeneous Fleet Orchestration & Hardware Telemetry
*RDF Category: telemetry*

### T56.1: Dynamic Node Telemetry Sampling & Aggregation
  - [ ] T56.1.1: Sample local GPU and APU telemetry every 2 seconds via HardwareTelemetryProvider. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: sampleLocalNodeTelemetry] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [ ] T56.1.2: Aggregate node metrics: GPU load %, VRAM used/total, temperature, active running tasks count. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Type: FleetNodeSnapshot] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [ ] T56.1.3: Expose local node metrics in GET /api/fleet/nodes alongside any registered remote worker nodes. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/fleet/nodes] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T56.1.4: Write unit tests verifying that local node metrics accurately reflect current hardware sensor values. [File: packages/engine/src/tests/fleet_telemetry.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_telemetry.test.ts]

### T56.2: REST API: GET /api/fleet/nodes Real-Time Status Endpoint
  - [ ] T56.2.1: Query registered fleet nodes from memory cache with fallback to fleet_nodes database table. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/fleet/nodes] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T56.2.2: Include lastHeartbeat timestamp and compute status ('ONLINE' | 'DEGRADED' | 'OFFLINE') based on heartbeat freshness. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: computeNodeStatus] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [ ] T56.2.3: Return formatted JSON response matching FleetNodeView frontend interface. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/fleet/nodes] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T56.2.4: Write integration tests verifying /api/fleet/nodes returns 200 with active local node telemetry. [File: packages/engine/src/tests/fleet_api.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_api.test.ts]

### T56.3: Hardware Tool Scanner Implementation via System Execution
  - [ ] T56.3.1: Execute command which for system diagnostics tools: radeontop, lm-sensors, btop, mesa-utils, vulkan-tools. [File: packages/engine/src/hardware/SystemToolScanner.ts] [Method: scan] [Test: npm test -- packages/engine/src/tests/tool_scanner.test.ts]
  - [ ] T56.3.2: Build diagnostic report classifying each tool as installed (path resolved) or missing. [File: packages/engine/src/hardware/SystemToolScanner.ts] [Type: SystemToolReport] [Test: npm test -- packages/engine/src/tests/tool_scanner.test.ts]
  - [ ] T56.3.3: Generate unified package install command (e.g. sudo apt install -y ...) for all detected missing tools. [File: packages/engine/src/hardware/SystemToolScanner.ts] [Method: generateInstallCommand] [Test: npm test -- packages/engine/src/tests/tool_scanner.test.ts]
  - [ ] T56.3.4: Write unit tests verifying that SystemToolScanner correctly categorizes present and missing system binaries. [File: packages/engine/src/tests/tool_scanner.test.ts] [Test: npm test -- packages/engine/src/tests/tool_scanner.test.ts]

### T56.4: Fleet Node Heartbeat Daemon & Dead Node Eviction
  - [ ] T56.4.1: Run heartbeat background loop pinging registered worker nodes every 10 seconds. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: startHeartbeatLoop] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [ ] T56.4.2: Mark nodes as OFFLINE when heartbeat fails for 3 consecutive intervals (30 seconds). [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: evaluateNodeLiveness] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [ ] T56.4.3: Automatically reassign pending or running tasks from dead nodes back to local queue. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: evacuateDeadNodeTasks] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [ ] T56.4.4: Write unit tests verifying node state transitions to OFFLINE and stranded tasks are requeued safely. [File: packages/engine/src/tests/fleet_eviction.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_eviction.test.ts]

### T56.5: Fleet Node Registration Endpoint with Security Token
  - [ ] T56.5.1: Implement POST /api/fleet/register validating incoming registration payload and authentication token. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/fleet/register] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T56.5.2: Verify registration token against FLEET_CLUSTER_SECRET stored in secret vault. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: validateRegistrationToken] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [ ] T56.5.3: Register valid node in fleet manager and assign unique nodeId and network routing address. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: registerNode] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [ ] T56.5.4: Write integration tests verifying successful node registration and rejection of invalid authentication tokens. [File: packages/engine/src/tests/fleet_registration.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_registration.test.ts]

### T56.6: Multi-Node Task Dispatch Router
  - [ ] T56.6.1: Implement FleetTaskRouter evaluating target node suitability based on model availability and VRAM headroom. [File: packages/engine/src/fleet/FleetTaskRouter.ts] [Class: FleetTaskRouter] [Test: npm test -- packages/engine/src/tests/fleet_router.test.ts]
  - [ ] T56.6.2: Forward task execution payload to remote node API POST /api/tasks/remote-dispatch when offloading. [File: packages/engine/src/fleet/FleetTaskRouter.ts] [Method: dispatchToRemoteNode] [Test: npm test -- packages/engine/src/tests/fleet_router.test.ts]
  - [ ] T56.6.3: Stream remote node execution tokens and stages back to coordinator via SSE proxy. [File: packages/engine/src/fleet/FleetTaskRouter.ts] [Method: proxyRemoteStream] [Test: npm test -- packages/engine/src/tests/fleet_router.test.ts]
  - [ ] T56.6.4: Write unit tests verifying tasks requiring high VRAM are routed to nodes with sufficient available GPU memory. [File: packages/engine/src/tests/fleet_router.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_router.test.ts]


---

## Phase 57: Rolling 100-Task Success Meter & Failure-to-Success Quality Telemetry
*RDF Category: telemetry*

### T57.1: Mathematical Rolling 100-Task Success Rate Window in Backend
  - [ ] T57.1.1: Implement TaskRepository.getRollingSuccessStats(sampleSize: number = 100) querying the last N finished tasks with status in ('COMPLETED', 'FAILED'). [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.getRollingSuccessStats] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T57.1.2: Calculate success percentage as (completedCount / totalFinished) * 100 rounded to 1 decimal place, handling zero-division cleanly when totalFinished is 0. [File: packages/db/src/repositories/TaskRepository.ts] [Type: RollingSuccessStats] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T57.1.3: Track previous window success rate to compute rolling trend direction ('improving' | 'declining' | 'stable') across consecutive 50-task sub-windows. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.getRollingSuccessStats] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T57.1.4: Write unit tests verifying getRollingSuccessStats accurately computes rates for 0%, 50%, 100%, and arbitrary completion ratios across 100 tasks. [File: packages/db/src/tests/rolling_success.test.ts] [Test: npm test -- packages/db/src/tests/rolling_success.test.ts]

### T57.2: REST API: GET /api/metrics/success-rate Endpoint
  - [ ] T57.2.1: Register route GET /api/metrics/success-rate in CacophonyHttpServer returning structured RollingSuccessStats JSON payload. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/metrics/success-rate] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T57.2.2: Support optional query parameter ?window=N (default 100, min 10, max 500) to allow customized historical sample depths. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: handleSuccessRateMetric] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T57.2.3: Return breakdown by model assigned: per-model success rate, run count, and failure count within the 100-task rolling window. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/metrics/success-rate] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T57.2.4: Write integration tests verifying /api/metrics/success-rate returns 200 with valid schema and correct calculations. [File: packages/engine/src/tests/success_rate_api.test.ts] [Test: npm test -- packages/engine/src/tests/success_rate_api.test.ts]

### T57.3: Real-Time SSE Success Rate Broadcast on Task Completion
  - [ ] T57.3.1: Broadcast SSE event 'success_rate_updated' to all connected clients whenever a task transitions to COMPLETED or FAILED in AutonomousWorkerPipeline. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: finalizeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T57.3.2: Include updated rolling percentage, total completed count, total failed count, and current streak in the SSE payload. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: broadcastSuccessRate] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T57.3.3: Implement throttling in SSE broadcast governor to limit metric broadcasts to at most once per 500ms under high-throughput task completions. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: broadcastThrottled] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T57.3.4: Write integration tests verifying SSE clients receive success_rate_updated notifications immediately upon task status transition. [File: packages/engine/src/tests/sse_telemetry.test.ts] [Test: npm test -- packages/engine/src/tests/sse_telemetry.test.ts]

### T57.4: Frontend SuccessMeterComponent with Color-Coded Radial & Linear Gauges
  - [ ] T57.4.1: Create standalone SuccessMeterComponent in packages/frontend/src/app/components/success-meter/ using Angular Signals and Zoneless change detection. [File: packages/frontend/src/app/components/success-meter/success-meter.component.ts] [Class: SuccessMeterComponent] [Test: npm test]
  - [ ] T57.4.2: Render SVG circular radial gauge with smooth stroke-dashoffset transition visualizing rolling success percentage (0% to 100%). [File: packages/frontend/src/app/components/success-meter/success-meter.component.ts] [Template: radial-gauge] [Test: npm test]
  - [ ] T57.4.3: Implement color-coded threshold status: Critical Red (<50%), Warning Amber (50-79%), Optimal Emerald (>=80%) based on current success rate. [File: packages/frontend/src/app/components/success-meter/success-meter.component.ts] [Computed: statusColorClass] [Test: npm test]
  - [ ] T57.4.4: Display numeric percentage in fixed-width tabular font with pass/fail counts breakdown ('X passed / Y failed in last 100 tasks'). [File: packages/frontend/src/app/components/success-meter/success-meter.component.ts] [Template: metrics-summary] [Test: npm test]
  - [ ] T57.4.5: Write frontend unit tests verifying reactive signal updates, SVG dashoffset calculations, and color threshold classes. [File: packages/frontend/src/app/components/success-meter/success-meter.component.spec.ts] [Test: npm test]

### T57.5: Telemetry Bar & Dashboard Header Success Meter Integration
  - [ ] T57.5.1: Wire SuccessMeterComponent into DashboardViewComponent header adjacent to Active Task Inspector. [File: packages/frontend/src/app/components/views/dashboard-view.component.ts] [Component: DashboardViewComponent] [Test: npm test]
  - [ ] T57.5.2: Integrate compact success percentage pill into root TelemetryBar component visible on all routes. [File: packages/frontend/src/app/components/telemetry-bar/telemetry-bar.component.ts] [Component: TelemetryBarComponent] [Test: npm test]
  - [ ] T57.5.3: Bind ArenaStateStore successRate signal to SSE 'success_rate_updated' events for seamless live updates without polling. [File: packages/frontend/src/app/services/arena-state.store.ts] [Method: handleSseEvent] [Test: npm test]
  - [ ] T57.5.4: Apply responsive mobile-first CSS rules hiding radial graphics on small mobile screens (<480px) while maintaining compact text percentage. [File: packages/frontend/src/app/components/success-meter/success-meter.component.ts] [Styles: media-query] [Test: npm test]

---

## Phase 58: Dynamic Multi-Model Rotation, Failure Fallback Cascade & Adaptive Context Window Reduction (8k -> 4k)
*RDF Category: orchestration*

### T58.1: Heterogeneous Model Task Distributor & Anti-Starvation Scheduler
  - [ ] T58.1.1: Refactor TaskScheduler.selectModelForTask to distribute task assignments across all healthy models in ModelRegistry instead of locking to a single model. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: selectModelForTask] [Test: npm test -- packages/engine/src/tests/scheduler_model_rotation.test.ts]
  - [ ] T58.1.2: Implement model usage balancing: track run counts per model in memory and prioritize idle registered models (e.g. qwen2.5-coder:7b, deepseek-r1:8b, gemma3:4b). [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: getLeastRecentlyUsedModel] [Test: npm test -- packages/engine/src/tests/scheduler_model_rotation.test.ts]
  - [ ] T58.1.3: Remove hardcoded modelName in TaskcadePlanningService.replenishQueueIfLow, allowing dynamic model assignment from registered model pool. [File: packages/engine/src/inference/TaskcadePlanningService.ts] [Method: replenishQueueIfLow] [Test: npm test -- packages/engine/src/tests/taskcade_planning.test.ts]
  - [ ] T58.1.4: Write unit tests verifying that 20 consecutive queued tasks receive balanced allocations across 3 distinct registered model IDs. [File: packages/engine/src/tests/model_distribution.test.ts] [Test: npm test -- packages/engine/src/tests/model_distribution.test.ts]

### T58.2: Role-to-Model Specialization Router (Architect, Implementer, Reviewer, DocWriter)
  - [ ] T58.2.1: Implement RoleModelAffinityMatrix mapping task roles to preferred model capabilities: architect -> reasoning models (8b), implementer -> code generation (3b/7b), reviewer -> verification (8b), doc_writer -> language models (4b/7b). [File: packages/engine/src/inference/RoleModelRouter.ts] [Class: RoleModelRouter] [Test: npm test -- packages/engine/src/tests/role_model_router.test.ts]
  - [ ] T58.2.2: Evaluate model availability: fallback to next best qualified model in the affinity tier if preferred model is unavailable or in cooldown. [File: packages/engine/src/inference/RoleModelRouter.ts] [Method: resolveModelForRole] [Test: npm test -- packages/engine/src/tests/role_model_router.test.ts]
  - [ ] T58.2.3: Support runtime override of role affinity configuration via GET/PUT /api/config/role-models REST endpoints. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: /api/config/role-models] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T58.2.4: Write unit tests verifying that tasks with role 'architect' receive deepseek-r1:8b while role 'implementer' receives qwen2.5-coder models. [File: packages/engine/src/tests/role_model_router.test.ts] [Test: npm test -- packages/engine/src/tests/role_model_router.test.ts]

### T58.3: Dynamic Failure Fallback Cascade (Sequential Alternative Model Selection)
  - [ ] T58.3.1: Implement FailureFallbackCascade in TaskScheduler: when a task fails execution, identify the next alternative model in the role cascade. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: getFallbackModelForTask] [Test: npm test -- packages/engine/src/tests/failure_fallback_cascade.test.ts]
  - [ ] T58.3.2: Requeue failed task with incremented failureCount, updated modelAssigned to fallback model, and status PENDING. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: handleTaskFailure] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T58.3.3: Cap retries at maxTaskRetries (default 3); mark task permanently FAILED only after exhausting all available alternative models in cascade. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: handleFailedTaskRetries] [Test: npm test -- packages/engine/src/tests/failure_fallback_cascade.test.ts]
  - [ ] T58.3.4: Write unit tests verifying task failing under model A automatically retries under model B and records fallback lineage. [File: packages/engine/src/tests/failure_fallback_cascade.test.ts] [Test: npm test -- packages/engine/src/tests/failure_fallback_cascade.test.ts]

### T58.4: Adaptive Context Window Reduction (Automatic Fallback from 8192 to 4096 Tokens)
  - [ ] T58.4.1: Add contextWindowSize option (default 8192) to OllamaInferenceOptions and InferenceJob payload. [File: packages/shared-types/src/inference.ts] [Type: OllamaInferenceOptions] [Test: npm test]
  - [ ] T58.4.2: Implement AdaptiveContextManager detecting task failures caused by context overflow, repetitive loops, or VRAM pressure. [File: packages/engine/src/inference/AdaptiveContextManager.ts] [Class: AdaptiveContextManager] [Test: npm test -- packages/engine/src/tests/adaptive_context.test.ts]
  - [ ] T58.4.3: On retry of a failed task, reduce context window parameter num_ctx from 8192 to 4096 tokens to force concise generation and reduce VRAM allocation. [File: packages/engine/src/inference/AdaptiveContextManager.ts] [Method: calculateRetryContextOptions] [Test: npm test -- packages/engine/src/tests/adaptive_context.test.ts]
  - [ ] T58.4.4: Trigger aggressive AST import pruning and context minimization when context window drops to 4096 tokens. [File: packages/engine/src/inference/ContextMinimizer.ts] [Method: pruneForCompactWindow] [Test: npm test -- packages/engine/src/tests/context_minimizer.test.ts]
  - [ ] T58.4.5: Write unit tests verifying num_ctx is set to 8192 on initial attempt and reduced to 4096 on first retry following failure. [File: packages/engine/src/tests/adaptive_context.test.ts] [Test: npm test -- packages/engine/src/tests/adaptive_context.test.ts]

### T58.5: Model Eviction Recovery & Consecutive Failure Cooldown Daemon
  - [ ] T58.5.1: Enhance ModelEvictionManager with cooldown timer: models with 3 consecutive failures enter COOLDOWN state for 5 minutes instead of permanent ejection. [File: packages/engine/src/scheduler/ModelEvictionManager.ts] [Method: handleModelFailure] [Test: npm test -- packages/engine/src/tests/model_eviction.test.ts]
  - [ ] T58.5.2: Implement probe task execution: after cooldown expires, dispatch a low-complexity P2 test task to evaluate whether model has recovered. [File: packages/engine/src/scheduler/ModelEvictionManager.ts] [Method: scheduleProbeTask] [Test: npm test -- packages/engine/src/tests/model_eviction.test.ts]
  - [ ] T58.5.3: Restore model status to ACTIVE on probe success; escalate to EJECTED only if probe task fails. [File: packages/engine/src/scheduler/ModelEvictionManager.ts] [Method: handleProbeResult] [Test: npm test -- packages/engine/src/tests/model_eviction.test.ts]
  - [ ] T58.5.4: Write unit tests verifying model enters COOLDOWN after 3 consecutive failures and recovers cleanly upon passing probe task. [File: packages/engine/src/tests/model_eviction_cooldown.test.ts] [Test: npm test -- packages/engine/src/tests/model_eviction_cooldown.test.ts]

### T58.6: Failure Classifier Feedback Propagation for Adaptive Retries
  - [ ] T58.6.1: Classify task failure error type (SYNTAX_ERROR, TYPE_MISMATCH, ASSERTION_FAILURE, TIMEOUT, MEMORY_OOM) in FailureClassifier. [File: packages/engine/src/analytics/FailureClassifier.ts] [Method: classify] [Test: npm test -- packages/engine/src/tests/failure_classifier.test.ts]
  - [ ] T58.6.2: Format targeted retry prompt directive: append categorized error explanation and exact failing assertion to retry prompt. [File: packages/engine/src/inference/AdaptiveContextManager.ts] [Method: formatRetryPromptWithDiagnostics] [Test: npm test -- packages/engine/src/tests/adaptive_context.test.ts]
  - [ ] T58.6.3: Record failure category in stageRepo records for longitudinal failure mode correlation analytics. [File: packages/db/src/repositories/StageRepository.ts] [Method: recordStageCompletion] [Test: npm test -- packages/db/src/tests/StageRepository.test.ts]
  - [ ] T58.6.4: Write unit tests verifying retry prompt includes exact compiler error diagnostic and tailored instruction to fix failing test. [File: packages/engine/src/tests/retry_prompt_diagnostics.test.ts] [Test: npm test -- packages/engine/src/tests/retry_prompt_diagnostics.test.ts]

---

## Phase 59: Live Test Execution Stream & Dedicated Testing Panel (Refactoring 'Processes' View to 'Testing')
*RDF Category: frontend*

### T59.1: Global Navigation & Route Refactor: Rename 'Processes' to 'Testing' (/testing Route)
  - [ ] T59.1.1: Rename navigation bar label from 'Processes' to 'Testing' in app.html and update active route link to '/testing'. [File: packages/frontend/src/app/app.html] [Template: nav-links] [Test: npm test]
  - [ ] T59.1.2: Define route '/testing' in app.routes.ts mapping to TestingViewComponent. [File: packages/frontend/src/app/app.routes.ts] [Route: /testing] [Test: npm test]
  - [ ] T59.1.3: Add redirect route from '/processes' to '/testing' in app.routes.ts ensuring bookmark and legacy URL compatibility. [File: packages/frontend/src/app/app.routes.ts] [Route: /processes] [Test: npm test]
  - [ ] T59.1.4: Update frontend route unit tests in app.routes.spec.ts validating presence of '/testing' route and redirect. [File: packages/frontend/src/app/app.routes.spec.ts] [Test: npm test]

### T59.2: Dedicated Testing View Layout & Active Test Execution Dashboard
  - [x] T59.2.1: Create standalone TestingViewComponent in packages/frontend/src/app/components/views/testing-view.component.ts with modern responsive grid layout. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Class: TestingViewComponent] [Test: npm test]
  - [x] T59.2.2: Implement Active Test Card displaying currently executing test command, target file paths, elapsed duration timer, and live status pill. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: active-test-card] [Test: npm test]
  - [x] T59.2.3: Render test execution summary counters: Total Tests Run, Passed Count, Failed Count, Current Pass Rate %, and Average Test Duration. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: summary-counters] [Test: npm test]
  - [ ] T59.2.4: Write unit tests verifying TestingViewComponent renders summary metrics and responds to active test execution signal changes. [File: packages/frontend/src/app/components/views/testing-view.component.spec.ts] [Test: npm test]

### T59.3: Live Test Output Streamer (SSE Terminal Stream for Test Runner Stdout/Stderr)
  - [x] T59.3.1: Connect TestingViewComponent to SSE event 'test_output' streaming real-time stdout and stderr lines from the active test runner subprocess. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Method: connectTestStream] [Test: npm test]
  - [x] T59.3.2: Render high-density terminal log component with auto-scroll to bottom, ANSI color support, and line numbers. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: test-terminal] [Test: npm test]
  - [x] T59.3.3: Implement live pause/resume auto-scroll toggle and copy log buffer button with visual feedback. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Method: copyLog] [Test: npm test]
  - [ ] T59.3.4: Write frontend unit tests verifying log buffer appends incoming test stream chunks and triggers auto-scroll. [File: packages/frontend/src/app/components/views/testing-view.component.spec.ts] [Test: npm test]

### T59.4: Historical Test Run Table with High-Density Filtering and Pass/Fail Verdicts
  - [ ] T59.4.1: Implement Historical Test Runs table in TestingViewComponent listing past test executions fetched from GET /api/tests/history. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: history-table] [Test: npm test]
  - [ ] T59.4.2: Render column data: Status badge (PASSED, FAILED, TIMEOUT), Task Title, Test Command, Execution Duration ms, Timestamp, and Actions. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: table-rows] [Test: npm test]
  - [x] T59.4.3: Add filter tabs (ALL, PASSED, FAILED) and search input filtering test runs by command or task ID. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Method: filterTests] [Test: npm test]
  - [ ] T59.4.4: Write frontend unit tests validating filter tabs and text search accurately filter displayed historical test rows. [File: packages/frontend/src/app/components/views/testing-view.component.spec.ts] [Test: npm test]

### T59.5: Associated App Subprocess List in Testing View Bottom Drawer
  - [x] T59.5.1: Create Collapsible Subprocess Drawer component at bottom of TestingViewComponent displaying associated application background processes. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: subprocess-drawer] [Test: npm test]
  - [ ] T59.5.2: Render process table displaying: Daemon Worker, Ollama Engine, PGlite Database, Gitea Git Server, and Mailpit with PID, CPU %, RSS MB, and Uptime. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: process-table] [Test: npm test]
  - [ ] T59.5.3: Add operator action button to restart any stuck background process via POST /api/processes/:name/restart with confirmation dialog. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Method: restartProcess] [Test: npm test]
  - [ ] T59.5.4: Write frontend unit tests verifying subprocess drawer expands/collapses and displays live process metrics from ArenaStateStore. [File: packages/frontend/src/app/components/views/testing-view.component.spec.ts] [Test: npm test]

### T59.6: Deep Test Run Inspection Modal with Collapsible Stderr Stack Traces
  - [ ] T59.6.1: Create TestRunDetailModalComponent opening upon clicking any historical test run row. [File: packages/frontend/src/app/components/test-run-modal/test-run-modal.component.ts] [Class: TestRunDetailModalComponent] [Test: npm test]
  - [ ] T59.6.2: Render modal tabs: Full Output, Failing Assertions, Code Diffs, and Environment Variables. [File: packages/frontend/src/app/components/test-run-modal/test-run-modal.component.ts] [Template: modal-tabs] [Test: npm test]
  - [ ] T59.6.3: Highlight failing test assertion line in red with syntax-highlighted code snippet showing expected vs actual values. [File: packages/frontend/src/app/components/test-run-modal/test-run-modal.component.ts] [Template: assertion-diff] [Test: npm test]
  - [ ] T59.6.4: Write unit tests verifying modal open/close lifecycle, escape key listener, and assertion extraction parser. [File: packages/frontend/src/app/components/test-run-modal/test-run-modal.component.spec.ts] [Test: npm test]

---

## Phase 60: Real Multi-Armed Bandit Implementation (Thompson Sampling, UCB-1 & Epsilon-Greedy Wireup)
*RDF Category: orchestration*

### T60.1: Empirical Reward Calculation from Real Test Passes and Failure Counts
  - [ ] T60.1.1: Implement calculateEmpiricalReward(testOutcome: boolean, durationMs: number, tokensPerSec: number) in BanditTaskScheduler returning scalar reward [0.0, 1.0]. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: calculateEmpiricalReward] [Test: npm test -- packages/engine/src/tests/bandit_scheduler.test.ts]
  - [ ] T60.1.2: Grant baseline reward 1.0 on test pass; 0.0 on test failure; apply velocity modifier (+0.1 for tok/s > 30, -0.1 for tok/s < 15) clamped to [0.0, 1.0]. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: calculateEmpiricalReward] [Test: npm test -- packages/engine/src/tests/bandit_scheduler.test.ts]
  - [ ] T60.1.3: Hook reward calculation into AutonomousWorkerPipeline upon stage 'test_execution' completion, updating active model arm in BanditRepository. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: finalizeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T60.1.4: Write unit tests verifying that test passes yield reward >= 0.9 while test failures yield reward 0.0 across varying durations. [File: packages/engine/src/tests/bandit_reward_calc.test.ts] [Test: npm test -- packages/engine/src/tests/bandit_reward_calc.test.ts]

### T60.2: Thompson Sampling Policy Engine with Beta(Alpha, Beta) Distribution Sampling
  - [ ] T60.2.1: Implement sampleBeta(alpha: number, beta: number) using Marsaglia and Tsang method or standard Gamma transform for accurate Beta distribution sampling. [File: packages/engine/src/bandit/ThompsonSamplingPolicy.ts] [Method: sampleBeta] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [ ] T60.2.2: Evaluate all candidate model arms under Thompson Sampling: select arm with highest sample from Beta(alpha + 1, beta + 1). [File: packages/engine/src/bandit/ThompsonSamplingPolicy.ts] [Method: selectArm] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [ ] T60.2.3: Update arm alpha on reward >= 0.5 (success) and beta on reward < 0.5 (failure) in database bandit_arms table. [File: packages/engine/src/bandit/BanditRepository.ts] [Method: recordArmOutcome] [Test: npm test -- packages/engine/src/tests/bandit_repository.test.ts]
  - [ ] T60.2.4: Write unit tests demonstrating that an arm with 90% success rate is selected significantly more frequently than an arm with 20% success rate over 1000 trials. [File: packages/engine/src/tests/thompson_sampling_convergence.test.ts] [Test: npm test -- packages/engine/src/tests/thompson_sampling_convergence.test.ts]

### T60.3: Upper Confidence Bound (UCB-1) Policy Implementation with Tunable Exploration Factor
  - [ ] T60.3.1: Implement Ucb1Policy in packages/engine/src/bandit/ calculating UCB score: averageReward + c * sqrt(2 * ln(totalTrials) / armTrials). [File: packages/engine/src/bandit/Ucb1Policy.ts] [Class: Ucb1Policy] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [ ] T60.3.2: Ensure all arms are sampled at least once before applying UCB formula to guarantee baseline exploration of newly registered models. [File: packages/engine/src/bandit/Ucb1Policy.ts] [Method: selectArm] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [ ] T60.3.3: Expose exploration factor parameter c (default sqrt(2) ~ 1.414) as configurable option via API and UI slider. [File: packages/engine/src/bandit/Ucb1Policy.ts] [Property: explorationFactor] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [ ] T60.3.4: Write unit tests verifying that unvisited arms receive infinite priority and high-variance arms are adequately explored. [File: packages/engine/src/tests/ucb1_policy.test.ts] [Test: npm test -- packages/engine/src/tests/ucb1_policy.test.ts]

### T60.4: Epsilon-Greedy Policy Engine with Exponential Decay Schedule
  - [ ] T60.4.1: Implement EpsilonGreedyPolicy selecting random exploration arm with probability epsilon, and highest empirical mean arm with probability 1 - epsilon. [File: packages/engine/src/bandit/EpsilonGreedyPolicy.ts] [Class: EpsilonGreedyPolicy] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [ ] T60.4.2: Implement exponential epsilon decay: epsilon = max(minEpsilon, initialEpsilon * (decayRate ^ epoch)) allowing gradual shift from exploration to exploitation. [File: packages/engine/src/bandit/EpsilonGreedyPolicy.ts] [Method: stepEpoch] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [ ] T60.4.3: Expose initialEpsilon (default 0.2), minEpsilon (default 0.05), and decayRate (default 0.995) as typed configuration options. [File: packages/shared-types/src/bandit.ts] [Type: EpsilonGreedyConfig] [Test: npm test]
  - [ ] T60.4.4: Write unit tests verifying epsilon decreases over epochs and exploitation probability increases as expected. [File: packages/engine/src/tests/epsilon_greedy.test.ts] [Test: npm test -- packages/engine/src/tests/epsilon_greedy.test.ts]

### T60.5: REST API: GET/PUT /api/bandit/policy and GET /api/bandit/arms Real Telemetry Wireup
  - [ ] T60.5.1: Implement GET /api/bandit/arms returning live arm statistics (alpha, beta, winRate, totalRuns, avgTks, status) queried directly from database. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/bandit/arms] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T60.5.2: Implement PUT /api/bandit/policy updating active bandit policy ('thompson' | 'ucb1' | 'epsilon_greedy') and parameters in real time without restart. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: PUT /api/bandit/policy] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T60.5.3: Remove all fallback mock arrays in bandit HTTP handlers; return 100% empirical database records. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: handleBanditApi] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T60.5.4: Write integration tests verifying PUT /api/bandit/policy alters runtime scheduler behavior and GET /api/bandit/arms reflects updated stats. [File: packages/engine/src/tests/bandit_api.test.ts] [Test: npm test -- packages/engine/src/tests/bandit_api.test.ts]

### T60.6: ExplorationControlComponent Live Bandit Data Binding and Control UI
  - [ ] T60.6.1: Connect ExplorationControlComponent to GET /api/bandit/arms and GET /api/bandit/policy on component initialization. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Method: ngOnInit] [Test: npm test]
  - [ ] T60.6.2: Wire policy selector buttons (Thompson Sampling, UCB-1, Epsilon-Greedy) to dispatch PUT /api/bandit/policy with optimistic UI update. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Method: switchPolicy] [Test: npm test]
  - [ ] T60.6.3: Render live model arm cards showing real empirical win rates, pull counts, Alpha/Beta distributions, and current selection probability. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Template: arm-cards] [Test: npm test]
  - [ ] T60.6.4: Write frontend unit tests verifying policy selection triggers API call and arm statistics display live data from ArenaStateStore. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm test]

---

## Phase 61: Test Execution Subprocess Isolation, Guardrails & Memory Limits
*RDF Category: testing*

### T61.1: Sandboxed Subprocess Test Execution Runner with Structured Execution Options
  - [ ] T61.1.1: Create SandboxedSubprocessRunner in packages/engine/src/testing/SandboxedSubprocessRunner.ts executing task test commands using node:child_process spawn. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Class: SandboxedSubprocessRunner] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [ ] T61.1.2: Sanitize execution environment: whitelist safe environment variables (PATH, NODE_ENV, HOME) and scrub all API keys and vault secrets from child process env. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: sanitizeEnvironment] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [ ] T61.1.3: Set process execution current working directory strictly to target workspace or isolated task worktree folder. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: executeTest] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [ ] T61.1.4: Write unit tests verifying that subprocess runner executes test commands and captures standard output and exit codes cleanly. [File: packages/engine/src/tests/subprocess_runner.test.ts] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]

### T61.2: Subprocess Memory Limit Guardrails via Cgroups and Node Memory Caps
  - [ ] T61.2.1: Implement memory guardrail injecting --max-old-space-size=2048 into NODE_OPTIONS for Node.js test executions. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: applyMemoryLimits] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [ ] T61.2.2: Poll child process memory usage via /proc/<pid>/statm or pidusage every 500ms; terminate process if RSS exceeds 2500 MB. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: monitorMemory] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [ ] T61.2.3: Record MEMORY_EXCEEDED failure diagnostic when test execution is killed due to memory limit breach. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Type: TestExecutionResult] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [ ] T61.2.4: Write unit tests verifying memory monitoring aborts high-memory allocating processes and flags memory limit breach. [File: packages/engine/src/tests/subprocess_memory_limits.test.ts] [Test: npm test -- packages/engine/src/tests/subprocess_memory_limits.test.ts]

### T61.3: Execution Timeout Watchdog with Graceful SIGTERM/SIGKILL Cascade
  - [ ] T61.3.1: Implement timeout watchdog timer (configurable per task, default 60 seconds) aborting hanging or deadlocked test processes. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: startWatchdog] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [ ] T61.3.2: Implement two-stage termination: send SIGTERM, wait 3 seconds for graceful process cleanup, then escalate to SIGKILL if process remains alive. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: terminateChildProcess] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [ ] T61.3.3: Record TIMEOUT error classification and preserve any stdout/stderr captured prior to process termination. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: handleTimeout] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [ ] T61.3.4: Write unit tests verifying that a hanging child process (e.g. infinite loop) is terminated within timeout threshold and marked TIMEOUT. [File: packages/engine/src/tests/subprocess_timeout.test.ts] [Test: npm test -- packages/engine/src/tests/subprocess_timeout.test.ts]

### T61.4: Structured Test Output Parser for Vitest, Node Test Runner, and Jest
  - [ ] T61.4.1: Create StructuredTestOutputParser in packages/engine/src/testing/StructuredTestOutputParser.ts parsing raw terminal text into structured test results. [File: packages/engine/src/testing/StructuredTestOutputParser.ts] [Class: StructuredTestOutputParser] [Test: npm test -- packages/engine/src/tests/test_output_parser.test.ts]
  - [ ] T61.4.2: Parse total tests, passed count, failed count, skipped count, and duration from Vitest and Node.js native test runner summaries. [File: packages/engine/src/testing/StructuredTestOutputParser.ts] [Method: parseSummary] [Test: npm test -- packages/engine/src/tests/test_output_parser.test.ts]
  - [ ] T61.4.3: Extract failing test file paths, failing assertion descriptions, and line numbers from stderr stack traces. [File: packages/engine/src/testing/StructuredTestOutputParser.ts] [Method: extractFailures] [Test: npm test -- packages/engine/src/tests/test_output_parser.test.ts]
  - [ ] T61.4.4: Write unit tests verifying parser extracts accurate pass/fail counts and failure locations from sample Vitest, Node test, and Jest outputs. [File: packages/engine/src/tests/test_output_parser.test.ts] [Test: npm test -- packages/engine/src/tests/test_output_parser.test.ts]

### T61.5: Test Run Record Persistence in test_execution_runs Database Table
  - [ ] T61.5.1: Create TestExecutionRepository in packages/db/src/repositories/TestExecutionRepository.ts managing test_execution_runs table records. [File: packages/db/src/repositories/TestExecutionRepository.ts] [Class: TestExecutionRepository] [Test: npm test -- packages/db/src/tests/TestExecutionRepository.test.ts]
  - [ ] T61.5.2: Persist complete test execution record: taskId, command, exitCode, durationMs, passedCount, failedCount, stdoutSnippet, stderrSnippet, status. [File: packages/db/src/repositories/TestExecutionRepository.ts] [Method: recordRun] [Test: npm test -- packages/db/src/tests/TestExecutionRepository.test.ts]
  - [ ] T61.5.3: Add method listRecentRuns(limit: number, filter?: { status?: string }) returning historical test runs ordered by created_at DESC. [File: packages/db/src/repositories/TestExecutionRepository.ts] [Method: listRecentRuns] [Test: npm test -- packages/db/src/tests/TestExecutionRepository.test.ts]
  - [ ] T61.5.4: Write unit tests verifying test run records are inserted and queried correctly with full payload fidelity. [File: packages/db/src/tests/test_execution_runs.test.ts] [Test: npm test -- packages/db/src/tests/test_execution_runs.test.ts]

### T61.6: Test Failure Triage Engine Extracting Exact Failing Assertion and Line
  - [x] T61.6.1: Implement TestFailureTriager in packages/engine/src/testing/TestFailureTriager.ts analyzing test stderr to determine root cause category. [File: packages/engine/src/testing/TestFailureTriager.ts] [Class: TestFailureTriager] [Test: npm test -- packages/engine/src/tests/failure_triager.test.ts]
  - [x] T61.6.2: Classify failures: AssertionFailure (expected vs actual), CompilationError (TS syntax/type), RuntimeCrash (uncaught exception), Timeout. [File: packages/engine/src/testing/TestFailureTriager.ts] [Type: FailureClassification] [Test: npm test -- packages/engine/src/tests/failure_triager.test.ts]
  - [ ] T61.6.3: Extract minimal failing code snippet and expected value to inject directly into next remediation prompt. [File: packages/engine/src/testing/TestFailureTriager.ts] [Method: buildRemediationContext] [Test: npm test -- packages/engine/src/tests/failure_triager.test.ts]
  - [ ] T61.6.4: Write unit tests verifying triager correctly isolates assertion mismatches and formats clean remediation context. [File: packages/engine/src/tests/failure_triager.test.ts] [Test: npm test -- packages/engine/src/tests/failure_triager.test.ts]

---

## Phase 62: AST Context Slicing, Import Pruning & Focused Prompt Generation
*RDF Category: context*

### T62.1: Abstract Syntax Tree (AST) Context Slicer for TypeScript and Go Codebases
  - [ ] T62.1.1: Create AstContextSlicer in packages/engine/src/context/AstContextSlicer.ts using TypeScript compiler API (ts.createSourceFile). [File: packages/engine/src/context/AstContextSlicer.ts] [Class: AstContextSlicer] [Test: npm test -- packages/engine/src/tests/ast_slicer.test.ts]
  - [ ] T62.1.2: Traverse AST extracting exported type aliases, interfaces, function signatures, and class method signatures without function bodies. [File: packages/engine/src/context/AstContextSlicer.ts] [Method: extractInterfaceSkeleton] [Test: npm test -- packages/engine/src/tests/ast_slicer.test.ts]
  - [ ] T62.1.3: Generate compact architectural skeleton file replacing method bodies with '/* implementation */' to reduce token footprint by up to 80%. [File: packages/engine/src/context/AstContextSlicer.ts] [Method: generateSkeleton] [Test: npm test -- packages/engine/src/tests/ast_slicer.test.ts]
  - [ ] T62.1.4: Write unit tests verifying AST slicer preserves complete interface and function signatures while stripping inner logic. [File: packages/engine/src/tests/ast_slicer.test.ts] [Test: npm test -- packages/engine/src/tests/ast_slicer.test.ts]

### T62.2: Focused Import Skeleton Generator Pruning Unused External Modules
  - [x] T62.2.1: Create ImportPruningEngine in packages/engine/src/context/ImportPruningEngine.ts analyzing module dependency trees. [File: packages/engine/src/context/ImportPruningEngine.ts] [Class: ImportPruningEngine] [Test: npm test -- packages/engine/src/tests/import_pruner.test.ts]
  - [x] T62.2.2: Identify and strip unused external imports from prompt context that do not intersect with target focus files. [File: packages/engine/src/context/ImportPruningEngine.ts] [Method: pruneUnusedImports] [Test: npm test -- packages/engine/src/tests/import_pruner.test.ts]
  - [x] T62.2.3: Consolidate duplicate import declarations into single clean import statements. [File: packages/engine/src/context/ImportPruningEngine.ts] [Method: consolidateImports] [Test: npm test -- packages/engine/src/tests/import_pruner.test.ts]
  - [x] T62.2.4: Write unit tests verifying that external library declarations (e.g. lodash, rxjs) not needed by the task are omitted from prompt context. [File: packages/engine/src/tests/import_pruner.test.ts] [Test: npm test -- packages/engine/src/tests/import_pruner.test.ts]

### T62.3: Context Budget Allocator Enforcing Strict 4k and 8k Token Boundaries
  - [ ] T62.3.1: Implement ContextBudgetAllocator in packages/engine/src/context/ContextBudgetAllocator.ts calculating token distribution per task. [File: packages/engine/src/context/ContextBudgetAllocator.ts] [Class: ContextBudgetAllocator] [Test: npm test -- packages/engine/src/tests/context_budget.test.ts]
  - [ ] T62.3.2: Allocate budget partitions: 30% for system directives and rules, 35% for codebase context skeletons, 35% reserved for generation completion. [File: packages/engine/src/context/ContextBudgetAllocator.ts] [Method: calculatePartitions] [Test: npm test -- packages/engine/src/tests/context_budget.test.ts]
  - [ ] T62.3.3: Dynamically truncate lower-priority background files when total estimated tokens exceed context ceiling (4096 or 8192). [File: packages/engine/src/context/ContextBudgetAllocator.ts] [Method: enforceBudget] [Test: npm test -- packages/engine/src/tests/context_budget.test.ts]
  - [ ] T62.3.4: Write unit tests verifying budget allocator maintains prompt token count strictly within specified limit. [File: packages/engine/src/tests/context_budget.test.ts] [Test: npm test -- packages/engine/src/tests/context_budget.test.ts]

### T62.4: Markdown Fence Stripper and Self-Healing Code Extractor
  - [ ] T62.4.1: Implement stripMarkdownFences(rawText: string) in SelfHealingParser stripping leading/trailing markdown code fences (```typescript, ```). [File: packages/engine/src/inference/SelfHealingParser.ts] [Method: stripMarkdownFences] [Test: npm test -- packages/engine/src/tests/self_healing_parser.test.ts]
  - [ ] T62.4.2: Detect and strip conversational filler preceding code ('Here is the code:', 'Certainly! Here is...') to produce pure raw source code. [File: packages/engine/src/inference/SelfHealingParser.ts] [Method: stripConversationalPreamble] [Test: npm test -- packages/engine/src/tests/self_healing_parser.test.ts]
  - [ ] T62.4.3: Repair truncated code blocks: close unclosed brackets, parentheses, and string literals when model stream cuts off at max tokens. [File: packages/engine/src/inference/SelfHealingParser.ts] [Method: repairTruncatedSyntax] [Test: npm test -- packages/engine/src/tests/self_healing_parser.test.ts]
  - [ ] T62.4.4: Write unit tests verifying parser extracts clean, compilable TypeScript code from markdown-wrapped and conversational model outputs. [File: packages/engine/src/tests/self_healing_parser.test.ts] [Test: npm test -- packages/engine/src/tests/self_healing_parser.test.ts]

### T62.5: Focused File Diff Builder Generating Minimal Targeted Replacement Patches
  - [x] T62.5.1: Create FocusedDiffBuilder in packages/engine/src/context/FocusedDiffBuilder.ts generating surgical line-level replacement chunks. [File: packages/engine/src/context/FocusedDiffBuilder.ts] [Class: FocusedDiffBuilder] [Test: npm test -- packages/engine/src/tests/diff_builder.test.ts]
  - [x] T62.5.2: Compare generated code against original file to identify only modified functions and interfaces rather than overwriting entire files. [File: packages/engine/src/context/FocusedDiffBuilder.ts] [Method: computeTargetedChunks] [Test: npm test -- packages/engine/src/tests/diff_builder.test.ts]
  - [x] T62.5.3: Format unified diff format string for display in TaskDetailModal and Pull Request description. [File: packages/engine/src/context/FocusedDiffBuilder.ts] [Method: formatUnifiedDiff] [Test: npm test -- packages/engine/src/tests/diff_builder.test.ts]
  - [x] T62.5.4: Write unit tests verifying diff builder identifies exact changed lines and generates valid unified diff syntax. [File: packages/engine/src/tests/diff_builder.test.ts] [Test: npm test -- packages/engine/src/tests/diff_builder.test.ts]

### T62.6: Prompt Token Estimation and Pre-Flight Context Overflow Detector
  - [ ] T62.6.1: Implement estimateTokenCount(text: string) in packages/engine/src/inference/TokenEstimator.ts using byte-pair encoding (BPE) approximation. [File: packages/engine/src/inference/TokenEstimator.ts] [Class: TokenEstimator] [Test: npm test -- packages/engine/src/tests/token_estimator.test.ts]
  - [ ] T62.6.2: Execute pre-flight check in AutonomousWorkerPipeline before sending inference request to Ollama: reject or compact if tokens exceed 90% of model window. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: validatePromptBudget] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T62.6.3: Log token estimation metrics (promptTokensEstimate, availableCompletionBudget) in task_stages record. [File: packages/db/src/repositories/StageRepository.ts] [Method: recordStageCompletion] [Test: npm test -- packages/db/src/tests/StageRepository.test.ts]
  - [ ] T62.6.4: Write unit tests verifying token estimator accurately predicts token usage within 5% error margin of standard tokenizer. [File: packages/engine/src/tests/token_estimator.test.ts] [Test: npm test -- packages/engine/src/tests/token_estimator.test.ts]

---

## Phase 63: Automated Remediation Loop & Compiler Diagnostic Feedback Propagation
*RDF Category: orchestration*

### T63.1: Automated Remediation Stage in AutonomousWorkerPipeline
  - [ ] T63.1.1: Add 'remediation' stage to AutonomousWorkerPipeline pipeline execution sequence between 'test_execution' and 'review'. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Property: stages] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T63.1.2: Trigger remediation stage automatically whenever test_execution fails with non-zero exit code or assertion failure. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: handleTestFailure] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T63.1.3: Update task status to 'REMEDIATING' and broadcast SSE stage transition event to connected frontend clients. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: broadcastStageTransition] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T63.1.4: Write integration tests verifying that failing test automatically advances task into REMEDIATING status. [File: packages/engine/src/tests/remediation_pipeline.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_pipeline.test.ts]

### T63.2: Compiler Diagnostic Parser Extracting TypeScript (tsc) Diagnostic Objects
  - [ ] T63.2.1: Create CompilerDiagnosticParser in packages/engine/src/testing/CompilerDiagnosticParser.ts parsing raw compiler output into typed diagnostics. [File: packages/engine/src/testing/CompilerDiagnosticParser.ts] [Class: CompilerDiagnosticParser] [Test: npm test -- packages/engine/src/tests/compiler_diagnostics.test.ts]
  - [ ] T63.2.2: Extract filePath, lineNumber, columnNumber, errorCode (e.g. TS2304, TS2345), and error message from tsc output regex: /^(.*)\((\d+),(\d+)\): error (TS\d+): (.*)$/m. [File: packages/engine/src/testing/CompilerDiagnosticParser.ts] [Method: parseTscOutput] [Test: npm test -- packages/engine/src/tests/compiler_diagnostics.test.ts]
  - [ ] T63.2.3: Filter and prioritize top 3 root-cause syntax/type diagnostics to avoid overwhelming the remediation prompt. [File: packages/engine/src/testing/CompilerDiagnosticParser.ts] [Method: prioritizeDiagnostics] [Test: npm test -- packages/engine/src/tests/compiler_diagnostics.test.ts]
  - [ ] T63.2.4: Write unit tests verifying parser extracts accurate file locations and error codes from compiler error logs. [File: packages/engine/src/tests/compiler_diagnostics.test.ts] [Test: npm test -- packages/engine/src/tests/compiler_diagnostics.test.ts]

### T63.3: Remediation Prompt Formatter Injecting Exact Failing Line and Compiler Diagnostics
  - [ ] T63.3.1: Create RemediationPromptFormatter in packages/engine/src/inference/RemediationPromptFormatter.ts generating focused remediation prompt. [File: packages/engine/src/inference/RemediationPromptFormatter.ts] [Class: RemediationPromptFormatter] [Test: npm test -- packages/engine/src/tests/remediation_prompt.test.ts]
  - [ ] T63.3.2: Format remediation prompt with structured sections: '1. Original Task Goal', '2. Current Code with Bug', '3. Compiler Error Diagnostics', '4. Failing Test Assertion', '5. Required Surgical Fix'. [File: packages/engine/src/inference/RemediationPromptFormatter.ts] [Method: formatPrompt] [Test: npm test -- packages/engine/src/tests/remediation_prompt.test.ts]
  - [ ] T63.3.3: Add explicit instruction demanding only the fixed code replacement without conversational filler or duplicate explanations. [File: packages/engine/src/inference/RemediationPromptFormatter.ts] [Method: formatDirectives] [Test: npm test -- packages/engine/src/tests/remediation_prompt.test.ts]
  - [ ] T63.3.4: Write unit tests verifying remediation prompt contains all compiler diagnostics and exact failing code lines. [File: packages/engine/src/tests/remediation_prompt.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_prompt.test.ts]

### T63.4: Remediation Attempt Counter and Circuit Breaker (Max 2 Attempts)
  - [ ] T63.4.1: Track remediationAttempts counter in task execution context; enforce maxRemediationAttempts ceiling of 2. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeRemediation] [Test: npm test -- packages/engine/src/tests/remediation_circuit_breaker.test.ts]
  - [ ] T63.4.2: When remediation count reaches 2 without passing tests, trigger circuit breaker: stop remediation and fail task with REMEDIATION_EXHAUSTED. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: checkRemediationBreaker] [Test: npm test -- packages/engine/src/tests/remediation_circuit_breaker.test.ts]
  - [ ] T63.4.3: Prevent infinite token expenditure on fundamentally unviable prompts or corrupted task specifications. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: handleRemediationExhaustion] [Test: npm test -- packages/engine/src/tests/remediation_circuit_breaker.test.ts]
  - [ ] T63.4.4: Write unit tests simulating repeated test failure verifying pipeline halts remediation after 2 attempts and flags task failed. [File: packages/engine/src/tests/remediation_circuit_breaker.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_circuit_breaker.test.ts]

### T63.5: Remediation Success Telemetry Tracking per Model and Error Category
  - [ ] T63.5.1: Record remediation outcome in ModelHealthRepository: track totalRemediationAttempts and totalRemediationSuccess per model ID. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: recordRemediation] [Test: npm test -- packages/db/src/tests/ModelHealthRepository.test.ts]
  - [ ] T63.5.2: Compute remediationRecoveryRate as (totalRemediationSuccess / totalRemediationAttempts) * 100 in model health profiles. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: listProfiles] [Test: npm test -- packages/db/src/tests/ModelHealthRepository.test.ts]
  - [ ] T63.5.3: Expose remediation recovery metrics in GET /api/models/leaderboard response. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/models/leaderboard] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T63.5.4: Write unit tests verifying successful remediation increments model recovery counters in database. [File: packages/engine/src/tests/remediation_telemetry.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_telemetry.test.ts]

### T63.6: Fast Remediation Pre-Flight Check via Compiler Diagnostic Re-Verification
  - [ ] T63.6.1: Run instant in-memory TypeScript diagnostic check on remediated code before executing full test suite to fail fast on syntax errors. [File: packages/engine/src/testing/DiagnosticPreFlightChecker.ts] [Class: DiagnosticPreFlightChecker] [Test: npm test -- packages/engine/src/tests/preflight_checker.test.ts]
  - [ ] T63.6.2: Abort and re-prompt immediately if remediated code introduces new syntax errors, saving test runner subprocess execution time. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executePreFlight] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T63.6.3: Pass valid remediated code forward to 'test_execution' stage for complete verification. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: advanceToTestExecution] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T63.6.4: Write unit tests verifying pre-flight check catches obvious syntax mistakes without launching full test suite. [File: packages/engine/src/tests/preflight_checker.test.ts] [Test: npm test -- packages/engine/src/tests/preflight_checker.test.ts]

---

## Phase 64: Gitea Autonomous Worktree Management, PR Automation & Review Verdicts
*RDF Category: orchestration*

### T64.1: Ephemeral Git Worktree Provisioning per Task Execution
  - [ ] T64.1.1: Create GitWorktreeManager in packages/engine/src/gitea/GitWorktreeManager.ts using git worktree add to spawn isolated working directories. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Class: GitWorktreeManager] [Test: npm test -- packages/engine/src/tests/worktree_manager.test.ts]
  - [ ] T64.1.2: Create ephemeral task branch 'task/<priority>-<taskId>' based on master/main branch HEAD. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: createWorktree] [Test: npm test -- packages/engine/src/tests/worktree_manager.test.ts]
  - [ ] T64.1.3: Clean up and remove git worktree upon task completion or cancellation using git worktree remove --force. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: removeWorktree] [Test: npm test -- packages/engine/src/tests/worktree_manager.test.ts]
  - [ ] T64.1.4: Write unit tests verifying worktree creation, isolated file modification, and clean teardown without affecting main repository. [File: packages/engine/src/tests/worktree_manager.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_manager.test.ts]

### T64.2: Structured Conventional Commit Generator with Zero Emojis
  - [ ] T64.2.1: Create ConventionalCommitGenerator in packages/engine/src/gitea/ConventionalCommitGenerator.ts generating structured commit messages. [File: packages/engine/src/gitea/ConventionalCommitGenerator.ts] [Class: ConventionalCommitGenerator] [Test: npm test -- packages/engine/src/tests/commit_generator.test.ts]
  - [ ] T64.2.2: Map task role to commit type: implementer -> feat/fix, architect -> refactor, reviewer -> test, doc_writer -> docs. [File: packages/engine/src/gitea/ConventionalCommitGenerator.ts] [Method: resolveCommitType] [Test: npm test -- packages/engine/src/tests/commit_generator.test.ts]
  - [ ] T64.2.3: Enforce strict zero-emoji validation: verify commit message contains zero Unicode emojis or pictographs prior to execution. [File: packages/engine/src/gitea/ConventionalCommitGenerator.ts] [Method: formatCommitMessage] [Test: npm test -- packages/engine/src/tests/commit_generator.test.ts]
  - [ ] T64.2.4: Write unit tests verifying commit message adheres to conventional commits standard and contains task ID metadata. [File: packages/engine/src/tests/commit_generator.test.ts] [Test: npm test -- packages/engine/src/tests/commit_generator.test.ts]

### T64.3: Autonomous Gitea Pull Request Publisher via Gitea REST API
  - [ ] T64.3.1: Implement GiteaPrClient in packages/engine/src/gitea/GiteaPrClient.ts interacting with Gitea API (POST /api/v1/repos/{owner}/{repo}/pulls). [File: packages/engine/src/gitea/GiteaPrClient.ts] [Class: GiteaPrClient] [Test: npm test -- packages/engine/src/tests/gitea_pr_client.test.ts]
  - [ ] T64.3.2: Push task branch to Gitea remote origin using configured authentication token from secret vault. [File: packages/engine/src/gitea/GiteaPrClient.ts] [Method: pushBranch] [Test: npm test -- packages/engine/src/tests/gitea_pr_client.test.ts]
  - [ ] T64.3.3: Open pull request with title matching task title and body formatted with markdown task description, stage timing, and test verification logs. [File: packages/engine/src/gitea/GiteaPrClient.ts] [Method: openPullRequest] [Test: npm test -- packages/engine/src/tests/gitea_pr_client.test.ts]
  - [ ] T64.3.4: Store opened PR URL in task.prUrl and broadcast 'pr_created' SSE notification to frontend. [File: packages/db/src/repositories/TaskRepository.ts] [Method: updateBranchAndPr] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]

### T64.4: Automated Review Stage Assigning Reviewer Role Model to Inspect Diffs
  - [ ] T64.4.1: Implement automated PR review stage in AutonomousWorkerPipeline dispatching git diff to reviewer model (e.g. deepseek-r1:8b). [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeReviewStage] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T64.4.2: Prompt reviewer model to evaluate code against SOLID principles, security standards, and zero-emoji compliance. [File: packages/engine/src/gitea/AutomatedPrReviewer.ts] [Class: AutomatedPrReviewer] [Test: npm test -- packages/engine/src/tests/pr_reviewer.test.ts]
  - [ ] T64.4.3: Parse structured review verdict: APPROVE, COMMENT, or REQUEST_CHANGES with detailed review commentary. [File: packages/engine/src/gitea/AutomatedPrReviewer.ts] [Method: parseReviewVerdict] [Test: npm test -- packages/engine/src/tests/pr_reviewer.test.ts]
  - [ ] T64.4.4: Write unit tests verifying review prompt formatting and verdict parsing from model review output. [File: packages/engine/src/tests/pr_reviewer.test.ts] [Test: npm test -- packages/engine/src/tests/pr_reviewer.test.ts]

### T64.5: Gitea PR Review Submission and Status Check Integration
  - [ ] T64.5.1: Submit review comment and status to Gitea via POST /api/v1/repos/{owner}/{repo}/pulls/{index}/reviews. [File: packages/engine/src/gitea/GiteaPrClient.ts] [Method: submitReview] [Test: npm test -- packages/engine/src/tests/gitea_pr_client.test.ts]
  - [ ] T64.5.2: Set commit status check (POST /api/v1/repos/{owner}/{repo}/statuses/{sha}) to 'success' (green) or 'failure' (red) based on test run. [File: packages/engine/src/gitea/GiteaPrClient.ts] [Method: setCommitStatus] [Test: npm test -- packages/engine/src/tests/gitea_pr_client.test.ts]
  - [ ] T64.5.3: Persist review record in pr_reviews database table for auditability and compliance tracking. [File: packages/db/src/repositories/PrReviewRepository.ts] [Method: recordReview] [Test: npm test -- packages/db/src/tests/PrReviewRepository.test.ts]
  - [ ] T64.5.4: Write integration tests verifying review verdict and commit status checks appear correctly on Gitea PR. [File: packages/engine/src/tests/gitea_review_flow.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_review_flow.test.ts]

### T64.6: Automated Squash-Merge Workflow on Green Test and Approved Review
  - [ ] T64.6.1: Implement mergePullRequest(prIndex: number, mergeStyle: 'squash' = 'squash') in GiteaPrClient. [File: packages/engine/src/gitea/GiteaPrClient.ts] [Method: mergePullRequest] [Test: npm test -- packages/engine/src/tests/gitea_pr_client.test.ts]
  - [ ] T64.6.2: Verify preconditions prior to merge: test status check must be 'success' and review verdict must be 'APPROVE'. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Method: evaluateMergeEligibility] [Test: npm test -- packages/engine/src/tests/gitea_workflow.test.ts]
  - [ ] T64.6.3: Execute squash-merge via Gitea API (POST /api/v1/repos/{owner}/{repo}/pulls/{index}/merge); delete remote task branch automatically. [File: packages/engine/src/gitea/GiteaPrClient.ts] [Method: mergePullRequest] [Test: npm test -- packages/engine/src/tests/gitea_pr_client.test.ts]
  - [ ] T64.6.4: Write integration tests verifying that PR meeting all criteria is automatically merged into master and task branch cleaned up. [File: packages/engine/src/tests/automated_merge.test.ts] [Test: npm test -- packages/engine/src/tests/automated_merge.test.ts]

---

## Phase 65: Mobile-First Testing View Polish, Responsive Process Manager & Live Test Telemetry
*RDF Category: frontend*

### T65.1: Mobile-First High-Density Testing Table with Swipeable Action Triggers
  - [ ] T65.1.1: Implement mobile-first CSS media queries in TestingViewComponent adapting table into touch-friendly cards on screens <768px. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Styles: mobile-responsive] [Test: npm test]
  - [ ] T65.1.2: Add swipe-to-inspect gesture trigger on mobile cards revealing quick-action buttons (View Stderr, Copy Logs, Re-run). [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: mobile-card-actions] [Test: npm test]
  - [ ] T65.1.3: Ensure all tap targets adhere to WCAG minimum 44x44px spacing on mobile touch interfaces. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Styles: touch-targets] [Test: npm test]
  - [ ] T65.1.4: Write frontend unit tests verifying mobile card view renders required action triggers on small screen viewports. [File: packages/frontend/src/app/components/views/testing-view.component.spec.ts] [Test: npm test]

### T65.2: Real-Time Test Counter Badge in Root Navigation Header
  - [ ] T65.2.1: Add reactive test counter badge to Testing navigation tab in AppComponent header displaying currently active test runs count. [File: packages/frontend/src/app/app.ts] [Template: nav-badge] [Test: npm test]
  - [ ] T65.2.2: Compute activeRunningTestsCount signal from ArenaStateStore; animate badge pulse when new test begins executing. [File: packages/frontend/src/app/app.ts] [Computed: activeRunningTestsCount] [Test: npm test]
  - [ ] T65.2.3: Hide badge or display subtle zero indicator when no tests are actively executing to avoid visual clutter. [File: packages/frontend/src/app/app.ts] [Template: badge-visibility] [Test: npm test]
  - [ ] T65.2.4: Write unit tests in app.spec.ts verifying navigation badge updates reactively when running test signal changes. [File: packages/frontend/src/app/app.spec.ts] [Test: npm test]

### T65.3: Filter and Search Toolbar for Past and Current Test Executions
  - [ ] T65.3.1: Create TestFilterToolbarComponent providing filter pills (ALL, PASSED, FAILED, RUNNING) and debounced search input. [File: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts] [Class: TestFilterToolbarComponent] [Test: npm test]
  - [ ] T65.3.2: Implement 200ms debounce on search input filtering historical runs by task ID, test command, or failing test file name. [File: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts] [Method: onSearchInput] [Test: npm test]
  - [ ] T65.3.3: Persist active filter selection in URL query params (?filter=failed) to allow bookmarking and direct links. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Method: updateFilterParam] [Test: npm test]
  - [ ] T65.3.4: Write unit tests verifying filter toolbar emits filter change events and correctly filters test rows. [File: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.spec.ts] [Test: npm test]

### T65.4: Collapsible Associated Process Drawer with Live CPU and RSS Memory Metrics
  - [ ] T65.4.1: Create ProcessDrawerComponent in packages/frontend/src/app/components/process-drawer/ displaying system processes. [File: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts] [Class: ProcessDrawerComponent] [Test: npm test]
  - [ ] T65.4.2: Render animated toggle header showing process count and cumulative memory usage (e.g. '5 System Processes Active - 1.2 GB RSS'). [File: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts] [Template: drawer-header] [Test: npm test]
  - [ ] T65.4.3: Implement smooth slide transition when expanding/collapsing drawer using CSS grid-template-rows animation. [File: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts] [Styles: drawer-animation] [Test: npm test]
  - [ ] T65.4.4: Write unit tests verifying ProcessDrawerComponent expands and collapses cleanly and displays correct process summaries. [File: packages/frontend/src/app/components/process-drawer/process-drawer.component.spec.ts] [Test: npm test]

### T65.5: Operator Process Control Actions (Restart, Terminate) with Confirmation Modals
  - [ ] T65.5.1: Add action buttons (Restart, Terminate) to process table rows with role-gated authorization (ADMIN and OPERATOR only). [File: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts] [Template: action-buttons] [Test: npm test]
  - [ ] T65.5.2: Create ConfirmationDialogComponent prompting operator before restarting critical infrastructure services (Ollama, PGlite). [File: packages/frontend/src/app/components/confirmation-dialog/confirmation-dialog.component.ts] [Class: ConfirmationDialogComponent] [Test: npm test]
  - [ ] T65.5.3: Dispatch POST /api/processes/:name/restart via TaskApiService on confirmation and display transient toast notification. [File: packages/frontend/src/app/services/task-api.service.ts] [Method: restartProcess] [Test: npm test]
  - [ ] T65.5.4: Write unit tests verifying process action modal confirmation flow and role authorization gates. [File: packages/frontend/src/app/components/process-drawer/process-drawer.component.spec.ts] [Test: npm test]

### T65.6: WCAG AAA High-Contrast & OLED Theme Polish for Testing Panel
  - [ ] T65.6.1: Define CSS custom properties for Testing panel in OLED Pure Black (#000000 background, #10b981 emerald, #ef4444 red borders). [File: packages/frontend/src/styles.css] [Theme: oled] [Test: npm test]
  - [ ] T65.6.2: Implement High Contrast Mode (WCAG AAA) color definitions ensuring minimum 7:1 contrast ratio across all test badges and terminal text. [File: packages/frontend/src/styles.css] [Theme: high-contrast] [Test: npm test]
  - [ ] T65.6.3: Add ARIA live regions (aria-live="polite") to test status updates for screen reader accessibility. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: aria-live] [Test: npm test]
  - [ ] T65.6.4: Write unit tests verifying theme CSS classes apply correct foreground/background variable tokens. [File: packages/frontend/src/app/components/views/testing-view.component.spec.ts] [Test: npm test]

---

## Phase 66: Clean Slate Real-History Persistence & Model Stat Reset Daemon
*RDF Category: persistence*

### T66.1: Database Schema Indexes for High-Velocity Task and Stage Queries
  - [ ] T66.1.1: Add migration 011_task_history_indexes.ts creating composite index on tasks(status, updated_at DESC) for fast history pagination. [File: packages/db/src/migrations/011_task_history_indexes.ts] [Migration: 011_task_history_indexes] [Test: npm test -- packages/db/src/__tests__/Database.test.ts]
  - [ ] T66.1.2: Create index on task_stages(task_id, stage_name, started_at DESC) optimizing stage span queries for task detail modals. [File: packages/db/src/migrations/011_task_history_indexes.ts] [Index: idx_stages_task_started] [Test: npm test -- packages/db/src/__tests__/Database.test.ts]
  - [ ] T66.1.3: Create index on model_health_profiles(model_id, status) ensuring rapid health profile lookups during scheduling ticks. [File: packages/db/src/migrations/011_task_history_indexes.ts] [Index: idx_model_health_status] [Test: npm test -- packages/db/src/__tests__/Database.test.ts]
  - [ ] T66.1.4: Write unit tests verifying migration 011 executes idempotently and indexes improve query plan execution speed. [File: packages/db/src/__tests__/Database.test.ts] [Test: npm test -- packages/db/src/__tests__/Database.test.ts]

### T66.2: REST API: DELETE /api/history Purging Mock/Obsolete Task Records
  - [ ] T66.2.1: Register route DELETE /api/history in CacophonyHttpServer with role-gated admin authentication. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: DELETE /api/history] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T66.2.2: Implement TaskRepository.purgeHistoricalTasks(options?: { olderThanDays?: number, status?: TaskStatus[] }) purging finished tasks. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.purgeHistoricalTasks] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T66.2.3: Cascade delete associated records in task_stages, task_telemetry_correlations, and test_execution_runs. [File: packages/db/src/repositories/TaskRepository.ts] [Method: purgeHistoricalTasks] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T66.2.4: Write integration tests verifying DELETE /api/history removes COMPLETED and FAILED tasks while preserving PENDING and RUNNING tasks. [File: packages/engine/src/tests/history_purge_api.test.ts] [Test: npm test -- packages/engine/src/tests/history_purge_api.test.ts]

### T66.3: Model Health Profile Reset Routine Clearing Mock Stats
  - [ ] T66.3.1: Implement ModelHealthRepository.resetAllStats() resetting total_tasks, total_success, total_failures, and consecutive_failures to 0. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: ModelHealthRepository.resetAllStats] [Test: npm test -- packages/db/src/tests/ModelHealthRepository.test.ts]
  - [ ] T66.3.2: Reset avg_latency_ms and avg_tokens_per_sec to 0.0 and restore status to 'ACTIVE' for all registered models. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: resetAllStats] [Test: npm test -- packages/db/src/tests/ModelHealthRepository.test.ts]
  - [ ] T66.3.3: Expose POST /api/models/reset-stats endpoint triggering clean-slate reset of model leaderboard metrics. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/models/reset-stats] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T66.3.4: Write unit tests verifying resetAllStats updates all model rows to clean baseline values without dropping records. [File: packages/db/src/tests/model_health_reset.test.ts] [Test: npm test -- packages/db/src/tests/model_health_reset.test.ts]

### T66.4: Telemetry Snapshot Auto-Compaction Daemon Rolling Up Data Older Than 7 Days
  - [ ] T66.4.1: Implement TelemetryCompactorDaemon in packages/engine/src/telemetry/TelemetryCompactorDaemon.ts running every 24 hours. [File: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts] [Class: TelemetryCompactorDaemon] [Test: npm test -- packages/engine/src/tests/telemetry_compactor.test.ts]
  - [ ] T66.4.2: Aggregate high-frequency (1s) telemetry snapshots older than 7 days into 1-hour average summary records. [File: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts] [Method: aggregateHourlySnapshots] [Test: npm test -- packages/engine/src/tests/telemetry_compactor.test.ts]
  - [ ] T66.4.3: Delete granular sub-hour raw snapshots older than 7 days after successful rollup insertion, freeing disk space. [File: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts] [Method: pruneRawSnapshots] [Test: npm test -- packages/engine/src/tests/telemetry_compactor.test.ts]
  - [ ] T66.4.4: Write unit tests verifying compactor rolls up 3600 raw records into single hourly average and deletes originals safely. [File: packages/engine/src/tests/telemetry_compactor.test.ts] [Test: npm test -- packages/engine/src/tests/telemetry_compactor.test.ts]

### T66.5: Cacophony CLI Command: cacophony history reset and cacophony history prune
  - [ ] T66.5.1: Add CLI subcommand 'history' to bin/cacophony CLI entrypoint with actions: 'list', 'reset', 'prune'. [File: bin/cacophony.ts] [Subcommand: history] [Test: node bin/cacophony.ts history list]
  - [ ] T66.5.2: Support --days=N flag for prune action to retain specified window of historical tasks. [File: bin/cacophony.ts] [Option: --days] [Test: node bin/cacophony.ts history prune --days=7]
  - [ ] T66.5.3: Implement interactive confirmation prompt (or --yes flag for automated scripts) before executing destructive reset. [File: bin/cacophony.ts] [Method: confirmAction] [Test: node bin/cacophony.ts history reset --yes]
  - [ ] T66.5.4: Write CLI integration tests verifying history reset and prune subcommands interact properly with daemon IPC socket. [File: packages/engine/src/tests/cli_history.test.ts] [Test: npm test -- packages/engine/src/tests/cli_history.test.ts]

### T66.6: Automated Backup Snapshot Generation Prior to History Pruning
  - [ ] T66.6.1: Implement createDatabaseBackup(backupDir: string) in DatabaseMaintenanceService creating point-in-time snapshot before purge. [File: packages/db/src/services/DatabaseMaintenanceService.ts] [Method: createDatabaseBackup] [Test: npm test -- packages/db/src/tests/database_maintenance.test.ts]
  - [ ] T66.6.2: Save compressed JSON archive containing dumped tasks and task_stages to data/backups/cacophony_backup_<timestamp>.json.gz. [File: packages/db/src/services/DatabaseMaintenanceService.ts] [Method: exportTasksToJson] [Test: npm test -- packages/db/src/tests/database_maintenance.test.ts]
  - [ ] T66.6.3: Automatically prune backups older than 30 days to enforce storage retention limits. [File: packages/db/src/services/DatabaseMaintenanceService.ts] [Method: pruneOldBackups] [Test: npm test -- packages/db/src/tests/database_maintenance.test.ts]
  - [ ] T66.6.4: Write unit tests verifying backup archive is written to disk and can be inspected before purge proceeds. [File: packages/db/src/tests/database_backup.test.ts] [Test: npm test -- packages/db/src/tests/database_backup.test.ts]

---

## Phase 67: Real-Time Stream Tap Filtering & Multi-Task Tap Isolation
*RDF Category: telemetry*

### T67.1: Multi-Task Stream Tap Isolation in StreamTapManager
  - [ ] T67.1.1: Refactor StreamTapManager to maintain discrete ring buffers keyed by taskId instead of a single global shared buffer. [File: packages/engine/src/inference/StreamTapManager.ts] [Class: StreamTapManager] [Test: npm test -- packages/engine/src/tests/stream_tap_manager.test.ts]
  - [ ] T67.1.2: Prevent token cross-contamination between concurrent or sequential task executions: append tokens strictly to target taskId buffer. [File: packages/engine/src/inference/StreamTapManager.ts] [Method: appendToken] [Test: npm test -- packages/engine/src/tests/stream_tap_manager.test.ts]
  - [ ] T67.1.3: Expose getTaskBuffer(taskId: string) returning the isolated stream buffer for a specific task. [File: packages/engine/src/inference/StreamTapManager.ts] [Method: getTaskBuffer] [Test: npm test -- packages/engine/src/tests/stream_tap_manager.test.ts]
  - [ ] T67.1.4: Write unit tests verifying that tokens appended to task-1 are never visible in task-2 buffer. [File: packages/engine/src/tests/stream_tap_isolation.test.ts] [Test: npm test -- packages/engine/src/tests/stream_tap_isolation.test.ts]

### T67.2: Task-Specific SSE Stream Channel (/api/stream/:taskId)
  - [ ] T67.2.1: Add parameterized SSE route GET /api/stream/:taskId in CacophonyHttpServer allowing clients to subscribe to specific task output. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/stream/:taskId] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T67.2.2: Stream initial buffer chunk (stream_init event) upon client connection containing all tokens accumulated so far for that task. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: handleTaskSseStream] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T67.2.3: Stream incremental token chunks (token event) in real time as Ollama delivers inference chunks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: broadcastTaskToken] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T67.2.4: Write integration tests verifying multiple SSE clients connected to different tasks receive their respective token streams. [File: packages/engine/src/tests/task_sse_streams.test.ts] [Test: npm test -- packages/engine/src/tests/task_sse_streams.test.ts]

### T67.3: Instantaneous vs Rolling Token Velocity Smoothing Engine
  - [ ] T67.3.1: Implement Exponential Moving Average (EMA) token velocity smoother in ArenaStateStore: smoothed = alpha * instant + (1 - alpha) * smoothed. [File: packages/frontend/src/app/services/arena-state.store.ts] [Method: updateSmoothedVelocity] [Test: npm test]
  - [ ] T67.3.2: Set smoothing coefficient alpha = 0.25 to eliminate visual strobing while maintaining responsiveness to real speed changes. [File: packages/frontend/src/app/services/arena-state.store.ts] [Property: velocityAlpha] [Test: npm test]
  - [ ] T67.3.3: Expose formattedSmoothedVelocity signal formatted to fixed 1 decimal place with tabular numbers font styling. [File: packages/frontend/src/app/services/arena-state.store.ts] [Computed: formattedSmoothedVelocity] [Test: npm test]
  - [ ] T67.3.4: Write frontend unit tests verifying smoothed velocity calculation dampens sudden token spikes and smoothly decays to 0 on pause. [File: packages/frontend/src/app/services/arena-state.store.spec.ts] [Test: npm test]

### T67.4: Historical Stream Buffer Replay from Persisted Stage Output
  - [ ] T67.4.1: Implement replayStreamForTask(taskId: string) in TaskApiService fetching persisted generation stage log output. [File: packages/frontend/src/app/services/task-api.service.ts] [Method: replayStreamForTask] [Test: npm test]
  - [ ] T67.4.2: Update TaskInspectorComponent to display historical log buffer when viewing a non-active or completed task selected from list. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Method: selectTaskToInspect] [Test: npm test]
  - [ ] T67.4.3: Show status pill 'COMPLETED' or 'ARCHIVED' instead of 'LIVE' when viewing historical streams. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Template: stream-status] [Test: npm test]
  - [ ] T67.4.4: Write unit tests verifying task inspector switches cleanly between live SSE streaming and static historical stage replay. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.spec.ts] [Test: npm test]

### T67.5: SSE Client Reconnect and Last-Event-ID State Restoration
  - [ ] T67.5.1: Implement Last-Event-ID tracking in CacophonyHttpServer SSE broadcaster numbering each streamed token event sequentially. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: broadcastEventWithId] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T67.5.2: Handle reconnect requests: when client reconnects with Last-Event-ID, replay missed tokens from the ring buffer before resuming live stream. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: resumeSseStream] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T67.5.3: Add automatic reconnect logic with exponential backoff in frontend ArenaStateStore eventSource connection handler. [File: packages/frontend/src/app/services/arena-state.store.ts] [Method: connectLiveStreams] [Test: npm test]
  - [ ] T67.5.4: Write integration tests verifying that simulated network disconnection and reconnection causes zero token loss. [File: packages/engine/src/tests/sse_reconnect.test.ts] [Test: npm test -- packages/engine/src/tests/sse_reconnect.test.ts]

### T67.6: Stream Tap Buffer Memory Governor and Rolling Eviction
  - [x] T67.6.1: Enforce maximum per-task buffer size limit of 100,000 characters (~25,000 tokens) in StreamTapManager. [File: packages/engine/src/inference/StreamTapManager.ts] [Property: maxBufferSize] [Test: npm test -- packages/engine/src/tests/stream_tap_governor.test.ts]
  - [x] T67.6.2: Implement FIFO rolling truncation: slice oldest characters when buffer exceeds max limit to prevent node process heap bloat. [File: packages/engine/src/inference/StreamTapManager.ts] [Method: enforceBufferLimit] [Test: npm test -- packages/engine/src/tests/stream_tap_governor.test.ts]
  - [x] T67.6.3: Evict buffers for tasks completed more than 30 minutes ago during periodic garbage collection sweep. [File: packages/engine/src/inference/StreamTapManager.ts] [Method: sweepStaleBuffers] [Test: npm test -- packages/engine/src/tests/stream_tap_governor.test.ts]
  - [x] T67.6.4: Write unit tests verifying buffer truncation preserves newest tokens and stale task buffers are purged from memory. [File: packages/engine/src/tests/stream_tap_governor.test.ts] [Test: npm test -- packages/engine/src/tests/stream_tap_governor.test.ts]

---

## Phase 68: Multi-Model Load Balancer & VRAM-Aware Task Placement
*RDF Category: hardware*

### T68.1: Static VRAM Model Memory Footprint Catalog (3b, 4b, 7b, 8b Quantized Profiles)
  - [ ] T68.1.1: Create ModelVramCatalog in packages/engine/src/hardware/ModelVramCatalog.ts defining expected VRAM footprints per quantized model. [File: packages/engine/src/hardware/ModelVramCatalog.ts] [Class: ModelVramCatalog] [Test: npm test -- packages/engine/src/tests/vram_catalog.test.ts]
  - [ ] T68.1.2: Populate baseline memory footprints: qwen2.5-coder:3b (2.2 GB), gemma3:4b (3.1 GB), qwen2.5-coder:7b (5.2 GB), deepseek-r1:8b (6.1 GB). [File: packages/engine/src/hardware/ModelVramCatalog.ts] [Data: MODEL_VRAM_TABLE] [Test: npm test -- packages/engine/src/tests/vram_catalog.test.ts]
  - [ ] T68.1.3: Add dynamic KV-cache memory calculation scaling VRAM requirements by configured context window (4096 vs 8192 tokens). [File: packages/engine/src/hardware/ModelVramCatalog.ts] [Method: estimateTotalVramMb] [Test: npm test -- packages/engine/src/tests/vram_catalog.test.ts]
  - [ ] T68.1.4: Write unit tests verifying catalog accurately returns base footprint and adds context buffer overhead per model ID. [File: packages/engine/src/tests/vram_catalog.test.ts] [Test: npm test -- packages/engine/src/tests/vram_catalog.test.ts]

### T68.2: Dynamic VRAM Headroom Check via AmdVegaTelemetryProvider
  - [ ] T68.2.1: Implement checkVramHeadroom(requiredMb: number) in AmdVegaTelemetryProvider querying current sysfs vram_used and vram_total. [File: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts] [Method: checkVramHeadroom] [Test: npm test -- packages/engine/src/tests/hardware_telemetry.test.ts]
  - [ ] T68.2.2: Enforce safety margin: require at least 1024 MB buffer above model requirement to prevent APU system freeze or out-of-memory kernel kill. [File: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts] [Property: SAFETY_MARGIN_MB] [Test: npm test -- packages/engine/src/tests/hardware_telemetry.test.ts]
  - [ ] T68.2.3: Integrate VRAM headroom check into TaskScheduler.canDispatch: defer dispatching heavy 8b tasks if free VRAM is below threshold. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: canDispatch] [Test: npm test -- packages/engine/src/tests/scheduler_vram_check.test.ts]
  - [ ] T68.2.4: Write unit tests verifying scheduler defers 8b tasks when VRAM headroom is constrained and allows lighter 3b tasks. [File: packages/engine/src/tests/scheduler_vram_check.test.ts] [Test: npm test -- packages/engine/src/tests/scheduler_vram_check.test.ts]

### T68.3: Warm Model Affinity Cache Prioritizing In-Memory Ollama Models
  - [ ] T68.3.1: Query Ollama loaded models API (GET /api/ps) every 5 seconds in TaskScheduler to detect which model is currently resident in VRAM. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: queryLoadedModels] [Test: npm test -- packages/engine/src/tests/warm_model_affinity.test.ts]
  - [ ] T68.3.2: Prioritize pending tasks that can be fulfilled by the currently loaded warm model to eliminate 5-15s cold-load swap latency. [File: packages/engine/src/scheduler/QueueGroomer.ts] [Method: sortByWarmModelAffinity] [Test: npm test -- packages/engine/src/tests/queue_groomer.test.ts]
  - [ ] T68.3.3: Cap consecutive warm model task batching at 5 tasks to prevent starvation of tasks requiring alternative model capabilities. [File: packages/engine/src/scheduler/QueueGroomer.ts] [Method: applyStarvationCap] [Test: npm test -- packages/engine/src/tests/queue_groomer.test.ts]
  - [ ] T68.3.4: Write unit tests demonstrating that tasks matching the currently loaded model are dispatched first while preventing starvation. [File: packages/engine/src/tests/warm_model_affinity.test.ts] [Test: npm test -- packages/engine/src/tests/warm_model_affinity.test.ts]

### T68.4: Explicit Model Unload Controller (keep_alive: 0) on Architecture Shift
  - [ ] T68.4.1: Implement unloadModel(modelName: string) in OllamaProvider issuing POST /api/generate with { model: modelName, keep_alive: 0 }. [File: packages/engine/src/inference/OllamaProvider.ts] [Method: unloadModel] [Test: npm test -- packages/engine/src/tests/ollama_provider.test.ts]
  - [ ] T68.4.2: Trigger explicit model unload before loading a disparate model architecture when free VRAM headroom is insufficient for co-residency. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: prepareModelExecution] [Test: npm test -- packages/engine/src/tests/scheduler_model_unload.test.ts]
  - [ ] T68.4.3: Poll /api/ps with 500ms backoff verifying previous model has been purged from GPU memory before launching next inference request. [File: packages/engine/src/inference/OllamaProvider.ts] [Method: waitForModelEviction] [Test: npm test -- packages/engine/src/tests/ollama_provider.test.ts]
  - [ ] T68.4.4: Write unit tests verifying unloadModel sends keep_alive: 0 and waits for memory reclamation. [File: packages/engine/src/tests/model_unload_flow.test.ts] [Test: npm test -- packages/engine/src/tests/model_unload_flow.test.ts]

### T68.5: Multi-Accelerator Task Placement Engine for Multi-GPU Systems
  - [ ] T68.5.1: Create MultiGpuTaskRouter in packages/engine/src/hardware/MultiGpuTaskRouter.ts discovering all GPU devices (/sys/class/drm/card*). [File: packages/engine/src/hardware/MultiGpuTaskRouter.ts] [Class: MultiGpuTaskRouter] [Test: npm test -- packages/engine/src/tests/multi_gpu_router.test.ts]
  - [ ] T68.5.2: Map individual model allocations to target accelerator by passing CUDA_VISIBLE_DEVICES or ROCR_VISIBLE_DEVICES environment variable. [File: packages/engine/src/hardware/MultiGpuTaskRouter.ts] [Method: getDeviceEnvForModel] [Test: npm test -- packages/engine/src/tests/multi_gpu_router.test.ts]
  - [ ] T68.5.3: Balance concurrent models across discrete GPU and APU when dual-accelerator hardware is detected. [File: packages/engine/src/hardware/MultiGpuTaskRouter.ts] [Method: balanceAccelerators] [Test: npm test -- packages/engine/src/tests/multi_gpu_router.test.ts]
  - [ ] T68.5.4: Write unit tests verifying multi-GPU router assigns tasks to the accelerator with the greatest available VRAM headroom. [File: packages/engine/src/tests/multi_gpu_router.test.ts] [Test: npm test -- packages/engine/src/tests/multi_gpu_router.test.ts]

### T68.6: Out-of-Memory (OOM) Predictive Guard Preventing APU Hangs
  - [ ] T68.6.1: Implement OomPredictiveGuard in packages/engine/src/hardware/OomPredictiveGuard.ts monitoring kernel sysfs memory pressure signals. [File: packages/engine/src/hardware/OomPredictiveGuard.ts] [Class: OomPredictiveGuard] [Test: npm test -- packages/engine/src/tests/oom_guard.test.ts]
  - [ ] T68.6.2: Intercept and abort task dispatch when total system memory availability (MemAvailable from /proc/meminfo) drops below 1.5 GB. [File: packages/engine/src/hardware/OomPredictiveGuard.ts] [Method: evaluateSystemMemoryPressure] [Test: npm test -- packages/engine/src/tests/oom_guard.test.ts]
  - [ ] T68.6.3: Broadcast 'system_memory_warning' SSE alert and transition scheduler to backpressure pause state until memory normalizes. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Event: system_memory_warning] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T68.6.4: Write unit tests simulating low memory conditions verifying that OOM guard halts task dispatch and emits warning alerts. [File: packages/engine/src/tests/oom_guard.test.ts] [Test: npm test -- packages/engine/src/tests/oom_guard.test.ts]

---

## Phase 69: Telemetry Visual Redesign, Hardware Safety Limits & Self-Healing Pipeline Remediation
*RDF Category: telemetry*

### T69.1: APU Temperature Progress Bar & Thermal Cutoff Calibration
  - [x] T69.1.1: Redesign APU temperature monitor as a progress bar scaled such that 105C is 100%, displaying values in degrees Celsius, never percent. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Test: npm test]
  - [x] T69.1.2: Implement multi-color fencepost threshold styling: <80C Blue, 80-85C Green, 85-90C Yellow, 90-95C Orange, 95-100C Red, 100-105C Fire Engine Red. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Test: npm test]
  - [x] T69.1.3: Enforce emergency scheduler queue shutdown and task termination immediately if hardware temperature exceeds 105C. [File: packages/engine/src/telemetry/ThermalGovernor.ts] [Class: ThermalGovernor] [Test: npm test -- packages/engine/src/tests/thermal_governor.test.ts]
  - [x] T69.1.4: Make cool-off wait periods configurable via THERMAL_COOLOFF_ENABLED environment variable and default off to allow native hardware APU throttle control. [File: packages/engine/src/telemetry/ThermalGovernor.ts] [Property: coolOffEnabled] [Test: npm test -- packages/engine/src/tests/thermal_governor.test.ts]

### T69.2: Telemetry Deduplication & Moving Area-Under-Curve (AOC) Line Graphs
  - [x] T69.2.1: Deduplicate telemetry cards: consolidate GPU clocks, voltages, and memory details into their primary metric cards and remove redundant bottom mini-cards. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Template: metrics-grid] [Test: npm test]
  - [x] T69.2.2: Add dedicated primary monitoring cards for CPU Load and System RAM baseline performance. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Class: HardwareMonitorComponent] [Test: npm test]
  - [x] T69.2.3: Implement moving line graphs with translucent area-under-curve (AOC) sparklines below each primary card, color-coded to each metric's theme. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Method: getAreaPath] [Test: npm test]
  - [x] T69.2.4: Render cold-to-hot (blue to red) gradient fill behind the APU temperature graph line to highlight danger zones. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Template: temp-gradient-def] [Test: npm test]
  - [x] T69.2.5: Enforce fixed bounding boxes with tabular numbers (font-variant-numeric: tabular-nums) across all telemetry metrics to prevent UI flickering. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Styles: tabular-nums] [Test: npm test]

### T69.3: Active Model Velocity High-Water Mark Meter & Outlier Filtering
  - [x] T69.3.1: Implement high-water mark (HWM) meter next to active model, where the maximum throughput achieved scales the progress bar maxima. [File: packages/frontend/src/app/services/arena-state.store.ts] [Signal: modelHighWaterMarks] [Test: npm test]
  - [x] T69.3.2: Filter throughput spikes exceeding two standard deviations (2σ) from the rolling mean back down to the next largest maxima. [File: packages/frontend/src/app/services/arena-state.store.ts] [Method: updateModelVelocity] [Test: npm test]
  - [x] T69.3.3: Wire model name and stats badge click handler to navigate to model analytics profile route (/models?model=<modelId>). [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Method: navigateToModelStats] [Test: npm test]

### T69.4: Deep Model Health Analytics Profile Page
  - [x] T69.4.1: Support query parameter filtering on /models?model=<modelId> to focus inspection on the selected model candidate. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Class: ModelsViewComponent] [Test: npm test]
  - [x] T69.4.2: Display comprehensive execution statistics for the selected model: total runs, success count, failure count, win rate, velocity, and mean latency. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Template: model-detail-panel] [Test: npm test]
  - [x] T69.4.3: Render task type and role distribution chips (implementer, reviewer, architect) and priority distributions (P0, P1, P2) for the selected model. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Computed: roleBreakdown] [Test: npm test]
  - [x] T69.4.4: List historical task executions by the model with status pills, failure reasons, and drill-down links to inspect task modal. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Template: historical-runs-section] [Test: npm test]

### T69.5: Real-Time Gantt Execution Timeline
  - [x] T69.5.1: Implement continuously advancing live execution playhead driven by task duration, center-anchored at 50% viewport width while timeline scrolls smoothly underneath without pegging to the right boundary. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.ts] [Class: GanttTransportComponent] [Test: npm test]
  - [x] T69.5.2: Dynamically expand active stage bar in real time as the playhead advances through task execution stages, supporting concurrent dual-booking where both code generation and running tests actively log and visualize duration on stacked lanes. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.ts] [Computed: playheadPercent] [Test: npm test]
  - [x] T69.5.3: Lay out vertical stage labels on the left (Planning, Generation, Scrub, Test, Review, Merge) and latency waypoints in ms across the top ruler. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.ts] [Template: timeline-ruler] [Test: npm test]
  - [x] T69.5.4: Provide interactive zoom scale controls (+/-) and drag-to-pan navigation, with viewport Fit Mode enabled by default and toggleable between Fit and Full view. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.ts] [Method: toggleFitMode] [Test: npm test]

### T69.6: Task Execution Success Rate Optimization & Autonomous Self-Healing
  - [x] T69.6.1: Eliminate watchdog timeout root cause by scoping workspace tests in QueueGroomer from blanket suites to targeted test files or node --check. [File: packages/engine/src/scheduler/QueueGroomer.ts] [Method: scopeTestCommand] [Test: npm test -- packages/engine/src/tests/queue_groomer.test.ts]
  - [x] T69.6.2: Implement self-healing remediation loop in AutonomousWorkerPipeline feeding compiler and test failure stderr back to the model before marking task failed. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T69.6.3: Add automated syntactic remediation rules detecting common local model syntax errors (unterminated template strings, unbalanced braces) prior to test execution. [File: packages/engine/src/scrubber/CodeScrubber.ts] [Class: CodeScrubber] [Test: npm test -- packages/engine/src/tests/code_scrubber.test.ts]
  - [ ] T69.6.4: Track per-model rolling success rate and auto-demote models below 50% pass rate to shadow review role while promoting reliable models. [File: packages/engine/src/scheduler/ModelEvictionManager.ts] [Class: ModelEvictionManager] [Test: npm test -- packages/engine/src/tests/model_eviction.test.ts]
  - [x] T69.6.5: Implement WorkspacePackageImportScrubberRule in packages/engine/src/scrubber/rules/ rewriting hallucinated imports (@cacophony/git-worktrees, @cacophony/types, chai). [File: packages/engine/src/scrubber/rules/WorkspacePackageImportScrubberRule.ts] [Class: WorkspacePackageImportScrubberRule] [Test: npm test -- packages/engine/src/__tests__/Scrubber.test.ts]
  - [x] T69.6.6: Add transactional file snapshot and rollback in AutonomousWorkerPipeline ensuring workspace files revert to pristine pre-task states upon verification failure. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: rollbackWorkspace] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T69.6.7: Add configurable task execution diagnostics (DEBUG_TASK_PIPELINE=true / @cacophony-debug) dumping AST/compiler stderr to .cacophony/diagnostics/ for zero runtime overhead in production. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: logDiagnostic] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]

---

## Phase 70: Schematic Code Generators, Import Scaffolding & Zero-Boilerplate Generation Architecture
*RDF Category: orchestration*

### T70.1: Deterministic AST Code Skeleton & Scaffold Generator
  - [ ] T70.1.1: Design and implement SchematicCodeGenerator in packages/engine/src/generators/SchematicCodeGenerator.ts generating typed skeleton source files with verified imports, classes, and exported function signatures. [File: packages/engine/src/generators/SchematicCodeGenerator.ts] [Class: SchematicCodeGenerator] [Test: npm test -- packages/engine/src/tests/schematic_generator.test.ts]
  - [ ] T70.1.2: Generate type-safe method stubs containing parameter contracts, return types, and docstrings, leaving only scoped implementation bodies for local models to fulfill. [File: packages/engine/src/generators/SchematicCodeGenerator.ts] [Method: generateStubs] [Test: npm test -- packages/engine/src/tests/schematic_generator.test.ts]
  - [ ] T70.1.3: Define declarative schematic templates for common workspace patterns (ScrubberRule, TelemetryProvider, HttpRouteHandler, RepositoryService, AngularStandaloneComponent). [File: packages/engine/src/generators/SchematicTemplates.ts] [Class: SchematicTemplates] [Test: npm test -- packages/engine/src/tests/schematic_generator.test.ts]
  - [ ] T70.1.4: Write unit tests verifying that SchematicCodeGenerator produces syntactically valid TypeScript passing AstValidator. [File: packages/engine/src/tests/schematic_generator.test.ts] [Test: npm test -- packages/engine/src/tests/schematic_generator.test.ts]

### T70.2: Import Injection & Slot-Fill Scaffolding Engine
  - [ ] T70.2.1: Pre-populate all requisite monorepo and standard library imports into generated files so local 3B/7B models never have to synthesize boilerplate imports. [File: packages/engine/src/generators/SchematicCodeGenerator.ts] [Method: injectImports] [Test: npm test -- packages/engine/src/tests/schematic_generator.test.ts]
  - [ ] T70.2.2: Extract class names, method signatures, and exported interfaces using TypeScript compiler API (ts.createSourceFile). [File: packages/engine/src/generators/SignatureHarvester.ts] [Class: SignatureHarvester] [Test: npm test -- packages/engine/src/tests/schematic_generator.test.ts]
  - [ ] T70.2.3: Restrict local model generation to a strict slot-fill prompt format (generating only the function body between // <BEGIN_IMPLEMENTATION> and // <END_IMPLEMENTATION>). [File: packages/engine/src/inference/SlotFillPromptBuilder.ts] [Class: SlotFillPromptBuilder] [Test: npm test -- packages/engine/src/tests/slot_fill.test.ts]
  - [ ] T70.2.4: Write unit tests verifying slot-fill code synthesis, template marker extraction, and AST integrity. [File: packages/engine/src/tests/slot_fill.test.ts] [Test: npm test -- packages/engine/src/tests/slot_fill.test.ts]

### T70.3: AutonomousWorkerPipeline Schematic Integration & Validation Gate
  - [ ] T70.3.1: Connect SchematicCodeGenerator into AutonomousWorkerPipeline.planningStage: when a target focus file does not exist, synthesize its skeleton before dispatching generation. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: ensureSkeletonExists] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T70.3.2: Verify slot-fill output passes AST validation (AstValidator) before merging into target skeleton file on disk. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: mergeSlotFill] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T70.3.3: Implement schema-level fallback: if a model fails slot-fill verification 2 consecutive times, escalate to frontier fallback model with full schematic context. [File: packages/engine/src/inference/FrontierFallbackRouter.ts] [Method: routeSchematicFallback] [Test: npm test -- packages/engine/src/tests/frontier_fallback.test.ts]
  - [ ] T70.3.4: Write integration tests verifying end-to-end task execution with schematic code scaffolding and slot-fill synthesis. [File: packages/engine/src/tests/schematic_pipeline_integration.test.ts] [Test: npm test -- packages/engine/src/tests/schematic_pipeline_integration.test.ts]

### T70.4: Dynamic Telemetry & Diagnostic Tracing Configuration
  - [ ] T70.4.1: Expose GET /api/diagnostics/config and PUT /api/diagnostics/config in CacophonyHttpServer to toggle debug tracing (DEBUG_TASK_PIPELINE) at runtime without restarting daemon. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: /api/diagnostics/config] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T70.4.2: Add task-level retry button and debug inspector in frontend TaskDetailModalComponent showing pre-scrubbed LLM output, scrubber diffs, and test runner stderr. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: debug-diagnostics-panel] [Test: npm test]
  - [ ] T70.4.3: Implement rolling eviction of .cacophony/diagnostics/ keeping maximum 100 recent failed task diagnostic dumps to prevent disk bloat. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: cleanOldDiagnostics] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T70.4.4: Write unit and frontend tests validating dynamic diagnostic toggling and failure post-mortem rendering. [File: packages/engine/src/tests/diagnostics_config.test.ts] [Test: npm test -- packages/engine/src/tests/diagnostics_config.test.ts]

---

## Phase 71: Dataset Schema Versioning & Pluggable Compute / Inference Profiles
*RDF Category: orchestration*

### T71.1: Dataset Schema Versioning & Data Directory Compatibility Migration
  - [ ] T71.1.1: Implement dataset migration utility in packages/engine/src/optimization/DatasetVersionMigrator.ts upgrading legacy v1.0.0 arena data directories to v2.0.0 by generating ArenaDatasetManifest and standardizing task record schemas. [File: packages/engine/src/optimization/DatasetVersionMigrator.ts] [Class: DatasetVersionMigrator] [Test: npm test -- packages/engine/src/tests/historical_arena_optimization.test.ts]
  - [ ] T71.1.2: Enforce version compatibility checks in HistoricalArenaIngestionAdapter rejecting unsupported future versions and providing informative error diagnostics. [File: packages/engine/src/optimization/HistoricalArenaIngestionAdapter.ts] [Method: assertCompatibleVersion] [Test: npm test -- packages/engine/src/tests/historical_arena_optimization.test.ts]
  - [ ] T71.1.3: Add CLI subcommand cacophony dataset migrate --dir=<path> to execute non-destructive inplace schema migrations for historical datasets. [File: packages/engine/src/cli/datasetCommand.ts] [Function: runDatasetMigrateCommand] [Test: npm test -- packages/engine/src/tests/dataset_cli.test.ts]

### T71.2: Pluggable Compute Hardware & Inference Provider Profiles
  - [ ] T71.2.1: Implement abstract ComputeHardwareProfile interface accommodating discrete GPUs, TPUs, APUs, and pure CPU scheduling profiles. [File: packages/engine/src/hardware/ComputeHardwareProfile.ts] [Interface: ComputeHardwareProfile] [Test: npm test -- packages/engine/src/tests/hardware_profiles.test.ts]
  - [ ] T71.2.2: Add generic OpenAI-compatible HTTP inference provider alongside native Ollama adapter to support arbitrary OpenAI-compatible server endpoints. [File: packages/engine/src/inference/OpenAICompatibleInferenceProvider.ts] [Class: OpenAICompatibleInferenceProvider] [Test: npm test -- packages/engine/src/tests/openai_inference_provider.test.ts]
  - [ ] T71.2.3: Wire dynamic provider configuration via environment variables and settings (INFERENCE_PROVIDER=ollama|openai_compatible, INFERENCE_BASE_URL, INFERENCE_API_KEY). [File: packages/engine/src/inference/InferenceProviderFactory.ts] [Class: InferenceProviderFactory] [Test: npm test -- packages/engine/src/tests/inference_factory.test.ts]

### T71.3: Visual Showcase Mock Mode & Synthetic Token Streaming Engine
  - [x] T71.3.1: Implement MockInferenceStreamProvider emitting synthetic typed code streams with realistic token-per-second cadence and variable chunk sizes without requiring local GPU or Ollama daemon. [File: packages/engine/src/inference/MockInferenceStreamProvider.ts] [Class: MockInferenceStreamProvider] [Test: npm test -- packages/engine/src/tests/mock_inference_stream.test.ts]
  - [x] T71.3.2: Add DEMO_MODE=true environment toggle to CacophonyHttpServer and FallbackTelemetryProvider to serve pre-seeded animated tasks, live simulated hardware gauges, and autonomous stage transitions for public web showcase hosting (e.g. Heroku, Render, Fly.io). [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: configureDemoMode] [Test: npm test -- packages/engine/src/tests/demo_mode.test.ts]
  - [x] T71.3.3: Provide heroku.yml and container deployment recipe in docs/deployment_showcase.md documenting how to host the zero-hardware interactive visual showcase for online viewers. [File: docs/deployment_showcase.md] [Section: Public Demonstration Hosting] [Test: npm test]

### T71.4: Model Name Consistency, Fleet Distribution & 25-Item UI Pagination
  - [x] T71.4.1: Synchronize simulated resident model telemetry dynamically with dispatched task model to ensure consistent reporting across dashboard, telemetry badge, and execution history. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: CacophonyDaemon.executeTask] [Test: npm test]
  - [x] T71.4.2: Distribute backlog and replenishment across diverse fleet models (qwen2.5-coder:7b, deepseek-r1:8b, gemma3:4b-it-qat, qwen2.5-coder:3b) to prevent monotony while ensuring strict mock isolation under DEMO_MODE. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: CacophonyDaemon.start] [Test: npm test]
  - [x] T71.4.3: Update GanttTransportComponent timeline header and track label to render the exact executing model identifier. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.ts] [Class: GanttTransportComponent] [Test: npm test]
  - [x] T71.4.4: Implement 25-item responsive pagination across QueueManagerComponent, TaskHistoryComponent, and ModelsViewComponent. [File: packages/frontend/src/app/components/queue-manager/queue-manager.component.ts] [Test: npm test]

---

## Phase 72: Taskcade Metadata Specifiers, Granular Pipeline Hints & Agent Ingestion Protocol
*RDF Category: orchestration*

### T72.1: Markdown Metadata Tag Parser & Task Directive Schema
  - [ ] T72.1.1: Extend TaskcadeSeedLoader markdown parser to extract inline bracket metadata annotations: `[Role: ...]`, `[Model: ...]`, `[Temp: ...]`, `[MaxTokens: ...]`, `[Timeout: ...]`, `[BypassRules: ...]`, and `[Stack: ...]`. [File: packages/engine/src/scheduler/TaskcadeSeedLoader.ts] [Class: TaskcadeSeedLoader] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts]
  - [ ] T72.1.2: Define typed TaskMetadataHints interface in @cacophony/shared-types supporting fine-grained run specifications (model affinity override, temperature float, context budget, rule bypass flags, and targeted execution guardrails). [File: packages/shared-types/src/index.ts] [Interface: TaskMetadataHints] [Test: npm test -- packages/shared-types]
  - [ ] T72.1.3: Update TaskRecord and database schema to store structured metadataHints JSON payload alongside base task records. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.create] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are parsed accurately without corrupting task title or prompt instructions. [File: packages/engine/src/tests/seed_loader.test.ts] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts]

### T72.2: Dynamic Rule Scrubber Bypasses & Hyperparameter Pipeline Injection
  - [ ] T72.2.1: Wire `[BypassRules: emoji_scrubber]` directive to ScrubberPipelineEngine so specific emoji-focused tasks automatically bypass the global emoji-stripping rule while preserving all other security guardrails. [File: packages/engine/src/rules/RulePipelineEngine.ts] [Method: executePipeline] [Test: npm test -- packages/engine/src/tests/rule_pipeline.test.ts]
  - [ ] T72.2.2: Bind `[Temp: ...]` and `[MaxTokens: ...]` task hints directly into AutonomousWorkerPipeline inference requests passed to OllamaProvider, allowing fine-grained creative temperature or strict deterministic zero-temp execution per task. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T72.2.3: Allow explicit model pinning via `[Model: qwen2.5-coder:7b-instruct-q4_K_M]` to guarantee execution by the target model without Bayesian exploration demotion or random substitution. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: tick] [Test: npm test -- packages/engine/src/tests/scheduler_affinity.test.ts]
  - [ ] T72.2.4: Write integration tests verifying that tasks with rule bypasses execute through the scrubber and preserve intended task-specific constructs. [File: packages/engine/src/tests/rule_bypass_integration.test.ts] [Test: npm test -- packages/engine/src/tests/rule_bypass_integration.test.ts]

### T72.3: Agent MCP Tool & REST API Ingestion Exposure
  - [ ] T72.3.1: Create EnqueueTaskcadeTaskTool in packages/tools/src/implementations/ exposing a typed MCP tool for frontier agents to parse markdown tasks and inject custom metadata specifiers directly into the engine queue. [File: packages/tools/src/implementations/EnqueueTaskcadeTaskTool.ts] [Class: EnqueueTaskcadeTaskTool] [Test: npm test -- packages/tools/dist/tests/*.test.js]
  - [ ] T72.3.2: Extend POST /api/tasks REST endpoint to validate and accept full metadataHints object (role, model, temperature, bypassRules, customDirectives). [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T72.3.3: Document markdown task metadata syntax and hint conventions in docs/taskcade_metadata_spec.md for human developers and autonomous groomer agents. [File: docs/taskcade_metadata_spec.md] [Section: Specification Syntax] [Test: npm test]
  - [ ] T72.3.4: Write unit tests verifying that agents calling the MCP tool successfully register tasks with all metadata specifiers preserved. [File: packages/tools/src/tests/EnqueueTaskcadeTaskTool.test.ts] [Test: npm test -- packages/tools/dist/tests/*.test.js]

---

## Phase 73: Task Runtime Metrics, Model Velocity Tracking & History Efficiency View
*RDF Category: telemetry*
*Note: Preserves MockInferenceStreamProvider and FallbackTelemetryProvider for demo/showcase mode. Model-calibrated pacing rates (3B=54, 4B=38, 7B=28, 8B=16 tok/s) ensure meaningful leaderboard differentiation without hardware.*

### T73.1: Database Schema & Repository: duration_ms and tokens_per_sec Columns
  - [x] T73.1.1: Author migration 012_task_runtime_metrics.ts adding duration_ms INTEGER DEFAULT 0 and tokens_per_sec REAL DEFAULT 0.0 columns to tasks table via IF NOT EXISTS guards. [File: packages/db/src/migrations/012_task_runtime_metrics.ts] [Test: npm test -- packages/db]
  - [x] T73.1.2: Register migration012 in MigrationRegistry in correct chronological slot after migration011. [File: packages/db/src/migrations/MigrationRegistry.ts] [Test: npm test -- packages/db]
  - [x] T73.1.3: Extend TaskRecord in @cacophony/shared-types with optional readonly durationMs and tokensPerSec fields with full JSDoc documentation. [File: packages/shared-types/src/task.ts] [Test: npm test -- packages/shared-types]
  - [x] T73.1.4: Update TaskRepository.updateStatus to accept durationMs and tokensPerSec optional parameters and persist them in a single conditional UPDATE; update mapRow to read both columns with exactOptionalPropertyTypes-safe spread pattern. [File: packages/db/src/repositories/TaskRepository.ts] [Test: npm test -- packages/db]

### T73.2: Engine Execution: Real Token Velocity Measurement & Propagation
  - [x] T73.2.1: Update MockInferenceStreamProvider to implement getTokensPerSecondForModel() deriving per-model-family realistic velocities (3B: 54, 4B: 38, 7B: 28, 8B: 16 tok/s) keyed from model name substring. [File: packages/engine/src/inference/MockInferenceStreamProvider.ts] [Test: npm test -- packages/engine]
  - [x] T73.2.2: Update AutonomousWorkerPipeline.executeTask return type from Promise<boolean> to Promise<{ success: boolean; tokensPerSec: number }> and capture parseResult.tokensPerSec into measuredTps after generation stage. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T73.2.3: Update TaskExecutionHandler type in TaskScheduler to Promise<TaskExecutionResult> and thread actualTps into taskRepo.updateStatus and evictionManager.recordRunOutcome; remove hardcoded 30.0 tok/s. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Test: npm test -- packages/engine]
  - [x] T73.2.4: Remove hardcoded 35.0 tok/s fallback from CacophonyHttpServer /api/models/leaderboard endpoint; pass p.avgTokensPerSec || 0.0 for honest zero-value display. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Test: curl http://localhost:24072/api/models/leaderboard]

### T73.3: Frontend History View: Runtime & Velocity Columns
  - [x] T73.3.1: Add tokensPerSec to HistoryItem interface and update HistoryMetricsService API payload type to include createdAt, durationMs, tokensPerSec; replace durationMs:3500 dummy with real stored value plus timestamp-delta fallback for pre-migration records. [File: packages/frontend/src/app/services/history-metrics.service.ts] [Test: npm test]
  - [x] T73.3.2: Add Runtime and Velocity table columns to task-history.component with formatDuration helper (ms/s/m+s display), and conditional tok/s cell showing '--' when no data is present. [File: packages/frontend/src/app/components/task-history/task-history.component.ts] [Test: npm test]
  - [x] T73.3.3: Add formatDuration method to models-view.component replacing raw {{ task.durationMs }}ms display with clean time strings; remove 35.0 fallback from selectedModelHwm computed. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Test: npm test]
  - [x] T73.3.4: Fix test assertions in autonomous_continuous_arena.test.ts and stage_telemetry.test.ts to check result.success instead of direct boolean equality after executeTask return type change. [File: packages/engine/src/tests/autonomous_continuous_arena.test.ts, packages/engine/src/tests/stage_telemetry.test.ts] [Test: npm test -- packages/engine]


---

## Phase 74: Security Hardening, Operational Resilience & Infrastructure Mitigations
*RDF Category: security*
*Source: Operations evaluation conducted 2026-09-28. See operations_evaluation.md for full analysis.*

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
  - [ ] T74.8.4: Replace `: any` mock types in GitWorktreeAndWebhook.test.ts and Inference.test.ts. [File: packages/engine/src/gitea/__tests__/GitWorktreeAndWebhook.test.ts] [Test: npm test]

---

## Phase 75: Dynamic Ollama Model Lifecycle Management & Multi-Tenant Hardware Adaptation
*RDF Category: hardware*
*Priority: SPRINT PRIORITY 1*

### T75.1: Ollama Model Client & Lifecycle Controller
  - [x] T75.1.1: Create OllamaModelManager in packages/engine/src/inference/OllamaModelManager.ts implementing listInstalledModels() querying Ollama GET /api/tags and mapping sizes, digests, and modified timestamps. [File: packages/engine/src/inference/OllamaModelManager.ts] [Class: OllamaModelManager] [Test: npm test -- packages/engine/src/tests/ollama_model_manager.test.ts]
  - [x] T75.1.2: Implement pullModel(modelName: string, onProgress: (event: OllamaPullProgressEvent) => void) in OllamaModelManager parsing ndjson streaming chunks from Ollama POST /api/pull. [File: packages/engine/src/inference/OllamaModelManager.ts] [Method: pullModel] [Test: npm test -- packages/engine/src/tests/ollama_model_manager.test.ts]
  - [x] T75.1.3: Implement deleteModel(modelName: string) in OllamaModelManager issuing DELETE /api/delete with JSON body { model: modelName } and verifying eviction. [File: packages/engine/src/inference/OllamaModelManager.ts] [Method: deleteModel] [Test: npm test -- packages/engine/src/tests/ollama_model_manager.test.ts]
  - [x] T75.1.4: Implement showModelInfo(modelName: string) in OllamaModelManager querying POST /api/show to extract parameter_size, quantization_level, and architecture family. [File: packages/engine/src/inference/OllamaModelManager.ts] [Method: showModelInfo] [Test: npm test -- packages/engine/src/tests/ollama_model_manager.test.ts]
  - [x] T75.1.5: Write unit tests with mocked fetch verifying listInstalledModels, pullModel progress demuxing, deleteModel, and showModelInfo. [File: packages/engine/src/tests/ollama_model_manager.test.ts] [Test: npm test -- packages/engine/src/tests/ollama_model_manager.test.ts]

### T75.2: Multi-Tenant Model Protection & Tenancy Guardrail Engine
  - [x] T75.2.1: Define ModelManagementConfig in packages/shared-types/src/config.ts with managedModelsEnabled, protectedModels whitelist, maxDiskStorageGb, autoEvictionEnabled, minimumSuccessRateThreshold, and maxConsecutiveFailuresBeforeEviction. [File: packages/shared-types/src/config.ts] [Interface: ModelManagementConfig] [Test: npm test -- packages/shared-types]
  - [x] T75.2.2: Implement ModelTenancyGuard in packages/engine/src/scheduler/ModelTenancyGuard.ts verifying whether a model tag matches protectedModels wildcard patterns before any deletion is permitted. [File: packages/engine/src/scheduler/ModelTenancyGuard.ts] [Class: ModelTenancyGuard] [Test: npm test -- packages/engine/src/tests/model_tenancy_guard.test.ts]
  - [x] T75.2.3: Add disk capacity evaluation in ModelTenancyGuard checking available host disk space via statfs before initiating model download to prevent disk exhaustion. [File: packages/engine/src/scheduler/ModelTenancyGuard.ts] [Method: checkDiskHeadroom] [Test: npm test -- packages/engine/src/tests/model_tenancy_guard.test.ts]
  - [x] T75.2.4: Write unit tests verifying that protected models are strictly rejected from eviction calls and that disk quota limits reject excessive downloads. [File: packages/engine/src/tests/model_tenancy_guard.test.ts] [Test: npm test -- packages/engine/src/tests/model_tenancy_guard.test.ts]

### T75.3: Automated Hardware-Model Benchmark & Eviction Governor
  - [x] T75.3.1: Implement ModelBenchmarkRunner in packages/engine/src/scheduler/ModelBenchmarkRunner.ts executing a fixed synthetic prompt and evaluating syntax correctness, tokens/sec, and latency. [File: packages/engine/src/scheduler/ModelBenchmarkRunner.ts] [Class: ModelBenchmarkRunner] [Test: npm test -- packages/engine/src/tests/model_benchmark_runner.test.ts]
  - [x] T75.3.2: Connect ModelBenchmarkRunner results to ModelHealthRepository to seed initial success rates and velocity metrics for newly downloaded models. [File: packages/engine/src/scheduler/ModelBenchmarkRunner.ts] [Method: recordBenchmark] [Test: npm test -- packages/engine/src/tests/model_benchmark_runner.test.ts]
  - [x] T75.3.3: Update ModelEvictionManager in packages/engine/src/scheduler/ModelEvictionManager.ts to check ModelTenancyGuard and invoke OllamaModelManager.deleteModel when autoEvictionEnabled is true and consecutive failures reach threshold. [File: packages/engine/src/scheduler/ModelEvictionManager.ts] [Method: evaluateModelEviction] [Test: npm test -- packages/engine/src/tests/model_eviction_manager.test.ts]
  - [x] T75.3.4: Write unit tests validating that degraded non-protected models are automatically deleted while protected models remain intact and marked degraded. [File: packages/engine/src/tests/model_eviction_manager.test.ts] [Test: npm test -- packages/engine/src/tests/model_eviction_manager.test.ts]

### T75.4: Model Management HTTP REST Endpoints & SSE Streaming
  - [x] T75.4.1: Add GET /api/models/installed route in CacophonyHttpServer returning installed models annotated with protected tenancy status and VRAM residency. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/models/installed] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]
  - [x] T75.4.2: Add POST /api/models/pull route streaming Ollama pull progress events over SSE event channel 'model_pull_progress'. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/models/pull] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]
  - [x] T75.4.3: Add DELETE /api/models/:modelId route validating tenancy rules through ModelTenancyGuard and deleting model via OllamaModelManager. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: DELETE /api/models/:modelId] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]
  - [x] T75.4.4: Add GET and PUT /api/models/config routes reading and updating runtime ModelManagementConfig in memory and persisting to conf/cacophony.json. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: /api/models/config] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]
  - [x] T75.4.5: Add POST /api/models/benchmark route triggering ModelBenchmarkRunner on specified model tag and returning empirical metrics. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/models/benchmark] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]
  - [x] T75.4.6: Write unit tests covering all model management REST endpoints, verifying permission guards and error handling for invalid models. [File: packages/engine/src/tests/models_http_api.test.ts] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]

---

## Phase 76: Frontend Model Fleet Manager, Download Terminal & Tenancy Controls
*RDF Category: frontend*
*Priority: SPRINT PRIORITY 2*

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

## Phase 77: Reasoning Model `<think>` Stream Separation, Distillation & Opinion Synthesis
*RDF Category: inference*
*Priority: SPRINT PRIORITY 3*

### T77.1: Real-Time Cognitive Stream Token Demuxer
  - [x] T77.1.1: Create ReasoningStreamDemuxer in packages/engine/src/inference/ReasoningStreamDemuxer.ts statefully scanning streaming token deltas for <think> and </think> boundaries. [File: packages/engine/src/inference/ReasoningStreamDemuxer.ts] [Class: ReasoningStreamDemuxer] [Test: npm test -- packages/engine/src/tests/reasoning_stream_demuxer.test.ts]
  - [x] T77.1.2: Wire ReasoningStreamDemuxer into StreamTapManager emitting dual SSE events: 'reasoning_chunk' for cognitive trace and 'code_chunk' for generated artifacts. [File: packages/engine/src/telemetry/StreamTapManager.ts] [Method: handleTokenStream] [Test: npm test -- packages/engine/src/tests/stream_tap_manager.test.ts]
  - [x] T77.1.3: Measure intra-reasoning token velocity and duration separately from code generation velocity in AutonomousWorkerPipeline. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeGenerationStage] [Test: npm test -- packages/engine/src/tests/stage_telemetry.test.ts]
  - [x] T77.1.4: Write unit tests verifying that code fences inside thinking tags are not prematurely parsed as executable code and that the demuxer handles split tag boundaries across chunks. [File: packages/engine/src/tests/reasoning_stream_demuxer.test.ts] [Test: npm test -- packages/engine/src/tests/reasoning_stream_demuxer.test.ts]
  - [x] T77.1.5: Guard against orphan </think> tags in ReasoningStreamDemuxer, AdaptiveOutputFormatter, and SelfHealingParser, and ensure prompt directives in AdaptiveOutputFormatter only instruct reasoning models on </think> blocks. [File: packages/engine/src/inference/AdaptiveOutputFormatter.ts] [Class: AdaptiveOutputFormatter] [Test: npm test -- packages/engine/src/tests/reasoning_stream_demuxer.test.ts]

### T77.2: Reasoning Trace Persistence & Stage Schema Migration
  - [x] T77.2.1: Author database migration 013_reasoning_transcripts.ts adding reasoning_transcript TEXT and distilled_opinion TEXT columns to task_stages table with SQLite and Postgres cross-dialect compatibility. [File: packages/db/src/migrations/013_reasoning_transcripts.ts] [Test: npm test -- packages/db]
  - [x] T77.2.2: Update StageRecord in packages/shared-types/src/stage.ts to include optional reasoningTranscript, distilledOpinion, and thinkingDurationMs fields. [File: packages/shared-types/src/stage.ts] [Interface: StageRecord] [Test: npm test -- packages/shared-types]
  - [x] T77.2.3: Update StageRepository in packages/db/src/repositories/StageRepository.ts to persist reasoning transcripts and distilled opinions in recordStageCompletion. [File: packages/db/src/repositories/StageRepository.ts] [Method: recordStageCompletion] [Test: npm test -- packages/db]
  - [x] T77.2.4: Write integration tests verifying database migration executes cleanly on both SQLite and PGlite drivers and stores full reasoning strings. [File: packages/db/src/tests/reasoning_persistence.test.ts] [Test: npm test -- packages/db/src/tests/reasoning_persistence.test.ts]

### T77.3: Reasoning Distillation & Consensus Opinion Extractor
  - [x] T77.3.1: Create ReasoningDistillationService in packages/engine/src/inference/ReasoningDistillationService.ts taking raw <think> traces and passing them through a lightweight summarizer prompt. [File: packages/engine/src/inference/ReasoningDistillationService.ts] [Class: ReasoningDistillationService] [Test: npm test -- packages/engine/src/tests/reasoning_distillation.test.ts]
  - [x] T77.3.2: Format distilled output into typed ModelOpinionRecord containing summary, keyDecisions, identifiedRisks, and confidenceScore. [File: packages/engine/src/inference/ReasoningDistillationService.ts] [Interface: ModelOpinionRecord] [Test: npm test -- packages/engine/src/tests/reasoning_distillation.test.ts]
  - [x] T77.3.3: Expose GET /api/tasks/:id/opinion endpoint returning distilled architectural opinion and reasoning metrics for the specified task. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/tasks/:id/opinion] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T77.3.4: Write unit tests verifying that ReasoningDistillationService extracts structured decisions from messy reasoning traces and handles empty traces gracefully. [File: packages/engine/src/tests/reasoning_distillation.test.ts] [Test: npm test -- packages/engine/src/tests/reasoning_distillation.test.ts]

### T77.4: Differentiated Frontend Model Views & Archetype-Specific UI
  - [x] T77.4.1: Update TaskDetailModalComponent in packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts adding a dedicated 'Cognitive Trace' tab for reasoning models (DeepSeek R1, Qwen Thinking). [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: cognitive-trace-tab] [Test: npm test]
  - [x] T77.4.2: Render collapsible thoughts panel with live thinking velocity gauge and formatted markdown distilled opinion card. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: thoughts-panel] [Test: npm test]
  - [x] T77.4.3: Provide dense syntax diff view for direct coder models (Qwen 2.5 Coder, Gemma 3) omitting empty reasoning sections and focusing on file tree and AST mutations. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: code-diff-view] [Test: npm test]
  - [x] T77.4.4: Inject archetype-specific prompt directives in QueueGroomer instructing reasoning models to enclose analysis in <think> tags and direct coder models to output code fences immediately. [File: packages/engine/src/scheduler/QueueGroomer.ts] [Method: formatPromptForModelArchetype] [Test: npm test -- packages/engine/src/tests/queue_groomer.test.ts]

---

## Phase 78: End-to-End In-House Pull Request Lifecycle & Review Pipeline (Gitea + GitHub Compatibility)
*RDF Category: orchestration*
*Priority: SPRINT PRIORITY 4*

### T78.1: Unified Git Platform Provider Abstraction (Gitea & GitHub)
  - [x] T78.1.1: Create IGitPlatformProvider interface in packages/engine/src/gitea/IGitPlatformProvider.ts declaring createBranch, openPullRequest, submitReview, and mergePullRequest. [File: packages/engine/src/gitea/IGitPlatformProvider.ts] [Interface: IGitPlatformProvider] [Test: npm test -- packages/engine/src/tests/git_platform_provider.test.ts]
  - [x] T78.1.2: Implement GiteaPlatformProvider in packages/engine/src/gitea/GiteaPlatformProvider.ts communicating with local Gitea instance via Swagger REST API. [File: packages/engine/src/gitea/GiteaPlatformProvider.ts] [Class: GiteaPlatformProvider] [Test: npm test -- packages/engine/src/tests/git_platform_provider.test.ts]
  - [x] T78.1.3: Implement GitHubPlatformProvider in packages/engine/src/gitea/GitHubPlatformProvider.ts communicating with GitHub REST API using configured GITHUB_TOKEN. [File: packages/engine/src/gitea/GitHubPlatformProvider.ts] [Class: GitHubPlatformProvider] [Test: npm test -- packages/engine/src/tests/git_platform_provider.test.ts]
  - [x] T78.1.4: Create GitPlatformProviderFactory in packages/engine/src/gitea/GitPlatformProviderFactory.ts instantiating provider based on GIT_PLATFORM_PROVIDER environment setting (defaulting to gitea). [File: packages/engine/src/gitea/GitPlatformProviderFactory.ts] [Class: GitPlatformProviderFactory] [Test: npm test -- packages/engine/src/tests/git_platform_provider.test.ts]
  - [x] T78.1.5: Write unit tests verifying that both providers correctly format pull request payloads and handle API error responses. [File: packages/engine/src/tests/git_platform_provider.test.ts] [Test: npm test -- packages/engine/src/tests/git_platform_provider.test.ts]

### T78.2: Ephemeral Git Worktree Isolation per Task Execution
  - [x] T78.2.1: Enhance GitWorktreeManager in packages/engine/src/gitea/GitWorktreeManager.ts to create isolated worktrees at workspaces/worktree-<taskId> on ephemeral branch task/<priority>-<taskId>. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: createWorktree] [Test: npm test -- packages/engine/src/tests/git_worktree_isolation.test.ts]
  - [x] T78.2.2: Ensure AutonomousWorkerPipeline executes file modifications, scrubbing, and test commands strictly inside the isolated worktree directory without modifying the main repository checkout. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T78.2.3: Implement cleanWorktree(taskId: string) in GitWorktreeManager safely removing the ephemeral directory and pruning the git worktree entry upon task completion or rollback. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: cleanWorktree] [Test: npm test -- packages/engine/src/tests/git_worktree_isolation.test.ts]
  - [x] T78.2.4: Write integration tests verifying that concurrent tasks modify separate worktrees without file conflicts and that cleanup leaves the git status clean. [File: packages/engine/src/tests/git_worktree_isolation.test.ts] [Test: npm test -- packages/engine/src/tests/git_worktree_isolation.test.ts]

### T78.3: Automated Multi-Stage Review & Merge Gate
  - [x] T78.3.1: Wire Stage 5 (Review) in AutonomousWorkerPipeline to generate a structured review checklist evaluating SOLID principles, test coverage, and security boundaries. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeReviewStage] [Test: npm test -- packages/engine/src/tests/stage_telemetry.test.ts]
  - [x] T78.3.2: Add optional Frontier Model Reviewer integration: when FRONTIER_REVIEW_API_KEY is configured, dispatch the patch diff and review prompt to the frontier model for high-rigor evaluation. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: evaluateReview] [Test: npm test -- packages/engine/src/tests/frontier_reviewer.test.ts]
  - [x] T78.3.3: Automatically open pull request via IGitPlatformProvider.openPullRequest upon passing review and submit review verdict. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: publishPullRequest] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T78.3.4: Wire Stage 6 (Merge) to merge pull request into target branch when auto-merge is configured and all verification stages pass. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeMergeStage] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]

### T78.4: Frontend PR Inspector & Review Timeline Badge
  - [x] T78.4.1: Update TaskDetailModalComponent to display Pull Request banner with clickable link (prUrl), branch name, and review status badge (APPROVED, CHANGES_REQUESTED). [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: pr-banner] [Test: npm test]
  - [x] T78.4.2: Add PR reviews tab in TaskDetailModalComponent displaying reviewer verdict, line-level comments, and SOLID compliance score. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: pr-reviews-tab] [Test: npm test]
  - [x] T78.4.3: Add PR indicator icon and branch pill to TaskInspectorComponent stage progression bar during Stage 5 and Stage 6. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Template: stage-pr-indicator] [Test: npm test]
  - [x] T78.4.4: Write frontend unit tests verifying PR badge rendering and link target formatting for both Gitea and GitHub URL patterns. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm test]

---

## Phase 79: Dynamic Model Profile Tuning, Multi-Model Cognitive Handoff & Prompt Compression
*RDF Category: optimization*
*Priority: SPRINT PRIORITY 5*

### T79.1: Whitebox Model Tuning Configuration & Profile Persistence
  - [x] T79.1.1: Author database migration `014_model_profiles.ts` creating `model_tuning_profiles` table with columns: `id`, `model_name`, `role`, `num_predict`, `num_ctx`, `temperature`, `top_k`, `top_p`, `repeat_penalty`, `auto_tuned`, `is_active`, `created_at`, `updated_at`. [File: packages/db/src/migrations/014_model_profiles.ts] [Test: npm test -- packages/db]
  - [x] T79.1.2: Implement `ModelProfileRepository` in `packages/db/src/repositories/ModelProfileRepository.ts` with methods to fetch active profile by model/role, upsert custom profiles, and query auto-tuning metrics. [File: packages/db/src/repositories/ModelProfileRepository.ts] [Class: ModelProfileRepository] [Test: npm test -- packages/db]
  - [x] T79.1.3: Expose REST API routes `GET /api/models/profiles`, `PUT /api/models/profiles/:id`, and `POST /api/models/profiles/auto-tune` in `CacophonyHttpServer.ts`. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T79.1.4: Update `OllamaProvider.ts` to dynamically resolve model options (`num_predict`, `num_ctx`, `temperature`) from the matched active tuning profile before falling back to environment defaults. [File: packages/engine/src/inference/OllamaProvider.ts] [Method: resolveModelOptions] [Test: npm test -- packages/engine/src/tests/model_tuning.test.ts]

### T79.2: Multi-Model Cognitive Handoff (Architect Reasoner to Implementer Coder)
  - [x] T79.2.1: Implement `CognitiveHandoffCoordinator` in `packages/engine/src/inference/CognitiveHandoffCoordinator.ts` extracting cognitive `<think>` trace from architect models and formatting as actionable implementation briefs. [File: packages/engine/src/inference/CognitiveHandoffCoordinator.ts] [Class: CognitiveHandoffCoordinator] [Test: npm test -- packages/engine/src/tests/cognitive_handoff.test.ts]
  - [x] T79.2.2: Wire `AutonomousWorkerPipeline` multi-model execution path: when architect model (DeepSeek R1) completes thinking without full code output, immediately hand off the distilled plan to the configured implementer model (Qwen 2.5 Coder) without failing the task. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeGenerationStage] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T79.2.3: Persist handoff chain telemetry in `task_stages` recording primary reasoner model, secondary coder model, and token transfer counts. [File: packages/db/src/repositories/StageRepository.ts] [Test: npm test -- packages/db]
  - [x] T79.2.4: Write unit tests verifying that truncated reasoning outputs trigger graceful handoff rather than burning retries. [File: packages/engine/src/tests/cognitive_handoff.test.ts] [Test: npm test -- packages/engine/src/tests/cognitive_handoff.test.ts]

### T79.3: Prompt Compression & Context Token Budget Maximizer
  - [x] T79.3.1: Create `PromptCompressor` in `packages/engine/src/inference/PromptCompressor.ts` stripping redundant comment blocks, collapsing whitespace, and omitting unreferenced interface declarations. [File: packages/engine/src/inference/PromptCompressor.ts] [Class: PromptCompressor] [Test: npm test -- packages/engine/src/tests/prompt_compression.test.ts]
  - [x] T79.3.2: Integrate `PromptCompressor` into `ContextMinimizer.ts` reporting measured compression ratio and token savings in `ContextBundle.tokenSavingsEstimate`. [File: packages/engine/src/inference/ContextMinimizer.ts] [Method: assembleContext] [Test: npm test -- packages/engine/src/tests/context_minimizer.test.ts]
  - [x] T79.3.3: Implement intelligent fallback compression triggers when prompt tokens exceed 75% of active `num_ctx`. [File: packages/engine/src/inference/ContextMinimizer.ts] [Test: npm test -- packages/engine/src/tests/context_minimizer.test.ts]
  - [x] T79.3.4: Write unit tests verifying AST-level semantic preservation during prompt compression. [File: packages/engine/src/tests/prompt_compression.test.ts] [Test: npm test -- packages/engine/src/tests/prompt_compression.test.ts]

### T79.4: Autonomous Engine Auto-Tuner & Best Profile Matcher
  - [x] T79.4.1: Build `EngineAutoTuner` in `packages/engine/src/scheduler/EngineAutoTuner.ts` analyzing historical token velocities (tok/s), stage pass rates, and truncation frequency across installed models. [File: packages/engine/src/scheduler/EngineAutoTuner.ts] [Class: EngineAutoTuner] [Test: npm test -- packages/engine/src/tests/engine_auto_tuner.test.ts]
  - [x] T79.4.2: Implement heuristic hardware profile matcher mapping available host VRAM (e.g. 16GB) to optimal `num_ctx` (16384) and `num_predict` (8192) limits per quantization level. [File: packages/engine/src/scheduler/EngineAutoTuner.ts] [Method: computeOptimalProfile] [Test: npm test -- packages/engine/src/tests/engine_auto_tuner.test.ts]
  - [x] T79.4.3: Add scheduled background job or manual button to trigger profile auto-optimization. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [x] T79.4.4: Write unit tests verifying that `EngineAutoTuner` automatically raises completion limits for models experiencing truncation. [File: packages/engine/src/tests/engine_auto_tuner.test.ts] [Test: npm test -- packages/engine/src/tests/engine_auto_tuner.test.ts]

### T79.5: Frontend Model Tuning & Profile Configuration UI
  - [x] T79.5.1: Create `ModelTuningPanelComponent` in `packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.ts` allowing operators to configure `num_predict`, `num_ctx`, temperature, and active model roles. [File: packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.ts] [Class: ModelTuningPanelComponent] [Test: npm test]
  - [x] T79.5.2: Add 'Auto-Tune Profiles' action button triggering `POST /api/models/profiles/auto-tune` with toast feedback and visual diff of adjusted parameters. [File: packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.ts] [Test: npm test]
  - [x] T79.5.3: Integrate tuning controls into `/models` route alongside installed fleet and download terminal. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Test: npm test]
  - [x] T79.5.4: Write frontend unit tests validating form inputs, dirty state tracking, and profile update payload dispatch. [File: packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.spec.ts] [Test: npm test]

### T79.6: Host UMA VRAM Governor & Timeout Watchdog Mitigation
  - [x] T79.6.1: Enforce AbortController cancellation on FrontierReviewer evaluateReview and cap review prompt maxTokens to 1024. [File: packages/engine/src/inference/FrontierReviewer.ts] [Class: FrontierReviewer] [Test: npm --prefix packages/engine test]
  - [x] T79.6.2: Configure EngineAutoTuner hardwareSpec for 8GB UMA APU architecture, clamp context window to OLLAMA_NUM_CTX, and disallow non-truncation failure inflation. [File: packages/engine/src/scheduler/EngineAutoTuner.ts] [Class: EngineAutoTuner] [Test: npm --prefix packages/engine test]
  - [x] T79.6.3: Implement dynamic lightweight model fallback in TaskScheduler for previously failed tasks (qwen2.5-coder:3b, gemma3:4b-it-qat). [File: packages/engine/src/scheduler/TaskScheduler.ts] [Class: TaskScheduler] [Test: npm --prefix packages/engine test]
  - [x] T79.6.4: Increase GiteaApiClient mergePullRequest retry budget to 10 attempts with arithmetic backoff to eliminate 405 async race conditions. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Class: GiteaApiClient] [Test: npm --prefix packages/engine test]

---

## Phase 80: Multi-Stage Staging (Gitea) to Production (GitHub) Release Gate & Batched Promotion Pipeline
*RDF Category: devops_orchestration*

### T80.1: Monorepo Compilation & Clean Build Verification Gate
  - [ ] T80.1.1: Create `MonorepoBuildGate` in `packages/engine/src/gitea/MonorepoBuildGate.ts` executing `npm run build` across all packages in isolated worktrees. [File: packages/engine/src/gitea/MonorepoBuildGate.ts] [Class: MonorepoBuildGate] [Test: npm test -- packages/engine/src/tests/monorepo_build_gate.test.ts]
  - [ ] T80.1.2: Capture standard error and compiler diagnostic codes (e.g. TS2304, TS2305, NG2008), rejecting broken commits before staging promotion. [File: packages/engine/src/gitea/MonorepoBuildGate.ts] [Method: verifyBuild] [Test: npm test -- packages/engine/src/tests/monorepo_build_gate.test.ts]
  - [ ] T80.1.3: Wire build verification into `AutonomousWorkerPipeline` Stage 6 preventing broken tasks from merging into Gitea `main`. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executePrReviewStage] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T80.1.4: Write unit tests verifying that build failures abort PR creation and trigger remediation feedback. [File: packages/engine/src/tests/monorepo_build_gate.test.ts] [Test: npm test -- packages/engine/src/tests/monorepo_build_gate.test.ts]

### T80.2: Secret Leak & Deterministic Hygiene Scanner
  - [ ] T80.2.1: Implement `PromotionSanitizer` in `packages/engine/src/gitea/PromotionSanitizer.ts` scanning git diffs for API keys, tokens, and private keys. [File: packages/engine/src/gitea/PromotionSanitizer.ts] [Class: PromotionSanitizer] [Test: npm test -- packages/engine/src/tests/promotion_sanitizer.test.ts]
  - [ ] T80.2.2: Scan git diffs for prohibited unicode emojis or dingbats per project rules, rejecting dirty diffs prior to upstream promotion. [File: packages/engine/src/gitea/PromotionSanitizer.ts] [Method: scanEmojis] [Test: npm test -- packages/engine/src/tests/promotion_sanitizer.test.ts]
  - [ ] T80.2.3: Check for banned imports (`acorn`, `eventsource`, etc.) and ensure no loose root files outside permitted list. [File: packages/engine/src/gitea/PromotionSanitizer.ts] [Method: scanHygiene] [Test: npm test -- packages/engine/src/tests/promotion_sanitizer.test.ts]
  - [ ] T80.2.4: Write unit tests verifying sanitizer detects simulated leaked secrets and unicode emojis. [File: packages/engine/src/tests/promotion_sanitizer.test.ts] [Test: npm test -- packages/engine/src/tests/promotion_sanitizer.test.ts]

### T80.3: Milestone Release Bundler & Changelog Generator
  - [ ] T80.3.1: Create `ReleaseBundlerService` in `packages/engine/src/gitea/ReleaseBundlerService.ts` bundling closed Gitea staging tasks into a unified release. [File: packages/engine/src/gitea/ReleaseBundlerService.ts] [Class: ReleaseBundlerService] [Test: npm test -- packages/engine/src/tests/release_bundler.test.ts]
  - [ ] T80.3.2: Generate structured markdown changelogs categorizing features, bug fixes, refactors, and test coverage metrics. [File: packages/engine/src/gitea/ReleaseBundlerService.ts] [Method: generateChangelog] [Test: npm test -- packages/engine/src/tests/release_bundler.test.ts]
  - [ ] T80.3.3: Implement semantic version bump (`major`, `minor`, `patch`) based on task metadata and breaking change annotations. [File: packages/engine/src/gitea/ReleaseBundlerService.ts] [Method: computeNextVersion] [Test: npm test -- packages/engine/src/tests/release_bundler.test.ts]
  - [ ] T80.3.4: Write unit tests verifying changelog formatting and clean release bundle aggregation across multiple tasks. [File: packages/engine/src/tests/release_bundler.test.ts] [Test: npm test -- packages/engine/src/tests/release_bundler.test.ts]

### T80.4: GitHub API Platform Provider & Pull Request Promotion
  - [ ] T80.4.1: Extend `GitHubPlatformProvider` in `packages/engine/src/gitea/GitHubPlatformProvider.ts` to support authenticated push and PR creation to public upstream. [File: packages/engine/src/gitea/GitHubPlatformProvider.ts] [Class: GitHubPlatformProvider] [Test: npm test -- packages/engine/src/tests/github_platform_provider.test.ts]
  - [ ] T80.4.2: Implement `promoteMilestoneToGitHub(releaseBranch: string, milestoneTitle: string, changelog: string)` pushing verified release branches to GitHub. [File: packages/engine/src/gitea/GitHubPromotionPipeline.ts] [Method: promoteMilestoneToGitHub] [Test: npm test -- packages/engine/src/tests/github_promotion.test.ts]
  - [ ] T80.4.3: Open a single, cohesive Pull Request on GitHub against `main` containing the full milestone body of work and test verification badge. [File: packages/engine/src/gitea/GitHubPromotionPipeline.ts] [Test: npm test -- packages/engine/src/tests/github_promotion.test.ts]
  - [ ] T80.4.4: Write unit tests simulating GitHub promotion with mock Octokit/REST API responses. [File: packages/engine/src/tests/github_promotion.test.ts] [Test: npm test -- packages/engine/src/tests/github_promotion.test.ts]

### T80.5: Automated Promotion CLI & REST API
  - [ ] T80.5.1: Expose `POST /api/promotion/release` in `CacophonyHttpServer.ts` triggering the quarantine gauntlet and staging promotion. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/promotion/release] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T80.5.2: Expose `GET /api/promotion/status` returning current staging vs upstream GitHub divergence and pending release candidates. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/promotion/status] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T80.5.3: Add CLI command `bin/cacophony promote [--dry-run] [--target=github]` to trigger automated verification and upstream release. [File: bin/cacophony.ts] [Subcommand: promote] [Test: node bin/cacophony.ts promote --dry-run]
  - [ ] T80.5.4: Write integration tests verifying REST API and CLI endpoints validate build and test gates before pushing. [File: packages/engine/src/tests/promotion_api.test.ts] [Test: npm test -- packages/engine/src/tests/promotion_api.test.ts]

---

## Phase 81: Autonomous Project File Ingestion, Architectural Decomposer & Acceptance Criteria Engine
*RDF Category: architectural_synthesis*

### T81.1: Spec & Project Document Ingestion Engine
  - [ ] T81.1.1: Create `ProjectSpecIngestionService` in `packages/engine/src/inference/ProjectSpecIngestionService.ts` reading dropped specification files (`docs/spec.md`, `README.md`, OpenAPI JSON). [File: packages/engine/src/inference/ProjectSpecIngestionService.ts] [Class: ProjectSpecIngestionService] [Test: npm test -- packages/engine/src/tests/spec_ingestion.test.ts]
  - [ ] T81.1.2: Parse markdown headings, bulleted requirement lists, and API endpoint definitions into structured `RequirementNode` objects. [File: packages/engine/src/inference/ProjectSpecIngestionService.ts] [Method: parseRequirements] [Test: npm test -- packages/engine/src/tests/spec_ingestion.test.ts]
  - [ ] T81.1.3: Extract explicit technical constraints (languages, frameworks, database drivers, coding rules) from ingested documents. [File: packages/engine/src/inference/ProjectSpecIngestionService.ts] [Method: extractConstraints] [Test: npm test -- packages/engine/src/tests/spec_ingestion.test.ts]
  - [ ] T81.1.4: Write unit tests verifying parser extracts functional and non-functional requirements from diverse document formats. [File: packages/engine/src/tests/spec_ingestion.test.ts] [Test: npm test -- packages/engine/src/tests/spec_ingestion.test.ts]

### T81.2: Structured Acceptance Criteria Derivation Engine
  - [ ] T81.2.1: Implement `AcceptanceCriteriaEngine` in `packages/engine/src/inference/AcceptanceCriteriaEngine.ts` utilizing high-reasoning models to formulate testable criteria. [File: packages/engine/src/inference/AcceptanceCriteriaEngine.ts] [Class: AcceptanceCriteriaEngine] [Test: npm test -- packages/engine/src/tests/acceptance_criteria.test.ts]
  - [ ] T81.2.2: Convert ambiguous user directives into explicit Given/When/Then scenarios with expected HTTP status codes, error models, and return shapes. [File: packages/engine/src/inference/AcceptanceCriteriaEngine.ts] [Method: deriveCriteria] [Test: npm test -- packages/engine/src/tests/acceptance_criteria.test.ts]
  - [ ] T81.2.3: Generate concrete test assertion templates (native `node:test` and `node:assert/strict` for backend, Angular component spec for frontend). [File: packages/engine/src/inference/AcceptanceCriteriaEngine.ts] [Method: generateTestTemplate] [Test: npm test -- packages/engine/src/tests/acceptance_criteria.test.ts]
  - [ ] T81.2.4: Write unit tests verifying that acceptance criteria strictly adhere to SOLID principles and mobile-first rules. [File: packages/engine/src/tests/acceptance_criteria.test.ts] [Test: npm test -- packages/engine/src/tests/acceptance_criteria.test.ts]

### T81.3: Architectural Contract & Type Schema Generator
  - [ ] T81.3.1: Create `ContractSynthesizer` in `packages/engine/src/inference/ContractSynthesizer.ts` defining TypeScript interfaces and Zod validation schemas. [File: packages/engine/src/inference/ContractSynthesizer.ts] [Class: ContractSynthesizer] [Test: npm test -- packages/engine/src/tests/contract_synthesizer.test.ts]
  - [ ] T81.3.2: Synthesize database migration definitions with primary keys, indexes, foreign keys, and dialect-agnostic column types. [File: packages/engine/src/inference/ContractSynthesizer.ts] [Method: synthesizeMigration] [Test: npm test -- packages/engine/src/tests/contract_synthesizer.test.ts]
  - [ ] T81.3.3: Verify synthesized schemas against existing project types to prevent namespace collisions and circular references. [File: packages/engine/src/inference/ContractSynthesizer.ts] [Method: validateAgainstWorkspace] [Test: npm test -- packages/engine/src/tests/contract_synthesizer.test.ts]
  - [ ] T81.3.4: Write unit tests verifying generated contracts compile cleanly with `tsc`. [File: packages/engine/src/tests/contract_synthesizer.test.ts] [Test: npm test -- packages/engine/src/tests/contract_synthesizer.test.ts]

### T81.4: Topological Dependency Graph Task Sequencer
  - [ ] T81.4.1: Build `DependencyGraphSequencer` in `packages/engine/src/inference/DependencyGraphSequencer.ts` arranging decomposed tasks in dependency order. [File: packages/engine/src/inference/DependencyGraphSequencer.ts] [Class: DependencyGraphSequencer] [Test: npm test -- packages/engine/src/tests/dependency_sequencer.test.ts]
  - [ ] T81.4.2: Enforce architectural sequencing: Shared Types & Migrations -> Repositories -> Services -> HTTP Routes -> UI Components -> E2E Tests. [File: packages/engine/src/inference/DependencyGraphSequencer.ts] [Method: sequenceTasks] [Test: npm test -- packages/engine/src/tests/dependency_sequencer.test.ts]
  - [ ] T81.4.3: Detect and break circular task dependencies by splitting interfaces from concrete implementations. [File: packages/engine/src/inference/DependencyGraphSequencer.ts] [Method: resolveCircularDependencies] [Test: npm test -- packages/engine/src/tests/dependency_sequencer.test.ts]
  - [ ] T81.4.4: Write unit tests validating topological sort ordering for complex multi-module feature epics. [File: packages/engine/src/tests/dependency_sequencer.test.ts] [Test: npm test -- packages/engine/src/tests/dependency_sequencer.test.ts]

### T81.5: REST API & Drop-In Ingestion CLI
  - [ ] T81.5.1: Expose `POST /api/tasks/decompose-spec` in `CacophonyHttpServer.ts` ingesting uploaded spec files and persisting atomic tasks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks/decompose-spec] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T81.5.2: Create CLI entrypoint `bin/decompose-spec.ts` allowing operators to run `node bin/decompose-spec.ts path/to/spec.md`. [File: bin/decompose-spec.ts] [Test: node bin/decompose-spec.ts --dry-run]
  - [ ] T81.5.3: Add file-watcher daemon monitoring `docs/inbox/` for dropped project specifications and auto-decomposing them into the active queue. [File: packages/engine/src/daemon/SpecInboxWatcher.ts] [Class: SpecInboxWatcher] [Test: npm test -- packages/engine/src/tests/inbox_watcher.test.ts]
  - [ ] T81.5.4: Write integration tests verifying spec decomposition pipeline creates valid `TaskRecord` rows in database. [File: packages/engine/src/tests/spec_decomposition_pipeline.test.ts] [Test: npm test -- packages/engine/src/tests/spec_decomposition_pipeline.test.ts]

---

## Phase 82: Arena Telemetry Epoching & Clean-Slate Model Health Reset Engine
*RDF Category: empirical_metrics*

### T82.1: Database Migration `015_arena_epochs.ts`
  - [ ] T82.1.1: Author database migration `015_arena_epochs.ts` creating `arena_epochs` table (`epoch_id`, `name`, `reason`, `started_at`, `ended_at`, `is_active`, `task_count`, `success_count`, `failure_count`, `notes`). [File: packages/db/src/migrations/015_arena_epochs.ts] [Test: npm test -- packages/db]
  - [ ] T82.1.2: Create `model_health_epoch_history` table capturing point-in-time snapshots of model health profiles per epoch. [File: packages/db/src/migrations/015_arena_epochs.ts] [Table: model_health_epoch_history] [Test: npm test -- packages/db]
  - [ ] T82.1.3: Register migration in `MigrationRegistry.ts` ensuring clean execution on startup across PostgreSQL and SQLite dialects. [File: packages/db/src/migrations/MigrationRegistry.ts] [Test: npm test -- packages/db]
  - [ ] T82.1.4: Write unit tests verifying migration executes idempotently and initial baseline Epoch 1 is seeded. [File: packages/db/src/tests/arena_epoch.test.ts] [Test: npm test -- packages/db/src/tests/arena_epoch.test.ts]

### T82.2: `ModelHealthRepository` Epoch Methods
  - [ ] T82.2.1: Implement `resetAllStats()` in `ModelHealthRepository.ts` resetting `total_tasks`, `total_success`, `total_failures`, `consecutive_failures` to 0, and restoring status to `ACTIVE`. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: resetAllStats] [Test: npm test -- packages/db/src/tests/arena_epoch.test.ts]
  - [ ] T82.2.2: Implement `advanceEpoch(name: string, reason: string, notes?: string)` archiving current model metrics to history table and initializing a fresh epoch. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: advanceEpoch] [Test: npm test -- packages/db/src/tests/arena_epoch.test.ts]
  - [ ] T82.2.3: Implement `getCurrentEpoch()` and `listEpochs()` returning historical epoch records and metadata. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: getCurrentEpoch] [Test: npm test -- packages/db/src/tests/arena_epoch.test.ts]
  - [ ] T82.2.4: Write unit tests verifying that advancing an epoch un-ejects all evicted models and snapshots historical metrics cleanly. [File: packages/db/src/tests/arena_epoch.test.ts] [Test: npm test -- packages/db/src/tests/arena_epoch.test.ts]

### T82.3: REST API Routes for Epoch Management
  - [ ] T82.3.1: Expose `POST /api/models/epoch` in `CacophonyHttpServer.ts` advancing the active arena epoch and resetting model counters. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/models/epoch] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T82.3.2: Expose `POST /api/models/reset-stats` in `CacophonyHttpServer.ts` clearing dirty stats for the current epoch without advancing epoch counter. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/models/reset-stats] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T82.3.3: Expose `GET /api/arena/epochs` returning all historical epochs with their start/end dates and aggregate pass rates. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/arena/epochs] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T82.3.4: Write integration tests verifying REST API routes validate authentication and return expected JSON payloads. [File: packages/engine/src/tests/epoch_api.test.ts] [Test: npm test -- packages/engine/src/tests/epoch_api.test.ts]

### T82.4: Multi-Armed Bandit Policy State Reset on Epoch Advancement
  - [ ] T82.4.1: Connect `advanceEpoch` trigger to `BanditPolicy` resetting arms' alpha/beta parameters in Thompson Sampling to uniform priors. [File: packages/engine/src/bandit/ThompsonSamplingPolicy.ts] [Method: resetArms] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [ ] T82.4.2: Reset exploration budget in `EpsilonGreedyPolicy` to `initialEpsilon`, allowing models to be re-explored in the new epoch. [File: packages/engine/src/bandit/EpsilonGreedyPolicy.ts] [Method: resetExploration] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [ ] T82.4.3: Broadcast `arena_epoch_advanced` SSE event over `StreamTapManager` alerting all connected UI clients. [File: packages/engine/src/inference/StreamTapManager.ts] [Method: broadcastEpochAdvanced] [Test: npm test -- packages/engine/src/tests/stream_tap_manager.test.ts]
  - [ ] T82.4.4: Write unit tests verifying bandit policies cleanly re-explore candidate models following an epoch reset. [File: packages/engine/src/tests/epoch_bandit_reset.test.ts] [Test: npm test -- packages/engine/src/tests/epoch_bandit_reset.test.ts]

### T82.5: Frontend UI Epoch Selector & Reset Control on `/models`
  - [ ] T82.5.1: Add epoch selector dropdown to `ModelsViewComponent` on `/models` allowing operators to toggle between 'Current Epoch', historical epochs, and 'All Time'. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Signal: selectedEpoch] [Test: npm test]
  - [ ] T82.5.2: Add 'Start New Epoch' button in UI opening a confirmation modal to record epoch name, reason, and reset dirty metrics. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Method: openEpochModal] [Test: npm test]
  - [ ] T82.5.3: Display visual epoch badge and current epoch run count in `TelemetryBarComponent`. [File: packages/frontend/src/app/components/telemetry-bar/telemetry-bar.component.ts] [Test: npm test]
  - [ ] T82.5.4: Write frontend unit tests validating epoch dropdown filtering and epoch advancement modal lifecycle. [File: packages/frontend/src/app/components/views/models-view.component.spec.ts] [Test: npm test]

---

## Phase 83: Heterogeneous Hardware Detection, Zero-Config Hardware Profiler & Contributor Onboarding Engine
*RDF Category: hardware_telemetry*

### T83.1: Pluggable `IHardwareTelemetryProvider` Abstraction
  - [ ] T83.1.1: Define `IHardwareTelemetryProvider` interface in `packages/shared-types/src/hardware.ts` declaring vendor detection, VRAM measurement, thermal polling, and utilization metrics. [File: packages/shared-types/src/hardware.ts] [Interface: IHardwareTelemetryProvider] [Test: npm test -- packages/shared-types]
  - [ ] T83.1.2: Implement `HardwareProviderFactory` in `packages/engine/src/telemetry/HardwareProviderFactory.ts` dynamically detecting host GPU vendor (NVIDIA, AMD, Apple Silicon, Intel, CPU fallback). [File: packages/engine/src/telemetry/HardwareProviderFactory.ts] [Class: HardwareProviderFactory] [Test: npm test -- packages/engine/src/tests/hardware_factory.test.ts]
  - [ ] T83.1.3: Provide CPU fallback provider computing memory and CPU core utilization via Node.js `os` module when no accelerator is present. [File: packages/engine/src/telemetry/CpuFallbackProvider.ts] [Class: CpuFallbackProvider] [Test: npm test -- packages/engine/src/tests/hardware_factory.test.ts]
  - [ ] T83.1.4: Write unit tests verifying provider factory selects correct provider based on simulated sysfs and CLI outputs. [File: packages/engine/src/tests/hardware_factory.test.ts] [Test: npm test -- packages/engine/src/tests/hardware_factory.test.ts]

### T83.2: NVML / NVIDIA CUDA Hardware Telemetry Provider
  - [ ] T83.2.1: Implement `NvidiaNvmlProvider` in `packages/engine/src/telemetry/NvidiaNvmlProvider.ts` querying `nvidia-smi --query-gpu=... --format=csv`. [File: packages/engine/src/telemetry/NvidiaNvmlProvider.ts] [Class: NvidiaNvmlProvider] [Test: npm test -- packages/engine/src/tests/nvidia_provider.test.ts]
  - [ ] T83.2.2: Parse VRAM total/used/free, GPU temperature, power draw in Watts, and SM compute engine utilization. [File: packages/engine/src/telemetry/NvidiaNvmlProvider.ts] [Method: pollSnapshot] [Test: npm test -- packages/engine/src/tests/nvidia_provider.test.ts]
  - [ ] T83.2.3: Support multi-GPU setups reporting aggregated and per-GPU metrics. [File: packages/engine/src/telemetry/NvidiaNvmlProvider.ts] [Method: listDevices] [Test: npm test -- packages/engine/src/tests/nvidia_provider.test.ts]
  - [ ] T83.2.4: Write unit tests validating CSV parsing and error handling when `nvidia-smi` is unavailable. [File: packages/engine/src/tests/nvidia_provider.test.ts] [Test: npm test -- packages/engine/src/tests/nvidia_provider.test.ts]

### T83.3: Apple Silicon Metal / `powermetrics` Telemetry Provider
  - [ ] T83.3.1: Implement `AppleSiliconProvider` in `packages/engine/src/telemetry/AppleSiliconProvider.ts` detecting M-series chips and unified RAM. [File: packages/engine/src/telemetry/AppleSiliconProvider.ts] [Class: AppleSiliconProvider] [Test: npm test -- packages/engine/src/tests/apple_silicon_provider.test.ts]
  - [ ] T83.3.2: Measure unified memory allocations, thermal pressure states (`Nominal`, `Fair`, `Serious`, `Critical`), and GPU power. [File: packages/engine/src/telemetry/AppleSiliconProvider.ts] [Method: pollSnapshot] [Test: npm test -- packages/engine/src/tests/apple_silicon_provider.test.ts]
  - [ ] T83.3.3: Map macOS thermal pressure directly to `ThermalGovernor` backpressure thresholds to prevent thermal throttling. [File: packages/engine/src/telemetry/AppleSiliconProvider.ts] [Method: getThermalState] [Test: npm test -- packages/engine/src/tests/apple_silicon_provider.test.ts]
  - [ ] T83.3.4: Write unit tests verifying Apple Silicon telemetry parsing and thermal state mapping. [File: packages/engine/src/tests/apple_silicon_provider.test.ts] [Test: npm test -- packages/engine/src/tests/apple_silicon_provider.test.ts]

### T83.4: Dynamic Zero-Config Context & Quantization Auto-Sizer
  - [ ] T83.4.1: Build `HardwareHyperparameterAutoSizer` in `packages/engine/src/scheduler/HardwareHyperparameterAutoSizer.ts` computing optimal model profiles from hardware profile. [File: packages/engine/src/scheduler/HardwareHyperparameterAutoSizer.ts] [Class: HardwareHyperparameterAutoSizer] [Test: npm test -- packages/engine/src/tests/auto_sizer.test.ts]
  - [ ] T83.4.2: Enforce VRAM safety thresholds: allocate 70% of available VRAM to context buffers, reserving 30% for OS and framebuffers. [File: packages/engine/src/scheduler/HardwareHyperparameterAutoSizer.ts] [Method: computeSafeAllocation] [Test: npm test -- packages/engine/src/tests/auto_sizer.test.ts]
  - [ ] T83.4.3: Automatically configure Ollama environment variables (`OLLAMA_NUM_PARALLEL`, `OLLAMA_FLASH_ATTENTION`) based on detected card compute capability. [File: packages/engine/src/scheduler/HardwareHyperparameterAutoSizer.ts] [Method: generateOllamaEnv] [Test: npm test -- packages/engine/src/tests/auto_sizer.test.ts]
  - [ ] T83.4.4: Write unit tests validating hyperparameter sizing across 6GB, 8GB, 12GB, 16GB, 24GB, and 64GB hardware configurations. [File: packages/engine/src/tests/auto_sizer.test.ts] [Test: npm test -- packages/engine/src/tests/auto_sizer.test.ts]

### T83.5: Contributor Hardware Setup Script & Docker Profiles
  - [ ] T83.5.1: Create interactive/automated onboarding script `bin/setup-hardware.sh` detecting host hardware and printing detected configuration. [File: bin/setup-hardware.sh] [Test: bash bin/setup-hardware.sh --dry-run]
  - [ ] T83.5.2: Update `docker-compose.yml` with compose profiles: `default` (standard), `nvidia` (with GPU device reservation), `amd` (with `/dev/kfd` and `/dev/dri`), and `cpu` (lightweight). [File: docker-compose.yml] [Profiles: nvidia, amd, cpu] [Test: docker compose config]
  - [ ] T83.5.3: Document contributor onboarding instructions in `docs/contributing_hardware.md` explaining how external contributors can run the arena. [File: docs/contributing_hardware.md] [Test: markdown-lint]
  - [ ] T83.5.4: Validate that `docker compose --profile nvidia up` properly exposes NVIDIA GPU to container. [File: docker-compose.yml] [Test: docker compose config]

---

## Phase 84: Auto-Mode Sovereign Loop Hardening & Bi-Directional GitHub Issue Sync
*RDF Category: sovereign_autonomy*

### T84.1: Sovereign Auto-Mode Loop Supervisor
  - [ ] T84.1.1: Create `SovereignLoopSupervisor` in `packages/engine/src/daemon/SovereignLoopSupervisor.ts` keeping the autonomous loop running 24/7. [File: packages/engine/src/daemon/SovereignLoopSupervisor.ts] [Class: SovereignLoopSupervisor] [Test: npm test -- packages/engine/src/tests/sovereign_supervisor.test.ts]
  - [ ] T84.1.2: Implement unhandled error containment: if an unhandled promise rejection occurs during task execution, isolate the error, rollback worktree, and resume queue. [File: packages/engine/src/daemon/SovereignLoopSupervisor.ts] [Method: handleWorkerError] [Test: npm test -- packages/engine/src/tests/sovereign_supervisor.test.ts]
  - [ ] T84.1.3: Automatically detect empty queue conditions and trigger internal vacancy tasks (test coverage expansion, dead code elimination, AST grooming). [File: packages/engine/src/daemon/SovereignLoopSupervisor.ts] [Method: fillVacancy] [Test: npm test -- packages/engine/src/tests/sovereign_supervisor.test.ts]
  - [ ] T84.1.4: Write unit tests verifying supervisor survives simulated worker crashes and resumes task processing. [File: packages/engine/src/tests/sovereign_supervisor.test.ts] [Test: npm test -- packages/engine/src/tests/sovereign_supervisor.test.ts]

### T84.2: Worktree Pre-Commit Monorepo Build Gate in Pipeline
  - [ ] T84.2.1: Add `verifyCleanBuild(worktreePath: string)` call in `AutonomousWorkerPipeline.ts` Stage 6 before `commitWorktree`. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executePrReviewStage] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T84.2.2: Ensure tasks failing pre-commit build verification return `success: false` and do NOT merge into Gitea `main`. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T84.2.3: Forward compiler error outputs from failed build verification to active remediation stage. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeRemediationStage] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T84.2.4: Write unit tests verifying that non-compiling worktree changes are blocked from committing to staging `main`. [File: packages/engine/src/tests/worktree_build_gate.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_build_gate.test.ts]

### T84.3: Bi-Directional GitHub Issue Poller & Task Ingestion Daemon
  - [ ] T84.3.1: Implement `GitHubIssueSyncDaemon` in `packages/engine/src/gitea/GitHubIssueSyncDaemon.ts` polling public GitHub issues every 5 minutes. [File: packages/engine/src/gitea/GitHubIssueSyncDaemon.ts] [Class: GitHubIssueSyncDaemon] [Test: npm test -- packages/engine/src/tests/github_issue_sync.test.ts]
  - [ ] T84.3.2: Filter issues with label `arena:auto`, extracting title, body, and linked focus files into atomic `TaskRecord` rows. [File: packages/engine/src/gitea/GitHubIssueSyncDaemon.ts] [Method: ingestIssues] [Test: npm test -- packages/engine/src/tests/github_issue_sync.test.ts]
  - [ ] T84.3.3: Add duplicate detection avoiding re-ingesting issues that already have active or completed tasks in database. [File: packages/engine/src/gitea/GitHubIssueSyncDaemon.ts] [Method: isDuplicate] [Test: npm test -- packages/engine/src/tests/github_issue_sync.test.ts]
  - [ ] T84.3.4: Write unit tests verifying GitHub issue ingestion parses labels, bodies, and priorities accurately into database tasks. [File: packages/engine/src/tests/github_issue_sync.test.ts] [Test: npm test -- packages/engine/src/tests/github_issue_sync.test.ts]

### T84.4: Autonomous Issue Resolution & Verification PR Linker
  - [ ] T84.4.1: Link resolved GitHub issue number in commit message (`Fixes #123`) when promoting milestone releases to GitHub. [File: packages/engine/src/gitea/GitHubPromotionPipeline.ts] [Method: linkResolvedIssues] [Test: npm test -- packages/engine/src/tests/github_promotion.test.ts]
  - [ ] T84.4.2: Post automated verification comment on GitHub issue once staging verification passes in Gitea, providing transparency before public release. [File: packages/engine/src/gitea/GitHubIssueSyncDaemon.ts] [Method: postVerificationStatus] [Test: npm test -- packages/engine/src/tests/github_issue_sync.test.ts]
  - [ ] T84.4.3: Close GitHub issue automatically when the promoted release PR is merged into upstream `main`. [File: packages/engine/src/gitea/GitHubPromotionPipeline.ts] [Method: closeResolvedIssues] [Test: npm test -- packages/engine/src/tests/github_promotion.test.ts]
  - [ ] T84.4.4: Write unit tests simulating full issue ingestion -> local execution -> staging merge -> GitHub PR resolution lifecycle. [File: packages/engine/src/tests/issue_resolution_lifecycle.test.ts] [Test: npm test -- packages/engine/src/tests/issue_resolution_lifecycle.test.ts]

### T84.5: Defocus Plan/Build Modes in Favor of Sovereign Auto Mode
  - [ ] T84.5.1: Set `DEFAULT_EXECUTION_MODE=auto` across all default configs, daemon initialization, and frontend stores. [File: packages/shared-types/src/config.ts] [Constant: DEFAULT_EXECUTION_MODE] [Test: npm test -- packages/shared-types]
  - [ ] T84.5.2: Streamline UI navigation to highlight Auto Mode telemetry, success yield, and milestone promotion over manual step controls. [File: packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.ts] [Test: npm test]
  - [ ] T84.5.3: Ensure headless server and Docker containers default strictly to sovereign Auto Mode on boot. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: start] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [ ] T84.5.4: Write integration tests verifying that arena boots and executes uninterrupted in sovereign Auto Mode with zero manual prompts. [File: packages/engine/src/tests/sovereign_auto_mode.test.ts] [Test: npm test -- packages/engine/src/tests/sovereign_auto_mode.test.ts]




