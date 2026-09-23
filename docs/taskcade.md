# Cacophony Taskcade: Autonomous Local Model Arena & Code Orchestrator

## Architectural Directives & Operational Rules
- Zero Emojis in any code, comments, documentation, or commits.
- SOLID principles strictly enforced across all modules.
- Strict typing: TypeScript (Node.js/Bun) and modern Angular (v20+); strictly NO Python in core codebase.
- Database: Default to PGlite (in-process WASM/Node PostgreSQL) with clean abstraction for SQLite, PostgreSQL, and MariaDB.
- Single-concurrency scheduler: Vega APU affinity grouping (minimizes Ollama model unloads), model failure eviction (3-4 consecutive fails), and weighted random fallback.
- Mobile-first responsive UI with Dark Mode (default), Light Mode, and High Contrast Mode.
- All secrets strictly confined to .env and encrypted vault.
- Never delete source files with rm; move deprecated files to .trash/ with justification documentation.
- Always commit changes, update ignore files, and do the things necessary to keep the workspace clean. if you need to use a branch or worktree or workbranch or whatever, do so, but make sure your work is prod ready.
---

# Technical Design Document: Local LLM Code Generation & Adaptation Layer

## 1. Objective

To specify the native engine mechanisms required to support resource-constrained local LLMs (running on consumer hardware) in reliably producing functional code modifications, replacing external interactive CLI agent dependencies with an internal, robust processing pipeline.

---

## 2. Core Operational Strategies

### Adaptive Output Formatting

* **Local Models:** Enforce whole-file rewrites. Because resource-constrained models struggle with fine-grained search-and-replace diff syntax, prompts must explicitly demand the complete file content enclosed in standard markdown code blocks.
* **Frontier Models:** Permit concise structural diffs or targeted code blocks to minimize token overhead and latency.

### Self-Healing Parse and Feedback Loops

* **Validation Layer:** Automatically inspect LLM outputs for structural compliance, missing code fences, or malformed payloads before applying changes to disk.
* **Error Injection:** When a parse or syntax validation step fails, construct a corrective follow-up prompt appending the exact parser error message, instructing the model to self-correct on the subsequent attempt within a bounded retry limit.

### Context Minimization and Scoping

* **Targeted File Injection:** Prevent context window degradation by limiting the payload strictly to the task description, immediate file dependencies, and a compact directory tree map rather than dumping entire repository contents.
* **Isolation:** Ensure context assembly happens per-task inside dedicated execution boundaries.

### Deterministic Post-Processing Guard

* **Syntax & Extension Validation:** Pass raw model outputs through a deterministic sanitation layer prior to disk persistence.
* **Heuristic Corrections:** Automatically intercept and rectify common local model failure modes, such as incorrect file extension assignments (e.g., swapping `.ts` and `.js`) or malformed import statements.

---

## Phase 1: Project Scaffolding & Container Topology
- [x] T1.1: Initialize monorepo workspace structure (backend API/engine, frontend Angular app, shared types, tools package).
- [x] T1.2: Configure root TypeScript configuration (tsconfig.base.json) with strict null checks, ES2022/NodeNext resolution, and explicit typing.
- [x] T1.3: Create root .gitignore and .dockerignore files ensuring secrets, logs, local DB files, and build outputs are excluded.
- [x] T1.4: Define .env.example and generate .env with tested and unallocated random ports (Frontend: 24072, API: 24161, MCP: 21264, Gitea HTTP: 19634, Gitea SSH: 17883) and secure vault master key.
- [x] T1.5: Draft docker-compose.yml defining Cacophony Engine, Gitea service with OAuth2 enabled, and bind-mounted volumes (/config, /data, /workspaces).
- [x] T1.6: Create initial configuration schema in conf/cacophony.example.json defining model mappings, thermal thresholds, and execution guards.

