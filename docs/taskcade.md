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
5. **Reference**: See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 44, plus fully verified Phases 45, 46, 48-54, 58, 61, 73, 75, 77-80, 82, and 89-95.

---

## Active Milestone Era: Gitea Deep API Integration, Dynamic Branching, Least-Privilege Guardrails & Webhook Orchestration

*See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 44, plus fully verified Phases 45, 46, 48-54, 58, 61, 73, 75, 77-80, 82, and 89-95.*

---

## Active Sprint Priority Queue & Immediate Execution Order

> [!IMPORTANT]
> **Execution Directives for Next Frontier Model Implementer:**
> The following phases constitute the highest-priority implementation pipeline above all others, structured for immediate frontier model execution:
> 1. **Priority 1: Phase 84 (Auto-Mode Hardening & Bi-Directional GitHub Issue Sync)**: Defocus manual Plan and Build modes in favor of 24/7 Auto Mode; add pre-commit build gates in worktrees and poll public GitHub issues into the local queue.
> 2. **Priority 2: Phase 81 (Autonomous Project File Ingestion, Architectural Decomposer & Acceptance Criteria Engine)**: Enable drop-in spec file ingestion (`docs/spec.md`, `README.md`) that autonomously derives SOLID architectures, data schemas, machine-testable acceptance criteria, and topologically sequenced tasks.
> 3. **Priority 3: Phase 83 (Heterogeneous Hardware Detection, Zero-Config Hardware Profiler & Contributor Onboarding Engine)**: Implement pluggable telemetry and hyperparameter auto-sizing for external contributors running NVIDIA CUDA, Apple Silicon Metal, Intel Arc, or CPU inference.


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
  - [x] T47.4.1: Implement stale lockfile detection in PGliteDriver recovering cleanly from unclean container restarts. [File: packages/db/src/drivers/PGliteDriver.ts] [Class: PGliteDriver] [Test: npm test -- packages/db/src/tests/pglite_driver.test.ts]
  - [x] T47.4.2: Add health check query verification (SELECT 1) with retry backoff in PGliteDriver.connect(). [File: packages/db/src/drivers/PGliteDriver.ts] [Method: PGliteDriver.connect] [Test: npm test -- packages/db/src/tests/pglite_driver.test.ts]
  - [ ] T47.4.3: Implement safe database disconnect and lock release on process SIGTERM and SIGINT in CacophonyDaemon. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: CacophonyDaemon.stop] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [x] T47.4.4: Write unit tests verifying PGlite driver re-establishes connection and handles concurrency locks gracefully. [File: packages/db/src/tests/pglite_resilience.test.ts] [Test: npm test -- packages/db/src/tests/pglite_resilience.test.ts]

### T47.5: Continuous Queue Ingestion & Priority-Based Preemption
  - [x] T47.5.1: Enhance TaskRepository.listPending() to order by effective priority considering both base priority and wait age. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.listPending] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T47.5.2: Implement starvation prevention bumping tasks waiting longer than 15 minutes up one priority level. [File: packages/engine/src/scheduler/QueueGroomer.ts] [Class: QueueGroomer] [Test: npm test -- packages/engine/src/tests/queue_groomer.test.ts]
  - [x] T47.5.3: Add batch task creation endpoint POST /api/tasks/batch for atomic bulk enqueue of decomposed epics. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks/batch] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T47.5.4: Write unit tests validating that P0 tasks preempt lower-priority tasks while preventing starvation of P2 tasks. [File: packages/engine/src/tests/priority_preemption.test.ts] [Test: npm test -- packages/engine/src/tests/priority_preemption.test.ts]

### T47.6: Queue Seed Dispatcher for Self-Hosting Bootstrap
  - [x] T47.6.1: Create TaskcadeSeedLoader reading pending tasks from docs/taskcade.md and parsing them into typed TaskRecord objects. [File: packages/engine/src/scheduler/TaskcadeSeedLoader.ts] [Class: TaskcadeSeedLoader] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts]
  - [x] T47.6.2: Add CLI command bin/seed-queue.ts to enqueue uncompleted checklist items from active taskcade phase. [File: bin/seed-queue.ts] [Test: node bin/seed-queue.ts --dry-run]
  - [x] T47.6.3: Implement duplicate task prevention ensuring identical task IDs or titles are not re-enqueued. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.createIfNotExists] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T47.6.4: Write integration tests verifying seed loader correctly extracts markdown task items and registers them in DB. [File: packages/engine/src/tests/seed_loader.test.ts] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts]

---

## Phase 55: Multi-Armed Bandit Model Exploration & Empirical Reward Engine
*RDF Category: orchestration*

### T55.1: Persist Bandit Arm Records & Beta Distributions in Database
  - [x] T55.1.1: Write SQL migration creating table bandit_arms (arm_id, model_id, role, alpha, beta, total_reward, trials_count). [File: packages/db/src/migrations/005_bandit_arms.sql] [Migration: 005_bandit_arms.sql] [Test: npm test -- packages/db/src/tests/migrations.test.ts]
  - [x] T55.1.2: Implement BanditRepository in packages/db/src/repositories/ with CRUD and transactional reward increment operations. [File: packages/db/src/repositories/BanditRepository.ts] [Class: BanditRepository] [Test: npm test -- packages/db/src/tests/BanditRepository.test.ts]
  - [x] T55.1.3: Initialize BanditTaskScheduler from bandit_arms database records on engine startup. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: loadFromRepository] [Test: npm test -- packages/engine/src/tests/bandit_scheduler.test.ts]
  - [x] T55.1.4: Write unit tests verifying persistent storage and reloading of Alpha/Beta posterior distributions. [File: packages/db/src/tests/bandit_persistence.test.ts] [Test: npm test -- packages/db/src/tests/bandit_persistence.test.ts]

### T55.2: REST API: GET /api/bandit/arms & PUT /api/bandit/policy
  - [x] T55.2.1: Implement GET /api/bandit/arms returning all candidate model arms with win rates, trials, alpha, beta, and tok/s. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/bandit/arms] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T55.2.2: Implement PUT /api/bandit/policy accepting { policy, explorationRate, ucbConstant } and updating scheduler. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: PUT /api/bandit/policy] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T55.2.3: Broadcast 'bandit_updated' event over SSE when arm rewards are updated or policy changes. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Event: bandit_updated] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T55.2.4: Write integration tests verifying policy changes via API take immediate effect in dispatch decisions. [File: packages/engine/src/tests/bandit_api.test.ts] [Test: npm test -- packages/engine/src/tests/bandit_api.test.ts]

### T55.3: Empirical Reward Update Hook in AutonomousWorkerPipeline
  - [x] T55.3.1: Calculate empirical reward score [0.0, 1.0] upon task completion based on test pass, review approval, and tok/s. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: calculateReward] [Test: npm test -- packages/engine/src/tests/bandit_scheduler.test.ts]
  - [ ] T55.3.2: Hook reward calculation into AutonomousWorkerPipeline finalization updating arm Alpha (success) or Beta (failure). [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: finalizeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T55.3.3: Persist updated Alpha/Beta distributions to BanditRepository after every task execution. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: recordReward] [Test: npm test -- packages/engine/src/tests/bandit_scheduler.test.ts]
  - [x] T55.3.4: Write unit tests verifying that successful task runs increase arm Alpha and boost future selection probability. [File: packages/engine/src/tests/bandit_rewards.test.ts] [Test: npm test -- packages/engine/src/tests/bandit_rewards.test.ts]

### T55.4: Wire ExplorationControlComponent to Real Multi-Armed Bandit Telemetry
  - [x] T55.4.1: Fetch live arms and active policy from GET /api/bandit/arms on component ngOnInit in ExplorationControlComponent. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Method: ngOnInit] [Test: npm test]
  - [x] T55.4.2: Connect policy buttons (Epsilon-Greedy, UCB-1, Thompson Sampling) to PUT /api/bandit/policy. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Method: setPolicy] [Test: npm test]
  - [x] T55.4.3: Connect epsilon slider input to PUT /api/bandit/policy with 300ms debounce. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Method: onEpsilonChange] [Test: npm test]
  - [x] T55.4.4: Write frontend unit tests verifying policy change triggers API PUT and updates local activePolicy signal. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm test]

### T55.5: Statistical Role Promotion & Demotion Evaluation
  - [x] T55.5.1: Implement evaluateRolePromotions(role: AgentRole) in BanditTaskScheduler using Welch's t-test for statistical significance. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: evaluateRolePromotions] [Test: npm test -- packages/engine/src/tests/role_promotions.test.ts]
  - [x] T55.5.2: Promote arm to PRIMARY role model when win rate exceeds current primary with p < 0.05 confidence. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: promoteArm] [Test: npm test -- packages/engine/src/tests/role_promotions.test.ts]
  - [x] T55.5.3: Record promotion event in model_health_profiles and broadcast 'model_promoted' SSE notification. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Event: model_promoted] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T55.5.4: Write unit tests simulating trial series verifying that superior model earns promotion over baseline. [File: packages/engine/src/tests/role_promotions.test.ts] [Test: npm test -- packages/engine/src/tests/role_promotions.test.ts]

### T55.6: Pareto Frontier 2D Visualization: Quality vs Velocity vs VRAM
  - [x] T55.6.1: Compute 2D Pareto optimal frontier points (winRatePct vs tokensPerSec) in ExplorationControlComponent. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Computed: paretoFrontier] [Test: npm test]
  - [x] T55.6.2: Render interactive scatter plot with SVG showing each model arm positioned by tok/s (X) and win rate (Y). [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Template: pareto-scatter] [Test: npm test]
  - [x] T55.6.3: Draw frontier envelope connecting non-dominated Pareto optimal models. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Template: pareto-envelope] [Test: npm test]
  - [x] T55.6.4: Write frontend unit tests verifying Pareto frontier calculation identifies dominant models correctly. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm test]

---

## Phase 56: Distributed Heterogeneous Fleet Orchestration & Hardware Telemetry
*RDF Category: telemetry*

