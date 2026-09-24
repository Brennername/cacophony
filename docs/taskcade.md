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
5. **Reference**: See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 44.

---

## Active Milestone Era: Gitea Deep API Integration, Dynamic Branching, Least-Privilege Guardrails & Webhook Orchestration

*See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 44.*

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
  - [ ] T46.1.1: Connect AutonomousWorkerPipeline stages (Planning, Generation, Scrubbing, Testing, Review, Merge) to stageRepo records and broadcast stage transitions over SSE. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T46.1.2: Update TaskInspectorComponent stage stepper to dynamically highlight active pipeline stages in real-time instead of hardcoded stage numbers. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test]
  - [ ] T46.1.3: Persist generated code diffs directly into task.logSnippet so Code Diffs tab in TaskDetailModalComponent displays actual diffs. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [ ] T46.1.4: Write unit tests verifying stage transition broadcasts and stage timing telemetry. [File: packages/engine/src/tests/stage_telemetry.test.ts] [Test: npm test -- packages/engine/src/tests/stage_telemetry.test.ts]

### T46.2: Git Worktree Branch Isolation & Autonomous Gitea PR Publication
  - [ ] T46.2.1: Integrate GitWorktreeManager with AutonomousWorkerPipeline: create ephemeral branch `task/<priority>-<taskId>` per task execution. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T46.2.2: Commit verified code modifications to task branch using git worktree without touching main workspace. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T46.2.3: Wire AutomatedPrPublisher to open pull requests in Gitea automatically upon test passing. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [ ] T46.2.4: Write integration tests verifying automated branch creation, commit creation, and PR publication workflow. [File: packages/engine/src/tests/gitea_integration.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]

---

## Phase 47: Queue Execution Recovery, Stale Task Reclamation & Scheduler Resilience
*RDF Category: persistence*

### T47.1: Stale Running Task Auto-Reclamation on Engine Startup
  - [ ] T47.1.1: Implement TaskRepository.reclaimStaleRunningTasks(timeoutMinutes: number) transitioning tasks stranded in RUNNING state back to PENDING. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.reclaimStaleRunningTasks] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T47.1.2: Invoke reclaimStaleRunningTasks during CacophonyDaemon startup sequence before TaskScheduler.start(). [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: CacophonyDaemon.start] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [ ] T47.1.3: Add REST endpoint POST /api/tasks/reclaim to trigger manual or scheduled reclamation of orphan running tasks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks/reclaim] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T47.1.4: Write unit tests verifying that stranded RUNNING tasks are cleanly requeued with failure counts preserved. [File: packages/db/src/tests/reclaim_tasks.test.ts] [Test: npm test -- packages/db/src/tests/reclaim_tasks.test.ts]

### T47.2: Task Execution Timeout & Deadlock Watchdog
  - [ ] T47.2.1: Add watchdog timer in TaskScheduler aborting tasks exceeding per-model max execution timeout. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Class: TaskScheduler] [Test: npm test -- packages/engine/src/tests/scheduler_timeout.test.ts]
  - [ ] T47.2.2: Add ExecutionTimeoutError classification to FailureClassifier tagging tasks aborted by watchdog. [File: packages/engine/src/analytics/FailureClassifier.ts] [Class: FailureClassifier] [Test: npm test -- packages/engine/src/tests/failure_classifier.test.ts]
  - [ ] T47.2.3: Record TIMEOUT stage failure in StageRepository with elapsed duration and partial output log. [File: packages/db/src/repositories/StageRepository.ts] [Method: StageRepository.recordStageCompletion] [Test: npm test -- packages/db/src/tests/StageRepository.test.ts]
  - [ ] T47.2.4: Write unit tests simulating stalled LLM stream triggers watchdog timeout and transitions task to FAILED. [File: packages/engine/src/tests/scheduler_watchdog.test.ts] [Test: npm test -- packages/engine/src/tests/scheduler_watchdog.test.ts]

