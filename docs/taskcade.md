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

## Active Milestone Era: System Hardening, Authentik SSO, Full-Stack Real Data, Mobile-First Routed UI & Mechanistic Code Synthesis

*See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 16.*

---

## Phase 17: Authentik & Authelia Enterprise SSO Provider Integration
*RDF Category: `spec:AuthenticationAndIdentityCategory`*

### T17.1: Authentik Provider Architecture & Container Orchestration (`spec:AuthentikArchitecture`)
- [ ] T17.1.1: Container Topology & Compose Service Definition:
  - [ ] T17.1.1.1: Define Authentik server and worker services in `docker-compose.yml` with configurable ports (`PORT_AUTHENTIK_HTTP:-9000`, `PORT_AUTHENTIK_HTTPS:-9443`).
  - [ ] T17.1.1.2: Configure Redis cache container and PostgreSQL/PGlite database credentials for Authentik state storage.
  - [ ] T17.1.1.3: Bind Authentik storage volumes (`authentik-media`, `authentik-templates`, `authentik-certs`) with non-root ownership.
  - [ ] T17.1.1.4: Configure internal Docker network bridge (`cacophony-net`) allowing seamless resolution between Engine, Authentik, and Gitea.
- [ ] T17.1.2: Environment Configuration & Secret Management:
  - [ ] T17.1.2.1: Add `AUTHENTIK_SECRET_KEY`, `AUTHENTIK_BOOTSTRAP_PASSWORD`, and `AUTHENTIK_BOOTSTRAP_TOKEN` variables to `.env.example` and `.env`.
  - [ ] T17.1.2.2: Implement automatic generation of cryptographically secure Authentik secret keys during workspace initialization script.
  - [ ] T17.1.2.3: Integrate Authentik service discovery URLs into typed `AuthConfig` schema in `@cacophony/shared-types`.
- [ ] T17.1.3: Multi-Provider SSO Abstraction (`spec:SsoProviderAbstraction`):
  - [ ] T17.1.3.1: Define `ISsoProvider` interface in `@cacophony/engine` with methods: `getAuthorizationUrl()`, `exchangeCode()`, `verifyToken()`, `getUserProfile()`.
  - [ ] T17.1.3.2: Implement `AuthentikOAuthProvider` implementing OIDC discovery (`.well-known/openid-configuration`), JWKS token verification, and user claims extraction.
  - [ ] T17.1.3.3: Implement `AutheliaSsoProvider` adapter supporting forward-auth headers (`Remote-User`, `Remote-Email`, `Remote-Groups`) and OIDC fallback.
  - [ ] T17.1.3.4: Implement `SsoProviderFactory` dynamically selecting active provider based on `SSO_PROVIDER=authentik|authelia|gitea|local` in `.env`.

### T17.2: Automated Provisioning & Onboarding Induction Pipeline (`spec:AuthentikOnboarding`)
- [ ] T17.2.1: Programmatic Blueprint & Bootstrap Script:
  - [ ] T17.2.1.1: Author Authentik declarative blueprint YAML defining default execution flow, user stage, and OAuth2/OIDC Application.
  - [ ] T17.2.1.2: Create `bin/bootstrap-authentik.sh` CLI script automating API token generation, application client ID/secret extraction, and redirect URI registration.
  - [ ] T17.2.1.3: Synchronize generated client ID and secret into `.env` automatically without manual web UI copy-pasting.
- [ ] T17.2.2: New User Induction & Role Mapping:
  - [ ] T17.2.2.1: Map Authentik groups (`cacophony-admins`, `cacophony-operators`, `cacophony-viewers`) to internal RBAC roles in `SecretVault`.
  - [ ] T17.2.2.2: Implement first-run induction wizard in Angular frontend detecting unconfigured SSO and prompting initial admin onboarding.
  - [ ] T17.2.2.3: Support local emergency bypass account in `PGliteDriver` when SSO provider is unreachable or in air-gapped deployments.
