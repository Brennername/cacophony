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

## Active Milestone Era: System Hardening, Authentik SSO, Full-Stack Real Data, Mobile-First Routed UI, Rule DSL, Stochastic Optimization & Hardware Discovery

*See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 16.*

---

## Phase 17: Authentik & Authelia Enterprise SSO Provider Integration
*RDF Category: `spec:AuthenticationAndIdentityCategory`*

### T17.1: Authentik Provider Architecture & Container Orchestration (`spec:AuthentikArchitecture`)
- [x] T17.1.1: Container Topology & Compose Service Definition:
  - [x] T17.1.1.1: Define Authentik server and worker services in `docker-compose.yml` with configurable ports (`PORT_AUTHENTIK_HTTP:-9000`, `PORT_AUTHENTIK_HTTPS:-9443`).
  - [x] T17.1.1.2: Configure Redis cache container and PostgreSQL/PGlite database credentials for Authentik state storage.
  - [x] T17.1.1.3: Bind Authentik storage volumes (`authentik-media`, `authentik-templates`, `authentik-certs`) with non-root ownership.
  - [x] T17.1.1.4: Configure internal Docker network bridge (`cacophony-net`) allowing seamless resolution between Engine, Authentik, and Gitea.
- [x] T17.1.2: Environment Configuration & Secret Management:
  - [x] T17.1.2.1: Add `AUTHENTIK_SECRET_KEY`, `AUTHENTIK_BOOTSTRAP_PASSWORD`, and `AUTHENTIK_BOOTSTRAP_TOKEN` variables to `.env.example` and `.env`.
  - [x] T17.1.2.2: Implement automatic generation of cryptographically secure Authentik secret keys during workspace initialization script.
  - [x] T17.1.2.3: Integrate Authentik service discovery URLs into typed `AuthConfig` schema in `@cacophony/shared-types`.
- [x] T17.1.3: Multi-Provider SSO Abstraction (`spec:SsoProviderAbstraction`):
  - [x] T17.1.3.1: Define `ISsoProvider` interface in `@cacophony/engine` with methods: `getAuthorizationUrl()`, `exchangeCode()`, `verifyToken()`, `getUserProfile()`.
  - [x] T17.1.3.2: Implement `AuthentikOAuthProvider` implementing OIDC discovery (`.well-known/openid-configuration`), JWKS token verification, and user claims extraction.
  - [x] T17.1.3.3: Implement `AutheliaSsoProvider` adapter supporting forward-auth headers (`Remote-User`, `Remote-Email`, `Remote-Groups`) and OIDC fallback.
  - [x] T17.1.3.4: Implement `SsoProviderFactory` dynamically selecting active provider based on `SSO_PROVIDER=authentik|authelia|gitea|local` in `.env`.

### T17.2: Automated Provisioning & Onboarding Induction Pipeline (`spec:AuthentikOnboarding`)
- [x] T17.2.1: Programmatic Blueprint & Bootstrap Script:
  - [x] T17.2.1.1: Author Authentik declarative blueprint YAML defining default execution flow, user stage, and OAuth2/OIDC Application.
  - [x] T17.2.1.2: Create `bin/bootstrap-authentik.sh` CLI script automating API token generation, application client ID/secret extraction, and redirect URI registration.
  - [x] T17.2.1.3: Synchronize generated client ID and secret into `.env` automatically without manual web UI copy-pasting.
- [x] T17.2.2: New User Induction & Role Mapping:
  - [x] T17.2.2.1: Map Authentik groups (`cacophony-admins`, `cacophony-operators`, `cacophony-viewers`) to internal RBAC roles in `SecretVault`.
  - [x] T17.2.2.2: Implement first-run induction wizard in Angular frontend detecting unconfigured SSO and prompting initial admin onboarding.
  - [x] T17.2.2.3: Support local emergency bypass account in `PGliteDriver` when SSO provider is unreachable or in air-gapped deployments.
- [x] T17.2.3: Automated Testing & Token Validation:
  - [x] T17.2.3.1: Write unit tests verifying `AuthentikOAuthProvider` OIDC token validation, clock skew tolerance, and signature verification.
  - [x] T17.2.3.2: Write integration tests verifying `AutheliaSsoProvider` header extraction and session cookie serialization.
  - [x] T17.2.3.3: Write e2e tests asserting successful login redirect, token exchange, and JWT issuance across the container stack.

---

## Phase 18: Full-Stack Real Data Pipeline & Elimination of Mocks
*RDF Category: `spec:RealDataPipelinesCategory`*

### T18.1: Frontend Mock Audit & Elimination (`spec:EliminateFrontendMocks`)
- [x] T18.1.1: Complete Audit of Frontend Mocked Signals:
  - [x] T18.1.1.1: Audit `ArenaStateStore` (`packages/frontend/src/app/services/arena-state.store.ts`) removing hardcoded mock telemetry defaults (GPU 18%, VRAM 2150MB, etc.).
  - [x] T18.1.1.2: Remove hardcoded task items (`task-101`, `task-102`, `task-103`) from `ArenaStateStore.tasks` signal initialization.
  - [x] T18.1.1.3: Remove hardcoded process items (`proc-1`, `proc-2`) from `ArenaStateStore.processes` signal initialization.
  - [x] T18.1.1.4: Audit `HistoryMetricsService` (`packages/frontend/src/app/services/history-metrics.service.ts`) removing hardcoded mock items (`task-089`, `task-088`, etc.).
  - [x] T18.1.1.5: Remove hardcoded model leaderboard entries from `HistoryMetricsService` and bind directly to database queries.
  - [x] T18.1.1.6: Audit `RepoMapViewerComponent` removing hardcoded node arrays (`sym-1`, `sym-2`) and binding to backend repo map API.
  - [x] T18.1.1.7: Audit `CheckpointTimelineComponent` removing hardcoded checkpoint records (`cp-1`, `cp-2`) and binding to `GitCheckpointRepository`.
  - [x] T18.1.1.8: Audit `LspTestLoopPanelComponent` removing static diagnostic objects and binding to live compiler diagnostic event streams.
