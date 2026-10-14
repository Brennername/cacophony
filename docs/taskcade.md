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
5. **Reference**: See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 44, plus fully verified Phases 45-64, 73, 75, 77-86, and 89-95.

---

## Active Milestone Era: Gitea Deep API Integration, Dynamic Branching, Least-Privilege Guardrails & Webhook Orchestration

_See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 44, plus fully verified Phases 45-64, 73, 75, 77-86, and 89-95._

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

---

## Phase 66: Clean Slate Real-History Persistence & Model Stat Reset Daemon

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-66-clean-slate-real-history-persistence--model-stat-reset-daemon)_

---

## Phase 67: Real-Time Stream Tap Filtering & Multi-Task Tap Isolation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-67-real-time-stream-tap-filtering--multi-task-tap-isolation)_

---

## Phase 68: Multi-Model Load Balancer & VRAM-Aware Task Placement

_RDF Category: hardware_

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

- [x] T68.4.1: Implement unloadModel(modelName: string) in OllamaProvider issuing POST /api/generate with { model: modelName, keep_alive: 0 }. [File: packages/engine/src/inference/OllamaProvider.ts] [Method: unloadModel] [Test: npm test -- packages/engine/src/tests/ollama_provider.test.ts]
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

_RDF Category: telemetry_

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
- [x] T69.6.5: Implement WorkspacePackageImportScrubberRule in packages/engine/src/scrubber/rules/ rewriting hallucinated imports (@cacophony/git-worktrees, @cacophony/types, chai). [File: packages/engine/src/scrubber/rules/WorkspacePackageImportScrubberRule.ts] [Class: WorkspacePackageImportScrubberRule] [Test: npm test -- packages/engine/src/**tests**/Scrubber.test.ts]
- [x] T69.6.6: Add transactional file snapshot and rollback in AutonomousWorkerPipeline ensuring workspace files revert to pristine pre-task states upon verification failure. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: rollbackWorkspace] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
- [x] T69.6.7: Add configurable task execution diagnostics (DEBUG_TASK_PIPELINE=true / @cacophony-debug) dumping AST/compiler stderr to .cacophony/diagnostics/ for zero runtime overhead in production. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: logDiagnostic] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]

---

## Phase 70: Schematic Code Generators, Import Scaffolding & Zero-Boilerplate Generation Architecture

_RDF Category: orchestration_
_T70.1 & T70.2 Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-70-schematic-code-generators-import-scaffolding--zero-boilerplate-generation-architecture-t701--t702)_

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

_RDF Category: orchestration_

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

_RDF Category: orchestration_

### T72.1: Markdown Metadata Tag Parser & Task Directive Schema

- [ ] T72.1.1: Extend TaskcadeSeedLoader markdown parser to extract inline bracket metadata annotations: `[Role: ...]`, `[Model: ...]`, `[Temp: ...]`, `[MaxTokens: ...]`, `[Timeout: ...]`, `[BypassRules: ...]`, and `[Stack: ...]`. [File: packages/engine/src/scheduler/TaskcadeSeedLoader.ts] [Class: TaskcadeSeedLoader] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts]
- [ ] T72.1.2: Define typed TaskMetadataHints interface in @cacophony/shared-types supporting fine-grained run specifications (model affinity override, temperature float, context budget, rule bypass flags, and targeted execution guardrails). [File: packages/shared-types/src/index.ts] [Interface: TaskMetadataHints] [Test: npm test -- packages/shared-types]
- [ ] T72.1.3: Update TaskRecord and database schema to store structured metadataHints JSON payload alongside base task records. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.create] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
- [x] T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are parsed accurately without corrupting task title or prompt instructions. [File: packages/engine/src/tests/seed_loader.test.ts] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts]

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

_RDF Category: verification_and_hardening_

### T96.1: Core Utility & Math Unit Tests

- [ ] T96.1.1: Write unit tests verifying moving average calculations across empty, single-element, and large numeric streams. [File: packages/engine/src/tests/math_utils.test.ts] [Test: npm test -- packages/engine/src/tests/math_utils.test.ts]
- [ ] T96.1.2: Write unit tests verifying exponential backoff jitter calculations maintain bounds within min/max delay limits. [File: packages/engine/src/tests/backoff_utils.test.ts] [Test: npm test -- packages/engine/src/tests/backoff_utils.test.ts]
- [ ] T96.1.3: Write unit tests validating token throughput rate calculation clamped against zero division when duration is 0ms. [File: packages/engine/src/tests/throughput_math.test.ts] [Test: npm test -- packages/engine/src/tests/throughput_math.test.ts]
- [ ] T96.1.4: Write unit tests verifying percentage rounding precision and boundary clamping [0.0, 100.0]. [File: packages/engine/src/tests/percent_math.test.ts] [Test: npm test -- packages/engine/src/tests/percent_math.test.ts]

### T96.2: Schema Validation & Zod Parser Unit Tests

- [ ] T96.2.1: Write unit tests verifying TaskRecordSchema validates valid task payloads and rejects missing required fields. [File: packages/shared-types/src/tests/task_schema.test.ts] [Test: npm test -- packages/shared-types]
- [ ] T96.2.2: Write unit tests verifying CacophonySystemConfigSchema enforces default execution mode 'auto' and positive concurrency. [File: packages/shared-types/src/tests/config_schema.test.ts] [Test: npm test -- packages/shared-types]
- [ ] T96.2.3: Write unit tests validating ModelManagementConfigSchema defaults for protected models and storage quotas. [File: packages/shared-types/src/tests/model_config_schema.test.ts] [Test: npm test -- packages/shared-types]
- [ ] T96.2.4: Write unit tests verifying AgentRoleSchema enum rejects unknown string identifiers. [File: packages/shared-types/src/tests/agent_role_schema.test.ts] [Test: npm test -- packages/shared-types]

### T96.3: AST Context Slicer & Tokenizer Edge-Case Tests

- [ ] T96.3.1: Write unit tests validating AstContextSlicer handles complex generic interface declarations without syntax corruption. [File: packages/engine/src/tests/ast_generic_slicing.test.ts] [Test: npm test -- packages/engine/src/tests/ast_generic_slicing.test.ts]
- [ ] T96.3.2: Write unit tests verifying AstContextSlicer correctly preserves decorators (@Component, @Injectable) when generating class skeletons. [File: packages/engine/src/tests/ast_decorator_slicing.test.ts] [Test: npm test -- packages/engine/src/tests/ast_decorator_slicing.test.ts]
- [ ] T96.3.3: Write unit tests verifying ImportPruningEngine correctly resolves type-only imports vs value imports. [File: packages/engine/src/tests/import_type_pruning.test.ts] [Test: npm test -- packages/engine/src/tests/import_type_pruning.test.ts]
- [ ] T96.3.4: Write unit tests validating FocusedDiffBuilder handles multi-line string replacements with exact indentation preservation. [File: packages/engine/src/tests/diff_indentation.test.ts] [Test: npm test -- packages/engine/src/tests/diff_indentation.test.ts]

### T96.4: Frontend UI State Store & Reactive Signals Unit Tests

- [ ] T96.4.1: Write unit tests verifying ArenaStateStore activeTaskId signal transitions reactively upon task dispatch events. [File: packages/frontend/src/app/services/arena_state_dispatch.spec.ts] [Test: npm test]
- [ ] T96.4.2: Write unit tests verifying ArenaStateStore modelWarmth signal updates when warm model SSE payload arrives. [File: packages/frontend/src/app/services/arena_state_warmth.spec.ts] [Test: npm test]
- [ ] T96.4.3: Write unit tests verifying ArenaStateStore successRate signal updates accurately on success_rate_updated SSE events. [File: packages/frontend/src/app/services/arena_state_success.spec.ts] [Test: npm test]
- [ ] T96.4.4: Write unit tests verifying ArenaStateStore thermalThrottleState signal triggers warning badge in UI state. [File: packages/frontend/src/app/services/arena_state_thermal.spec.ts] [Test: npm test]

### T96.5: Database Query Builder & Parameter Escaping Tests

- [ ] T96.5.1: Write unit tests verifying TaskRepository.create handles SQL string escaping and special characters in prompts safely. [File: packages/db/src/tests/task_sql_escaping.test.ts] [Test: npm test -- packages/db]
- [ ] T96.5.2: Write unit tests verifying TaskRepository.updateStageState correctly serializes JSON log output without truncating special symbols. [File: packages/db/src/tests/stage_json_serialization.test.ts] [Test: npm test -- packages/db]
- [ ] T96.5.3: Write unit tests validating StageRepository stage span queries return chronological ordering without gaps. [File: packages/db/src/tests/stage_chronology.test.ts] [Test: npm test -- packages/db]
- [ ] T96.5.4: Write unit tests verifying PGlite driver handles concurrent statement execution queueing without deadlocking. [File: packages/db/src/tests/pglite_concurrent_queue.test.ts] [Test: npm test -- packages/db]

---

## Phase 97: Hardware Diagnostics, Sensor Parsing & Dynamic Resolver Unit Tests

_RDF Category: hardware_and_network_verification_

### T97.1: Diagnostic Sensor CLI Output Parsing Tests

- [ ] T97.1.1: Write unit tests verifying lm-sensors regex parser extracts Celsius values across Tctl, edge, and Package id lines accurately. [File: packages/engine/src/tests/sensors_parser.test.ts] [Test: npm test -- packages/engine/src/tests/sensors_parser.test.ts]
- [ ] T97.1.2: Write unit tests verifying radeontop parser handles non-standard whitespace and percentage formatting. [File: packages/engine/src/tests/radeontop_parser.test.ts] [Test: npm test -- packages/engine/src/tests/radeontop_parser.test.ts]
- [ ] T97.1.3: Write unit tests verifying nvidia-smi parser gracefully discards corrupted CSV rows with missing comma delimiters. [File: packages/engine/src/tests/nvidia_corrupt_csv.test.ts] [Test: npm test -- packages/engine/src/tests/nvidia_corrupt_csv.test.ts]
- [ ] T97.1.4: Write unit tests validating powermetrics parser handles multi-line thermal sampler dumps without throwing exceptions. [File: packages/engine/src/tests/powermetrics_parser.test.ts] [Test: npm test -- packages/engine/src/tests/powermetrics_parser.test.ts]

### T97.2: Network Resolver & Reverse Proxy Host Tests

- [ ] T97.2.1: Write unit tests verifying dynamic host header resolver handles X-Forwarded-Host with port numbers. [File: packages/engine/src/tests/host_header_port.test.ts] [Test: npm test -- packages/engine/src/tests/host_header_port.test.ts]
- [ ] T97.2.2: Write unit tests verifying IPv6 localhost (::1) is correctly mapped to localhost in CORS headers. [File: packages/engine/src/tests/ipv6_cors.test.ts] [Test: npm test -- packages/engine/src/tests/ipv6_cors.test.ts]
- [ ] T97.2.3: Write unit tests verifying local bridge IP resolution detects 172.17.0.1 Docker gateway. [File: packages/engine/src/tests/docker_bridge_gateway.test.ts] [Test: npm test -- packages/engine/src/tests/docker_bridge_gateway.test.ts]
- [ ] T97.2.4: Write unit tests verifying dynamic origin whitelist rejects non-local external domains. [File: packages/engine/src/tests/origin_whitelist.test.ts] [Test: npm test -- packages/engine/src/tests/origin_whitelist.test.ts]

### T97.3: Thermal Governor Pacing Calculation Tests

- [ ] T97.3.1: Write unit tests verifying ThermalGovernor emergency shutdown threshold halts queue when temp exceeds 105C. [File: packages/engine/src/tests/governor_emergency_halt.test.ts] [Test: npm test -- packages/engine/src/tests/governor_emergency_halt.test.ts]
- [ ] T97.3.2: Write unit tests verifying pacing delays scale from 0s at Nominal to 10s at Danger zone. [File: packages/engine/src/tests/governor_pacing_scale.test.ts] [Test: npm test -- packages/engine/src/tests/governor_pacing_scale.test.ts]
- [ ] T97.3.3: Write unit tests validating legacy 3-point thermal governor backwards compatibility. [File: packages/engine/src/tests/governor_legacy_3point.test.ts] [Test: npm test -- packages/engine/src/tests/governor_legacy_3point.test.ts]
- [ ] T97.3.4: Write unit tests verifying cool-off disabled flag overrides pacing delay back to zero seconds. [File: packages/engine/src/tests/governor_cooloff_disabled.test.ts] [Test: npm test -- packages/engine/src/tests/governor_cooloff_disabled.test.ts]

### T97.4: Stream Tap Ring Buffer & Eviction Tests

- [ ] T97.4.1: Write unit tests verifying StreamTapManager ring buffer drops oldest lines when capacity exceeds 500 lines. [File: packages/engine/src/tests/stream_ring_buffer.test.ts] [Test: npm test -- packages/engine/src/tests/stream_ring_buffer.test.ts]
- [ ] T97.4.2: Write unit tests verifying tap unsubscribe frees in-memory listener callback references completely. [File: packages/engine/src/tests/stream_tap_cleanup.test.ts] [Test: npm test -- packages/engine/src/tests/stream_tap_cleanup.test.ts]
- [ ] T97.4.3: Write unit tests validating SSE broadcast event encoding with special newline characters. [File: packages/engine/src/tests/sse_encoding.test.ts] [Test: npm test -- packages/engine/src/tests/sse_encoding.test.ts]
- [ ] T97.4.4: Write unit tests verifying StreamTapManager isolates logs across different task IDs. [File: packages/engine/src/tests/stream_tap_isolation.test.ts] [Test: npm test -- packages/engine/src/tests/stream_tap_isolation.test.ts]

---

## Phase 98: Heuristic Scrubbers, AST Parsers & Commit Generators Hardening

_RDF Category: static_analysis_hardening_

### T98.1: Remediation Prompt Formatting & Scrubbing Tests

- [ ] T98.1.1: Write unit tests verifying RemediationPromptFormatter produces structured markdown with numbered sections. [File: packages/engine/src/tests/remediation_format_sections.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_format_sections.test.ts]
- [ ] T98.1.2: Write unit tests validating compiler diagnostic filtering truncates error logs exceeding 2000 characters. [File: packages/engine/src/tests/remediation_diagnostic_truncation.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_diagnostic_truncation.test.ts]
- [ ] T98.1.3: Write unit tests verifying anti-filler directives forbid introductory and concluding pleasantries. [File: packages/engine/src/tests/remediation_directives.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_directives.test.ts]
- [ ] T98.1.4: Write unit tests validating that clean code replacements preserve indentation and newline conventions. [File: packages/engine/src/tests/remediation_indentation.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_indentation.test.ts]

### T98.2: Conventional Commit Message Generator Tests

- [ ] T98.2.1: Write unit tests verifying ConventionalCommitGenerator maps implementer role to feat/fix commits. [File: packages/engine/src/tests/commit_gen_roles.test.ts] [Test: npm test -- packages/engine/src/tests/commit_gen_roles.test.ts]
- [ ] T98.2.2: Write unit tests verifying commit subject length is clamped to standard 72-character maximum. [File: packages/engine/src/tests/commit_gen_length.test.ts] [Test: npm test -- packages/engine/src/tests/commit_gen_length.test.ts]
- [ ] T98.2.3: Write unit tests validating zero-emoji validator rejects commit messages containing Unicode emoji codes. [File: packages/engine/src/tests/commit_gen_zero_emoji.test.ts] [Test: npm test -- packages/engine/src/tests/commit_gen_zero_emoji.test.ts]
- [ ] T98.2.4: Write unit tests verifying task ID metadata is appended in commit body (Closes task-123). [File: packages/engine/src/tests/commit_gen_metadata.test.ts] [Test: npm test -- packages/engine/src/tests/commit_gen_metadata.test.ts]

---

## Phase 99: Commit-to-Task Attribution, Deterministic Task Rehabilitation & Resilient Failure Requeue Pipeline

_RDF Category: analytics_and_orchestration_

### T99.1: Database Schema & Shared Types for Commit Attribution, Base Commits & Task Rehabilitation

- [x] T99.1.1: Extend TaskRecord and EnqueueTaskDto interfaces in packages/shared-types/src/task.ts with commitHash, baseCommitHash, failureReason, parentTaskId, and rehabStatus. [File: packages/shared-types/src/task.ts] [Interface: TaskRecord] [Test: npm run build --workspace=@cacophony/shared-types]
- [x] T99.1.2: Define CommitImpactVerdict and ICommitImpactReport interfaces in packages/shared-types/src/analytics.ts covering pass rates, token efficiency, and impact classification. [File: packages/shared-types/src/analytics.ts] [Interface: ICommitImpactReport] [Test: npm run build --workspace=@cacophony/shared-types]
- [x] T99.1.3: Author database migration packages/db/src/migrations/016_task_commit_tracking_and_rehab.ts adding commit_hash, base_commit_hash, failure_reason, parent_task_id, and rehab_status with indexes. [File: packages/db/src/migrations/016_task_commit_tracking_and_rehab.ts] [Migration: 016_task_commit_tracking_and_rehab] [Test: npm test --workspace=@cacophony/db]
- [x] T99.1.4: Update TaskRepository with updateCommitAttribution, recordFailure, updateRehabStatus, listByCommitHash, and listByParentTaskId. [File: packages/db/src/repositories/TaskRepository.ts] [Class: TaskRepository] [Test: npm test --workspace=@cacophony/db]

### T99.2: Automatic Failure Requeuing & Retry Threshold Governor

- [x] T99.2.1: Update TaskScheduler to avoid marking tasks as terminal FAILED on first verification failure; requeue as PENDING up to maxRetries (default 3) with diagnostic feedback. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: TaskScheduler.tick] [Test: npm test -- packages/engine/dist/tests/scheduler_requeue.test.js]
- [x] T99.2.2: Capture baseCommitHash and commitHash during AutonomousWorkerPipeline execution and attach to TaskRecord upon merge or failure. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: AutonomousWorkerPipeline.executeTask] [Test: npm run build --workspace=@cacophony/engine]
- [x] T99.2.3: Write unit tests verifying task requeue as PENDING under retry threshold, transition to FAILED and rehabilitation trigger at maxRetries limit. [File: packages/engine/src/tests/scheduler_requeue.test.ts] [Test: npm test -- packages/engine/dist/tests/scheduler_requeue.test.js]

### T99.3: Deterministic Task Rehabilitation & Solvability Decomposition Engine

- [x] T99.3.1: Implement TaskRehabilitationService in packages/engine/src/scheduler/TaskRehabilitationService.ts to decompose repeatedly failing tasks into smaller atomic units (Types, Implementation, Tests). [File: packages/engine/src/scheduler/TaskRehabilitationService.ts] [Class: TaskRehabilitationService] [Test: npm test -- packages/engine/dist/tests/task_rehabilitation.test.js]
- [x] T99.3.2: Record deterministic task decomposition plans directly into docs/taskcade.md under dedicated queue section for complete plan auditability. [File: packages/engine/src/scheduler/TaskRehabilitationService.ts] [Method: recordRehabilitationInTaskcade] [Test: npm test -- packages/engine/dist/tests/task_rehabilitation.test.js]
- [x] T99.3.3: Expose REST API endpoint POST /api/tasks/:id/rehabilitate to trigger on-demand deterministic rehabilitation of stalled or failed tasks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks/:id/rehabilitate] [Test: npm test -- packages/engine/dist/tests/task_rehabilitation.test.js]
- [x] T99.3.4: Write unit tests verifying multi-file and single-file task decomposition, retry threshold checks, taskcade markdown updates, and idempotency. [File: packages/engine/src/tests/task_rehabilitation.test.ts] [Test: npm test -- packages/engine/dist/tests/task_rehabilitation.test.js]

### T99.4: Commit Impact Attribution & Token Efficiency Analytics Engine

- [x] T99.4.1: Implement CommitImpactTracker in packages/engine/src/analytics/CommitImpactTracker.ts tracing commit hashes to task completion outcomes and token expenditure. [File: packages/engine/src/analytics/CommitImpactTracker.ts] [Class: CommitImpactTracker] [Test: npm test -- packages/engine/dist/tests/commit_impact_tracker.test.js]
- [x] T99.4.2: Differentiate between genuine code degradation and productive stricter guardrail rejections (e.g. anti-stub AST rejections, build gate enforcements). [File: packages/engine/src/analytics/CommitImpactTracker.ts] [Method: determineVerdict] [Test: npm test -- packages/engine/dist/tests/commit_impact_tracker.test.js]
- [x] T99.4.3: Flag noisy commits burning local tokens without delivering passing tasks or guardrail assertions via identifyNoisyCommits. [File: packages/engine/src/analytics/CommitImpactTracker.ts] [Method: identifyNoisyCommits] [Test: npm test -- packages/engine/dist/tests/commit_impact_tracker.test.js]
- [x] T99.4.4: Expose REST API endpoint GET /api/analytics/commit-impact to return granular impact reports by commit hash or recent history. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/analytics/commit-impact] [Test: npm run build --workspace=@cacophony/engine]
- [x] T99.4.5: Write unit tests validating verdict classification (STRICTER_GUARDRAIL, IMPROVEMENT, DEGRADATION, NOISY_WASTE) and token efficiency calculations. [File: packages/engine/src/tests/commit_impact_tracker.test.ts] [Test: npm test -- packages/engine/dist/tests/commit_impact_tracker.test.js]

---

## Rehabilitated Taskcade Queue

### Task taskcade-t70.2.1 Rehabilitation [2026-10-14T08:58:51.467Z]
- **Parent Task**: T70.2.1: Pre-populate all requisite monorepo and standard library imports into generated  (`taskcade-t70.2.1`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t70.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T70.2.1: Pre-populate all requisite monorepo and standard library imports into generated  [Role: type_specialist] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]
  - [x] `taskcade-t70.2.1.2`: [Rehab 2/2] Implementation & Test Verification: T70.2.1: Pre-populate all requisite monorepo and standard library imports into generated  [Role: implementer] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]