### T47.3: Scheduler Task Dispatch Backpressure & APU Temperature Governor
  - [ ] T47.3.1: Implement thermal backpressure check in TaskScheduler.tick() delaying dispatch when edge temp exceeds 85C. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: TaskScheduler.tick] [Test: npm test -- packages/engine/src/tests/thermal_governor.test.ts]
  - [ ] T47.3.2: Expose scheduler backpressure state (isBackpressured, backpressureReason) in GET /api/status. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/status] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T47.3.3: Update ArenaStateStore to consume scheduler backpressure state and reflect in frontend UI status badge. [File: packages/frontend/src/app/services/arena-state.store.ts] [Class: ArenaStateStore] [Test: npm test]
  - [ ] T47.3.4: Write unit tests verifying scheduler pauses task dispatch during high thermal load and resumes automatically when cool. [File: packages/engine/src/tests/thermal_backpressure.test.ts] [Test: npm test -- packages/engine/src/tests/thermal_backpressure.test.ts]

### T47.4: PGlite Database Reconnection & Lockfile Recovery
  - [ ] T47.4.1: Implement stale lockfile detection in PGliteDriver recovering cleanly from unclean container restarts. [File: packages/db/src/drivers/PGliteDriver.ts] [Class: PGliteDriver] [Test: npm test -- packages/db/src/tests/pglite_driver.test.ts]
  - [ ] T47.4.2: Add health check query verification (SELECT 1) with retry backoff in PGliteDriver.connect(). [File: packages/db/src/drivers/PGliteDriver.ts] [Method: PGliteDriver.connect] [Test: npm test -- packages/db/src/tests/pglite_driver.test.ts]
  - [ ] T47.4.3: Implement safe database disconnect and lock release on process SIGTERM and SIGINT in CacophonyDaemon. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: CacophonyDaemon.stop] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [ ] T47.4.4: Write unit tests verifying PGlite driver re-establishes connection and handles concurrency locks gracefully. [File: packages/db/src/tests/pglite_resilience.test.ts] [Test: npm test -- packages/db/src/tests/pglite_resilience.test.ts]

### T47.5: Continuous Queue Ingestion & Priority-Based Preemption
  - [ ] T47.5.1: Enhance TaskRepository.listPending() to order by effective priority considering both base priority and wait age. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.listPending] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T47.5.2: Implement starvation prevention bumping tasks waiting longer than 15 minutes up one priority level. [File: packages/engine/src/scheduler/QueueGroomer.ts] [Class: QueueGroomer] [Test: npm test -- packages/engine/src/tests/queue_groomer.test.ts]
  - [ ] T47.5.3: Add batch task creation endpoint POST /api/tasks/batch for atomic bulk enqueue of decomposed epics. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks/batch] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T47.5.4: Write unit tests validating that P0 tasks preempt lower-priority tasks while preventing starvation of P2 tasks. [File: packages/engine/src/tests/priority_preemption.test.ts] [Test: npm test -- packages/engine/src/tests/priority_preemption.test.ts]

### T47.6: Queue Seed Dispatcher for Self-Hosting Bootstrap
  - [ ] T47.6.1: Create TaskcadeSeedLoader reading pending tasks from docs/taskcade.md and parsing them into typed TaskRecord objects. [File: packages/engine/src/scheduler/TaskcadeSeedLoader.ts] [Class: TaskcadeSeedLoader] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts]
  - [ ] T47.6.2: Add CLI command bin/seed-queue.ts to enqueue uncompleted checklist items from active taskcade phase. [File: bin/seed-queue.ts] [Test: node bin/seed-queue.ts --dry-run]
  - [ ] T47.6.3: Implement duplicate task prevention ensuring identical task IDs or titles are not re-enqueued. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.createIfNotExists] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [ ] T47.6.4: Write integration tests verifying seed loader correctly extracts markdown task items and registers them in DB. [File: packages/engine/src/tests/seed_loader.test.ts] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts]

---