- [x] T18.1.2: End-to-End Reactive Data Services:
  - [x] T18.1.2.1: Implement `TaskApiService` in Angular connecting to `GET /api/tasks`, `POST /api/tasks`, `GET /api/tasks/:id`, and `DELETE /api/tasks/:id`.
  - [x] T18.1.2.2: Implement `ProcessMonitorService` in Angular consuming live process execution streams via SSE (`/api/events`).
  - [x] T18.1.2.3: Implement `TelemetryStreamService` in Angular maintaining persistent EventSource connection and pushing real sensor updates to Signals.
  - [x] T18.1.2.4: Implement `HistoryApiService` in Angular fetching paginated historical task records, stage execution logs, and model win rates.
  - [x] T18.1.2.5: Implement `RepoMapApiService` in Angular fetching dynamic architectural symbol graphs generated by `RepoMapGenerator`.
  - [x] T18.1.2.6: Implement `GitCheckpointApiService` in Angular executing live `/undo`, `/redo`, and micro-checkpoint timeline queries.
  - [x] T18.1.2.7: Implement offline reconnect and backoff retry logic for all SSE streams and REST API consumers.

### T18.2: Backend REST & SSE API Expansion (`spec:BackendApiExpansion`)
- [x] T18.2.1: Extended REST Endpoints:
  - [x] T18.2.1.1: Implement `GET /api/history` with query parameters (`page`, `limit`, `modelId`, `status`) querying `task_stages` and `tasks`.
  - [x] T18.2.1.2: Implement `GET /api/models/leaderboard` calculating dynamic win rates, total tasks, and average tokens/sec from database tables.
  - [x] T18.2.1.3: Implement `GET /api/processes` listing recently executed test runners, linters, and git subprocesses with exit codes.
  - [x] T18.2.1.4: Implement `GET /api/repomap` accepting target directory path and returning ranked AST symbol graph JSON.
  - [x] T18.2.1.5: Implement `GET /api/checkpoints` and `POST /api/checkpoints/undo`, `POST /api/checkpoints/redo` wired directly to `GitUndoManager`.
  - [x] T18.2.1.6: Implement `GET /api/diagnostics` exposing active workspace LSP compiler diagnostics grouped by file and severity.
- [x] T18.2.2: Server-Sent Events (SSE) Protocol Hardening:
  - [x] T18.2.2.1: Structure SSE message envelopes with typed events: `telemetry`, `task_stage`, `process_spawn`, `token_stream`, `lsp_diagnostic`.
  - [x] T18.2.2.2: Implement client heartbeat ping/pong (`:keepalive\n\n`) every 15 seconds to prevent proxy connection termination.
  - [x] T18.2.2.3: Implement per-client event subscription filtering to optimize network payload on mobile devices over Wi-Fi.

---

## Phase 19: Network-Agnostic URL Resolution & Multi-Device Access
*RDF Category: `spec:NetworkAgnosticRoutingCategory`*

### T19.1: Dynamic Host & IP Resolution (`spec:DynamicHostResolution`)
- [x] T19.1.1: Header-Based Host Translation:
  - [x] T19.1.1.1: Eliminate all hardcoded `http://localhost:...` strings across frontend services and backend redirect generators.
  - [x] T19.1.1.2: Implement dynamic host resolution middleware in `CacophonyHttpServer` inspecting `X-Forwarded-Host`, `X-Forwarded-Proto`, and `Host` headers.
  - [x] T19.1.1.3: Provide resolved origin context to Angular frontend via `GET /api/config/network` (exposing client-visible base URL).
- [x] T19.1.2: Wi-Fi LAN & Mobile Access Adaptation:
  - [x] T19.1.2.1: Detect incoming client connection interface (loopback `127.0.0.1` vs LAN IP `192.168.x.x` vs tailscale/wireguard IP).
  - [x] T19.1.2.2: Format OAuth2 redirect URIs and Gitea/Authentik public URLs dynamically matching the client's ingress route.
  - [x] T19.1.2.3: Add network profile configuration options in `conf/cacophony.example.json` (`local_only`, `lan_shared`, `reverse_proxy`, `custom_domain`).
- [x] T19.1.3: Cross-Origin Resource Sharing (CORS) & Security Policies:
  - [x] T19.1.3.1: Configure dynamic CORS headers in `CacophonyHttpServer` permitting requests from detected LAN IP subnets.
  - [x] T19.1.3.2: Configure Content Security Policy (CSP) headers permitting WebSocket and SSE connections from LAN origins.
  - [x] T19.1.3.3: Write automated integration tests asserting successful API access and OAuth redirects from remote IP simulation.

---

## Phase 20: Mobile-First Routed Navigation & High-Density Desktop Layout
*RDF Category: `spec:ResponsiveInterfaceCategory`*