### T56.1: Dynamic Node Telemetry Sampling & Aggregation
  - [x] T56.1.1: Sample local GPU and APU telemetry every 2 seconds via HardwareTelemetryProvider. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: sampleLocalNodeTelemetry] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [x] T56.1.2: Aggregate node metrics: GPU load %, VRAM used/total, temperature, active running tasks count. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Type: FleetNodeSnapshot] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [ ] T56.1.3: Expose local node metrics in GET /api/fleet/nodes alongside any registered remote worker nodes. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/fleet/nodes] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T56.1.4: Write unit tests verifying that local node metrics accurately reflect current hardware sensor values. [File: packages/engine/src/tests/fleet_telemetry.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_telemetry.test.ts]

### T56.2: REST API: GET /api/fleet/nodes Real-Time Status Endpoint
  - [x] T56.2.1: Query registered fleet nodes from memory cache with fallback to fleet_nodes database table. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/fleet/nodes] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T56.2.2: Include lastHeartbeat timestamp and compute status ('ONLINE' | 'DEGRADED' | 'OFFLINE') based on heartbeat freshness. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: computeNodeStatus] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [x] T56.2.3: Return formatted JSON response matching FleetNodeView frontend interface. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/fleet/nodes] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T56.2.4: Write integration tests verifying /api/fleet/nodes returns 200 with active local node telemetry. [File: packages/engine/src/tests/fleet_api.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_api.test.ts]

### T56.3: Hardware Tool Scanner Implementation via System Execution
  - [x] T56.3.1: Execute command which for system diagnostics tools: radeontop, lm-sensors, btop, mesa-utils, vulkan-tools. [File: packages/engine/src/hardware/SystemToolScanner.ts] [Method: scan] [Test: npm test -- packages/engine/src/tests/tool_scanner.test.ts]
  - [x] T56.3.2: Build diagnostic report classifying each tool as installed (path resolved) or missing. [File: packages/engine/src/hardware/SystemToolScanner.ts] [Type: SystemToolReport] [Test: npm test -- packages/engine/src/tests/tool_scanner.test.ts]
  - [x] T56.3.3: Generate unified package install command (e.g. sudo apt install -y ...) for all detected missing tools. [File: packages/engine/src/hardware/SystemToolScanner.ts] [Method: generateInstallCommand] [Test: npm test -- packages/engine/src/tests/tool_scanner.test.ts]
  - [x] T56.3.4: Write unit tests verifying that SystemToolScanner correctly categorizes present and missing system binaries. [File: packages/engine/src/tests/tool_scanner.test.ts] [Test: npm test -- packages/engine/src/tests/tool_scanner.test.ts]

### T56.4: Fleet Node Heartbeat Daemon & Dead Node Eviction
  - [x] T56.4.1: Run heartbeat background loop pinging registered worker nodes every 10 seconds. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: startHeartbeatLoop] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [x] T56.4.2: Mark nodes as OFFLINE when heartbeat fails for 3 consecutive intervals (30 seconds). [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: evaluateNodeLiveness] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [x] T56.4.3: Automatically reassign pending or running tasks from dead nodes back to local queue. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: evacuateDeadNodeTasks] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [x] T56.4.4: Write unit tests verifying node state transitions to OFFLINE and stranded tasks are requeued safely. [File: packages/engine/src/tests/fleet_eviction.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_eviction.test.ts]

### T56.5: Fleet Node Registration Endpoint with Security Token
  - [ ] T56.5.1: Implement POST /api/fleet/register validating incoming registration payload and authentication token. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/fleet/register] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T56.5.2: Verify registration token against FLEET_CLUSTER_SECRET stored in secret vault. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: validateRegistrationToken] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [x] T56.5.3: Register valid node in fleet manager and assign unique nodeId and network routing address. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Method: registerNode] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [x] T56.5.4: Write integration tests verifying successful node registration and rejection of invalid authentication tokens. [File: packages/engine/src/tests/fleet_registration.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_registration.test.ts]

### T56.6: Multi-Node Task Dispatch Router
  - [x] T56.6.1: Implement FleetTaskRouter evaluating target node suitability based on model availability and VRAM headroom. [File: packages/engine/src/fleet/FleetTaskRouter.ts] [Class: FleetTaskRouter] [Test: npm test -- packages/engine/src/tests/fleet_router.test.ts]
  - [x] T56.6.2: Forward task execution payload to remote node API POST /api/tasks/remote-dispatch when offloading. [File: packages/engine/src/fleet/FleetTaskRouter.ts] [Method: dispatchToRemoteNode] [Test: npm test -- packages/engine/src/tests/fleet_router.test.ts]
  - [x] T56.6.3: Stream remote node execution tokens and stages back to coordinator via SSE proxy. [File: packages/engine/src/fleet/FleetTaskRouter.ts] [Method: proxyRemoteStream] [Test: npm test -- packages/engine/src/tests/fleet_router.test.ts]
  - [x] T56.6.4: Write unit tests verifying tasks requiring high VRAM are routed to nodes with sufficient available GPU memory. [File: packages/engine/src/tests/fleet_router.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_router.test.ts]


---

## Phase 57: Rolling 100-Task Success Meter & Failure-to-Success Quality Telemetry
*RDF Category: telemetry*

### T57.1: Mathematical Rolling 100-Task Success Rate Window in Backend
  - [x] T57.1.1: Implement TaskRepository.getRollingSuccessStats(sampleSize: number = 100) querying the last N finished tasks with status in ('COMPLETED', 'FAILED'). [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.getRollingSuccessStats] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T57.1.2: Calculate success percentage as (completedCount / totalFinished) * 100 rounded to 1 decimal place, handling zero-division cleanly when totalFinished is 0. [File: packages/db/src/repositories/TaskRepository.ts] [Type: RollingSuccessStats] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T57.1.3: Track previous window success rate to compute rolling trend direction ('improving' | 'declining' | 'stable') across consecutive 50-task sub-windows. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.getRollingSuccessStats] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T57.1.4: Write unit tests verifying getRollingSuccessStats accurately computes rates for 0%, 50%, 100%, and arbitrary completion ratios across 100 tasks. [File: packages/db/src/tests/rolling_success.test.ts] [Test: npm test -- packages/db/src/tests/rolling_success.test.ts]

### T57.2: REST API: GET /api/metrics/success-rate Endpoint
  - [x] T57.2.1: Register route GET /api/metrics/success-rate in CacophonyHttpServer returning structured RollingSuccessStats JSON payload. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/metrics/success-rate] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T57.2.2: Support optional query parameter ?window=N (default 100, min 10, max 500) to allow customized historical sample depths. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: handleSuccessRateMetric] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T57.2.3: Return breakdown by model assigned: per-model success rate, run count, and failure count within the 100-task rolling window. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/metrics/success-rate] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T57.2.4: Write integration tests verifying /api/metrics/success-rate returns 200 with valid schema and correct calculations. [File: packages/engine/src/tests/success_rate_api.test.ts] [Test: npm test -- packages/engine/src/tests/success_rate_api.test.ts]

### T57.3: Real-Time SSE Success Rate Broadcast on Task Completion
  - [x] T57.3.1: Broadcast SSE event 'success_rate_updated' to all connected clients whenever a task transitions to COMPLETED or FAILED in AutonomousWorkerPipeline. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: finalizeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T57.3.2: Include updated rolling percentage, total completed count, total failed count, and current streak in the SSE payload. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: broadcastSuccessRate] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T57.3.3: Implement throttling in SSE broadcast governor to limit metric broadcasts to at most once per 500ms under high-throughput task completions. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: broadcastThrottled] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T57.3.4: Write integration tests verifying SSE clients receive success_rate_updated notifications immediately upon task status transition. [File: packages/engine/src/tests/sse_telemetry.test.ts] [Test: npm test -- packages/engine/src/tests/sse_telemetry.test.ts]

### T57.4: Frontend SuccessMeterComponent with Color-Coded Radial & Linear Gauges
  - [x] T57.4.1: Create standalone SuccessMeterComponent in packages/frontend/src/app/components/success-meter/ using Angular Signals and Zoneless change detection. [File: packages/frontend/src/app/components/success-meter/success-meter.component.ts] [Class: SuccessMeterComponent] [Test: npm test]
  - [x] T57.4.2: Render SVG circular radial gauge with smooth stroke-dashoffset transition visualizing rolling success percentage (0% to 100%). [File: packages/frontend/src/app/components/success-meter/success-meter.component.ts] [Template: radial-gauge] [Test: npm test]
  - [x] T57.4.3: Implement color-coded threshold status: Critical Red (<50%), Warning Amber (50-79%), Optimal Emerald (>=80%) based on current success rate. [File: packages/frontend/src/app/components/success-meter/success-meter.component.ts] [Computed: statusColorClass] [Test: npm test]
  - [x] T57.4.4: Display numeric percentage in fixed-width tabular font with pass/fail counts breakdown ('X passed / Y failed in last 100 tasks'). [File: packages/frontend/src/app/components/success-meter/success-meter.component.ts] [Template: metrics-summary] [Test: npm test]
  - [x] T57.4.5: Write frontend unit tests verifying reactive signal updates, SVG dashoffset calculations, and color threshold classes. [File: packages/frontend/src/app/components/success-meter/success-meter.component.spec.ts] [Test: npm test]

### T57.5: Telemetry Bar & Dashboard Header Success Meter Integration
  - [x] T57.5.1: Wire SuccessMeterComponent into DashboardViewComponent header adjacent to Active Task Inspector. [File: packages/frontend/src/app/components/views/dashboard-view.component.ts] [Component: DashboardViewComponent] [Test: npm test]
  - [ ] T57.5.2: Integrate compact success percentage pill into root TelemetryBar component visible on all routes. [File: packages/frontend/src/app/components/telemetry-bar/telemetry-bar.component.ts] [Component: TelemetryBarComponent] [Test: npm test]
  - [x] T57.5.3: Bind ArenaStateStore successRate signal to SSE 'success_rate_updated' events for seamless live updates without polling. [File: packages/frontend/src/app/services/arena-state.store.ts] [Method: handleSseEvent] [Test: npm test]
  - [x] T57.5.4: Apply responsive mobile-first CSS rules hiding radial graphics on small mobile screens (<480px) while maintaining compact text percentage. [File: packages/frontend/src/app/components/success-meter/success-meter.component.ts] [Styles: media-query] [Test: npm test]

