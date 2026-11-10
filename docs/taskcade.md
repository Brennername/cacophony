# Cacophony Taskcade: Execution Plan & Progress Tracker

> [!IMPORTANT]
> **Taskcade Synchronization Directives:**
> 1. **Strictly No Emojis**: Never use emojis in any task, description, code, or comments.
> 2. **Follow SOLID Principles**: Maintain single responsibility, open-closed, Liskov substitution, interface segregation, and dependency inversion.
> 3. **Strict Typing & Data Shaping**: All interfaces, domain types, and data shapes must be strictly defined in TypeScript. No pure JavaScript or untyped mocks.
> 4. **Mobile-First Design**: Ensure all user interfaces, controls, and views are designed mobile-first with desktop adaptability.
> 5. **Theme Support**: Maintain high-contrast dark and light themes with harmonious palettes.
> 6. **Zero Secrets in Code**: Secrets must strictly reside in `.env` files and never be committed to repositories.
> 7. **Task State Discipline**: Mark `[x]` only when fully completed and verified via automated test suites.

---

## Taskcade Rotation & History Protocol

1. **Verification Gate**: No task is marked completed `[x]` or rotated without passing its verified automated test suite or operational validation.
2. **Archival Procedure**: When an entire phase or major milestone is fully verified, its completed checklist items are transferred from `docs/taskcade.md` to `docs/taskcade-history.md`.
3. **Traceability**: Each archived phase preserves its task IDs, descriptions, subtask trees, associated git commit hashes, and verification scope.
4. **Token Efficiency**: Active planning and execution in `docs/taskcade.md` remain uncluttered, allowing AI agents and human operators to focus directly on pending work without context exhaustion.
5. **Reference**: See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 117 and historical rehabilitation records.

---

## Active Milestone Era: Local Model Autonomy, Dynamic Hardware Profiling, KV-Cache Autoscaling & Sandboxed Self-Healing

_Completed Phases 1 through 117 are archived in [`docs/taskcade-history.md`](taskcade-history.md)._

---

## Active Sprint Priority Queue & Immediate Execution Order

> [!NOTE]
> Active execution order is organized sequentially from runtime memory safeguards (Phase 118), test quarantine and sandboxing (Phase 119), hardware autotuning and APU thermal regulation (Phase 120), through core unit verification (Phase 121) and autonomous copilot guidance (Phase 122).

## Phase 118: Memory-Mapped KV-Cache Headroom Manager & Dynamic Context Window Autoscaler

- [ ] T118.1: Linux Cgroups & Host Memory Pressure Monitor: Query `/sys/fs/cgroup/memory` and `/proc/meminfo` for active anonymous memory, page cache reclaim, and swap/ZRAM pressure. [Files: packages/engine/src/telemetry/MemoryPressureMonitor.ts, packages/engine/src/tests/memory_pressure_monitor.test.ts] [Test: node --test packages/engine/dist/tests/memory_pressure_monitor.test.js] [Role: architect]
- [ ] T118.2: Dynamic Context Window Autoscaler: Automatically compute optimal `num_ctx` options per inference call based on available physical memory headroom to prevent Linux OOM-killer invocations. [Files: packages/engine/src/inference/ContextAutoscaler.ts, packages/engine/src/inference/OllamaProvider.ts, packages/engine/src/tests/context_autoscaler.test.ts] [Test: node --test packages/engine/dist/tests/context_autoscaler.test.js] [Role: implementer]
- [ ] T118.3: Memory Pressure Telemetry Gauge & VRAM Threshold Tests: Author test suite verifying headroom calculation under simulated low-memory conditions and threshold warning emissions. [Files: packages/engine/src/telemetry/MemoryPressureMonitor.ts, packages/engine/src/tests/memory_pressure_monitor.test.ts] [Test: node --test packages/engine/dist/tests/memory_pressure_monitor.test.js] [Role: test_engineer]