### T20.1: Angular Router Architecture & Route Modularization (`spec:AngularRouting`)
- [x] T20.1.1: Route Structure & View Decomposition:
  - [x] T20.1.1.1: Replace monolithic single-page forever-scroll in `AppComponent` with structured Angular child routing.
  - [x] T20.1.1.2: Create `/dashboard` route: System vitals header, active running task card, and compact live queue snapshot.
  - [x] T20.1.1.3: Create `/queue` route: Full task queue management, drag-and-drop reordering, priority filters, and enqueue drawer.
  - [x] T20.1.1.4: Create `/history` route: Audited execution runs, failure cause taxonomy, diff comparisons, and Gitea PR links.
  - [x] T20.1.1.5: Create `/models` route: Model health leaderboard, eviction statistics, tokens/sec gauges, and fallback matrices.
  - [x] T20.1.1.6: Create `/repomap` route: Full-screen interactive SVG/Canvas repository dependency graph with pan/zoom.
  - [x] T20.1.1.7: Create `/processes` route: Non-model test runners, linter executions, git worktrees, and shell audits.
  - [x] T20.1.1.8: Create `/settings` route: Theme selection, SSO configuration, network profiles, and vault secrets manager.
- [x] T20.1.2: Mobile Responsive Navigation:
  - [x] T20.1.2.1: Design and implement mobile slide-out Hamburger Drawer with swipe gestures for narrow viewports (< 768px).
  - [x] T20.1.2.2: Implement Mobile Bottom Navigation Bar (`Dashboard`, `Queue`, `History`, `Models`, `More`) with tap targets > 48px.
  - [x] T20.1.2.3: Eliminate header button horizontal overflow on mobile screens; collapse secondary actions into contextual kebab menu.
  - [x] T20.1.2.4: Ensure 100% compliance with mobile accessibility standards (WCAG tap targets, ARIA labels, focus states).

### T20.2: High-Density Desktop Grid & Gap Elimination (`spec:DesktopGridOptimization`)
- [x] T20.2.1: CSS Grid Flow & Auto-Fitting Layout Engine:
  - [x] T20.2.1.1: Refactor desktop layout from rigid 2-column grid to dynamic CSS Grid with `grid-auto-flow: dense` and masonry-inspired packing.
  - [x] T20.2.1.2: Implement card height expansion (`display: flex; flex: 1`) preventing blank vertical gaps at column bottoms.
  - [x] T20.2.1.3: Ensure `ProcessInspectorComponent` and `QueueManagerComponent` fluidly resize and consume remaining viewport height.
  - [x] T20.2.1.4: Provide customizable desktop dashboard widget layout with persistent localStorage layout preferences.
- [x] T20.2.2: Responsive Visual Polish:
  - [x] T20.2.2.1: Verify smooth transitions across Dark, Light, and High-Contrast themes across all routes.
  - [x] T20.2.2.2: Write component tests verifying route transitions and responsive breakpoint triggers.

---

## Phase 21: Real-Time Task Progress, Granular Stages & Gantt Transport
*RDF Category: `spec:RealtimeExecutionObservabilityCategory`*

### T21.1: Multi-Level Task Progress Tracking (`spec:MultiLevelProgress`)
- [x] T21.1.1: Stage Pipeline Breakdown & Progress Metrics:
  - [x] T21.1.1.1: Define structured stage steps in `TaskRepository`: `1/7 Planning`, `2/7 Context Assembly`, `3/7 Generation`, `4/7 Scrubbing`, `5/7 Test Verification`, `6/7 Remediation`, `7/7 PR Review`.
  - [x] T21.1.1.2: Calculate task overall progress percentage (`task.progressPercent = (completedStages / totalStages) * 100`).
  - [x] T21.1.1.3: Track sub-stage intra-progress (e.g. Generation token count vs context window limit; Test runs passed `x/y`).
- [x] T21.1.2: Frontend Stage Progress Bar Components:
  - [x] T21.1.2.1: Create `StageProgressBarComponent` (standalone): Animated segmented progress bar displaying active stage name and completion percentage.
  - [x] T21.1.2.2: Add intra-stage token progress indicators and live tokens/second velocity meters.
  - [x] T21.1.2.3: Support click-to-expand stage drawer showing live console log output for each completed or active stage.

### T21.2: Real-Time Transport & Interactive Gantt Timeline (`spec:GanttTransportTimeline`)
- [x] T21.2.1: Timeline Data Model & Persistence:
  - [x] T21.2.1.1: Persist high-precision timestamps (`started_at`, `completed_at`, `duration_ms`) for each task stage in `task_stages` table.
  - [x] T21.2.1.2: Implement `GET /api/tasks/:id/gantt` returning timeline spans for all stages and spawned subprocesses.
- [x] T21.2.2: Interactive Gantt Transport Component:
  - [x] T21.2.2.1: Create `GanttTransportComponent` (standalone): Audio DAW-inspired horizontal timeline with moving playhead scrub bar.
  - [x] T21.2.2.2: Render concurrent operations (model token streaming, background compiler test runs, git commit creation) on stacked swimlanes.
  - [x] T21.2.2.3: Interactive zoom (`Ctrl + Scroll`) and time scrubber allowing post-mortem inspection of latency bottlenecks.
  - [x] T21.2.2.4: Write unit tests validating progress calculation algorithms and timeline bounds.

---

## Phase 22: Historical Failure Taxonomy, Analytics & Area-Under-Curve (AOC) Visualizations
*RDF Category: `spec:AnalyticsAndMetricsCategory`*

### T22.1: Failure Mode Taxonomy & Classification Engine (`spec:FailureTaxonomy`)
- [x] T22.1.1: Categorization Engine:
  - [x] T22.1.1.1: Implement `FailureClassifier` in `@cacophony/engine` parsing task errors into normalized categories: `SYNTAX_ERROR`, `TEST_ASSERTION_FAILURE`, `TYPE_CHECK_ERROR`, `BANNED_IMPORT`, `THERMAL_THROTTLE`, `CONTEXT_OVERFLOW`, `TIMEOUT`.
  - [x] T22.1.1.2: Persist failure taxonomy codes in `tasks.failure_category` and `task_stages.failure_code`.