---

## Phase 59: Live Test Execution Stream & Dedicated Testing Panel (Refactoring 'Processes' View to 'Testing')
*RDF Category: frontend*

### T59.1: Global Navigation & Route Refactor: Rename 'Processes' to 'Testing' (/testing Route)
  - [x] T59.1.1: Rename navigation bar label from 'Processes' to 'Testing' in app.html and update active route link to '/testing'. [File: packages/frontend/src/app/app.html] [Template: nav-links] [Test: npm test]
  - [x] T59.1.2: Define route '/testing' in app.routes.ts mapping to TestingViewComponent. [File: packages/frontend/src/app/app.routes.ts] [Route: /testing] [Test: npm test]
  - [x] T59.1.3: Add redirect route from '/processes' to '/testing' in app.routes.ts ensuring bookmark and legacy URL compatibility. [File: packages/frontend/src/app/app.routes.ts] [Route: /processes] [Test: npm test]
  - [x] T59.1.4: Update frontend route unit tests in app.routes.spec.ts validating presence of '/testing' route and redirect. [File: packages/frontend/src/app/app.routes.spec.ts] [Test: npm test]

### T59.2: Dedicated Testing View Layout & Active Test Execution Dashboard
  - [x] T59.2.1: Create standalone TestingViewComponent in packages/frontend/src/app/components/views/testing-view.component.ts with modern responsive grid layout. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Class: TestingViewComponent] [Test: npm test]
  - [x] T59.2.2: Implement Active Test Card displaying currently executing test command, target file paths, elapsed duration timer, and live status pill. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: active-test-card] [Test: npm test]
  - [x] T59.2.3: Render test execution summary counters: Total Tests Run, Passed Count, Failed Count, Current Pass Rate %, and Average Test Duration. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: summary-counters] [Test: npm test]
  - [x] T59.2.4: Write unit tests verifying TestingViewComponent renders summary metrics and responds to active test execution signal changes. [File: packages/frontend/src/app/components/views/testing-view.component.spec.ts] [Test: npm test]

### T59.3: Live Test Output Streamer (SSE Terminal Stream for Test Runner Stdout/Stderr)
  - [x] T59.3.1: Connect TestingViewComponent to SSE event 'test_output' streaming real-time stdout and stderr lines from the active test runner subprocess. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Method: connectTestStream] [Test: npm test]
  - [x] T59.3.2: Render high-density terminal log component with auto-scroll to bottom, ANSI color support, and line numbers. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: test-terminal] [Test: npm test]
  - [x] T59.3.3: Implement live pause/resume auto-scroll toggle and copy log buffer button with visual feedback. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Method: copyLog] [Test: npm test]
  - [x] T59.3.4: Write frontend unit tests verifying log buffer appends incoming test stream chunks and triggers auto-scroll. [File: packages/frontend/src/app/components/views/testing-view.component.spec.ts] [Test: npm test]

### T59.4: Historical Test Run Table with High-Density Filtering and Pass/Fail Verdicts
  - [ ] T59.4.1: Implement Historical Test Runs table in TestingViewComponent listing past test executions fetched from GET /api/tests/history. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: history-table] [Test: npm test]
  - [ ] T59.4.2: Render column data: Status badge (PASSED, FAILED, TIMEOUT), Task Title, Test Command, Execution Duration ms, Timestamp, and Actions. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: table-rows] [Test: npm test]
  - [x] T59.4.3: Add filter tabs (ALL, PASSED, FAILED) and search input filtering test runs by command or task ID. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Method: filterTests] [Test: npm test]
  - [x] T59.4.4: Write frontend unit tests validating filter tabs and text search accurately filter displayed historical test rows. [File: packages/frontend/src/app/components/views/testing-view.component.spec.ts] [Test: npm test]

### T59.5: Associated App Subprocess List in Testing View Bottom Drawer
  - [x] T59.5.1: Create Collapsible Subprocess Drawer component at bottom of TestingViewComponent displaying associated application background processes. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: subprocess-drawer] [Test: npm test]
  - [x] T59.5.2: Render process table displaying: Daemon Worker, Ollama Engine, PGlite Database, Gitea Git Server, and Mailpit with PID, CPU %, RSS MB, and Uptime. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Template: process-table] [Test: npm test]
  - [x] T59.5.3: Add operator action button to restart any stuck background process via POST /api/processes/:name/restart with confirmation dialog. [File: packages/frontend/src/app/components/views/testing-view.component.ts] [Method: restartProcess] [Test: npm test]
  - [x] T59.5.4: Write frontend unit tests verifying subprocess drawer expands/collapses and displays live process metrics from ArenaStateStore. [File: packages/frontend/src/app/components/views/testing-view.component.spec.ts] [Test: npm test]

### T59.6: Deep Test Run Inspection Modal with Collapsible Stderr Stack Traces
  - [x] T59.6.1: Create TestRunDetailModalComponent opening upon clicking any historical test run row. [File: packages/frontend/src/app/components/test-run-modal/test-run-modal.component.ts] [Class: TestRunDetailModalComponent] [Test: npm test]
  - [ ] T59.6.2: Render modal tabs: Full Output, Failing Assertions, Code Diffs, and Environment Variables. [File: packages/frontend/src/app/components/test-run-modal/test-run-modal.component.ts] [Template: modal-tabs] [Test: npm test]
  - [x] T59.6.3: Highlight failing test assertion line in red with syntax-highlighted code snippet showing expected vs actual values. [File: packages/frontend/src/app/components/test-run-modal/test-run-modal.component.ts] [Template: assertion-diff] [Test: npm test]
  - [x] T59.6.4: Write unit tests verifying modal open/close lifecycle, escape key listener, and assertion extraction parser. [File: packages/frontend/src/app/components/test-run-modal/test-run-modal.component.spec.ts] [Test: npm test]

---

## Phase 60: Real Multi-Armed Bandit Implementation (Thompson Sampling, UCB-1 & Epsilon-Greedy Wireup)
*RDF Category: orchestration*

### T60.1: Empirical Reward Calculation from Real Test Passes and Failure Counts
  - [x] T60.1.1: Implement calculateEmpiricalReward(testOutcome: boolean, durationMs: number, tokensPerSec: number) in BanditTaskScheduler returning scalar reward [0.0, 1.0]. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: calculateEmpiricalReward] [Test: npm test -- packages/engine/src/tests/bandit_scheduler.test.ts]
  - [x] T60.1.2: Grant baseline reward 1.0 on test pass; 0.0 on test failure; apply velocity modifier (+0.1 for tok/s > 30, -0.1 for tok/s < 15) clamped to [0.0, 1.0]. [File: packages/engine/src/bandit/BanditTaskScheduler.ts] [Method: calculateEmpiricalReward] [Test: npm test -- packages/engine/src/tests/bandit_scheduler.test.ts]
  - [x] T60.1.3: Hook reward calculation into AutonomousWorkerPipeline upon stage 'test_execution' completion, updating active model arm in BanditRepository. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: finalizeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T60.1.4: Write unit tests verifying that test passes yield reward >= 0.9 while test failures yield reward 0.0 across varying durations. [File: packages/engine/src/tests/bandit_reward_calc.test.ts] [Test: npm test -- packages/engine/src/tests/bandit_reward_calc.test.ts]

### T60.2: Thompson Sampling Policy Engine with Beta(Alpha, Beta) Distribution Sampling
  - [x] T60.2.1: Implement sampleBeta(alpha: number, beta: number) using Marsaglia and Tsang method or standard Gamma transform for accurate Beta distribution sampling. [File: packages/engine/src/bandit/ThompsonSamplingPolicy.ts] [Method: sampleBeta] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [x] T60.2.2: Evaluate all candidate model arms under Thompson Sampling: select arm with highest sample from Beta(alpha + 1, beta + 1). [File: packages/engine/src/bandit/ThompsonSamplingPolicy.ts] [Method: selectArm] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [x] T60.2.3: Update arm alpha on reward >= 0.5 (success) and beta on reward < 0.5 (failure) in database bandit_arms table. [File: packages/engine/src/bandit/BanditRepository.ts] [Method: recordArmOutcome] [Test: npm test -- packages/engine/src/tests/bandit_repository.test.ts]
  - [x] T60.2.4: Write unit tests demonstrating that an arm with 90% success rate is selected significantly more frequently than an arm with 20% success rate over 1000 trials. [File: packages/engine/src/tests/thompson_sampling_convergence.test.ts] [Test: npm test -- packages/engine/src/tests/thompson_sampling_convergence.test.ts]

### T60.3: Upper Confidence Bound (UCB-1) Policy Implementation with Tunable Exploration Factor
  - [x] T60.3.1: Implement Ucb1Policy in packages/engine/src/bandit/ calculating UCB score: averageReward + c * sqrt(2 * ln(totalTrials) / armTrials). [File: packages/engine/src/bandit/Ucb1Policy.ts] [Class: Ucb1Policy] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [x] T60.3.2: Ensure all arms are sampled at least once before applying UCB formula to guarantee baseline exploration of newly registered models. [File: packages/engine/src/bandit/Ucb1Policy.ts] [Method: selectArm] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [x] T60.3.3: Expose exploration factor parameter c (default sqrt(2) ~ 1.414) as configurable option via API and UI slider. [File: packages/engine/src/bandit/Ucb1Policy.ts] [Property: explorationFactor] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [x] T60.3.4: Write unit tests verifying that unvisited arms receive infinite priority and high-variance arms are adequately explored. [File: packages/engine/src/tests/ucb1_policy.test.ts] [Test: npm test -- packages/engine/src/tests/ucb1_policy.test.ts]