### Task taskcade-t72.1.4 Rehabilitation [2026-10-14T08:44:23.262Z]
- **Parent Task**: T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are p (`taskcade-t72.1.4`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t72.1.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are p [Role: type_specialist] [Files: packages/engine/src/tests/seed_loader.test.ts]
  - [x] `taskcade-t72.1.4.2`: [Rehab 2/2] Implementation & Test Verification: T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are p [Role: implementer] [Files: packages/engine/src/tests/seed_loader.test.ts]


### Task taskcade-t66.4.3 Rehabilitation [2026-10-14T07:30:38.784Z]
- **Parent Task**: T66.4.3: Delete granular sub-hour raw snapshots older than 7 days after successful rollup (`taskcade-t66.4.3`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.4.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T66.4.3: Delete granular sub-hour raw snapshots older than 7 days after successful rollup [Role: type_specialist] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]
  - [ ] `taskcade-t66.4.3.2`: [Rehab 2/2] Implementation & Test Verification: T66.4.3: Delete granular sub-hour raw snapshots older than 7 days after successful rollup [Role: implementer] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]


### Task taskcade-t67.1.1 Rehabilitation [2026-10-14T07:28:54.771Z]
- **Parent Task**: T67.1.1: Refactor StreamTapManager to maintain discrete ring buffers keyed by taskId inst (`taskcade-t67.1.1`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t67.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T67.1.1: Refactor StreamTapManager to maintain discrete ring buffers keyed by taskId inst [Role: type_specialist] [Files: packages/engine/src/inference/StreamTapManager.ts]
  - [ ] `taskcade-t67.1.1.2`: [Rehab 2/2] Implementation & Test Verification: T67.1.1: Refactor StreamTapManager to maintain discrete ring buffers keyed by taskId inst [Role: implementer] [Files: packages/engine/src/inference/StreamTapManager.ts]


### Task taskcade-t70.1.1 Rehabilitation [2026-10-14T06:02:51.178Z]
- **Parent Task**: T70.1.1: Design and implement SchematicCodeGenerator in packages/engine/src/generators/Sc (`taskcade-t70.1.1`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T70.1.1: Design and implement SchematicCodeGenerator in packages/engine/src/generators/Sc [Role: type_specialist] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]
  - [ ] `taskcade-t70.1.1.2`: [Rehab 2/2] Implementation & Test Verification: T70.1.1: Design and implement SchematicCodeGenerator in packages/engine/src/generators/Sc [Role: implementer] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]