- [x] T22.1.2: Statistical Aggregation Services:
  - [x] T22.1.2.1: Implement database aggregation queries calculating failure distributions per model and per stack profile.
  - [x] T22.1.2.2: Implement `GET /api/analytics/failures` returning rolling trend data over configurable windows (24h, 7d, 30d).

### T22.2: Historical Trend Lines & Shaded Area-Under-Curve Charts (`spec:AocCharts`)
- [x] T22.2.1: Charting Architecture:
  - [x] T22.2.1.1: Create `TrendChartComponent` (standalone) using lightweight SVG rendering without heavy third-party bundle dependencies.
  - [x] T22.2.1.2: Render KDE System Monitor aesthetic multi-series line graphs with semi-transparent shaded area-under-curve fills.
  - [x] T22.2.1.3: Support toggling metrics: GPU Temperature vs Wattage, Success Rate Trend, Token Throughput, Failure Mode Frequencies.
- [x] T22.2.2: Interactive Tooltips & Cross-Filtering:
  - [x] T22.2.2.1: Implement hover tooltip displaying point-in-time metrics, active task title, and model name.
  - [x] T22.2.2.2: Clicking a failure spike filters task history to the corresponding time window and failure category.
  - [x] T22.2.2.3: Write component tests verifying SVG path rendering, coordinate scaling, and data updates.

---

## Phase 23: AST Code Signature Compression & Mechanistic Interface Enforcement
*RDF Category: `spec:MechanisticCodeSynthesisCategory`*

### T23.1: Codebase Signature Map Extraction & Storage (`spec:SignatureMapExtraction`)
- [x] T23.1.1: AST Deep Type & Interface Harvester:
  - [x] T23.1.1.1: Implement `SignatureHarvester` using TypeScript Compiler API extracting: exported function signatures, parameter names and types, return types, interface contracts, type aliases, class constructor overloads.
  - [x] T23.1.1.2: Support Java AST parsing (via Tree-Sitter) extracting public class methods, parameters, and generic constraints.
  - [x] T23.1.1.3: Support Go AST parsing extracting struct signatures, interfaces, and exported method receivers.
- [x] T23.1.2: Compressed Signature Representation:
  - [x] T23.1.2.1: Formulate ultra-compact signature notation minimizing token overhead when injected into local model prompts.
  - [x] T23.1.2.2: Persist codebase signature index in `code_signature_index` relational table in `@cacophony/db`.
  - [x] T23.1.2.3: Update signature index automatically via git commit hooks or file change watchers.

### T23.2: Queryable Model Tools for Signature Targeting (`spec:SignatureQueryTools`)
- [x] T23.2.1: Model Context Protocol (MCP) Signature Tools:
  - [x] T23.2.1.1: Implement `query_data_shape` tool allowing local models to query expected input/output interfaces of target functions.
  - [x] T23.2.1.2: Implement `query_functional_interface` tool allowing models to inspect valid lambda parameters and method signatures.
  - [x] T23.2.1.3: Implement `query_overload_map` tool returning valid argument permutations for polymorphic functions.
- [x] T23.2.2: Prompt Generation Integration:
  - [x] T23.2.2.1: Inject extracted signature map into task prompt as a strict target mini-specification.
  - [x] T23.2.2.2: Provide models with explicit type constraints before generation begins to maximize first-pass success rate.

### T23.3: Mechanistic Correction & Hallucination Repair Pipeline (`spec:MechanisticCorrection`)
- [x] T23.3.1: Pre-Test Deterministic Alignment Engine:
  - [x] T23.3.1.1: Implement `SignatureAlignmentScrubber` running immediately after LLM code generation and before test execution.
  - [x] T23.3.1.2: Detect common hallucination modes: misspelled parameter names, inverted argument orders, mismatched optional flags.
  - [x] T23.3.1.3: Mechanistically rewrite generated function calls and method signatures to match the authoritative signature map.
- [x] T23.3.2: Automated Verification:
  - [x] T23.3.2.1: Write unit tests verifying signature extraction across complex TypeScript and Java classes.
  - [x] T23.3.2.2: Write integration tests demonstrating successful mechanistic correction of misspelled parameters without test execution failure.
  - [x] T23.3.2.3: Measure and log improvement in first-pass test pass rates across local models.

---

## Phase 24: Distributed Multi-Node Fleet Architecture & Hardware Profiling
*RDF Category: `spec:DistributedFleetCategory`*

### T24.1: Fleet Master/Node Topology & Registration Protocol (`spec:FleetTopology`)
- [x] T24.1.1: Master Node Controller:
  - [x] T24.1.1.1: Implement `FleetMasterCoordinator` in `@cacophony/engine` acting as the central scheduler and telemetry aggregator.
  - [x] T24.1.1.2: Expose node registration endpoint `POST /api/fleet/register` with cryptographic node token authentication.
  - [x] T24.1.1.3: Maintain cluster registry table `fleet_nodes` (node_id, hostname, ip, gpu_type, vram_mb, status, last_heartbeat).
- [x] T24.1.2: Subservient Worker Node Daemon:
  - [x] T24.1.2.1: Implement lightweight headless worker daemon running on remote machines with zero UI overhead.
  - [x] T24.1.2.2: Establish persistent outbound WebSocket connection from worker node to master coordinator.
  - [x] T24.1.2.3: Stream local hardware sensors (GPU load, VRAM, temp) and task execution heartbeats back to master.
