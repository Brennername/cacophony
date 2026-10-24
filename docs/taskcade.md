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

## Phase 103: Human-Resonant PR Workflow, Issue Synthesis, GitHub Sync, & Multi-Model Review Roles

- [x] T103.1: Implement `HumanResonantPrGenerator` for human-like narrative PR descriptions discussing code properties, SOLID decisions, cross-model dialogue, and blast radius without dry checklists. [Files: packages/engine/src/gitea/HumanResonantPrGenerator.ts, packages/engine/src/tests/human_resonant_pr_generator.test.ts] [Test: node --test packages/engine/dist/tests/human_resonant_pr_generator.test.js]
- [x] T103.2: Extend `IGitPlatformProvider`, `GiteaPlatformProvider`, `GiteaApiClient`, and `GitHubPlatformProvider` with issue management lifecycle (create, list, get, close, comment). [Files: packages/engine/src/gitea/IGitPlatformProvider.ts, packages/engine/src/gitea/GiteaPlatformProvider.ts, packages/engine/src/gitea/GitHubPlatformProvider.ts, packages/engine/src/gitea/GiteaApiClient.ts, packages/engine/src/tests/git_platform_provider.test.ts] [Test: node --test packages/engine/dist/tests/git_platform_provider.test.js]
- [x] T103.3: Implement `AutomatedIssueSynthesizer` for autonomous detection of stubs, mocks, and regressions with Gitea/GitHub issue creation and arena task queueing. [Files: packages/engine/src/gitea/AutomatedIssueSynthesizer.ts, packages/engine/src/tests/automated_issue_synthesizer.test.ts] [Test: node --test packages/engine/dist/tests/automated_issue_synthesizer.test.js]
- [x] T103.4: Implement `GitHubSecurityAndIssueBridge` for Dependabot alert ingestion, external GitHub issue/PR synchronization, reasoning model review, and bidirectional verification merge/close. [Files: packages/engine/src/gitea/GitHubSecurityAndIssueBridge.ts, packages/engine/src/tests/github_security_and_issue_bridge.test.ts] [Test: node --test packages/engine/dist/tests/github_security_and_issue_bridge.test.js]
- [x] T103.5: Implement `MultiModelReviewCoordinator` providing multi-role review (Security, DX/UX/UI, Architecture) with reviewer retries, fallback models, and transparent sub-stage timing telemetry. [Files: packages/engine/src/inference/MultiModelReviewCoordinator.ts, packages/engine/src/tests/multi_model_review_coordinator.test.ts] [Test: node --test packages/engine/dist/tests/multi_model_review_coordinator.test.js]

## Phase 104: Log Profile Reduction, Statistical Histograms & Inspector Multi-Attempt Fidelity

- [x] T104.1: Close stage accordions by default in `TaskInspectorComponent` except for the currently `RUNNING` stage, and isolate historical stage attempt outputs so older attempts do not mirror the live stream buffer. [Files: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts, packages/frontend/src/app/components/task-inspector/task-inspector.component.html, packages/frontend/src/app/components/task-inspector/task-inspector.component.css, packages/frontend/src/app/components/task-inspector/task-inspector.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend -- src/app/components/task-inspector/task-inspector.component.spec.ts]
- [x] T104.2: Create database migration `020_reduction_logs` and register in `MigrationRegistry` to record profile reductions and statistical summaries. [Files: packages/db/src/migrations/020_reduction_logs.ts, packages/db/src/migrations/MigrationRegistry.ts] [Test: npm run test --workspace=@cacophony/db]
- [x] T104.3: Implement `LogReductionService` with empirical size ratio documentation (test_execution: 50x, generation: 20x, remediation: 8x, deterministic_scrub: 1x, planning: 0.5x), statistical histogram generation, generous age/retention policies, and reduction logging. [Files: packages/db/src/services/LogReductionService.ts, packages/db/src/index.ts, packages/db/src/__tests__/log_reduction_service.test.ts] [Test: node --test packages/db/dist/__tests__/log_reduction_service.test.js]
- [x] T104.4: Integrate `LogReductionService` into `DatabaseMaintenanceService`, `CacophonyDaemon`, and HTTP routes (`POST /api/database/reduce`, `GET /api/database/reduction-logs`, `POST /api/database/maintenance`). [Files: packages/db/src/services/DatabaseMaintenanceService.ts, packages/engine/src/daemon/CacophonyDaemon.ts, packages/engine/src/daemon/CacophonyHttpServer.ts, packages/engine/src/tests/log_reduction_api.test.ts] [Test: node --test packages/engine/dist/tests/log_reduction_api.test.js]
- [x] T104.5: Update ticket drill-down modal (`TaskDetailModalComponent`) and inspector to recognize reduced logs (`The log of this has been reduced, this is it's histogram:`) and display statistical badges for reconstructed tickets. [Files: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.html, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.css] [Test: npm run test --workspace=@cacophony/frontend]

---

## Phase 102: Comprehensive Unit Test Expansion & Edge-Case Coverage

