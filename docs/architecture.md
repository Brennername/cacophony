# Cacophony System Architecture Specification

## 1. Executive Summary

Cacophony is an autonomous multi-agent code orchestration platform and local model arena designed to run 24/7 on local hardware while coordinating with external frontier models and internal Git repositories hosted on Gitea.

The system replaces ad-hoc shell scripts and brittle file-based message passing with:
1. Strict TypeScript backend engine adhering to SOLID principles.
2. In-process SQL persistence via PGlite (with modular adapters for SQLite, PostgreSQL, and MariaDB).
3. Pluggable compute execution scheduling tailored for edge acceleration (APUs, discrete GPUs, TPUs, and CPU fallback), featuring model-affinity batching to minimize model swapping, thermal pacing, and consecutive-failure model eviction with weighted random roulette fallback (calibrated on the reference AMD Vega APU).
4. Deterministic code scrubbing layer (ESM relative imports, zero emojis, banned imports).
5. Comprehensive Gemini/Codex-style tool execution suite exposed via local runner and Model Context Protocol (MCP).
6. Mobile-first Angular v20+ dashboard providing real-time hardware telemetry (KDE System Monitor aesthetic), live queue inspection, test runner monitoring, and direct Gitea PR tracking.

---

## 2. High-Level System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CACOPHONY ENGINE (DOCKER)                       │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               Angular v20+ Mobile-First Frontend               │   │
│   │   (Telemetry Gauges, Live Queue, History, Test Process List)   │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                   │ SSE / REST                         │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                       HTTP / REST / MCP API                    │   │
│   └────────────────────────────────────────────────────────────────┘   │
│              │                           │                             │
│              ▼                           ▼                             │
│   ┌──────────────────────┐    ┌────────────────────────────────────┐   │
│   │ Single Concurrency   │    │ Database Persistence (PGlite)      │   │
│   │ Task Scheduler       │    │ Tasks, Stages, Telemetry, Vault    │   │
│   │ (Affinity & Eviction)│    └────────────────────────────────────┘   │
│   └──────────────────────┘                       │                     │
│              │                                   │                     │
│       ┌──────┴───────────────────┐               │                     │
│       ▼                          ▼               ▼                     │
│ ┌───────────────┐        ┌───────────────┐ ┌───────────────────────┐   │
│ │ Deterministic │        │ Tool Engine   │ │ Hardware Diagnostics  │   │
│ │ Code Scrubber │        │ (Gemini/Codex)│ │ (Sysfs Vega Telemetry)│   │
│ └───────────────┘        └───────────────┘ └───────────────────────┘   │
│       │                          │                                     │
└───────┼──────────────────────────┼─────────────────────────────────────┘
        │                          │
        ▼                          ▼