- [ ] T17.2.3: Automated Testing & Token Validation:
  - [ ] T17.2.3.1: Write unit tests verifying `AuthentikOAuthProvider` OIDC token validation, clock skew tolerance, and signature verification.
  - [ ] T17.2.3.2: Write integration tests verifying `AutheliaSsoProvider` header extraction and session cookie serialization.
  - [ ] T17.2.3.3: Write e2e tests asserting successful login redirect, token exchange, and JWT issuance across the container stack.

---

## Phase 18: Full-Stack Real Data Pipeline & Elimination of Mocks
*RDF Category: `spec:RealDataPipelinesCategory`*

### T18.1: Frontend Mock Audit & Elimination (`spec:EliminateFrontendMocks`)
- [ ] T18.1.1: Complete Audit of Frontend Mocked Signals:
  - [ ] T18.1.1.1: Audit `ArenaStateStore` (`packages/frontend/src/app/services/arena-state.store.ts`) removing hardcoded mock telemetry defaults (GPU 18%, VRAM 2150MB, etc.).
  - [ ] T18.1.1.2: Remove hardcoded task items (`task-101`, `task-102`, `task-103`) from `ArenaStateStore.tasks` signal initialization.
  - [ ] T18.1.1.3: Remove hardcoded process items (`proc-1`, `proc-2`) from `ArenaStateStore.processes` signal initialization.
  - [ ] T18.1.1.4: Audit `HistoryMetricsService` (`packages/frontend/src/app/services/history-metrics.service.ts`) removing hardcoded mock items (`task-089`, `task-088`, etc.).
  - [ ] T18.1.1.5: Remove hardcoded model leaderboard entries from `HistoryMetricsService` and bind directly to database queries.
  - [ ] T18.1.1.6: Audit `RepoMapViewerComponent` removing hardcoded node arrays (`sym-1`, `sym-2`) and binding to backend repo map API.
  - [ ] T18.1.1.7: Audit `CheckpointTimelineComponent` removing hardcoded checkpoint records (`cp-1`, `cp-2`) and binding to `GitCheckpointRepository`.
  - [ ] T18.1.1.8: Audit `LspTestLoopPanelComponent` removing static diagnostic objects and binding to live compiler diagnostic event streams.
- [ ] T18.1.2: End-to-End Reactive Data Services:
  - [ ] T18.1.2.1: Implement `TaskApiService` in Angular connecting to `GET /api/tasks`, `POST /api/tasks`, `GET /api/tasks/:id`, and `DELETE /api/tasks/:id`.
  - [ ] T18.1.2.2: Implement `ProcessMonitorService` in Angular consuming live process execution streams via SSE (`/api/events`).
  - [ ] T18.1.2.3: Implement `TelemetryStreamService` in Angular maintaining persistent EventSource connection and pushing real sensor updates to Signals.
  - [ ] T18.1.2.4: Implement `HistoryApiService` in Angular fetching paginated historical task records, stage execution logs, and model win rates.
  - [ ] T18.1.2.5: Implement `RepoMapApiService` in Angular fetching dynamic architectural symbol graphs generated by `RepoMapGenerator`.
  - [ ] T18.1.2.6: Implement `GitCheckpointApiService` in Angular executing live `/undo`, `/redo`, and micro-checkpoint timeline queries.
  - [ ] T18.1.2.7: Implement offline reconnect and backoff retry logic for all SSE streams and REST API consumers.

### T18.2: Backend REST & SSE API Expansion (`spec:BackendApiExpansion`)
- [ ] T18.2.1: Extended REST Endpoints:
  - [ ] T18.2.1.1: Implement `GET /api/history` with query parameters (`page`, `limit`, `modelId`, `status`) querying `task_stages` and `tasks`.
  - [ ] T18.2.1.2: Implement `GET /api/models/leaderboard` calculating dynamic win rates, total tasks, and average tokens/sec from database tables.
  - [ ] T18.2.1.3: Implement `GET /api/processes` listing recently executed test runners, linters, and git subprocesses with exit codes.
  - [ ] T18.2.1.4: Implement `GET /api/repomap` accepting target directory path and returning ranked AST symbol graph JSON.
  - [ ] T18.2.1.5: Implement `GET /api/checkpoints` and `POST /api/checkpoints/undo`, `POST /api/checkpoints/redo` wired directly to `GitUndoManager`.
  - [ ] T18.2.1.6: Implement `GET /api/diagnostics` exposing active workspace LSP compiler diagnostics grouped by file and severity.