## Phase 2: Database Abstraction & PGlite Persistence Layer
- [x] T2.1: Define IDatabaseDriver and IRepository interfaces with strict generic typing for CRUD, transactions, and raw queries.
- [x] T2.2: Implement PGliteDriver leveraging @electric-sql/pglite for file-backed embedded PostgreSQL storage in data/cacophony_pglite.
- [x] T2.3: Implement SQLiteDriver and external PostgreSQL/MariaDB driver adapters satisfying the IDatabaseDriver interface.
- [x] T2.4: Create automated database migration runner executing ordered SQL migrations on engine startup.
- [x] T2.5: Write initial DDL migration creating core tables:
  - [x] T2.5.1: Table `tasks` (id, title, prompt, role, status, priority, model_assigned, test_command, focus_files, target_branch, pr_url, failure_count, timestamps).
  - [x] T2.5.2: Table `task_stages` (id, task_id, stage_name, stage_status, started_at, completed_at, log_output, tokens_sent, tokens_received, duration_ms).
  - [x] T2.5.3: Table `model_health_profiles` (model_id, provider, total_tasks, total_success, total_failures, consecutive_failures, avg_latency_ms, avg_tks, status).
  - [x] T2.5.4: Table `telemetry_snapshots` (timestamp, gpu_busy_pct, vram_used_bytes, vram_total_bytes, gtt_used_bytes, edge_temp_c, vddgfx_mv, ppt_watts, sclk_mhz, current_model).
  - [x] T2.5.5: Table `pr_reviews` (id, task_id, gitea_pr_id, reviewer_model, verdict, review_notes, diff_analyzed, created_at).
  - [x] T2.5.6: Table `tool_audit_logs` (id, task_id, tool_name, parameters_json, result_summary, execution_time_ms, created_at).
  - [x] T2.5.7: Table `secret_vault` (id, secret_key, encrypted_value, iv, created_at, updated_at).
- [x] T2.6: Implement repository services with typed queries: TaskRepository, StageRepository, ModelHealthRepository, TelemetryRepository.
- [x] T2.7: Write unit tests verifying PGlite driver transactions, schema migrations, and repository queries.

## Phase 3: Hardware Diagnostics & Sensor Telemetry Engine
- [x] T3.1: Define IHardwareTelemetryProvider interface for sampling GPU busy percentage, VRAM, GTT, temperature, voltage, wattage, and clock speed.
- [x] T3.2: Implement AmdVegaTelemetryProvider for sysfs direct sensor extraction:
  - [x] T3.2.1: Dynamic discovery of amdgpu hwmon controller (/sys/class/hwmon/hwmon* matching name=amdgpu).
  - [x] T3.2.2: Extraction of edge temperature (temp1_input), core voltage vddgfx (in0_input), PPT wattage (power1_input), and core clock sclk (freq1_input).
  - [x] T3.2.3: Extraction of GPU busy percent (/sys/class/drm/card*/device/gpu_busy_percent).
  - [x] T3.2.4: Extraction of VRAM used and total (/sys/class/drm/card*/device/mem_info_vram_used and mem_info_vram_total).
  - [x] T3.2.5: Extraction of GTT used and total (/sys/class/drm/card*/device/mem_info_gtt_used and mem_info_gtt_total).
- [x] T3.3: Implement FallbackTelemetryProvider querying Linux `sensors`, `radeontop`, or `nvidia-smi` when sysfs direct nodes are unavailable.
- [x] T3.4: Implement ThermalGovernor managing pacing delays (Nominal: 0s, Warm 70-79C: 5s, Elevated 80-89C: 15s, Danger >=90C: pause until <80C).
- [x] T3.5: Build background telemetry polling service with configurable sample intervals (default 1000ms) publishing to SQLite/PGlite and SSE broadcast.
- [x] T3.6: Write unit tests verifying sysfs parsing, fallback resilience, and thermal zone transitions.

## Phase 4: Single-Concurrency Intelligent Task Scheduler & Model Governor
- [x] T4.1: Implement single-concurrency execution mutex ensuring only one inference or heavy compilation process executes on the Vega APU at any instant.
- [x] T4.2: Build Ollama state probe querying host Ollama `/api/ps` to identify the currently active loaded model in VRAM.
- [x] T4.3: Implement Model Affinity Task Sorter:
  - [x] T4.3.1: Given a list of pending tasks, sort tasks matching the currently loaded model first to prevent redundant model evictions.
  - [x] T4.3.2: Prevent starvation of non-matching tasks via age-based priority escalation.
- [x] T4.4: Implement Model Eviction & Weighted Random Selection Engine:
  - [x] T4.4.1: Track consecutive failures per model; if consecutive failures reach 3, trigger temporary eviction.
  - [x] T4.4.2: Calculate dynamic performance weights based on historical pass rate per role/category.
  - [x] T4.4.3: Implement weighted random roulette selector choosing alternate model when default model is evicted.
- [x] T4.5: Implement QueueGroomer service:
  - [x] T4.5.1: Automatic focus file detection based on prompt analysis and workspace file tree.
  - [x] T4.5.2: Automatic test command scoping (targeting specific package/workspace tests instead of global suite).
  - [x] T4.5.3: Directive injection (preventing hallucinated imports, enforcing strict typing and zero emojis).