## Phase 119: Test Flakiness Quarantine & Sandboxed Mock Environment Isolation

- [ ] T119.1: Flaky Test Detection & Statistical Quarantine Service: Detect tests that flip between passing and failing across identical commit SHAs and tag them with `FLAKY_QUARANTINE`. [Files: packages/engine/src/testing/FlakyTestQuarantineService.ts, packages/engine/src/tests/flaky_test_quarantine.test.ts] [Test: node --test packages/engine/dist/tests/flaky_test_quarantine.test.js] [Role: architect]
- [ ] T119.2: Ephemeral Database & Network Isolation Sandbox: Ensure mock network endpoints and temporary test databases run in ephemeral namespaced contexts to eliminate cross-test interference. [Files: packages/engine/src/testing/MockIsolationSandbox.ts, packages/engine/src/tests/mock_isolation_sandbox.test.ts] [Test: node --test packages/engine/dist/tests/mock_isolation_sandbox.test.js] [Role: architect]
- [ ] T119.3: Automated Flaky Test Re-validation & Gradual Promotion: Daemon routine re-running quarantined tests in idle cycles; automatically restores clean status after 10 consecutive clean passes. [Files: packages/engine/src/testing/FlakyTestQuarantineService.ts, packages/engine/src/daemon/CacophonyDaemon.ts, packages/engine/src/tests/flaky_test_promotion.test.ts] [Test: node --test packages/engine/dist/tests/flaky_test_promotion.test.js] [Role: test_engineer]

## Phase 120: Heterogeneous Hardware Auto-Tuning & Dynamic APU Inference Profiler

- [ ] T120.1: APU & Discrete GPU Unified Benchmark Scanner: Micro-benchmark Ollama models on local hardware to measure real prefill tok/s, eval tok/s, and peak memory draw. [Files: packages/engine/src/hardware/HardwareInferenceProfiler.ts, packages/engine/src/tests/hardware_inference_profiler.test.ts] [Test: node --test packages/engine/dist/tests/hardware_inference_profiler.test.js] [Role: architect]
- [ ] T120.2: Adaptive Thermal Throttle Governor & Cooldown Controller: Adaptive cooldown controller that dynamically pauses scheduler ticks when APU die temperature exceeds 82C, resuming at 74C. [Files: packages/engine/src/telemetry/AdaptiveThermalGovernor.ts, packages/engine/src/tests/adaptive_thermal_governor.test.ts] [Test: node --test packages/engine/dist/tests/adaptive_thermal_governor.test.js] [Role: implementer]
- [ ] T120.3: Hardware Governor Safety & Thermal Cooldown Test Suite: Comprehensive unit tests verifying thermal threshold transitions, dynamic cooling pause states, and APU frequency telemetry. [Files: packages/engine/src/tests/adaptive_thermal_governor.test.ts, packages/engine/src/tests/hardware_inference_profiler.test.ts] [Test: node --test packages/engine/dist/tests/adaptive_thermal_governor.test.js] [Role: test_engineer]

## Phase 121: Core Testing & Edge-Case Verification Suite

