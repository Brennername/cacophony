# Cacophony System Entrypoints Catalog (`docs/entrypoints.md`)

This document serves as the comprehensive, authoritative catalog of all executable entrypoints, CLI commands, HTTP REST/SSE endpoints, Angular routes, WebSocket channels, MCP tools, and container port configurations across the Cacophony system.

---

## 1. Container Topology & Port Allocations

All service ports are dynamically configurable through `.env`. The defaults are:

| Subsystem / Service | Default Port | Protocol | Purpose & Access Route |
| :--- | :--- | :--- | :--- |
| **Angular Web Dashboard** | `24072` | HTTP | Mobile-first Angular application UI (`http://<host>:24072`) |
| **Cacophony Core Engine & API** | `24161` | HTTP / SSE | Express & PGlite backend server (`http://<host>:24161/api/*`) |
| **MCP Tool Server** | `21264` | HTTP / JSON | Model Context Protocol discovery & tool execution |
| **Gitea Web / Git HTTP** | `19634` | HTTP | Internal Gitea web interface and git smart HTTP |
| **Gitea Git SSH** | `17883` | SSH | Internal Git operations over SSH |
| **Authentik HTTP** | `9000` | HTTP | Identity Provider web interface & OIDC discovery |
| **Authentik HTTPS** | `9443` | HTTPS | Identity Provider TLS ingress |
| **Redis Cache** | `6379` | TCP | In-memory cache for Authentik session state |

---

## 2. Command-Line Interface (CLI) Entrypoints

All CLI entrypoints are accessible via npm scripts or the root executable binary.

### 2.1 Unified Production & Development Server
- **Run Unified Server (API + Frontend Bundle)**:
  ```bash
  npm start
  ```
  *Entrypoint*: `packages/engine/src/index.ts` / `bin/cacophony`
  *Description*: Initializes PGlite database, runs SQL migrations, binds HTTP server on port 24161, and serves the static production build of the Angular dashboard.

- **Run Engine in Watch/Development Mode**:
  ```bash
  npm run dev -w @cacophony/engine
  ```

- **Run Angular Frontend Development Server**:
  ```bash
  npm run start -w @cacophony/frontend
  # Served locally at http://localhost:4200 (or configured Vite/Angular dev port)
  ```

### 2.2 Terminal User Interface (TUI)
- **Launch Interactive Terminal App**:
  ```bash
  npm run tui -w @cacophony/engine
  # Or: cacophony tui
  ```
  *Entrypoint*: [`packages/engine/src/tui/TerminalApp.ts`](../packages/engine/src/tui/TerminalApp.ts)
  *Description*: Fullscreen curses-style terminal developer environment featuring ConversationPane, TelemetryBar, ContextInspectorPane, and live command palette.

### 2.3 Hardware Probing & Ollama Override Provisioning
- **Inspect Host Hardware & Compute Devices**:
  ```bash
  npm run cli -w @cacophony/engine -- hardware inspect
  # Or: cacophony hardware inspect
  ```
  *Entrypoint*: [`packages/engine/src/cli/hardwareCommand.ts`](../packages/engine/src/cli/hardwareCommand.ts)
  *Description*: Probes sysfs, `/sys/class/drm`, and `/sys/class/kfd`, printing detected APUs, discrete GPUs, RAM/VRAM allocations, and missing monitoring packages.

- **Generate Ollama Systemd & Kernel Overrides**:
  ```bash
  npm run cli -w @cacophony/engine -- hardware generate-overrides [--apply]
  ```
  *Description*: Displays diffs or provisions `/etc/systemd/system/ollama.service.d/override.conf` and `/etc/modprobe.d/amdgpu.conf` (`lockup_timeout=180000`).

### 2.4 Composable Repair Rules & Hyperparameter Optimization
- **Execute Stochastic Rule Pipeline Search**:
  ```bash
  npm run cli -w @cacophony/engine -- rules optimize --dataset=/path/to/arena/data --strategy=genetic --generations=50
  ```
  *Entrypoint*: [`packages/engine/src/optimization/StochasticHyperparameterOptimizer.ts`](../packages/engine/src/optimization/StochasticHyperparameterOptimizer.ts)
  *Description*: Runs Genetic or Bayesian hyperparameter optimization against versioned arena dataset archives (defaults to `ARENA_DATASET_DIR` or `./data/arena/`) and exports optimized configurations to `conf/pipelines/optimized/`. Supports dataset schema versions (e.g. `v1.0.0` legacy and `v2.0.0` standard).

### 2.5 Authentik Automated Bootstrapper
- **Bootstrap Authentik OIDC Application**:
  ```bash
  bin/bootstrap-authentik.sh
  ```
  *Description*: Programmatically configures Authentik user stages, creates OAuth2 provider credentials, and syncs `AUTHENTIK_CLIENT_ID` and `AUTHENTIK_CLIENT_SECRET` into `.env`.

---

## 3. Backend HTTP REST & Server-Sent Events (SSE) API

Base URL: `http://<host>:24161` (Supports reverse proxy headers `X-Forwarded-Host`, `Host`).