- [x] T24.1.3: Distributed Task Scheduling & Farm-Out Engine:
  - [x] T24.1.3.1: Implement task dispatcher matching task model requirements to available node hardware capabilities.
  - [x] T24.1.3.2: Farm out compilation, testing, and generation to remote nodes while maintaining master git branch synchronization.
  - [x] T24.1.3.3: Handle worker node disconnects gracefully with automatic task reassignment and thermal failover.

### T24.2: Multi-GPU Hardware Profiling Engine (`spec:HardwareProfiling`)
- [x] T24.2.1: Hardware Vendor Sensor Drivers:
  - [x] T24.2.1.1: Implement `NvidiaTelemetryProvider` querying `NVML` / `nvidia-smi` (GPU utilization, VRAM, temp, power draw).
  - [x] T24.2.1.2: Implement `AmdRDNAProvider` optimized for modern Radeon RX 7000/8000 series and high-end APUs.
  - [x] T24.2.1.3: Implement `AppleSiliconProvider` querying `powermetrics` for unified memory macOS worker nodes.
- [x] T24.2.2: Hardware Profile Database & Benchmark Suite:
  - [x] T24.2.2.1: Create automated hardware capability prober testing quantization throughput (Q4_K_M, Q8_0, FP16) on each node.
  - [x] T24.2.2.2: Save optimal batch sizes, context limits, and thermal thresholds per card in `hardware_profiles` table.
  - [x] T24.2.2.3: Expose multi-node fleet overview and hardware diagnostics in Angular dashboard route `/fleet`.

---

## Phase 25: Composable Deterministic Repair Rule DSL & Pipeline Engine
*RDF Category: `spec:RepairRuleDslCategory`*

### T25.1: Declarative Rule DSL Grammar, AST & Configuration Schemas (`spec:RuleDslArchitecture`)
- [x] T25.1.1: Rule Grammar & Schema Definitions:
  - [x] T25.1.1.1: Define `@cacophony/shared-types` schemas for `RuleSeverity` (`silent_repair`, `soft_warning`, `hard_rejection`, `disabled`) and `RuleLifecycleHook` (`pre_generation`, `post_generation`, `pre_test`, `post_test`).
  - [x] T25.1.1.2: Define core interfaces: `IRepairRule<TContext, TResult>`, `RuleEvaluationContext`, `RuleExecutionResult`, `RuleDiagnostic`, `IRulePipeline`.
  - [x] T25.1.1.3: Author JSON Schema / Zod validator for declarative YAML pipeline definitions (`conf/pipelines/*.yml`).
  - [x] T25.1.1.4: Implement lightweight DSL parser supporting human-readable rule declarations (e.g. `pipeline "vega_hardened" { hook post_generation { rule strip_emojis [severity=silent_repair]; rule enforce_esm_js [severity=silent_repair]; } hook pre_test { rule banned_imports [severity=hard_rejection, packages=["conductor", "lodash"]]; rule loose_root_files [severity=soft_warning]; } }`).
  - [x] T25.1.1.5: Support variable interpolation and environment substitution within rule arguments (e.g. `${PROJECT_ROOT}`, `${TARGET_ARCH}`).
- [x] T25.1.2: Pipeline Chaining & Execution Engine:
  - [x] T25.1.2.1: Implement `RulePipelineEngine` in `@cacophony/engine` orchestrating rule sequences per lifecycle hook.
  - [x] T25.1.2.2: Implement short-circuit logic: when a `hard_rejection` rule triggers, halt subsequent rules unless configured with `continueOnError: true`.
  - [x] T25.1.2.3: Implement soft-warning accumulator: rules marked `soft_warning` emit non-fatal warnings preserved in task stage metadata for telemetry without failing the build.
  - [x] T25.1.2.4: Implement dry-run execution mode (`simulate: true`) calculating would-be modifications and rejections without altering files on disk.
  - [x] T25.1.2.5: Implement execution telemetry recorder persisting rule run durations, modification counts, and diagnostics in `rule_executions` database table.

### T25.2: Core Deterministic Repair Rule Catalog (`spec:CoreRuleCatalog`)
- [x] T25.2.1: Formatting & Token Hygiene Rules:
  - [x] T25.2.1.1: Implement `StripEmojisRule`: Scans source files and documentation for unicode emoji ranges (excluding musical notation symbols U+2669 through U+266F), stripping or flagging per severity mode.
  - [x] T25.2.1.2: Implement `EnforceEsmJsExtensionRule`: TypeScript compiler/NodeNext ESM relative import scrubber appending missing `.js` extensions on relative module paths (`from './Foo.js'`).
  - [x] T25.2.1.3: Implement `WhitespaceAndEolNormalizerRule`: Normalizes CRLF to LF, trims trailing whitespace, and ensures final newline in modified files.
- [x] T25.2.2: Structural & Boundary Protection Rules:
  - [x] T25.2.2.1: Implement `LooseRootFileGuardRule`: Prevents models from creating loose source or test files in the project root directory; auto-relocates or rejects based on configurable package boundary policies.
  - [x] T25.2.2.2: Implement `EmptyFileGuardRule`: Detects 0-byte or whitespace-only files created by models and rejects or removes them.
  - [x] T25.2.2.3: Implement `PlaceholderStubDetectorRule`: Scans code for unfulfilled placeholder stubs (e.g. `// TODO: implement later`, `throw new Error("Not implemented")`, `// ... rest of code goes here ...`) and flags per configured tolerance.
  - [x] T25.2.2.4: Implement `BannedImportScrubberRule`: Detects hallucinated or blacklisted packages (e.g. legacy imports, forbidden framework dependencies) and strips or alerts.