- [ ] T18.2.2: Server-Sent Events (SSE) Protocol Hardening:
  - [ ] T18.2.2.1: Structure SSE message envelopes with typed events: `telemetry`, `task_stage`, `process_spawn`, `token_stream`, `lsp_diagnostic`.
  - [ ] T18.2.2.2: Implement client heartbeat ping/pong (`:keepalive\n\n`) every 15 seconds to prevent proxy connection termination.
  - [ ] T18.2.2.3: Implement per-client event subscription filtering to optimize network payload on mobile devices over Wi-Fi.

---

## Phase 19: Network-Agnostic URL Resolution & Multi-Device Access
*RDF Category: `spec:NetworkAgnosticRoutingCategory`*

### T19.1: Dynamic Host & IP Resolution (`spec:DynamicHostResolution`)
- [ ] T19.1.1: Header-Based Host Translation:
  - [ ] T19.1.1.1: Eliminate all hardcoded `http://localhost:...` strings across frontend services and backend redirect generators.
  - [ ] T19.1.1.2: Implement dynamic host resolution middleware in `CacophonyHttpServer` inspecting `X-Forwarded-Host`, `X-Forwarded-Proto`, and `Host` headers.
  - [ ] T19.1.1.3: Provide resolved origin context to Angular frontend via `GET /api/config/network` (exposing client-visible base URL).
- [ ] T19.1.2: Wi-Fi LAN & Mobile Access Adaptation:
  - [ ] T19.1.2.1: Detect incoming client connection interface (loopback `127.0.0.1` vs LAN IP `192.168.x.x` vs tailscale/wireguard IP).
  - [ ] T19.1.2.2: Format OAuth2 redirect URIs and Gitea/Authentik public URLs dynamically matching the client's ingress route.
  - [ ] T19.1.2.3: Add network profile configuration options in `conf/cacophony.example.json` (`local_only`, `lan_shared`, `reverse_proxy`, `custom_domain`).
- [ ] T19.1.3: Cross-Origin Resource Sharing (CORS) & Security Policies:
  - [ ] T19.1.3.1: Configure dynamic CORS headers in `CacophonyHttpServer` permitting requests from detected LAN IP subnets.
  - [ ] T19.1.3.2: Configure Content Security Policy (CSP) headers permitting WebSocket and SSE connections from LAN origins.
  - [ ] T19.1.3.3: Write automated integration tests asserting successful API access and OAuth redirects from remote IP simulation.

---

## Phase 20: Mobile-First Routed Navigation & High-Density Desktop Layout
*RDF Category: `spec:ResponsiveInterfaceCategory`*

### T20.1: Angular Router Architecture & Route Modularization (`spec:AngularRouting`)
- [ ] T20.1.1: Route Structure & View Decomposition:
  - [ ] T20.1.1.1: Replace monolithic single-page forever-scroll in `AppComponent` with structured Angular child routing.
  - [ ] T20.1.1.2: Create `/dashboard` route: System vitals header, active running task card, and compact live queue snapshot.
  - [ ] T20.1.1.3: Create `/queue` route: Full task queue management, drag-and-drop reordering, priority filters, and enqueue drawer.
  - [ ] T20.1.1.4: Create `/history` route: Audited execution runs, failure cause taxonomy, diff comparisons, and Gitea PR links.
  - [ ] T20.1.1.5: Create `/models` route: Model health leaderboard, eviction statistics, tokens/sec gauges, and fallback matrices.
  - [ ] T20.1.1.6: Create `/repomap` route: Full-screen interactive SVG/Canvas repository dependency graph with pan/zoom.
  - [ ] T20.1.1.7: Create `/processes` route: Non-model test runners, linter executions, git worktrees, and shell audits.
  - [ ] T20.1.1.8: Create `/settings` route: Theme selection, SSO configuration, network profiles, and vault secrets manager.