- [ ] T121.1: Write unit tests verifying `QueueViewComponent` task filtering, bulk task actions, and responsive layout adaptations. [Files: packages/frontend/src/app/components/views/queue-view/queue-view.component.ts, packages/frontend/src/app/components/views/queue-view/queue-view.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend -- src/app/components/views/queue-view/queue-view.component.spec.ts] [Role: test_engineer]
- [ ] T121.2: Write unit tests verifying `RepomapViewComponent` SVG graph rendering, zoom/pan controls, and symbol node search. [Files: packages/frontend/src/app/components/views/repomap-view/repomap-view.component.ts, packages/frontend/src/app/components/views/repomap-view/repomap-view.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend -- src/app/components/views/repomap-view/repomap-view.component.spec.ts] [Role: test_engineer]
- [ ] T121.3: Write unit tests verifying `FleetWebSocketClient` connection lifecycle, handshake message exchange, and heartbeat transmission. [Files: packages/engine/src/fleet/FleetWebSocketClient.ts, packages/engine/src/tests/fleet_websocket_client.test.ts] [Test: node --test packages/engine/dist/tests/fleet_websocket_client.test.js] [Role: test_engineer]
- [ ] T121.4: Write unit tests verifying `ScreenBuffer` character cell grid updates, ANSI color styling, and dirty rect calculation. [Files: packages/engine/src/tui/ScreenBuffer.ts, packages/engine/src/tests/screen_buffer.test.ts] [Test: node --test packages/engine/dist/tests/screen_buffer.test.js] [Role: test_engineer]
- [ ] T121.5: Write unit tests verifying `DatasetVersionMigrator` schema version validation, transformation rule application, and rollback checkpoints. [Files: packages/engine/src/optimization/DatasetVersionMigrator.ts, packages/engine/src/tests/dataset_version_migrator.test.ts] [Test: node --test packages/engine/dist/tests/dataset_version_migrator.test.js] [Role: test_engineer]
- [ ] T121.6: Write unit tests verifying `RuleBacktestRunner` historical task playback against candidate rule sets, false positive/negative counting, and report generation. [Files: packages/engine/src/optimization/RuleBacktestRunner.ts, packages/engine/src/tests/rule_backtest_runner.test.js] [Test: node --test packages/engine/dist/tests/rule_backtest_runner.test.js] [Role: test_engineer]

## Phase 122: Autonomous Guidance, Copilot Advisory & Taskcade Execution Optimization

- [ ] T122.1: Model Advisory Guidance Injector: Embed task advisory guidance and architecture hints directly into pipeline prompt generation for local models. [Files: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts, packages/engine/src/inference/DomainAdvisoryEvaluator.ts] [Test: node --test packages/engine/dist/tests/autonomous_worker_pipeline.test.js] [Role: architect]
- [ ] T122.2: Context Headroom & Prompt Token Truncation Guard: Ensure local models receive compact, focused diffs and AST stubs tailored to their exact `num_ctx` headroom. [Files: packages/engine/src/context/FocusedDiffBuilder.ts, packages/engine/src/tests/focused_diff_builder.test.js] [Test: node --test packages/engine/dist/tests/focused_diff_builder.test.js] [Role: implementer]
- [ ] T122.3: Real-Time Arena Execution Telemetry & Milestone Burndown Metrics: Expose dedicated API metrics for overall taskcade completion velocity and active sprint burndown. [Files: packages/engine/src/daemon/CacophonyHttpServer.ts, packages/frontend/src/app/services/task-api.service.ts] [Test: npm run test --workspace=@cacophony/frontend] [Role: test_engineer]

---

## Archived Milestone References

_All previously implemented and verified phases are preserved in [`docs/taskcade-history.md`](taskcade-history.md):_
- **Phases 1 - 44**: Scaffolding, PGlite, Hardware Telemetry, Taskcade Seed Loading, Gitea Worktree Automation, MCP Tools, Multi-Armed Bandit, Model Eviction, SSE Streams, Mobile-First Routing.
- **Phases 45 - 89**: Thompson Sampling, AST Slicing, Compiler Diagnostic Auto-Repair, Batched Promotion Pipeline, Architectural Decomposer, Contributor Issue Ingestion, Git Regression Pinpointing.
- **Phases 96 - 101**: Sensor Parsing, AST Scrubbers, Deterministic Task Rehabilitation, Inline Template Elimination, Test Command Scoping.
- **Phases 102 - 117**: Component Unit Test Expansion, Human-Resonant PR Workflow, Log Reduction, Model Roster Lifecycle, Dynamic Host Resolution, TUI Panes, Live WebSocket Inspector, ELO Benchmark Engine.
- **Phases 110 - 112 (Maintenance)**: Settings Toggle, Dashboard Snapshot Cards, Plateau Intervention Engine, Test Runner Detector.