- [x] T4.6: Implement task lifecycle state machine managing transitions (PENDING -> SCHEDULED -> RUNNING -> REMEDIATING -> TESTING -> IN_REVIEW -> COMPLETED | FAILED).
- [x] T4.7: Write unit tests for task sorting, model affinity prioritization, eviction trigger, and weighted random selection.
- [x] T4.8: Implement Language-Agnostic Stack & Skill Instruction Profile System:
  - [x] T4.8.1: Define `IStackProfile` interface (name, detectionRules, directives, scrubberRules, defaultTestRunner).
  - [x] T4.8.2: Implement automatic stack detector probing workspace markers (e.g. `pom.xml` for Java/Maven, `build.gradle` for Java/Gradle, `tsconfig.json` inspecting `moduleResolution` for TypeScript Bundler vs NodeNext, `go.mod` for Go, `Cargo.toml` for Rust).
  - [x] T4.8.3: Decouple `QueueGroomer` from hardcoded TypeScript/NodeNext directives, dynamically resolving stack-specific directives and negative prompts from detected or configured profiles.
  - [x] T4.8.4: Create SQL table `stack_instruction_profiles` and repository for persisting custom user-defined stack rules and skills via the Angular UI and configuration files.


## Phase 5: Model Inference & Frontier Orchestration Layer
- [x] T5.1: Define IInferenceProvider interface with support for streaming, non-streaming, token accounting, and cancellation.
- [x] T5.2: Implement OllamaProvider for local inference via host HTTP API (supporting model preload, keep_alive=-1, options tuning).
- [x] T5.3: Implement FrontierProvider supporting OpenAI, Anthropic Claude, and Google Gemini endpoints.
- [x] T5.4: Implement SecretVault service using AES-256-GCM encryption for storing external API keys securely in the database.
- [x] T5.5: Implement FrontierTaskDecomposer:
  - [x] T5.5.1: Takes high-level feature requirements and prompts frontier model with structured Zod schema output.
  - [x] T5.5.2: Validates breakdown into atomic tasks with role assignments, focus files, and scoped test commands.
  - [x] T5.5.3: Inserts parsed tasks into PGlite database ready for scheduling.
- [x] T5.6: Write unit tests mocking Ollama and Frontier APIs, testing token speed metrics and Zod schema validation.
- [x] T5.7: Implement Adaptive Output Formatter:
  - [x] T5.7.1: Local model whole-file rewrite synthesizer requiring full file markdown code fence blocks.
  - [x] T5.7.2: Frontier model structural diff and concise targeted edit block support.
- [x] T5.8: Implement Self-Healing Parse and Feedback Loop:
  - [x] T5.8.1: Structural compliance validator inspecting LLM outputs for code fences, markdown integrity, and non-empty content before disk write.
  - [x] T5.8.2: Parser error injection feedback engine constructing corrective follow-up prompts with exact error messages within bounded retry limit.
- [x] T5.9: Implement Context Minimizer and Scoper:
  - [x] T5.9.1: Targeted file injector limiting prompt payload strictly to task description, immediate file dependencies, and compact directory map.
  - [x] T5.9.2: Dedicated execution boundary isolating context assembly per task.

## Phase 6: Deterministic Code Correction & Scrubbing Tools
- [ ] T6.1: Implement CodeScrubber module with automated pre-commit and pre-review rules:
  - [x] T6.1.1: Relative ESM import extension fixer (automatically appending .js to relative imports in TypeScript).
  - [x] T6.1.2: Unicode emoji scrubber (stripping all emojis from source code, comments, and string literals).
  - [x] T6.1.3: Banned import and hallucination scanner (flagging uninstalled or prohibited dependencies).
  - [ ] T6.1.4: Automated code formatter invocation (Prettier / ESLint autofix).
  - [x] T6.1.5: Heuristic extension and syntax corrector (automatically intercepting and fixing swapped .ts/.js file paths and malformed import declarations before disk write).
  - [x] T6.1.6: Feature-level emoji exemption mechanism (allow tasks and files to declare `allow_emojis: true` or `// @cacophony-allow-emojis` annotation when a feature specifically requires emojis, automatically bypassing the emoji scrubber).
  - [x] T6.1.7: Feature-level import and universal scrubber exemption mechanism:
    - [x] T6.1.7.1: Feature import allowance flags (allow tasks and source files to declare approved libraries like `allowed_imports: ["redis", "express"]` or inline `// @cacophony-allow-import: redis` / `// @cacophony-allow-all-imports`, permitting required libraries without triggering banned imports scrubber).
    - [x] T6.1.7.2: Universal scrubber rule bypass flags (allow tasks and source files to declare specific rule exemptions like `disabled_rules: ["EsmRelativeImportScrubberRule"]`, inline `// @cacophony-disable-scrubber: <RuleName>`, or universal bypass `// @cacophony-disable-all-scrubbers` across all modular scrubbers).
    - [x] T6.1.7.3: Dynamic directive adaptation in `QueueGroomer`: adjust prompt directives dynamically when tasks declare approved libraries (e.g. permitting redis imports for cache features) or feature emoji exemptions.