- [x] T102.1.1: Write unit tests verifying `TerminalLogViewerComponent` log line rendering, auto-scrolling, and ANSI escape code sanitation. [Files: packages/frontend/src/app/components/terminal-log-viewer/terminal-log-viewer.component.ts, packages/frontend/src/app/components/terminal-log-viewer/terminal-log-viewer.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.1.2: Write unit tests verifying `ProcessInspectorComponent` process selection, terminal output display, and status badge rendering. [Files: packages/frontend/src/app/components/process-inspector/process-inspector.component.ts, packages/frontend/src/app/components/process-inspector/process-inspector.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.1.3: Write unit tests verifying `QueueManagerComponent` status filtering, priority badges, and task cancellation dispatches. [Files: packages/frontend/src/app/components/queue-manager/queue-manager.component.ts, packages/frontend/src/app/components/queue-manager/queue-manager.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.1.4: Write unit tests verifying `ExplorationControlComponent` epsilon slider reactivity, model strategy selection, and budget persistence. [Files: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts, packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.1.5: Write unit tests verifying `AuthCallbackComponent` query parameter token extraction, error state handling, and router navigation. [Files: packages/frontend/src/app/components/auth-callback/auth-callback.component.ts, packages/frontend/src/app/components/auth-callback/auth-callback.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.6: Write unit tests verifying `RepoMapViewerComponent` tree node expansion, symbol selection, and file navigation dispatches. [Files: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts, packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.7: Write unit tests verifying `TaskHistoryComponent` status pill display, duration formatting, and task item selection. [Files: packages/frontend/src/app/components/task-history/task-history.component.ts, packages/frontend/src/app/components/task-history/task-history.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.8: Write unit tests verifying `FrontierModalComponent` provider credential inputs, temperature sliders, and submission events. [Files: packages/frontend/src/app/components/frontier-modal/frontier-modal.component.ts, packages/frontend/src/app/components/frontier-modal/frontier-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.9: Write unit tests verifying `ProcessDrawerComponent` drawer open/close toggles, active process counting, and tab switches. [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts, packages/frontend/src/app/components/process-drawer/process-drawer.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.10: Write unit tests verifying `ConfirmationDialogComponent` backdrop dismissal, confirmation callback triggers, and destructive styling. [Files: packages/frontend/src/app/components/confirmation-dialog/confirmation-dialog.component.ts, packages/frontend/src/app/components/confirmation-dialog/confirmation-dialog.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.11: Write unit tests verifying `ModelPullModalComponent` model tag selection, progress bar updates, and pull cancellation. [Files: packages/frontend/src/app/components/model-pull-modal/model-pull-modal.component.ts, packages/frontend/src/app/components/model-pull-modal/model-pull-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.12: Write unit tests verifying `ModelTuningPanelComponent` hyperparameter slider bindings, preset saving, and reset defaults. [Files: packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.ts, packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.13: Write unit tests verifying `TenancyConfigPanelComponent` tenant isolation toggles, concurrency limits, and quota validation. [Files: packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.ts, packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.14: Write unit tests verifying `TestFilterToolbarComponent` test search debounce, failure-only filter toggles, and suite re-run clicks. [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts, packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.15: Write unit tests verifying `TestRunModalComponent` test output live streaming, pass/fail badge rendering, and modal dismissal. [Files: packages/frontend/src/app/components/test-run-modal/test-run-modal.component.ts, packages/frontend/src/app/components/test-run-modal/test-run-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.1.16: Write unit tests verifying `WindowedSuccessTrendComponent` moving average calculations, trend arrow rendering, and window size adjustment. [Files: packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.ts, packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.17: Write unit tests verifying `CheckpointTimelineComponent` undo/redo button state management, commit author display, and rewind dispatch. [Files: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts, packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]

## Phase 105: Responsive Viewport Guardrails, Tab Scrolling Navigation & Mock Rate Limiter Calibration

- [x] T105.1: Clamp `WindowedSuccessTrendComponent` SVG polyline points within safe Y-bounds [14, 68] using `rateToY` percentage mapper, preventing mobile line overrun of legend typography. [Files: packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.ts, packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.html, packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.css, packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend -- -t WindowedSuccessTrendComponent]
- [x] T105.2: Strictly bind `TaskDetailModalComponent` dialog to screen viewport bounds and introduce a side-scrolling defined tab bar with `<` and `>` arrow navigation buttons and touch swiping. [Files: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.html, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.css, packages/frontend/src/app/components/task-inspector/task-inspector.component.css, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend -- -t TaskDetailModalComponent]
- [x] T105.3: Calibrate `MockInferenceStreamProvider` to rate-limit mock token generation to average 11.0 tok/s with realistic ±5.5 tok/s random burst oscillations while keeping real mode unthrottled. [Files: packages/engine/src/inference/MockInferenceStreamProvider.ts, packages/engine/src/daemon/CacophonyDaemon.ts, packages/engine/src/tests/mock_inference_stream.test.ts] [Test: node --test packages/engine/dist/tests/mock_inference_stream.test.js]
- [x] T105.4: Rebuild packages and Docker container with `./bin/rebuild-all.sh`, push to GitHub and Gitea remotes, and manually deploy to Heroku. [Files: bin/rebuild-all.sh] [Test: ./bin/rebuild-all.sh]

## Phase 106: Surgical Context Window Controls, APU Hardware Memory Tuning, Single Test Concurrency & System Cooldown Pacing

- [x] T106.1: Add `contextTokens` to `InferenceRequest` and `TaskMetadataHints` for granular task/request context sizing while defaulting `OllamaProvider.resolveModelOptions` to 4096 tokens on 16GB APU systems. [Files: packages/shared-types/src/model.ts, packages/shared-types/src/task.ts, packages/engine/src/inference/OllamaProvider.ts, packages/engine/src/tests/model_tuning.test.ts] [Test: node --test --test-concurrency=1 packages/engine/dist/tests/model_tuning.test.js]
- [x] T106.2: Enforce single test concurrency (`--test-concurrency=1`) across QueueGroomer, package.json test scripts, and SandboxedProcessRunner to eliminate CPU thrashing and host memory exhaustion into ZRAM. [Files: packages/engine/src/scheduler/QueueGroomer.ts, packages/engine/src/testing/SandboxedProcessRunner.ts, packages/engine/package.json, packages/db/package.json, packages/tools/package.json, packages/frontend/test-runner.cjs, packages/engine/src/tests/test_command_scoping.test.ts] [Test: node --test --test-concurrency=1 packages/engine/dist/tests/test_command_scoping.test.js]
- [x] T106.3: Implement proactive resident model eviction in `TaskScheduler.tick()` when candidate tasks fail co-residency headroom checks against active model but fit standalone within physical VRAM. [Files: packages/engine/src/scheduler/TaskScheduler.ts, packages/engine/src/tests/scheduler_model_unload.test.ts] [Test: node --test --test-concurrency=1 packages/engine/dist/tests/scheduler_model_unload.test.js]
- [x] T106.4: Integrate CPU load average and APU thermal cooldown pacing (`enforceSystemPacing`) and task suspension wait states into `AutonomousWorkerPipeline` before test execution and code generation rounds. [Files: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts, packages/engine/src/daemon/CacophonyDaemon.ts] [Test: npm test --workspace=@cacophony/engine]
- [x] T106.5: Expose dynamic scheduler pause state in `/api/status`, and provide REST control endpoints `/api/scheduler/pause`, `/api/scheduler/resume`, `/api/tasks/:id/pause`, and `/api/tasks/:id/resume`. [Files: packages/engine/src/daemon/CacophonyHttpServer.ts, packages/engine/src/scheduler/TaskScheduler.ts, packages/engine/src/__tests__/DaemonCli.test.ts] [Test: node --test --test-concurrency=1 packages/engine/dist/__tests__/DaemonCli.test.js]

## Phase 107: Regression Rectification: Scheduler Concurrency Assertion Alignment, SystemToolScanner Path Diagnostics & FocusedDiffBuilder Test Suite

- [x] T107.1: Align `packages/engine/src/__tests__/Scheduler.test.ts` test expectations with Phase 106 single-concurrency scoped test commands (`--test-concurrency=1`). [Files: packages/engine/src/__tests__/Scheduler.test.ts] [Test: node --test --test-concurrency=1 packages/engine/dist/__tests__/Scheduler.test.js]
- [x] T107.2: Implement `findTool(binaryName)` on `SystemToolScanner` for dynamic binary resolution and replace duplicate file content in `packages/engine/src/tests/system_tool_scanner.test.ts` with comprehensive unit tests. [Files: packages/engine/src/hardware/SystemToolScanner.ts, packages/engine/src/tests/system_tool_scanner.test.ts] [Test: node --test --test-concurrency=1 packages/engine/dist/tests/system_tool_scanner.test.js]
- [x] T107.3: Expand `TargetedChunk` typing contracts with `oldEndLine` and `newEndLine`, add `build(...)` convenience alias method to `FocusedDiffBuilder`, and implement full unit test suite covering single/multi-line changes, whitespace, special characters, and empty/identical inputs. [Files: packages/engine/src/context/FocusedDiffBuilder.ts, packages/engine/src/tests/focused_diff_builder.test.ts] [Test: node --test --test-concurrency=1 packages/engine/dist/tests/focused_diff_builder.test.js]
- [x] T107.4: Rebuild packages and container image with `./bin/rebuild-all.sh`, push to GitHub and Gitea remotes, and deploy release to Heroku. [Files: bin/rebuild-all.sh] [Test: ./bin/rebuild-all.sh]

## Phase 108: Task Viewport Real Estate Optimization, Expandable Embedded Windows, Gitea PR Discussion Threads & Asynchronous Multi-Model Review Gating

- [x] T108.1: Task Header Real Estate Compression & Compact Typography: Slim down `.badge-row` (priority, status, role), shrink the task headline font size while maintaining bold/bright contrast, and compress `TaskDetailModalComponent` header, notification banner, and metadata grid vertical footprints for mobile-first density. [Files: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.html, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.css, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend -- -t TaskDetailModalComponent]
- [x] T108.2: Embedded Scrollable Region Full Expansion & Corner Shrink Controls: Default embedded log, terminal, diff, prompt, cognitive trace, and diagnostic code boxes to expand fully to eliminate nested scroll-trapping, and introduce corner toggle controls allowing user-initiated shrinking to constrained scrollable windows. [Files: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.html, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.css, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend -- -t TaskDetailModalComponent]
- [x] T108.3: Dynamic Tab Overflow Detection & Conditional `<` / `>` Navigation Arrows: Enhance horizontal tab scrolling bar in `TaskDetailModalComponent` to dynamically calculate scroll bounds on mobile and desktop viewports, displaying arrow buttons strictly when content can scroll in that direction. [Files: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.html, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.css, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend -- -t TaskDetailModalComponent]
- [x] T108.4: Database Schema Migration & Repository for Gitea PR Discussion Threads & Model Comments: Create migration `021_pr_discussion_threads` and implement `PrDiscussionRepository` for storing PR review threads, multi-model advisory comments, domain tags (Security, Auth, UX/UI, Playwright E2E, Architecture), and thread resolution status. [Files: packages/db/src/migrations/021_pr_discussion_threads.ts, packages/db/src/migrations/MigrationRegistry.ts, packages/db/src/repositories/PrDiscussionRepository.ts, packages/db/src/index.ts, packages/db/src/tests/pr_discussion_repository.test.ts] [Test: node --test packages/db/dist/tests/pr_discussion_repository.test.js]
- [x] T108.5: Gitea Platform Provider Deep Thread Discussion & Issue Comments API: Extend `IGitPlatformProvider`, `GiteaPlatformProvider`, and `GiteaApiClient` with typed methods for fetching PR review threads and posting review comments, and expose REST endpoints `/api/tasks/:id/pr/threads` and `/api/tasks/:id/pr/threads/comments`. [Files: packages/shared-types/src/gitea.ts, packages/engine/src/gitea/IGitPlatformProvider.ts, packages/engine/src/gitea/GiteaPlatformProvider.ts, packages/engine/src/gitea/GiteaApiClient.ts, packages/engine/src/daemon/CacophonyHttpServer.ts, packages/engine/src/tests/gitea_pr_threads.test.ts] [Test: node --test --test-concurrency=1 packages/engine/dist/tests/gitea_pr_threads.test.js]
- [x] T108.6: Domain Specialist Advisory Model Evaluator: Implement `DomainAdvisoryEvaluator` to dispatch domain-specific checks (Security, Authentication, UX/UI, Code Quality) to models, generating structured advice and inline/issue review comments directly on Gitea PR threads. [Files: packages/engine/src/inference/DomainAdvisoryEvaluator.ts, packages/engine/src/inference/MultiModelReviewCoordinator.ts, packages/engine/src/tests/domain_advisory_evaluator.test.ts] [Test: node --test --test-concurrency=1 packages/engine/dist/tests/domain_advisory_evaluator.test.js]
- [x] T108.7: Resource-Paced Asynchronous PR Merge Gating & Final Synthesis Loop: Implement `PrMergeGateCoordinator` in `AutonomousWorkerPipeline` to hold PRs from merge while continuing other tasks; queue heavy evaluations (e.g. Playwright E2E) behind all other tests within host memory/CPU limits; once domain reviews check in, trigger a final model synthesis round incorporating PR thread feedback before merge. [Files: packages/engine/src/scheduler/PrMergeGateCoordinator.ts, packages/engine/src/scheduler/AutonomousWorkerPipeline.ts, packages/engine/src/tests/pr_merge_gate_coordinator.test.ts] [Test: node --test --test-concurrency=1 packages/engine/dist/tests/pr_merge_gate_coordinator.test.js]
- [x] T108.8: Interactive PR Discussion Threads & Multi-Model Advisory View in Frontend: Display live Gitea PR discussion threads with domain tags, reviewer badges, line-level code comments, and advisory recommendations in `TaskDetailModalComponent` PR Reviews tab. [Files: packages/frontend/src/app/services/task-api.service.ts, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.html, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.css, packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend -- -t TaskDetailModalComponent]
- [x] T108.9: Monorepo Build, Container Synchronization & Verification: Execute `./bin/rebuild-all.sh`, compile all packages, update Docker container image, and verify healthy operational status on `/api/status`. [Files: bin/rebuild-all.sh] [Test: ./bin/rebuild-all.sh]

## Phase 109: Whitebox Configuration Decoupling, CodeQL ReDoS Security Hardening & Dependency Vulnerability Remediation

- [x] T109.1: Whitebox Configuration Decoupling: Decouple personal identifiers (Gitea username, repository owner, protected model lists) to environment variables with neutral defaults (`Cacophony`, dynamic default models in `.env` / `.env.example`). [Files: docker-compose.yml, packages/engine/src/daemon/CacophonyDaemon.ts, packages/engine/src/daemon/CacophonyHttpServer.ts, packages/engine/src/gitea/GitHubIssueSyncDaemon.ts, packages/engine/src/inference/DomainAdvisoryEvaluator.ts, packages/frontend/src/app/services/history-metrics.service.ts, .env.example, docs/api_spec.md] [Test: npm test --workspace=@cacophony/engine]
- [x] T109.2: CodeQL Polynomial ReDoS Remediation: Refactor backtracking regex patterns in `pathSecurity.ts`, `AutonomousWorkerPipeline.ts`, `TaskcadeSeedLoader.ts`, `TaskScheduler.ts`, `FrontierReviewer.ts`, `MultiModelReviewCoordinator.ts`, `ReasoningDistillationService.ts`, `ReviewerPersonaPromptFactory.ts`, `MicroModelToolRouter.ts`, and `FrontierRegressionAnalyzer.ts` to safe linear scans via `extractJsonObjectString`. [Files: packages/tools/src/utils/pathSecurity.ts, packages/engine/src/utils/json_utils.ts, packages/engine/src/utils/index.ts, packages/engine/src/scheduler/AutonomousWorkerPipeline.ts, packages/engine/src/scheduler/TaskcadeSeedLoader.ts, packages/engine/src/scheduler/TaskScheduler.ts, packages/engine/src/inference/FrontierReviewer.ts, packages/engine/src/inference/MultiModelReviewCoordinator.ts, packages/engine/src/inference/ReasoningDistillationService.ts, packages/engine/src/inference/ReviewerPersonaPromptFactory.ts, packages/engine/src/inference/MicroModelToolRouter.ts, packages/engine/src/analytics/FrontierRegressionAnalyzer.ts, packages/engine/src/tests/json_utils.test.ts] [Test: node --test packages/engine/dist/tests/json_utils.test.js]
- [x] T109.3: Dependency Vulnerability Remediation & Dependabot PR Convergence: Upgrade `vitest` to 4.1.12, `@modelcontextprotocol/server` to 2.3.1, `@angular/cli` to 22.2.3, and `vite` to 8.3.5 in `package.json` and `package-lock.json`; achieve 0 npm audit vulnerabilities and resolve GitHub Dependabot alerts. [Files: package.json, packages/frontend/package.json, package-lock.json] [Test: npm audit]
- [x] T109.4: Monorepo Build, Container Synchronization, Verification & Clean Push (No Heroku Deploy): Execute `./bin/rebuild-all.sh`, compile all packages, update Docker container image, verify healthy operational status on `/api/status`, and push cleanly to origin and gitea remotes without deploying to Heroku. [Files: bin/rebuild-all.sh] [Test: ./bin/rebuild-all.sh]

- [ ] T102.1.18: Write unit tests verifying `ConversationTimelineComponent` role badges, markdown snippet formatting, and auto-scroll to bottom. [Files: packages/frontend/src/app/components/conversation-timeline/conversation-timeline.component.ts, packages/frontend/src/app/components/conversation-timeline/conversation-timeline.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.19: Write unit tests verifying `ExecutionModeSelectorComponent` autonomous vs supervised mode switching and indicator badges. [Files: packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.ts, packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.20: Write unit tests verifying `GanttTransportComponent` stage span bar scaling, zoom level adjustments, and hover tooltip positioning. [Files: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.ts, packages/frontend/src/app/components/gantt-transport/gantt-transport.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.2.1: Write unit tests verifying `AmdVegaTelemetryProvider` sysfs path discovery, missing node handling, and APU fallback metrics. [Files: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts, packages/engine/src/tests/amd_vega_telemetry.test.ts] [Test: node --test packages/engine/dist/tests/amd_vega_telemetry.test.js]
- [x] T102.2.2: Write unit tests verifying `ModelVramCatalog` model parameter footprint sizing across 3B, 7B, 8B, 14B, and 16B parameter scales with dynamic context window limits. [Files: packages/engine/src/hardware/ModelVramCatalog.ts, packages/engine/src/tests/model_vram_catalog.test.ts] [Test: node --test packages/engine/dist/tests/model_vram_catalog.test.js]
- [ ] T102.2.3: Write unit tests verifying `ThermalGovernor` throttling state transitions, cooldown timers, and recovery thresholds under fluctuating sensor readings. [Files: packages/engine/src/telemetry/ThermalGovernor.ts, packages/engine/src/tests/thermal_governor.test.ts] [Test: node --test packages/engine/dist/tests/thermal_governor.test.js]
- [x] T102.2.4: Write unit tests verifying `RateLimiter` client IP tracking, sliding window expiry, and HTTP 429 rejection responses. [Files: packages/engine/src/daemon/RateLimiter.ts, packages/engine/src/tests/rate_limiter.test.ts] [Test: node --test packages/engine/dist/tests/rate_limiter.test.js]
- [ ] T102.2.5: Write unit tests verifying `JwtValidator` HS256 signature verification, expired token rejection, and malformed payload handling. [Files: packages/engine/src/auth/JwtValidator.ts, packages/engine/src/tests/jwt_validator.test.ts] [Test: node --test packages/engine/dist/tests/jwt_validator.test.js]
- [ ] T102.2.6: Write unit tests verifying `CpuFallbackProvider` proc/cpuinfo parsing, core frequency calculation, and synthetic thermal modeling. [Files: packages/engine/src/telemetry/CpuFallbackProvider.ts, packages/engine/src/tests/cpu_fallback_provider.test.ts] [Test: node --test packages/engine/dist/tests/cpu_fallback_provider.test.js]
- [ ] T102.2.7: Write unit tests verifying `HardwareProviderFactory` auto-detection precedence (amdgpu sysfs, nvidia-smi nvml, cpu fallback). [Files: packages/engine/src/telemetry/HardwareProviderFactory.ts, packages/engine/src/tests/hardware_provider_factory.test.ts] [Test: node --test packages/engine/dist/tests/hardware_provider_factory.test.js]
- [ ] T102.2.8: Write unit tests verifying `NvidiaSmiParser` XML/CSV query output parsing, VRAM allocation extraction, and temperature reading. [Files: packages/engine/src/telemetry/NvidiaSmiParser.ts, packages/engine/src/tests/nvidia_smi_parser.test.ts] [Test: node --test packages/engine/dist/tests/nvidia_smi_parser.test.js]
- [ ] T102.2.9: Write unit tests verifying `PrometheusMetricsExporter` metric name formatting, label escaping, and counter/gauge incrementing. [Files: packages/engine/src/telemetry/PrometheusMetricsExporter.ts, packages/engine/src/tests/prometheus_metrics_exporter.test.ts] [Test: node --test packages/engine/dist/tests/prometheus_metrics_exporter.test.js]
- [ ] T102.2.10: Write unit tests verifying `TelemetryCorrelationService` rolling window buffer management, correlation coefficient calculations, and anomaly flagging. [Files: packages/engine/src/telemetry/TelemetryCorrelationService.ts, packages/engine/src/tests/telemetry_correlation_service.test.ts] [Test: node --test packages/engine/dist/tests/telemetry_correlation_service.test.js]
- [x] T102.2.11: Write unit tests verifying `SystemToolScanner` binary discovery for git, ollama, curl, and docker in system PATH. [Files: packages/engine/src/hardware/SystemToolScanner.ts, packages/engine/src/tests/system_tool_scanner.test.ts] [Test: node --test packages/engine/dist/tests/system_tool_scanner.test.js]
- [ ] T102.2.12: Write unit tests verifying `GpuDeviceManager` multi-device enumeration, device selection by free VRAM, and health state query. [Files: packages/engine/src/hardware/GpuDeviceManager.ts, packages/engine/src/tests/gpu_device_manager.test.ts] [Test: node --test packages/engine/dist/tests/gpu_device_manager.test.js]
- [ ] T102.2.13: Write unit tests verifying `ComputeHardwareProfile` profile serialization, capacity rating, and memory headroom validation. [Files: packages/engine/src/hardware/ComputeHardwareProfile.ts, packages/engine/src/tests/compute_hardware_profile.test.ts] [Test: node --test packages/engine/dist/tests/compute_hardware_profile.test.js]
- [ ] T102.2.14: Write unit tests verifying `HardwareDiscoveryEngine` APU vs discrete GPU classification and telemetry capability reporting. [Files: packages/engine/src/hardware/HardwareDiscoveryEngine.ts, packages/engine/src/tests/hardware_discovery_engine.test.ts] [Test: node --test packages/engine/dist/tests/hardware_discovery_engine.test.js]
- [ ] T102.3.1: Write unit tests verifying `GiteaPermissionGuard` repository permission role checks, token scopes, and unauthorized access rejection. [Files: packages/engine/src/gitea/GiteaPermissionGuard.ts, packages/engine/src/tests/gitea_permission_guard.test.ts] [Test: node --test packages/engine/dist/tests/gitea_permission_guard.test.js]
- [ ] T102.3.2: Write unit tests verifying `GitCheckpointManager` tree snapshot creation, tag naming, and rollback point indexing. [Files: packages/engine/src/gitea/GitCheckpointManager.ts, packages/engine/src/tests/git_checkpoint_manager.test.ts] [Test: node --test packages/engine/dist/tests/git_checkpoint_manager.test.js]
- [ ] T102.3.3: Write unit tests verifying `GitPlatformProviderFactory` provider selection based on environment configuration (Gitea vs GitHub). [Files: packages/engine/src/gitea/GitPlatformProviderFactory.ts, packages/engine/src/tests/git_platform_provider_factory.test.ts] [Test: node --test packages/engine/dist/tests/git_platform_provider_factory.test.js]
- [ ] T102.3.4: Write unit tests verifying `ReleaseBundlerService` changelog aggregation, semantic version bumping, and release note formatting. [Files: packages/engine/src/gitea/ReleaseBundlerService.ts, packages/engine/src/tests/release_bundler_service.test.ts] [Test: node --test packages/engine/dist/tests/release_bundler_service.test.js]
- [ ] T102.3.5: Write unit tests verifying `GitUndoManager` single-commit revert generation, dirty tree guard checks, and rollback safety. [Files: packages/engine/src/git/GitUndoManager.ts, packages/engine/src/tests/git_undo_manager.test.ts] [Test: node --test packages/engine/dist/tests/git_undo_manager.test.js]
- [ ] T102.3.6: Write unit tests verifying `GitCheckpointService` automated checkpoint intervals, hash deduplication, and retention pruning. [Files: packages/engine/src/git/GitCheckpointService.ts, packages/engine/src/tests/git_checkpoint_service.test.ts] [Test: node --test packages/engine/dist/tests/git_checkpoint_service.test.js]
- [ ] T102.4.1: Write unit tests verifying `FailureClassifier` error string pattern matching, category tagging (syntax, type, test, timeout), and priority scoring. [Files: packages/engine/src/analytics/FailureClassifier.ts, packages/engine/src/tests/failure_classifier.test.ts] [Test: node --test packages/engine/dist/tests/failure_classifier.test.js]
- [ ] T102.4.2: Write unit tests verifying `IncidentBundleRecorder` error context capture, stack trace truncation, and incident JSON serialization. [Files: packages/engine/src/analytics/IncidentBundleRecorder.ts, packages/engine/src/tests/incident_bundle_recorder.test.ts] [Test: node --test packages/engine/dist/tests/incident_bundle_recorder.test.js]
- [ ] T102.4.3: Write unit tests verifying `GitRegressionCorrelator` commit blame mapping, diff change set correlation, and offending commit detection. [Files: packages/engine/src/analytics/GitRegressionCorrelator.ts, packages/engine/src/tests/git_regression_correlator.test.ts] [Test: node --test packages/engine/dist/tests/git_regression_correlator.test.js]
- [ ] T102.4.4: Write unit tests verifying `RollingWindowAnalyticsService` moving window statistics, percentile latency calculation, and throughput aggregation. [Files: packages/engine/src/analytics/RollingWindowAnalyticsService.ts, packages/engine/src/tests/rolling_window_analytics.test.ts] [Test: node --test packages/engine/dist/tests/rolling_window_analytics.test.js]
- [ ] T102.5.1: Write unit tests verifying `EpsilonGreedyPolicy` exploration vs exploitation decision split, random choice distribution, and decaying epsilon. [Files: packages/engine/src/bandit/EpsilonGreedyPolicy.ts, packages/engine/src/tests/epsilon_greedy_policy.test.ts] [Test: node --test packages/engine/dist/tests/epsilon_greedy_policy.test.js]
- [ ] T102.5.2: Write unit tests verifying `ThompsonSamplingPolicy` beta distribution sampling, alpha/beta score updates, and model selection. [Files: packages/engine/src/bandit/ThompsonSamplingPolicy.ts, packages/engine/src/tests/thompson_sampling_policy.test.ts] [Test: node --test packages/engine/dist/tests/thompson_sampling_policy.test.js]
- [ ] T102.5.3: Write unit tests verifying `BanditTaskScheduler` arm selection, reward recording, and model performance convergence. [Files: packages/engine/src/bandit/BanditTaskScheduler.ts, packages/engine/src/tests/bandit_task_scheduler.test.ts] [Test: node --test packages/engine/dist/tests/bandit_task_scheduler.test.js]
- [ ] T102.6.1: Write unit tests verifying `AstSignatureAlignRule` method signature comparison, parameter count alignment, and missing return type warnings. [Files: packages/engine/src/rules/catalog/AstSignatureAlignRule.ts, packages/engine/src/tests/ast_signature_align_rule.test.ts] [Test: node --test packages/engine/dist/tests/ast_signature_align_rule.test.js]
- [ ] T102.6.2: Write unit tests verifying `FilePlacementAndNamingConventionRule` PascalCase component naming, kebab-case file paths, and placement validation. [Files: packages/engine/src/rules/catalog/FilePlacementAndNamingConventionRule.ts, packages/engine/src/tests/file_placement_rule.test.ts] [Test: node --test packages/engine/dist/tests/file_placement_rule.test.js]
- [ ] T102.6.3: Write unit tests verifying `BannedImportScrubberRule` forbidden package detection (jest, mocha, chai, lodash) and replacement recommendations. [Files: packages/engine/src/rules/catalog/BannedImportScrubberRule.ts, packages/engine/src/tests/banned_import_scrubber_rule.test.ts] [Test: node --test packages/engine/dist/tests/banned_import_scrubber_rule.test.js]
- [ ] T102.6.4: Write unit tests verifying `EmptyFileGuardRule` 0-byte file detection, whitespace-only file rejection, and minimum statement count checks. [Files: packages/engine/src/rules/catalog/EmptyFileGuardRule.ts, packages/engine/src/tests/empty_file_guard_rule.test.ts] [Test: node --test packages/engine/dist/tests/empty_file_guard_rule.test.js]
- [ ] T102.6.5: Write unit tests verifying `EnforceEsmJsExtensionRule` relative import statement inspection and automated `.js` extension injection. [Files: packages/engine/src/rules/catalog/EnforceEsmJsExtensionRule.ts, packages/engine/src/tests/enforce_esm_js_extension_rule.test.ts] [Test: node --test packages/engine/dist/tests/enforce_esm_js_extension_rule.test.js]
- [ ] T102.6.6: Write unit tests verifying `StripEmojisRule` Unicode emoji detection across code, comments, string literals, and template files. [Files: packages/engine/src/rules/catalog/StripEmojisRule.ts, packages/engine/src/tests/strip_emojis_rule.test.ts] [Test: node --test packages/engine/dist/tests/strip_emojis_rule.test.js]
- [ ] T102.6.7: Write unit tests verifying `WhitespaceAndEolNormalizerRule` mixed CRLF/LF normalization, trailing whitespace stripping, and final newline enforcement. [Files: packages/engine/src/rules/catalog/WhitespaceAndEolNormalizerRule.ts, packages/engine/src/tests/whitespace_normalizer_rule.test.ts] [Test: node --test packages/engine/dist/tests/whitespace_normalizer_rule.test.js]
- [ ] T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement guard, rejection of unauthorized root files, and subfolder routing. [Files: packages/engine/src/rules/catalog/LooseRootFileGuardRule.ts, packages/engine/src/tests/loose_root_file_guard_rule.test.ts] [Test: node --test packages/engine/dist/tests/loose_root_file_guard_rule.test.js]
- [ ] T102.6.9: Write unit tests verifying `RulePipelineEngine` sequential rule execution, change set accumulation, and short-circuit on fatal violation. [Files: packages/engine/src/rules/RulePipelineEngine.ts, packages/engine/src/tests/rule_pipeline_engine.test.ts] [Test: node --test packages/engine/dist/tests/rule_pipeline_engine.test.js]
- [ ] T102.7.1: Write unit tests verifying `AuthentikOAuthProvider` authorization URL construction, state parameter verification, and token exchange. [Files: packages/engine/src/auth/AuthentikOAuthProvider.ts, packages/engine/src/tests/authentik_oauth_provider.test.ts] [Test: node --test packages/engine/dist/tests/authentik_oauth_provider.test.js]
- [ ] T102.7.2: Write unit tests verifying `AutheliaSsoProvider` forward auth header extraction (`Remote-User`, `Remote-Groups`), and user profile construction. [Files: packages/engine/src/auth/AutheliaSsoProvider.ts, packages/engine/src/tests/authelia_sso_provider.test.ts] [Test: node --test packages/engine/dist/tests/authelia_sso_provider.test.js]
- [ ] T102.7.3: Write unit tests verifying `LocalBypassSsoProvider` mock user injection, demo credentials validation, and role assignment. [Files: packages/engine/src/auth/LocalBypassSsoProvider.ts, packages/engine/src/tests/local_bypass_sso_provider.test.ts] [Test: node --test packages/engine/dist/tests/local_bypass_sso_provider.test.js]
- [ ] T102.7.4: Write unit tests verifying `OidcDiscoveryService` well-known configuration endpoint fetch, jwks_uri extraction, and cache expiration. [Files: packages/engine/src/auth/OidcDiscoveryService.ts, packages/engine/src/tests/oidc_discovery_service.test.ts] [Test: node --test packages/engine/dist/tests/oidc_discovery_service.test.js]
- [ ] T102.7.5: Write unit tests verifying `SsoProviderFactory` provider selection based on SSO_PROVIDER environment variable. [Files: packages/engine/src/auth/SsoProviderFactory.ts, packages/engine/src/tests/sso_provider_factory.test.ts] [Test: node --test packages/engine/dist/tests/sso_provider_factory.test.js]
- [ ] T102.8.1: Write unit tests verifying `StructuredTestOutputParser` pass/fail counter extraction, test duration parsing, and failure reason isolation. [Files: packages/engine/src/testing/StructuredTestOutputParser.ts, packages/engine/src/tests/structured_test_output_parser.test.ts] [Test: node --test packages/engine/dist/tests/structured_test_output_parser.test.js]
- [ ] T102.8.2: Write unit tests verifying `TestFailureTriager` classification of syntax vs assertion vs timeout failures and suggested remediation strategies. [Files: packages/engine/src/testing/TestFailureTriager.ts, packages/engine/src/tests/test_failure_triager.test.ts] [Test: node --test packages/engine/dist/tests/test_failure_triager.test.js]
- [ ] T102.8.3: Write unit tests verifying `SandboxedProcessRunner` timeout termination, memory usage capping, and exit code propagation. [Files: packages/engine/src/testing/SandboxedProcessRunner.ts, packages/engine/src/tests/sandboxed_process_runner.test.ts] [Test: node --test packages/engine/dist/tests/sandboxed_process_runner.test.js]
- [ ] T102.8.4: Write unit tests verifying `BackgroundTestWorkerPool` worker allocation, queue concurrency limits, and idle worker recycling. [Files: packages/engine/src/testing/BackgroundTestWorkerPool.ts, packages/engine/src/tests/background_test_worker_pool.test.ts] [Test: node --test packages/engine/dist/tests/background_test_worker_pool.test.js]
- [ ] T102.8.5: Write unit tests verifying `DiagnosticPreFlightChecker` syntax check execution before running full test suites. [Files: packages/engine/src/testing/DiagnosticPreFlightChecker.ts, packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts] [Test: node --test packages/engine/dist/tests/diagnostic_pre_flight_checker.test.js]
- [ ] T102.8.6: Write unit tests verifying `StubCommentSanitizer` detection and cleaning of temporary test stubs and placeholder assertions. [Files: packages/engine/src/testing/StubCommentSanitizer.ts, packages/engine/src/tests/stub_comment_sanitizer.test.ts] [Test: node --test packages/engine/dist/tests/stub_comment_sanitizer.test.js]
- [ ] T102.8.7: Write unit tests verifying `TestRunnerDetector` framework auto-detection (node:test, vitest, ng test) from package.json and project files. [Files: packages/engine/src/testing/TestRunnerDetector.ts, packages/engine/src/tests/test_runner_detector.test.ts] [Test: node --test packages/engine/dist/tests/test_runner_detector.test.js]
- [ ] T102.9.1: Write unit tests verifying `RustSignatureHarvester` struct, enum, and trait function signature parsing. [Files: packages/engine/src/signature/RustSignatureHarvester.ts, packages/engine/src/tests/rust_signature_harvester.test.ts] [Test: node --test packages/engine/dist/tests/rust_signature_harvester.test.js]
- [ ] T102.9.2: Write unit tests verifying `GoSignatureHarvester` interface, struct, and exported function signature parsing. [Files: packages/engine/src/signature/GoSignatureHarvester.ts, packages/engine/src/tests/go_signature_harvester.test.ts] [Test: node --test packages/engine/dist/tests/go_signature_harvester.test.js]
- [ ] T102.9.3: Write unit tests verifying `SignatureAlignmentScrubber` cross-language signature comparison and drift warning emission. [Files: packages/engine/src/signature/SignatureAlignmentScrubber.ts, packages/engine/src/tests/signature_alignment_scrubber.test.ts] [Test: node --test packages/engine/dist/tests/signature_alignment_scrubber.test.js]
- [ ] T102.9.4: Write unit tests verifying `SignatureStore` signature caching, indexed lookup by symbol name, and invalidation on file edits. [Files: packages/engine/src/signature/SignatureStore.ts, packages/engine/src/tests/signature_store.test.ts] [Test: node --test packages/engine/dist/tests/signature_store.test.js]
- [ ] T102.10.1: Write unit tests verifying `LspDiagnosticIngestor` LSP publishDiagnostics notification parsing and diagnostic severity mapping. [Files: packages/engine/src/lsp/LspDiagnosticIngestor.ts, packages/engine/src/tests/lsp_diagnostic_ingestor.test.ts] [Test: node --test packages/engine/dist/tests/lsp_diagnostic_ingestor.test.js]
- [ ] T102.10.2: Write unit tests verifying `LspProcessSupervisor` language server spawn, stdio JSON-RPC communication, and graceful process shutdown. [Files: packages/engine/src/lsp/LspProcessSupervisor.ts, packages/engine/src/tests/lsp_process_supervisor.test.ts] [Test: node --test packages/engine/dist/tests/lsp_process_supervisor.test.js]
- [ ] T102.10.3: Write unit tests verifying `LspDetector` language server binary discovery (typescript-language-server, rust-analyzer, gopls). [Files: packages/engine/src/lsp/LspDetector.ts, packages/engine/src/tests/lsp_detector.test.ts] [Test: node --test packages/engine/dist/tests/lsp_detector.test.js]
- [ ] T102.11.1: Write unit tests verifying `UserSessionRepository` session creation, token lookup, touch activity timestamp, and expired session purge. [Files: packages/db/src/repositories/UserSessionRepository.ts, packages/db/src/tests/user_session_repository.test.ts] [Test: node --test packages/db/dist/tests/user_session_repository.test.js]
- [ ] T102.11.2: Write unit tests verifying `TestExecutionRepository` run recording, status filtering, and test duration aggregation. [Files: packages/db/src/repositories/TestExecutionRepository.ts, packages/db/src/tests/test_execution_repository.test.ts] [Test: node --test packages/db/dist/tests/test_execution_repository.test.js]
- [ ] T102.11.3: Write unit tests verifying `VaultRepository` secret encryption key storage, secret retrieval by key name, and deletion. [Files: packages/db/src/repositories/VaultRepository.ts, packages/db/src/tests/vault_repository.test.ts] [Test: node --test packages/db/dist/tests/vault_repository.test.js]
- [ ] T102.11.4: Write unit tests verifying `ModelHealthRepository` heartbeat logging, error rate calculation, and eviction trigger thresholds. [Files: packages/db/src/repositories/ModelHealthRepository.ts, packages/db/src/tests/model_health_repository.test.ts] [Test: node --test packages/db/dist/tests/model_health_repository.test.js]
- [ ] T102.11.5: Write unit tests verifying `TaskTelemetryCorrelationRepository` metric point insertion, time-range querying, and correlation rollup. [Files: packages/db/src/repositories/TaskTelemetryCorrelationRepository.ts, packages/db/src/tests/task_telemetry_correlation_repository.test.ts] [Test: node --test packages/db/dist/tests/task_telemetry_correlation_repository.test.js]
- [ ] T102.11.6: Write unit tests verifying `TelemetryRepository` hardware sample batch insertion, temperature peak querying, and retention pruning. [Files: packages/db/src/repositories/TelemetryRepository.ts, packages/db/src/tests/telemetry_repository.test.ts] [Test: node --test packages/db/dist/tests/telemetry_repository.test.js]
- [ ] T102.11.7: Write unit tests verifying `ModelRegistryRepository` model registration, active/disabled flag toggles, and context size indexing. [Files: packages/db/src/repositories/ModelRegistryRepository.ts, packages/db/src/tests/model_registry_repository.test.ts] [Test: node --test packages/db/dist/tests/model_registry_repository.test.js]
- [ ] T102.11.8: Write unit tests verifying `RepositorySymbolRepository` symbol graph node upserts, edge relationships, and file path invalidation. [Files: packages/db/src/repositories/RepositorySymbolRepository.ts, packages/db/src/tests/repository_symbol_repository.test.ts] [Test: node --test packages/db/dist/tests/repository_symbol_repository.test.js]
- [ ] T102.11.9: Write unit tests verifying `StackProfileRepository` framework profile persistence, rule overrides, and default runner lookup. [Files: packages/db/src/repositories/StackProfileRepository.ts, packages/db/src/tests/stack_profile_repository.test.ts] [Test: node --test packages/db/dist/tests/stack_profile_repository.test.js]
- [ ] T102.11.10: Write unit tests verifying `GitCheckpointRepository` checkpoint creation, SHA retrieval, and parent commit tracking. [Files: packages/db/src/repositories/GitCheckpointRepository.ts, packages/db/src/tests/git_checkpoint_repository.test.ts] [Test: node --test packages/db/dist/tests/git_checkpoint_repository.test.js]
- [ ] T102.11.11: Write unit tests verifying `LspDiagnosticRepository` diagnostic record batch upsert, severity filtering, and error grouping. [Files: packages/db/src/repositories/LspDiagnosticRepository.ts, packages/db/src/tests/lsp_diagnostic_repository.test.ts] [Test: node --test packages/db/dist/tests/lsp_diagnostic_repository.test.js]
- [ ] T102.11.12: Write unit tests verifying `DatabaseMaintenanceService` WAL checkpoint triggering, vacuum execution, and retention pruning thresholds. [Files: packages/db/src/services/DatabaseMaintenanceService.ts, packages/db/src/tests/database_maintenance_service.test.ts] [Test: node --test packages/db/dist/tests/database_maintenance_service.test.js]
- [ ] T102.12.1: Write unit tests verifying `AstInspectTool` TypeScript AST inspection, class declaration discovery, and method node extraction. [Files: packages/tools/src/implementations/AstInspectTool.ts, packages/tools/src/tests/ast_inspect_tool.test.ts] [Test: node --test packages/tools/dist/tests/ast_inspect_tool.test.js]
- [ ] T102.12.2: Write unit tests verifying `LocateFeatureTool` fuzzy token search, symbol location ranking, and workspace scoping. [Files: packages/tools/src/implementations/LocateFeatureTool.ts, packages/tools/src/tests/locate_feature_tool.test.ts] [Test: node --test packages/tools/dist/tests/locate_feature_tool.test.js]
- [ ] T102.12.3: Write unit tests verifying `MultiReplaceFileContentTool` multi-chunk replacement atomicity, offset recalculation, and rollback on mismatch. [Files: packages/tools/src/implementations/MultiReplaceFileContentTool.ts, packages/tools/src/tests/multi_replace_file_content_tool.test.ts] [Test: node --test packages/tools/dist/tests/multi_replace_file_content_tool.test.js]
- [ ] T102.12.4: Write unit tests verifying `ReplaceFileContentTool` single chunk replacement, exact whitespace matching, and error on ambiguity. [Files: packages/tools/src/implementations/ReplaceFileContentTool.ts, packages/tools/src/tests/replace_file_content_tool.test.ts] [Test: node --test packages/tools/dist/tests/replace_file_content_tool.test.js]
- [ ] T102.12.5: Write unit tests verifying `WriteToFileTool` file creation, overwrite prevention flags, and automatic directory tree creation. [Files: packages/tools/src/implementations/WriteToFileTool.ts, packages/tools/src/tests/write_to_file_tool.test.ts] [Test: node --test packages/tools/dist/tests/write_to_file_tool.test.js]
- [ ] T102.12.6: Write unit tests verifying `ViewFileTool` line slicing, windowed viewing, byte offset limits, and binary file prevention. [Files: packages/tools/src/implementations/ViewFileTool.ts, packages/tools/src/tests/view_file_tool.test.ts] [Test: node --test packages/tools/dist/tests/view_file_tool.test.js]
- [ ] T102.12.7: Write unit tests verifying `ListDirTool` recursive directory listing, child counts, hidden file filtering, and path resolution. [Files: packages/tools/src/implementations/ListDirTool.ts, packages/tools/src/tests/list_dir_tool.test.ts] [Test: node --test packages/tools/dist/tests/list_dir_tool.test.js]
- [ ] T102.12.8: Write unit tests verifying `GrepSearchTool` ripgrep execution, glob filtering, line number inclusion, and match capping. [Files: packages/tools/src/implementations/GrepSearchTool.ts, packages/tools/src/tests/grep_search_tool.test.ts] [Test: node --test packages/tools/dist/tests/grep_search_tool.test.js]
- [ ] T102.12.9: Write unit tests verifying `RunCommandTool` command execution, timeout termination, exit code capture, and output truncation. [Files: packages/tools/src/implementations/RunCommandTool.ts, packages/tools/src/tests/run_command_tool.test.ts] [Test: node --test packages/tools/dist/tests/run_command_tool.test.js]
- [ ] T102.12.10: Write unit tests verifying `RegexTool` regular expression compilation, multiline matches, capture group extraction, and safety timeouts. [Files: packages/tools/src/implementations/RegexTool.ts, packages/tools/src/tests/regex_tool.test.ts] [Test: node --test packages/tools/dist/tests/regex_tool.test.js]
- [ ] T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf, mkfs, dd), path traversal prevention, and shell injection escaping. [Files: packages/tools/src/security/ExecutionGuard.ts, packages/tools/src/tests/execution_guard.test.ts] [Test: node --test packages/tools/dist/tests/execution_guard.test.js]
- [ ] T102.12.12: Write unit tests verifying `ToolRegistry` dynamic tool registration, schema validation, tool execution dispatch, and unknown tool error handling. [Files: packages/tools/src/ToolRegistry.ts, packages/tools/src/tests/tool_registry.test.ts] [Test: node --test packages/tools/dist/tests/tool_registry.test.js]
- [ ] T102.13.1: Write unit tests verifying `TaskApiService` task list fetching, task cancellation dispatch, manual task enqueue, and error mapping. [Files: packages/frontend/src/app/services/task-api.service.ts, packages/frontend/src/app/services/task-api.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.2: Write unit tests verifying `RepoStateService` branch listing, diff fetching, file tree navigation, and active commit tracking. [Files: packages/frontend/src/app/services/repo-state.service.ts, packages/frontend/src/app/services/repo-state.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.3: Write unit tests verifying `ModelFleetService` model telemetry polling, status updating, model pull invocation, and latency tracking. [Files: packages/frontend/src/app/services/model-fleet.service.ts, packages/frontend/src/app/services/model-fleet.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.4: Write unit tests verifying `AuthService` token storage, authenticated state Signal derivation, login redirection, and logout clearing. [Files: packages/frontend/src/app/services/auth.service.ts, packages/frontend/src/app/services/auth.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.5: Write unit tests verifying `HistoryMetricsService` epoch statistics rollup, success rate computation, and filter query parameters. [Files: packages/frontend/src/app/services/history-metrics.service.ts, packages/frontend/src/app/services/history-metrics.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.6: Write unit tests verifying `ReactiveSignalService` WebSocket event handling, Signal stream updates, and reconnection backoff. [Files: packages/frontend/src/app/services/reactive-signal.service.ts, packages/frontend/src/app/services/reactive-signal.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.7: Write unit tests verifying `GiteaAuthGuard` route activation allowing authenticated users and redirecting unauthenticated users to login. [Files: packages/frontend/src/app/guards/gitea-auth.guard.ts, packages/frontend/src/app/guards/gitea-auth.guard.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.8: Write unit tests verifying `QueueViewComponent` task filtering, bulk task actions, and responsive layout adaptations. [Files: packages/frontend/src/app/components/views/queue-view.component.ts, packages/frontend/src/app/components/views/queue-view.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.9: Write unit tests verifying `ProcessesViewComponent` process table sorting, CPU/memory metric display, and process termination dispatch. [Files: packages/frontend/src/app/components/views/processes-view.component.ts, packages/frontend/src/app/components/views/processes-view.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.10: Write unit tests verifying `RepomapViewComponent` SVG graph rendering, zoom/pan controls, and symbol node search. [Files: packages/frontend/src/app/components/views/repomap-view.component.ts, packages/frontend/src/app/components/views/repomap-view.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.14.1: Write unit tests verifying `HashStubGenerator` method body hashing, stub comment generation, and idempotence. [Files: packages/engine/src/context/HashStubGenerator.ts, packages/engine/src/tests/hash_stub_generator.test.ts] [Test: node --test packages/engine/dist/tests/hash_stub_generator.test.js]
- [ ] T102.14.2: Write unit tests verifying `AstContextSlicer` AST depth limiting, interface preservation, and irrelevant method pruning. [Files: packages/engine/src/context/AstContextSlicer.ts, packages/engine/src/tests/ast_context_slicer.test.ts] [Test: node --test packages/engine/dist/tests/ast_context_slicer.test.js]
- [ ] T102.14.3: Write unit tests verifying `DeterministicImportInjector` missing import resolution, duplicate prevention, and import sorting. [Files: packages/engine/src/context/DeterministicImportInjector.ts, packages/engine/src/tests/deterministic_import_injector.test.ts] [Test: node --test packages/engine/dist/tests/deterministic_import_injector.test.js]
- [ ] T102.14.4: Write unit tests verifying `ImportPruningEngine` unused import detection, side-effect import preservation, and multi-line import cleanup. [Files: packages/engine/src/context/ImportPruningEngine.ts, packages/engine/src/tests/import_pruning_engine.test.ts] [Test: node --test packages/engine/dist/tests/import_pruning_engine.test.js]
- [ ] T102.14.5: Write unit tests verifying `FocusedDiffBuilder` hunk generation, line offset alignment, and context margin formatting. [Files: packages/engine/src/context/FocusedDiffBuilder.ts, packages/engine/src/tests/focused_diff_builder.test.ts] [Test: node --test packages/engine/dist/tests/focused_diff_builder.test.js]
- [ ] T102.14.6: Write unit tests verifying `ContextRecommender` related file scoring based on import graph proximity and recent commit co-edits. [Files: packages/engine/src/context/ContextRecommender.ts, packages/engine/src/tests/context_recommender.test.ts] [Test: node --test packages/engine/dist/tests/context_recommender.test.js]
- [ ] T102.14.7: Write unit tests verifying `IncrementalClassMerger` class member addition, existing method preservation, and decorator handling. [Files: packages/engine/src/context/IncrementalClassMerger.ts, packages/engine/src/tests/incremental_class_merger.test.ts] [Test: node --test packages/engine/dist/tests/incremental_class_merger.test.js]
- [ ] T102.14.8: Write unit tests verifying `MultiFileEditCoordinator` atomic multi-file staged writes, rollback on write error, and lock acquisition. [Files: packages/engine/src/context/MultiFileEditCoordinator.ts, packages/engine/src/tests/multi_file_edit_coordinator.test.ts] [Test: node --test packages/engine/dist/tests/multi_file_edit_coordinator.test.js]
- [ ] T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, context budget clamping, and template validation. [Files: packages/engine/src/refactoring/SlotFillPromptBuilder.ts, packages/engine/src/tests/slot_fill_prompt_builder.test.ts] [Test: node --test packages/engine/dist/tests/slot_fill_prompt_builder.test.js]
- [ ] T102.14.10: Write unit tests verifying `TypeScriptMethodSplicer` method replacement by AST node match, comment retention, and indentation alignment. [Files: packages/engine/src/refactoring/TypeScriptMethodSplicer.ts, packages/engine/src/tests/typescript_method_splicer.test.ts] [Test: node --test packages/engine/dist/tests/typescript_method_splicer.test.js]
- [ ] T102.15.1: Write unit tests verifying `WorkspaceSymbolHarvester` recursive file crawling, ignore pattern filtering, and symbol indexing. [Files: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts, packages/engine/src/tests/workspace_symbol_harvester.test.ts] [Test: node --test packages/engine/dist/tests/workspace_symbol_harvester.test.js]
- [ ] T102.15.2: Write unit tests verifying `SymbolGraphBuilder` symbol dependency graph construction, cycle detection, and topological sorting. [Files: packages/engine/src/repomap/SymbolGraphBuilder.ts, packages/engine/src/tests/symbol_graph_builder.test.ts] [Test: node --test packages/engine/dist/tests/symbol_graph_builder.test.js]
- [ ] T102.15.3: Write unit tests verifying `SymbolExtractor` interface, function, and variable extraction across TypeScript files. [Files: packages/engine/src/repomap/SymbolExtractor.ts, packages/engine/src/tests/symbol_extractor.test.ts] [Test: node --test packages/engine/dist/tests/symbol_extractor.test.js]
- [ ] T102.15.4: Write unit tests verifying `RepoMapGenerator` PageRank symbol importance scoring, Markdown summary formatting, and token budgeting. [Files: packages/engine/src/repomap/RepoMapGenerator.ts, packages/engine/src/tests/repo_map_generator.test.ts] [Test: node --test packages/engine/dist/tests/repo_map_generator.test.js]
- [ ] T102.15.5: Write unit tests verifying `SymbolGraph` node insertion, edge querying, neighbor traversal, and connected component isolation. [Files: packages/engine/src/repomap/SymbolGraph.ts, packages/engine/src/tests/symbol_graph.test.ts] [Test: node --test packages/engine/dist/tests/symbol_graph.test.js]
- [ ] T102.15.6: Write unit tests verifying `MethodEditAdapter` diff application, boundary validation, and error reporting on target not found. [Files: packages/engine/src/refactoring/MethodEditAdapter.ts, packages/engine/src/tests/method_edit_adapter.test.ts] [Test: node --test packages/engine/dist/tests/method_edit_adapter.test.js]
- [ ] T102.15.7: Write unit tests verifying `HashStubMethodSplicer` hash comparison, change detection, and stub replacement. [Files: packages/engine/src/context/HashStubMethodSplicer.ts, packages/engine/src/tests/hash_stub_method_splicer.test.ts] [Test: node --test packages/engine/dist/tests/hash_stub_method_splicer.test.js]
- [ ] T102.15.8: Write unit tests verifying `ContextManager` multi-source context assembly, priority ordering, and cache eviction. [Files: packages/engine/src/context/ContextManager.ts, packages/engine/src/tests/context_manager.test.ts] [Test: node --test packages/engine/dist/tests/context_manager.test.js]
- [ ] T102.16.1: Write unit tests verifying `FleetMasterCoordinator` remote worker heartbeat tracking, task dispatch distribution, and timeout failover. [Files: packages/engine/src/fleet/FleetMasterCoordinator.ts, packages/engine/src/tests/fleet_master_coordinator.test.ts] [Test: node --test packages/engine/dist/tests/fleet_master_coordinator.test.js]
- [ ] T102.16.2: Write unit tests verifying `FleetWebSocketClient` connection lifecycle, handshake message exchange, and heartbeat transmission. [Files: packages/engine/src/fleet/FleetWebSocketClient.ts, packages/engine/src/tests/fleet_websocket_client.test.ts] [Test: node --test packages/engine/dist/tests/fleet_websocket_client.test.js]
- [ ] T102.16.3: Write unit tests verifying `FleetHealthMonitor` unhealthy node detection, eviction triggers, and recovery state notifications. [Files: packages/engine/src/fleet/FleetHealthMonitor.ts, packages/engine/src/tests/fleet_health_monitor.test.ts] [Test: node --test packages/engine/dist/tests/fleet_health_monitor.test.js]
- [ ] T102.16.4: Write unit tests verifying `WorkspaceIsolationManager` ephemeral worktree creation, clean teardown, and git lock protection. [Files: packages/engine/src/isolation/WorkspaceIsolationManager.ts, packages/engine/src/tests/workspace_isolation_manager.test.ts] [Test: node --test packages/engine/dist/tests/workspace_isolation_manager.test.js]
- [ ] T102.16.5: Write unit tests verifying `ScreenBuffer` character cell grid updates, ANSI color styling, and dirty rect calculation. [Files: packages/engine/src/tui/ScreenBuffer.ts, packages/engine/src/tests/screen_buffer.test.ts] [Test: node --test packages/engine/dist/tests/screen_buffer.test.js]
- [ ] T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, and theme switching. [Files: packages/engine/src/tui/TuiTheme.ts, packages/engine/src/tests/tui_theme.test.ts] [Test: node --test packages/engine/dist/tests/tui_theme.test.js]
- [ ] T102.16.7: Write unit tests verifying `TuiPanes` split pane layout calculation, focus navigation, and pane resize events. [Files: packages/engine/src/tui/TuiPanes.ts, packages/engine/src/tests/tui_panes.test.ts] [Test: node --test packages/engine/dist/tests/tui_panes.test.js]
- [ ] T102.16.8: Write unit tests verifying `TerminalApp` key event handling, render loop throttling, and clean terminal exit. [Files: packages/engine/src/tui/TerminalApp.ts, packages/engine/src/tests/terminal_app.test.ts] [Test: node --test packages/engine/dist/tests/terminal_app.test.js]
- [ ] T102.17.1: Write unit tests verifying `StochasticHyperparameterOptimizer` temperature perturbation, prompt variation sampling, and score comparison. [Files: packages/engine/src/optimization/StochasticHyperparameterOptimizer.ts, packages/engine/src/tests/stochastic_hyperparameter_optimizer.test.ts] [Test: node --test packages/engine/dist/tests/stochastic_hyperparameter_optimizer.test.js]
- [ ] T102.17.2: Write unit tests verifying `HistoricalArenaIngestionAdapter` task outcome record ingestion, metric parsing, and database batch staging. [Files: packages/engine/src/optimization/HistoricalArenaIngestionAdapter.ts, packages/engine/src/tests/historical_arena_ingestion_adapter.test.ts] [Test: node --test packages/engine/dist/tests/historical_arena_ingestion_adapter.test.js]
- [ ] T102.17.3: Write unit tests verifying `DatasetVersionMigrator` schema version validation, transformation rule application, and rollback checkpoints. [Files: packages/engine/src/optimization/DatasetVersionMigrator.ts, packages/engine/src/tests/dataset_version_migrator.test.ts] [Test: node --test packages/engine/dist/tests/dataset_version_migrator.test.js]
- [ ] T102.17.4: Write unit tests verifying `RuleBacktestRunner` historical task playback against candidate rule sets, false positive/negative counting, and report generation. [Files: packages/engine/src/optimization/RuleBacktestRunner.ts, packages/engine/src/tests/rule_backtest_runner.test.ts] [Test: node --test packages/engine/dist/tests/rule_backtest_runner.test.js]
- [ ] T102.17.5: Write unit tests verifying `CommitImpactTracker` commit-to-test pass correlation, regression blame attribution, and stability score computation. [Files: packages/engine/src/analytics/CommitImpactTracker.ts, packages/engine/src/tests/commit_impact_tracker.test.ts] [Test: node --test packages/engine/dist/tests/commit_impact_tracker.test.js]
- [ ] T102.17.6: Write unit tests verifying `PlateauInterventionDispatcher` stagnation detection across sliding windows and intervention trigger dispatches. [Files: packages/engine/src/analytics/PlateauInterventionDispatcher.ts, packages/engine/src/tests/plateau_intervention_dispatcher.test.ts] [Test: node --test packages/engine/dist/tests/plateau_intervention_dispatcher.test.js]

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

### Task regr-mvkj9fzm-hsgj Rehabilitation [2026-10-24T00:39:39.092Z]
- **Parent Task**: [TDD Regression] should handle valid input (`regr-mvkj9fzm-hsgj`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvkj9fzm-hsgj.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle valid input [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]
  - [ ] `regr-mvkj9fzm-hsgj.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle valid input [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]


### Task regr-mvir6w91-8i42.1 Rehabilitation [2026-10-24T00:28:40.414Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] [22m[49m [30m[43m frontend [49m[39m src/app/services/auth.service.spec.ts[2m [ src/ (`regr-mvir6w91-8i42.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvir6w91-8i42.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] [22m[49m [30m[43m frontend [49m[39m src/app/services/auth.service.spec.ts[2m [ src/ [Role: test_engineer] [Files: packages/frontend/src/app/services/auth.service.spec.ts packages/frontend/src/app/services/auth.service.ts]
  - [ ] `regr-mvir6w91-8i42.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] [22m[49m [30m[43m frontend [49m[39m src/app/services/auth.service.spec.ts[2m [ src/ [Role: test_engineer] [Files: packages/frontend/src/app/services/auth.service.spec.ts packages/frontend/src/app/services/auth.service.ts]


### Task regr-mvir6w91-8i42.2 Rehabilitation [2026-10-24T00:08:52.088Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] [22m[49m [30m[43m frontend [49m[39m src/app/services/auth.service.spec.ts[2m [ src/ (`regr-mvir6w91-8i42.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvir6w91-8i42.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] [22m[49m [30m[43m frontend [49m[39m src/app/services/auth.service.spec.ts[2m [ src/ [Role: test_engineer] [Files: packages/frontend/src/app/services/auth.service.spec.ts packages/frontend/src/app/services/auth.service.ts]
  - [ ] `regr-mvir6w91-8i42.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] [22m[49m [30m[43m frontend [49m[39m src/app/services/auth.service.spec.ts[2m [ src/ [Role: test_engineer] [Files: packages/frontend/src/app/services/auth.service.spec.ts packages/frontend/src/app/services/auth.service.ts]


### Task regr-mvi907l6-y7fk.2 Rehabilitation [2026-10-23T20:49:38.348Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle methods with complex logic (`regr-mvi907l6-y7fk.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvi907l6-y7fk.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle methods with complex logic [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvi907l6-y7fk.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle methods with complex logic [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task taskcade-t102.13.7.2 Rehabilitation [2026-10-23T19:15:48.632Z]
- **Parent Task**: [Rehab 2/3] Core Implementation Unit: T102.13.7: Write unit tests verifying `GiteaAuthGuard` route activation allowing authentica (`taskcade-t102.13.7.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.13.7.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/3] Core Implementation Unit: T102.13.7: Write unit tests verifying `GiteaAuthGuard` route activation allowing authentica [Role: type_specialist] [Files: packages/frontend/src/app/guards/gitea-auth.guard.ts]
  - [ ] `taskcade-t102.13.7.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/3] Core Implementation Unit: T102.13.7: Write unit tests verifying `GiteaAuthGuard` route activation allowing authentica [Role: implementer] [Files: packages/frontend/src/app/guards/gitea-auth.guard.ts]


### Task regr-mvjl9p97-kulk.2 Rehabilitation [2026-10-23T19:12:07.902Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] packages/engine/dist/tests/tui_theme.test.js (`regr-mvjl9p97-kulk.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvjl9p97-kulk.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] packages/engine/dist/tests/tui_theme.test.js [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]
  - [x] `regr-mvjl9p97-kulk.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] packages/engine/dist/tests/tui_theme.test.js [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]


### Task regr-mvg3or7z-q82h.2.2.1 Rehabilitation [2026-10-23T18:48:40.106Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should retain comments during method replacement (`regr-mvg3or7z-q82h.2.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvg3or7z-q82h.2.2.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should retain comments during method replacement [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [x] `regr-mvg3or7z-q82h.2.2.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should retain comments during method replacement [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task regr-mvg9n3dy-cbef.2.1 Rehabilitation [2026-10-23T17:42:12.802Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correlate failure with a culprit commit (`regr-mvg9n3dy-cbef.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9n3dy-cbef.2.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correlate failure with a culprit commit [Role: test_engineer] [Files: packages/engine/src/tests/git_regression_correlator.test.ts packages/engine/src/analytics/GitRegressionCorrelator.ts]
  - [ ] `regr-mvg9n3dy-cbef.2.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correlate failure with a culprit commit [Role: test_engineer] [Files: packages/engine/src/tests/git_regression_correlator.test.ts packages/engine/src/analytics/GitRegressionCorrelator.ts]


### Task regr-mvjm9z9d-vb5j.2 Rehabilitation [2026-10-23T17:11:26.958Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] subfolder routing (`regr-mvjm9z9d-vb5j.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvjm9z9d-vb5j.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] subfolder routing [Role: test_engineer] [Files: packages/engine/src/tests/loose_root_file_guard_rule.test.ts]
  - [ ] `regr-mvjm9z9d-vb5j.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] subfolder routing [Role: test_engineer] [Files: packages/engine/src/tests/loose_root_file_guard_rule.test.ts]


### Task regr-mvg9n3dy-cbef.2.2 Rehabilitation [2026-10-23T16:08:46.966Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correlate failure with a culprit commit (`regr-mvg9n3dy-cbef.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9n3dy-cbef.2.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correlate failure with a culprit commit [Role: test_engineer] [Files: packages/engine/src/tests/git_regression_correlator.test.ts packages/engine/src/analytics/GitRegressionCorrelator.ts]
  - [ ] `regr-mvg9n3dy-cbef.2.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correlate failure with a culprit commit [Role: test_engineer] [Files: packages/engine/src/tests/git_regression_correlator.test.ts packages/engine/src/analytics/GitRegressionCorrelator.ts]


### Task regr-mvg9gvu4-tyjt.2.1 Rehabilitation [2026-10-23T15:26:52.743Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] blocks path traversal with .. (`regr-mvg9gvu4-tyjt.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu4-tyjt.2.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] blocks path traversal with .. [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu4-tyjt.2.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] blocks path traversal with .. [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvg9gvu4-tyjt.2.2 Rehabilitation [2026-10-23T15:13:24.585Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] blocks path traversal with .. (`regr-mvg9gvu4-tyjt.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu4-tyjt.2.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] blocks path traversal with .. [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu4-tyjt.2.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] blocks path traversal with .. [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvg9gvu8-bbfd.2.1 Rehabilitation [2026-10-23T14:47:10.044Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] path traversal prevention (`regr-mvg9gvu8-bbfd.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu8-bbfd.2.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu8-bbfd.2.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvg9gvu8-bbfd.2.2 Rehabilitation [2026-10-23T14:39:35.934Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] path traversal prevention (`regr-mvg9gvu8-bbfd.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu8-bbfd.2.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu8-bbfd.2.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvhduh5l-q5un.2 Rehabilitation [2026-10-23T13:44:48.705Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block dangerous commands (`regr-mvhduh5l-q5un.2`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `regr-mvhduh5l-q5un.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block dangerous commands [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvhduh5l-q5un.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block dangerous commands [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvhde30g-bd2k.2 Rehabilitation [2026-10-23T13:23:35.941Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block the "sudo" command (`regr-mvhde30g-bd2k.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvhde30g-bd2k.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block the "sudo" command [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvhde30g-bd2k.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block the "sudo" command [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvg9gvu8-bbfd.1.1 Rehabilitation [2026-10-23T12:47:29.365Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] path traversal prevention (`regr-mvg9gvu8-bbfd.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu8-bbfd.1.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu8-bbfd.1.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvg9gvu8-bbfd.1.2 Rehabilitation [2026-10-23T12:35:08.462Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] path traversal prevention (`regr-mvg9gvu8-bbfd.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu8-bbfd.1.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu8-bbfd.1.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvjo5b74-8kz4 Rehabilitation [2026-10-23T11:53:38.188Z]
- **Parent Task**: [TDD Regression] should handle single-line valid input (`regr-mvjo5b74-8kz4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvjo5b74-8kz4.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle single-line valid input [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]
  - [ ] `regr-mvjo5b74-8kz4.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle single-line valid input [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]


### Task taskcade-t102.2.12.2 Rehabilitation [2026-10-23T11:32:23.591Z]
- **Parent Task**: [Rehab 2/3] Core Implementation Unit: T102.2.12: Write unit tests verifying `GpuDeviceManager` multi-device enumeration, device s (`taskcade-t102.2.12.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.2.12.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/3] Core Implementation Unit: T102.2.12: Write unit tests verifying `GpuDeviceManager` multi-device enumeration, device s [Role: type_specialist] [Files: packages/engine/src/hardware/GpuDeviceManager.ts]
  - [ ] `taskcade-t102.2.12.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/3] Core Implementation Unit: T102.2.12: Write unit tests verifying `GpuDeviceManager` multi-device enumeration, device s [Role: implementer] [Files: packages/engine/src/hardware/GpuDeviceManager.ts]


### Task regr-mvjo5b6u-ipjw Rehabilitation [2026-10-23T10:52:11.424Z]
- **Parent Task**: [TDD Regression] should handle invalid input (`regr-mvjo5b6u-ipjw`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvjo5b6u-ipjw.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle invalid input [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]
  - [ ] `regr-mvjo5b6u-ipjw.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle invalid input [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]


### Task regr-mvhde306-gg36.2 Rehabilitation [2026-10-23T10:40:54.173Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block the "git clean -f" command (`regr-mvhde306-gg36.2`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `regr-mvhde306-gg36.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block the "git clean -f" command [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvhde306-gg36.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block the "git clean -f" command [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvhde306-gg36.1 Rehabilitation [2026-10-23T10:20:21.174Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should block the "git clean -f" command (`regr-mvhde306-gg36.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvhde306-gg36.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should block the "git clean -f" command [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvhde306-gg36.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should block the "git clean -f" command [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvjl9p97-kulk Rehabilitation [2026-10-23T08:03:52.145Z]
- **Parent Task**: [TDD Regression] packages/engine/dist/tests/tui_theme.test.js (`regr-mvjl9p97-kulk`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvjl9p97-kulk.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] packages/engine/dist/tests/tui_theme.test.js [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]
  - [ ] `regr-mvjl9p97-kulk.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] packages/engine/dist/tests/tui_theme.test.js [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]


### Task regr-mvjl7cv0-lrrg Rehabilitation [2026-10-23T07:39:55.860Z]
- **Parent Task**: [TDD Regression] TuiTheme Color Palette Definition (`regr-mvjl7cv0-lrrg`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `regr-mvjl7cv0-lrrg.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] TuiTheme Color Palette Definition [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]
  - [ ] `regr-mvjl7cv0-lrrg.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TuiTheme Color Palette Definition [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]


### Task regr-mvjl7cuw-6adl Rehabilitation [2026-10-23T07:11:35.997Z]
- **Parent Task**: [TDD Regression] should calculate contrast ratios correctly (`regr-mvjl7cuw-6adl`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvjl7cuw-6adl.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should calculate contrast ratios correctly [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]
  - [ ] `regr-mvjl7cuw-6adl.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should calculate contrast ratios correctly [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]


### Task regr-mvjcffnp-frqn Rehabilitation [2026-10-23T06:23:11.617Z]
- **Parent Task**: [TDD Regression] DiagnosticPreFlightChecker (`regr-mvjcffnp-frqn`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvjcffnp-frqn.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] DiagnosticPreFlightChecker [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]
  - [ ] `regr-mvjcffnp-frqn.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] DiagnosticPreFlightChecker [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]


### Task regr-mvjcffne-cqkb Rehabilitation [2026-10-23T05:40:49.100Z]
- **Parent Task**: [TDD Regression] should handle multi-line invalid input (`regr-mvjcffne-cqkb`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvjcffne-cqkb.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle multi-line invalid input [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]
  - [ ] `regr-mvjcffne-cqkb.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle multi-line invalid input [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]


### Task regr-mvir6w91-8i42 Rehabilitation [2026-10-23T04:48:35.710Z]
- **Parent Task**: [TDD Regression] [22m[49m [30m[43m frontend [49m[39m src/app/services/auth.service.spec.ts[2m [ src/ (`regr-mvir6w91-8i42`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvir6w91-8i42.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] [22m[49m [30m[43m frontend [49m[39m src/app/services/auth.service.spec.ts[2m [ src/ [Role: test_engineer] [Files: packages/frontend/src/app/services/auth.service.spec.ts packages/frontend/src/app/services/auth.service.ts]
  - [ ] `regr-mvir6w91-8i42.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] [22m[49m [30m[43m frontend [49m[39m src/app/services/auth.service.spec.ts[2m [ src/ [Role: test_engineer] [Files: packages/frontend/src/app/services/auth.service.spec.ts packages/frontend/src/app/services/auth.service.ts]


### Task regr-mvg3or7v-fx9z.2.2 Rehabilitation [2026-10-23T02:57:14.115Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TypeScriptMethodSplicer (`regr-mvg3or7v-fx9z.2.2`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg3or7v-fx9z.2.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TypeScriptMethodSplicer [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvg3or7v-fx9z.2.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TypeScriptMethodSplicer [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task regr-mvg3or7v-fx9z.2.1 Rehabilitation [2026-10-23T02:21:57.872Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TypeScriptMethodSplicer (`regr-mvg3or7v-fx9z.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg3or7v-fx9z.2.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TypeScriptMethodSplicer [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvg3or7v-fx9z.2.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TypeScriptMethodSplicer [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task regr-mvi907l1-ioi1 Rehabilitation [2026-10-23T00:09:31.068Z]
- **Parent Task**: [TDD Regression] should handle replacing a method with an empty body (`regr-mvi907l1-ioi1`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvi907l1-ioi1.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle replacing a method with an empty body [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvi907l1-ioi1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle replacing a method with an empty body [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task regr-mvi907l6-y7fk Rehabilitation [2026-10-22T23:43:37.339Z]
- **Parent Task**: [TDD Regression] should handle methods with complex logic (`regr-mvi907l6-y7fk`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvi907l6-y7fk.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle methods with complex logic [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvi907l6-y7fk.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle methods with complex logic [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task regr-mvg3or7z-q82h.2.2 Rehabilitation [2026-10-22T22:23:30.962Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should retain comments during method replacement (`regr-mvg3or7z-q82h.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg3or7z-q82h.2.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should retain comments during method replacement [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvg3or7z-q82h.2.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should retain comments during method replacement [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task taskcade-t102.12.11.3.1 Rehabilitation [2026-10-22T19:58:45.826Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf (`taskcade-t102.12.11.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.11.3.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts]
  - [ ] `taskcade-t102.12.11.3.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts]


### Task taskcade-t102.14.9.3 Rehabilitation [2026-10-22T19:50:30.540Z]
- **Parent Task**: [Rehab 3/3] Unit Test & Validation Suite: T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, conte (`taskcade-t102.14.9.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.14.9.3.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, conte [Role: test_engineer] [Files: packages/engine/src/tests/slot_fill_prompt_builder.test.ts]
  - [ ] `taskcade-t102.14.9.3.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, conte [Role: test_engineer] [Files: packages/engine/src/tests/slot_fill_prompt_builder.test.ts]


### Task regr-mvg9n3dy-cbef.2 Rehabilitation [2026-10-22T18:50:16.912Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correlate failure with a culprit commit (`regr-mvg9n3dy-cbef.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9n3dy-cbef.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correlate failure with a culprit commit [Role: test_engineer] [Files: packages/engine/src/tests/git_regression_correlator.test.ts packages/engine/src/analytics/GitRegressionCorrelator.ts]
  - [ ] `regr-mvg9n3dy-cbef.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correlate failure with a culprit commit [Role: test_engineer] [Files: packages/engine/src/tests/git_regression_correlator.test.ts packages/engine/src/analytics/GitRegressionCorrelator.ts]


### Task regr-mvjm9z9d-vb5j Rehabilitation [2026-10-22T18:27:02.263Z]
- **Parent Task**: [TDD Regression] subfolder routing (`regr-mvjm9z9d-vb5j`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvjm9z9d-vb5j.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] subfolder routing [Role: test_engineer] [Files: packages/engine/src/tests/loose_root_file_guard_rule.test.ts]
  - [ ] `regr-mvjm9z9d-vb5j.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] subfolder routing [Role: test_engineer] [Files: packages/engine/src/tests/loose_root_file_guard_rule.test.ts]


### Task regr-mvg9gvu4-tyjt.2 Rehabilitation [2026-10-22T17:37:05.301Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] blocks path traversal with .. (`regr-mvg9gvu4-tyjt.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu4-tyjt.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] blocks path traversal with .. [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu4-tyjt.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] blocks path traversal with .. [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvg9gvu8-bbfd.2 Rehabilitation [2026-10-22T17:06:10.956Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] path traversal prevention (`regr-mvg9gvu8-bbfd.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu8-bbfd.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu8-bbfd.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvhduh5l-q5un Rehabilitation [2026-10-22T16:29:48.887Z]
- **Parent Task**: [TDD Regression] should block dangerous commands (`regr-mvhduh5l-q5un`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvhduh5l-q5un.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should block dangerous commands [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvhduh5l-q5un.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block dangerous commands [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvhde30g-bd2k Rehabilitation [2026-10-22T15:54:47.229Z]
- **Parent Task**: [TDD Regression] should block the "sudo" command (`regr-mvhde30g-bd2k`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvhde30g-bd2k.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should block the "sudo" command [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvhde30g-bd2k.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block the "sudo" command [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvg9gvu8-bbfd.1 Rehabilitation [2026-10-22T15:27:13.572Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] path traversal prevention (`regr-mvg9gvu8-bbfd.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu8-bbfd.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu8-bbfd.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvjcffnt-7ce3 Rehabilitation [2026-10-22T15:08:28.636Z]
- **Parent Task**: [TDD Regression] should handle multi-line valid input (`regr-mvjcffnt-7ce3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvjcffnt-7ce3.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle multi-line valid input [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]
  - [ ] `regr-mvjcffnt-7ce3.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle multi-line valid input [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]


### Task regr-mvhde306-gg36 Rehabilitation [2026-10-22T14:43:25.554Z]
- **Parent Task**: [TDD Regression] should block the "git clean -f" command (`regr-mvhde306-gg36`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvhde306-gg36.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should block the "git clean -f" command [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvhde306-gg36.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should block the "git clean -f" command [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task taskcade-t102.12.11.3.2 Rehabilitation [2026-10-22T14:37:38.952Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf (`taskcade-t102.12.11.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.11.3.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts]
  - [ ] `taskcade-t102.12.11.3.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts]


### Task taskcade-t102.6.8.3 Rehabilitation [2026-10-22T14:17:32.435Z]
- **Parent Task**: [Rehab 3/3] Unit Test & Validation Suite: T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement gua (`taskcade-t102.6.8.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.6.8.3.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement gua [Role: test_engineer] [Files: packages/engine/src/tests/loose_root_file_guard_rule.test.ts]
  - [ ] `taskcade-t102.6.8.3.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement gua [Role: test_engineer] [Files: packages/engine/src/tests/loose_root_file_guard_rule.test.ts]


### Task taskcade-t102.8.5.3 Rehabilitation [2026-10-22T14:05:23.018Z]
- **Parent Task**: [Rehab 3/3] Unit Test & Validation Suite: T102.8.5: Write unit tests verifying `DiagnosticPreFlightChecker` syntax check execution b (`taskcade-t102.8.5.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.8.5.3.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.8.5: Write unit tests verifying `DiagnosticPreFlightChecker` syntax check execution b [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]
  - [ ] `taskcade-t102.8.5.3.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.8.5: Write unit tests verifying `DiagnosticPreFlightChecker` syntax check execution b [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]


### Task taskcade-t102.16.6.3 Rehabilitation [2026-10-22T13:41:55.182Z]
- **Parent Task**: [Rehab 3/3] Unit Test & Validation Suite: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, (`taskcade-t102.16.6.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.16.6.3.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]
  - [ ] `taskcade-t102.16.6.3.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]


### Task taskcade-t102.16.6.2 Rehabilitation [2026-10-22T13:29:23.842Z]
- **Parent Task**: [Rehab 2/3] Core Implementation Unit: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, (`taskcade-t102.16.6.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.16.6.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/3] Core Implementation Unit: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, [Role: type_specialist] [Files: packages/engine/src/tui/TuiTheme.ts]
  - [ ] `taskcade-t102.16.6.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/3] Core Implementation Unit: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, [Role: implementer] [Files: packages/engine/src/tui/TuiTheme.ts]


### Task taskcade-t102.1.19.3 Rehabilitation [2026-10-22T13:10:46.440Z]
- **Parent Task**: [Rehab 3/3] Unit Test & Validation Suite: T102.1.19: Write unit tests verifying `ExecutionModeSelectorComponent` autonomous vs superv (`taskcade-t102.1.19.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.1.19.3.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.1.19: Write unit tests verifying `ExecutionModeSelectorComponent` autonomous vs superv [Role: test_engineer] [Files: all]
  - [ ] `taskcade-t102.1.19.3.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.1.19: Write unit tests verifying `ExecutionModeSelectorComponent` autonomous vs superv [Role: test_engineer] [Files: all]


### Task regr-mvh7rgpj-xs6w Rehabilitation [2026-10-22T12:43:20.160Z]
- **Parent Task**: [TDD Regression] should discover curl when in PATH (`regr-mvh7rgpj-xs6w`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvh7rgpj-xs6w.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should discover curl when in PATH [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts]
  - [ ] `regr-mvh7rgpj-xs6w.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should discover curl when in PATH [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts]


### Task taskcade-t102.16.6.1 Rehabilitation [2026-10-22T12:42:43.909Z]
- **Parent Task**: [Rehab 1/3] Type Contracts & Interfaces: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, (`taskcade-t102.16.6.1`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.16.6.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/3] Type Contracts & Interfaces: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, [Role: type_specialist] [Files: packages/engine/src/tui/TuiTheme.ts]
  - [ ] `taskcade-t102.16.6.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/3] Type Contracts & Interfaces: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, [Role: implementer] [Files: packages/engine/src/tui/TuiTheme.ts]


### Task taskcade-t102.2.6.2 Rehabilitation [2026-10-22T12:01:49.989Z]
- **Parent Task**: [Rehab 2/3] Core Implementation Unit: T102.2.6: Write unit tests verifying `CpuFallbackProvider` proc/cpuinfo parsing, core freq (`taskcade-t102.2.6.2`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.2.6.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/3] Core Implementation Unit: T102.2.6: Write unit tests verifying `CpuFallbackProvider` proc/cpuinfo parsing, core freq [Role: type_specialist] [Files: packages/engine/src/telemetry/CpuFallbackProvider.ts]
  - [ ] `taskcade-t102.2.6.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/3] Core Implementation Unit: T102.2.6: Write unit tests verifying `CpuFallbackProvider` proc/cpuinfo parsing, core freq [Role: implementer] [Files: packages/engine/src/telemetry/CpuFallbackProvider.ts]


### Task taskcade-t102.3.2.3 Rehabilitation [2026-10-22T11:41:53.311Z]
- **Parent Task**: [Rehab 3/3] Unit Test & Validation Suite: T102.3.2: Write unit tests verifying `GitCheckpointManager` tree snapshot creation, tag na (`taskcade-t102.3.2.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.3.2.3.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.3.2: Write unit tests verifying `GitCheckpointManager` tree snapshot creation, tag na [Role: test_engineer] [Files: packages/engine/src/tests/git_checkpoint_manager.test.ts]
  - [ ] `taskcade-t102.3.2.3.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.3.2: Write unit tests verifying `GitCheckpointManager` tree snapshot creation, tag na [Role: test_engineer] [Files: packages/engine/src/tests/git_checkpoint_manager.test.ts]


### Task regr-mvh7jejh-0xef Rehabilitation [2026-10-22T09:23:14.267Z]
- **Parent Task**: [TDD Regression] should handle missing binaries in system PATH (`regr-mvh7jejh-0xef`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [x] `regr-mvh7jejh-0xef.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle missing binaries in system PATH [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts]
  - [x] `regr-mvh7jejh-0xef.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle missing binaries in system PATH [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts]


### Task taskcade-t102.12.8.2 Rehabilitation [2026-10-22T08:42:13.340Z]
- **Parent Task**: [Rehab 2/3] Core Implementation Unit: T102.12.8: Write unit tests verifying `GrepSearchTool` ripgrep execution, glob filtering, l (`taskcade-t102.12.8.2`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.8.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/3] Core Implementation Unit: T102.12.8: Write unit tests verifying `GrepSearchTool` ripgrep execution, glob filtering, l [Role: type_specialist] [Files: packages/tools/src/implementations/GrepSearchTool.ts]
  - [ ] `taskcade-t102.12.8.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/3] Core Implementation Unit: T102.12.8: Write unit tests verifying `GrepSearchTool` ripgrep execution, glob filtering, l [Role: implementer] [Files: packages/tools/src/implementations/GrepSearchTool.ts]


### Task regr-mvg7wsy5-8y40.1 Rehabilitation [2026-10-22T07:57:29.147Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] extractFileSymbols (`regr-mvg7wsy5-8y40.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg7wsy5-8y40.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] extractFileSymbols [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]
  - [ ] `regr-mvg7wsy5-8y40.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] extractFileSymbols [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]


### Task regr-mvgwsyy2-q6a6 Rehabilitation [2026-10-22T06:42:11.193Z]
- **Parent Task**: [TDD Regression] FocusedDiffBuilder (`regr-mvgwsyy2-q6a6`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsyy2-q6a6.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] FocusedDiffBuilder [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsyy2-q6a6.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] FocusedDiffBuilder [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvgwsyxz-haz9 Rehabilitation [2026-10-22T06:28:10.052Z]
- **Parent Task**: [TDD Regression] should handle a change at the beginning of the file (`regr-mvgwsyxz-haz9`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsyxz-haz9.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle a change at the beginning of the file [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsyxz-haz9.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle a change at the beginning of the file [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvgwsyxr-c412 Rehabilitation [2026-10-22T05:55:20.225Z]
- **Parent Task**: [TDD Regression] should handle a change with special characters (`regr-mvgwsyxr-c412`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsyxr-c412.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle a change with special characters [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsyxr-c412.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle a change with special characters [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvgwsyxk-h5u0 Rehabilitation [2026-10-22T05:27:17.316Z]
- **Parent Task**: [TDD Regression] should handle empty input (`regr-mvgwsyxk-h5u0`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsyxk-h5u0.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle empty input [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsyxk-h5u0.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle empty input [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvgwsyxd-4uzy Rehabilitation [2026-10-22T05:08:13.379Z]
- **Parent Task**: [TDD Regression] should handle a single line change (`regr-mvgwsyxd-4uzy`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsyxd-4uzy.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle a single line change [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsyxd-4uzy.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle a single line change [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvgwsyxa-1vsl Rehabilitation [2026-10-22T04:30:57.178Z]
- **Parent Task**: [TDD Regression] should handle multiple changes (`regr-mvgwsyxa-1vsl`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsyxa-1vsl.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle multiple changes [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsyxa-1vsl.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle multiple changes [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvgwsyx2-1czt Rehabilitation [2026-10-22T04:09:52.922Z]
- **Parent Task**: [TDD Regression] should handle a change with whitespace (`regr-mvgwsyx2-1czt`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsyx2-1czt.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle a change with whitespace [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsyx2-1czt.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle a change with whitespace [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvgwsyw3-pivw Rehabilitation [2026-10-22T03:53:03.883Z]
- **Parent Task**: [TDD Regression] should handle a change with multiple lines (`regr-mvgwsyw3-pivw`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsyw3-pivw.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle a change with multiple lines [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsyw3-pivw.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle a change with multiple lines [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvgwsyx6-iqp0 Rehabilitation [2026-10-22T03:41:07.220Z]
- **Parent Task**: [TDD Regression] should generate a valid hunk for a simple change (`regr-mvgwsyx6-iqp0`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsyx6-iqp0.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should generate a valid hunk for a simple change [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsyx6-iqp0.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should generate a valid hunk for a simple change [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvgwsywr-xkn2 Rehabilitation [2026-10-22T01:59:11.700Z]
- **Parent Task**: [TDD Regression] should handle a change with only whitespace (`regr-mvgwsywr-xkn2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsywr-xkn2.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle a change with only whitespace [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsywr-xkn2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle a change with only whitespace [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvgwsywc-lewt Rehabilitation [2026-10-22T01:29:46.012Z]
- **Parent Task**: [TDD Regression] should handle a change with mixed case (`regr-mvgwsywc-lewt`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsywc-lewt.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle a change with mixed case [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsywc-lewt.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle a change with mixed case [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task taskcade-t102.13.4 Rehabilitation [2026-10-21T23:48:41.555Z]
- **Parent Task**: T102.13.4: Write unit tests verifying `AuthService` token storage, authenticated state Sign (`taskcade-t102.13.4`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.13.4.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.13.4: Write unit tests verifying `AuthService` token storage, authenticated state Sign [Role: type_specialist] [Files: packages/frontend/src/app/services/auth.service.ts]
  - [ ] `taskcade-t102.13.4.2`: [Rehab 2/3] Core Implementation Unit: T102.13.4: Write unit tests verifying `AuthService` token storage, authenticated state Sign [Role: implementer] [Files: packages/frontend/src/app/services/auth.service.ts]
  - [ ] `taskcade-t102.13.4.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.13.4: Write unit tests verifying `AuthService` token storage, authenticated state Sign [Role: test_engineer] [Files: all]


### Task regr-mvgwsyxo-afao Rehabilitation [2026-10-21T23:12:51.403Z]
- **Parent Task**: [TDD Regression] should handle a change at the end of the file (`regr-mvgwsyxo-afao`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `regr-mvgwsyxo-afao.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle a change at the end of the file [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [x] `regr-mvgwsyxo-afao.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle a change at the end of the file [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task taskcade-t102.13.6 Rehabilitation [2026-10-21T22:34:31.828Z]
- **Parent Task**: T102.13.6: Write unit tests verifying `ReactiveSignalService` WebSocket event handling, Sig (`taskcade-t102.13.6`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.13.6.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.13.6: Write unit tests verifying `ReactiveSignalService` WebSocket event handling, Sig [Role: type_specialist] [Files: packages/frontend/src/app/services/reactive-signal.service.ts]
  - [ ] `taskcade-t102.13.6.2`: [Rehab 2/3] Core Implementation Unit: T102.13.6: Write unit tests verifying `ReactiveSignalService` WebSocket event handling, Sig [Role: implementer] [Files: packages/frontend/src/app/services/reactive-signal.service.ts]
  - [ ] `taskcade-t102.13.6.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.13.6: Write unit tests verifying `ReactiveSignalService` WebSocket event handling, Sig [Role: test_engineer] [Files: all]


### Task taskcade-t102.6.9 Rehabilitation [2026-10-21T22:13:14.376Z]
- **Parent Task**: T102.6.9: Write unit tests verifying `RulePipelineEngine` sequential rule execution, chang (`taskcade-t102.6.9`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.6.9.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.6.9: Write unit tests verifying `RulePipelineEngine` sequential rule execution, chang [Role: type_specialist] [Files: packages/engine/src/rules/RulePipelineEngine.ts]
  - [ ] `taskcade-t102.6.9.2`: [Rehab 2/3] Core Implementation Unit: T102.6.9: Write unit tests verifying `RulePipelineEngine` sequential rule execution, chang [Role: implementer] [Files: packages/engine/src/rules/RulePipelineEngine.ts]
  - [ ] `taskcade-t102.6.9.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.6.9: Write unit tests verifying `RulePipelineEngine` sequential rule execution, chang [Role: test_engineer] [Files: packages/engine/src/tests/rule_pipeline_engine.test.ts]


### Task regr-mvgta6nh-akkg Rehabilitation [2026-10-21T21:31:42.490Z]
- **Parent Task**: [TDD Regression] should return a unified install command for missing packages (`regr-mvgta6nh-akkg`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvgta6nh-akkg.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should return a unified install command for missing packages [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]
  - [ ] `regr-mvgta6nh-akkg.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should return a unified install command for missing packages [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]


### Task regr-mvgta6mw-zlvv Rehabilitation [2026-10-21T20:17:35.791Z]
- **Parent Task**: [TDD Regression] should correctly identify installed tools (`regr-mvgta6mw-zlvv`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvgta6mw-zlvv.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should correctly identify installed tools [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]
  - [ ] `regr-mvgta6mw-zlvv.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correctly identify installed tools [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]


### Task taskcade-t102.6.8.2 Rehabilitation [2026-10-21T19:35:36.537Z]
- **Parent Task**: [Rehab 2/3] Core Implementation Unit: T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement gua (`taskcade-t102.6.8.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.6.8.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/3] Core Implementation Unit: T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement gua [Role: type_specialist] [Files: packages/engine/src/rules/catalog/LooseRootFileGuardRule.ts]
  - [ ] `taskcade-t102.6.8.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/3] Core Implementation Unit: T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement gua [Role: implementer] [Files: packages/engine/src/rules/catalog/LooseRootFileGuardRule.ts]


### Task taskcade-t102.10.1.2 Rehabilitation [2026-10-21T19:04:24.138Z]
- **Parent Task**: [Rehab 2/3] Core Implementation Unit: T102.10.1: Write unit tests verifying `LspDiagnosticIngestor` LSP publishDiagnostics notifi (`taskcade-t102.10.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.10.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/3] Core Implementation Unit: T102.10.1: Write unit tests verifying `LspDiagnosticIngestor` LSP publishDiagnostics notifi [Role: type_specialist] [Files: packages/engine/src/lsp/LspDiagnosticIngestor.ts]
  - [ ] `taskcade-t102.10.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/3] Core Implementation Unit: T102.10.1: Write unit tests verifying `LspDiagnosticIngestor` LSP publishDiagnostics notifi [Role: implementer] [Files: packages/engine/src/lsp/LspDiagnosticIngestor.ts]


### Task regr-mvg3or7v-fx9z.1 Rehabilitation [2026-10-21T17:23:59.116Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] TypeScriptMethodSplicer (`regr-mvg3or7v-fx9z.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg3or7v-fx9z.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] TypeScriptMethodSplicer [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvg3or7v-fx9z.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] TypeScriptMethodSplicer [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task regr-mvg3or7v-fx9z.2 Rehabilitation [2026-10-21T16:34:17.654Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TypeScriptMethodSplicer (`regr-mvg3or7v-fx9z.2`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg3or7v-fx9z.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TypeScriptMethodSplicer [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvg3or7v-fx9z.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TypeScriptMethodSplicer [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task taskcade-t102.16.4 Rehabilitation [2026-10-21T15:19:12.143Z]
- **Parent Task**: T102.16.4: Write unit tests verifying `WorkspaceIsolationManager` ephemeral worktree creati (`taskcade-t102.16.4`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.16.4.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.16.4: Write unit tests verifying `WorkspaceIsolationManager` ephemeral worktree creati [Role: type_specialist] [Files: packages/engine/src/isolation/WorkspaceIsolationManager.ts]
  - [ ] `taskcade-t102.16.4.2`: [Rehab 2/3] Core Implementation Unit: T102.16.4: Write unit tests verifying `WorkspaceIsolationManager` ephemeral worktree creati [Role: implementer] [Files: packages/engine/src/isolation/WorkspaceIsolationManager.ts]
  - [ ] `taskcade-t102.16.4.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.16.4: Write unit tests verifying `WorkspaceIsolationManager` ephemeral worktree creati [Role: test_engineer] [Files: packages/engine/src/tests/workspace_isolation_manager.test.ts]


### Task regr-mvgnzl3p-147r Rehabilitation [2026-10-21T15:12:01.184Z]
- **Parent Task**: [TDD Regression] should handle methods with return values (`regr-mvgnzl3p-147r`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `regr-mvgnzl3p-147r.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle methods with return values [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvgnzl3p-147r.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle methods with return values [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task regr-mvg3or7z-q82h.2 Rehabilitation [2026-10-21T14:38:26.359Z]
- **Parent Task**: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should retain comments during method replacement (`regr-mvg3or7z-q82h.2`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg3or7z-q82h.2.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should retain comments during method replacement [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvg3or7z-q82h.2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should retain comments during method replacement [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task regr-mvglnxjg-vuhc Rehabilitation [2026-10-21T13:38:24.135Z]
- **Parent Task**: [TDD Regression] should correctly identify missing tools (`regr-mvglnxjg-vuhc`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `regr-mvglnxjg-vuhc.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should correctly identify missing tools [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]
  - [ ] `regr-mvglnxjg-vuhc.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correctly identify missing tools [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]


### Task regr-mvglnxjd-1wbx Rehabilitation [2026-10-21T12:24:17.619Z]
- **Parent Task**: [TDD Regression] SystemToolScanner (`regr-mvglnxjd-1wbx`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `regr-mvglnxjd-1wbx.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] SystemToolScanner [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]
  - [ ] `regr-mvglnxjd-1wbx.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] SystemToolScanner [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]


### Task regr-mvglnxj9-3ojo Rehabilitation [2026-10-21T12:10:17.447Z]
- **Parent Task**: [TDD Regression] scan method (`regr-mvglnxj9-3ojo`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvglnxj9-3ojo.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] scan method [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]
  - [ ] `regr-mvglnxj9-3ojo.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] scan method [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]


### Task regr-mvg3or7z-q82h.1 Rehabilitation [2026-10-21T11:45:16.251Z]
- **Parent Task**: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should retain comments during method replacement (`regr-mvg3or7z-q82h.1`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg3or7z-q82h.1.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should retain comments during method replacement [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvg3or7z-q82h.1.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should retain comments during method replacement [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task taskcade-t102.14.1 Rehabilitation [2026-10-21T10:32:35.340Z]
- **Parent Task**: T102.14.1: Write unit tests verifying `HashStubGenerator` method body hashing, stub comment (`taskcade-t102.14.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.14.1.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.14.1: Write unit tests verifying `HashStubGenerator` method body hashing, stub comment [Role: type_specialist] [Files: packages/engine/src/context/HashStubGenerator.ts]
  - [ ] `taskcade-t102.14.1.2`: [Rehab 2/3] Core Implementation Unit: T102.14.1: Write unit tests verifying `HashStubGenerator` method body hashing, stub comment [Role: implementer] [Files: packages/engine/src/context/HashStubGenerator.ts]
  - [ ] `taskcade-t102.14.1.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.14.1: Write unit tests verifying `HashStubGenerator` method body hashing, stub comment [Role: test_engineer] [Files: packages/engine/src/tests/hash_stub_generator.test.ts]


### Task regr-mvglnxj2-ty9m Rehabilitation [2026-10-21T09:58:01.916Z]
- **Parent Task**: [TDD Regression] checkTool method (`regr-mvglnxj2-ty9m`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvglnxj2-ty9m.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] checkTool method [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]
  - [ ] `regr-mvglnxj2-ty9m.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] checkTool method [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]


### Task regr-mvglnxiz-yqtp Rehabilitation [2026-10-21T08:55:54.886Z]
- **Parent Task**: [TDD Regression] should return correct tool status when not installed (`regr-mvglnxiz-yqtp`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvglnxiz-yqtp.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should return correct tool status when not installed [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]
  - [ ] `regr-mvglnxiz-yqtp.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should return correct tool status when not installed [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts packages/engine/src/hardware/SystemToolScanner.ts]


### Task taskcade-t102.14.9.2 Rehabilitation [2026-10-21T07:30:38.468Z]
- **Parent Task**: [Rehab 2/3] Core Implementation Unit: T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, conte (`taskcade-t102.14.9.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.14.9.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/3] Core Implementation Unit: T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, conte [Role: type_specialist] [Files: packages/engine/src/refactoring/SlotFillPromptBuilder.ts]
  - [ ] `taskcade-t102.14.9.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/3] Core Implementation Unit: T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, conte [Role: implementer] [Files: packages/engine/src/refactoring/SlotFillPromptBuilder.ts]


### Task taskcade-t102.10.1 Rehabilitation [2026-10-21T05:40:32.339Z]
- **Parent Task**: T102.10.1: Write unit tests verifying `LspDiagnosticIngestor` LSP publishDiagnostics notifi (`taskcade-t102.10.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.10.1.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.10.1: Write unit tests verifying `LspDiagnosticIngestor` LSP publishDiagnostics notifi [Role: type_specialist] [Files: packages/engine/src/lsp/LspDiagnosticIngestor.ts]
  - [ ] `taskcade-t102.10.1.2`: [Rehab 2/3] Core Implementation Unit: T102.10.1: Write unit tests verifying `LspDiagnosticIngestor` LSP publishDiagnostics notifi [Role: implementer] [Files: packages/engine/src/lsp/LspDiagnosticIngestor.ts]
  - [ ] `taskcade-t102.10.1.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.10.1: Write unit tests verifying `LspDiagnosticIngestor` LSP publishDiagnostics notifi [Role: test_engineer] [Files: packages/engine/src/tests/lsp_diagnostic_ingestor.test.ts]


### Task taskcade-t102.5.3 Rehabilitation [2026-10-21T05:22:52.140Z]
- **Parent Task**: T102.5.3: Write unit tests verifying `BanditTaskScheduler` arm selection, reward recording (`taskcade-t102.5.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.5.3.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.5.3: Write unit tests verifying `BanditTaskScheduler` arm selection, reward recording [Role: type_specialist] [Files: packages/engine/src/bandit/BanditTaskScheduler.ts]
  - [ ] `taskcade-t102.5.3.2`: [Rehab 2/3] Core Implementation Unit: T102.5.3: Write unit tests verifying `BanditTaskScheduler` arm selection, reward recording [Role: implementer] [Files: packages/engine/src/bandit/BanditTaskScheduler.ts]
  - [ ] `taskcade-t102.5.3.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.5.3: Write unit tests verifying `BanditTaskScheduler` arm selection, reward recording [Role: test_engineer] [Files: packages/engine/src/tests/bandit_task_scheduler.test.ts]


### Task taskcade-t102.12.11.3 Rehabilitation [2026-10-21T03:54:06.829Z]
- **Parent Task**: [Rehab 3/3] Unit Test & Validation Suite: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf (`taskcade-t102.12.11.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.11.3.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts]
  - [ ] `taskcade-t102.12.11.3.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts]


### Task regr-mvg9n3dy-cbef Rehabilitation [2026-10-21T03:23:42.414Z]
- **Parent Task**: [TDD Regression] should correlate failure with a culprit commit (`regr-mvg9n3dy-cbef`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9n3dy-cbef.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should correlate failure with a culprit commit [Role: test_engineer] [Files: packages/engine/src/tests/git_regression_correlator.test.ts packages/engine/src/analytics/GitRegressionCorrelator.ts]
  - [ ] `regr-mvg9n3dy-cbef.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should correlate failure with a culprit commit [Role: test_engineer] [Files: packages/engine/src/tests/git_regression_correlator.test.ts packages/engine/src/analytics/GitRegressionCorrelator.ts]


### Task taskcade-t102.14.9 Rehabilitation [2026-10-21T02:49:09.395Z]
- **Parent Task**: T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, conte (`taskcade-t102.14.9`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.14.9.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, conte [Role: type_specialist] [Files: packages/engine/src/refactoring/SlotFillPromptBuilder.ts]
  - [ ] `taskcade-t102.14.9.2`: [Rehab 2/3] Core Implementation Unit: T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, conte [Role: implementer] [Files: packages/engine/src/refactoring/SlotFillPromptBuilder.ts]
  - [ ] `taskcade-t102.14.9.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, conte [Role: test_engineer] [Files: packages/engine/src/tests/slot_fill_prompt_builder.test.ts]


### Task taskcade-t102.8.5 Rehabilitation [2026-10-21T01:39:08.749Z]
- **Parent Task**: T102.8.5: Write unit tests verifying `DiagnosticPreFlightChecker` syntax check execution b (`taskcade-t102.8.5`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.8.5.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.8.5: Write unit tests verifying `DiagnosticPreFlightChecker` syntax check execution b [Role: type_specialist] [Files: packages/engine/src/testing/DiagnosticPreFlightChecker.ts]
  - [ ] `taskcade-t102.8.5.2`: [Rehab 2/3] Core Implementation Unit: T102.8.5: Write unit tests verifying `DiagnosticPreFlightChecker` syntax check execution b [Role: implementer] [Files: packages/engine/src/testing/DiagnosticPreFlightChecker.ts]
  - [ ] `taskcade-t102.8.5.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.8.5: Write unit tests verifying `DiagnosticPreFlightChecker` syntax check execution b [Role: test_engineer] [Files: packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts]


### Task regr-mvg9gvu4-tyjt Rehabilitation [2026-10-21T00:59:34.802Z]
- **Parent Task**: [TDD Regression] blocks path traversal with .. (`regr-mvg9gvu4-tyjt`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu4-tyjt.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] blocks path traversal with .. [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu4-tyjt.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] blocks path traversal with .. [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task regr-mvg9gvu8-bbfd Rehabilitation [2026-10-21T00:39:45.970Z]
- **Parent Task**: [TDD Regression] path traversal prevention (`regr-mvg9gvu8-bbfd`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg9gvu8-bbfd.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `regr-mvg9gvu8-bbfd.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] path traversal prevention [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts packages/tools/src/security/ExecutionGuard.ts]


### Task taskcade-t102.6.1 Rehabilitation [2026-10-20T23:39:49.030Z]
- **Parent Task**: T102.6.1: Write unit tests verifying `AstSignatureAlignRule` method signature comparison,  (`taskcade-t102.6.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.6.1.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.6.1: Write unit tests verifying `AstSignatureAlignRule` method signature comparison,  [Role: type_specialist] [Files: packages/engine/src/rules/catalog/AstSignatureAlignRule.ts]
  - [ ] `taskcade-t102.6.1.2`: [Rehab 2/3] Core Implementation Unit: T102.6.1: Write unit tests verifying `AstSignatureAlignRule` method signature comparison,  [Role: implementer] [Files: packages/engine/src/rules/catalog/AstSignatureAlignRule.ts]
  - [ ] `taskcade-t102.6.1.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.6.1: Write unit tests verifying `AstSignatureAlignRule` method signature comparison,  [Role: test_engineer] [Files: packages/engine/src/tests/ast_signature_align_rule.test.ts]


### Task taskcade-t102.13.2 Rehabilitation [2026-10-20T23:03:27.081Z]
- **Parent Task**: T102.13.2: Write unit tests verifying `RepoStateService` branch listing, diff fetching, fil (`taskcade-t102.13.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.13.2.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.13.2: Write unit tests verifying `RepoStateService` branch listing, diff fetching, fil [Role: type_specialist] [Files: packages/frontend/src/app/services/repo-state.service.ts]
  - [ ] `taskcade-t102.13.2.2`: [Rehab 2/3] Core Implementation Unit: T102.13.2: Write unit tests verifying `RepoStateService` branch listing, diff fetching, fil [Role: implementer] [Files: packages/frontend/src/app/services/repo-state.service.ts]
  - [ ] `taskcade-t102.13.2.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.13.2: Write unit tests verifying `RepoStateService` branch listing, diff fetching, fil [Role: test_engineer] [Files: all]


### Task regr-mvg7wsyb-jshd Rehabilitation [2026-10-20T22:51:19.314Z]
- **Parent Task**: [TDD Regression] should extract Python symbols correctly (`regr-mvg7wsyb-jshd`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg7wsyb-jshd.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should extract Python symbols correctly [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]
  - [ ] `regr-mvg7wsyb-jshd.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should extract Python symbols correctly [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]


### Task regr-mvg7wsy2-68gw Rehabilitation [2026-10-20T22:09:32.348Z]
- **Parent Task**: [TDD Regression] SymbolExtractor (`regr-mvg7wsy2-68gw`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg7wsy2-68gw.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] SymbolExtractor [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]
  - [ ] `regr-mvg7wsy2-68gw.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] SymbolExtractor [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]


### Task taskcade-t102.2.11.3 Rehabilitation [2026-10-20T21:55:31.677Z]
- **Parent Task**: [Rehab 3/3] Unit Test & Validation Suite: T102.2.11: Write unit tests verifying `SystemToolScanner` binary discovery for git, ollama, (`taskcade-t102.2.11.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.2.11.3.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.2.11: Write unit tests verifying `SystemToolScanner` binary discovery for git, ollama, [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts]
  - [ ] `taskcade-t102.2.11.3.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.2.11: Write unit tests verifying `SystemToolScanner` binary discovery for git, ollama, [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts]


### Task regr-mvg7wsy8-i7rf Rehabilitation [2026-10-20T21:34:00.874Z]
- **Parent Task**: [TDD Regression] should extract Go symbols correctly (`regr-mvg7wsy8-i7rf`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg7wsy8-i7rf.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should extract Go symbols correctly [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]
  - [ ] `regr-mvg7wsy8-i7rf.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should extract Go symbols correctly [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]


### Task regr-mvgi6ep9-kda2 Rehabilitation [2026-10-20T20:43:12.554Z]
- **Parent Task**: [TDD Regression] should handle plateaus with overlapping ranges (`regr-mvgi6ep9-kda2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvgi6ep9-kda2.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle plateaus with overlapping ranges [Role: test_engineer] [Files: packages/engine/src/tests/plateau_intervention_dispatcher.test.ts packages/engine/src/analytics/PlateauInterventionDispatcher.ts]
  - [ ] `regr-mvgi6ep9-kda2.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle plateaus with overlapping ranges [Role: test_engineer] [Files: packages/engine/src/tests/plateau_intervention_dispatcher.test.ts packages/engine/src/analytics/PlateauInterventionDispatcher.ts]


### Task regr-mvg7wsy5-8y40 Rehabilitation [2026-10-20T20:21:53.199Z]
- **Parent Task**: [TDD Regression] extractFileSymbols (`regr-mvg7wsy5-8y40`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg7wsy5-8y40.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] extractFileSymbols [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]
  - [ ] `regr-mvg7wsy5-8y40.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] extractFileSymbols [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]


### Task regr-mvg7wsxu-qxil Rehabilitation [2026-10-20T19:37:31.024Z]
- **Parent Task**: [TDD Regression] should extract Java symbols correctly (`regr-mvg7wsxu-qxil`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg7wsxu-qxil.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should extract Java symbols correctly [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]
  - [ ] `regr-mvg7wsxu-qxil.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should extract Java symbols correctly [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts packages/engine/src/repomap/SymbolExtractor.ts]


### Task taskcade-t102.7.3 Rehabilitation [2026-10-20T18:44:33.306Z]
- **Parent Task**: T102.7.3: Write unit tests verifying `LocalBypassSsoProvider` mock user injection, demo cr (`taskcade-t102.7.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.7.3.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.7.3: Write unit tests verifying `LocalBypassSsoProvider` mock user injection, demo cr [Role: type_specialist] [Files: packages/engine/src/auth/LocalBypassSsoProvider.ts]
  - [ ] `taskcade-t102.7.3.2`: [Rehab 2/3] Core Implementation Unit: T102.7.3: Write unit tests verifying `LocalBypassSsoProvider` mock user injection, demo cr [Role: implementer] [Files: packages/engine/src/auth/LocalBypassSsoProvider.ts]
  - [ ] `taskcade-t102.7.3.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.7.3: Write unit tests verifying `LocalBypassSsoProvider` mock user injection, demo cr [Role: test_engineer] [Files: packages/engine/src/tests/local_bypass_sso_provider.test.ts]


### Task taskcade-t102.16.5 Rehabilitation [2026-10-20T18:38:24.678Z]
- **Parent Task**: T102.16.5: Write unit tests verifying `ScreenBuffer` character cell grid updates, ANSI colo (`taskcade-t102.16.5`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.16.5.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.16.5: Write unit tests verifying `ScreenBuffer` character cell grid updates, ANSI colo [Role: type_specialist] [Files: packages/engine/src/tui/ScreenBuffer.ts]
  - [ ] `taskcade-t102.16.5.2`: [Rehab 2/3] Core Implementation Unit: T102.16.5: Write unit tests verifying `ScreenBuffer` character cell grid updates, ANSI colo [Role: implementer] [Files: packages/engine/src/tui/ScreenBuffer.ts]
  - [ ] `taskcade-t102.16.5.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.16.5: Write unit tests verifying `ScreenBuffer` character cell grid updates, ANSI colo [Role: test_engineer] [Files: packages/engine/src/tests/screen_buffer.test.ts]


### Task taskcade-t102.12.2 Rehabilitation [2026-10-20T18:29:20.782Z]
- **Parent Task**: T102.12.2: Write unit tests verifying `LocateFeatureTool` fuzzy token search, symbol locati (`taskcade-t102.12.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.2.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.12.2: Write unit tests verifying `LocateFeatureTool` fuzzy token search, symbol locati [Role: type_specialist] [Files: packages/tools/src/implementations/LocateFeatureTool.ts]
  - [ ] `taskcade-t102.12.2.2`: [Rehab 2/3] Core Implementation Unit: T102.12.2: Write unit tests verifying `LocateFeatureTool` fuzzy token search, symbol locati [Role: implementer] [Files: packages/tools/src/implementations/LocateFeatureTool.ts]
  - [ ] `taskcade-t102.12.2.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.12.2: Write unit tests verifying `LocateFeatureTool` fuzzy token search, symbol locati [Role: test_engineer] [Files: packages/tools/src/tests/locate_feature_tool.test.ts]


### Task taskcade-t102.12.6 Rehabilitation [2026-10-20T17:54:18.551Z]
- **Parent Task**: T102.12.6: Write unit tests verifying `ViewFileTool` line slicing, windowed viewing, byte o (`taskcade-t102.12.6`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.6.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.12.6: Write unit tests verifying `ViewFileTool` line slicing, windowed viewing, byte o [Role: type_specialist] [Files: packages/tools/src/implementations/ViewFileTool.ts]
  - [ ] `taskcade-t102.12.6.2`: [Rehab 2/3] Core Implementation Unit: T102.12.6: Write unit tests verifying `ViewFileTool` line slicing, windowed viewing, byte o [Role: implementer] [Files: packages/tools/src/implementations/ViewFileTool.ts]
  - [ ] `taskcade-t102.12.6.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.12.6: Write unit tests verifying `ViewFileTool` line slicing, windowed viewing, byte o [Role: test_engineer] [Files: packages/tools/src/tests/view_file_tool.test.ts]


### Task taskcade-t102.14.5.3 Rehabilitation [2026-10-20T16:50:01.195Z]
- **Parent Task**: [Rehab 3/3] Unit Test & Validation Suite: T102.14.5: Write unit tests verifying `FocusedDiffBuilder` hunk generation, line offset ali (`taskcade-t102.14.5.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.14.5.3.1`: [Rehab 1/2] Test Scaffold & Assertions: [Rehab 3/3] Unit Test & Validation Suite: T102.14.5: Write unit tests verifying `FocusedDiffBuilder` hunk generation, line offset ali [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]
  - [ ] `taskcade-t102.14.5.3.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [Rehab 3/3] Unit Test & Validation Suite: T102.14.5: Write unit tests verifying `FocusedDiffBuilder` hunk generation, line offset ali [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvg3or7z-q82h Rehabilitation [2026-10-20T16:24:35.326Z]
- **Parent Task**: [TDD Regression] should retain comments during method replacement (`regr-mvg3or7z-q82h`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvg3or7z-q82h.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should retain comments during method replacement [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvg3or7z-q82h.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should retain comments during method replacement [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task regr-mvfvieet-z2ef Rehabilitation [2026-10-20T15:32:17.603Z]
- **Parent Task**: [TDD Regression] RegexTool (`regr-mvfvieet-z2ef`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvfvieet-z2ef.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] RegexTool [Role: test_engineer] [Files: packages/tools/src/tests/regex_tool.test.ts packages/tools/src/implementations/RegexTool.ts]
  - [ ] `regr-mvfvieet-z2ef.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] RegexTool [Role: test_engineer] [Files: packages/tools/src/tests/regex_tool.test.ts packages/tools/src/implementations/RegexTool.ts]


### Task taskcade-t102.2.11 Rehabilitation [2026-10-20T15:08:20.240Z]
- **Parent Task**: T102.2.11: Write unit tests verifying `SystemToolScanner` binary discovery for git, ollama, (`taskcade-t102.2.11`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.2.11.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.2.11: Write unit tests verifying `SystemToolScanner` binary discovery for git, ollama, [Role: type_specialist] [Files: packages/engine/src/hardware/SystemToolScanner.ts]
  - [ ] `taskcade-t102.2.11.2`: [Rehab 2/3] Core Implementation Unit: T102.2.11: Write unit tests verifying `SystemToolScanner` binary discovery for git, ollama, [Role: implementer] [Files: packages/engine/src/hardware/SystemToolScanner.ts]
  - [ ] `taskcade-t102.2.11.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.2.11: Write unit tests verifying `SystemToolScanner` binary discovery for git, ollama, [Role: test_engineer] [Files: packages/engine/src/tests/system_tool_scanner.test.ts]


### Task taskcade-t102.17.1.2 Rehabilitation [2026-10-20T14:18:33.768Z]
- **Parent Task**: [Rehab 2/3] Core Implementation Unit: T102.17.1: Write unit tests verifying `StochasticHyperparameterOptimizer` temperature pertu (`taskcade-t102.17.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.17.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/3] Core Implementation Unit: T102.17.1: Write unit tests verifying `StochasticHyperparameterOptimizer` temperature pertu [Role: type_specialist] [Files: packages/engine/src/optimization/StochasticHyperparameterOptimizer.ts]
  - [ ] `taskcade-t102.17.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/3] Core Implementation Unit: T102.17.1: Write unit tests verifying `StochasticHyperparameterOptimizer` temperature pertu [Role: implementer] [Files: packages/engine/src/optimization/StochasticHyperparameterOptimizer.ts]


### Task taskcade-t102.13.1 Rehabilitation [2026-10-20T13:53:54.502Z]
- **Parent Task**: T102.13.1: Write unit tests verifying `TaskApiService` task list fetching, task cancellatio (`taskcade-t102.13.1`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 420000ms for model 'gemma3:4b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.13.1.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.13.1: Write unit tests verifying `TaskApiService` task list fetching, task cancellatio [Role: type_specialist] [Files: packages/frontend/src/app/services/task-api.service.ts]
  - [ ] `taskcade-t102.13.1.2`: [Rehab 2/3] Core Implementation Unit: T102.13.1: Write unit tests verifying `TaskApiService` task list fetching, task cancellatio [Role: implementer] [Files: packages/frontend/src/app/services/task-api.service.ts]
  - [ ] `taskcade-t102.13.1.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.13.1: Write unit tests verifying `TaskApiService` task list fetching, task cancellatio [Role: test_engineer] [Files: all]


### Task taskcade-t102.12.12 Rehabilitation [2026-10-20T13:32:41.931Z]
- **Parent Task**: T102.12.12: Write unit tests verifying `ToolRegistry` dynamic tool registration, schema vali (`taskcade-t102.12.12`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.12.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.12.12: Write unit tests verifying `ToolRegistry` dynamic tool registration, schema vali [Role: type_specialist] [Files: packages/tools/src/ToolRegistry.ts]
  - [ ] `taskcade-t102.12.12.2`: [Rehab 2/3] Core Implementation Unit: T102.12.12: Write unit tests verifying `ToolRegistry` dynamic tool registration, schema vali [Role: implementer] [Files: packages/tools/src/ToolRegistry.ts]
  - [ ] `taskcade-t102.12.12.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.12.12: Write unit tests verifying `ToolRegistry` dynamic tool registration, schema vali [Role: test_engineer] [Files: packages/tools/src/tests/tool_registry.test.ts]


### Task taskcade-t102.12.10 Rehabilitation [2026-10-20T13:05:47.212Z]
- **Parent Task**: T102.12.10: Write unit tests verifying `RegexTool` regular expression compilation, multiline (`taskcade-t102.12.10`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.10.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.12.10: Write unit tests verifying `RegexTool` regular expression compilation, multiline [Role: type_specialist] [Files: packages/tools/src/implementations/RegexTool.ts]
  - [ ] `taskcade-t102.12.10.2`: [Rehab 2/3] Core Implementation Unit: T102.12.10: Write unit tests verifying `RegexTool` regular expression compilation, multiline [Role: implementer] [Files: packages/tools/src/implementations/RegexTool.ts]
  - [ ] `taskcade-t102.12.10.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.12.10: Write unit tests verifying `RegexTool` regular expression compilation, multiline [Role: test_engineer] [Files: packages/tools/src/tests/regex_tool.test.ts]


### Task regr-mvg3or7v-fx9z Rehabilitation [2026-10-20T12:51:47.105Z]
- **Parent Task**: [TDD Regression] TypeScriptMethodSplicer (`regr-mvg3or7v-fx9z`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvg3or7v-fx9z.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] TypeScriptMethodSplicer [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `regr-mvg3or7v-fx9z.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] TypeScriptMethodSplicer [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]


### Task taskcade-t102.13.10 Rehabilitation [2026-10-20T10:13:43.496Z]
- **Parent Task**: T102.13.10: Write unit tests verifying `RepomapViewComponent` SVG graph rendering, zoom/pan  (`taskcade-t102.13.10`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.13.10.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.13.10: Write unit tests verifying `RepomapViewComponent` SVG graph rendering, zoom/pan  [Role: type_specialist] [Files: packages/frontend/src/app/components/views/repomap-view.component.ts]
  - [ ] `taskcade-t102.13.10.2`: [Rehab 2/3] Core Implementation Unit: T102.13.10: Write unit tests verifying `RepomapViewComponent` SVG graph rendering, zoom/pan  [Role: implementer] [Files: packages/frontend/src/app/components/views/repomap-view.component.ts]
  - [ ] `taskcade-t102.13.10.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.13.10: Write unit tests verifying `RepomapViewComponent` SVG graph rendering, zoom/pan  [Role: test_engineer] [Files: all]


### Task regr-mvfu3r3t-bb0u Rehabilitation [2026-10-20T10:08:09.507Z]
- **Parent Task**: [TDD Regression] PlateauInterventionDispatcher (`regr-mvfu3r3t-bb0u`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvfu3r3t-bb0u.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] PlateauInterventionDispatcher [Role: test_engineer] [Files: packages/engine/src/tests/plateau_intervention_dispatcher.test.ts packages/engine/src/analytics/PlateauInterventionDispatcher.ts]
  - [ ] `regr-mvfu3r3t-bb0u.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] PlateauInterventionDispatcher [Role: test_engineer] [Files: packages/engine/src/tests/plateau_intervention_dispatcher.test.ts packages/engine/src/analytics/PlateauInterventionDispatcher.ts]


### Task regr-mvfu3r2r-63jh Rehabilitation [2026-10-20T09:42:01.295Z]
- **Parent Task**: [TDD Regression] should handle multiple interventions (`regr-mvfu3r2r-63jh`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `regr-mvfu3r2r-63jh.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should handle multiple interventions [Role: test_engineer] [Files: packages/engine/src/tests/plateau_intervention_dispatcher.test.ts packages/engine/src/analytics/PlateauInterventionDispatcher.ts]
  - [ ] `regr-mvfu3r2r-63jh.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should handle multiple interventions [Role: test_engineer] [Files: packages/engine/src/tests/plateau_intervention_dispatcher.test.ts packages/engine/src/analytics/PlateauInterventionDispatcher.ts]


### Task taskcade-t102.14.5 Rehabilitation [2026-10-20T08:51:59.769Z]
- **Parent Task**: T102.14.5: Write unit tests verifying `FocusedDiffBuilder` hunk generation, line offset ali (`taskcade-t102.14.5`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.14.5.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.14.5: Write unit tests verifying `FocusedDiffBuilder` hunk generation, line offset ali [Role: type_specialist] [Files: packages/engine/src/context/FocusedDiffBuilder.ts]
  - [ ] `taskcade-t102.14.5.2`: [Rehab 2/3] Core Implementation Unit: T102.14.5: Write unit tests verifying `FocusedDiffBuilder` hunk generation, line offset ali [Role: implementer] [Files: packages/engine/src/context/FocusedDiffBuilder.ts]
  - [ ] `taskcade-t102.14.5.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.14.5: Write unit tests verifying `FocusedDiffBuilder` hunk generation, line offset ali [Role: test_engineer] [Files: packages/engine/src/tests/focused_diff_builder.test.ts]


### Task regr-mvfu3r0v-johw Rehabilitation [2026-10-20T08:03:18.261Z]
- **Parent Task**: [TDD Regression] should detect stagnation and trigger intervention when conditions are met (`regr-mvfu3r0v-johw`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `regr-mvfu3r0v-johw.1`: [Rehab 1/2] Test Scaffold & Assertions: [TDD Regression] should detect stagnation and trigger intervention when conditions are met [Role: test_engineer] [Files: packages/engine/src/tests/plateau_intervention_dispatcher.test.ts packages/engine/src/analytics/PlateauInterventionDispatcher.ts]
  - [ ] `regr-mvfu3r0v-johw.2`: [Rehab 2/2] Test Hardening & Edge-Case Coverage: [TDD Regression] should detect stagnation and trigger intervention when conditions are met [Role: test_engineer] [Files: packages/engine/src/tests/plateau_intervention_dispatcher.test.ts packages/engine/src/analytics/PlateauInterventionDispatcher.ts]


### Task taskcade-t102.2.13 Rehabilitation [2026-10-20T07:30:15.987Z]
- **Parent Task**: T102.2.13: Write unit tests verifying `ComputeHardwareProfile` profile serialization, capac (`taskcade-t102.2.13`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.2.13.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.2.13: Write unit tests verifying `ComputeHardwareProfile` profile serialization, capac [Role: type_specialist] [Files: packages/engine/src/hardware/ComputeHardwareProfile.ts]
  - [ ] `taskcade-t102.2.13.2`: [Rehab 2/3] Core Implementation Unit: T102.2.13: Write unit tests verifying `ComputeHardwareProfile` profile serialization, capac [Role: implementer] [Files: packages/engine/src/hardware/ComputeHardwareProfile.ts]
  - [ ] `taskcade-t102.2.13.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.2.13: Write unit tests verifying `ComputeHardwareProfile` profile serialization, capac [Role: test_engineer] [Files: packages/engine/src/tests/compute_hardware_profile.test.ts]


### Task taskcade-t102.12.7 Rehabilitation [2026-10-20T06:38:13.479Z]
- **Parent Task**: T102.12.7: Write unit tests verifying `ListDirTool` recursive directory listing, child coun (`taskcade-t102.12.7`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 1800000ms for model 'qwen2.5-coder:7b-instruct-q4_K_M'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.7.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.12.7: Write unit tests verifying `ListDirTool` recursive directory listing, child coun [Role: type_specialist] [Files: packages/tools/src/implementations/ListDirTool.ts]
  - [ ] `taskcade-t102.12.7.2`: [Rehab 2/3] Core Implementation Unit: T102.12.7: Write unit tests verifying `ListDirTool` recursive directory listing, child coun [Role: implementer] [Files: packages/tools/src/implementations/ListDirTool.ts]
  - [ ] `taskcade-t102.12.7.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.12.7: Write unit tests verifying `ListDirTool` recursive directory listing, child coun [Role: test_engineer] [Files: packages/tools/src/tests/list_dir_tool.test.ts]


### Task taskcade-t102.4.3 Rehabilitation [2026-10-20T06:08:03.112Z]
- **Parent Task**: T102.4.3: Write unit tests verifying `GitRegressionCorrelator` commit blame mapping, diff  (`taskcade-t102.4.3`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.4.3.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.4.3: Write unit tests verifying `GitRegressionCorrelator` commit blame mapping, diff  [Role: type_specialist] [Files: packages/engine/src/analytics/GitRegressionCorrelator.ts]
  - [ ] `taskcade-t102.4.3.2`: [Rehab 2/3] Core Implementation Unit: T102.4.3: Write unit tests verifying `GitRegressionCorrelator` commit blame mapping, diff  [Role: implementer] [Files: packages/engine/src/analytics/GitRegressionCorrelator.ts]
  - [ ] `taskcade-t102.4.3.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.4.3: Write unit tests verifying `GitRegressionCorrelator` commit blame mapping, diff  [Role: test_engineer] [Files: packages/engine/src/tests/git_regression_correlator.test.ts]


### Task taskcade-t102.12.11 Rehabilitation [2026-10-20T05:50:11.101Z]
- **Parent Task**: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf (`taskcade-t102.12.11`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.11.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf [Role: type_specialist] [Files: packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `taskcade-t102.12.11.2`: [Rehab 2/3] Core Implementation Unit: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf [Role: implementer] [Files: packages/tools/src/security/ExecutionGuard.ts]
  - [ ] `taskcade-t102.12.11.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf [Role: test_engineer] [Files: packages/tools/src/tests/execution_guard.test.ts]


### Task taskcade-t102.15.3 Rehabilitation [2026-10-20T05:11:22.137Z]
- **Parent Task**: T102.15.3: Write unit tests verifying `SymbolExtractor` interface, function, and variable e (`taskcade-t102.15.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.15.3.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.15.3: Write unit tests verifying `SymbolExtractor` interface, function, and variable e [Role: type_specialist] [Files: packages/engine/src/repomap/SymbolExtractor.ts]
  - [ ] `taskcade-t102.15.3.2`: [Rehab 2/3] Core Implementation Unit: T102.15.3: Write unit tests verifying `SymbolExtractor` interface, function, and variable e [Role: implementer] [Files: packages/engine/src/repomap/SymbolExtractor.ts]
  - [ ] `taskcade-t102.15.3.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.15.3: Write unit tests verifying `SymbolExtractor` interface, function, and variable e [Role: test_engineer] [Files: packages/engine/src/tests/symbol_extractor.test.ts]


### Task taskcade-t102.8.3 Rehabilitation [2026-10-20T04:51:26.273Z]
- **Parent Task**: T102.8.3: Write unit tests verifying `SandboxedProcessRunner` timeout termination, memory  (`taskcade-t102.8.3`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.8.3.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.8.3: Write unit tests verifying `SandboxedProcessRunner` timeout termination, memory  [Role: type_specialist] [Files: packages/engine/src/testing/SandboxedProcessRunner.ts]
  - [ ] `taskcade-t102.8.3.2`: [Rehab 2/3] Core Implementation Unit: T102.8.3: Write unit tests verifying `SandboxedProcessRunner` timeout termination, memory  [Role: implementer] [Files: packages/engine/src/testing/SandboxedProcessRunner.ts]
  - [ ] `taskcade-t102.8.3.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.8.3: Write unit tests verifying `SandboxedProcessRunner` timeout termination, memory  [Role: test_engineer] [Files: packages/engine/src/tests/sandboxed_process_runner.test.ts]


### Task taskcade-t102.6.8 Rehabilitation [2026-10-20T04:37:24.537Z]
- **Parent Task**: T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement gua (`taskcade-t102.6.8`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.6.8.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement gua [Role: type_specialist] [Files: packages/engine/src/rules/catalog/LooseRootFileGuardRule.ts]
  - [ ] `taskcade-t102.6.8.2`: [Rehab 2/3] Core Implementation Unit: T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement gua [Role: implementer] [Files: packages/engine/src/rules/catalog/LooseRootFileGuardRule.ts]
  - [ ] `taskcade-t102.6.8.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement gua [Role: test_engineer] [Files: packages/engine/src/tests/loose_root_file_guard_rule.test.ts]


### Task taskcade-t102.7.4 Rehabilitation [2026-10-20T04:04:00.879Z]
- **Parent Task**: T102.7.4: Write unit tests verifying `OidcDiscoveryService` well-known configuration endpo (`taskcade-t102.7.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.7.4.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.7.4: Write unit tests verifying `OidcDiscoveryService` well-known configuration endpo [Role: type_specialist] [Files: packages/engine/src/auth/OidcDiscoveryService.ts]
  - [ ] `taskcade-t102.7.4.2`: [Rehab 2/3] Core Implementation Unit: T102.7.4: Write unit tests verifying `OidcDiscoveryService` well-known configuration endpo [Role: implementer] [Files: packages/engine/src/auth/OidcDiscoveryService.ts]
  - [ ] `taskcade-t102.7.4.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.7.4: Write unit tests verifying `OidcDiscoveryService` well-known configuration endpo [Role: test_engineer] [Files: packages/engine/src/tests/oidc_discovery_service.test.ts]


### Task taskcade-t102.16.6 Rehabilitation [2026-10-20T03:42:58.628Z]
- **Parent Task**: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, (`taskcade-t102.16.6`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.16.6.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, [Role: type_specialist] [Files: packages/engine/src/tui/TuiTheme.ts]
  - [ ] `taskcade-t102.16.6.2`: [Rehab 2/3] Core Implementation Unit: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, [Role: implementer] [Files: packages/engine/src/tui/TuiTheme.ts]
  - [ ] `taskcade-t102.16.6.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, [Role: test_engineer] [Files: packages/engine/src/tests/tui_theme.test.ts]


### Task taskcade-t102.2.12 Rehabilitation [2026-10-20T03:21:55.891Z]
- **Parent Task**: T102.2.12: Write unit tests verifying `GpuDeviceManager` multi-device enumeration, device s (`taskcade-t102.2.12`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.2.12.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.2.12: Write unit tests verifying `GpuDeviceManager` multi-device enumeration, device s [Role: type_specialist] [Files: packages/engine/src/hardware/GpuDeviceManager.ts]
  - [ ] `taskcade-t102.2.12.2`: [Rehab 2/3] Core Implementation Unit: T102.2.12: Write unit tests verifying `GpuDeviceManager` multi-device enumeration, device s [Role: implementer] [Files: packages/engine/src/hardware/GpuDeviceManager.ts]
  - [ ] `taskcade-t102.2.12.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.2.12: Write unit tests verifying `GpuDeviceManager` multi-device enumeration, device s [Role: test_engineer] [Files: packages/engine/src/tests/gpu_device_manager.test.ts]


### Task taskcade-t102.14.10 Rehabilitation [2026-10-20T03:04:59.189Z]
- **Parent Task**: T102.14.10: Write unit tests verifying `TypeScriptMethodSplicer` method replacement by AST n (`taskcade-t102.14.10`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'gemma3:12b-it-qat'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.14.10.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.14.10: Write unit tests verifying `TypeScriptMethodSplicer` method replacement by AST n [Role: type_specialist] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts]
  - [ ] `taskcade-t102.14.10.2`: [Rehab 2/3] Core Implementation Unit: T102.14.10: Write unit tests verifying `TypeScriptMethodSplicer` method replacement by AST n [Role: implementer] [Files: packages/engine/src/refactoring/TypeScriptMethodSplicer.ts]
  - [ ] `taskcade-t102.14.10.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.14.10: Write unit tests verifying `TypeScriptMethodSplicer` method replacement by AST n [Role: test_engineer] [Files: packages/engine/src/tests/typescript_method_splicer.test.ts]


### Task taskcade-t102.17.1 Rehabilitation [2026-10-20T02:43:56.983Z]
- **Parent Task**: T102.17.1: Write unit tests verifying `StochasticHyperparameterOptimizer` temperature pertu (`taskcade-t102.17.1`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 1800000ms for model 'qwen2.5-coder:7b-instruct-q4_K_M'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.17.1.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.17.1: Write unit tests verifying `StochasticHyperparameterOptimizer` temperature pertu [Role: type_specialist] [Files: packages/engine/src/optimization/StochasticHyperparameterOptimizer.ts]
  - [ ] `taskcade-t102.17.1.2`: [Rehab 2/3] Core Implementation Unit: T102.17.1: Write unit tests verifying `StochasticHyperparameterOptimizer` temperature pertu [Role: implementer] [Files: packages/engine/src/optimization/StochasticHyperparameterOptimizer.ts]
  - [ ] `taskcade-t102.17.1.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.17.1: Write unit tests verifying `StochasticHyperparameterOptimizer` temperature pertu [Role: test_engineer] [Files: packages/engine/src/tests/stochastic_hyperparameter_optimizer.test.ts]


### Task taskcade-t102.3.1 Rehabilitation [2026-10-20T00:59:29.657Z]
- **Parent Task**: T102.3.1: Write unit tests verifying `GiteaPermissionGuard` repository permission role che (`taskcade-t102.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.3.1.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.3.1: Write unit tests verifying `GiteaPermissionGuard` repository permission role che [Role: type_specialist] [Files: packages/engine/src/gitea/GiteaPermissionGuard.ts]
  - [ ] `taskcade-t102.3.1.2`: [Rehab 2/3] Core Implementation Unit: T102.3.1: Write unit tests verifying `GiteaPermissionGuard` repository permission role che [Role: implementer] [Files: packages/engine/src/gitea/GiteaPermissionGuard.ts]
  - [ ] `taskcade-t102.3.1.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.3.1: Write unit tests verifying `GiteaPermissionGuard` repository permission role che [Role: test_engineer] [Files: packages/engine/src/tests/gitea_permission_guard.test.ts]


### Task taskcade-t102.12.8 Rehabilitation [2026-10-20T00:55:14.671Z]
- **Parent Task**: T102.12.8: Write unit tests verifying `GrepSearchTool` ripgrep execution, glob filtering, l (`taskcade-t102.12.8`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.12.8.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.12.8: Write unit tests verifying `GrepSearchTool` ripgrep execution, glob filtering, l [Role: type_specialist] [Files: packages/tools/src/implementations/GrepSearchTool.ts]
  - [ ] `taskcade-t102.12.8.2`: [Rehab 2/3] Core Implementation Unit: T102.12.8: Write unit tests verifying `GrepSearchTool` ripgrep execution, glob filtering, l [Role: implementer] [Files: packages/tools/src/implementations/GrepSearchTool.ts]
  - [ ] `taskcade-t102.12.8.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.12.8: Write unit tests verifying `GrepSearchTool` ripgrep execution, glob filtering, l [Role: test_engineer] [Files: packages/tools/src/tests/grep_search_tool.test.ts]


### Task taskcade-t102.3.5 Rehabilitation [2026-10-20T00:15:44.825Z]
- **Parent Task**: T102.3.5: Write unit tests verifying `GitUndoManager` single-commit revert generation, dir (`taskcade-t102.3.5`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.3.5.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.3.5: Write unit tests verifying `GitUndoManager` single-commit revert generation, dir [Role: type_specialist] [Files: packages/engine/src/git/GitUndoManager.ts]
  - [ ] `taskcade-t102.3.5.2`: [Rehab 2/3] Core Implementation Unit: T102.3.5: Write unit tests verifying `GitUndoManager` single-commit revert generation, dir [Role: implementer] [Files: packages/engine/src/git/GitUndoManager.ts]
  - [ ] `taskcade-t102.3.5.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.3.5: Write unit tests verifying `GitUndoManager` single-commit revert generation, dir [Role: test_engineer] [Files: packages/engine/src/tests/git_undo_manager.test.ts]


### Task taskcade-t102.1.19 Rehabilitation [2026-10-19T23:27:22.045Z]
- **Parent Task**: T102.1.19: Write unit tests verifying `ExecutionModeSelectorComponent` autonomous vs superv (`taskcade-t102.1.19`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.1.19.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.1.19: Write unit tests verifying `ExecutionModeSelectorComponent` autonomous vs superv [Role: type_specialist] [Files: packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.ts]
  - [ ] `taskcade-t102.1.19.2`: [Rehab 2/3] Core Implementation Unit: T102.1.19: Write unit tests verifying `ExecutionModeSelectorComponent` autonomous vs superv [Role: implementer] [Files: packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.ts]
  - [ ] `taskcade-t102.1.19.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.1.19: Write unit tests verifying `ExecutionModeSelectorComponent` autonomous vs superv [Role: test_engineer] [Files: all]


### Task taskcade-t102.8.7 Rehabilitation [2026-10-19T23:03:42.975Z]
- **Parent Task**: T102.8.7: Write unit tests verifying `TestRunnerDetector` framework auto-detection (node:t (`taskcade-t102.8.7`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.8.7.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.8.7: Write unit tests verifying `TestRunnerDetector` framework auto-detection (node:t [Role: type_specialist] [Files: packages/engine/src/testing/TestRunnerDetector.ts]
  - [ ] `taskcade-t102.8.7.2`: [Rehab 2/3] Core Implementation Unit: T102.8.7: Write unit tests verifying `TestRunnerDetector` framework auto-detection (node:t [Role: implementer] [Files: packages/engine/src/testing/TestRunnerDetector.ts]
  - [ ] `taskcade-t102.8.7.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.8.7: Write unit tests verifying `TestRunnerDetector` framework auto-detection (node:t [Role: test_engineer] [Files: packages/engine/src/tests/test_runner_detector.test.ts]


### Task taskcade-t102.17.6 Rehabilitation [2026-10-19T22:41:08.687Z]
- **Parent Task**: T102.17.6: Write unit tests verifying `PlateauInterventionDispatcher` stagnation detection  (`taskcade-t102.17.6`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.17.6.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.17.6: Write unit tests verifying `PlateauInterventionDispatcher` stagnation detection  [Role: type_specialist] [Files: packages/engine/src/analytics/PlateauInterventionDispatcher.ts]
  - [ ] `taskcade-t102.17.6.2`: [Rehab 2/3] Core Implementation Unit: T102.17.6: Write unit tests verifying `PlateauInterventionDispatcher` stagnation detection  [Role: implementer] [Files: packages/engine/src/analytics/PlateauInterventionDispatcher.ts]
  - [ ] `taskcade-t102.17.6.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.17.6: Write unit tests verifying `PlateauInterventionDispatcher` stagnation detection  [Role: test_engineer] [Files: packages/engine/src/tests/plateau_intervention_dispatcher.test.ts]


### Task taskcade-t102.7.2 Rehabilitation [2026-10-19T21:45:51.992Z]
- **Parent Task**: T102.7.2: Write unit tests verifying `AutheliaSsoProvider` forward auth header extraction  (`taskcade-t102.7.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.7.2.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.7.2: Write unit tests verifying `AutheliaSsoProvider` forward auth header extraction  [Role: type_specialist] [Files: packages/engine/src/auth/AutheliaSsoProvider.ts]
  - [ ] `taskcade-t102.7.2.2`: [Rehab 2/3] Core Implementation Unit: T102.7.2: Write unit tests verifying `AutheliaSsoProvider` forward auth header extraction  [Role: implementer] [Files: packages/engine/src/auth/AutheliaSsoProvider.ts]
  - [ ] `taskcade-t102.7.2.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.7.2: Write unit tests verifying `AutheliaSsoProvider` forward auth header extraction  [Role: test_engineer] [Files: packages/engine/src/tests/authelia_sso_provider.test.ts]


### Task taskcade-t102.2.6 Rehabilitation [2026-10-19T21:24:56.167Z]
- **Parent Task**: T102.2.6: Write unit tests verifying `CpuFallbackProvider` proc/cpuinfo parsing, core freq (`taskcade-t102.2.6`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.2.6.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.2.6: Write unit tests verifying `CpuFallbackProvider` proc/cpuinfo parsing, core freq [Role: type_specialist] [Files: packages/engine/src/telemetry/CpuFallbackProvider.ts]
  - [ ] `taskcade-t102.2.6.2`: [Rehab 2/3] Core Implementation Unit: T102.2.6: Write unit tests verifying `CpuFallbackProvider` proc/cpuinfo parsing, core freq [Role: implementer] [Files: packages/engine/src/telemetry/CpuFallbackProvider.ts]
  - [ ] `taskcade-t102.2.6.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.2.6: Write unit tests verifying `CpuFallbackProvider` proc/cpuinfo parsing, core freq [Role: test_engineer] [Files: packages/engine/src/tests/cpu_fallback_provider.test.ts]


### Task taskcade-t102.13.7 Rehabilitation [2026-10-19T15:37:45.197Z]
- **Parent Task**: T102.13.7: Write unit tests verifying `GiteaAuthGuard` route activation allowing authentica (`taskcade-t102.13.7`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.13.7.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.13.7: Write unit tests verifying `GiteaAuthGuard` route activation allowing authentica [Role: type_specialist] [Files: packages/frontend/src/app/guards/gitea-auth.guard.ts]
  - [ ] `taskcade-t102.13.7.2`: [Rehab 2/3] Core Implementation Unit: T102.13.7: Write unit tests verifying `GiteaAuthGuard` route activation allowing authentica [Role: implementer] [Files: packages/frontend/src/app/guards/gitea-auth.guard.ts]
  - [ ] `taskcade-t102.13.7.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.13.7: Write unit tests verifying `GiteaAuthGuard` route activation allowing authentica [Role: test_engineer] [Files: all]


### Task taskcade-t102.3.2 Rehabilitation [2026-10-19T14:39:17.604Z]
- **Parent Task**: T102.3.2: Write unit tests verifying `GitCheckpointManager` tree snapshot creation, tag na (`taskcade-t102.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.3.2.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.3.2: Write unit tests verifying `GitCheckpointManager` tree snapshot creation, tag na [Role: type_specialist] [Files: packages/engine/src/gitea/GitCheckpointManager.ts]
  - [ ] `taskcade-t102.3.2.2`: [Rehab 2/3] Core Implementation Unit: T102.3.2: Write unit tests verifying `GitCheckpointManager` tree snapshot creation, tag na [Role: implementer] [Files: packages/engine/src/gitea/GitCheckpointManager.ts]
  - [ ] `taskcade-t102.3.2.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.3.2: Write unit tests verifying `GitCheckpointManager` tree snapshot creation, tag na [Role: test_engineer] [Files: packages/engine/src/tests/git_checkpoint_manager.test.ts]


### Task taskcade-t102.5.1 Rehabilitation [2026-10-19T11:37:53.135Z]
- **Parent Task**: T102.5.1: Write unit tests verifying `EpsilonGreedyPolicy` exploration vs exploitation dec (`taskcade-t102.5.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.5.1.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.5.1: Write unit tests verifying `EpsilonGreedyPolicy` exploration vs exploitation dec [Role: type_specialist] [Files: packages/engine/src/bandit/EpsilonGreedyPolicy.ts]
  - [ ] `taskcade-t102.5.1.2`: [Rehab 2/3] Core Implementation Unit: T102.5.1: Write unit tests verifying `EpsilonGreedyPolicy` exploration vs exploitation dec [Role: implementer] [Files: packages/engine/src/bandit/EpsilonGreedyPolicy.ts]
  - [ ] `taskcade-t102.5.1.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.5.1: Write unit tests verifying `EpsilonGreedyPolicy` exploration vs exploitation dec [Role: test_engineer] [Files: packages/engine/src/tests/epsilon_greedy_policy.test.ts]


### Task taskcade-t102.13.3 Rehabilitation [2026-10-19T09:08:29.481Z]
- **Parent Task**: T102.13.3: Write unit tests verifying `ModelFleetService` model telemetry polling, status u (`taskcade-t102.13.3`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 840000ms for model 'qwen2.5-coder:14b'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.13.3.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.13.3: Write unit tests verifying `ModelFleetService` model telemetry polling, status u [Role: type_specialist] [Files: packages/frontend/src/app/services/model-fleet.service.ts]
  - [ ] `taskcade-t102.13.3.2`: [Rehab 2/3] Core Implementation Unit: T102.13.3: Write unit tests verifying `ModelFleetService` model telemetry polling, status u [Role: implementer] [Files: packages/frontend/src/app/services/model-fleet.service.ts]
  - [ ] `taskcade-t102.13.3.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.13.3: Write unit tests verifying `ModelFleetService` model telemetry polling, status u [Role: test_engineer] [Files: all]


### Task taskcade-t102.15.6 Rehabilitation [2026-10-19T06:11:43.834Z]
- **Parent Task**: T102.15.6: Write unit tests verifying `MethodEditAdapter` diff application, boundary valida (`taskcade-t102.15.6`)
- **Failure Count**: 5
- **Failure Reason**: REMEDIATION_EXHAUSTED
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.15.6.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.15.6: Write unit tests verifying `MethodEditAdapter` diff application, boundary valida [Role: type_specialist] [Files: packages/engine/src/refactoring/MethodEditAdapter.ts]
  - [ ] `taskcade-t102.15.6.2`: [Rehab 2/3] Core Implementation Unit: T102.15.6: Write unit tests verifying `MethodEditAdapter` diff application, boundary valida [Role: implementer] [Files: packages/engine/src/refactoring/MethodEditAdapter.ts]
  - [ ] `taskcade-t102.15.6.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.15.6: Write unit tests verifying `MethodEditAdapter` diff application, boundary valida [Role: test_engineer] [Files: packages/engine/src/tests/method_edit_adapter.test.ts]


### Task taskcade-t102.3.6 Rehabilitation [2026-10-18T17:49:37.906Z]
- **Parent Task**: T102.3.6: Write unit tests verifying `GitCheckpointService` automated checkpoint intervals (`taskcade-t102.3.6`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.3.6.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.3.6: Write unit tests verifying `GitCheckpointService` automated checkpoint intervals [Role: type_specialist] [Files: packages/engine/src/git/GitCheckpointService.ts]
  - [ ] `taskcade-t102.3.6.2`: [Rehab 2/3] Core Implementation Unit: T102.3.6: Write unit tests verifying `GitCheckpointService` automated checkpoint intervals [Role: implementer] [Files: packages/engine/src/git/GitCheckpointService.ts]
  - [ ] `taskcade-t102.3.6.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.3.6: Write unit tests verifying `GitCheckpointService` automated checkpoint intervals [Role: test_engineer] [Files: packages/engine/src/tests/git_checkpoint_service.test.ts]


### Task taskcade-t102.2.1 Rehabilitation [2026-10-15T00:42:12.346Z]
- **Parent Task**: T102.2.1: Write unit tests verifying `AmdVegaTelemetryProvider` sysfs path discovery, miss (`taskcade-t102.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t102.2.1.1`: [Rehab 1/3] Type Contracts & Interfaces: T102.2.1: Write unit tests verifying `AmdVegaTelemetryProvider` sysfs path discovery, miss [Role: type_specialist] [Files: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts]
  - [ ] `taskcade-t102.2.1.2`: [Rehab 2/3] Core Implementation Unit: T102.2.1: Write unit tests verifying `AmdVegaTelemetryProvider` sysfs path discovery, miss [Role: implementer] [Files: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts]
  - [ ] `taskcade-t102.2.1.3`: [Rehab 3/3] Unit Test & Validation Suite: T102.2.1: Write unit tests verifying `AmdVegaTelemetryProvider` sysfs path discovery, miss [Role: test_engineer] [Files: packages/engine/src/tests/amd_vega_telemetry.test.ts]


### Task taskcade-t97.1.1.2.2 Rehabilitation [2026-10-14T23:26:09.210Z]
- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T97.1.1: Write unit tests verifying lm-sensors regex parser extracts Celsius values acros (`taskcade-t97.1.1.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t97.1.1.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T97.1.1: Write unit tests verifying lm-sensors regex parser extracts Celsius values acros [Role: type_specialist] [Files: packages/engine/src/tests/sensors_parser.test.ts]
  - [x] `taskcade-t97.1.1.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T97.1.1: Write unit tests verifying lm-sensors regex parser extracts Celsius values acros [Role: implementer] [Files: packages/engine/src/tests/sensors_parser.test.ts]


_All active taskcade failure rehabilitations completed and verified. Archived in [`docs/taskcade-history.md`](taskcade-history.md)_