- [x] T25.2.3: Mechanistic AST Alignment Rules:
  - [x] T25.2.3.1: Implement `AstSignatureAlignRule`: Cross-references extracted symbol signatures from Phase 23, mechanistically aligning inverted argument order, parameter name typos, and optional argument gaps.
  - [x] T25.2.3.2: Implement `TypeScriptDiagnosticRepairRule`: Consumes TypeScript compiler diagnostics (`tsc --noEmit`), attempting deterministic AST rewrites for trivial errors (e.g. missing type imports, unused variable prefixes `_`).

### T25.3: Verification, Profiling & Unit Testing (`spec:RuleDslVerification`)
- [x] T25.3.1: Unit & Regression Tests:
  - [x] T25.3.1.1: Write unit tests for DSL parser validating grammar syntax errors, nested block scoping, and parameter parsing.
  - [x] T25.3.1.2: Write unit tests for each core rule validating idempotency, modification detection, and diagnostic reporting.
  - [x] T25.3.1.3: Write integration tests validating pipeline chaining, short-circuiting on hard rejections, and accumulation of soft warnings.
  - [x] T25.3.1.4: Benchmark rule execution overhead verifying total pipeline run latency remains under 50ms for typical source changes.

---

## Phase 26: Decoupled Historical Arena Ingestion & Stochastic Hyperparameter Optimization
*RDF Category: `spec:StochasticRuleOptimizationCategory`*

### T26.1: Historical Arena Telemetry Ingestion & Dataset Normalization (`spec:HistoricalArenaIngestion`)
- [x] T26.1.1: Decoupled Data Extraction Adapter:
  - [x] T26.1.1.1: Implement `HistoricalArenaIngestionAdapter` in `@cacophony/engine` reading external telemetry from `~/projects/drumalyzer/data/arena/` without relying on legacy bash or JS runners.
  - [x] T26.1.1.2: Ingest summary telemetry from `stats.json` (3,584 total tasks: 624 completed, 2,960 failed) into `historical_arenas` table.
  - [x] T26.1.1.3: Parse individual task records from `data/arena/completed/`, `data/arena/failed/`, and `data/arena/exhausted/` directories.
  - [x] T26.1.1.4: Ingest failure postmortems and error stack traces from `data/arena/postmortems/` into `historical_postmortems` table.
  - [x] T26.1.1.5: Ingest patch diff files from `data/arena/patches/` and lineage DAGs from `data/arena/lineage/`.
- [x] T26.1.2: Telemetry Normalization & Mitigation Paradox Analysis:
  - [x] T26.1.2.1: Normalize legacy failure codes (`review_failed: 1049`, `validation_failed: 134`, `disallowed_root_files: 84`, `test_failed: 167`, `no_changes_produced: 1520`).
  - [x] T26.1.2.2: Implement `MitigationParadoxAnalyzer`: Calculate the ratio of deterministic validation rejections vs real test assertion failures across historical models.
  - [x] T26.1.2.3: Generate baseline report demonstrating how overly rigid verifiers artificially inflated failure rates from ~4.6% (real test failures) to over 33% (rejections).
  - [x] T26.1.2.4: Export normalized dataset into benchmark test suite for offline rule backtesting.

### T26.2: Offline Rule Pipeline Backtesting Engine (`spec:RuleBacktestingEngine`)
- [x] T26.2.1: Backtest Execution Runner:
  - [x] T26.2.1.1: Implement `RuleBacktestRunner` capable of replaying historical model diffs against arbitrary candidate rule pipelines.
  - [x] T26.2.1.2: Simulate rule execution across 3,500+ historical patches, measuring: would-be auto-repairs, avoided rejections, and test outcomes.
  - [x] T26.2.1.3: Calculate counterfactual pass rates: determine how many of the 1,049 `review_failed` tasks would have passed under `silent_repair` or `soft_warning` policies.
  - [x] T26.2.1.4: Multi-threaded backtest execution leveraging worker threads to evaluate thousands of candidate configurations in seconds.

### T26.3: Stochastic Hyperparameter Search Engine (`spec:HyperparameterOptimizationEngine`)
- [x] T26.3.1: Search Space Definition & Objective Formulation:
  - [x] T26.3.1.1: Define typed search space covering: rule enablement (boolean vector), rule severity mode, timeout limits, regex tolerances, and pipeline ordering.
  - [x] T26.3.1.2: Formulate multi-objective loss function balancing pass rate ($w_{\text{pass}}$), false rejection rate ($w_{\text{false}}$), execution latency ($w_{\text{lat}}$), and code change churn ($w_{\text{churn}}$).
  - [x] T26.3.1.3: Implement Stochastic Random Search sampler evaluating uniformly and Gaussian-distributed configuration candidates.
  - [x] T26.3.1.4: Implement Genetic / Evolutionary Pipeline Optimizer: mutating rule toggles, swapping pipeline order, and breeding high-performing configurations over $N$ generations.
  - [x] T26.3.1.5: Implement Bayesian Optimization (using Gaussian Process surrogate with Expected Improvement acquisition) for continuous rule hyperparameters.
- [x] T26.3.2: Automated Configuration Profile Generation:
  - [x] T26.3.2.1: Run optimization across model categories: emitting tuned pipelines for `qwen2.5-coder:7b-4k`, `deepseek-r1:8b-4k`, `gemma3:4b-it-qat`, and future architectures.
  - [x] T26.3.2.2: Export winning hyperparameter configurations as declarative pipeline files in `conf/pipelines/optimized/`.
  - [x] T26.3.2.3: Expose optimization CLI: `cacophony rules optimize --dataset=historical-arena --strategy=genetic --generations=50`.
  - [x] T26.3.2.4: Write unit and integration tests verifying backtest accuracy and optimizer convergence.

---