- [ ] T20.1.2: Mobile Responsive Navigation:
  - [ ] T20.1.2.1: Design and implement mobile slide-out Hamburger Drawer with swipe gestures for narrow viewports (< 768px).
  - [ ] T20.1.2.2: Implement Mobile Bottom Navigation Bar (`Dashboard`, `Queue`, `History`, `Models`, `More`) with tap targets > 48px.
  - [ ] T20.1.2.3: Eliminate header button horizontal overflow on mobile screens; collapse secondary actions into contextual kebab menu.
  - [ ] T20.1.2.4: Ensure 100% compliance with mobile accessibility standards (WCAG tap targets, ARIA labels, focus states).

### T20.2: High-Density Desktop Grid & Gap Elimination (`spec:DesktopGridOptimization`)
- [ ] T20.2.1: CSS Grid Flow & Auto-Fitting Layout Engine:
  - [ ] T20.2.1.1: Refactor desktop layout from rigid 2-column grid to dynamic CSS Grid with `grid-auto-flow: dense` and masonry-inspired packing.
  - [ ] T20.2.1.2: Implement card height expansion (`display: flex; flex: 1`) preventing blank vertical gaps at column bottoms.
  - [ ] T20.2.1.3: Ensure `ProcessInspectorComponent` and `QueueManagerComponent` fluidly resize and consume remaining viewport height.
  - [ ] T20.2.1.4: Provide customizable desktop dashboard widget layout with persistent localStorage layout preferences.
- [ ] T20.2.2: Responsive Visual Polish:
  - [ ] T20.2.2.1: Verify smooth transitions across Dark, Light, and High-Contrast themes across all routes.
  - [ ] T20.2.2.2: Write component tests verifying route transitions and responsive breakpoint triggers.

---

## Phase 21: Real-Time Task Progress, Granular Stages & Gantt Transport
*RDF Category: `spec:RealtimeExecutionObservabilityCategory`*

### T21.1: Multi-Level Task Progress Tracking (`spec:MultiLevelProgress`)
- [ ] T21.1.1: Stage Pipeline Breakdown & Progress Metrics:
  - [ ] T21.1.1.1: Define structured stage steps in `TaskRepository`: `1/7 Planning`, `2/7 Context Assembly`, `3/7 Generation`, `4/7 Scrubbing`, `5/7 Test Verification`, `6/7 Remediation`, `7/7 PR Review`.
  - [ ] T21.1.1.2: Calculate task overall progress percentage (`task.progressPercent = (completedStages / totalStages) * 100`).
  - [ ] T21.1.1.3: Track sub-stage intra-progress (e.g. Generation token count vs context window limit; Test runs passed `x/y`).
- [ ] T21.1.2: Frontend Stage Progress Bar Components:
  - [ ] T21.1.2.1: Create `StageProgressBarComponent` (standalone): Animated segmented progress bar displaying active stage name and completion percentage.
  - [ ] T21.1.2.2: Add intra-stage token progress indicators and live tokens/second velocity meters.
  - [ ] T21.1.2.3: Support click-to-expand stage drawer showing live console log output for each completed or active stage.

### T21.2: Real-Time Transport & Interactive Gantt Timeline (`spec:GanttTransportTimeline`)
- [ ] T21.2.1: Timeline Data Model & Persistence:
  - [ ] T21.2.1.1: Persist high-precision timestamps (`started_at`, `completed_at`, `duration_ms`) for each task stage in `task_stages` table.
  - [ ] T21.2.1.2: Implement `GET /api/tasks/:id/gantt` returning timeline spans for all stages and spawned subprocesses.
- [ ] T21.2.2: Interactive Gantt Transport Component:
  - [ ] T21.2.2.1: Create `GanttTransportComponent` (standalone): Audio DAW-inspired horizontal timeline with moving playhead scrub bar.
  - [ ] T21.2.2.2: Render concurrent operations (model token streaming, background compiler test runs, git commit creation) on stacked swimlanes.
  - [ ] T21.2.2.3: Interactive zoom (`Ctrl + Scroll`) and time scrubber allowing post-mortem inspection of latency bottlenecks.
  - [ ] T21.2.2.4: Write unit tests validating progress calculation algorithms and timeline bounds.