## Phase 48: UI Mock Elimination & Full-Stack Service Wiring
*RDF Category: frontend*

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
  - [ ] T48.3.1: Remove hardcoded default fake spans array from GanttTransportComponent inputs and default to empty array. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.ts] [Class: GanttTransportComponent] [Test: npm test]
  - [ ] T48.3.2: Bind TaskInspectorComponent to pass live task stage spans into app-gantt-transport [spans]="activeTaskSpans()". [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Class: TaskInspectorComponent] [Test: npm test]
  - [ ] T48.3.3: Implement activeTaskSpans computed signal in TaskInspectorComponent fetching /api/tasks/:id/gantt for current task. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Computed: activeTaskSpans] [Test: npm test]
  - [ ] T48.3.4: Write frontend unit tests verifying GanttTransportComponent renders real stage timelines with correct millisecond offsets. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.spec.ts] [Test: npm test]

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
  - [ ] T52.3.1: Implement ReviewVerdictParser extracting VERDICT: APPROVE | REQUEST_CHANGES | REJECT from model response. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Class: ReviewVerdictParser] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]
  - [ ] T52.3.2: Extract line-level review comments: file path, line number, severity ('blocker' | 'warning' | 'nit'), comment text. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: parseInlineComments] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]
  - [ ] T52.3.3: Handle ambiguous or unformatted model outputs by defaulting to REQUEST_CHANGES with explanatory note. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: handleUnparseableReview] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]
  - [ ] T52.3.4: Write unit tests covering diverse model response formats to ensure robust verdict and comment extraction. [File: packages/engine/src/tests/verdict_parser.test.ts] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]

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
  - [ ] T53.1.2: Traverse AST nodes extracting ts.SyntaxKind.ClassDeclaration, InterfaceDeclaration, and FunctionDeclaration. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: visitNode] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [ ] T53.1.3: Extract symbol identifiers, exported flags, file paths, line ranges, and JSDoc documentation comments. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: extractSymbolMetadata] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [ ] T53.1.4: Write unit tests verifying all exported classes and functions in packages/engine are extracted accurately. [File: packages/engine/src/tests/symbol_harvester.test.ts] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]

### T53.2: Graph Centrality Computation & Edge Mapping
  - [ ] T53.2.1: Extract import and export statements to construct directed dependency edges between symbol nodes. [File: packages/engine/src/repomap/SymbolGraphBuilder.ts] [Class: SymbolGraphBuilder] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]
  - [ ] T53.2.2: Compute in-degree and PageRank centrality score [0.0, 1.0] for each architectural symbol. [File: packages/engine/src/repomap/SymbolGraphBuilder.ts] [Method: computeCentrality] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]
  - [ ] T53.2.3: Identify core architectural hub classes (highest centrality) for context minimization prioritization. [File: packages/engine/src/repomap/SymbolGraphBuilder.ts] [Method: getHubSymbols] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]
  - [ ] T53.2.4: Write unit tests verifying that highly imported base utilities have higher centrality scores than leaf modules. [File: packages/engine/src/tests/symbol_graph.test.ts] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]

### T53.3: REST API: GET /api/repomap with In-Memory Caching
  - [ ] T53.3.1: Expose GET /api/repomap returning array of RepoSymbolNode with id, name, kind, filePath, centrality. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/repomap] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T53.3.2: Cache symbol graph in memory and invalidate automatically on task completion or file modification. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: invalidateCache] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [ ] T53.3.3: Support query parameter ?kind=class|interface|function to filter returned symbol types. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/repomap] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T53.3.4: Write integration tests verifying /api/repomap returns 200 with complete architectural symbol inventory. [File: packages/engine/src/tests/repomap_endpoint.test.ts] [Test: npm test -- packages/engine/src/tests/repomap_endpoint.test.ts]

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
  - [ ] T54.3.1: Implement GitCheckpointManager.revertToCheckpoint(checkpointId) checking out snapshot into workspace. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: revertToCheckpoint] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
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