### T60.4: Epsilon-Greedy Policy Engine with Exponential Decay Schedule
  - [x] T60.4.1: Implement EpsilonGreedyPolicy selecting random exploration arm with probability epsilon, and highest empirical mean arm with probability 1 - epsilon. [File: packages/engine/src/bandit/EpsilonGreedyPolicy.ts] [Class: EpsilonGreedyPolicy] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [x] T60.4.2: Implement exponential epsilon decay: epsilon = max(minEpsilon, initialEpsilon * (decayRate ^ epoch)) allowing gradual shift from exploration to exploitation. [File: packages/engine/src/bandit/EpsilonGreedyPolicy.ts] [Method: stepEpoch] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [x] T60.4.3: Expose initialEpsilon (default 0.2), minEpsilon (default 0.05), and decayRate (default 0.995) as typed configuration options. [File: packages/shared-types/src/bandit.ts] [Type: EpsilonGreedyConfig] [Test: npm test]
  - [x] T60.4.4: Write unit tests verifying epsilon decreases over epochs and exploitation probability increases as expected. [File: packages/engine/src/tests/epsilon_greedy.test.ts] [Test: npm test -- packages/engine/src/tests/epsilon_greedy.test.ts]

### T60.5: REST API: GET/PUT /api/bandit/policy and GET /api/bandit/arms Real Telemetry Wireup
  - [x] T60.5.1: Implement GET /api/bandit/arms returning live arm statistics (alpha, beta, winRate, totalRuns, avgTks, status) queried directly from database. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/bandit/arms] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T60.5.2: Implement PUT /api/bandit/policy updating active bandit policy ('thompson' | 'ucb1' | 'epsilon_greedy') and parameters in real time without restart. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: PUT /api/bandit/policy] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T60.5.3: Remove all fallback mock arrays in bandit HTTP handlers; return 100% empirical database records. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: handleBanditApi] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T60.5.4: Write integration tests verifying PUT /api/bandit/policy alters runtime scheduler behavior and GET /api/bandit/arms reflects updated stats. [File: packages/engine/src/tests/bandit_api.test.ts] [Test: npm test -- packages/engine/src/tests/bandit_api.test.ts]

### T60.6: ExplorationControlComponent Live Bandit Data Binding and Control UI
  - [x] T60.6.1: Connect ExplorationControlComponent to GET /api/bandit/arms and GET /api/bandit/policy on component initialization. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Method: ngOnInit] [Test: npm test]
  - [x] T60.6.2: Wire policy selector buttons (Thompson Sampling, UCB-1, Epsilon-Greedy) to dispatch PUT /api/bandit/policy with optimistic UI update. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Method: switchPolicy] [Test: npm test]
  - [x] T60.6.3: Render live model arm cards showing real empirical win rates, pull counts, Alpha/Beta distributions, and current selection probability. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Template: arm-cards] [Test: npm test]
  - [x] T60.6.4: Write frontend unit tests verifying policy selection triggers API call and arm statistics display live data from ArenaStateStore. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm test]

---

## Phase 62: AST Context Slicing, Import Pruning & Focused Prompt Generation
*RDF Category: context*

### T62.1: Abstract Syntax Tree (AST) Context Slicer for TypeScript and Go Codebases
  - [x] T62.1.1: Create AstContextSlicer in packages/engine/src/context/AstContextSlicer.ts using TypeScript compiler API (ts.createSourceFile). [File: packages/engine/src/context/AstContextSlicer.ts] [Class: AstContextSlicer] [Test: npm test -- packages/engine/src/tests/ast_slicer.test.ts]
  - [x] T62.1.2: Traverse AST extracting exported type aliases, interfaces, function signatures, and class method signatures without function bodies. [File: packages/engine/src/context/AstContextSlicer.ts] [Method: extractInterfaceSkeleton] [Test: npm test -- packages/engine/src/tests/ast_slicer.test.ts]
  - [x] T62.1.3: Generate compact architectural skeleton file replacing method bodies with '/* implementation */' to reduce token footprint by up to 80%. [File: packages/engine/src/context/AstContextSlicer.ts] [Method: generateSkeleton] [Test: npm test -- packages/engine/src/tests/ast_slicer.test.ts]
  - [x] T62.1.4: Write unit tests verifying AST slicer preserves complete interface and function signatures while stripping inner logic. [File: packages/engine/src/tests/ast_slicer.test.ts] [Test: npm test -- packages/engine/src/tests/ast_slicer.test.ts]

### T62.2: Focused Import Skeleton Generator Pruning Unused External Modules
  - [x] T62.2.1: Create ImportPruningEngine in packages/engine/src/context/ImportPruningEngine.ts analyzing module dependency trees. [File: packages/engine/src/context/ImportPruningEngine.ts] [Class: ImportPruningEngine] [Test: npm test -- packages/engine/src/tests/import_pruner.test.ts]
  - [x] T62.2.2: Identify and strip unused external imports from prompt context that do not intersect with target focus files. [File: packages/engine/src/context/ImportPruningEngine.ts] [Method: pruneUnusedImports] [Test: npm test -- packages/engine/src/tests/import_pruner.test.ts]
  - [x] T62.2.3: Consolidate duplicate import declarations into single clean import statements. [File: packages/engine/src/context/ImportPruningEngine.ts] [Method: consolidateImports] [Test: npm test -- packages/engine/src/tests/import_pruner.test.ts]
  - [x] T62.2.4: Write unit tests verifying that external library declarations (e.g. lodash, rxjs) not needed by the task are omitted from prompt context. [File: packages/engine/src/tests/import_pruner.test.ts] [Test: npm test -- packages/engine/src/tests/import_pruner.test.ts]

### T62.3: Context Budget Allocator Enforcing Strict 4k and 8k Token Boundaries
  - [x] T62.3.1: Implement ContextBudgetAllocator in packages/engine/src/context/ContextBudgetAllocator.ts calculating token distribution per task. [File: packages/engine/src/context/ContextBudgetAllocator.ts] [Class: ContextBudgetAllocator] [Test: npm test -- packages/engine/src/tests/context_budget.test.ts]
  - [x] T62.3.2: Allocate budget partitions: 30% for system directives and rules, 35% for codebase context skeletons, 35% reserved for generation completion. [File: packages/engine/src/context/ContextBudgetAllocator.ts] [Method: calculatePartitions] [Test: npm test -- packages/engine/src/tests/context_budget.test.ts]
  - [x] T62.3.3: Dynamically truncate lower-priority background files when total estimated tokens exceed context ceiling (4096 or 8192). [File: packages/engine/src/context/ContextBudgetAllocator.ts] [Method: enforceBudget] [Test: npm test -- packages/engine/src/tests/context_budget.test.ts]
  - [x] T62.3.4: Write unit tests verifying budget allocator maintains prompt token count strictly within specified limit. [File: packages/engine/src/tests/context_budget.test.ts] [Test: npm test -- packages/engine/src/tests/context_budget.test.ts]

### T62.4: Markdown Fence Stripper and Self-Healing Code Extractor
  - [x] T62.4.1: Implement stripMarkdownFences(rawText: string) in SelfHealingParser stripping leading/trailing markdown code fences (```typescript, ```). [File: packages/engine/src/inference/SelfHealingParser.ts] [Method: stripMarkdownFences] [Test: npm test -- packages/engine/src/tests/self_healing_parser.test.ts]
  - [x] T62.4.2: Detect and strip conversational filler preceding code ('Here is the code:', 'Certainly! Here is...') to produce pure raw source code. [File: packages/engine/src/inference/SelfHealingParser.ts] [Method: stripConversationalPreamble] [Test: npm test -- packages/engine/src/tests/self_healing_parser.test.ts]
  - [x] T62.4.3: Repair truncated code blocks: close unclosed brackets, parentheses, and string literals when model stream cuts off at max tokens. [File: packages/engine/src/inference/SelfHealingParser.ts] [Method: repairTruncatedSyntax] [Test: npm test -- packages/engine/src/tests/self_healing_parser.test.ts]
  - [x] T62.4.4: Write unit tests verifying parser extracts clean, compilable TypeScript code from markdown-wrapped and conversational model outputs. [File: packages/engine/src/tests/self_healing_parser.test.ts] [Test: npm test -- packages/engine/src/tests/self_healing_parser.test.ts]

### T62.5: Focused File Diff Builder Generating Minimal Targeted Replacement Patches
  - [x] T62.5.1: Create FocusedDiffBuilder in packages/engine/src/context/FocusedDiffBuilder.ts generating surgical line-level replacement chunks. [File: packages/engine/src/context/FocusedDiffBuilder.ts] [Class: FocusedDiffBuilder] [Test: npm test -- packages/engine/src/tests/diff_builder.test.ts]
  - [x] T62.5.2: Compare generated code against original file to identify only modified functions and interfaces rather than overwriting entire files. [File: packages/engine/src/context/FocusedDiffBuilder.ts] [Method: computeTargetedChunks] [Test: npm test -- packages/engine/src/tests/diff_builder.test.ts]
  - [x] T62.5.3: Format unified diff format string for display in TaskDetailModal and Pull Request description. [File: packages/engine/src/context/FocusedDiffBuilder.ts] [Method: formatUnifiedDiff] [Test: npm test -- packages/engine/src/tests/diff_builder.test.ts]
  - [x] T62.5.4: Write unit tests verifying diff builder identifies exact changed lines and generates valid unified diff syntax. [File: packages/engine/src/tests/diff_builder.test.ts] [Test: npm test -- packages/engine/src/tests/diff_builder.test.ts]

### T62.6: Prompt Token Estimation and Pre-Flight Context Overflow Detector
  - [x] T62.6.1: Implement estimateTokenCount(text: string) in packages/engine/src/inference/TokenEstimator.ts using byte-pair encoding (BPE) approximation. [File: packages/engine/src/inference/TokenEstimator.ts] [Class: TokenEstimator] [Test: npm test -- packages/engine/src/tests/token_estimator.test.ts]
  - [x] T62.6.2: Execute pre-flight check in AutonomousWorkerPipeline before sending inference request to Ollama: reject or compact if tokens exceed 90% of model window. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: validatePromptBudget] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T62.6.3: Log token estimation metrics (promptTokensEstimate, availableCompletionBudget) in task_stages record. [File: packages/db/src/repositories/StageRepository.ts] [Method: recordStageCompletion] [Test: npm test -- packages/db/src/tests/StageRepository.test.ts]
  - [ ] T62.6.4: Write unit tests verifying token estimator accurately predicts token usage within 5% error margin of standard tokenizer. [File: packages/engine/src/tests/token_estimator.test.ts] [Test: npm test -- packages/engine/src/tests/token_estimator.test.ts]