┌─────────────────┐        ┌──────────────────┐    ┌─────────────────────┐
│ Native Ollama   │        │ Gitea Service    │    │ Frontier Models     │
│ (Host via HTTP) │        │ (Docker Internal)│    │ (OpenAI/Anthropic/  │
│                 │        │ PRs, Git, Issues │    │  Gemini via Vault)  │
└─────────────────┘        └──────────────────┘    └─────────────────────┘
```

---

## 3. Core Architectural Subsystems

### 3.1 Persistence & Database Abstraction Layer
Previous iterations scattered JSON files across `data/arena/queue/`, `completed/`, and `failed/`. Cacophony centralizes all state into structured SQL tables managed by an extensible database abstraction.

- **Primary Driver**: PGlite (`@electric-sql/pglite`). Provides embedded Postgres running in WebAssembly/Node.js, writing WAL and table data to `/data/cacophony_pglite` without requiring a standalone database server container.
- **Interface Decoupling**: Defined by `IDatabaseDriver` and domain repositories (`TaskRepository`, `TelemetryRepository`, `ModelHealthRepository`, `SecretVaultRepository`).
- **Alternative Drivers**: Cleanly swappable for standalone PostgreSQL, SQLite (`better-sqlite3`), or MariaDB via environment configuration (`DB_DRIVER=pglite | sqlite | postgres | mariadb`).

#### Database Schema Layout:
1. `tasks`:
   - `id` (VARCHAR PK): Formatted task identifier (`task-YYYYMMDD_HHMMSS_XXXXXX`).
   - `title` (VARCHAR): Human-readable task summary.
   - `prompt` (TEXT): Full prompt instructions given to the agent.
   - `role` (VARCHAR): Agent role (`implementer`, `reviewer`, `architect`, `tester`, `doc_writer`).
   - `status` (VARCHAR): `PENDING`, `SCHEDULED`, `RUNNING`, `REMEDIATING`, `TESTING`, `IN_REVIEW`, `COMPLETED`, `FAILED`, `CANCELLED`.
   - `priority` (VARCHAR): `P0`, `P1`, `P2`.
   - `model_assigned` (VARCHAR): Model selected to execute the current stage.
   - `test_command` (VARCHAR): Scoped verification command (e.g. `npm test --workspace=@pkg`).
   - `focus_files` (TEXT): Specific target file paths.
   - `target_branch` (VARCHAR): Dedicated Git branch (`arena/task-XXXXXX`).
   - `pr_url` (VARCHAR): URL to Gitea Pull Request.
   - `failure_count` (INTEGER): Number of sequential failures for this task.
   - `created_at`, `updated_at`, `completed_at` (TIMESTAMP).

2. `task_stages`:
   - `id` (BIGSERIAL PK).
   - `task_id` (VARCHAR FK -> tasks.id).
   - `stage_name` (VARCHAR): `planning`, `generation`, `deterministic_scrub`, `test_execution`, `pr_review`, `merge`.
   - `stage_status` (VARCHAR): `RUNNING`, `SUCCESS`, `FAILURE`.
   - `log_output` (TEXT): Full stdout/stderr and tool interaction logs.
   - `tokens_sent`, `tokens_received` (INTEGER).
   - `duration_ms` (INTEGER).
   - `started_at`, `completed_at` (TIMESTAMP).

3. `model_health_profiles`:
   - `model_id` (VARCHAR PK): Model name (e.g. `qwen2.5-coder:7b`, `deepseek-r1:8b`).
   - `provider` (VARCHAR): `ollama`, `openai`, `anthropic`, `gemini`.
   - `total_tasks` (INTEGER).
   - `total_success` (INTEGER).
   - `total_failures` (INTEGER).
   - `consecutive_failures` (INTEGER): Counter for automated eviction trigger.
   - `avg_latency_ms` (DOUBLE PRECISION).
   - `avg_tokens_per_sec` (DOUBLE PRECISION).
   - `status` (VARCHAR): `ACTIVE`, `EJECTED`, `COOLDOWN`.
   - `last_used_at` (TIMESTAMP).

4. `telemetry_snapshots`:
   - `timestamp` (TIMESTAMP PK).
   - `gpu_busy_pct` (DOUBLE PRECISION).
   - `vram_used_bytes`, `vram_total_bytes` (BIGINT).
   - `gtt_used_bytes`, `gtt_total_bytes` (BIGINT).
   - `edge_temp_c` (DOUBLE PRECISION).
   - `vddgfx_mv` (DOUBLE PRECISION).
   - `ppt_watts` (DOUBLE PRECISION).
   - `sclk_mhz` (DOUBLE PRECISION).
   - `current_model` (VARCHAR).

5. `pr_reviews`:
   - `id` (BIGSERIAL PK).
   - `task_id` (VARCHAR FK -> tasks.id).
   - `gitea_pr_id` (INTEGER).
   - `reviewer_model` (VARCHAR).
   - `verdict` (VARCHAR): `APPROVE`, `REQUEST_CHANGES`, `REJECT`.
   - `review_notes` (TEXT).
   - `diff_analyzed` (TEXT).
   - `created_at` (TIMESTAMP).

6. `secret_vault`:
   - `id` (VARCHAR PK).
   - `secret_key` (VARCHAR UNIQUE).
   - `encrypted_value` (TEXT): AES-256-GCM cipher string.
   - `iv` (VARCHAR): Initialization vector.
   - `created_at`, `updated_at` (TIMESTAMP).

---

### 3.2 Single-Concurrency Scheduler & Model Governor

Cacophony features an abstract hardware telemetry and pacing engine architected to support edge accelerators, discrete GPUs, TPUs, and full CPU fallback. Because tight memory and thermal constraints exist on edge devices, the execution engine enforces strict concurrency control and active thermal pacing. 

Detailed hardware calibration in this release is tuned against our first reference hardware profile: the unified-memory AMD Vega APU.

#### Scheduling Invariants & Features:
1. **Single-Concurrency Mutex**: An asynchronous execution lock ensures jobs run sequentially through their lifecycle stages to prevent memory thrashing or device watchdog trips.
2. **Model-Affinity Batching**:
   - Querying Ollama's active model via `GET http://<host>:11434/api/ps`.
   - The scheduler scans `PENDING` tasks and groups tasks assigned to the currently loaded model first.
   - This drastically reduces Ollama model evictions and reload latencies (which can take 15-40 seconds on APU shared RAM).
   - Starvation prevention: If a task has waited longer than `MAX_QUEUE_WAIT_SECONDS` (default 3600s), its priority escalates to P0 to force a model swap.