## Phase 27: Autonomous Hardware Feature Discovery & Whitebox Ollama Tuning
*RDF Category: `spec:AutonomousHardwareCategory`*

### T27.1: Host Hardware Probing & Multi-Vendor Capability Scanner (`spec:HardwareProbingEngine`)
- [x] T27.1.1: Host Architecture & Device Scanner:
  - [x] T27.1.1.1: Implement `HardwareDiscoveryEngine` in `@cacophony/engine` querying Linux `/sys` and `/proc` filesystems without external binary dependencies.
  - [x] T27.1.1.2: Read `/sys/class/drm/card*/device/vendor` and `device` discovering all discrete and integrated GPU devices.
  - [x] T27.1.1.3: Probe sysfs `/sys/class/kfd/kfd/topology/nodes/` extracting AMD APU/GPU compute topology, SIMD engine count, and GTT memory aperture.
  - [x] T27.1.1.4: Probe unified system memory: calculate host RAM, swap configuration, and shared VRAM allocation for APUs (Cezanne / Vega gfx900).
  - [x] T27.1.1.5: Detect secondary vendor tool availability in PATH (`lspci`, `lshw`, `lsusb`, `rocminfo`, `vulkaninfo`, `nvidia-smi`, `clinfo`).
- [x] T27.1.2: Device Classification & Profile Recommendation:
  - [x] T27.1.2.1: Classify candidate compute devices into normalized categories: `AMD_APU_VEGA`, `AMD_DISCRETE_RDNA`, `NVIDIA_CUDA`, `INTEL_ARC`, `APPLE_SILICON`, `CPU_FALLBACK`.
  - [x] T27.1.2.2: Map detected hardware against known compute backend matrix: Vulkan vs ROCm vs CUDA vs Metal.
  - [x] T27.1.2.3: Identify hardware constraints (e.g. APU compute ring watchdog timeouts, absence of dedicated VRAM, lack of native Flash Attention in older GCN/Vega architectures).
  - [x] T27.1.2.4: Generate typed `HardwareDiscoveryReport` exposing detected devices, recommended hardware profile ID, and risk warnings.
  - [ ] T27.1.2.5: Document and show in the UI for the user what tools they need to install (`apt install radeontop lm-sensors btop ...`) to enable hardware monitoring and capabilities that were disabled due to missing system tools.