---

## Phase 63: Automated Remediation Loop & Compiler Diagnostic Feedback Propagation
*RDF Category: orchestration*

### T63.1: Automated Remediation Stage in AutonomousWorkerPipeline
  - [x] T63.1.1: Add 'remediation' stage to AutonomousWorkerPipeline pipeline execution sequence between 'test_execution' and 'review'. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Property: stages] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T63.1.2: Trigger remediation stage automatically whenever test_execution fails with non-zero exit code or assertion failure. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: handleTestFailure] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T63.1.3: Update task status to 'REMEDIATING' and broadcast SSE stage transition event to connected frontend clients. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: broadcastStageTransition] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T63.1.4: Write integration tests verifying that failing test automatically advances task into REMEDIATING status. [File: packages/engine/src/tests/remediation_pipeline.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_pipeline.test.ts]

### T63.2: Compiler Diagnostic Parser Extracting TypeScript (tsc) Diagnostic Objects
  - [x] T63.2.1: Create CompilerDiagnosticParser in packages/engine/src/testing/CompilerDiagnosticParser.ts parsing raw compiler output into typed diagnostics. [File: packages/engine/src/testing/CompilerDiagnosticParser.ts] [Class: CompilerDiagnosticParser] [Test: npm test -- packages/engine/src/tests/compiler_diagnostics.test.ts]
  - [ ] T63.2.2: Extract filePath, lineNumber, columnNumber, errorCode (e.g. TS2304, TS2345), and error message from tsc output regex: /^(.*)\((\d+),(\d+)\): error (TS\d+): (.*)$/m. [File: packages/engine/src/testing/CompilerDiagnosticParser.ts] [Method: parseTscOutput] [Test: npm test -- packages/engine/src/tests/compiler_diagnostics.test.ts]
  - [ ] T63.2.3: Filter and prioritize top 3 root-cause syntax/type diagnostics to avoid overwhelming the remediation prompt. [File: packages/engine/src/testing/CompilerDiagnosticParser.ts] [Method: prioritizeDiagnostics] [Test: npm test -- packages/engine/src/tests/compiler_diagnostics.test.ts]
  - [ ] T63.2.4: Write unit tests verifying parser extracts accurate file locations and error codes from compiler error logs. [File: packages/engine/src/tests/compiler_diagnostics.test.ts] [Test: npm test -- packages/engine/src/tests/compiler_diagnostics.test.ts]

### T63.3: Remediation Prompt Formatter Injecting Exact Failing Line and Compiler Diagnostics
  - [ ] T63.3.1: Create RemediationPromptFormatter in packages/engine/src/inference/RemediationPromptFormatter.ts generating focused remediation prompt. [File: packages/engine/src/inference/RemediationPromptFormatter.ts] [Class: RemediationPromptFormatter] [Test: npm test -- packages/engine/src/tests/remediation_prompt.test.ts]
  - [ ] T63.3.2: Format remediation prompt with structured sections: '1. Original Task Goal', '2. Current Code with Bug', '3. Compiler Error Diagnostics', '4. Failing Test Assertion', '5. Required Surgical Fix'. [File: packages/engine/src/inference/RemediationPromptFormatter.ts] [Method: formatPrompt] [Test: npm test -- packages/engine/src/tests/remediation_prompt.test.ts]
  - [ ] T63.3.3: Add explicit instruction demanding only the fixed code replacement without conversational filler or duplicate explanations. [File: packages/engine/src/inference/RemediationPromptFormatter.ts] [Method: formatDirectives] [Test: npm test -- packages/engine/src/tests/remediation_prompt.test.ts]
  - [x] T63.3.4: Write unit tests verifying remediation prompt contains all compiler diagnostics and exact failing code lines. [File: packages/engine/src/tests/remediation_prompt.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_prompt.test.ts]

### T63.4: Remediation Attempt Counter and Circuit Breaker (Max 2 Attempts)
  - [x] T63.4.1: Track remediationAttempts counter in task execution context; enforce maxRemediationAttempts ceiling of 2. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeRemediation] [Test: npm test -- packages/engine/src/tests/remediation_circuit_breaker.test.ts]
  - [x] T63.4.2: When remediation count reaches 2 without passing tests, trigger circuit breaker: stop remediation and fail task with REMEDIATION_EXHAUSTED. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: checkRemediationBreaker] [Test: npm test -- packages/engine/src/tests/remediation_circuit_breaker.test.ts]
  - [x] T63.4.3: Prevent infinite token expenditure on fundamentally unviable prompts or corrupted task specifications. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: handleRemediationExhaustion] [Test: npm test -- packages/engine/src/tests/remediation_circuit_breaker.test.ts]
  - [ ] T63.4.4: Write unit tests simulating repeated test failure verifying pipeline halts remediation after 2 attempts and flags task failed. [File: packages/engine/src/tests/remediation_circuit_breaker.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_circuit_breaker.test.ts]

### T63.5: Remediation Success Telemetry Tracking per Model and Error Category
  - [ ] T63.5.1: Record remediation outcome in ModelHealthRepository: track totalRemediationAttempts and totalRemediationSuccess per model ID. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: recordRemediation] [Test: npm test -- packages/db/src/tests/ModelHealthRepository.test.ts]
  - [ ] T63.5.2: Compute remediationRecoveryRate as (totalRemediationSuccess / totalRemediationAttempts) * 100 in model health profiles. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: listProfiles] [Test: npm test -- packages/db/src/tests/ModelHealthRepository.test.ts]
  - [ ] T63.5.3: Expose remediation recovery metrics in GET /api/models/leaderboard response. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/models/leaderboard] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T63.5.4: Write unit tests verifying successful remediation increments model recovery counters in database. [File: packages/engine/src/tests/remediation_telemetry.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_telemetry.test.ts]

### T63.6: Fast Remediation Pre-Flight Check via Compiler Diagnostic Re-Verification
  - [ ] T63.6.1: Run instant in-memory TypeScript diagnostic check on remediated code before executing full test suite to fail fast on syntax errors. [File: packages/engine/src/testing/DiagnosticPreFlightChecker.ts] [Class: DiagnosticPreFlightChecker] [Test: npm test -- packages/engine/src/tests/preflight_checker.test.ts]
  - [x] T63.6.2: Abort and re-prompt immediately if remediated code introduces new syntax errors, saving test runner subprocess execution time. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executePreFlight] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T63.6.3: Pass valid remediated code forward to 'test_execution' stage for complete verification. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: advanceToTestExecution] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
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
  - [x] T65.5.2: Create ConfirmationDialogComponent prompting operator before restarting critical infrastructure services (Ollama, PGlite). [File: packages/frontend/src/app/components/confirmation-dialog/confirmation-dialog.component.ts] [Class: ConfirmationDialogComponent] [Test: npm test]
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

## Phase 80: Multi-Stage Staging (Gitea) to Production (GitHub) Release Gate & Batched Promotion Pipeline
*Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-80-multi-stage-staging-gitea-to-production-github-release-gate--batched-promotion-pipeline)*

---

## Phase 81: Autonomous Project File Ingestion, Architectural Decomposer & Acceptance Criteria Engine
*RDF Category: architectural_synthesis*

### T81.1: Spec & Project Document Ingestion Engine
  - [x] T81.1.1: Create `ProjectSpecIngestionService` in `packages/engine/src/inference/ProjectSpecIngestionService.ts` reading dropped specification files (`docs/spec.md`, `README.md`, OpenAPI JSON). [File: packages/engine/src/inference/ProjectSpecIngestionService.ts] [Class: ProjectSpecIngestionService] [Test: npm test -- packages/engine/src/tests/spec_ingestion.test.ts]
  - [x] T81.1.2: Parse markdown headings, bulleted requirement lists, and API endpoint definitions into structured `RequirementNode` objects. [File: packages/engine/src/inference/ProjectSpecIngestionService.ts] [Method: parseRequirements] [Test: npm test -- packages/engine/src/tests/spec_ingestion.test.ts]
  - [x] T81.1.3: Extract explicit technical constraints (languages, frameworks, database drivers, coding rules) from ingested documents. [File: packages/engine/src/inference/ProjectSpecIngestionService.ts] [Method: extractConstraints] [Test: npm test -- packages/engine/src/tests/spec_ingestion.test.ts]
  - [x] T81.1.4: Write unit tests verifying parser extracts functional and non-functional requirements from diverse document formats. [File: packages/engine/src/tests/spec_ingestion.test.ts] [Test: npm test -- packages/engine/src/tests/spec_ingestion.test.ts]

### T81.2: Structured Acceptance Criteria Derivation Engine
  - [x] T81.2.1: Implement `AcceptanceCriteriaEngine` in `packages/engine/src/inference/AcceptanceCriteriaEngine.ts` utilizing high-reasoning models to formulate testable criteria. [File: packages/engine/src/inference/AcceptanceCriteriaEngine.ts] [Class: AcceptanceCriteriaEngine] [Test: npm test -- packages/engine/src/tests/acceptance_criteria.test.ts]
  - [x] T81.2.2: Convert ambiguous user directives into explicit Given/When/Then scenarios with expected HTTP status codes, error models, and return shapes. [File: packages/engine/src/inference/AcceptanceCriteriaEngine.ts] [Method: deriveCriteria] [Test: npm test -- packages/engine/src/tests/acceptance_criteria.test.ts]
  - [x] T81.2.3: Generate concrete test assertion templates (native `node:test` and `node:assert/strict` for backend, Angular component spec for frontend). [File: packages/engine/src/inference/AcceptanceCriteriaEngine.ts] [Method: generateTestTemplate] [Test: npm test -- packages/engine/src/tests/acceptance_criteria.test.ts]
  - [x] T81.2.4: Write unit tests verifying that acceptance criteria strictly adhere to SOLID principles and mobile-first rules. [File: packages/engine/src/tests/acceptance_criteria.test.ts] [Test: npm test -- packages/engine/src/tests/acceptance_criteria.test.ts]