3. **Automated Model Eviction & Weighted Random Roulette**:
   - Every model maintains a `consecutive_failures` counter in `model_health_profiles`.
   - If a model suffers **3 consecutive task failures** (e.g. syntax loops, persistent test failures), it is marked as `EJECTED` for that role.
   - When the primary model is ejected, the scheduler computes dynamic selection weights for remaining candidates based on empirical success rates:
     $$\text{Weight}_i = \max\left(0.05, \frac{\text{Successes}_i + 1}{\text{TotalRuns}_i + 2}\right)$$
   - A weighted random roulette selects the replacement model, providing self-healing exploration without getting stuck on degraded configurations.
4. **Thermal Governor Pacing**:
   - The engine checks APU edge temperature before starting any new task stage:
     * `< 70°C (Nominal)`: 0s delay.
     * `70°C – 79°C (Warm)`: 5s pacing breath.
     * `80°C – 89°C (Elevated)`: 15s active cooldown delay.
     * `≥ 90°C (Danger Zone)`: Task paused, scheduler sleeps in 10-second intervals until temperature drops below 80°C.

---

### 3.3 Deterministic Code Correction Layer (`CodeScrubber`)

Rather than burning expensive LLM tokens on trivial syntax errors that local models frequently repeat, Cacophony executes a deterministic correction pass prior to testing and code review:
1. **ESM Import Extension Resolver**:
   - Automatically detects relative TypeScript imports (e.g. `import { Foo } from "./Foo"`) and appends `.js` to satisfy NodeNext ECMAScript module resolution.
2. **Unicode Emoji Stripper**:
   - Strips all decorative unicode emojis from source code, inline comments, and string literals, enforcing project rules deterministically.
3. **Banned Dependencies Scanner**:
   - Scans AST imports to ensure the model has not hallucinated unapproved external libraries (such as `express`, `redis`, `lodash` in standalone projects).
4. **Prettier / ESLint Automation**:
   - Applies project-standard AST formatting before running compilers or linters.

---

### 3.4 Comprehensive Tool Execution Suite (Gemini / Codex Style)

Local models and external frontier agents interact with the repository through a strongly-typed tool registry validating parameters via Zod:

| Tool Name | Parameters | Capabilities |
| :--- | :--- | :--- |
| `view_file` | `path`, `startLine?`, `endLine?`, `byteOffset?` | Sliced viewing of source files with line-number indexing and byte pagination. |
| `replace_file_content` | `path`, `targetContent`, `replacementContent`, `startLine?`, `endLine?` | Single contiguous replacement requiring exact character-level matches. |
| `multi_replace_file_content` | `path`, `replacementChunks: [{ target, replacement, startLine, endLine }]` | Atomic multi-chunk edits preventing partial file corruptions. |
| `write_to_file` | `path`, `content`, `overwrite?` | Safe file creation with directory tree creation. |
| `list_dir` | `path`, `recursive?` | Directory inspection returning relative paths, sizes, and file types. |
| `grep_search` | `path`, `pattern`, `isRegex?`, `caseInsensitive?`, `includes?` | Ripgrep-powered recursive search with line numbers and matches. |
| `locate_feature` | `path`, `symbolName`, `kind?` | AST identifier lookup for functions, classes, interfaces, and methods. |
| `ast_inspect` | `path`, `extractTypes?` | Structural syntax tree inspection using TypeScript Compiler API. |
| `regex_tool` | `path`, `pattern`, `replacement`, `dryRun?` | Batch regex matching and substitution across target files. |
| `run_command` | `command`, `cwd`, `timeoutMs?` | Scoped execution guard strictly blocking blacklisted commands (`rm`, `sudo`, `dd`, `mkfs`, `git reset --hard`). |

All tools are simultaneously exposed via internal TypeScript function calls and an embedded **MCP (Model Context Protocol)** server over stdio and Server-Sent Events (SSE).

---

### 3.5 Gitea Integration & Automated Review Workflow

Cacophony interacts with a dedicated Gitea container via REST API to establish a fully autonomous developer workflow:

1. **Git Worktree Isolation**:
   - Each task branch is checked out in an isolated directory inside `/workspaces/` using `git worktree add`.
   - The primary repository and host file system remain untouched.
2. **Automated Branch & PR Creation**:
   - When a task's implementation passes deterministic scrubbers and automated test suites, the branch is pushed to Gitea.
   - A Pull Request is opened automatically with structured release notes, task ID reference, and verification logs.
3. **Automated Model Review Loop**:
   - A reviewer agent is assigned the PR diff.
   - The reviewer evaluates architectural boundaries, SOLID principles, type completeness, and security.
   - Returns a structured verdict:
     * `APPROVE`: Automated PR merge into target branch.
     * `REQUEST_CHANGES`: Specific change requests parsed and queued back into Cacophony as a high-priority remediation task.
     * `REJECT`: Branch closed and logged with failure taxonomy.
4. **Issue Sync**:
   - Gitea issues can trigger Cacophony tasks via webhooks; tasks report progress back to issue comments.

---

### 3.6 Frontier Model Decomposition & Vault

For complex epics requiring high-level reasoning:
1. **Frontier Task Decomposer**: High-level feature requests are submitted via UI or API. A frontier model (e.g. Gemini 1.5 Pro, Claude 3.5 Sonnet, GPT-4o) evaluates the codebase structure and decomposes the request into an ordered series of atomic taskcade items.
2. **Encrypted Secret Vault**: API keys are never stored in plain text. They are encrypted using AES-256-GCM with a master key derived from the host environment (`VAULT_MASTER_KEY`).

---

### 3.7 Modern Angular Dashboard & System Monitor

The frontend is an Angular v20+ standalone, zoneless application built mobile-first using reactive Signals, SVG visualizations, and modular routing:

1. **Theming Engine**:
   - Dark Mode (default: low-eye-strain slate and obsidian palette with subtle borders).
   - Light Mode (crisp, high-contrast daylight palette).
   - High Contrast Mode (WCAG AAA compliant stark contrast).
2. **KDE System Monitor-Style Diagnostics**:
   - Live real-time gauges for GPU busy percentage, VRAM utilization, GTT memory, edge temperature, vddgfx core voltage, PPT wattage, and GPU clock frequency.
   - Current loaded Ollama model badge with memory footprint.
3. **Interactive Queue & Task Inspector**:
   - Visual stage pipeline stepper (Generation -> Scrub -> Test -> Review -> Merge).
   - Live log viewer streaming tokens/sec and execution logs.
   - Priority adjustment and task re-ordering.
4. **Test Runner & Process Inspector**:
   - Table of spawned non-model test processes (unit tests, linters, builds).
5. **Gitea Integration Links**:
   - Direct clickable links to PRs, commit diffs, and issue tracking.