---

## Phase 22: Historical Failure Taxonomy, Analytics & Area-Under-Curve (AOC) Visualizations
*RDF Category: `spec:AnalyticsAndMetricsCategory`*

### T22.1: Failure Mode Taxonomy & Classification Engine (`spec:FailureTaxonomy`)
- [ ] T22.1.1: Categorization Engine:
  - [ ] T22.1.1.1: Implement `FailureClassifier` in `@cacophony/engine` parsing task errors into normalized categories: `SYNTAX_ERROR`, `TEST_ASSERTION_FAILURE`, `TYPE_CHECK_ERROR`, `BANNED_IMPORT`, `THERMAL_THROTTLE`, `CONTEXT_OVERFLOW`, `TIMEOUT`.
  - [ ] T22.1.1.2: Persist failure taxonomy codes in `tasks.failure_category` and `task_stages.failure_code`.
- [ ] T22.1.2: Statistical Aggregation Services:
  - [ ] T22.1.2.1: Implement database aggregation queries calculating failure distributions per model and per stack profile.
  - [ ] T22.1.2.2: Implement `GET /api/analytics/failures` returning rolling trend data over configurable windows (24h, 7d, 30d).

### T22.2: Historical Trend Lines & Shaded Area-Under-Curve Charts (`spec:AocCharts`)
- [ ] T22.2.1: Charting Architecture:
  - [ ] T22.2.1.1: Create `TrendChartComponent` (standalone) using lightweight SVG rendering without heavy third-party bundle dependencies.
  - [ ] T22.2.1.2: Render KDE System Monitor aesthetic multi-series line graphs with semi-transparent shaded area-under-curve fills.
  - [ ] T22.2.1.3: Support toggling metrics: GPU Temperature vs Wattage, Success Rate Trend, Token Throughput, Failure Mode Frequencies.
- [ ] T22.2.2: Interactive Tooltips & Cross-Filtering:
  - [ ] T22.2.2.1: Implement hover tooltip displaying point-in-time metrics, active task title, and model name.
  - [ ] T22.2.2.2: Clicking a failure spike filters task history to the corresponding time window and failure category.
  - [ ] T22.2.2.3: Write component tests verifying SVG path rendering, coordinate scaling, and data updates.

---

## Phase 23: AST Code Signature Compression & Mechanistic Interface Enforcement
*RDF Category: `spec:MechanisticCodeSynthesisCategory`*

### T23.1: Codebase Signature Map Extraction & Storage (`spec:SignatureMapExtraction`)
- [ ] T23.1.1: AST Deep Type & Interface Harvester:
  - [ ] T23.1.1.1: Implement `SignatureHarvester` using TypeScript Compiler API extracting: exported function signatures, parameter names and types, return types, interface contracts, type aliases, class constructor overloads.
  - [ ] T23.1.1.2: Support Java AST parsing (via Tree-Sitter) extracting public class methods, parameters, and generic constraints.
  - [ ] T23.1.1.3: Support Go AST parsing extracting struct signatures, interfaces, and exported method receivers.
- [ ] T23.1.2: Compressed Signature Representation:
  - [ ] T23.1.2.1: Formulate ultra-compact signature notation minimizing token overhead when injected into local model prompts.
  - [ ] T23.1.2.2: Persist codebase signature index in `code_signature_index` relational table in `@cacophony/db`.
  - [ ] T23.1.2.3: Update signature index automatically via git commit hooks or file change watchers.

### T23.2: Queryable Model Tools for Signature Targeting (`spec:SignatureQueryTools`)
- [ ] T23.2.1: Model Context Protocol (MCP) Signature Tools:
  - [ ] T23.2.1.1: Implement `query_data_shape` tool allowing local models to query expected input/output interfaces of target functions.
  - [ ] T23.2.1.2: Implement `query_functional_interface` tool allowing models to inspect valid lambda parameters and method signatures.
  - [ ] T23.2.1.3: Implement `query_overload_map` tool returning valid argument permutations for polymorphic functions.