### T81.3: Architectural Contract & Type Schema Generator
  - [x] T81.3.1: Create `ContractSynthesizer` in `packages/engine/src/inference/ContractSynthesizer.ts` defining TypeScript interfaces and Zod validation schemas. [File: packages/engine/src/inference/ContractSynthesizer.ts] [Class: ContractSynthesizer] [Test: npm test -- packages/engine/src/tests/contract_synthesizer.test.ts]
  - [x] T81.3.2: Synthesize database migration definitions with primary keys, indexes, foreign keys, and dialect-agnostic column types. [File: packages/engine/src/inference/ContractSynthesizer.ts] [Method: synthesizeMigration] [Test: npm test -- packages/engine/src/tests/contract_synthesizer.test.ts]
  - [x] T81.3.3: Verify synthesized schemas against existing project types to prevent namespace collisions and circular references. [File: packages/engine/src/inference/ContractSynthesizer.ts] [Method: validateAgainstWorkspace] [Test: npm test -- packages/engine/src/tests/contract_synthesizer.test.ts]
  - [x] T81.3.4: Write unit tests verifying generated contracts compile cleanly with `tsc`. [File: packages/engine/src/tests/contract_synthesizer.test.ts] [Test: npm test -- packages/engine/src/tests/contract_synthesizer.test.ts]

### T81.4: Topological Dependency Graph Task Sequencer
  - [x] T81.4.1: Build `DependencyGraphSequencer` in `packages/engine/src/inference/DependencyGraphSequencer.ts` arranging decomposed tasks in dependency order. [File: packages/engine/src/inference/DependencyGraphSequencer.ts] [Class: DependencyGraphSequencer] [Test: npm test -- packages/engine/src/tests/dependency_sequencer.test.ts]
  - [x] T81.4.2: Enforce architectural sequencing: Shared Types & Migrations -> Repositories -> Services -> HTTP Routes -> UI Components -> E2E Tests. [File: packages/engine/src/inference/DependencyGraphSequencer.ts] [Method: sequenceTasks] [Test: npm test -- packages/engine/src/tests/dependency_sequencer.test.ts]
  - [x] T81.4.3: Detect and break circular task dependencies by splitting interfaces from concrete implementations. [File: packages/engine/src/inference/DependencyGraphSequencer.ts] [Method: resolveCircularDependencies] [Test: npm test -- packages/engine/src/tests/dependency_sequencer.test.ts]
  - [x] T81.4.4: Write unit tests validating topological sort ordering for complex multi-module feature epics. [File: packages/engine/src/tests/dependency_sequencer.test.ts] [Test: npm test -- packages/engine/src/tests/dependency_sequencer.test.ts]

### T81.5: REST API & Drop-In Ingestion CLI
  - [x] T81.5.1: Expose `POST /api/tasks/decompose-spec` in `CacophonyHttpServer.ts` ingesting uploaded spec files and persisting atomic tasks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks/decompose-spec] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T81.5.2: Create CLI entrypoint `bin/decompose-spec.ts` allowing operators to run `node bin/decompose-spec.ts path/to/spec.md`. [File: bin/decompose-spec.ts] [Test: node bin/decompose-spec.ts --dry-run]
  - [x] T81.5.3: Add file-watcher daemon monitoring `docs/inbox/` for dropped project specifications and auto-decomposing them into the active queue. [File: packages/engine/src/daemon/SpecInboxWatcher.ts] [Class: SpecInboxWatcher] [Test: npm test -- packages/engine/src/tests/inbox_watcher.test.ts]
  - [x] T81.5.4: Write integration tests verifying spec decomposition pipeline creates valid `TaskRecord` rows in database. [File: packages/engine/src/tests/spec_decomposition_pipeline.test.ts] [Test: npm test -- packages/engine/src/tests/spec_decomposition_pipeline.test.ts]

---

## Phase 82: Arena Telemetry Epoching & Clean-Slate Model Health Reset Engine
*Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-82-arena-telemetry-epoching--clean-slate-model-health-reset-engine)*

---

## Phase 83: Heterogeneous Hardware Detection, Zero-Config Hardware Profiler & Contributor Onboarding Engine
*RDF Category: hardware_telemetry*

### T83.1: Pluggable `IHardwareTelemetryProvider` Abstraction
  - [x] T83.1.1: Define `IHardwareTelemetryProvider` interface in `packages/shared-types/src/hardware.ts` declaring vendor detection, VRAM measurement, thermal polling, and utilization metrics. [File: packages/shared-types/src/hardware.ts] [Interface: IHardwareTelemetryProvider] [Test: npm test -- packages/shared-types]
  - [x] T83.1.2: Implement `HardwareProviderFactory` in `packages/engine/src/telemetry/HardwareProviderFactory.ts` dynamically detecting host GPU vendor (NVIDIA, AMD, Apple Silicon, Intel, CPU fallback). [File: packages/engine/src/telemetry/HardwareProviderFactory.ts] [Class: HardwareProviderFactory] [Test: npm test -- packages/engine/src/tests/hardware_factory.test.ts]
  - [x] T83.1.3: Provide CPU fallback provider computing memory and CPU core utilization via Node.js `os` module when no accelerator is present. [File: packages/engine/src/telemetry/CpuFallbackProvider.ts] [Class: CpuFallbackProvider] [Test: npm test -- packages/engine/src/tests/hardware_factory.test.ts]
  - [x] T83.1.4: Write unit tests verifying provider factory selects correct provider based on simulated sysfs and CLI outputs. [File: packages/engine/src/tests/hardware_factory.test.ts] [Test: npm test -- packages/engine/src/tests/hardware_factory.test.ts]

### T83.2: NVML / NVIDIA CUDA Hardware Telemetry Provider
  - [x] T83.2.1: Implement `NvidiaNvmlProvider` in `packages/engine/src/telemetry/NvidiaNvmlProvider.ts` querying `nvidia-smi --query-gpu=... --format=csv`. [File: packages/engine/src/telemetry/NvidiaNvmlProvider.ts] [Class: NvidiaNvmlProvider] [Test: npm test -- packages/engine/src/tests/nvidia_provider.test.ts]
  - [x] T83.2.2: Parse VRAM total/used/free, GPU temperature, power draw in Watts, and SM compute engine utilization. [File: packages/engine/src/telemetry/NvidiaNvmlProvider.ts] [Method: pollSnapshot] [Test: npm test -- packages/engine/src/tests/nvidia_provider.test.ts]
  - [x] T83.2.3: Support multi-GPU setups reporting aggregated and per-GPU metrics. [File: packages/engine/src/telemetry/NvidiaNvmlProvider.ts] [Method: listDevices] [Test: npm test -- packages/engine/src/tests/nvidia_provider.test.ts]
  - [x] T83.2.4: Write unit tests validating CSV parsing and error handling when `nvidia-smi` is unavailable. [File: packages/engine/src/tests/nvidia_provider.test.ts] [Test: npm test -- packages/engine/src/tests/nvidia_provider.test.ts]

### T83.3: Apple Silicon Metal / `powermetrics` Telemetry Provider
  - [x] T83.3.1: Implement `AppleSiliconProvider` in `packages/engine/src/telemetry/AppleSiliconProvider.ts` detecting M-series chips and unified RAM. [File: packages/engine/src/telemetry/AppleSiliconProvider.ts] [Class: AppleSiliconProvider] [Test: npm test -- packages/engine/src/tests/apple_silicon_provider.test.ts]
  - [x] T83.3.2: Measure unified memory allocations, thermal pressure states (`Nominal`, `Fair`, `Serious`, `Critical`), and GPU power. [File: packages/engine/src/telemetry/AppleSiliconProvider.ts] [Method: pollSnapshot] [Test: npm test -- packages/engine/src/tests/apple_silicon_provider.test.ts]
  - [x] T83.3.3: Map macOS thermal pressure directly to `ThermalGovernor` backpressure thresholds to prevent thermal throttling. [File: packages/engine/src/telemetry/AppleSiliconProvider.ts] [Method: getThermalState] [Test: npm test -- packages/engine/src/tests/apple_silicon_provider.test.ts]
  - [x] T83.3.4: Write unit tests verifying Apple Silicon telemetry parsing and thermal state mapping. [File: packages/engine/src/tests/apple_silicon_provider.test.ts] [Test: npm test -- packages/engine/src/tests/apple_silicon_provider.test.ts]

### T83.4: Dynamic Zero-Config Context & Quantization Auto-Sizer
  - [x] T83.4.1: Build `HardwareHyperparameterAutoSizer` in `packages/engine/src/scheduler/HardwareHyperparameterAutoSizer.ts` computing optimal model profiles from hardware profile. [File: packages/engine/src/scheduler/HardwareHyperparameterAutoSizer.ts] [Class: HardwareHyperparameterAutoSizer] [Test: npm test -- packages/engine/src/tests/auto_sizer.test.ts]
  - [x] T83.4.2: Enforce VRAM safety thresholds: allocate 70% of available VRAM to context buffers, reserving 30% for OS and framebuffers. [File: packages/engine/src/scheduler/HardwareHyperparameterAutoSizer.ts] [Method: computeSafeAllocation] [Test: npm test -- packages/engine/src/tests/auto_sizer.test.ts]
  - [x] T83.4.3: Automatically configure Ollama environment variables (`OLLAMA_NUM_PARALLEL`, `OLLAMA_FLASH_ATTENTION`) based on detected card compute capability. [File: packages/engine/src/scheduler/HardwareHyperparameterAutoSizer.ts] [Method: generateOllamaEnv] [Test: npm test -- packages/engine/src/tests/auto_sizer.test.ts]
  - [x] T83.4.4: Write unit tests validating hyperparameter sizing across 6GB, 8GB, 12GB, 16GB, 24GB, and 64GB hardware configurations. [File: packages/engine/src/tests/auto_sizer.test.ts] [Test: npm test -- packages/engine/src/tests/auto_sizer.test.ts]