### 3.1 Tasks & Scheduler
- `GET /api/tasks` — List all arena tasks with optional filtering by status and role.
- `POST /api/tasks` — Enqueue a new code or review task into the single-concurrency scheduler.
- `GET /api/tasks/:id` — Get detailed task status, prompts, logs, and stage breakdown.
- `DELETE /api/tasks/:id` — Cancel or delete an enqueued task.
- `GET /api/tasks/:id/gantt` — Fetch high-precision timestamp spans for Gantt transport timeline.

### 3.2 Real-Time SSE Streams
- `GET /api/events` — Persistent Server-Sent Events stream emitting live envelopes:
  - `telemetry`: Real-time GPU load, VRAM, edge temperature, wattage, and clock speed.
  - `task_stage`: Stage progression (`1/7 Planning` through `7/7 PR Review`).
  - `process_spawn`: Subprocess test execution, linters, and compiler events.
  - `token_stream`: Live LLM generation tokens.
  - `lsp_diagnostic`: Active compiler diagnostic notifications.

### 3.3 Hardware & Telemetry
- `GET /api/telemetry` — Immediate point-in-time snapshot of system and GPU sensor metrics.
- `GET /api/hardware/tools` — Host diagnostic and monitoring tool availability, missing package diagnostics, and copy-paste install command (`SystemToolsDiagnosticReport`).
- `GET /api/analytics/failures` — Aggregated failure taxonomy distribution over rolling time windows (24h, 7d, 30d).
- `GET /api/config/network` — Resolved client origin URL and network accessibility profile (`lan_shared`, `local_only`).

### 3.4 Models & Bandit Optimization
- `GET /api/models` — List active model health profiles, eviction counts, and win rates.
- `GET /api/models/leaderboard` — Dynamic model leaderboard calculated from database task runs.
- `POST /api/models/bandit/configure` — Adjust exploration rate ($\epsilon$), active policy (Epsilon-Greedy, UCB-1, Thompson Sampling), or reset priors.

### 3.5 Repository, Code Diagnostics & Git Checkpoints
- `GET /api/repomap` — Dynamic AST symbol graph with PageRank centrality for target project.
- `GET /api/diagnostics` — Active TypeScript/compiler diagnostics grouped by file and severity.
- `GET /api/checkpoints` — List Git shadow micro-checkpoint history.
- `POST /api/checkpoints/undo` — Revert workspace to previous checkpoint.
- `POST /api/checkpoints/redo` — Re-apply undone checkpoint.

### 3.6 Distributed Multi-Node Fleet
- `POST /api/fleet/register` — Worker node registration endpoint with cryptographic node token.
- `GET /api/fleet/nodes` — Status, GPU type, and heartbeat timestamps of all connected compute nodes.

### 3.7 Webhooks & Integrations
- `POST /api/webhooks/gitea` — Ingress for Gitea events (`issues`, `issue_comment`, `pull_request`, `push`) with HMAC-SHA256 signature verification.

### 3.8 Model Context Protocol (MCP) Server
- `GET /api/mcp/tools` — Discover available tools in MCP format (`query_data_shape`, `ast_inspect`, `regex_replace`, etc.).
- `POST /api/mcp/execute` — Execute a tool over HTTP JSON-RPC.

---

## 4. Angular Mobile-First Frontend Routes

Base URL: `http://<host>:24072` (or root `/` when served via unified server on port `24161`).

| Route | View Component | Core Features & Functionality |
| :--- | :--- | :--- |
| `/dashboard` | `DashboardViewComponent` | System vitals header, active running task card, and compact live queue snapshot. |
| `/queue` | `QueueViewComponent` | Full task queue management, drag-and-drop prioritization, and task creation drawer. |
| `/history` | `HistoryViewComponent` | Audited execution runs, failure cause taxonomy, diff comparisons, and Gitea PR links. |
| `/models` | `ModelsViewComponent` | Model health leaderboard, eviction statistics, exploration slider ($\epsilon$), and Pareto-frontier scatter plot. |
| `/repomap` | `RepoMapViewComponent` | Full-screen interactive SVG repository dependency graph with pan and zoom. |
| `/processes` | `ProcessesViewComponent` | Background compiler test runners, linters, git worktree subprocesses, and exit codes. |
| `/fleet` | `FleetViewComponent` | Multi-node cluster overview, GPU diagnostics, and copyable hardware monitoring installation commands. |
| `/settings` | `SettingsViewComponent` | Theme toggles (Dark, Light, High Contrast), SSO configuration, network profiles, and Rule Pipeline visualizer. |

---

## 5. Headless JSON-RPC 2.0 & WebSocket Protocol

- **Protocol**: JSON-RPC 2.0 over WebSockets or Headless HTTP.
- **Specification**: [`packages/engine/src/daemon/HeadlessServerProtocol.ts`](../packages/engine/src/daemon/HeadlessServerProtocol.ts).
- **Available Methods**:
  - `cacophony.submitPrompt`: Submit follow-up steering prompt mid-stream.
  - `cacophony.interrupt`: Send abort signal to active model generation.
  - `cacophony.setExecutionMode`: Switch safety mode (`plan`, `build`, `auto`).
  - `cacophony.queryTelemetry`: Sample GPU and host hardware metrics.