### Task taskcade-t72.3.1 Rehabilitation [2026-10-14T05:58:12.463Z]
- **Parent Task**: T72.3.1: Create EnqueueTaskcadeTaskTool in packages/tools/src/implementations/ exposing a (`taskcade-t72.3.1`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T72.3.1: Create EnqueueTaskcadeTaskTool in packages/tools/src/implementations/ exposing a [Role: type_specialist] [Files: packages/tools/src/implementations/EnqueueTaskcadeTaskTool.ts]
  - [ ] `taskcade-t72.3.1.2`: [Rehab 2/2] Implementation & Test Verification: T72.3.1: Create EnqueueTaskcadeTaskTool in packages/tools/src/implementations/ exposing a [Role: implementer] [Files: packages/tools/src/implementations/EnqueueTaskcadeTaskTool.ts]


### Task taskcade-t76.3.4 Rehabilitation [2026-10-14T05:46:33.680Z]
- **Parent Task**: T76.3.4: Write frontend unit tests validating form bindings, validation rules, and PUT /a (`taskcade-t76.3.4`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t76.3.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T76.3.4: Write frontend unit tests validating form bindings, validation rules, and PUT /a [Role: type_specialist] [Files: packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.spec.ts]
  - [ ] `taskcade-t76.3.4.2`: [Rehab 2/2] Implementation & Test Verification: T76.3.4: Write frontend unit tests validating form bindings, validation rules, and PUT /a [Role: implementer] [Files: packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.spec.ts]


### Task taskcade-t65.6.3.1 Rehabilitation [2026-10-14T00:03:49.575Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T65.6.3: Add ARIA live regions (aria-live="polite") to test status updates for screen rea (`taskcade-t65.6.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.6.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T65.6.3: Add ARIA live regions (aria-live="polite") to test status updates for screen rea [Role: type_specialist] [Files: packages/frontend/src/app/components/views/testing-view.component.ts]
  - [ ] `taskcade-t65.6.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T65.6.3: Add ARIA live regions (aria-live="polite") to test status updates for screen rea [Role: implementer] [Files: packages/frontend/src/app/components/views/testing-view.component.ts]

### Task taskcade-t65.6.3.2 Rehabilitation [2026-10-13T22:53:55.515Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T65.6.3: Add ARIA live regions (aria-live="polite") to test status updates for screen rea (`taskcade-t65.6.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.6.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T65.6.3: Add ARIA live regions (aria-live="polite") to test status updates for screen rea [Role: type_specialist] [Files: packages/frontend/src/app/components/views/testing-view.component.ts]
  - [ ] `taskcade-t65.6.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T65.6.3: Add ARIA live regions (aria-live="polite") to test status updates for screen rea [Role: implementer] [Files: packages/frontend/src/app/components/views/testing-view.component.ts]

### Task taskcade-t65.6.1.2 Rehabilitation [2026-10-13T22:48:14.929Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T65.6.1: Define CSS custom properties for Testing panel in OLED Pure Black (#000000 backg (`taskcade-t65.6.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.6.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T65.6.1: Define CSS custom properties for Testing panel in OLED Pure Black (#000000 backg [Role: type_specialist] [Files: packages/frontend/src/styles.css]
  - [ ] `taskcade-t65.6.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T65.6.1: Define CSS custom properties for Testing panel in OLED Pure Black (#000000 backg [Role: implementer] [Files: packages/frontend/src/styles.css]

### Task taskcade-t65.6.1.1 Rehabilitation [2026-10-13T22:23:04.276Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T65.6.1: Define CSS custom properties for Testing panel in OLED Pure Black (#000000 backg (`taskcade-t65.6.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.6.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T65.6.1: Define CSS custom properties for Testing panel in OLED Pure Black (#000000 backg [Role: type_specialist] [Files: packages/frontend/src/styles.css]
  - [ ] `taskcade-t65.6.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T65.6.1: Define CSS custom properties for Testing panel in OLED Pure Black (#000000 backg [Role: implementer] [Files: packages/frontend/src/styles.css]

### Task taskcade-t65.6.4.2 Rehabilitation [2026-10-13T22:10:03.283Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T65.6.4: Write unit tests verifying theme CSS classes apply correct foreground/background (`taskcade-t65.6.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.6.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T65.6.4: Write unit tests verifying theme CSS classes apply correct foreground/background [Role: type_specialist] [Files: packages/frontend/src/app/components/views/testing-view.component.spec.ts]
  - [ ] `taskcade-t65.6.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T65.6.4: Write unit tests verifying theme CSS classes apply correct foreground/background [Role: implementer] [Files: packages/frontend/src/app/components/views/testing-view.component.spec.ts]

### Task taskcade-t65.6.4.1 Rehabilitation [2026-10-13T22:06:11.576Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T65.6.4: Write unit tests verifying theme CSS classes apply correct foreground/background (`taskcade-t65.6.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.6.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T65.6.4: Write unit tests verifying theme CSS classes apply correct foreground/background [Role: type_specialist] [Files: packages/frontend/src/app/components/views/testing-view.component.spec.ts]
  - [ ] `taskcade-t65.6.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T65.6.4: Write unit tests verifying theme CSS classes apply correct foreground/background [Role: implementer] [Files: packages/frontend/src/app/components/views/testing-view.component.spec.ts]

### Task taskcade-t87.1.2.1 Rehabilitation [2026-10-13T21:53:30.087Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T87.1.2: Add `predictNextModel()` logic to `TaskScheduler` using queue heuristics (e.g., (`taskcade-t87.1.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t87.1.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T87.1.2: Add `predictNextModel()` logic to `TaskScheduler` using queue heuristics (e.g., [Role: type_specialist] [Files: packages/engine/src/scheduler/TaskScheduler.ts]
  - [ ] `taskcade-t87.1.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T87.1.2: Add `predictNextModel()` logic to `TaskScheduler` using queue heuristics (e.g., [Role: implementer] [Files: packages/engine/src/scheduler/TaskScheduler.ts]

### Task taskcade-t87.1.2.2 Rehabilitation [2026-10-13T21:08:40.249Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T87.1.2: Add `predictNextModel()` logic to `TaskScheduler` using queue heuristics (e.g., (`taskcade-t87.1.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t87.1.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T87.1.2: Add `predictNextModel()` logic to `TaskScheduler` using queue heuristics (e.g., [Role: type_specialist] [Files: packages/engine/src/scheduler/TaskScheduler.ts]
  - [ ] `taskcade-t87.1.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T87.1.2: Add `predictNextModel()` logic to `TaskScheduler` using queue heuristics (e.g., [Role: implementer] [Files: packages/engine/src/scheduler/TaskScheduler.ts]

### Task taskcade-t68.6.1.2 Rehabilitation [2026-10-13T19:59:14.239Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T68.6.1: Implement OomPredictiveGuard in packages/engine/src/hardware/OomPredictiveGuard. (`taskcade-t68.6.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.6.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T68.6.1: Implement OomPredictiveGuard in packages/engine/src/hardware/OomPredictiveGuard. [Role: type_specialist] [Files: packages/engine/src/hardware/OomPredictiveGuard.ts]
  - [ ] `taskcade-t68.6.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T68.6.1: Implement OomPredictiveGuard in packages/engine/src/hardware/OomPredictiveGuard. [Role: implementer] [Files: packages/engine/src/hardware/OomPredictiveGuard.ts]

### Task taskcade-t68.6.1.1 Rehabilitation [2026-10-13T19:52:11.467Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T68.6.1: Implement OomPredictiveGuard in packages/engine/src/hardware/OomPredictiveGuard. (`taskcade-t68.6.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.6.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T68.6.1: Implement OomPredictiveGuard in packages/engine/src/hardware/OomPredictiveGuard. [Role: type_specialist] [Files: packages/engine/src/hardware/OomPredictiveGuard.ts]
  - [ ] `taskcade-t68.6.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T68.6.1: Implement OomPredictiveGuard in packages/engine/src/hardware/OomPredictiveGuard. [Role: implementer] [Files: packages/engine/src/hardware/OomPredictiveGuard.ts]

### Task taskcade-t66.1.3.2 Rehabilitation [2026-10-13T19:44:24.550Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T66.1.3: Create index on model_health_profiles(model_id, status) ensuring rapid health pr (`taskcade-t66.1.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.1.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T66.1.3: Create index on model_health_profiles(model_id, status) ensuring rapid health pr [Role: type_specialist] [Files: packages/db/src/migrations/011_task_history_indexes.ts]
  - [ ] `taskcade-t66.1.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T66.1.3: Create index on model_health_profiles(model_id, status) ensuring rapid health pr [Role: implementer] [Files: packages/db/src/migrations/011_task_history_indexes.ts]

### Task taskcade-t66.1.3.1 Rehabilitation [2026-10-13T19:33:07.336Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T66.1.3: Create index on model_health_profiles(model_id, status) ensuring rapid health pr (`taskcade-t66.1.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.1.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T66.1.3: Create index on model_health_profiles(model_id, status) ensuring rapid health pr [Role: type_specialist] [Files: packages/db/src/migrations/011_task_history_indexes.ts]
  - [ ] `taskcade-t66.1.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T66.1.3: Create index on model_health_profiles(model_id, status) ensuring rapid health pr [Role: implementer] [Files: packages/db/src/migrations/011_task_history_indexes.ts]

### Task taskcade-t72.3.2.2 Rehabilitation [2026-10-13T19:22:32.105Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T72.3.2: Extend POST /api/tasks REST endpoint to validate and accept full metadataHints o (`taskcade-t72.3.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.3.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T72.3.2: Extend POST /api/tasks REST endpoint to validate and accept full metadataHints o [Role: type_specialist] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]
  - [ ] `taskcade-t72.3.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T72.3.2: Extend POST /api/tasks REST endpoint to validate and accept full metadataHints o [Role: implementer] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]

### Task taskcade-t72.3.2.1 Rehabilitation [2026-10-13T19:14:00.124Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T72.3.2: Extend POST /api/tasks REST endpoint to validate and accept full metadataHints o (`taskcade-t72.3.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.3.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T72.3.2: Extend POST /api/tasks REST endpoint to validate and accept full metadataHints o [Role: type_specialist] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]
  - [ ] `taskcade-t72.3.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T72.3.2: Extend POST /api/tasks REST endpoint to validate and accept full metadataHints o [Role: implementer] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]

### Task taskcade-t86.3.2.1 Rehabilitation [2026-10-13T19:09:50.281Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T86.3.2: Implement real-time SSE bindings connecting `FleetTopologyViewComponent` to `GET (`taskcade-t86.3.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.3.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T86.3.2: Implement real-time SSE bindings connecting `FleetTopologyViewComponent` to `GET [Role: type_specialist] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.ts]
  - [ ] `taskcade-t86.3.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T86.3.2: Implement real-time SSE bindings connecting `FleetTopologyViewComponent` to `GET [Role: implementer] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.ts]

### Task taskcade-t86.3.2.2 Rehabilitation [2026-10-13T18:57:29.660Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T86.3.2: Implement real-time SSE bindings connecting `FleetTopologyViewComponent` to `GET (`taskcade-t86.3.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.3.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T86.3.2: Implement real-time SSE bindings connecting `FleetTopologyViewComponent` to `GET [Role: type_specialist] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.ts]
  - [ ] `taskcade-t86.3.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T86.3.2: Implement real-time SSE bindings connecting `FleetTopologyViewComponent` to `GET [Role: implementer] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.ts]

### Task taskcade-t68.1.3.2 Rehabilitation [2026-10-13T18:52:45.314Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T68.1.3: Add dynamic KV-cache memory calculation scaling VRAM requirements by configured (`taskcade-t68.1.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.1.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T68.1.3: Add dynamic KV-cache memory calculation scaling VRAM requirements by configured [Role: type_specialist] [Files: packages/engine/src/hardware/ModelVramCatalog.ts]
  - [ ] `taskcade-t68.1.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T68.1.3: Add dynamic KV-cache memory calculation scaling VRAM requirements by configured [Role: implementer] [Files: packages/engine/src/hardware/ModelVramCatalog.ts]

### Task taskcade-t68.1.3.1 Rehabilitation [2026-10-13T18:33:33.087Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T68.1.3: Add dynamic KV-cache memory calculation scaling VRAM requirements by configured (`taskcade-t68.1.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.1.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T68.1.3: Add dynamic KV-cache memory calculation scaling VRAM requirements by configured [Role: type_specialist] [Files: packages/engine/src/hardware/ModelVramCatalog.ts]
  - [ ] `taskcade-t68.1.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T68.1.3: Add dynamic KV-cache memory calculation scaling VRAM requirements by configured [Role: implementer] [Files: packages/engine/src/hardware/ModelVramCatalog.ts]

### Task taskcade-t68.1.1.2 Rehabilitation [2026-10-13T18:28:16.441Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T68.1.1: Create ModelVramCatalog in packages/engine/src/hardware/ModelVramCatalog.ts defi (`taskcade-t68.1.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.1.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T68.1.1: Create ModelVramCatalog in packages/engine/src/hardware/ModelVramCatalog.ts defi [Role: type_specialist] [Files: packages/engine/src/hardware/ModelVramCatalog.ts]
  - [ ] `taskcade-t68.1.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T68.1.1: Create ModelVramCatalog in packages/engine/src/hardware/ModelVramCatalog.ts defi [Role: implementer] [Files: packages/engine/src/hardware/ModelVramCatalog.ts]

### Task taskcade-t68.1.1.1 Rehabilitation [2026-10-13T18:20:39.561Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T68.1.1: Create ModelVramCatalog in packages/engine/src/hardware/ModelVramCatalog.ts defi (`taskcade-t68.1.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.1.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T68.1.1: Create ModelVramCatalog in packages/engine/src/hardware/ModelVramCatalog.ts defi [Role: type_specialist] [Files: packages/engine/src/hardware/ModelVramCatalog.ts]
  - [ ] `taskcade-t68.1.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T68.1.1: Create ModelVramCatalog in packages/engine/src/hardware/ModelVramCatalog.ts defi [Role: implementer] [Files: packages/engine/src/hardware/ModelVramCatalog.ts]

### Task taskcade-t70.2.2.1 Rehabilitation [2026-10-13T18:13:13.962Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T70.2.2: Extract class names, method signatures, and exported interfaces using TypeScript (`taskcade-t70.2.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.2.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T70.2.2: Extract class names, method signatures, and exported interfaces using TypeScript [Role: type_specialist] [Files: packages/engine/src/generators/SignatureHarvester.ts]
  - [ ] `taskcade-t70.2.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T70.2.2: Extract class names, method signatures, and exported interfaces using TypeScript [Role: implementer] [Files: packages/engine/src/generators/SignatureHarvester.ts]

### Task taskcade-t70.2.2.2 Rehabilitation [2026-10-13T18:08:22.154Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T70.2.2: Extract class names, method signatures, and exported interfaces using TypeScript (`taskcade-t70.2.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.2.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T70.2.2: Extract class names, method signatures, and exported interfaces using TypeScript [Role: type_specialist] [Files: packages/engine/src/generators/SignatureHarvester.ts]
  - [ ] `taskcade-t70.2.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T70.2.2: Extract class names, method signatures, and exported interfaces using TypeScript [Role: implementer] [Files: packages/engine/src/generators/SignatureHarvester.ts]

### Task taskcade-t86.3.3.1 Rehabilitation [2026-10-13T17:55:29.002Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T86.3.3: Write Angular unit and integration tests verifying topology reflow on node conne (`taskcade-t86.3.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.3.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T86.3.3: Write Angular unit and integration tests verifying topology reflow on node conne [Role: type_specialist] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.spec.ts]
  - [ ] `taskcade-t86.3.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T86.3.3: Write Angular unit and integration tests verifying topology reflow on node conne [Role: implementer] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.spec.ts]

### Task taskcade-t86.3.3.2 Rehabilitation [2026-10-13T17:48:33.151Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T86.3.3: Write Angular unit and integration tests verifying topology reflow on node conne (`taskcade-t86.3.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.3.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T86.3.3: Write Angular unit and integration tests verifying topology reflow on node conne [Role: type_specialist] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.spec.ts]
  - [ ] `taskcade-t86.3.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T86.3.3: Write Angular unit and integration tests verifying topology reflow on node conne [Role: implementer] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.spec.ts]

### Task taskcade-t71.2.1.2 Rehabilitation [2026-10-13T17:39:09.262Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T71.2.1: Implement abstract ComputeHardwareProfile interface accommodating discrete GPUs, (`taskcade-t71.2.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t71.2.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T71.2.1: Implement abstract ComputeHardwareProfile interface accommodating discrete GPUs, [Role: type_specialist] [Files: packages/engine/src/hardware/ComputeHardwareProfile.ts]
  - [ ] `taskcade-t71.2.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T71.2.1: Implement abstract ComputeHardwareProfile interface accommodating discrete GPUs, [Role: implementer] [Files: packages/engine/src/hardware/ComputeHardwareProfile.ts]

### Task taskcade-t71.2.1.1 Rehabilitation [2026-10-13T17:24:13.186Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T71.2.1: Implement abstract ComputeHardwareProfile interface accommodating discrete GPUs, (`taskcade-t71.2.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t71.2.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T71.2.1: Implement abstract ComputeHardwareProfile interface accommodating discrete GPUs, [Role: type_specialist] [Files: packages/engine/src/hardware/ComputeHardwareProfile.ts]
  - [ ] `taskcade-t71.2.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T71.2.1: Implement abstract ComputeHardwareProfile interface accommodating discrete GPUs, [Role: implementer] [Files: packages/engine/src/hardware/ComputeHardwareProfile.ts]

### Task taskcade-t65.4.4.1 Rehabilitation [2026-10-13T17:14:05.425Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T65.4.4: Write unit tests verifying ProcessDrawerComponent expands and collapses cleanly (`taskcade-t65.4.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.4.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T65.4.4: Write unit tests verifying ProcessDrawerComponent expands and collapses cleanly [Role: type_specialist] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.spec.ts]
  - [ ] `taskcade-t65.4.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T65.4.4: Write unit tests verifying ProcessDrawerComponent expands and collapses cleanly [Role: implementer] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.spec.ts]

### Task taskcade-t65.4.4.2 Rehabilitation [2026-10-13T17:10:56.542Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T65.4.4: Write unit tests verifying ProcessDrawerComponent expands and collapses cleanly (`taskcade-t65.4.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.4.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T65.4.4: Write unit tests verifying ProcessDrawerComponent expands and collapses cleanly [Role: type_specialist] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.spec.ts]
  - [ ] `taskcade-t65.4.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T65.4.4: Write unit tests verifying ProcessDrawerComponent expands and collapses cleanly [Role: implementer] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.spec.ts]

### Task taskcade-t74.7.4.1 Rehabilitation [2026-10-13T17:08:24.239Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T74.7.4: Write unit tests verifying backup creation, retention pruning, and error handlin (`taskcade-t74.7.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.7.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T74.7.4: Write unit tests verifying backup creation, retention pruning, and error handlin [Role: type_specialist] [Files: packages/db/src/tests/backup_service.test.ts]
  - [ ] `taskcade-t74.7.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T74.7.4: Write unit tests verifying backup creation, retention pruning, and error handlin [Role: implementer] [Files: packages/db/src/tests/backup_service.test.ts]

### Task taskcade-t74.7.4.2 Rehabilitation [2026-10-13T17:07:04.067Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T74.7.4: Write unit tests verifying backup creation, retention pruning, and error handlin (`taskcade-t74.7.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.7.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T74.7.4: Write unit tests verifying backup creation, retention pruning, and error handlin [Role: type_specialist] [Files: packages/db/src/tests/backup_service.test.ts]
  - [ ] `taskcade-t74.7.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T74.7.4: Write unit tests verifying backup creation, retention pruning, and error handlin [Role: implementer] [Files: packages/db/src/tests/backup_service.test.ts]

### Task taskcade-t72.1.1.2 Rehabilitation [2026-10-13T16:36:21.008Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T72.1.1: Extend TaskcadeSeedLoader markdown parser to extract inline bracket metadata ann (`taskcade-t72.1.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.1.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T72.1.1: Extend TaskcadeSeedLoader markdown parser to extract inline bracket metadata ann [Role: type_specialist] [Files: packages/engine/src/scheduler/TaskcadeSeedLoader.ts]
  - [ ] `taskcade-t72.1.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T72.1.1: Extend TaskcadeSeedLoader markdown parser to extract inline bracket metadata ann [Role: implementer] [Files: packages/engine/src/scheduler/TaskcadeSeedLoader.ts]

### Task taskcade-t72.1.1.1 Rehabilitation [2026-10-13T16:10:05.141Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T72.1.1: Extend TaskcadeSeedLoader markdown parser to extract inline bracket metadata ann (`taskcade-t72.1.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.1.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T72.1.1: Extend TaskcadeSeedLoader markdown parser to extract inline bracket metadata ann [Role: type_specialist] [Files: packages/engine/src/scheduler/TaskcadeSeedLoader.ts]
  - [ ] `taskcade-t72.1.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T72.1.1: Extend TaskcadeSeedLoader markdown parser to extract inline bracket metadata ann [Role: implementer] [Files: packages/engine/src/scheduler/TaskcadeSeedLoader.ts]

### Task taskcade-t68.5.3.2 Rehabilitation [2026-10-13T16:01:45.891Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T68.5.3: Balance concurrent models across discrete GPU and APU when dual-accelerator hard (`taskcade-t68.5.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.5.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T68.5.3: Balance concurrent models across discrete GPU and APU when dual-accelerator hard [Role: type_specialist] [Files: packages/engine/src/hardware/MultiGpuTaskRouter.ts]
  - [ ] `taskcade-t68.5.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T68.5.3: Balance concurrent models across discrete GPU and APU when dual-accelerator hard [Role: implementer] [Files: packages/engine/src/hardware/MultiGpuTaskRouter.ts]

### Task taskcade-t68.5.3.1 Rehabilitation [2026-10-13T15:53:44.280Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T68.5.3: Balance concurrent models across discrete GPU and APU when dual-accelerator hard (`taskcade-t68.5.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.5.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T68.5.3: Balance concurrent models across discrete GPU and APU when dual-accelerator hard [Role: type_specialist] [Files: packages/engine/src/hardware/MultiGpuTaskRouter.ts]
  - [ ] `taskcade-t68.5.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T68.5.3: Balance concurrent models across discrete GPU and APU when dual-accelerator hard [Role: implementer] [Files: packages/engine/src/hardware/MultiGpuTaskRouter.ts]

### Task taskcade-t74.4.4.2 Rehabilitation [2026-10-13T15:46:21.035Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T74.4.4: Add code coverage reporting with minimum threshold gate (e.g. 40% initial, incre (`taskcade-t74.4.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.4.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T74.4.4: Add code coverage reporting with minimum threshold gate (e.g. 40% initial, incre [Role: type_specialist] [Files: .github/workflows/ci.yml]
  - [ ] `taskcade-t74.4.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T74.4.4: Add code coverage reporting with minimum threshold gate (e.g. 40% initial, incre [Role: implementer] [Files: .github/workflows/ci.yml]

### Task taskcade-t74.4.4.1 Rehabilitation [2026-10-13T15:40:48.581Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T74.4.4: Add code coverage reporting with minimum threshold gate (e.g. 40% initial, incre (`taskcade-t74.4.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.4.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T74.4.4: Add code coverage reporting with minimum threshold gate (e.g. 40% initial, incre [Role: type_specialist] [Files: .github/workflows/ci.yml]
  - [ ] `taskcade-t74.4.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T74.4.4: Add code coverage reporting with minimum threshold gate (e.g. 40% initial, incre [Role: implementer] [Files: .github/workflows/ci.yml]

### Task taskcade-t64.3.1.1 Rehabilitation [2026-10-13T15:14:16.370Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T64.3.1: Implement GiteaPrClient in packages/engine/src/gitea/GiteaPrClient.ts interactin (`taskcade-t64.3.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.3.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T64.3.1: Implement GiteaPrClient in packages/engine/src/gitea/GiteaPrClient.ts interactin [Role: type_specialist] [Files: packages/engine/src/gitea/GiteaPrClient.ts]
  - [ ] `taskcade-t64.3.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T64.3.1: Implement GiteaPrClient in packages/engine/src/gitea/GiteaPrClient.ts interactin [Role: implementer] [Files: packages/engine/src/gitea/GiteaPrClient.ts]

### Task taskcade-t64.3.1.2 Rehabilitation [2026-10-13T15:06:57.468Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T64.3.1: Implement GiteaPrClient in packages/engine/src/gitea/GiteaPrClient.ts interactin (`taskcade-t64.3.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.3.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T64.3.1: Implement GiteaPrClient in packages/engine/src/gitea/GiteaPrClient.ts interactin [Role: type_specialist] [Files: packages/engine/src/gitea/GiteaPrClient.ts]
  - [ ] `taskcade-t64.3.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T64.3.1: Implement GiteaPrClient in packages/engine/src/gitea/GiteaPrClient.ts interactin [Role: implementer] [Files: packages/engine/src/gitea/GiteaPrClient.ts]

### Task taskcade-t86.2.2.2 Rehabilitation [2026-10-13T14:40:08.873Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T86.2.2: Refactor `TaskScheduler` to leverage `DistributedTaskDispatcher` for offloading (`taskcade-t86.2.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.2.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T86.2.2: Refactor `TaskScheduler` to leverage `DistributedTaskDispatcher` for offloading [Role: type_specialist] [Files: packages/engine/src/scheduler/TaskScheduler.ts]
  - [ ] `taskcade-t86.2.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T86.2.2: Refactor `TaskScheduler` to leverage `DistributedTaskDispatcher` for offloading [Role: implementer] [Files: packages/engine/src/scheduler/TaskScheduler.ts]

### Task taskcade-t66.5.4.1 Rehabilitation [2026-10-13T13:39:02.400Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T66.5.4: Write CLI integration tests verifying history reset and prune subcommands intera (`taskcade-t66.5.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.5.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T66.5.4: Write CLI integration tests verifying history reset and prune subcommands intera [Role: type_specialist] [Files: packages/engine/src/tests/cli_history.test.ts]
  - [ ] `taskcade-t66.5.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T66.5.4: Write CLI integration tests verifying history reset and prune subcommands intera [Role: implementer] [Files: packages/engine/src/tests/cli_history.test.ts]

### Task taskcade-t66.5.4.2 Rehabilitation [2026-10-13T13:29:27.352Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T66.5.4: Write CLI integration tests verifying history reset and prune subcommands intera (`taskcade-t66.5.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.5.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T66.5.4: Write CLI integration tests verifying history reset and prune subcommands intera [Role: type_specialist] [Files: packages/engine/src/tests/cli_history.test.ts]
  - [ ] `taskcade-t66.5.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T66.5.4: Write CLI integration tests verifying history reset and prune subcommands intera [Role: implementer] [Files: packages/engine/src/tests/cli_history.test.ts]

### Task taskcade-t86.2.3.2 Rehabilitation [2026-10-13T13:20:03.689Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T86.2.3: Integrate task migration logic: if a node reports THERMAL_THROTTLING, gracefully (`taskcade-t86.2.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.2.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T86.2.3: Integrate task migration logic: if a node reports THERMAL_THROTTLING, gracefully [Role: type_specialist] [Files: packages/engine/src/scheduler/DistributedTaskDispatcher.ts]
  - [ ] `taskcade-t86.2.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T86.2.3: Integrate task migration logic: if a node reports THERMAL_THROTTLING, gracefully [Role: implementer] [Files: packages/engine/src/scheduler/DistributedTaskDispatcher.ts]

### Task taskcade-t86.2.3.1 Rehabilitation [2026-10-13T13:15:35.299Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T86.2.3: Integrate task migration logic: if a node reports THERMAL_THROTTLING, gracefully (`taskcade-t86.2.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.2.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T86.2.3: Integrate task migration logic: if a node reports THERMAL_THROTTLING, gracefully [Role: type_specialist] [Files: packages/engine/src/scheduler/DistributedTaskDispatcher.ts]
  - [ ] `taskcade-t86.2.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T86.2.3: Integrate task migration logic: if a node reports THERMAL_THROTTLING, gracefully [Role: implementer] [Files: packages/engine/src/scheduler/DistributedTaskDispatcher.ts]

### Task taskcade-t86.3.1.2 Rehabilitation [2026-10-13T12:58:04.502Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T86.3.1: Create `FleetTopologyViewComponent` in `packages/frontend/src/app/components/vie (`taskcade-t86.3.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.3.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T86.3.1: Create `FleetTopologyViewComponent` in `packages/frontend/src/app/components/vie [Role: type_specialist] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.ts]
  - [ ] `taskcade-t86.3.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T86.3.1: Create `FleetTopologyViewComponent` in `packages/frontend/src/app/components/vie [Role: implementer] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.ts]

### Task taskcade-t86.3.1.1 Rehabilitation [2026-10-13T12:48:51.851Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T86.3.1: Create `FleetTopologyViewComponent` in `packages/frontend/src/app/components/vie (`taskcade-t86.3.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.3.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T86.3.1: Create `FleetTopologyViewComponent` in `packages/frontend/src/app/components/vie [Role: type_specialist] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.ts]
  - [ ] `taskcade-t86.3.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T86.3.1: Create `FleetTopologyViewComponent` in `packages/frontend/src/app/components/vie [Role: implementer] [Files: packages/frontend/src/app/components/views/fleet-topology-view.component.ts]

### Task taskcade-t64.2.4.2 Rehabilitation [2026-10-13T12:39:57.358Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T64.2.4: Write unit tests verifying commit message adheres to conventional commits standa (`taskcade-t64.2.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.2.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T64.2.4: Write unit tests verifying commit message adheres to conventional commits standa [Role: type_specialist] [Files: packages/engine/src/tests/commit_generator.test.ts]
  - [ ] `taskcade-t64.2.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T64.2.4: Write unit tests verifying commit message adheres to conventional commits standa [Role: implementer] [Files: packages/engine/src/tests/commit_generator.test.ts]

### Task taskcade-t64.2.4.1 Rehabilitation [2026-10-13T12:36:25.987Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T64.2.4: Write unit tests verifying commit message adheres to conventional commits standa (`taskcade-t64.2.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.2.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T64.2.4: Write unit tests verifying commit message adheres to conventional commits standa [Role: type_specialist] [Files: packages/engine/src/tests/commit_generator.test.ts]
  - [ ] `taskcade-t64.2.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T64.2.4: Write unit tests verifying commit message adheres to conventional commits standa [Role: implementer] [Files: packages/engine/src/tests/commit_generator.test.ts]

### Task taskcade-t70.3.4.1 Rehabilitation [2026-10-13T12:20:18.194Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T70.3.4: Write integration tests verifying end-to-end task execution with schematic code (`taskcade-t70.3.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.3.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T70.3.4: Write integration tests verifying end-to-end task execution with schematic code [Role: type_specialist] [Files: packages/engine/src/tests/schematic_pipeline_integration.test.ts]
  - [ ] `taskcade-t70.3.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T70.3.4: Write integration tests verifying end-to-end task execution with schematic code [Role: implementer] [Files: packages/engine/src/tests/schematic_pipeline_integration.test.ts]

### Task taskcade-t70.3.4.2 Rehabilitation [2026-10-13T12:17:25.153Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T70.3.4: Write integration tests verifying end-to-end task execution with schematic code (`taskcade-t70.3.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.3.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T70.3.4: Write integration tests verifying end-to-end task execution with schematic code [Role: type_specialist] [Files: packages/engine/src/tests/schematic_pipeline_integration.test.ts]
  - [ ] `taskcade-t70.3.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T70.3.4: Write integration tests verifying end-to-end task execution with schematic code [Role: implementer] [Files: packages/engine/src/tests/schematic_pipeline_integration.test.ts]

### Task taskcade-t70.2.1.2 Rehabilitation [2026-10-13T11:50:38.244Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T70.2.1: Pre-populate all requisite monorepo and standard library imports into generated (`taskcade-t70.2.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t70.2.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T70.2.1: Pre-populate all requisite monorepo and standard library imports into generated [Role: type_specialist] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]
  - [x] `taskcade-t70.2.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T70.2.1: Pre-populate all requisite monorepo and standard library imports into generated [Role: implementer] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]

### Task taskcade-t70.2.1.1 Rehabilitation [2026-10-13T11:30:23.499Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T70.2.1: Pre-populate all requisite monorepo and standard library imports into generated (`taskcade-t70.2.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t70.2.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T70.2.1: Pre-populate all requisite monorepo and standard library imports into generated [Role: type_specialist] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]
  - [x] `taskcade-t70.2.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T70.2.1: Pre-populate all requisite monorepo and standard library imports into generated [Role: implementer] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]

### Task taskcade-t68.5.4.2 Rehabilitation [2026-10-13T11:11:06.510Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T68.5.4: Write unit tests verifying multi-GPU router assigns tasks to the accelerator wit (`taskcade-t68.5.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.5.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T68.5.4: Write unit tests verifying multi-GPU router assigns tasks to the accelerator wit [Role: type_specialist] [Files: packages/engine/src/tests/multi_gpu_router.test.ts]
  - [ ] `taskcade-t68.5.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T68.5.4: Write unit tests verifying multi-GPU router assigns tasks to the accelerator wit [Role: implementer] [Files: packages/engine/src/tests/multi_gpu_router.test.ts]

### Task taskcade-t68.5.4.1 Rehabilitation [2026-10-13T11:06:11.760Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T68.5.4: Write unit tests verifying multi-GPU router assigns tasks to the accelerator wit (`taskcade-t68.5.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.5.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T68.5.4: Write unit tests verifying multi-GPU router assigns tasks to the accelerator wit [Role: type_specialist] [Files: packages/engine/src/tests/multi_gpu_router.test.ts]
  - [ ] `taskcade-t68.5.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T68.5.4: Write unit tests verifying multi-GPU router assigns tasks to the accelerator wit [Role: implementer] [Files: packages/engine/src/tests/multi_gpu_router.test.ts]

### Task taskcade-t86.2.1.1 Rehabilitation [2026-10-13T11:03:21.452Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T86.2.1: Implement `DistributedTaskDispatcher` in `packages/engine/src/scheduler/Distribu (`taskcade-t86.2.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.2.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T86.2.1: Implement `DistributedTaskDispatcher` in `packages/engine/src/scheduler/Distribu [Role: type_specialist] [Files: packages/engine/src/scheduler/DistributedTaskDispatcher.ts]
  - [ ] `taskcade-t86.2.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T86.2.1: Implement `DistributedTaskDispatcher` in `packages/engine/src/scheduler/Distribu [Role: implementer] [Files: packages/engine/src/scheduler/DistributedTaskDispatcher.ts]

### Task taskcade-t86.2.1.2 Rehabilitation [2026-10-13T11:02:18.582Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T86.2.1: Implement `DistributedTaskDispatcher` in `packages/engine/src/scheduler/Distribu (`taskcade-t86.2.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.2.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T86.2.1: Implement `DistributedTaskDispatcher` in `packages/engine/src/scheduler/Distribu [Role: type_specialist] [Files: packages/engine/src/scheduler/DistributedTaskDispatcher.ts]
  - [ ] `taskcade-t86.2.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T86.2.1: Implement `DistributedTaskDispatcher` in `packages/engine/src/scheduler/Distribu [Role: implementer] [Files: packages/engine/src/scheduler/DistributedTaskDispatcher.ts]

### Task taskcade-t64.4.3.2 Rehabilitation [2026-10-13T10:46:29.269Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T64.4.3: Parse structured review verdict: APPROVE, COMMENT, or REQUEST_CHANGES with detai (`taskcade-t64.4.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.4.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T64.4.3: Parse structured review verdict: APPROVE, COMMENT, or REQUEST_CHANGES with detai [Role: type_specialist] [Files: packages/engine/src/gitea/AutomatedPrReviewer.ts]
  - [ ] `taskcade-t64.4.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T64.4.3: Parse structured review verdict: APPROVE, COMMENT, or REQUEST_CHANGES with detai [Role: implementer] [Files: packages/engine/src/gitea/AutomatedPrReviewer.ts]

### Task taskcade-t64.4.3.1 Rehabilitation [2026-10-13T10:34:25.849Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T64.4.3: Parse structured review verdict: APPROVE, COMMENT, or REQUEST_CHANGES with detai (`taskcade-t64.4.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.4.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T64.4.3: Parse structured review verdict: APPROVE, COMMENT, or REQUEST_CHANGES with detai [Role: type_specialist] [Files: packages/engine/src/gitea/AutomatedPrReviewer.ts]
  - [ ] `taskcade-t64.4.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T64.4.3: Parse structured review verdict: APPROVE, COMMENT, or REQUEST_CHANGES with detai [Role: implementer] [Files: packages/engine/src/gitea/AutomatedPrReviewer.ts]

### Task taskcade-t70.1.1.2 Rehabilitation [2026-10-13T10:22:40.708Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T70.1.1: Design and implement SchematicCodeGenerator in packages/engine/src/generators/Sc (`taskcade-t70.1.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.1.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T70.1.1: Design and implement SchematicCodeGenerator in packages/engine/src/generators/Sc [Role: type_specialist] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]
  - [ ] `taskcade-t70.1.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T70.1.1: Design and implement SchematicCodeGenerator in packages/engine/src/generators/Sc [Role: implementer] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]

### Task taskcade-t70.1.1.1 Rehabilitation [2026-10-13T10:06:00.472Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T70.1.1: Design and implement SchematicCodeGenerator in packages/engine/src/generators/Sc (`taskcade-t70.1.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.1.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T70.1.1: Design and implement SchematicCodeGenerator in packages/engine/src/generators/Sc [Role: type_specialist] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]
  - [ ] `taskcade-t70.1.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T70.1.1: Design and implement SchematicCodeGenerator in packages/engine/src/generators/Sc [Role: implementer] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]

### Task taskcade-t66.4.3.2 Rehabilitation [2026-10-13T09:37:49.417Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T66.4.3: Delete granular sub-hour raw snapshots older than 7 days after successful rollup (`taskcade-t66.4.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.4.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T66.4.3: Delete granular sub-hour raw snapshots older than 7 days after successful rollup [Role: type_specialist] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]
  - [ ] `taskcade-t66.4.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T66.4.3: Delete granular sub-hour raw snapshots older than 7 days after successful rollup [Role: implementer] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]

### Task taskcade-t66.4.3.1 Rehabilitation [2026-10-13T09:23:40.634Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T66.4.3: Delete granular sub-hour raw snapshots older than 7 days after successful rollup (`taskcade-t66.4.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.4.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T66.4.3: Delete granular sub-hour raw snapshots older than 7 days after successful rollup [Role: type_specialist] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]
  - [ ] `taskcade-t66.4.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T66.4.3: Delete granular sub-hour raw snapshots older than 7 days after successful rollup [Role: implementer] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]

### Task taskcade-t64.2.2.2 Rehabilitation [2026-10-13T09:03:20.504Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T64.2.2: Map task role to commit type: implementer -> feat/fix, architect -> refactor, re (`taskcade-t64.2.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.2.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T64.2.2: Map task role to commit type: implementer -> feat/fix, architect -> refactor, re [Role: type_specialist] [Files: packages/engine/src/gitea/ConventionalCommitGenerator.ts]
  - [ ] `taskcade-t64.2.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T64.2.2: Map task role to commit type: implementer -> feat/fix, architect -> refactor, re [Role: implementer] [Files: packages/engine/src/gitea/ConventionalCommitGenerator.ts]

### Task taskcade-t64.2.2.1 Rehabilitation [2026-10-13T09:00:41.153Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T64.2.2: Map task role to commit type: implementer -> feat/fix, architect -> refactor, re (`taskcade-t64.2.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.2.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T64.2.2: Map task role to commit type: implementer -> feat/fix, architect -> refactor, re [Role: type_specialist] [Files: packages/engine/src/gitea/ConventionalCommitGenerator.ts]
  - [ ] `taskcade-t64.2.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T64.2.2: Map task role to commit type: implementer -> feat/fix, architect -> refactor, re [Role: implementer] [Files: packages/engine/src/gitea/ConventionalCommitGenerator.ts]

### Task taskcade-t64.6.1.1 Rehabilitation [2026-10-13T08:49:45.193Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T64.6.1: Implement mergePullRequest(prIndex: number, mergeStyle: 'squash' = 'squash') in (`taskcade-t64.6.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.6.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T64.6.1: Implement mergePullRequest(prIndex: number, mergeStyle: 'squash' = 'squash') in [Role: type_specialist] [Files: packages/engine/src/gitea/GiteaPrClient.ts]
  - [ ] `taskcade-t64.6.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T64.6.1: Implement mergePullRequest(prIndex: number, mergeStyle: 'squash' = 'squash') in [Role: implementer] [Files: packages/engine/src/gitea/GiteaPrClient.ts]

### Task taskcade-t64.6.1.2 Rehabilitation [2026-10-13T08:45:59.159Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T64.6.1: Implement mergePullRequest(prIndex: number, mergeStyle: 'squash' = 'squash') in (`taskcade-t64.6.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.6.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T64.6.1: Implement mergePullRequest(prIndex: number, mergeStyle: 'squash' = 'squash') in [Role: type_specialist] [Files: packages/engine/src/gitea/GiteaPrClient.ts]
  - [ ] `taskcade-t64.6.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T64.6.1: Implement mergePullRequest(prIndex: number, mergeStyle: 'squash' = 'squash') in [Role: implementer] [Files: packages/engine/src/gitea/GiteaPrClient.ts]

### Task taskcade-t66.4.2.2 Rehabilitation [2026-10-13T08:27:04.597Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T66.4.2: Aggregate high-frequency (1s) telemetry snapshots older than 7 days into 1-hour (`taskcade-t66.4.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.4.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T66.4.2: Aggregate high-frequency (1s) telemetry snapshots older than 7 days into 1-hour [Role: type_specialist] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]
  - [ ] `taskcade-t66.4.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T66.4.2: Aggregate high-frequency (1s) telemetry snapshots older than 7 days into 1-hour [Role: implementer] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]

### Task taskcade-t66.4.2.1 Rehabilitation [2026-10-13T08:19:12.403Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T66.4.2: Aggregate high-frequency (1s) telemetry snapshots older than 7 days into 1-hour (`taskcade-t66.4.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.4.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T66.4.2: Aggregate high-frequency (1s) telemetry snapshots older than 7 days into 1-hour [Role: type_specialist] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]
  - [ ] `taskcade-t66.4.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T66.4.2: Aggregate high-frequency (1s) telemetry snapshots older than 7 days into 1-hour [Role: implementer] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]

### Task taskcade-t67.3.4.2 Rehabilitation [2026-10-13T08:14:23.831Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T67.3.4: Write frontend unit tests verifying smoothed velocity calculation dampens sudden (`taskcade-t67.3.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t67.3.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T67.3.4: Write frontend unit tests verifying smoothed velocity calculation dampens sudden [Role: type_specialist] [Files: packages/frontend/src/app/services/arena-state.store.spec.ts]
  - [ ] `taskcade-t67.3.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T67.3.4: Write frontend unit tests verifying smoothed velocity calculation dampens sudden [Role: implementer] [Files: packages/frontend/src/app/services/arena-state.store.spec.ts]

### Task taskcade-t67.3.4.1 Rehabilitation [2026-10-13T08:06:48.236Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T67.3.4: Write frontend unit tests verifying smoothed velocity calculation dampens sudden (`taskcade-t67.3.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t67.3.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T67.3.4: Write frontend unit tests verifying smoothed velocity calculation dampens sudden [Role: type_specialist] [Files: packages/frontend/src/app/services/arena-state.store.spec.ts]
  - [ ] `taskcade-t67.3.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T67.3.4: Write frontend unit tests verifying smoothed velocity calculation dampens sudden [Role: implementer] [Files: packages/frontend/src/app/services/arena-state.store.spec.ts]

### Task taskcade-t65.3.1.2 Rehabilitation [2026-10-13T07:56:13.911Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T65.3.1: Create TestFilterToolbarComponent providing filter pills (ALL, PASSED, FAILED, R (`taskcade-t65.3.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.3.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T65.3.1: Create TestFilterToolbarComponent providing filter pills (ALL, PASSED, FAILED, R [Role: type_specialist] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts]
  - [ ] `taskcade-t65.3.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T65.3.1: Create TestFilterToolbarComponent providing filter pills (ALL, PASSED, FAILED, R [Role: implementer] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts]

### Task taskcade-t65.3.1.1 Rehabilitation [2026-10-13T07:53:05.810Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T65.3.1: Create TestFilterToolbarComponent providing filter pills (ALL, PASSED, FAILED, R (`taskcade-t65.3.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.3.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T65.3.1: Create TestFilterToolbarComponent providing filter pills (ALL, PASSED, FAILED, R [Role: type_specialist] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts]
  - [ ] `taskcade-t65.3.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T65.3.1: Create TestFilterToolbarComponent providing filter pills (ALL, PASSED, FAILED, R [Role: implementer] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts]

### Task taskcade-t64.2.3.1 Rehabilitation [2026-10-13T07:47:42.890Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T64.2.3: Enforce strict zero-emoji validation: verify commit message contains zero Unicod (`taskcade-t64.2.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.2.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T64.2.3: Enforce strict zero-emoji validation: verify commit message contains zero Unicod [Role: type_specialist] [Files: packages/engine/src/gitea/ConventionalCommitGenerator.ts]
  - [ ] `taskcade-t64.2.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T64.2.3: Enforce strict zero-emoji validation: verify commit message contains zero Unicod [Role: implementer] [Files: packages/engine/src/gitea/ConventionalCommitGenerator.ts]

### Task taskcade-t64.2.3.2 Rehabilitation [2026-10-13T07:42:21.822Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T64.2.3: Enforce strict zero-emoji validation: verify commit message contains zero Unicod (`taskcade-t64.2.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.2.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T64.2.3: Enforce strict zero-emoji validation: verify commit message contains zero Unicod [Role: type_specialist] [Files: packages/engine/src/gitea/ConventionalCommitGenerator.ts]
  - [ ] `taskcade-t64.2.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T64.2.3: Enforce strict zero-emoji validation: verify commit message contains zero Unicod [Role: implementer] [Files: packages/engine/src/gitea/ConventionalCommitGenerator.ts]

### Task taskcade-t70.3.2.1 Rehabilitation [2026-10-13T07:25:05.090Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T70.3.2: Verify slot-fill output passes AST validation (AstValidator) before merging into (`taskcade-t70.3.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.3.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T70.3.2: Verify slot-fill output passes AST validation (AstValidator) before merging into [Role: type_specialist] [Files: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts]
  - [ ] `taskcade-t70.3.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T70.3.2: Verify slot-fill output passes AST validation (AstValidator) before merging into [Role: implementer] [Files: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts]

### Task taskcade-t65.3.2.2 Rehabilitation [2026-10-13T07:17:46.354Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T65.3.2: Implement 200ms debounce on search input filtering historical runs by task ID, t (`taskcade-t65.3.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.3.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T65.3.2: Implement 200ms debounce on search input filtering historical runs by task ID, t [Role: type_specialist] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts]
  - [ ] `taskcade-t65.3.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T65.3.2: Implement 200ms debounce on search input filtering historical runs by task ID, t [Role: implementer] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts]

### Task taskcade-t65.3.2.1 Rehabilitation [2026-10-13T07:15:05.346Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T65.3.2: Implement 200ms debounce on search input filtering historical runs by task ID, t (`taskcade-t65.3.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.3.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T65.3.2: Implement 200ms debounce on search input filtering historical runs by task ID, t [Role: type_specialist] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts]
  - [ ] `taskcade-t65.3.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T65.3.2: Implement 200ms debounce on search input filtering historical runs by task ID, t [Role: implementer] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts]

### Task taskcade-t64.5.2.2 Rehabilitation [2026-10-13T07:02:26.973Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T64.5.2: Set commit status check (POST /api/v1/repos/{owner}/{repo}/statuses/{sha}) to 's (`taskcade-t64.5.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.5.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T64.5.2: Set commit status check (POST /api/v1/repos/{owner}/{repo}/statuses/{sha}) to 's [Role: type_specialist] [Files: packages/engine/src/gitea/GiteaPrClient.ts]
  - [ ] `taskcade-t64.5.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T64.5.2: Set commit status check (POST /api/v1/repos/{owner}/{repo}/statuses/{sha}) to 's [Role: implementer] [Files: packages/engine/src/gitea/GiteaPrClient.ts]

### Task taskcade-t64.5.2.1 Rehabilitation [2026-10-13T06:56:41.152Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T64.5.2: Set commit status check (POST /api/v1/repos/{owner}/{repo}/statuses/{sha}) to 's (`taskcade-t64.5.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.5.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T64.5.2: Set commit status check (POST /api/v1/repos/{owner}/{repo}/statuses/{sha}) to 's [Role: type_specialist] [Files: packages/engine/src/gitea/GiteaPrClient.ts]
  - [ ] `taskcade-t64.5.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T64.5.2: Set commit status check (POST /api/v1/repos/{owner}/{repo}/statuses/{sha}) to 's [Role: implementer] [Files: packages/engine/src/gitea/GiteaPrClient.ts]

### Task taskcade-t65.1.4.1 Rehabilitation [2026-10-13T06:44:37.774Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T65.1.4: Write frontend unit tests verifying mobile card view renders required action tri (`taskcade-t65.1.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.1.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T65.1.4: Write frontend unit tests verifying mobile card view renders required action tri [Role: type_specialist] [Files: packages/frontend/src/app/components/views/testing-view.component.spec.ts]
  - [ ] `taskcade-t65.1.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T65.1.4: Write frontend unit tests verifying mobile card view renders required action tri [Role: implementer] [Files: packages/frontend/src/app/components/views/testing-view.component.spec.ts]

### Task taskcade-t65.1.4.2 Rehabilitation [2026-10-13T06:36:22.209Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T65.1.4: Write frontend unit tests verifying mobile card view renders required action tri (`taskcade-t65.1.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.1.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T65.1.4: Write frontend unit tests verifying mobile card view renders required action tri [Role: type_specialist] [Files: packages/frontend/src/app/components/views/testing-view.component.spec.ts]
  - [ ] `taskcade-t65.1.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T65.1.4: Write frontend unit tests verifying mobile card view renders required action tri [Role: implementer] [Files: packages/frontend/src/app/components/views/testing-view.component.spec.ts]

### Task taskcade-t68.4.3.1 Rehabilitation [2026-10-13T06:29:46.330Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T68.4.3: Poll /api/ps with 500ms backoff verifying previous model has been purged from GP (`taskcade-t68.4.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.4.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T68.4.3: Poll /api/ps with 500ms backoff verifying previous model has been purged from GP [Role: type_specialist] [Files: packages/engine/src/inference/OllamaProvider.ts]
  - [ ] `taskcade-t68.4.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T68.4.3: Poll /api/ps with 500ms backoff verifying previous model has been purged from GP [Role: implementer] [Files: packages/engine/src/inference/OllamaProvider.ts]

### Task taskcade-t68.4.3.2 Rehabilitation [2026-10-13T06:14:28.598Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T68.4.3: Poll /api/ps with 500ms backoff verifying previous model has been purged from GP (`taskcade-t68.4.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.4.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T68.4.3: Poll /api/ps with 500ms backoff verifying previous model has been purged from GP [Role: type_specialist] [Files: packages/engine/src/inference/OllamaProvider.ts]
  - [ ] `taskcade-t68.4.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T68.4.3: Poll /api/ps with 500ms backoff verifying previous model has been purged from GP [Role: implementer] [Files: packages/engine/src/inference/OllamaProvider.ts]

### Task taskcade-t72.1.4.2 Rehabilitation [2026-10-13T05:52:27.660Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are p (`taskcade-t72.1.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t72.1.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are p [Role: type_specialist] [Files: packages/engine/src/tests/seed_loader.test.ts]
  - [x] `taskcade-t72.1.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are p [Role: implementer] [Files: packages/engine/src/tests/seed_loader.test.ts]

### Task taskcade-t72.1.4.1 Rehabilitation [2026-10-13T05:49:26.704Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are p (`taskcade-t72.1.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t72.1.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are p [Role: type_specialist] [Files: packages/engine/src/tests/seed_loader.test.ts]
  - [x] `taskcade-t72.1.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T72.1.4: Write comprehensive unit tests verifying that complex metadata annotations are p [Role: implementer] [Files: packages/engine/src/tests/seed_loader.test.ts]

### Task taskcade-t72.1.3.2 Rehabilitation [2026-10-13T05:27:19.980Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T72.1.3: Update TaskRecord and database schema to store structured metadataHints JSON pay (`taskcade-t72.1.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.1.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T72.1.3: Update TaskRecord and database schema to store structured metadataHints JSON pay [Role: type_specialist] [Files: packages/db/src/repositories/TaskRepository.ts]
  - [ ] `taskcade-t72.1.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T72.1.3: Update TaskRecord and database schema to store structured metadataHints JSON pay [Role: implementer] [Files: packages/db/src/repositories/TaskRepository.ts]

### Task taskcade-t68.6.2.2 Rehabilitation [2026-10-13T04:46:07.678Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T68.6.2: Intercept and abort task dispatch when total system memory availability (MemAvai (`taskcade-t68.6.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.6.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T68.6.2: Intercept and abort task dispatch when total system memory availability (MemAvai [Role: type_specialist] [Files: packages/engine/src/hardware/OomPredictiveGuard.ts]
  - [ ] `taskcade-t68.6.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T68.6.2: Intercept and abort task dispatch when total system memory availability (MemAvai [Role: implementer] [Files: packages/engine/src/hardware/OomPredictiveGuard.ts]

### Task taskcade-t68.6.2.1 Rehabilitation [2026-10-13T04:36:56.479Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T68.6.2: Intercept and abort task dispatch when total system memory availability (MemAvai (`taskcade-t68.6.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.6.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T68.6.2: Intercept and abort task dispatch when total system memory availability (MemAvai [Role: type_specialist] [Files: packages/engine/src/hardware/OomPredictiveGuard.ts]
  - [ ] `taskcade-t68.6.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T68.6.2: Intercept and abort task dispatch when total system memory availability (MemAvai [Role: implementer] [Files: packages/engine/src/hardware/OomPredictiveGuard.ts]

### Task taskcade-t69.6.4.1 Rehabilitation [2026-10-13T04:25:39.990Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T69.6.4: Track per-model rolling success rate and auto-demote models below 50% pass rate (`taskcade-t69.6.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t69.6.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T69.6.4: Track per-model rolling success rate and auto-demote models below 50% pass rate [Role: type_specialist] [Files: packages/engine/src/scheduler/ModelEvictionManager.ts]
  - [ ] `taskcade-t69.6.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T69.6.4: Track per-model rolling success rate and auto-demote models below 50% pass rate [Role: implementer] [Files: packages/engine/src/scheduler/ModelEvictionManager.ts]

### Task taskcade-t69.6.4.2 Rehabilitation [2026-10-13T04:11:37.839Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T69.6.4: Track per-model rolling success rate and auto-demote models below 50% pass rate (`taskcade-t69.6.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t69.6.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T69.6.4: Track per-model rolling success rate and auto-demote models below 50% pass rate [Role: type_specialist] [Files: packages/engine/src/scheduler/ModelEvictionManager.ts]
  - [ ] `taskcade-t69.6.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T69.6.4: Track per-model rolling success rate and auto-demote models below 50% pass rate [Role: implementer] [Files: packages/engine/src/scheduler/ModelEvictionManager.ts]

### Task taskcade-t70.2.3.2 Rehabilitation [2026-10-13T03:59:23.413Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T70.2.3: Restrict local model generation to a strict slot-fill prompt format (generating (`taskcade-t70.2.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.2.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T70.2.3: Restrict local model generation to a strict slot-fill prompt format (generating [Role: type_specialist] [Files: packages/engine/src/inference/SlotFillPromptBuilder.ts]
  - [ ] `taskcade-t70.2.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T70.2.3: Restrict local model generation to a strict slot-fill prompt format (generating [Role: implementer] [Files: packages/engine/src/inference/SlotFillPromptBuilder.ts]

### Task taskcade-t70.2.3.1 Rehabilitation [2026-10-13T03:49:18.460Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T70.2.3: Restrict local model generation to a strict slot-fill prompt format (generating (`taskcade-t70.2.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.2.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T70.2.3: Restrict local model generation to a strict slot-fill prompt format (generating [Role: type_specialist] [Files: packages/engine/src/inference/SlotFillPromptBuilder.ts]
  - [ ] `taskcade-t70.2.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T70.2.3: Restrict local model generation to a strict slot-fill prompt format (generating [Role: implementer] [Files: packages/engine/src/inference/SlotFillPromptBuilder.ts]

### Task taskcade-t65.4.1.2 Rehabilitation [2026-10-13T03:45:31.202Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T65.4.1: Create ProcessDrawerComponent in packages/frontend/src/app/components/process-dr (`taskcade-t65.4.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.4.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T65.4.1: Create ProcessDrawerComponent in packages/frontend/src/app/components/process-dr [Role: type_specialist] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts]
  - [ ] `taskcade-t65.4.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T65.4.1: Create ProcessDrawerComponent in packages/frontend/src/app/components/process-dr [Role: implementer] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts]

### Task taskcade-t65.4.1.1 Rehabilitation [2026-10-13T03:41:39.927Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T65.4.1: Create ProcessDrawerComponent in packages/frontend/src/app/components/process-dr (`taskcade-t65.4.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.4.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T65.4.1: Create ProcessDrawerComponent in packages/frontend/src/app/components/process-dr [Role: type_specialist] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts]
  - [ ] `taskcade-t65.4.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T65.4.1: Create ProcessDrawerComponent in packages/frontend/src/app/components/process-dr [Role: implementer] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts]

### Task taskcade-t86.1.3.1 Rehabilitation [2026-10-13T03:29:44.863Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T86.1.3: Expose `POST /api/fleet/heartbeat` for worker nodes to report their status to th (`taskcade-t86.1.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.1.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T86.1.3: Expose `POST /api/fleet/heartbeat` for worker nodes to report their status to th [Role: type_specialist] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]
  - [ ] `taskcade-t86.1.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T86.1.3: Expose `POST /api/fleet/heartbeat` for worker nodes to report their status to th [Role: implementer] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]

### Task taskcade-t72.3.1.2 Rehabilitation [2026-10-13T03:14:49.358Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T72.3.1: Create EnqueueTaskcadeTaskTool in packages/tools/src/implementations/ exposing a (`taskcade-t72.3.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.3.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T72.3.1: Create EnqueueTaskcadeTaskTool in packages/tools/src/implementations/ exposing a [Role: type_specialist] [Files: packages/tools/src/implementations/EnqueueTaskcadeTaskTool.ts]
  - [ ] `taskcade-t72.3.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T72.3.1: Create EnqueueTaskcadeTaskTool in packages/tools/src/implementations/ exposing a [Role: implementer] [Files: packages/tools/src/implementations/EnqueueTaskcadeTaskTool.ts]

### Task taskcade-t72.3.1.1 Rehabilitation [2026-10-13T03:06:15.552Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T72.3.1: Create EnqueueTaskcadeTaskTool in packages/tools/src/implementations/ exposing a (`taskcade-t72.3.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.3.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T72.3.1: Create EnqueueTaskcadeTaskTool in packages/tools/src/implementations/ exposing a [Role: type_specialist] [Files: packages/tools/src/implementations/EnqueueTaskcadeTaskTool.ts]
  - [ ] `taskcade-t72.3.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T72.3.1: Create EnqueueTaskcadeTaskTool in packages/tools/src/implementations/ exposing a [Role: implementer] [Files: packages/tools/src/implementations/EnqueueTaskcadeTaskTool.ts]

### Task taskcade-t88.6.2.2 Rehabilitation [2026-10-13T03:01:48.271Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T88.6.2: Critical: Write integration tests verifying idempotent CI failures create one qu (`taskcade-t88.6.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.6.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T88.6.2: Critical: Write integration tests verifying idempotent CI failures create one qu [Role: type_specialist] [Files: packages/engine/src/tests/ci_failure_queue.test.ts]
  - [ ] `taskcade-t88.6.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T88.6.2: Critical: Write integration tests verifying idempotent CI failures create one qu [Role: implementer] [Files: packages/engine/src/tests/ci_failure_queue.test.ts]

### Task taskcade-t88.6.2.1 Rehabilitation [2026-10-13T02:49:05.337Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T88.6.2: Critical: Write integration tests verifying idempotent CI failures create one qu (`taskcade-t88.6.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.6.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T88.6.2: Critical: Write integration tests verifying idempotent CI failures create one qu [Role: type_specialist] [Files: packages/engine/src/tests/ci_failure_queue.test.ts]
  - [ ] `taskcade-t88.6.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T88.6.2: Critical: Write integration tests verifying idempotent CI failures create one qu [Role: implementer] [Files: packages/engine/src/tests/ci_failure_queue.test.ts]

### Task taskcade-t67.1.1.1 Rehabilitation [2026-10-13T02:36:35.778Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T67.1.1: Refactor StreamTapManager to maintain discrete ring buffers keyed by taskId inst (`taskcade-t67.1.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t67.1.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T67.1.1: Refactor StreamTapManager to maintain discrete ring buffers keyed by taskId inst [Role: type_specialist] [Files: packages/engine/src/inference/StreamTapManager.ts]
  - [ ] `taskcade-t67.1.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T67.1.1: Refactor StreamTapManager to maintain discrete ring buffers keyed by taskId inst [Role: implementer] [Files: packages/engine/src/inference/StreamTapManager.ts]

### Task taskcade-t67.1.1.2 Rehabilitation [2026-10-13T02:18:54.325Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T67.1.1: Refactor StreamTapManager to maintain discrete ring buffers keyed by taskId inst (`taskcade-t67.1.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t67.1.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T67.1.1: Refactor StreamTapManager to maintain discrete ring buffers keyed by taskId inst [Role: type_specialist] [Files: packages/engine/src/inference/StreamTapManager.ts]
  - [ ] `taskcade-t67.1.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T67.1.1: Refactor StreamTapManager to maintain discrete ring buffers keyed by taskId inst [Role: implementer] [Files: packages/engine/src/inference/StreamTapManager.ts]

### Task taskcade-t88.2.2.2 Rehabilitation [2026-10-13T02:04:38.875Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T88.2.2: Critical: Define and persist structured assessment reports with verdict, severit (`taskcade-t88.2.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.2.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T88.2.2: Critical: Define and persist structured assessment reports with verdict, severit [Role: type_specialist] [Files: packages/shared-types/src/review.ts]
  - [ ] `taskcade-t88.2.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T88.2.2: Critical: Define and persist structured assessment reports with verdict, severit [Role: implementer] [Files: packages/shared-types/src/review.ts]

### Task taskcade-t88.2.2.1 Rehabilitation [2026-10-13T01:49:56.509Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T88.2.2: Critical: Define and persist structured assessment reports with verdict, severit (`taskcade-t88.2.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.2.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T88.2.2: Critical: Define and persist structured assessment reports with verdict, severit [Role: type_specialist] [Files: packages/shared-types/src/review.ts]
  - [ ] `taskcade-t88.2.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T88.2.2: Critical: Define and persist structured assessment reports with verdict, severit [Role: implementer] [Files: packages/shared-types/src/review.ts]

### Task taskcade-t88.6.1.1 Rehabilitation [2026-10-13T01:42:01.396Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T88.6.1: Critical: Write integration tests for implementation completion -> PR publicatio (`taskcade-t88.6.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.6.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T88.6.1: Critical: Write integration tests for implementation completion -> PR publicatio [Role: type_specialist] [Files: packages/engine/src/tests/pr_lifecycle.test.ts]
  - [ ] `taskcade-t88.6.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T88.6.1: Critical: Write integration tests for implementation completion -> PR publicatio [Role: implementer] [Files: packages/engine/src/tests/pr_lifecycle.test.ts]

### Task taskcade-t88.6.1.2 Rehabilitation [2026-10-13T01:38:07.466Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T88.6.1: Critical: Write integration tests for implementation completion -> PR publicatio (`taskcade-t88.6.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.6.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T88.6.1: Critical: Write integration tests for implementation completion -> PR publicatio [Role: type_specialist] [Files: packages/engine/src/tests/pr_lifecycle.test.ts]
  - [ ] `taskcade-t88.6.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T88.6.1: Critical: Write integration tests for implementation completion -> PR publicatio [Role: implementer] [Files: packages/engine/src/tests/pr_lifecycle.test.ts]

### Task taskcade-t88.5.1.2 Rehabilitation [2026-10-13T01:27:21.302Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T88.5.1: Critical: Extend method-scoped generation context with resolved member contracts (`taskcade-t88.5.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.5.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T88.5.1: Critical: Extend method-scoped generation context with resolved member contracts [Role: type_specialist] [Files: packages/engine/src/context/TypeScriptMethodSplicer.ts]
  - [ ] `taskcade-t88.5.1.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T88.5.1: Critical: Extend method-scoped generation context with resolved member contracts [Role: implementer] [Files: packages/engine/src/context/TypeScriptMethodSplicer.ts]

### Task taskcade-t88.5.1.1 Rehabilitation [2026-10-13T01:19:12.723Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T88.5.1: Critical: Extend method-scoped generation context with resolved member contracts (`taskcade-t88.5.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.5.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T88.5.1: Critical: Extend method-scoped generation context with resolved member contracts [Role: type_specialist] [Files: packages/engine/src/context/TypeScriptMethodSplicer.ts]
  - [ ] `taskcade-t88.5.1.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T88.5.1: Critical: Extend method-scoped generation context with resolved member contracts [Role: implementer] [Files: packages/engine/src/context/TypeScriptMethodSplicer.ts]

### Task taskcade-t88.6.3.2 Rehabilitation [2026-10-13T01:07:36.480Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T88.6.3: Critical: Write integration tests verifying assessor/fixer eviction does not los (`taskcade-t88.6.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.6.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T88.6.3: Critical: Write integration tests verifying assessor/fixer eviction does not los [Role: type_specialist] [Files: packages/engine/src/tests/pr_lifecycle.test.ts]
  - [ ] `taskcade-t88.6.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T88.6.3: Critical: Write integration tests verifying assessor/fixer eviction does not los [Role: implementer] [Files: packages/engine/src/tests/pr_lifecycle.test.ts]

### Task taskcade-t88.6.3.1 Rehabilitation [2026-10-13T00:56:09.844Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T88.6.3: Critical: Write integration tests verifying assessor/fixer eviction does not los (`taskcade-t88.6.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.6.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T88.6.3: Critical: Write integration tests verifying assessor/fixer eviction does not los [Role: type_specialist] [Files: packages/engine/src/tests/pr_lifecycle.test.ts]
  - [ ] `taskcade-t88.6.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T88.6.3: Critical: Write integration tests verifying assessor/fixer eviction does not los [Role: implementer] [Files: packages/engine/src/tests/pr_lifecycle.test.ts]

### Task taskcade-t88.4.5.2 Rehabilitation [2026-10-13T00:39:34.286Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T88.4.5: Critical: Add GitHub and Gitea action workflows that validate and execute only a (`taskcade-t88.4.5.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.4.5.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T88.4.5: Critical: Add GitHub and Gitea action workflows that validate and execute only a [Role: type_specialist] [Files: .github/workflows/review-remediation.yml .gitea/workflows/review-remediation.yml]
  - [ ] `taskcade-t88.4.5.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T88.4.5: Critical: Add GitHub and Gitea action workflows that validate and execute only a [Role: implementer] [Files: .github/workflows/review-remediation.yml .gitea/workflows/review-remediation.yml]

### Task taskcade-t88.4.5.1 Rehabilitation [2026-10-13T00:37:21.666Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T88.4.5: Critical: Add GitHub and Gitea action workflows that validate and execute only a (`taskcade-t88.4.5.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.4.5.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T88.4.5: Critical: Add GitHub and Gitea action workflows that validate and execute only a [Role: type_specialist] [Files: .github/workflows/review-remediation.yml .gitea/workflows/review-remediation.yml]
  - [ ] `taskcade-t88.4.5.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T88.4.5: Critical: Add GitHub and Gitea action workflows that validate and execute only a [Role: implementer] [Files: .github/workflows/review-remediation.yml .gitea/workflows/review-remediation.yml]

### Task taskcade-t88.3.2.2 Rehabilitation [2026-10-13T00:35:30.142Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T88.3.2: Critical: Define an explicit approval policy for required independent verdicts, (`taskcade-t88.3.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.3.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T88.3.2: Critical: Define an explicit approval policy for required independent verdicts, [Role: type_specialist] [Files: packages/engine/src/gitea/AssessmentPolicy.ts]
  - [ ] `taskcade-t88.3.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T88.3.2: Critical: Define an explicit approval policy for required independent verdicts, [Role: implementer] [Files: packages/engine/src/gitea/AssessmentPolicy.ts]

### Task taskcade-t88.3.2.1 Rehabilitation [2026-10-13T00:31:16.541Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T88.3.2: Critical: Define an explicit approval policy for required independent verdicts, (`taskcade-t88.3.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.3.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T88.3.2: Critical: Define an explicit approval policy for required independent verdicts, [Role: type_specialist] [Files: packages/engine/src/gitea/AssessmentPolicy.ts]
  - [ ] `taskcade-t88.3.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T88.3.2: Critical: Define an explicit approval policy for required independent verdicts, [Role: implementer] [Files: packages/engine/src/gitea/AssessmentPolicy.ts]

### Task taskcade-t74.1.5.1 Rehabilitation [2026-10-13T00:15:53.273Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T74.1.5: Write unit tests verifying CORS allowlist rejects untrusted origins, rate limite (`taskcade-t74.1.5.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.1.5.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T74.1.5: Write unit tests verifying CORS allowlist rejects untrusted origins, rate limite [Role: type_specialist] [Files: packages/engine/src/tests/http_security.test.ts]
  - [ ] `taskcade-t74.1.5.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T74.1.5: Write unit tests verifying CORS allowlist rejects untrusted origins, rate limite [Role: implementer] [Files: packages/engine/src/tests/http_security.test.ts]

### Task taskcade-t74.1.5.2 Rehabilitation [2026-10-13T00:08:34.946Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T74.1.5: Write unit tests verifying CORS allowlist rejects untrusted origins, rate limite (`taskcade-t74.1.5.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.1.5.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T74.1.5: Write unit tests verifying CORS allowlist rejects untrusted origins, rate limite [Role: type_specialist] [Files: packages/engine/src/tests/http_security.test.ts]
  - [ ] `taskcade-t74.1.5.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T74.1.5: Write unit tests verifying CORS allowlist rejects untrusted origins, rate limite [Role: implementer] [Files: packages/engine/src/tests/http_security.test.ts]

### Task taskcade-t67.5.4.1 Rehabilitation [2026-10-12T23:54:16.788Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T67.5.4: Write integration tests verifying that simulated network disconnection and recon (`taskcade-t67.5.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t67.5.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T67.5.4: Write integration tests verifying that simulated network disconnection and recon [Role: type_specialist] [Files: packages/engine/src/tests/sse_reconnect.test.ts]
  - [ ] `taskcade-t67.5.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T67.5.4: Write integration tests verifying that simulated network disconnection and recon [Role: implementer] [Files: packages/engine/src/tests/sse_reconnect.test.ts]

### Task taskcade-t65.3.4.2 Rehabilitation [2026-10-12T23:49:52.434Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T65.3.4: Write unit tests verifying filter toolbar emits filter change events and correct (`taskcade-t65.3.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.3.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T65.3.4: Write unit tests verifying filter toolbar emits filter change events and correct [Role: type_specialist] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.spec.ts]
  - [ ] `taskcade-t65.3.4.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T65.3.4: Write unit tests verifying filter toolbar emits filter change events and correct [Role: implementer] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.spec.ts]

### Task taskcade-t65.3.4.1 Rehabilitation [2026-10-12T23:46:46.348Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T65.3.4: Write unit tests verifying filter toolbar emits filter change events and correct (`taskcade-t65.3.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.3.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T65.3.4: Write unit tests verifying filter toolbar emits filter change events and correct [Role: type_specialist] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.spec.ts]
  - [ ] `taskcade-t65.3.4.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T65.3.4: Write unit tests verifying filter toolbar emits filter change events and correct [Role: implementer] [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.spec.ts]

### Task taskcade-t64.3.3.1 Rehabilitation [2026-10-12T23:44:02.308Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T64.3.3: Open pull request with title matching task title and body formatted with markdow (`taskcade-t64.3.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.3.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T64.3.3: Open pull request with title matching task title and body formatted with markdow [Role: type_specialist] [Files: packages/engine/src/gitea/GiteaPrClient.ts]
  - [ ] `taskcade-t64.3.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T64.3.3: Open pull request with title matching task title and body formatted with markdow [Role: implementer] [Files: packages/engine/src/gitea/GiteaPrClient.ts]

### Task taskcade-t64.3.3.2 Rehabilitation [2026-10-12T23:36:49.477Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T64.3.3: Open pull request with title matching task title and body formatted with markdow (`taskcade-t64.3.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.3.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T64.3.3: Open pull request with title matching task title and body formatted with markdow [Role: type_specialist] [Files: packages/engine/src/gitea/GiteaPrClient.ts]
  - [ ] `taskcade-t64.3.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T64.3.3: Open pull request with title matching task title and body formatted with markdow [Role: implementer] [Files: packages/engine/src/gitea/GiteaPrClient.ts]

### Task taskcade-t64.4.2.2 Rehabilitation [2026-10-12T23:23:31.238Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T64.4.2: Prompt reviewer model to evaluate code against SOLID principles, security standa (`taskcade-t64.4.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.4.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T64.4.2: Prompt reviewer model to evaluate code against SOLID principles, security standa [Role: type_specialist] [Files: packages/engine/src/gitea/AutomatedPrReviewer.ts]
  - [ ] `taskcade-t64.4.2.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T64.4.2: Prompt reviewer model to evaluate code against SOLID principles, security standa [Role: implementer] [Files: packages/engine/src/gitea/AutomatedPrReviewer.ts]

### Task taskcade-t64.4.2.1 Rehabilitation [2026-10-12T23:09:26.050Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T64.4.2: Prompt reviewer model to evaluate code against SOLID principles, security standa (`taskcade-t64.4.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.4.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T64.4.2: Prompt reviewer model to evaluate code against SOLID principles, security standa [Role: type_specialist] [Files: packages/engine/src/gitea/AutomatedPrReviewer.ts]
  - [ ] `taskcade-t64.4.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T64.4.2: Prompt reviewer model to evaluate code against SOLID principles, security standa [Role: implementer] [Files: packages/engine/src/gitea/AutomatedPrReviewer.ts]

### Task taskcade-t88.1.2.1 Rehabilitation [2026-10-12T22:43:39.276Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T88.1.2: Critical: Add a lifecycle coordinator that completes the implementation task aft (`taskcade-t88.1.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.1.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T88.1.2: Critical: Add a lifecycle coordinator that completes the implementation task aft [Role: type_specialist] [Files: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts]
  - [ ] `taskcade-t88.1.2.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T88.1.2: Critical: Add a lifecycle coordinator that completes the implementation task aft [Role: implementer] [Files: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts]

### Task taskcade-t88.4.3.2 Rehabilitation [2026-10-12T22:37:51.037Z]

- **Parent Task**: [Rehab 2/2] Implementation & Test Verification: T88.4.3: Critical: Route whitelisted deterministic transformations through bounded rules; (`taskcade-t88.4.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.4.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 2/2] Implementation & Test Verification: T88.4.3: Critical: Route whitelisted deterministic transformations through bounded rules; [Role: type_specialist] [Files: packages/engine/src/gitea/PrFixTaskCoordinator.ts]
  - [ ] `taskcade-t88.4.3.2.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 2/2] Implementation & Test Verification: T88.4.3: Critical: Route whitelisted deterministic transformations through bounded rules; [Role: implementer] [Files: packages/engine/src/gitea/PrFixTaskCoordinator.ts]

### Task taskcade-t88.4.3.1 Rehabilitation [2026-10-12T22:33:27.806Z]

- **Parent Task**: [Rehab 1/2] Scaffold & Type Contracts: T88.4.3: Critical: Route whitelisted deterministic transformations through bounded rules; (`taskcade-t88.4.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.4.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: [Rehab 1/2] Scaffold & Type Contracts: T88.4.3: Critical: Route whitelisted deterministic transformations through bounded rules; [Role: type_specialist] [Files: packages/engine/src/gitea/PrFixTaskCoordinator.ts]
  - [ ] `taskcade-t88.4.3.1.2`: [Rehab 2/2] Implementation & Test Verification: [Rehab 1/2] Scaffold & Type Contracts: T88.4.3: Critical: Route whitelisted deterministic transformations through bounded rules; [Role: implementer] [Files: packages/engine/src/gitea/PrFixTaskCoordinator.ts]