### T83.5: Contributor Hardware Setup Script & Docker Profiles
  - [x] T83.5.1: Create interactive/automated onboarding script `bin/setup-hardware.sh` detecting host hardware and printing detected configuration. [File: bin/setup-hardware.sh] [Test: bash bin/setup-hardware.sh --dry-run]
  - [x] T83.5.2: Update `docker-compose.yml` with compose profiles: `default` (standard), `nvidia` (with GPU device reservation), `amd` (with `/dev/kfd` and `/dev/dri`), and `cpu` (lightweight). [File: docker-compose.yml] [Profiles: nvidia, amd, cpu] [Test: docker compose config]
  - [x] T83.5.3: Document contributor onboarding instructions in `docs/contributing_hardware.md` explaining how external contributors can run the arena. [File: docs/contributing_hardware.md] [Test: markdown-lint]
  - [x] T83.5.4: Validate that `docker compose --profile nvidia up` properly exposes NVIDIA GPU to container. [File: docker-compose.yml] [Test: docker compose config]

---

## Phase 84: Auto-Mode Hardening & Bi-Directional GitHub Issue Sync
*RDF Category: autonomy*

### T84.1: Auto-Mode Loop Supervisor
  - [x] T84.1.1: Create `AutoLoopSupervisor` in `packages/engine/src/daemon/AutoLoopSupervisor.ts` keeping the autonomous loop running 24/7. [File: packages/engine/src/daemon/AutoLoopSupervisor.ts] [Class: AutoLoopSupervisor] [Test: npm test -- packages/engine/src/tests/auto_supervisor.test.ts]
  - [x] T84.1.2: Implement unhandled error containment: if an unhandled promise rejection occurs during task execution, isolate the error, rollback worktree, and resume queue. [File: packages/engine/src/daemon/AutoLoopSupervisor.ts] [Method: handleWorkerError] [Test: npm test -- packages/engine/src/tests/auto_supervisor.test.ts]
  - [x] T84.1.3: Automatically detect empty queue conditions and trigger internal vacancy tasks (test coverage expansion, dead code elimination, AST grooming). [File: packages/engine/src/daemon/AutoLoopSupervisor.ts] [Method: fillVacancy] [Test: npm test -- packages/engine/src/tests/auto_supervisor.test.ts]
  - [x] T84.1.4: Write unit tests verifying supervisor survives simulated worker crashes and resumes task processing. [File: packages/engine/src/tests/auto_supervisor.test.ts] [Test: npm test -- packages/engine/src/tests/auto_supervisor.test.ts]

### T84.2: Worktree Pre-Commit Monorepo Build Gate in Pipeline
  - [x] T84.2.1: Add `verifyCleanBuild(worktreePath: string)` call in `AutonomousWorkerPipeline.ts` Stage 6 before `commitWorktree`. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executePrReviewStage] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T84.2.2: Ensure tasks failing pre-commit build verification return `success: false` and do NOT merge into Gitea `main`. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T84.2.3: Forward compiler error outputs from failed build verification to active remediation stage. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeRemediationStage] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T84.2.4: Write unit tests verifying that non-compiling worktree changes are blocked from committing to staging `main`. [File: packages/engine/src/tests/worktree_build_gate.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_build_gate.test.ts]

### T84.3: Bi-Directional GitHub Issue Poller & Task Ingestion Daemon
  - [x] T84.3.1: Implement `GitHubIssueSyncDaemon` in `packages/engine/src/gitea/GitHubIssueSyncDaemon.ts` polling public GitHub issues every 5 minutes. [File: packages/engine/src/gitea/GitHubIssueSyncDaemon.ts] [Class: GitHubIssueSyncDaemon] [Test: npm test -- packages/engine/src/tests/github_issue_sync.test.ts]
  - [x] T84.3.2: Filter issues with label `arena:auto`, extracting title, body, and linked focus files into atomic `TaskRecord` rows. [File: packages/engine/src/gitea/GitHubIssueSyncDaemon.ts] [Method: ingestIssues] [Test: npm test -- packages/engine/src/tests/github_issue_sync.test.ts]
  - [x] T84.3.3: Add duplicate detection avoiding re-ingesting issues that already have active or completed tasks in database. [File: packages/engine/src/gitea/GitHubIssueSyncDaemon.ts] [Method: isDuplicate] [Test: npm test -- packages/engine/src/tests/github_issue_sync.test.ts]
  - [x] T84.3.4: Write unit tests verifying GitHub issue ingestion parses labels, bodies, and priorities accurately into database tasks. [File: packages/engine/src/tests/github_issue_sync.test.ts] [Test: npm test -- packages/engine/src/tests/github_issue_sync.test.ts]

### T84.4: Autonomous Issue Resolution & Verification PR Linker
  - [x] T84.4.1: Link resolved GitHub issue number in commit message (`Fixes #123`) when promoting milestone releases to GitHub. [File: packages/engine/src/gitea/GitHubPromotionPipeline.ts] [Method: linkResolvedIssues] [Test: npm test -- packages/engine/src/tests/github_promotion.test.ts]
  - [x] T84.4.2: Post automated verification comment on GitHub issue once staging verification passes in Gitea, providing transparency before public release. [File: packages/engine/src/gitea/GitHubIssueSyncDaemon.ts] [Method: postVerificationStatus] [Test: npm test -- packages/engine/src/tests/github_issue_sync.test.ts]
  - [x] T84.4.3: Close GitHub issue automatically when the promoted release PR is merged into upstream `main`. [File: packages/engine/src/gitea/GitHubPromotionPipeline.ts] [Method: closeResolvedIssues] [Test: npm test -- packages/engine/src/tests/github_promotion.test.ts]
  - [x] T84.4.4: Write unit tests simulating full issue ingestion -> local execution -> staging merge -> GitHub PR resolution lifecycle. [File: packages/engine/src/tests/issue_resolution_lifecycle.test.ts] [Test: npm test -- packages/engine/src/tests/issue_resolution_lifecycle.test.ts]

### T84.5: Defocus Plan/Build Modes in Favor of Auto Mode
  - [x] T84.5.1: Set `DEFAULT_EXECUTION_MODE=auto` across all default configs, daemon initialization, and frontend stores. [File: packages/shared-types/src/config.ts] [Constant: DEFAULT_EXECUTION_MODE] [Test: npm test -- packages/shared-types]
  - [x] T84.5.2: Streamline UI navigation to highlight Auto Mode telemetry, success yield, and milestone promotion over manual step controls. [File: packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.ts] [Test: npm test]
  - [x] T84.5.3: Ensure headless server and Docker containers default strictly to Auto Mode on boot. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: start] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [x] T84.5.4: Write integration tests verifying that arena boots and executes uninterrupted in Auto Mode with zero manual prompts. [File: packages/engine/src/tests/auto_mode.test.ts] [Test: npm test -- packages/engine/src/tests/auto_mode.test.ts]

---

## Phase 85: Multi-Window Convergence Analytics, Git Regression Pinpointing & Plateau Intervention Dispatcher
*RDF Category: analytics_and_orchestration*

### T85.1: Dynamic Rolling Window Success Rate & Multi-Dimensional Aggregation Engine
  - [x] T85.1.1: Define typed window configuration and metrics interfaces (`IRollingWindowConfig`, `IRollingWindowMetrics`, `IWindowQualificationFilter`) in `packages/shared-types/src/analytics.ts` supporting arbitrary window sizes (10, 20, 50, 100, 1000, or total qualified task cap) with lower-bound aggregate handling (minimum N >= 2 or 3 tasks to compute meaningful non-binary aggregate ratios). [File: packages/shared-types/src/analytics.ts] [Interface: IRollingWindowMetrics] [Test: npm test -- packages/shared-types]
  - [x] T85.1.2: Implement `RollingWindowAnalyticsService` in `packages/engine/src/analytics/RollingWindowAnalyticsService.ts` evaluating contiguous time-series and filtered multi-dimensional execution windows (qualified by agent role, model identifier, task category, and git commit hash). [File: packages/engine/src/analytics/RollingWindowAnalyticsService.ts] [Class: RollingWindowAnalyticsService] [Test: npm test -- packages/engine/src/tests/rolling_window_analytics.test.ts]
  - [x] T85.1.3: Expose REST API endpoint `GET /api/analytics/window-success` supporting query parameters for `windowSize`, `role`, `model`, and `commitHash`, returning success percentage, failure count, window bounds, and convergence metrics. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/analytics/window-success] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T85.1.4: Write unit tests verifying dynamic window sizing, edge cases where total tasks < windowSize, boundary conditions (N=0, 1, 2, 3), and multi-dimensional filter projections. [File: packages/engine/src/tests/rolling_window_analytics.test.ts] [Test: npm test -- packages/engine/src/tests/rolling_window_analytics.test.ts]

### T85.2: Calculus Convergence & Plateau Detection Engine
  - [x] T85.2.1: Implement mathematical convergence and rate-of-change evaluator (`ConvergenceAnalyzer`) in `packages/engine/src/analytics/ConvergenceAnalyzer.ts` calculating first and second discrete derivatives (velocity and acceleration of success/failure deltas) across sliding windows. [File: packages/engine/src/analytics/ConvergenceAnalyzer.ts] [Class: ConvergenceAnalyzer] [Test: npm test -- packages/engine/src/tests/convergence_analyzer.test.ts]
  - [x] T85.2.2: Implement plateau detection: identify when variance across nested windows (e.g. 50-task window versus 10-task window) stagnates below a delta epsilon (e.g. |rate_50 - rate_10| < epsilon) indicating performance stagnation or systemic deadlocks. [File: packages/engine/src/analytics/ConvergenceAnalyzer.ts] [Method: detectPlateau] [Test: npm test -- packages/engine/src/tests/convergence_analyzer.test.ts]
  - [x] T85.2.3: Implement spot hallucination and deterministic rule pattern matcher flagging recurring failure signatures suitable for immediate in-situ mitigation versus architectural triage. [File: packages/engine/src/analytics/ConvergenceAnalyzer.ts] [Method: evaluateFailureMode] [Test: npm test -- packages/engine/src/tests/convergence_analyzer.test.ts]
  - [x] T85.2.4: Write unit tests validating discrete derivative computations, convergence limits, plateau recognition, and threshold alerts. [File: packages/engine/src/tests/convergence_analyzer.test.ts] [Test: npm test -- packages/engine/src/tests/convergence_analyzer.test.ts]