- [ ] T23.2.2: Prompt Generation Integration:
  - [ ] T23.2.2.1: Inject extracted signature map into task prompt as a strict target mini-specification.
  - [ ] T23.2.2.2: Provide models with explicit type constraints before generation begins to maximize first-pass success rate.

### T23.3: Mechanistic Correction & Hallucination Repair Pipeline (`spec:MechanisticCorrection`)
- [ ] T23.3.1: Pre-Test Deterministic Alignment Engine:
  - [ ] T23.3.1.1: Implement `SignatureAlignmentScrubber` running immediately after LLM code generation and before test execution.
  - [ ] T23.3.1.2: Detect common hallucination modes: misspelled parameter names, inverted argument orders, mismatched optional flags.
  - [ ] T23.3.1.3: Mechanistically rewrite generated function calls and method signatures to match the authoritative signature map.
- [ ] T23.3.2: Automated Verification:
  - [ ] T23.3.2.1: Write unit tests verifying signature extraction across complex TypeScript and Java classes.
  - [ ] T23.3.2.2: Write integration tests demonstrating successful mechanistic correction of misspelled parameters without test execution failure.
  - [ ] T23.3.2.3: Measure and log improvement in first-pass test pass rates across local models.

---

## Phase 24: Distributed Multi-Node Fleet Architecture & Hardware Profiling
*RDF Category: `spec:DistributedFleetCategory`*

### T24.1: Fleet Master/Node Topology & Registration Protocol (`spec:FleetTopology`)
- [ ] T24.1.1: Master Node Controller:
  - [ ] T24.1.1.1: Implement `FleetMasterCoordinator` in `@cacophony/engine` acting as the central scheduler and telemetry aggregator.
  - [ ] T24.1.1.2: Expose node registration endpoint `POST /api/fleet/register` with cryptographic node token authentication.
  - [ ] T24.1.1.3: Maintain cluster registry table `fleet_nodes` (node_id, hostname, ip, gpu_type, vram_mb, status, last_heartbeat).
- [ ] T24.1.2: Subservient Worker Node Daemon:
  - [ ] T24.1.2.1: Implement lightweight headless worker daemon running on remote machines with zero UI overhead.
  - [ ] T24.1.2.2: Establish persistent outbound WebSocket connection from worker node to master coordinator.
  - [ ] T24.1.2.3: Stream local hardware sensors (GPU load, VRAM, temp) and task execution heartbeats back to master.
- [ ] T24.1.3: Distributed Task Scheduling & Farm-Out Engine:
  - [ ] T24.1.3.1: Implement task dispatcher matching task model requirements to available node hardware capabilities.
  - [ ] T24.1.3.2: Farm out compilation, testing, and generation to remote nodes while maintaining master git branch synchronization.
  - [ ] T24.1.3.3: Handle worker node disconnects gracefully with automatic task reassignment and thermal failover.

### T24.2: Multi-GPU Hardware Profiling Engine (`spec:HardwareProfiling`)
- [ ] T24.2.1: Hardware Vendor Sensor Drivers:
  - [ ] T24.2.1.1: Implement `NvidiaTelemetryProvider` querying `NVML` / `nvidia-smi` (GPU utilization, VRAM, temp, power draw).
  - [ ] T24.2.1.2: Implement `AmdRDNAProvider` optimized for modern Radeon RX 7000/8000 series and high-end APUs.
  - [ ] T24.2.1.3: Implement `AppleSiliconProvider` querying `powermetrics` for unified memory macOS worker nodes.
- [ ] T24.2.2: Hardware Profile Database & Benchmark Suite:
  - [ ] T24.2.2.1: Create automated hardware capability prober testing quantization throughput (Q4_K_M, Q8_0, FP16) on each node.
  - [ ] T24.2.2.2: Save optimal batch sizes, context limits, and thermal thresholds per card in `hardware_profiles` table.
  - [ ] T24.2.2.3: Expose multi-node fleet overview and hardware diagnostics in Angular dashboard route `/fleet`.