### Task taskcade-t98.1.2 Rehabilitation [2026-10-12T22:20:38.032Z]

- **Parent Task**: T98.1.2: Write unit tests validating compiler diagnostic filtering truncates error logs e (`taskcade-t98.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t98.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T98.1.2: Write unit tests validating compiler diagnostic filtering truncates error logs e [Role: type_specialist] [Files: packages/engine/src/tests/remediation_diagnostic_truncation.test.ts]
  - [ ] `taskcade-t98.1.2.2`: [Rehab 2/2] Implementation & Test Verification: T98.1.2: Write unit tests validating compiler diagnostic filtering truncates error logs e [Role: implementer] [Files: packages/engine/src/tests/remediation_diagnostic_truncation.test.ts]

### Task taskcade-t97.4.4 Rehabilitation [2026-10-12T22:11:17.995Z]

- **Parent Task**: T97.4.4: Write unit tests verifying StreamTapManager isolates logs across different task (`taskcade-t97.4.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.4.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.4.4: Write unit tests verifying StreamTapManager isolates logs across different task [Role: type_specialist] [Files: packages/engine/src/tests/stream_tap_isolation.test.ts]
  - [ ] `taskcade-t97.4.4.2`: [Rehab 2/2] Implementation & Test Verification: T97.4.4: Write unit tests verifying StreamTapManager isolates logs across different task [Role: implementer] [Files: packages/engine/src/tests/stream_tap_isolation.test.ts]

### Task taskcade-t98.2.4 Rehabilitation [2026-10-12T22:08:13.816Z]

- **Parent Task**: T98.2.4: Write unit tests verifying task ID metadata is appended in commit body (Closes t (`taskcade-t98.2.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t98.2.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T98.2.4: Write unit tests verifying task ID metadata is appended in commit body (Closes t [Role: type_specialist] [Files: packages/engine/src/tests/commit_gen_metadata.test.ts]
  - [ ] `taskcade-t98.2.4.2`: [Rehab 2/2] Implementation & Test Verification: T98.2.4: Write unit tests verifying task ID metadata is appended in commit body (Closes t [Role: implementer] [Files: packages/engine/src/tests/commit_gen_metadata.test.ts]

### Task taskcade-t97.3.3 Rehabilitation [2026-10-12T22:05:10.020Z]

- **Parent Task**: T97.3.3: Write unit tests validating legacy 3-point thermal governor backwards compatibil (`taskcade-t97.3.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.3.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.3.3: Write unit tests validating legacy 3-point thermal governor backwards compatibil [Role: type_specialist] [Files: packages/engine/src/tests/governor_legacy_3point.test.ts]
  - [ ] `taskcade-t97.3.3.2`: [Rehab 2/2] Implementation & Test Verification: T97.3.3: Write unit tests validating legacy 3-point thermal governor backwards compatibil [Role: implementer] [Files: packages/engine/src/tests/governor_legacy_3point.test.ts]

### Task taskcade-t98.2.3 Rehabilitation [2026-10-12T22:03:06.164Z]

- **Parent Task**: T98.2.3: Write unit tests validating zero-emoji validator rejects commit messages contain (`taskcade-t98.2.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t98.2.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T98.2.3: Write unit tests validating zero-emoji validator rejects commit messages contain [Role: type_specialist] [Files: packages/engine/src/tests/commit_gen_zero_emoji.test.ts]
  - [ ] `taskcade-t98.2.3.2`: [Rehab 2/2] Implementation & Test Verification: T98.2.3: Write unit tests validating zero-emoji validator rejects commit messages contain [Role: implementer] [Files: packages/engine/src/tests/commit_gen_zero_emoji.test.ts]

### Task taskcade-t97.2.4 Rehabilitation [2026-10-12T21:58:49.265Z]

- **Parent Task**: T97.2.4: Write unit tests verifying dynamic origin whitelist rejects non-local external d (`taskcade-t97.2.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.2.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.2.4: Write unit tests verifying dynamic origin whitelist rejects non-local external d [Role: type_specialist] [Files: packages/engine/src/tests/origin_whitelist.test.ts]
  - [ ] `taskcade-t97.2.4.2`: [Rehab 2/2] Implementation & Test Verification: T97.2.4: Write unit tests verifying dynamic origin whitelist rejects non-local external d [Role: implementer] [Files: packages/engine/src/tests/origin_whitelist.test.ts]

### Task taskcade-t98.1.1 Rehabilitation [2026-10-12T21:49:01.844Z]

- **Parent Task**: T98.1.1: Write unit tests verifying RemediationPromptFormatter produces structured markdo (`taskcade-t98.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t98.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T98.1.1: Write unit tests verifying RemediationPromptFormatter produces structured markdo [Role: type_specialist] [Files: packages/engine/src/tests/remediation_format_sections.test.ts]
  - [ ] `taskcade-t98.1.1.2`: [Rehab 2/2] Implementation & Test Verification: T98.1.1: Write unit tests verifying RemediationPromptFormatter produces structured markdo [Role: implementer] [Files: packages/engine/src/tests/remediation_format_sections.test.ts]

### Task taskcade-t98.1.4 Rehabilitation [2026-10-12T21:32:53.456Z]

- **Parent Task**: T98.1.4: Write unit tests validating that clean code replacements preserve indentation an (`taskcade-t98.1.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t98.1.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T98.1.4: Write unit tests validating that clean code replacements preserve indentation an [Role: type_specialist] [Files: packages/engine/src/tests/remediation_indentation.test.ts]
  - [ ] `taskcade-t98.1.4.2`: [Rehab 2/2] Implementation & Test Verification: T98.1.4: Write unit tests validating that clean code replacements preserve indentation an [Role: implementer] [Files: packages/engine/src/tests/remediation_indentation.test.ts]

### Task taskcade-t97.2.1 Rehabilitation [2026-10-12T21:29:36.385Z]

- **Parent Task**: T97.2.1: Write unit tests verifying dynamic host header resolver handles X-Forwarded-Host (`taskcade-t97.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.2.1: Write unit tests verifying dynamic host header resolver handles X-Forwarded-Host [Role: type_specialist] [Files: packages/engine/src/tests/host_header_port.test.ts]
  - [ ] `taskcade-t97.2.1.2`: [Rehab 2/2] Implementation & Test Verification: T97.2.1: Write unit tests verifying dynamic host header resolver handles X-Forwarded-Host [Role: implementer] [Files: packages/engine/src/tests/host_header_port.test.ts]

### Task taskcade-t98.1.3 Rehabilitation [2026-10-12T21:21:51.238Z]

- **Parent Task**: T98.1.3: Write unit tests verifying anti-filler directives forbid introductory and conclu (`taskcade-t98.1.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t98.1.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T98.1.3: Write unit tests verifying anti-filler directives forbid introductory and conclu [Role: type_specialist] [Files: packages/engine/src/tests/remediation_directives.test.ts]
  - [ ] `taskcade-t98.1.3.2`: [Rehab 2/2] Implementation & Test Verification: T98.1.3: Write unit tests verifying anti-filler directives forbid introductory and conclu [Role: implementer] [Files: packages/engine/src/tests/remediation_directives.test.ts]

### Task taskcade-t98.2.2 Rehabilitation [2026-10-12T21:13:13.025Z]

- **Parent Task**: T98.2.2: Write unit tests verifying commit subject length is clamped to standard 72-chara (`taskcade-t98.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t98.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T98.2.2: Write unit tests verifying commit subject length is clamped to standard 72-chara [Role: type_specialist] [Files: packages/engine/src/tests/commit_gen_length.test.ts]
  - [ ] `taskcade-t98.2.2.2`: [Rehab 2/2] Implementation & Test Verification: T98.2.2: Write unit tests verifying commit subject length is clamped to standard 72-chara [Role: implementer] [Files: packages/engine/src/tests/commit_gen_length.test.ts]

### Task taskcade-t98.2.1 Rehabilitation [2026-10-12T21:10:15.277Z]

- **Parent Task**: T98.2.1: Write unit tests verifying ConventionalCommitGenerator maps implementer role to (`taskcade-t98.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t98.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T98.2.1: Write unit tests verifying ConventionalCommitGenerator maps implementer role to [Role: type_specialist] [Files: packages/engine/src/tests/commit_gen_roles.test.ts]
  - [ ] `taskcade-t98.2.1.2`: [Rehab 2/2] Implementation & Test Verification: T98.2.1: Write unit tests verifying ConventionalCommitGenerator maps implementer role to [Role: implementer] [Files: packages/engine/src/tests/commit_gen_roles.test.ts]

### Task taskcade-t97.2.2 Rehabilitation [2026-10-12T21:07:01.322Z]

- **Parent Task**: T97.2.2: Write unit tests verifying IPv6 localhost (::1) is correctly mapped to localhost (`taskcade-t97.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.2.2: Write unit tests verifying IPv6 localhost (::1) is correctly mapped to localhost [Role: type_specialist] [Files: packages/engine/src/tests/ipv6_cors.test.ts]
  - [ ] `taskcade-t97.2.2.2`: [Rehab 2/2] Implementation & Test Verification: T97.2.2: Write unit tests verifying IPv6 localhost (::1) is correctly mapped to localhost [Role: implementer] [Files: packages/engine/src/tests/ipv6_cors.test.ts]

### Task taskcade-t97.4.2 Rehabilitation [2026-10-12T21:04:58.546Z]

- **Parent Task**: T97.4.2: Write unit tests verifying tap unsubscribe frees in-memory listener callback ref (`taskcade-t97.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.4.2: Write unit tests verifying tap unsubscribe frees in-memory listener callback ref [Role: type_specialist] [Files: packages/engine/src/tests/stream_tap_cleanup.test.ts]
  - [ ] `taskcade-t97.4.2.2`: [Rehab 2/2] Implementation & Test Verification: T97.4.2: Write unit tests verifying tap unsubscribe frees in-memory listener callback ref [Role: implementer] [Files: packages/engine/src/tests/stream_tap_cleanup.test.ts]

### Task taskcade-t97.1.2 Rehabilitation [2026-10-12T21:03:05.402Z]

- **Parent Task**: T97.1.2: Write unit tests verifying radeontop parser handles non-standard whitespace and (`taskcade-t97.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.1.2: Write unit tests verifying radeontop parser handles non-standard whitespace and [Role: type_specialist] [Files: packages/engine/src/tests/radeontop_parser.test.ts]
  - [ ] `taskcade-t97.1.2.2`: [Rehab 2/2] Implementation & Test Verification: T97.1.2: Write unit tests verifying radeontop parser handles non-standard whitespace and [Role: implementer] [Files: packages/engine/src/tests/radeontop_parser.test.ts]

### Task taskcade-t97.1.3 Rehabilitation [2026-10-12T20:55:04.003Z]

- **Parent Task**: T97.1.3: Write unit tests verifying nvidia-smi parser gracefully discards corrupted CSV r (`taskcade-t97.1.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.1.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.1.3: Write unit tests verifying nvidia-smi parser gracefully discards corrupted CSV r [Role: type_specialist] [Files: packages/engine/src/tests/nvidia_corrupt_csv.test.ts]
  - [ ] `taskcade-t97.1.3.2`: [Rehab 2/2] Implementation & Test Verification: T97.1.3: Write unit tests verifying nvidia-smi parser gracefully discards corrupted CSV r [Role: implementer] [Files: packages/engine/src/tests/nvidia_corrupt_csv.test.ts]

### Task taskcade-t97.1.4 Rehabilitation [2026-10-12T20:51:15.208Z]

- **Parent Task**: T97.1.4: Write unit tests validating powermetrics parser handles multi-line thermal sampl (`taskcade-t97.1.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.1.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.1.4: Write unit tests validating powermetrics parser handles multi-line thermal sampl [Role: type_specialist] [Files: packages/engine/src/tests/powermetrics_parser.test.ts]
  - [ ] `taskcade-t97.1.4.2`: [Rehab 2/2] Implementation & Test Verification: T97.1.4: Write unit tests validating powermetrics parser handles multi-line thermal sampl [Role: implementer] [Files: packages/engine/src/tests/powermetrics_parser.test.ts]

### Task taskcade-t97.3.2 Rehabilitation [2026-10-12T20:48:27.752Z]

- **Parent Task**: T97.3.2: Write unit tests verifying pacing delays scale from 0s at Nominal to 10s at Dang (`taskcade-t97.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.3.2: Write unit tests verifying pacing delays scale from 0s at Nominal to 10s at Dang [Role: type_specialist] [Files: packages/engine/src/tests/governor_pacing_scale.test.ts]
  - [ ] `taskcade-t97.3.2.2`: [Rehab 2/2] Implementation & Test Verification: T97.3.2: Write unit tests verifying pacing delays scale from 0s at Nominal to 10s at Dang [Role: implementer] [Files: packages/engine/src/tests/governor_pacing_scale.test.ts]

### Task taskcade-t97.3.1 Rehabilitation [2026-10-12T20:45:52.898Z]

- **Parent Task**: T97.3.1: Write unit tests verifying ThermalGovernor emergency shutdown threshold halts qu (`taskcade-t97.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.3.1: Write unit tests verifying ThermalGovernor emergency shutdown threshold halts qu [Role: type_specialist] [Files: packages/engine/src/tests/governor_emergency_halt.test.ts]
  - [ ] `taskcade-t97.3.1.2`: [Rehab 2/2] Implementation & Test Verification: T97.3.1: Write unit tests verifying ThermalGovernor emergency shutdown threshold halts qu [Role: implementer] [Files: packages/engine/src/tests/governor_emergency_halt.test.ts]

### Task taskcade-t97.4.3 Rehabilitation [2026-10-12T20:43:46.643Z]

- **Parent Task**: T97.4.3: Write unit tests validating SSE broadcast event encoding with special newline ch (`taskcade-t97.4.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.4.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.4.3: Write unit tests validating SSE broadcast event encoding with special newline ch [Role: type_specialist] [Files: packages/engine/src/tests/sse_encoding.test.ts]
  - [ ] `taskcade-t97.4.3.2`: [Rehab 2/2] Implementation & Test Verification: T97.4.3: Write unit tests validating SSE broadcast event encoding with special newline ch [Role: implementer] [Files: packages/engine/src/tests/sse_encoding.test.ts]

### Task taskcade-t97.1.1 Rehabilitation [2026-10-12T20:34:43.474Z]

- **Parent Task**: T97.1.1: Write unit tests verifying lm-sensors regex parser extracts Celsius values acros (`taskcade-t97.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.1.1: Write unit tests verifying lm-sensors regex parser extracts Celsius values acros [Role: type_specialist] [Files: packages/engine/src/tests/sensors_parser.test.ts]
  - [ ] `taskcade-t97.1.1.2`: [Rehab 2/2] Implementation & Test Verification: T97.1.1: Write unit tests verifying lm-sensors regex parser extracts Celsius values acros [Role: implementer] [Files: packages/engine/src/tests/sensors_parser.test.ts]

### Task taskcade-t97.2.3 Rehabilitation [2026-10-12T20:12:13.996Z]

- **Parent Task**: T97.2.3: Write unit tests verifying local bridge IP resolution detects 172.17.0.1 Docker (`taskcade-t97.2.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.2.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.2.3: Write unit tests verifying local bridge IP resolution detects 172.17.0.1 Docker [Role: type_specialist] [Files: packages/engine/src/tests/docker_bridge_gateway.test.ts]
  - [ ] `taskcade-t97.2.3.2`: [Rehab 2/2] Implementation & Test Verification: T97.2.3: Write unit tests verifying local bridge IP resolution detects 172.17.0.1 Docker [Role: implementer] [Files: packages/engine/src/tests/docker_bridge_gateway.test.ts]

### Task taskcade-t97.4.1 Rehabilitation [2026-10-12T20:11:25.722Z]

- **Parent Task**: T97.4.1: Write unit tests verifying StreamTapManager ring buffer drops oldest lines when (`taskcade-t97.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.4.1: Write unit tests verifying StreamTapManager ring buffer drops oldest lines when [Role: type_specialist] [Files: packages/engine/src/tests/stream_ring_buffer.test.ts]
  - [ ] `taskcade-t97.4.1.2`: [Rehab 2/2] Implementation & Test Verification: T97.4.1: Write unit tests verifying StreamTapManager ring buffer drops oldest lines when [Role: implementer] [Files: packages/engine/src/tests/stream_ring_buffer.test.ts]

### Task taskcade-t97.3.4 Rehabilitation [2026-10-12T20:08:02.753Z]

- **Parent Task**: T97.3.4: Write unit tests verifying cool-off disabled flag overrides pacing delay back to (`taskcade-t97.3.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t97.3.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T97.3.4: Write unit tests verifying cool-off disabled flag overrides pacing delay back to [Role: type_specialist] [Files: packages/engine/src/tests/governor_cooloff_disabled.test.ts]
  - [ ] `taskcade-t97.3.4.2`: [Rehab 2/2] Implementation & Test Verification: T97.3.4: Write unit tests verifying cool-off disabled flag overrides pacing delay back to [Role: implementer] [Files: packages/engine/src/tests/governor_cooloff_disabled.test.ts]

### Task taskcade-t96.3.4 Rehabilitation [2026-10-12T19:51:35.927Z]

- **Parent Task**: T96.3.4: Write unit tests validating FocusedDiffBuilder handles multi-line string replace (`taskcade-t96.3.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.3.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.3.4: Write unit tests validating FocusedDiffBuilder handles multi-line string replace [Role: type_specialist] [Files: packages/engine/src/tests/diff_indentation.test.ts]
  - [ ] `taskcade-t96.3.4.2`: [Rehab 2/2] Implementation & Test Verification: T96.3.4: Write unit tests validating FocusedDiffBuilder handles multi-line string replace [Role: implementer] [Files: packages/engine/src/tests/diff_indentation.test.ts]

### Task taskcade-t96.1.1 Rehabilitation [2026-10-12T19:47:35.717Z]

- **Parent Task**: T96.1.1: Write unit tests verifying moving average calculations across empty, single-elem (`taskcade-t96.1.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.1.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.1.1: Write unit tests verifying moving average calculations across empty, single-elem [Role: type_specialist] [Files: packages/engine/src/tests/math_utils.test.ts]
  - [ ] `taskcade-t96.1.1.2`: [Rehab 2/2] Implementation & Test Verification: T96.1.1: Write unit tests verifying moving average calculations across empty, single-elem [Role: implementer] [Files: packages/engine/src/tests/math_utils.test.ts]

### Task taskcade-t96.5.1 Rehabilitation [2026-10-12T19:42:26.739Z]

- **Parent Task**: T96.5.1: Write unit tests verifying TaskRepository.create handles SQL string escaping and (`taskcade-t96.5.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.5.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.5.1: Write unit tests verifying TaskRepository.create handles SQL string escaping and [Role: type_specialist] [Files: packages/db/src/tests/task_sql_escaping.test.ts]
  - [ ] `taskcade-t96.5.1.2`: [Rehab 2/2] Implementation & Test Verification: T96.5.1: Write unit tests verifying TaskRepository.create handles SQL string escaping and [Role: implementer] [Files: packages/db/src/tests/task_sql_escaping.test.ts]

### Task taskcade-t96.3.3 Rehabilitation [2026-10-12T19:28:53.955Z]

- **Parent Task**: T96.3.3: Write unit tests verifying ImportPruningEngine correctly resolves type-only impo (`taskcade-t96.3.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.3.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.3.3: Write unit tests verifying ImportPruningEngine correctly resolves type-only impo [Role: type_specialist] [Files: packages/engine/src/tests/import_type_pruning.test.ts]
  - [ ] `taskcade-t96.3.3.2`: [Rehab 2/2] Implementation & Test Verification: T96.3.3: Write unit tests verifying ImportPruningEngine correctly resolves type-only impo [Role: implementer] [Files: packages/engine/src/tests/import_type_pruning.test.ts]

### Task taskcade-t96.5.2 Rehabilitation [2026-10-12T19:27:07.036Z]

- **Parent Task**: T96.5.2: Write unit tests verifying TaskRepository.updateStageState correctly serializes (`taskcade-t96.5.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.5.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.5.2: Write unit tests verifying TaskRepository.updateStageState correctly serializes [Role: type_specialist] [Files: packages/db/src/tests/stage_json_serialization.test.ts]
  - [ ] `taskcade-t96.5.2.2`: [Rehab 2/2] Implementation & Test Verification: T96.5.2: Write unit tests verifying TaskRepository.updateStageState correctly serializes [Role: implementer] [Files: packages/db/src/tests/stage_json_serialization.test.ts]

### Task taskcade-t96.4.3 Rehabilitation [2026-10-12T19:23:46.005Z]

- **Parent Task**: T96.4.3: Write unit tests verifying ArenaStateStore successRate signal updates accurately (`taskcade-t96.4.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.4.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.4.3: Write unit tests verifying ArenaStateStore successRate signal updates accurately [Role: type_specialist] [Files: packages/frontend/src/app/services/arena_state_success.spec.ts]
  - [ ] `taskcade-t96.4.3.2`: [Rehab 2/2] Implementation & Test Verification: T96.4.3: Write unit tests verifying ArenaStateStore successRate signal updates accurately [Role: implementer] [Files: packages/frontend/src/app/services/arena_state_success.spec.ts]

### Task taskcade-t96.3.2 Rehabilitation [2026-10-12T19:12:09.252Z]

- **Parent Task**: T96.3.2: Write unit tests verifying AstContextSlicer correctly preserves decorators (@Com (`taskcade-t96.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.3.2: Write unit tests verifying AstContextSlicer correctly preserves decorators (@Com [Role: type_specialist] [Files: packages/engine/src/tests/ast_decorator_slicing.test.ts]
  - [ ] `taskcade-t96.3.2.2`: [Rehab 2/2] Implementation & Test Verification: T96.3.2: Write unit tests verifying AstContextSlicer correctly preserves decorators (@Com [Role: implementer] [Files: packages/engine/src/tests/ast_decorator_slicing.test.ts]

### Task taskcade-t96.5.3 Rehabilitation [2026-10-12T19:08:30.121Z]

- **Parent Task**: T96.5.3: Write unit tests validating StageRepository stage span queries return chronologi (`taskcade-t96.5.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.5.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.5.3: Write unit tests validating StageRepository stage span queries return chronologi [Role: type_specialist] [Files: packages/db/src/tests/stage_chronology.test.ts]
  - [ ] `taskcade-t96.5.3.2`: [Rehab 2/2] Implementation & Test Verification: T96.5.3: Write unit tests validating StageRepository stage span queries return chronologi [Role: implementer] [Files: packages/db/src/tests/stage_chronology.test.ts]

### Task taskcade-t96.4.2 Rehabilitation [2026-10-12T18:54:17.395Z]

- **Parent Task**: T96.4.2: Write unit tests verifying ArenaStateStore modelWarmth signal updates when warm (`taskcade-t96.4.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.4.2: Write unit tests verifying ArenaStateStore modelWarmth signal updates when warm [Role: type_specialist] [Files: packages/frontend/src/app/services/arena_state_warmth.spec.ts]
  - [ ] `taskcade-t96.4.2.2`: [Rehab 2/2] Implementation & Test Verification: T96.4.2: Write unit tests verifying ArenaStateStore modelWarmth signal updates when warm [Role: implementer] [Files: packages/frontend/src/app/services/arena_state_warmth.spec.ts]

### Task taskcade-t96.2.3 Rehabilitation [2026-10-12T18:49:06.924Z]

- **Parent Task**: T96.2.3: Write unit tests validating ModelManagementConfigSchema defaults for protected m (`taskcade-t96.2.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.2.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.2.3: Write unit tests validating ModelManagementConfigSchema defaults for protected m [Role: type_specialist] [Files: packages/shared-types/src/tests/model_config_schema.test.ts]
  - [ ] `taskcade-t96.2.3.2`: [Rehab 2/2] Implementation & Test Verification: T96.2.3: Write unit tests validating ModelManagementConfigSchema defaults for protected m [Role: implementer] [Files: packages/shared-types/src/tests/model_config_schema.test.ts]

### Task taskcade-t96.4.4 Rehabilitation [2026-10-12T18:43:57.701Z]

- **Parent Task**: T96.4.4: Write unit tests verifying ArenaStateStore thermalThrottleState signal triggers (`taskcade-t96.4.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.4.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.4.4: Write unit tests verifying ArenaStateStore thermalThrottleState signal triggers [Role: type_specialist] [Files: packages/frontend/src/app/services/arena_state_thermal.spec.ts]
  - [ ] `taskcade-t96.4.4.2`: [Rehab 2/2] Implementation & Test Verification: T96.4.4: Write unit tests verifying ArenaStateStore thermalThrottleState signal triggers [Role: implementer] [Files: packages/frontend/src/app/services/arena_state_thermal.spec.ts]

### Task taskcade-t96.2.1 Rehabilitation [2026-10-12T18:34:54.478Z]

- **Parent Task**: T96.2.1: Write unit tests verifying TaskRecordSchema validates valid task payloads and re (`taskcade-t96.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.2.1: Write unit tests verifying TaskRecordSchema validates valid task payloads and re [Role: type_specialist] [Files: packages/shared-types/src/tests/task_schema.test.ts]
  - [ ] `taskcade-t96.2.1.2`: [Rehab 2/2] Implementation & Test Verification: T96.2.1: Write unit tests verifying TaskRecordSchema validates valid task payloads and re [Role: implementer] [Files: packages/shared-types/src/tests/task_schema.test.ts]

### Task taskcade-t96.3.1 Rehabilitation [2026-10-12T18:32:38.180Z]

- **Parent Task**: T96.3.1: Write unit tests validating AstContextSlicer handles complex generic interface d (`taskcade-t96.3.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.3.1: Write unit tests validating AstContextSlicer handles complex generic interface d [Role: type_specialist] [Files: packages/engine/src/tests/ast_generic_slicing.test.ts]
  - [ ] `taskcade-t96.3.1.2`: [Rehab 2/2] Implementation & Test Verification: T96.3.1: Write unit tests validating AstContextSlicer handles complex generic interface d [Role: implementer] [Files: packages/engine/src/tests/ast_generic_slicing.test.ts]

### Task taskcade-t96.2.4 Rehabilitation [2026-10-12T18:29:13.402Z]

- **Parent Task**: T96.2.4: Write unit tests verifying AgentRoleSchema enum rejects unknown string identifie (`taskcade-t96.2.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.2.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.2.4: Write unit tests verifying AgentRoleSchema enum rejects unknown string identifie [Role: type_specialist] [Files: packages/shared-types/src/tests/agent_role_schema.test.ts]
  - [ ] `taskcade-t96.2.4.2`: [Rehab 2/2] Implementation & Test Verification: T96.2.4: Write unit tests verifying AgentRoleSchema enum rejects unknown string identifie [Role: implementer] [Files: packages/shared-types/src/tests/agent_role_schema.test.ts]

### Task taskcade-t96.1.4 Rehabilitation [2026-10-12T18:19:22.552Z]

- **Parent Task**: T96.1.4: Write unit tests verifying percentage rounding precision and boundary clamping [ (`taskcade-t96.1.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.1.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.1.4: Write unit tests verifying percentage rounding precision and boundary clamping [ [Role: type_specialist] [Files: packages/engine/src/tests/percent_math.test.ts]
  - [ ] `taskcade-t96.1.4.2`: [Rehab 2/2] Implementation & Test Verification: T96.1.4: Write unit tests verifying percentage rounding precision and boundary clamping [ [Role: implementer] [Files: packages/engine/src/tests/percent_math.test.ts]

### Task taskcade-t96.4.1 Rehabilitation [2026-10-12T18:11:11.279Z]

- **Parent Task**: T96.4.1: Write unit tests verifying ArenaStateStore activeTaskId signal transitions react (`taskcade-t96.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.4.1: Write unit tests verifying ArenaStateStore activeTaskId signal transitions react [Role: type_specialist] [Files: packages/frontend/src/app/services/arena_state_dispatch.spec.ts]
  - [ ] `taskcade-t96.4.1.2`: [Rehab 2/2] Implementation & Test Verification: T96.4.1: Write unit tests verifying ArenaStateStore activeTaskId signal transitions react [Role: implementer] [Files: packages/frontend/src/app/services/arena_state_dispatch.spec.ts]

### Task taskcade-t96.1.2 Rehabilitation [2026-10-12T18:07:52.005Z]

- **Parent Task**: T96.1.2: Write unit tests verifying exponential backoff jitter calculations maintain boun (`taskcade-t96.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.1.2: Write unit tests verifying exponential backoff jitter calculations maintain boun [Role: type_specialist] [Files: packages/engine/src/tests/backoff_utils.test.ts]
  - [ ] `taskcade-t96.1.2.2`: [Rehab 2/2] Implementation & Test Verification: T96.1.2: Write unit tests verifying exponential backoff jitter calculations maintain boun [Role: implementer] [Files: packages/engine/src/tests/backoff_utils.test.ts]

### Task taskcade-t96.2.2 Rehabilitation [2026-10-12T18:05:22.926Z]

- **Parent Task**: T96.2.2: Write unit tests verifying CacophonySystemConfigSchema enforces default executio (`taskcade-t96.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.2.2: Write unit tests verifying CacophonySystemConfigSchema enforces default executio [Role: type_specialist] [Files: packages/shared-types/src/tests/config_schema.test.ts]
  - [ ] `taskcade-t96.2.2.2`: [Rehab 2/2] Implementation & Test Verification: T96.2.2: Write unit tests verifying CacophonySystemConfigSchema enforces default executio [Role: implementer] [Files: packages/shared-types/src/tests/config_schema.test.ts]

### Task taskcade-t96.1.3 Rehabilitation [2026-10-12T17:53:38.211Z]

- **Parent Task**: T96.1.3: Write unit tests validating token throughput rate calculation clamped against ze (`taskcade-t96.1.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.1.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.1.3: Write unit tests validating token throughput rate calculation clamped against ze [Role: type_specialist] [Files: packages/engine/src/tests/throughput_math.test.ts]
  - [ ] `taskcade-t96.1.3.2`: [Rehab 2/2] Implementation & Test Verification: T96.1.3: Write unit tests validating token throughput rate calculation clamped against ze [Role: implementer] [Files: packages/engine/src/tests/throughput_math.test.ts]

### Task taskcade-t96.5.4 Rehabilitation [2026-10-12T17:50:26.051Z]

- **Parent Task**: T96.5.4: Write unit tests verifying PGlite driver handles concurrent statement execution (`taskcade-t96.5.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t96.5.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T96.5.4: Write unit tests verifying PGlite driver handles concurrent statement execution [Role: type_specialist] [Files: packages/db/src/tests/pglite_concurrent_queue.test.ts]
  - [ ] `taskcade-t96.5.4.2`: [Rehab 2/2] Implementation & Test Verification: T96.5.4: Write unit tests verifying PGlite driver handles concurrent statement execution [Role: implementer] [Files: packages/db/src/tests/pglite_concurrent_queue.test.ts]

### Task taskcade-t66.4.1 Rehabilitation [2026-10-12T17:47:42.465Z]

- **Parent Task**: T66.4.1: Implement TelemetryCompactorDaemon in packages/engine/src/telemetry/TelemetryCom (`taskcade-t66.4.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T66.4.1: Implement TelemetryCompactorDaemon in packages/engine/src/telemetry/TelemetryCom [Role: type_specialist] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]
  - [ ] `taskcade-t66.4.1.2`: [Rehab 2/2] Implementation & Test Verification: T66.4.1: Implement TelemetryCompactorDaemon in packages/engine/src/telemetry/TelemetryCom [Role: implementer] [Files: packages/engine/src/telemetry/TelemetryCompactorDaemon.ts]

### Task taskcade-t72.3.3 Rehabilitation [2026-10-12T17:38:17.112Z]

- **Parent Task**: T72.3.3: Document markdown task metadata syntax and hint conventions in docs/taskcade_met (`taskcade-t72.3.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.3.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T72.3.3: Document markdown task metadata syntax and hint conventions in docs/taskcade_met [Role: type_specialist] [Files: docs/taskcade_metadata_spec.md]
  - [ ] `taskcade-t72.3.3.2`: [Rehab 2/2] Implementation & Test Verification: T72.3.3: Document markdown task metadata syntax and hint conventions in docs/taskcade_met [Role: implementer] [Files: docs/taskcade_metadata_spec.md]

### Task taskcade-t66.4.4 Rehabilitation [2026-10-12T17:24:38.369Z]

- **Parent Task**: T66.4.4: Write unit tests verifying compactor rolls up 3600 raw records into single hourl (`taskcade-t66.4.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.4.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T66.4.4: Write unit tests verifying compactor rolls up 3600 raw records into single hourl [Role: type_specialist] [Files: packages/engine/src/tests/telemetry_compactor.test.ts]
  - [ ] `taskcade-t66.4.4.2`: [Rehab 2/2] Implementation & Test Verification: T66.4.4: Write unit tests verifying compactor rolls up 3600 raw records into single hourl [Role: implementer] [Files: packages/engine/src/tests/telemetry_compactor.test.ts]

### Task taskcade-t74.3.3 Rehabilitation [2026-10-12T17:14:16.691Z]

- **Parent Task**: T74.3.3: Replace Docker socket bind mount for Authentik worker with Docker socket proxy i (`taskcade-t74.3.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.3.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.3.3: Replace Docker socket bind mount for Authentik worker with Docker socket proxy i [Role: type_specialist] [Files: docker-compose.yml]
  - [ ] `taskcade-t74.3.3.2`: [Rehab 2/2] Implementation & Test Verification: T74.3.3: Replace Docker socket bind mount for Authentik worker with Docker socket proxy i [Role: implementer] [Files: docker-compose.yml]

### Task taskcade-t70.1.2 Rehabilitation [2026-10-12T17:02:44.825Z]

- **Parent Task**: T70.1.2: Generate type-safe method stubs containing parameter contracts, return types, an (`taskcade-t70.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T70.1.2: Generate type-safe method stubs containing parameter contracts, return types, an [Role: type_specialist] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]
  - [ ] `taskcade-t70.1.2.2`: [Rehab 2/2] Implementation & Test Verification: T70.1.2: Generate type-safe method stubs containing parameter contracts, return types, an [Role: implementer] [Files: packages/engine/src/generators/SchematicCodeGenerator.ts]

### Task taskcade-t74.4.3 Rehabilitation [2026-10-12T16:34:52.213Z]

- **Parent Task**: T74.4.3: Add Docker image scanning step using Trivy or Grype scanning the built container (`taskcade-t74.4.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.4.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.4.3: Add Docker image scanning step using Trivy or Grype scanning the built container [Role: type_specialist] [Files: .github/workflows/ci.yml]
  - [ ] `taskcade-t74.4.3.2`: [Rehab 2/2] Implementation & Test Verification: T74.4.3: Add Docker image scanning step using Trivy or Grype scanning the built container [Role: implementer] [Files: .github/workflows/ci.yml]

### Task taskcade-t68.2.1 Rehabilitation [2026-10-12T16:25:21.526Z]

- **Parent Task**: T68.2.1: Implement checkVramHeadroom(requiredMb: number) in AmdVegaTelemetryProvider quer (`taskcade-t68.2.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T68.2.1: Implement checkVramHeadroom(requiredMb: number) in AmdVegaTelemetryProvider quer [Role: type_specialist] [Files: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts]
  - [ ] `taskcade-t68.2.1.2`: [Rehab 2/2] Implementation & Test Verification: T68.2.1: Implement checkVramHeadroom(requiredMb: number) in AmdVegaTelemetryProvider quer [Role: implementer] [Files: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts]

### Task taskcade-t74.8.4 Rehabilitation [2026-10-12T15:53:55.802Z]

- **Parent Task**: T74.8.4: Replace `: any` mock types in GitWorktreeAndWebhook.test.ts and Inference.test.t (`taskcade-t74.8.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.8.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.8.4: Replace `: any` mock types in GitWorktreeAndWebhook.test.ts and Inference.test.t [Role: type_specialist] [Files: packages/engine/src/gitea/**tests**/GitWorktreeAndWebhook.test.ts]
  - [ ] `taskcade-t74.8.4.2`: [Rehab 2/2] Implementation & Test Verification: T74.8.4: Replace `: any` mock types in GitWorktreeAndWebhook.test.ts and Inference.test.t [Role: implementer] [Files: packages/engine/src/gitea/**tests**/GitWorktreeAndWebhook.test.ts]

### Task taskcade-t76.2.4 Rehabilitation [2026-10-12T15:39:36.023Z]

- **Parent Task**: T76.2.4: Write frontend unit tests verifying modal open/close, SSE event binding, and ter (`taskcade-t76.2.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t76.2.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T76.2.4: Write frontend unit tests verifying modal open/close, SSE event binding, and ter [Role: type_specialist] [Files: packages/frontend/src/app/components/model-pull-modal/model-pull-modal.component.spec.ts]
  - [ ] `taskcade-t76.2.4.2`: [Rehab 2/2] Implementation & Test Verification: T76.2.4: Write frontend unit tests verifying modal open/close, SSE event binding, and ter [Role: implementer] [Files: packages/frontend/src/app/components/model-pull-modal/model-pull-modal.component.spec.ts]

### Task taskcade-t66.3.4 Rehabilitation [2026-10-12T15:33:13.461Z]

- **Parent Task**: T66.3.4: Write unit tests verifying resetAllStats updates all model rows to clean baselin (`taskcade-t66.3.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.3.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T66.3.4: Write unit tests verifying resetAllStats updates all model rows to clean baselin [Role: type_specialist] [Files: packages/db/src/tests/model_health_reset.test.ts]
  - [ ] `taskcade-t66.3.4.2`: [Rehab 2/2] Implementation & Test Verification: T66.3.4: Write unit tests verifying resetAllStats updates all model rows to clean baselin [Role: implementer] [Files: packages/db/src/tests/model_health_reset.test.ts]

### Task taskcade-t66.1.2 Rehabilitation [2026-10-12T15:20:22.200Z]

- **Parent Task**: T66.1.2: Create index on task_stages(task_id, stage_name, started_at DESC) optimizing sta (`taskcade-t66.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T66.1.2: Create index on task_stages(task_id, stage_name, started_at DESC) optimizing sta [Role: type_specialist] [Files: packages/db/src/migrations/011_task_history_indexes.ts]
  - [ ] `taskcade-t66.1.2.2`: [Rehab 2/2] Implementation & Test Verification: T66.1.2: Create index on task_stages(task_id, stage_name, started_at DESC) optimizing sta [Role: implementer] [Files: packages/db/src/migrations/011_task_history_indexes.ts]

### Task taskcade-t70.1.3 Rehabilitation [2026-10-12T15:03:57.434Z]

- **Parent Task**: T70.1.3: Define declarative schematic templates for common workspace patterns (ScrubberRu (`taskcade-t70.1.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t70.1.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T70.1.3: Define declarative schematic templates for common workspace patterns (ScrubberRu [Role: type_specialist] [Files: packages/engine/src/generators/SchematicTemplates.ts]
  - [ ] `taskcade-t70.1.3.2`: [Rehab 2/2] Implementation & Test Verification: T70.1.3: Define declarative schematic templates for common workspace patterns (ScrubberRu [Role: implementer] [Files: packages/engine/src/generators/SchematicTemplates.ts]

### Task taskcade-t74.8.2 Rehabilitation [2026-10-12T15:01:48.399Z]

- **Parent Task**: T74.8.2: Replace `: any` mock types in closed_loop_pr_and_tools.test.ts with properly typ (`taskcade-t74.8.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.8.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.8.2: Replace `: any` mock types in closed_loop_pr_and_tools.test.ts with properly typ [Role: type_specialist] [Files: packages/engine/src/tests/closed_loop_pr_and_tools.test.ts]
  - [ ] `taskcade-t74.8.2.2`: [Rehab 2/2] Implementation & Test Verification: T74.8.2: Replace `: any` mock types in closed_loop_pr_and_tools.test.ts with properly typ [Role: implementer] [Files: packages/engine/src/tests/closed_loop_pr_and_tools.test.ts]

### Task taskcade-t64.6.2 Rehabilitation [2026-10-12T14:57:16.768Z]

- **Parent Task**: T64.6.2: Verify preconditions prior to merge: test status check must be 'success' and rev (`taskcade-t64.6.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.6.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T64.6.2: Verify preconditions prior to merge: test status check must be 'success' and rev [Role: type_specialist] [Files: packages/engine/src/gitea/AutomatedPrWorkflow.ts]
  - [ ] `taskcade-t64.6.2.2`: [Rehab 2/2] Implementation & Test Verification: T64.6.2: Verify preconditions prior to merge: test status check must be 'success' and rev [Role: implementer] [Files: packages/engine/src/gitea/AutomatedPrWorkflow.ts]

### Task taskcade-t65.5.1 Rehabilitation [2026-10-12T14:28:09.985Z]

- **Parent Task**: T65.5.1: Add action buttons (Restart, Terminate) to process table rows with role-gated au (`taskcade-t65.5.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.5.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T65.5.1: Add action buttons (Restart, Terminate) to process table rows with role-gated au [Role: type_specialist] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts]
  - [ ] `taskcade-t65.5.1.2`: [Rehab 2/2] Implementation & Test Verification: T65.5.1: Add action buttons (Restart, Terminate) to process table rows with role-gated au [Role: implementer] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts]

### Task taskcade-t66.2.4 Rehabilitation [2026-10-12T14:19:00.549Z]

- **Parent Task**: T66.2.4: Write integration tests verifying DELETE /api/history removes COMPLETED and FAIL (`taskcade-t66.2.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t66.2.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T66.2.4: Write integration tests verifying DELETE /api/history removes COMPLETED and FAIL [Role: type_specialist] [Files: packages/engine/src/tests/history_purge_api.test.ts]
  - [ ] `taskcade-t66.2.4.2`: [Rehab 2/2] Implementation & Test Verification: T66.2.4: Write integration tests verifying DELETE /api/history removes COMPLETED and FAIL [Role: implementer] [Files: packages/engine/src/tests/history_purge_api.test.ts]

### Task taskcade-t68.5.1 Rehabilitation [2026-10-12T14:02:12.862Z]

- **Parent Task**: T68.5.1: Create MultiGpuTaskRouter in packages/engine/src/hardware/MultiGpuTaskRouter.ts (`taskcade-t68.5.1`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.5.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T68.5.1: Create MultiGpuTaskRouter in packages/engine/src/hardware/MultiGpuTaskRouter.ts [Role: type_specialist] [Files: packages/engine/src/hardware/MultiGpuTaskRouter.ts]
  - [ ] `taskcade-t68.5.1.2`: [Rehab 2/2] Implementation & Test Verification: T68.5.1: Create MultiGpuTaskRouter in packages/engine/src/hardware/MultiGpuTaskRouter.ts [Role: implementer] [Files: packages/engine/src/hardware/MultiGpuTaskRouter.ts]

### Task taskcade-t74.6.4 Rehabilitation [2026-10-12T13:47:15.909Z]

- **Parent Task**: T74.6.4: Write unit tests verifying JSON log output format, level filtering, and correlat (`taskcade-t74.6.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.6.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.6.4: Write unit tests verifying JSON log output format, level filtering, and correlat [Role: type_specialist] [Files: packages/engine/src/tests/structured_logger.test.ts]
  - [ ] `taskcade-t74.6.4.2`: [Rehab 2/2] Implementation & Test Verification: T74.6.4: Write unit tests verifying JSON log output format, level filtering, and correlat [Role: implementer] [Files: packages/engine/src/tests/structured_logger.test.ts]

### Task taskcade-t68.2.4 Rehabilitation [2026-10-12T13:44:04.837Z]

- **Parent Task**: T68.2.4: Write unit tests verifying scheduler defers 8b tasks when VRAM headroom is const (`taskcade-t68.2.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.2.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T68.2.4: Write unit tests verifying scheduler defers 8b tasks when VRAM headroom is const [Role: type_specialist] [Files: packages/engine/src/tests/scheduler_vram_check.test.ts]
  - [ ] `taskcade-t68.2.4.2`: [Rehab 2/2] Implementation & Test Verification: T68.2.4: Write unit tests verifying scheduler defers 8b tasks when VRAM headroom is const [Role: implementer] [Files: packages/engine/src/tests/scheduler_vram_check.test.ts]

### Task taskcade-t64.4.4 Rehabilitation [2026-10-12T13:36:48.756Z]

- **Parent Task**: T64.4.4: Write unit tests verifying review prompt formatting and verdict parsing from mod (`taskcade-t64.4.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.4.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T64.4.4: Write unit tests verifying review prompt formatting and verdict parsing from mod [Role: type_specialist] [Files: packages/engine/src/tests/pr_reviewer.test.ts]
  - [ ] `taskcade-t64.4.4.2`: [Rehab 2/2] Implementation & Test Verification: T64.4.4: Write unit tests verifying review prompt formatting and verdict parsing from mod [Role: implementer] [Files: packages/engine/src/tests/pr_reviewer.test.ts]

### Task taskcade-t86.1.2 Rehabilitation [2026-10-12T13:35:36.700Z]

- **Parent Task**: T86.1.2: Implement `FleetHealthMonitor` service in `packages/engine/src/fleet/FleetHealth (`taskcade-t86.1.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t86.1.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T86.1.2: Implement `FleetHealthMonitor` service in `packages/engine/src/fleet/FleetHealth [Role: type_specialist] [Files: packages/engine/src/fleet/FleetHealthMonitor.ts]
  - [ ] `taskcade-t86.1.2.2`: [Rehab 2/2] Implementation & Test Verification: T86.1.2: Implement `FleetHealthMonitor` service in `packages/engine/src/fleet/FleetHealth [Role: implementer] [Files: packages/engine/src/fleet/FleetHealthMonitor.ts]

### Task taskcade-t65.2.2 Rehabilitation [2026-10-12T13:28:57.169Z]

- **Parent Task**: T65.2.2: Compute activeRunningTestsCount signal from ArenaStateStore; animate badge pulse (`taskcade-t65.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T65.2.2: Compute activeRunningTestsCount signal from ArenaStateStore; animate badge pulse [Role: type_specialist] [Files: packages/frontend/src/app/app.ts]
  - [ ] `taskcade-t65.2.2.2`: [Rehab 2/2] Implementation & Test Verification: T65.2.2: Compute activeRunningTestsCount signal from ArenaStateStore; animate badge pulse [Role: implementer] [Files: packages/frontend/src/app/app.ts]

### Task taskcade-t64.6.3 Rehabilitation [2026-10-12T12:51:21.769Z]

- **Parent Task**: T64.6.3: Execute squash-merge via Gitea API (POST /api/v1/repos/{owner}/{repo}/pulls/{ind (`taskcade-t64.6.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.6.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T64.6.3: Execute squash-merge via Gitea API (POST /api/v1/repos/{owner}/{repo}/pulls/{ind [Role: type_specialist] [Files: packages/engine/src/gitea/GiteaPrClient.ts]
  - [ ] `taskcade-t64.6.3.2`: [Rehab 2/2] Implementation & Test Verification: T64.6.3: Execute squash-merge via Gitea API (POST /api/v1/repos/{owner}/{repo}/pulls/{ind [Role: implementer] [Files: packages/engine/src/gitea/GiteaPrClient.ts]

### Task taskcade-t68.2.2 Rehabilitation [2026-10-12T12:48:15.115Z]

- **Parent Task**: T68.2.2: Enforce safety margin: require at least 1024 MB buffer above model requirement t (`taskcade-t68.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T68.2.2: Enforce safety margin: require at least 1024 MB buffer above model requirement t [Role: type_specialist] [Files: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts]
  - [ ] `taskcade-t68.2.2.2`: [Rehab 2/2] Implementation & Test Verification: T68.2.2: Enforce safety margin: require at least 1024 MB buffer above model requirement t [Role: implementer] [Files: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts]

### Task taskcade-t68.3.2 Rehabilitation [2026-10-12T12:39:42.219Z]

- **Parent Task**: T68.3.2: Prioritize pending tasks that can be fulfilled by the currently loaded warm mode (`taskcade-t68.3.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T68.3.2: Prioritize pending tasks that can be fulfilled by the currently loaded warm mode [Role: type_specialist] [Files: packages/engine/src/scheduler/QueueGroomer.ts]
  - [ ] `taskcade-t68.3.2.2`: [Rehab 2/2] Implementation & Test Verification: T68.3.2: Prioritize pending tasks that can be fulfilled by the currently loaded warm mode [Role: implementer] [Files: packages/engine/src/scheduler/QueueGroomer.ts]

### Task taskcade-t65.4.3 Rehabilitation [2026-10-12T10:30:48.819Z]

- **Parent Task**: T65.4.3: Implement smooth slide transition when expanding/collapsing drawer using CSS gri (`taskcade-t65.4.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.4.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T65.4.3: Implement smooth slide transition when expanding/collapsing drawer using CSS gri [Role: type_specialist] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts]
  - [ ] `taskcade-t65.4.3.2`: [Rehab 2/2] Implementation & Test Verification: T65.4.3: Implement smooth slide transition when expanding/collapsing drawer using CSS gri [Role: implementer] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts]

### Task taskcade-t74.6.2 Rehabilitation [2026-10-12T09:50:32.294Z]

- **Parent Task**: T74.6.2: Replace bare console.log/console.error calls across CacophonyDaemon, CacophonyHt (`taskcade-t74.6.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.6.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.6.2: Replace bare console.log/console.error calls across CacophonyDaemon, CacophonyHt [Role: type_specialist] [Files: packages/engine/src/daemon/*.ts]
  - [ ] `taskcade-t74.6.2.2`: [Rehab 2/2] Implementation & Test Verification: T74.6.2: Replace bare console.log/console.error calls across CacophonyDaemon, CacophonyHt [Role: implementer] [Files: packages/engine/src/daemon/*.ts]

### Task taskcade-t68.5.2 Rehabilitation [2026-10-12T09:36:54.543Z]

- **Parent Task**: T68.5.2: Map individual model allocations to target accelerator by passing CUDA_VISIBLE_D (`taskcade-t68.5.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t68.5.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T68.5.2: Map individual model allocations to target accelerator by passing CUDA_VISIBLE_D [Role: type_specialist] [Files: packages/engine/src/hardware/MultiGpuTaskRouter.ts]
  - [ ] `taskcade-t68.5.2.2`: [Rehab 2/2] Implementation & Test Verification: T68.5.2: Map individual model allocations to target accelerator by passing CUDA_VISIBLE_D [Role: implementer] [Files: packages/engine/src/hardware/MultiGpuTaskRouter.ts]

### Task taskcade-t72.2.3 Rehabilitation [2026-10-12T09:01:06.232Z]

- **Parent Task**: T72.2.3: Allow explicit model pinning via `[Model: qwen2.5-coder:7b-instruct-q4_K_M]` to (`taskcade-t72.2.3`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 1800000ms for model 'qwen2.5-coder:7b-instruct-q4_K_M'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.2.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T72.2.3: Allow explicit model pinning via `[Model: qwen2.5-coder:7b-instruct-q4_K_M]` to [Role: type_specialist] [Files: packages/engine/src/scheduler/TaskScheduler.ts]
  - [ ] `taskcade-t72.2.3.2`: [Rehab 2/2] Implementation & Test Verification: T72.2.3: Allow explicit model pinning via `[Model: qwen2.5-coder:7b-instruct-q4_K_M]` to [Role: implementer] [Files: packages/engine/src/scheduler/TaskScheduler.ts]

### Task taskcade-t65.5.4 Rehabilitation [2026-10-12T08:31:05.288Z]

- **Parent Task**: T65.5.4: Write unit tests verifying process action modal confirmation flow and role autho (`taskcade-t65.5.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t65.5.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T65.5.4: Write unit tests verifying process action modal confirmation flow and role autho [Role: type_specialist] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.spec.ts]
  - [ ] `taskcade-t65.5.4.2`: [Rehab 2/2] Implementation & Test Verification: T65.5.4: Write unit tests verifying process action modal confirmation flow and role autho [Role: implementer] [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.spec.ts]

### Task taskcade-t67.2.2 Rehabilitation [2026-10-12T08:16:29.810Z]

- **Parent Task**: T67.2.2: Stream initial buffer chunk (stream_init event) upon client connection containin (`taskcade-t67.2.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t67.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T67.2.2: Stream initial buffer chunk (stream_init event) upon client connection containin [Role: type_specialist] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]
  - [ ] `taskcade-t67.2.2.2`: [Rehab 2/2] Implementation & Test Verification: T67.2.2: Stream initial buffer chunk (stream_init event) upon client connection containin [Role: implementer] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]

### Task taskcade-t74.6.3 Rehabilitation [2026-10-12T07:57:37.736Z]

- **Parent Task**: T74.6.3: Add configurable log level (DEBUG, INFO, WARN, ERROR) via LOG_LEVEL env var defa (`taskcade-t74.6.3`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.6.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.6.3: Add configurable log level (DEBUG, INFO, WARN, ERROR) via LOG_LEVEL env var defa [Role: type_specialist] [Files: packages/engine/src/telemetry/StructuredLogger.ts]
  - [ ] `taskcade-t74.6.3.2`: [Rehab 2/2] Implementation & Test Verification: T74.6.3: Add configurable log level (DEBUG, INFO, WARN, ERROR) via LOG_LEVEL env var defa [Role: implementer] [Files: packages/engine/src/telemetry/StructuredLogger.ts]

### Task taskcade-t74.7.2 Rehabilitation [2026-10-12T04:34:34.206Z]

- **Parent Task**: T74.7.2: Add POST /api/admin/backup endpoint triggering on-demand database snapshot with (`taskcade-t74.7.2`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.7.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.7.2: Add POST /api/admin/backup endpoint triggering on-demand database snapshot with [Role: type_specialist] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]
  - [ ] `taskcade-t74.7.2.2`: [Rehab 2/2] Implementation & Test Verification: T74.7.2: Add POST /api/admin/backup endpoint triggering on-demand database snapshot with [Role: implementer] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]

### Task taskcade-t72.3.4 Rehabilitation [2026-10-12T02:54:56.349Z]

- **Parent Task**: T72.3.4: Write unit tests verifying that agents calling the MCP tool successfully registe (`taskcade-t72.3.4`)
- **Failure Count**: 3
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t72.3.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T72.3.4: Write unit tests verifying that agents calling the MCP tool successfully registe [Role: type_specialist] [Files: packages/tools/src/tests/EnqueueTaskcadeTaskTool.test.ts]
  - [ ] `taskcade-t72.3.4.2`: [Rehab 2/2] Implementation & Test Verification: T72.3.4: Write unit tests verifying that agents calling the MCP tool successfully registe [Role: implementer] [Files: packages/tools/src/tests/EnqueueTaskcadeTaskTool.test.ts]

### Task taskcade-t74.2.3 Rehabilitation [2026-10-12T01:45:18.731Z]

- **Parent Task**: T74.2.3: Implement read-only role (VIEWER) for dashboard access without task mutation cap (`taskcade-t74.2.3`)
- **Failure Count**: 3
- **Failure Reason**: [TIMEOUT]: Task execution exceeded allocated timeout of 1800000ms for model 'qwen2.5-coder:7b-instruct-q4_K_M'
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.2.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.2.3: Implement read-only role (VIEWER) for dashboard access without task mutation cap [Role: type_specialist] [Files: packages/engine/src/auth/AuthService.ts]
  - [ ] `taskcade-t74.2.3.2`: [Rehab 2/2] Implementation & Test Verification: T74.2.3: Implement read-only role (VIEWER) for dashboard access without task mutation cap [Role: implementer] [Files: packages/engine/src/auth/AuthService.ts]

### Task taskcade-t67.2.1 Rehabilitation [2026-10-11T22:16:48.563Z]

- **Parent Task**: T67.2.1: Add parameterized SSE route GET /api/stream/:taskId in CacophonyHttpServer allow (`taskcade-t67.2.1`)
- **Failure Count**: 4
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t67.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T67.2.1: Add parameterized SSE route GET /api/stream/:taskId in CacophonyHttpServer allow [Role: type_specialist] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]
  - [ ] `taskcade-t67.2.1.2`: [Rehab 2/2] Implementation & Test Verification: T67.2.1: Add parameterized SSE route GET /api/stream/:taskId in CacophonyHttpServer allow [Role: implementer] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]

### Task taskcade-t85.4.3 Rehabilitation [2026-10-11T21:56:42.977Z]

- **Parent Task**: T85.4.3: Integrate trend widget into `DashboardViewComponent` directly adjacent to overal (`taskcade-t85.4.3`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t85.4.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T85.4.3: Integrate trend widget into `DashboardViewComponent` directly adjacent to overal [Role: type_specialist] [Files: packages/frontend/src/app/components/views/dashboard-view.component.ts]
  - [x] `taskcade-t85.4.3.2`: [Rehab 2/2] Implementation & Test Verification: T85.4.3: Integrate trend widget into `DashboardViewComponent` directly adjacent to overal [Role: implementer] [Files: packages/frontend/src/app/components/views/dashboard-view.component.ts]

### Task taskcade-t88.3.3 Rehabilitation [2026-10-11T21:34:56.580Z]

- **Parent Task**: T88.3.3: Critical: Start a fresh assessment round whenever the PR head SHA changes and re (`taskcade-t88.3.3`)
- **Failure Count**: 4
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.3.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T88.3.3: Critical: Start a fresh assessment round whenever the PR head SHA changes and re [Role: type_specialist] [Files: packages/db/src/repositories/ReviewReportRepository.ts]
  - [ ] `taskcade-t88.3.3.2`: [Rehab 2/2] Implementation & Test Verification: T88.3.3: Critical: Start a fresh assessment round whenever the PR head SHA changes and re [Role: implementer] [Files: packages/db/src/repositories/ReviewReportRepository.ts]

### Task taskcade-t88.1.3 Rehabilitation [2026-10-11T21:22:09.196Z]

- **Parent Task**: T88.1.3: Critical: Make PR, CI, and webhook callbacks idempotent using stable work-item, (`taskcade-t88.1.3`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.1.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T88.1.3: Critical: Make PR, CI, and webhook callbacks idempotent using stable work-item, [Role: type_specialist] [Files: packages/engine/src/gitea/AutomatedPrWorkflow.ts]
  - [ ] `taskcade-t88.1.3.2`: [Rehab 2/2] Implementation & Test Verification: T88.1.3: Critical: Make PR, CI, and webhook callbacks idempotent using stable work-item, [Role: implementer] [Files: packages/engine/src/gitea/AutomatedPrWorkflow.ts]

### Task taskcade-t74.3.4 Rehabilitation [2026-10-11T21:20:23.843Z]

- **Parent Task**: T74.3.4: Remove root user directive from Authentik worker and configure proper UID/GID ma (`taskcade-t74.3.4`)
- **Failure Count**: 4
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.3.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.3.4: Remove root user directive from Authentik worker and configure proper UID/GID ma [Role: type_specialist] [Files: docker-compose.yml]
  - [ ] `taskcade-t74.3.4.2`: [Rehab 2/2] Implementation & Test Verification: T74.3.4: Remove root user directive from Authentik worker and configure proper UID/GID ma [Role: implementer] [Files: docker-compose.yml]

### Task taskcade-t85.4.1 Rehabilitation [2026-10-11T20:58:03.958Z]

- **Parent Task**: T85.4.1: Create `WindowedSuccessTrendComponent` in `packages/frontend/src/app/components/ (`taskcade-t85.4.1`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t85.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T85.4.1: Create `WindowedSuccessTrendComponent` in `packages/frontend/src/app/components/ [Role: type_specialist] [Files: packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.ts]
  - [x] `taskcade-t85.4.1.2`: [Rehab 2/2] Implementation & Test Verification: T85.4.1: Create `WindowedSuccessTrendComponent` in `packages/frontend/src/app/components/ [Role: implementer] [Files: packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.ts]

### Task taskcade-t71.2.2 Rehabilitation [2026-10-11T20:28:21.428Z]

- **Parent Task**: T71.2.2: Add generic OpenAI-compatible HTTP inference provider alongside native Ollama ad (`taskcade-t71.2.2`)
- **Failure Count**: 4
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t71.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T71.2.2: Add generic OpenAI-compatible HTTP inference provider alongside native Ollama ad [Role: type_specialist] [Files: packages/engine/src/inference/OpenAICompatibleInferenceProvider.ts]
  - [ ] `taskcade-t71.2.2.2`: [Rehab 2/2] Implementation & Test Verification: T71.2.2: Add generic OpenAI-compatible HTTP inference provider alongside native Ollama ad [Role: implementer] [Files: packages/engine/src/inference/OpenAICompatibleInferenceProvider.ts]

### Task taskcade-t64.2.1 Rehabilitation [2026-10-11T19:59:36.773Z]

- **Parent Task**: T64.2.1: Create ConventionalCommitGenerator in packages/engine/src/gitea/ConventionalComm (`taskcade-t64.2.1`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.2.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T64.2.1: Create ConventionalCommitGenerator in packages/engine/src/gitea/ConventionalComm [Role: type_specialist] [Files: packages/engine/src/gitea/ConventionalCommitGenerator.ts]
  - [ ] `taskcade-t64.2.1.2`: [Rehab 2/2] Implementation & Test Verification: T64.2.1: Create ConventionalCommitGenerator in packages/engine/src/gitea/ConventionalComm [Role: implementer] [Files: packages/engine/src/gitea/ConventionalCommitGenerator.ts]

### Task taskcade-t64.1.4 Rehabilitation [2026-10-11T19:26:02.498Z]

- **Parent Task**: T64.1.4: Write unit tests verifying worktree creation, isolated file modification, and cl (`taskcade-t64.1.4`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.1.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T64.1.4: Write unit tests verifying worktree creation, isolated file modification, and cl [Role: type_specialist] [Files: packages/engine/src/tests/worktree_manager.test.ts]
  - [ ] `taskcade-t64.1.4.2`: [Rehab 2/2] Implementation & Test Verification: T64.1.4: Write unit tests verifying worktree creation, isolated file modification, and cl [Role: implementer] [Files: packages/engine/src/tests/worktree_manager.test.ts]

### Task taskcade-t64.1.3 Rehabilitation [2026-10-11T19:07:09.978Z]

- **Parent Task**: T64.1.3: Clean up and remove git worktree upon task completion or cancellation using git (`taskcade-t64.1.3`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.1.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T64.1.3: Clean up and remove git worktree upon task completion or cancellation using git [Role: type_specialist] [Files: packages/engine/src/gitea/GitWorktreeManager.ts]
  - [ ] `taskcade-t64.1.3.2`: [Rehab 2/2] Implementation & Test Verification: T64.1.3: Clean up and remove git worktree upon task completion or cancellation using git [Role: implementer] [Files: packages/engine/src/gitea/GitWorktreeManager.ts]

### Task taskcade-t63.6.4 Rehabilitation [2026-10-11T18:58:58.558Z]

- **Parent Task**: T63.6.4: Write unit tests verifying pre-flight check catches obvious syntax mistakes with (`taskcade-t63.6.4`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t63.6.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T63.6.4: Write unit tests verifying pre-flight check catches obvious syntax mistakes with [Role: type_specialist] [Files: packages/engine/src/tests/preflight_checker.test.ts]
  - [ ] `taskcade-t63.6.4.2`: [Rehab 2/2] Implementation & Test Verification: T63.6.4: Write unit tests verifying pre-flight check catches obvious syntax mistakes with [Role: implementer] [Files: packages/engine/src/tests/preflight_checker.test.ts]

### Task taskcade-t63.3.2 Rehabilitation [2026-10-11T18:28:57.957Z]

- **Parent Task**: T63.3.2: Format remediation prompt with structured sections: '1. Original Task Goal', '2. (`taskcade-t63.3.2`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t63.3.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T63.3.2: Format remediation prompt with structured sections: '1. Original Task Goal', '2. [Role: type_specialist] [Files: packages/engine/src/inference/RemediationPromptFormatter.ts]
  - [ ] `taskcade-t63.3.2.2`: [Rehab 2/2] Implementation & Test Verification: T63.3.2: Format remediation prompt with structured sections: '1. Original Task Goal', '2. [Role: implementer] [Files: packages/engine/src/inference/RemediationPromptFormatter.ts]

### Task taskcade-t63.5.4 Rehabilitation [2026-10-11T18:07:54.857Z]

- **Parent Task**: T63.5.4: Write unit tests verifying successful remediation increments model recovery coun (`taskcade-t63.5.4`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t63.5.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T63.5.4: Write unit tests verifying successful remediation increments model recovery coun [Role: type_specialist] [Files: packages/engine/src/tests/remediation_telemetry.test.ts]
  - [ ] `taskcade-t63.5.4.2`: [Rehab 2/2] Implementation & Test Verification: T63.5.4: Write unit tests verifying successful remediation increments model recovery coun [Role: implementer] [Files: packages/engine/src/tests/remediation_telemetry.test.ts]

### Task taskcade-t63.3.3 Rehabilitation [2026-10-11T15:55:57.821Z]

- **Parent Task**: T63.3.3: Add explicit instruction demanding only the fixed code replacement without conve (`taskcade-t63.3.3`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t63.3.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T63.3.3: Add explicit instruction demanding only the fixed code replacement without conve [Role: type_specialist] [Files: packages/engine/src/inference/RemediationPromptFormatter.ts]
  - [ ] `taskcade-t63.3.3.2`: [Rehab 2/2] Implementation & Test Verification: T63.3.3: Add explicit instruction demanding only the fixed code replacement without conve [Role: implementer] [Files: packages/engine/src/inference/RemediationPromptFormatter.ts]

### Task taskcade-t59.4.1 Rehabilitation [2026-10-11T15:53:46.287Z]

- **Parent Task**: T59.4.1: Implement Historical Test Runs table in TestingViewComponent listing past test e (`taskcade-t59.4.1`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t59.4.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T59.4.1: Implement Historical Test Runs table in TestingViewComponent listing past test e [Role: type_specialist] [Files: packages/frontend/src/app/components/views/testing-view.component.ts]
  - [x] `taskcade-t59.4.1.2`: [Rehab 2/2] Implementation & Test Verification: T59.4.1: Implement Historical Test Runs table in TestingViewComponent listing past test e [Role: implementer] [Files: packages/frontend/src/app/components/views/testing-view.component.ts]

### Task taskcade-t63.3.1 Rehabilitation [2026-10-11T15:35:29.936Z]

- **Parent Task**: T63.3.1: Create RemediationPromptFormatter in packages/engine/src/inference/RemediationPr (`taskcade-t63.3.1`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t63.3.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T63.3.1: Create RemediationPromptFormatter in packages/engine/src/inference/RemediationPr [Role: type_specialist] [Files: packages/engine/src/inference/RemediationPromptFormatter.ts]
  - [ ] `taskcade-t63.3.1.2`: [Rehab 2/2] Implementation & Test Verification: T63.3.1: Create RemediationPromptFormatter in packages/engine/src/inference/RemediationPr [Role: implementer] [Files: packages/engine/src/inference/RemediationPromptFormatter.ts]

### Task taskcade-t60.5.4 Rehabilitation [2026-10-11T15:30:09.742Z]

- **Parent Task**: T60.5.4: Write integration tests verifying PUT /api/bandit/policy alters runtime schedule (`taskcade-t60.5.4`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t60.5.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T60.5.4: Write integration tests verifying PUT /api/bandit/policy alters runtime schedule [Role: type_specialist] [Files: packages/engine/src/tests/bandit_api.test.ts]
  - [x] `taskcade-t60.5.4.2`: [Rehab 2/2] Implementation & Test Verification: T60.5.4: Write integration tests verifying PUT /api/bandit/policy alters runtime schedule [Role: implementer] [Files: packages/engine/src/tests/bandit_api.test.ts]

### Task taskcade-t64.6.4 Rehabilitation [2026-10-11T14:58:38.177Z]

- **Parent Task**: T64.6.4: Write integration tests verifying that PR meeting all criteria is automatically (`taskcade-t64.6.4`)
- **Failure Count**: 5
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t64.6.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T64.6.4: Write integration tests verifying that PR meeting all criteria is automatically [Role: type_specialist] [Files: packages/engine/src/tests/automated_merge.test.ts]
  - [ ] `taskcade-t64.6.4.2`: [Rehab 2/2] Implementation & Test Verification: T64.6.4: Write integration tests verifying that PR meeting all criteria is automatically [Role: implementer] [Files: packages/engine/src/tests/automated_merge.test.ts]

### Task taskcade-t74.6.1 Rehabilitation [2026-10-11T14:34:15.278Z]

- **Parent Task**: T74.6.1: Create StructuredLogger utility in packages/engine/src/telemetry/ emitting JSON (`taskcade-t74.6.1`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t74.6.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T74.6.1: Create StructuredLogger utility in packages/engine/src/telemetry/ emitting JSON [Role: type_specialist] [Files: packages/engine/src/telemetry/StructuredLogger.ts]
  - [ ] `taskcade-t74.6.1.2`: [Rehab 2/2] Implementation & Test Verification: T74.6.1: Create StructuredLogger utility in packages/engine/src/telemetry/ emitting JSON [Role: implementer] [Files: packages/engine/src/telemetry/StructuredLogger.ts]

### Task taskcade-t62.6.4 Rehabilitation [2026-10-11T14:24:54.025Z]

- **Parent Task**: T62.6.4: Write unit tests verifying token estimator accurately predicts token usage withi (`taskcade-t62.6.4`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t62.6.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T62.6.4: Write unit tests verifying token estimator accurately predicts token usage withi [Role: type_specialist] [Files: packages/engine/src/tests/token_estimator.test.ts]
  - [x] `taskcade-t62.6.4.2`: [Rehab 2/2] Implementation & Test Verification: T62.6.4: Write unit tests verifying token estimator accurately predicts token usage withi [Role: implementer] [Files: packages/engine/src/tests/token_estimator.test.ts]

### Task taskcade-t55.2.2 Rehabilitation [2026-10-11T14:09:38.234Z]

- **Parent Task**: T55.2.2: Implement PUT /api/bandit/policy accepting { policy, explorationRate, ucbConstan (`taskcade-t55.2.2`)
- **Failure Count**: 8
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t55.2.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T55.2.2: Implement PUT /api/bandit/policy accepting { policy, explorationRate, ucbConstan [Role: type_specialist] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]
  - [x] `taskcade-t55.2.2.2`: [Rehab 2/2] Implementation & Test Verification: T55.2.2: Implement PUT /api/bandit/policy accepting { policy, explorationRate, ucbConstan [Role: implementer] [Files: packages/engine/src/daemon/CacophonyHttpServer.ts]

### Task taskcade-t88.2.4 Rehabilitation [2026-10-11T13:57:10.801Z]

- **Parent Task**: T88.2.4: Critical: Display assessment round, assessor model, verdict, findings, evidence, (`taskcade-t88.2.4`)
- **Failure Count**: 4
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [ ] `taskcade-t88.2.4.1`: [Rehab 1/2] Scaffold & Type Contracts: T88.2.4: Critical: Display assessment round, assessor model, verdict, findings, evidence, [Role: type_specialist] [Files: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts]
  - [ ] `taskcade-t88.2.4.2`: [Rehab 2/2] Implementation & Test Verification: T88.2.4: Critical: Display assessment round, assessor model, verdict, findings, evidence, [Role: implementer] [Files: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts]

### Task taskcade-t63.6.1 Rehabilitation [2026-10-11T13:44:07.072Z]

- **Parent Task**: T63.6.1: Run instant in-memory TypeScript diagnostic check on remediated code before exec (`taskcade-t63.6.1`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t63.6.1.1`: [Rehab 1/2] Scaffold & Type Contracts: T63.6.1: Run instant in-memory TypeScript diagnostic check on remediated code before exec [Role: type_specialist] [Files: packages/engine/src/testing/DiagnosticPreFlightChecker.ts]
  - [x] `taskcade-t63.6.1.2`: [Rehab 2/2] Implementation & Test Verification: T63.6.1: Run instant in-memory TypeScript diagnostic check on remediated code before exec [Role: implementer] [Files: packages/engine/src/testing/DiagnosticPreFlightChecker.ts]

### Task taskcade-t59.4.2 Rehabilitation [2026-10-11T13:08:40.767Z]

- **Parent Task**: T59.4.2: Render column data: Status badge (PASSED, FAILED, TIMEOUT), Task Title, Test Com (`taskcade-t59.4.2`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t59.4.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T59.4.2: Render column data: Status badge (PASSED, FAILED, TIMEOUT), Task Title, Test Com [Role: type_specialist] [Files: packages/frontend/src/app/components/views/testing-view.component.ts]
  - [x] `taskcade-t59.4.2.2`: [Rehab 2/2] Implementation & Test Verification: T59.4.2: Render column data: Status badge (PASSED, FAILED, TIMEOUT), Task Title, Test Com [Role: implementer] [Files: packages/frontend/src/app/components/views/testing-view.component.ts]

### Task taskcade-t57.5.2 Rehabilitation [2026-10-11T13:07:25.215Z]

- **Parent Task**: T57.5.2: Integrate compact success percentage pill into root TelemetryBar component visib (`taskcade-t57.5.2`)
- **Failure Count**: 6
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t57.5.2.1`: [Rehab 1/2] Scaffold & Type Contracts: T57.5.2: Integrate compact success percentage pill into root TelemetryBar component visib [Role: type_specialist] [Files: packages/frontend/src/app/components/telemetry-bar/telemetry-bar.component.ts]
  - [x] `taskcade-t57.5.2.2`: [Rehab 2/2] Implementation & Test Verification: T57.5.2: Integrate compact success percentage pill into root TelemetryBar component visib [Role: implementer] [Files: packages/frontend/src/app/components/telemetry-bar/telemetry-bar.component.ts]

### Task taskcade-t47.4.3 Rehabilitation [2026-10-11T13:01:27.928Z]

- **Parent Task**: T47.4.3: Implement safe database disconnect and lock release on process SIGTERM and SIGIN (`taskcade-t47.4.3`)
- **Failure Count**: 8
- **Failure Reason**: Stage failed verification
- **Decomposed Subtasks**:
  - [x] `taskcade-t47.4.3.1`: [Rehab 1/2] Scaffold & Type Contracts: T47.4.3: Implement safe database disconnect and lock release on process SIGTERM and SIGIN [Role: type_specialist] [Files: packages/engine/src/daemon/CacophonyDaemon.ts]
  - [x] `taskcade-t47.4.3.2`: [Rehab 2/2] Implementation & Test Verification: T47.4.3: Implement safe database disconnect and lock release on process SIGTERM and SIGIN [Role: implementer] [Files: packages/engine/src/daemon/CacophonyDaemon.ts]

_Autonomous Deterministic Decompositions from Exceeded Failure Limits_
