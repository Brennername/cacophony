# Active Feature Planning & Taskcade Specification (`docs/planning.md`)

> [!IMPORTANT]
> **Operational Purpose & Authoring Directive:**
> This document serves as the formal architectural bridge between long-term conceptual ideas ([`docs/future.md`](file:///home/nexen/projects/cacophony/docs/future.md)) and executable work phases in [`docs/taskcade.md`](file:///home/nexen/projects/cacophony/docs/taskcade.md).
> Only features that have been explicitly selected and approved by the user for active design and implementation are documented here.
> For each selected feature, the AI assistant must:
> 1. Formulate clear architectural designs, contracts, interfaces, and database schemas adhering to SOLID principles and strict typing.
> 2. Break down the design into structured, numbered phases with atomic subtasks.
> 3. Define explicit automated verification gates (unit, integration, and e2e tests).
> 4. Export the finalized phases directly into [`docs/taskcade.md`](file:///home/nexen/projects/cacophony/docs/taskcade.md) to drive execution.

---

## 1. Selected Features for Current Execution Era

### 1.1 Authentik & Authelia Enterprise SSO Provider Integration
- **Objective**: Replace Gitea as identity provider with Authentik (OIDC/OAuth2) and provide adapter for Authelia.
- **Architectural Scope**:
  - Container compose definitions for Authentik server, worker, and Redis cache.
  - Pluggable `ISsoProvider` interface with `AuthentikOAuthProvider` and `AutheliaSsoProvider` implementations.
  - Automated blueprint onboarding script (`bin/bootstrap-authentik.sh`) avoiding manual UI setup.
- **Assigned Taskcade Phase**: Phase 17 (`spec:AuthentikArchitecture`, `spec:AuthentikOnboarding`).

### 1.2 Full-Stack Real Data Pipeline & Elimination of Mocks
- **Objective**: Purge all hardcoded mock signals (`ArenaStateStore`, `HistoryMetricsService`, `RepoMapViewerComponent`, `CheckpointTimelineComponent`, `LspTestLoopPanelComponent`) and wire 100% of data flow to real database repositories and sysfs sensor streams.
- **Architectural Scope**:
  - Dedicated Angular data services (`TaskApiService`, `ProcessMonitorService`, `TelemetryStreamService`, `HistoryApiService`, `RepoMapApiService`, `GitCheckpointApiService`).
  - Backend REST API expansion (`GET /api/history`, `GET /api/models/leaderboard`, `GET /api/processes`, `GET /api/repomap`, `GET /api/checkpoints`).
  - Hardened SSE streaming protocol with heartbeat pings and event filtering.
- **Assigned Taskcade Phase**: Phase 18 (`spec:EliminateFrontendMocks`, `spec:BackendApiExpansion`).

### 1.3 Network-Agnostic URL Resolution & Multi-Device Access
- **Objective**: Support access from any device (phone over Wi-Fi LAN, VPN, reverse proxy domain) without hardcoding `localhost`.
- **Architectural Scope**:
  - Host header inspection (`X-Forwarded-Host`, `Host`) dynamically formatting redirect URIs and API endpoints.
  - Cross-Origin Resource Sharing (CORS) and CSP rules adapting to client ingress IP.
- **Assigned Taskcade Phase**: Phase 19 (`spec:DynamicHostResolution`).

### 1.4 Mobile-First Routed Navigation & High-Density Desktop Layout
- **Objective**: Replace monolithic single-page forever-scroll with modular Angular child routing (`/dashboard`, `/queue`, `/history`, `/models`, `/repomap`, `/processes`, `/settings`), mobile slide-out drawer, mobile bottom navigation bar, and dense auto-fitting desktop grid.
- **Architectural Scope**:
  - Angular Router configuration with standalone lazy-loaded view components.
  - Mobile bottom navigation bar and slide-out hamburger drawer with WCAG tap targets > 48px.
  - CSS Grid with `grid-auto-flow: dense` eliminating empty column gaps on desktop displays.
- **Assigned Taskcade Phase**: Phase 20 (`spec:AngularRouting`, `spec:DesktopGridOptimization`).

### 1.5 Real-Time Task Progress, Granular Stages & Gantt Transport
- **Objective**: Granular multi-stage progress tracking (`1/7 Planning` through `7/7 PR Review`) with progress bars, intra-stage token velocity, and audio DAW-inspired interactive Gantt timeline.
- **Architectural Scope**:
  - Segmented progress bar components and intra-stage token velocity gauges.
  - `GanttTransportComponent` rendering concurrent model inference, background test runs, and git operations on stacked swimlanes.
- **Assigned Taskcade Phase**: Phase 21 (`spec:MultiLevelProgress`, `spec:GanttTransportTimeline`).

### 1.6 Historical Failure Taxonomy & Area-Under-Curve (AOC) Visualizations
- **Objective**: Deterministic error categorization and KDE System Monitor aesthetic multi-series trend lines with shaded area-under-curve visualizations.
- **Architectural Scope**:
  - `FailureClassifier` mapping errors to normalized categories (`SYNTAX_ERROR`, `TEST_ASSERTION_FAILURE`, etc.).
  - Lightweight SVG `TrendChartComponent` rendering semi-transparent AOC graphs and interactive hover tooltips.
- **Assigned Taskcade Phase**: Phase 22 (`spec:FailureTaxonomy`, `spec:AocCharts`).

### 1.7 AST Code Signature Compression & Mechanistic Interface Enforcement
- **Objective**: Maximize local model first-pass success rate by extracting deep AST signature maps, exposing queryable MCP tools, and mechanistically aligning hallucinations before test execution.
- **Architectural Scope**:
  - `SignatureHarvester` extracting compact type shapes and constructor overloads across TypeScript, Java, and Go.
  - Model Context Protocol (MCP) tools: `query_data_shape`, `query_functional_interface`, `query_overload_map`.
  - `SignatureAlignmentScrubber` deterministically correcting parameter typos and mismatched argument orders.
- **Assigned Taskcade Phase**: Phase 23 (`spec:SignatureMapExtraction`, `spec:MechanisticCorrection`).

### 1.8 Distributed Multi-Node Fleet Architecture & Hardware Profiling
- **Objective**: Multi-machine coordinator/worker cluster with automated hardware profiling across NVIDIA, modern AMD RDNA, and Apple Silicon nodes.
- **Architectural Scope**:
  - `FleetMasterCoordinator` scheduling tasks across remote worker daemons over persistent WebSockets.
  - Hardware telemetry providers for NVML, AMD RDNA, and macOS `powermetrics`.
  - Hardware benchmark suite establishing optimal batch sizes and context limits per card.
- **Assigned Taskcade Phase**: Phase 24 (`spec:FleetTopology`, `spec:HardwareProfiling`).