- [x] T6.2: Implement AstValidator module:
  - [x] T6.2.1: Static AST verification using TypeScript Compiler API to detect unreferenced exports or missing types prior to running full test suites.
- [x] T6.3: Write unit tests verifying deterministic fixes, emoji stripping, import resolution, and AST diagnostics.
- [x] T6.4: Implement Stack-Aware Modular Code Scrubber:
  - [x] T6.4.1: Convert scrubbing rules into modular plugins (`IExtensionScrubber`, `IImportValidator`, `IEmojiScrubber`, `IFormattingScrubber`).
  - [x] T6.4.2: Gate the .js extension rewrite rule so it only triggers when `typescript-nodenext` is explicitly detected or configured, avoiding corrupting bundler-based TypeScript or other stacks.
  - [x] T6.4.3: Add Java-specific deterministic scrubbers (e.g. checkstyle package matching, missing imports, unreferenced static methods).


## Phase 7: Tool Execution Suite & MCP Server
- [x] T7.0: Unified CLI Command Palette & Lifecycle Binary (`bin/cacophony`):
  - [x] T7.0.1: Implement DaemonIPCServer and DaemonIPCClient (Unix domain socket / IPC communication for lifecycle control and live LLM stream broadcasts).
  - [x] T7.0.2: Implement CacophonyCli command routing (start, stop, pause, resume, drain, kill, status, models, telemetry, tasks, history, scrub).
  - [x] T7.0.3: Implement Live LLM Stream Tap & Audit engine (tap, suspend, resume, untap real-time generation tokens via IPC broadcast).
  - [x] T7.0.4: Create executable script `bin/cacophony` in project root and register package.json bin entry point.
  - [x] T7.0.5: Write unit tests verifying CLI dispatch, IPC communication, lifecycle state transitions, and stream tap/untap.
- [x] T7.1: Implement ICacophonyTool interface with Zod parameter schemas, documentation metadata, and execution handlers.
- [x] T7.2: Implement core file system tools:
  - [x] T7.2.1: `view_file` (with line slicing, start/end bounds, byte offset pagination).
  - [x] T7.2.2: `replace_file_content` (precise single contiguous block replacement).
  - [x] T7.2.3: `multi_replace_file_content` (multiple atomic block replacements in a single invocation).
  - [x] T7.2.4: `write_to_file` (safe file creation and overwrite).
  - [x] T7.2.5: `list_dir` (directory inspection with recursive child counting).
- [x] T7.3: Implement search and analysis tools:
  - [x] T7.3.1: `grep_search` (ripgrep/regex matching with line numbers and file filtering).
  - [x] T7.3.2: `locate_feature` (symbol and identifier finder).
  - [x] T7.3.3: `ast_inspect` (structural extraction of interfaces, classes, and function signatures).
  - [x] T7.3.4: `regex_tool` (pattern search and batch sed replacement).
- [x] T7.4: Implement `run_command` with ExecutionGuard security filter (blacklisting destructive commands: rm, sudo, dd, mkfs, git reset --hard, git push --force).
- [x] T7.5: Build McpServer exposing all registered tools over stdio and SSE for external AI agents and IDEs.
- [x] T7.6: Write unit tests for all tools verifying parameter validation, boundary conditions, and execution guards.

## Phase 8: Gitea Integration & Automated Development Cycle
- [x] T8.1: Implement GiteaApiClient for repository management, branch creation, commit querying, and PR operations.
- [x] T8.2: Implement GitWorktreeManager managing isolated ephemeral worktrees in /workspaces without polluting repository roots.
- [x] T8.3: Implement automated PR creation workflow:
  - [x] T8.3.1: Push task branch to internal Gitea instance once local tests and deterministic scrubbers pass.
  - [x] T8.3.2: Open Pull Request via Gitea API with formatted description, task ID, and test output summary.
- [x] T8.4: Implement Automated PR Review Loop:
  - [x] T8.4.1: Reviewer agent fetches PR diff from Gitea.
  - [x] T8.4.2: Local LLM generates structured review verdict (APPROVE, REQUEST_CHANGES, REJECT) with inline line comments.
  - [x] T8.4.3: Post review comments to Gitea PR.
  - [x] T8.4.4: If approved, trigger automated merge; if changes requested, generate remediation task into the queue.