### T27.2: Whitebox Ollama Systemd Configuration & Override Generator (`spec:OllamaWhiteboxTuning`)
- [x] T27.2.1: Whitebox Override Generator:
  - [x] T27.2.1.1: Implement `OllamaSystemdGenerator` producing service drop-in configuration (`/etc/systemd/system/ollama.service.d/override.conf`) and environment definitions.
  - [x] T27.2.1.2: Default AMD Vega Profile Generator:
    - Generate `OLLAMA_IGPU_ENABLE=1`, `OLLAMA_VULKAN=1`, `OLLAMA_FLASH_ATTENTION=0`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1`, `OLLAMA_KEEP_ALIVE=-1`, `OLLAMA_DEBUG=1`, `OLLAMA_HOST=0.0.0.0`.
    - Generate kernel module parameter configuration `/etc/modprobe.d/amdgpu.conf` with `options amdgpu lockup_timeout=120000` to prevent compute ring resets.
  - [x] T27.2.1.3: AMD RDNA2/3 Profile Generator:
    - Generate `HSA_OVERRIDE_GFX_VERSION=10.3.0` (or `11.0.0`), `OLLAMA_FLASH_ATTENTION=1`, ROCm backend enablement.
  - [x] T27.2.1.4: NVIDIA CUDA Profile Generator:
    - Generate `CUDA_VISIBLE_DEVICES`, `OLLAMA_FLASH_ATTENTION=1`, `OLLAMA_NUM_PARALLEL=2`, compute capability flags.
  - [x] T27.2.1.5: Apple Silicon & CPU Fallback Profile Generator:
    - Generate thread pool sizing matched to CPU performance cores (`OLLAMA_NUM_THREADS`).
- [x] T27.2.2: Dry-Run, Diff Inspection & Safe Provisioning CLI:
  - [x] T27.2.2.1: Implement CLI command `cacophony hardware inspect` printing human-readable hardware inventory and detected GPUs.
  - [x] T27.2.2.2: Implement CLI command `cacophony hardware generate-overrides` displaying exact file diffs for `/etc/systemd/system/ollama.service.d/override.conf` and `/etc/modprobe.d/amdgpu.conf`.
  - [x] T27.2.2.3: Provide optional `--apply` flag that checks for root/sudo elevation, writes configuration files, executes `systemctl daemon-reload`, and verifies Ollama health.
  - [x] T27.2.2.4: Provide automatic rollback backup files (`override.conf.bak`) before modifying existing system configuration.

### T27.3: Hardware Profile Benchmarking & Adaptive Context Tuning (`spec:HardwareBenchmarking`)
- [x] T27.3.1: Automated Micro-Benchmark Suite:
  - [x] T27.3.1.1: Implement `HardwareBenchmarkRunner` executing standardized inference probes against Ollama.
  - [x] T27.3.1.2: Measure prompt ingestion throughput (tokens/sec) across context window sizes (2k, 4k, 8k, 16k, 32k).
  - [x] T27.3.1.3: Measure generation throughput (tokens/sec) and time-to-first-token (TTFT).
  - [x] T27.3.1.4: Monitor host RAM and VRAM utilization during inference, detecting memory thrashing or swap allocation.
  - [x] T27.3.1.5: Detect GPU driver hangs or Vulkan device lost errors, automatically identifying the maximum stable context ceiling.
- [x] T27.3.2: Adaptive Hardware Profile Persistence:
  - [x] T27.3.2.1: Save calibrated hardware profile in `hardware_profiles` database table and `conf/hardware.json`.
  - [x] T27.3.2.2: Wire runtime scheduler to enforce calibrated context ceilings and concurrency limits based on the active hardware profile.
  - [x] T27.3.2.3: Write automated integration tests for hardware scanner and profile generator.

---

## Phase 28: Stochastic Exploration Scheduler & Multi-Armed Bandit Dispatcher
*RDF Category: `spec:StochasticSchedulingCategory`*

### T28.1: Multi-Armed Bandit Scheduling & Epsilon-Greedy Dispatcher (`spec:BanditScheduler`)
- [x] T28.1.1: Bandit Policy Engine:
  - [x] T28.1.1.1: Implement `BanditTaskScheduler` in `@cacophony/engine` wrapping the single-concurrency queue dispatcher.
  - [x] T28.1.1.2: Implement Epsilon-Greedy Policy ($\epsilon \in [0.05, 0.25]$, configurable via `.env` `SCHEDULER_EXPLORATION_RATE=0.15`):
    - With probability $1 - \epsilon$: Exploit the highest-rated model for the requested role based on historical win rate.
    - With probability $\epsilon$: Explore a randomly sampled qualified candidate model or expanded configuration.
  - [x] T28.1.1.3: Implement Upper Confidence Bound (UCB-1) Policy calculating uncertainty bonus: $\text{score}_i = \bar{X}_i + c \sqrt{\frac{\ln N}{n_i}}$.
  - [x] T28.1.1.4: Implement Thompson Sampling Policy sampling from posterior Beta distribution $Beta(\alpha_i, \beta_i)$ for each candidate arm.
  - [x] T28.1.1.5: Ensure exploration never violates active hardware safety constraints (e.g. never exceeds hardware profile context or VRAM ceiling).
- [x] T28.1.2: Multi-Dimensional Exploration Spaces:
  - [x] T28.1.2.1: Model Architecture Exploration: Randomly trial non-primary models (e.g. give a code task to `deepseek-r1:8b`, `phi4-mini`, or `llama3.1` instead of default `qwen2.5-coder`).
  - [x] T28.1.2.2: Context Window Tier Exploration: Dynamically test larger context windows (e.g. 8k or 16k instead of standard 4k) when VRAM headroom permits.
  - [x] T28.1.2.3: Sampling Hyperparameter Exploration: Vary temperature ($\pm 0.15$), top_p, and repetition penalties to gather empirical generation diversity.
  - [x] T28.1.2.4: Log every exploration event with explicit tag `task.is_exploratory = true` and `task.exploration_rationale`.

### T28.2: Empirical Reward Function & Dynamic Promotion Engine (`spec:DynamicPromotionEngine`)
- [x] T28.2.1: Multi-Factor Reward Formulation:
  - [x] T28.2.1.1: Calculate empirical reward $R \in [-1.0, 1.0]$ upon task stage completion:
    - $+1.0$: Tests pass cleanly on first attempt without remediation.
    - $+0.8$: Tests pass after deterministic rule remediation (e.g. ESM `.js` import fix).
    - $+0.3$: Code generates syntactically valid AST but fails unit test assertion.
    - $-0.2$: Code rejected by deterministic validation rules.
    - $-0.5$: Code produces syntax error or compiler fatal error.
    - $-1.0$: Inference triggers GPU crash, driver timeout, or thermal abort.
  - [x] T28.2.1.2: Update model posterior parameters ($\alpha, \beta$) and rolling Elo ratings in `model_registry` table.
- [x] T28.2.2: Dynamic Retry Escalation & Role Promotion:
  - [x] T28.2.2.1: When a primary model fails a task stage, query the bandit policy for the highest-potential alternative candidate rather than a hardcoded static fallback.
  - [x] T28.2.2.2: Implement dynamic role promotion: when an exploratory model's empirical win rate significantly exceeds the primary model ($p < 0.05$ binomial test), propose or automatically update the default role assignment in `conf/cacophony.json`.
  - [x] T28.2.2.3: Persist dynamic promotion history in `model_promotions` table with statistical justification.

### T28.3: Mobile-First Frontend Telemetry & Stochastic Control Dashboard (`spec:StochasticUiDashboard`)
- [x] T28.3.1: Angular Telemetry & Exploration UI:
  - [x] T28.3.1.1: Create `ExplorationControlComponent` (standalone) in `/models` route displaying live exploration rate slider ($\epsilon$), active policy (Epsilon-Greedy vs UCB vs Thompson), and current exploration trials count.
  - [x] T28.3.1.2: Render interactive Beta distribution curve visualizations showing uncertainty and confidence intervals per model.
  - [x] T28.3.1.3: Render 2D Pareto-Frontier scatter plot (Success Rate % vs Tokens/Second vs VRAM footprint) with model comparison overlays.
  - [x] T28.3.1.4: Add "Exploratory Run" badge to Task Card and Gantt Transport timeline for all tasks executed under exploration policy.
  - [x] T28.3.1.5: Implement Rule Pipeline Visualizer in `/settings` route allowing operators to toggle individual rules on/off, adjust severities, and view counterfactual pass rates.
- [x] T28.3.2: Automated Verification:
  - [x] T28.3.2.1: Write unit tests verifying epsilon-greedy probabilistic distribution and random seed reproducibility.
  - [x] T28.3.2.2: Write integration tests verifying UCB-1 and Thompson sampling convergence towards optimal models on synthetic task series.
  - [x] T28.3.2.3: Write e2e tests asserting telemetry updates and live UI signal synchronization on the Angular dashboard.