### T85.3: Git Commit Hash Regression Pinpointing & Autonomous Diagnostic Dispatcher
  - [x] T85.3.1: Implement `GitRegressionCorrelator` in `packages/engine/src/analytics/GitRegressionCorrelator.ts` mapping task failure time offsets back to recent git commit hashes in Gitea/local repository. [File: packages/engine/src/analytics/GitRegressionCorrelator.ts] [Class: GitRegressionCorrelator] [Test: npm test -- packages/engine/src/tests/git_regression_correlator.test.ts]
  - [x] T85.3.2: Implement threshold-triggered regression dispatch supervisor: when windowed success drops below configurable threshold or consecutive failure run triggers, dispatch a priority analysis task to the optimal model pool (e.g. high-reasoning frontier or top local validator model). [File: packages/engine/src/scheduler/RegressionDispatchSupervisor.ts] [Class: RegressionDispatchSupervisor] [Test: npm test -- packages/engine/src/tests/regression_dispatch.test.ts]
  - [x] T85.3.3: Construct diagnostic remediation flow: if regression analysis identifies a breaking commit, automatically synthesize targeted test assertions, generate code fix, verify against test suite in isolated worktree, and merge remediation before unpausing regular queue. [File: packages/engine/src/scheduler/RegressionDispatchSupervisor.ts] [Method: executeRemediationLoop] [Test: npm test -- packages/engine/src/tests/regression_dispatch.test.ts]
  - [x] T85.3.4: Integrate plateau intervention: when performance plateaus across expanded windows, trigger smart model review to propose new deterministic rule definitions, edge-case guards, or hyperparameter adjustments. [File: packages/engine/src/scheduler/RegressionDispatchSupervisor.ts] [Method: triggerPlateauIntervention] [Test: npm test -- packages/engine/src/tests/regression_dispatch.test.ts]
  - [x] T85.3.5: Write integration tests verifying failure surge -> git hash correlation -> diagnostic dispatch -> automated remediation -> queue resumption lifecycle. [File: packages/engine/src/tests/regression_dispatch.test.ts] [Test: npm test -- packages/engine/src/tests/regression_dispatch.test.ts]

### T85.4: Mobile-First Dashboard Trend & Failure Window Chart UI
  - [ ] T85.4.1: Create `WindowedSuccessTrendComponent` in `packages/frontend/src/app/components/windowed-success-trend/` rendering responsive SVG/Canvas failure and success rate trend lines alongside overall rate. [File: packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.ts] [Class: WindowedSuccessTrendComponent] [Test: npm test]
  - [ ] T85.4.2: Add granular interactive controls to adjust window size (10, 20, 50, 100, 1000, Total) and qualification filters (by role, model, branch/commit) with immediate reactive signal updates. [File: packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.html] [Test: npm test]
  - [ ] T85.4.3: Integrate trend widget into `DashboardViewComponent` directly adjacent to overall success rate badge, featuring mobile-first responsive layout, dark/light theme support, and visual regression alerts. [File: packages/frontend/src/app/components/views/dashboard-view.component.ts] [Test: npm test]
  - [ ] T85.4.4: Write Angular unit tests validating signal reactions, window selector changes, mobile viewport reflows, and theme token bindings. [File: packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.spec.ts] [Test: npm test]


---

## Phase 86: Distributed Fleet Load Balancing & Elastic Worker Scaling
*RDF Category: infrastructure_and_scaling*

### T86.1: Node Health Monitoring & Status Heartbeats
  - [ ] T86.1.1: Create `INodeHealthStatus` interface in `packages/shared-types/src/fleet.ts` covering node state (IDLE, BUSY, OFFLINE), active memory usage, APU/GPU thermals, and current task assignment. [File: packages/shared-types/src/fleet.ts] [Interface: INodeHealthStatus] [Test: npm test -- packages/shared-types]
  - [ ] T86.1.2: Implement `FleetHealthMonitor` service in `packages/engine/src/fleet/FleetHealthMonitor.ts` to collect local telemetry and receive UDP/HTTP heartbeats from peer worker nodes. [File: packages/engine/src/fleet/FleetHealthMonitor.ts] [Class: FleetHealthMonitor] [Test: npm test -- packages/engine/src/tests/fleet_health_monitor.test.ts]
  - [ ] T86.1.3: Expose `POST /api/fleet/heartbeat` for worker nodes to report their status to the orchestrator node. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/fleet/heartbeat] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [ ] T86.1.4: Write unit tests verifying missing heartbeats transition node state to OFFLINE and active heartbeats update thermal profiles. [File: packages/engine/src/tests/fleet_health_monitor.test.ts] [Test: npm test -- packages/engine/src/tests/fleet_health_monitor.test.ts]

### T86.2: Multi-Node Task Dispatch & Load Balancing
  - [ ] T86.2.1: Implement `DistributedTaskDispatcher` in `packages/engine/src/scheduler/DistributedTaskDispatcher.ts` replacing local-only dispatch to route tasks to the node with optimal thermal headroom and VRAM availability. [File: packages/engine/src/scheduler/DistributedTaskDispatcher.ts] [Class: DistributedTaskDispatcher] [Test: npm test -- packages/engine/src/tests/distributed_dispatcher.test.ts]
  - [ ] T86.2.2: Refactor `TaskScheduler` to leverage `DistributedTaskDispatcher` for offloading compute-intensive tasks (e.g. `deepseek-coder-v2:16b`) to heavy compute nodes while keeping light orchestration tasks (e.g. `qwen2.5-coder:3b`) local. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: tick] [Test: npm test -- packages/engine/src/tests/scheduler.test.ts]
  - [ ] T86.2.3: Integrate task migration logic: if a node reports THERMAL_THROTTLING, gracefully pause its task, sync the worktree patch back to DB, and re-dispatch to a cooler node. [File: packages/engine/src/scheduler/DistributedTaskDispatcher.ts] [Method: migrateTask] [Test: npm test -- packages/engine/src/tests/distributed_dispatcher.test.ts]

### T86.3: Fleet Topology Visualization Dashboard
  - [ ] T86.3.1: Create `FleetTopologyViewComponent` in `packages/frontend/src/app/components/views/fleet-topology-view.component.ts` rendering a live network graph of connected worker nodes. [File: packages/frontend/src/app/components/views/fleet-topology-view.component.ts] [Class: FleetTopologyViewComponent] [Test: npm test]
  - [ ] T86.3.2: Implement real-time SSE bindings connecting `FleetTopologyViewComponent` to `GET /api/fleet/events` to visually pulse nodes when they receive tasks or throw thermal warnings. [File: packages/frontend/src/app/components/views/fleet-topology-view.component.ts] [Test: npm test]
  - [ ] T86.3.3: Write Angular unit and integration tests verifying topology reflow on node connect/disconnect and mobile-first responsive scaling. [File: packages/frontend/src/app/components/views/fleet-topology-view.component.spec.ts] [Test: npm test]

---

## Phase 87: Predictive Telemetry Pre-fetching & Caching Optimization
*RDF Category: performance_and_optimization*

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
*RDF Category: review_and_validation*

### T89.1: Deterministic Structural Anti-Stub Review Gate
  - [x] T89.1.1: Implement AST empty template and placeholder detection for Angular components in GeneratedChangeGuard. [File: packages/engine/src/testing/GeneratedChangeGuard.ts] [Test: npm test -- packages/engine/src/tests/generated_change_guard.test.ts]
  - [x] T89.1.2: Enforce module-root execution guardrail preventing top-level function invocations in library modules. [File: packages/engine/src/testing/GeneratedChangeGuard.ts] [Test: npm test -- packages/engine/src/tests/generated_change_guard.test.ts]
  - [x] T89.1.3: Detect and reject arbitrary stripping of JSDoc documentation comment blocks from existing source files. [File: packages/engine/src/testing/GeneratedChangeGuard.ts] [Test: npm test -- packages/engine/src/tests/generated_change_guard.test.ts]

### T89.2: Multi-Model Progressive Review Gate & Frontier Reviewer Hardening
  - [x] T89.2.1: Implement inspectStructuralAntiStub in FrontierReviewer rejecting empty templates, placeholder bodies, and comment stripping before LLM invocation. [File: packages/engine/src/inference/FrontierReviewer.ts] [Test: npm test -- packages/engine/src/tests/frontier_reviewer.test.ts]
  - [x] T89.2.2: Implement two-stage striped MoE reviewer running Semantic Completeness Critic and SOLID Quality Critic across distinct models. [File: packages/engine/src/inference/FrontierReviewer.ts] [Test: npm test -- packages/engine/src/tests/frontier_reviewer.test.ts]

### T89.3: Model Role Specialization & 3B Feature Disqualification
  - [x] T89.3.1: Disqualify 3B parameter models from coding and implementer roles, routing implementation tasks to 7B+ instruct models. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Test: npm test -- packages/engine/src/tests/scheduler.test.ts]
  - [x] T89.3.2: Implement micro-model scaffolding generator using 3B models strictly for file structure and method signature generation, delegating method bodies to larger models. [File: packages/engine/src/generators/SchematicCodeGenerator.ts] [Test: npm test -- packages/engine/src/tests/schematic_generator.test.ts]

### T89.4: Angular Standards Skill & Component Decomposition Hardening
  - [x] T89.4.1: Update Angular standards skill documentation enforcing file decomposition, prohibiting placeholder templates, and establishing mobile-first criteria. [File: /home/nexen/.gemini/config/plugins/modern-web-guidance-plugin/skills/angular-standards/SKILL.md]

---

## Phase 96: Granular Test Suites, Strict Typing Hardening & Edge-Case Guardrails
*RDF Category: verification_and_hardening*

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
*RDF Category: hardware_and_network_verification*

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
*RDF Category: static_analysis_hardening*

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
*RDF Category: analytics_and_orchestration*

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
*Autonomous Deterministic Decompositions from Exceeded Failure Limits*