- [x] T8.5: Implement Gitea Webhook Receiver endpoint to asynchronously ingest issue/PR events into Cacophony queue.
- [x] T8.6: Write integration tests mocking Gitea API endpoints and validating PR creation and review flows.
- [x] T8.7: Implement Gitea OAuth2 SSO authentication provider for Cacophony backend (authorization code grant flow, token exchange, user profile extraction, and JWT session generation).
- [x] T8.8: Configure Gitea email confirmation bypass (`GITEA__service__REGISTER_EMAIL_CONFIRM=false`) in environment/Docker Compose for seamless immediate SSO onboarding without external email dependencies.
- [x] T8.9: Add integrated local mail catcher service (Mailpit) on unallocated random ports (Web: 15417, SMTP: 18860) with environment toggle (`GITEA_ENABLE_MAIL_CATCHER=true|false`) to intercept and view verification emails when email confirmation is explicitly required.
- [x] T8.10: Implement automated Gitea OAuth2 application registration script on container startup (registers `cacophony-dashboard` client credentials automatically via Gitea CLI so manual UI admin setup is eliminated).

## Phase 9: Modern Angular Dashboard & System Monitor
- [ ] T9.1: Initialize Angular v20+ standalone zoneless application with mobile-first CSS architecture.
- [ ] T9.2: Create design system with CSS custom properties:
  - [ ] T9.2.1: Dark Theme (default: deep slate backgrounds, high-contrast crisp text, subtle borders).
  - [ ] T9.2.2: Light Theme (clean, high-contrast daylight mode).
  - [ ] T9.2.3: High Contrast Theme (WCAG AAA compliant black/yellow/white styling).
- [ ] T9.3: Build Hardware Diagnostics Monitor component (KDE System Monitor aesthetic):
  - [ ] T9.3.1: Live animated meters for GPU Busy %, VRAM used/total, GTT used/total.
  - [ ] T9.3.2: Thermal status badge with zone color coding (Nominal, Warm, Elevated, Danger) and degrees Celsius.
  - [ ] T9.3.3: Electrical & frequency readouts: vddgfx voltage (mV), PPT power (W), sclk frequency (MHz).
  - [ ] T9.3.4: Active loaded Ollama model badge with VRAM allocation footprint.
- [ ] T9.4: Build Live Queue & Active Task Inspector component:
  - [ ] T9.4.1: Stepper visualization of active task stages (Generation -> Scrub -> Test -> Review -> Merge).
  - [ ] T9.4.2: Streaming log terminal with search and autoscroll.
  - [ ] T9.4.3: Live token processing speed gauge (tokens/sec).
- [ ] T9.5: Build Queue Management component:
  - [ ] T9.5.1: Priority re-ordering (drag or move up/down), priority tags (P0, P1, P2).
  - [ ] T9.5.2: Pause, Resume, and Drain controls for scheduler daemon.
  - [ ] T9.5.3: Manual task creation form with focus files and test command inputs.
- [ ] T9.6: Build Task History & Metrics component:
  - [ ] T9.6.1: Filterable table of past runs (Passed, Failed, Remediated).
  - [ ] T9.6.2: Direct links to Gitea PRs, commit diffs, and issue tickets.
  - [ ] T9.6.3: Rolling success rate gauge, model health leaderboard, and failure reason taxonomy.
- [ ] T9.7: Build Test Runner & Process Monitor component:
  - [ ] T9.7.1: Process table showing non-model spawned tasks (npm test, vitest, mvn test, linters, git operations).
  - [ ] T9.7.2: Execution duration, exit code, and live stdout/stderr inspection.
- [ ] T9.8: Build Frontier Decomposition Modal:
  - [ ] T9.8.1: Prompt box for high-level goal input.
  - [ ] T9.8.2: Interactive preview of decomposed tasks before committing to queue.
- [ ] T9.9: Write component tests verifying signals reactivity, mobile responsiveness, and theme switching.
- [ ] T9.10: Implement Gitea SSO Auth Guard and Login/Callback components (login with Gitea, token storage, user session state).

## Phase 10: System Integration, End-to-End Validation & Documentation
- [ ] T10.1: Build unified startup entrypoint running HTTP API, SSE streaming, task scheduler, and Angular web server.
- [ ] T10.2: Validate Docker Compose multi-container deployment (Cacophony + Gitea + Ollama host bridge).
- [ ] T10.3: Execute end-to-end task journey: feature decomposition -> task queue -> Ollama generation -> deterministic scrub -> test execution -> Gitea PR push -> local model review -> automated merge.
- [ ] T10.4: Document operation manual, API specifications, and troubleshooting runbooks in docs/.
