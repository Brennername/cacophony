# Cacophony Taskcade: Archival History of Verified Completed Tasks

This document contains the chronological record of fully implemented, verified, and completed tasks from the active taskcade.
In accordance with the Cacophony Taskcade Rotation Protocol, tasks are rotated to this archive only after passing all unit, integration, and e2e verification checks.

---

## Taskcade Rotation Protocol

1. **Verification Gate**: No task is marked completed `[x]` or rotated without passing its verified automated test suite or operational validation.
2. **Archival Integrity**: When an entire phase or major milestone is fully verified, its completed checklist items are transferred from `docs/taskcade.md` to `docs/taskcade-history.md`.
3. **Traceability**: Each archived phase preserves its task IDs, descriptions, subtask trees, associated git commit hashes, and verification scope.
4. **Token Efficiency**: Active planning and execution in `docs/taskcade.md` remain uncluttered, allowing AI agents and human operators to focus directly on pending work without context exhaustion.

---

## Archived Phase 1: Project Scaffolding & Container Topology
*Completed & Verified in Commit: `b7aae88`*

- [x] T1.1: Initialize monorepo workspace structure (backend API/engine, frontend Angular app, shared types, tools package).
- [x] T1.2: Configure root TypeScript configuration (tsconfig.base.json) with strict null checks, ES2022/NodeNext resolution, and explicit typing.
- [x] T1.3: Create root .gitignore and .dockerignore files ensuring secrets, logs, local DB files, and build outputs are excluded.
- [x] T1.4: Define .env.example and generate .env with tested and unallocated random ports (Frontend: 24072, API: 24161, MCP: 21264, Gitea HTTP: 19634, Gitea SSH: 17883) and secure vault master key.
- [x] T1.5: Draft docker-compose.yml defining Cacophony Engine, Gitea service with OAuth2 enabled, and bind-mounted volumes (/config, /data, /workspaces).
- [x] T1.6: Create initial configuration schema in conf/cacophony.example.json defining model mappings, thermal thresholds, and execution guards.

---

## Archived Phase 2: Database Abstraction & PGlite Persistence Layer
*Completed & Verified in Commit: `b7aae88`*

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

---

## Archived Phase 3: Hardware Diagnostics & Sensor Telemetry Engine
*Completed & Verified in Commit: `b7aae88`*

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

---

## Archived Phase 4: Single-Concurrency Intelligent Task Scheduler & Model Governor
*Completed & Verified in Commit: `b7aae88`*

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

---

## Archived Phase 5: Model Inference & Frontier Orchestration Layer
*Completed & Verified in Commit: `b7aae88`*

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

---

## Archived Phase 6: Deterministic Code Correction & Scrubbing Tools
*Completed & Verified in Commit: `b7aae88`*

- [x] T6.1.1: Relative ESM import extension fixer (automatically appending .js to relative imports in TypeScript).
- [x] T6.1.2: Unicode emoji scrubber (stripping all emojis from source code, comments, and string literals).
- [x] T6.1.3: Banned import and hallucination scanner (flagging uninstalled or prohibited dependencies).
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

---

## Archived Phase 7: Tool Execution Suite & MCP Server
*Completed & Verified in Commit: `5483eeb`*

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

---

## Archived Phase 8: Gitea Integration & Automated Development Cycle
*Completed & Verified in Commit: `5573271`*

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

---

## Archived Phase 9: Modern Angular Dashboard & System Monitor
*Completed & Verified in Commit: `5b9768e`*

- [x] T9.1: Initialize Angular v20+ standalone zoneless application with mobile-first CSS architecture.
- [x] T9.2: Create design system with CSS custom properties:
  - [x] T9.2.1: Dark Theme (default: deep slate backgrounds, high-contrast crisp text, subtle borders).
  - [x] T9.2.2: Light Theme (clean, high-contrast daylight mode).
  - [x] T9.2.3: High Contrast Theme (WCAG AAA compliant black/yellow/white styling).
- [x] T9.3: Build Hardware Diagnostics Monitor component (KDE System Monitor aesthetic):
  - [x] T9.3.1: Live animated meters for GPU Busy %, VRAM used/total, GTT used/total.
  - [x] T9.3.2: Thermal status badge with zone color coding (Nominal, Warm, Elevated, Danger) and degrees Celsius.
  - [x] T9.3.3: Electrical & frequency readouts: vddgfx voltage (mV), PPT power (W), sclk frequency (MHz).
  - [x] T9.3.4: Active loaded Ollama model badge with VRAM allocation footprint.
- [x] T9.4: Build Live Queue & Active Task Inspector component:
  - [x] T9.4.1: Stepper visualization of active task stages (Generation -> Scrub -> Test -> Review -> Merge).
  - [x] T9.4.2: Streaming log terminal with search and autoscroll.
  - [x] T9.4.3: Live token processing speed gauge (tokens/sec).
- [x] T9.5: Build Queue Management component:
  - [x] T9.5.1: Priority re-ordering (drag or move up/down), priority tags (P0, P1, P2).
  - [x] T9.5.2: Pause, Resume, and Drain controls for scheduler daemon.
  - [x] T9.5.3: Manual task creation form with focus files and test command inputs.
- [x] T9.6: Build Task History & Metrics component:
  - [x] T9.6.1: Filterable table of past runs (Passed, Failed, Remediated).
  - [x] T9.6.2: Direct links to Gitea PRs, commit diffs, and issue tickets.
  - [x] T9.6.3: Rolling success rate gauge, model health leaderboard, and failure reason taxonomy.
- [x] T9.7: Build Test Runner & Process Monitor component:
  - [x] T9.7.1: Process table showing non-model spawned tasks (npm test, vitest, mvn test, linters, git operations).
  - [x] T9.7.2: Execution duration, exit code, and live stdout/stderr inspection.
- [x] T9.8: Build Frontier Decomposition Modal:
  - [x] T9.8.1: Prompt box for high-level goal input.
  - [x] T9.8.2: Interactive preview of decomposed tasks before committing to queue.
- [x] T9.9: Write component tests verifying signals reactivity, mobile responsiveness, and theme switching.
- [x] T9.10: Implement Gitea SSO Auth Guard and Login/Callback components (login with Gitea, token storage, user session state).

---

## Archived Phase 10: System Integration, End-to-End Validation & Documentation
*Completed & Verified in Commit: `d52d6cb`*

- [x] T10.1: Build unified startup entrypoint running HTTP API, SSE streaming, task scheduler, and Angular web server.
- [x] T10.2: Validate Docker Compose multi-container deployment (Cacophony + Gitea + Ollama host bridge).
- [x] T10.3: Execute end-to-end task journey: feature decomposition -> task queue -> Ollama generation -> deterministic scrub -> test execution -> Gitea PR push -> local model review -> automated merge.
- [x] T10.4: Document operation manual, API specifications, and troubleshooting runbooks in docs/.

---

## Archived Phase 11: Context & Intelligence Engine (OpenCode & Aider Spec)
*Completed & Verified in Commits: `33fdebc`, `02b14e3`, `70384ad`, `9679193`, and `1a217fc`*

- [x] T11.1: Language Server Protocol (LSP) Integration (`spec:LanguageServerProtocolIntegration`):
  - [x] T11.1.1: Core LSP Client & Lifecycle Manager (ILspClient, LspProcessSupervisor, multi-language detection for TypeScript, Java, Go, Rust).
  - [x] T11.1.2: Compiler Diagnostics & Type Error Ingestion (LspDiagnosticIngestor, structured normalization, settling barriers).
  - [x] T11.1.3: Self-Healing LSP Error Feedback (LspErrorFeedbackFormatter, SelfHealingParseLoop integration, lsp_diagnostic_snapshots DB persistence).
  - [x] T11.1.4: Symbol Navigation & Workspace Querying (lsp_get_diagnostics, lsp_find_definition tools in ToolRegistry).
- [x] T11.2: Model-Agnostic Registry & Multi-Provider Architecture (`spec:ModelAgnosticRegistry`):
  - [x] T11.2.1: Unified Model Registry Abstraction (IModelRegistry, ModelSpec, model_registry_entries DB repository).
  - [x] T11.2.2: Local Provider Adapters (LMStudioProvider, OllamaDiscoveryService, LocalEndpointScanner port probing).
  - [x] T11.2.3: Cloud & Frontier Provider Adapters (OpenAiCompatibleProvider generic driver supporting custom baseURL and auth).
  - [x] T11.2.4: Model Benchmarking & Dynamic Capability Matrix (ModelCapabilityProber, WHOLE_FILE_ONLY vs DIFF_CAPABLE tagging).
- [x] T11.3: Model Context Protocol (MCP) Client & External Tool Discovery (`spec:ModelContextProtocolSupport`):
  - [x] T11.3.1: Bidirectional MCP Client Core (McpClientManager supporting Stdio and SSE transports, external tool registration).
  - [x] T11.3.2: Configuration & Third-Party Server Connections (conf/mcp_servers.json schema, vault credential injection, reconnection logic).
  - [x] T11.3.3: Tool Namespace & Security Isolation (serverName:toolName namespacing, ExecutionGuard security policies).
- [x] T11.4: Auto-Compacting Conversation Sessions (`spec:AutoCompactingSessions`):
  - [x] T11.4.1: Token Budget & Utilization Monitor (TokenUsageTracker, warning/compaction thresholds, message importance scoring).
  - [x] T11.4.2: Background Conversation Summarizer (SessionCompactor hierarchical turn summarization, state preservation).
  - [x] T11.4.3: Compaction Verification & Rollback (token reduction validation, session_compaction_history DB snapshots).
- [x] T11.5: Persistent Multi-Tab Session Storage (`spec:PersistentSessionStorage`):
  - [x] T11.5.1: Session Schema & Persistence Layer (sessions, session_messages, session_tabs relational tables and SessionRepository).
  - [x] T11.5.2: Multi-Tab Session Manager (SessionManager multi-tab isolation, git branch binding, export/fork/resume).
  - [x] T11.5.3: Session Search & Indexing (PostgreSQL full-text search across session turns and bookmarks).

---

## Archived Phase 12: Repository Mapping & Granular Multi-File Context (Aider Core)
*Completed & Verified in Commit: `91ea16d`*

- [x] T12.1: Repository Structure Mapping (`spec:RepositoryStructureMapping`):
  - [x] T12.1.1: Tree-Sitter & AST Symbol Extraction (SymbolExtractor using TypeScript Compiler API, Java/Go/Python grammar regexes).
  - [x] T12.1.2: Graph Centrality & PageRank Ranking (SymbolGraph dependency graph, PageRank centrality ranking, 006_repository_symbol_graph DB index).
  - [x] T12.1.3: Compressed Architectural Map Generation (RepoMapGenerator token budgeting, query biasing, indented tree hierarchy).
- [x] T12.2: Granular Multi-File Context Selection (`spec:GranularMultiFileContext`):
  - [x] T12.2.1: Context Tagging & Scoping Engine (ContextManager EDITABLE vs REFERENCE scoping, /add /drop /read-only /clear).
  - [x] T12.2.2: Smart Context Recommendations (ContextRecommender analyzing prompt and active files, suggesting tests and dependencies).
  - [x] T12.2.3: Multi-File Edit Coordination (MultiFileEditCoordinator atomic in-memory staging with AST validation before disk apply).
- [x] T12.3: Automated Git Checkpoints & Micro-Snapshots (`spec:AutomatedGitCheckpoints`):
  - [x] T12.3.1: Shadow Git Checkpoint Manager (GitCheckpointService atomic commit snapshots and unified diffs).
  - [x] T12.3.2: Checkpoint Metadata & Storage (007_git_checkpoints migration, GitCheckpointRepository in @cacophony/db).
  - [x] T12.3.3: Testing & Resilience (Verified with automated git commits and isolated worktrees).
- [x] T12.4: Git-Based Undo / Redo Engine (`spec:GitUndoRedoCommands`):
  - [x] T12.4.1: Instant State Rollback (GitUndoManager /undo reverting to pre-task snapshot, /redo re-applying forward).
  - [x] T12.4.2: Selective & Partial Rollback (Targeted single-file undo /undo <file>, conflict detection).

---

## Archived Phase 13: Execution & Automated Test Feedback Loop (Aider & OpenCode)
*Completed & Verified in Commit: `c77b50d`*

- [x] T13.1: Automated Test Loop Integration (`spec:AutomatedTestLoopIntegration`):
  - [x] T13.1.1: Project Test Suite Auto-Discovery (TestRunnerDetector auto-detecting Vitest, Jest, Mocha, Playwright, Node:test, Maven, Gradle, Go, Cargo, with test scoping).
  - [x] T13.1.2: Post-Edit Test Execution Runner (AutomatedTestLoopRunner running scoped tests with timeout guards, persisting runs in 008_test_execution_runs).
  - [x] T13.1.3: Failure Diagnostics & Stack Trace Extraction (TestOutputParser parsing failures, assertion diffs, root causes, and formatting remediation snippets).
  - [x] T13.1.4: Closed-Loop Model Remediation (ClosedLoopTestRemediator running bounded 3-attempt remediation cycles with automatic GitUndoManager rollback on failure).

---

## Archived Phase 14: Terminal User Interface (TUI) & Developer Experience
*Completed & Verified in Commit: `2a77bfa`*

- [x] T14.1: Advanced Terminal User Interface (`spec:AdvancedTerminalUserInterface`):
  - [x] T14.1.1: TUI Architecture & Framework Setup (ScreenBuffer 2D grid, responsive layout engine, Dark/Light/High-Contrast ANSI color palettes in TuiTheme).
  - [x] T14.1.2: Split Panes & Widgets (ConversationPane markdown formatting, TelemetryBar live Vega APU readouts, ContextInspectorPane focus file tagging, StreamingLogDrawer).
  - [x] T14.1.3: Keyboard Navigation & Searchable Command Palette (TerminalApp managing Tab cycle focus, Ctrl+P fuzzy command palette, Ctrl+T drawer toggle, automated tests).
- [x] T14.2: Steerable Generation & Prompt Queue (`spec:SteerableGenerationAndQueue`):
  - [x] T14.2.1: Mid-Stream Execution Interruption (LivePromptQueue propagating AbortController, resetting stream state, and emitting interruption events).
  - [x] T14.2.2: Live Prompt Queue & Follow-Up Injection (LivePromptQueue sequential prompt ordering, mid-stream steering guidance annotations).
- [x] T14.3: Custom Markdown Commands (`spec:CustomMarkdownCommands`):
  - [x] T14.3.1: Template Format & Discovery (CustomMarkdownCommandEngine YAML frontmatter parsing, variable interpolation $ARG, $SELECTION, $FILES, $TEST_OUTPUT).
  - [x] T14.3.2: Built-in Command Library (Created /refactor, /test, /review, /explain, /doc in conf/commands/).
  - [x] T14.3.3: Execution & Discovery Engine (Dynamic directory scanning and command registration, verified with unit tests).
- [x] T14.4: Flexible Execution Modes (`spec:FlexibleExecutionModes`):
  - [x] T14.4.1: Non-Interactive CLI Mode (ExecutionSafetyManager Plan, Build, and Auto mode enforcement with strict disk guardrails).
  - [x] T14.4.2: Interactive Execution Safety Modes (Plan mode disk protection, Build mode review requirements, Auto mode end-to-end execution).
- [x] T14.5: Headless Server Protocol & Extension Hooks (`spec:HeadlessServerProtocol`):
  - [x] T14.5.1: JSON-RPC & WebSocket Protocol Layer (HeadlessServerProtocol implementing JSON-RPC 2.0 dispatch, method handlers, error formatting, and streaming notifications).
  - [x] T14.5.2: Editor & Extension Hooks (Authentication token verification and bi-directional RPC for VS Code / Cursor extensions).

---

## Archived Phase 15: Modern Angular UI Enhancements for New Features
*Completed & Verified in Commit: `28c82fd`*

- [x] T15.1: Multi-Tab Session & Conversation Inspector (`spec:PersistentSessionStorage`):
  - [x] T15.1.1: SessionTabsComponent (Standalone, Angular Signals `signal<SessionTab[]>`, `model<string>`, mobile-first scrollable tab bar, tab create/close actions).
  - [x] T15.1.2: ConversationTimelineComponent (Standalone, signal-based message stream, computed token counters, tool accordions, mobile-first CSS custom properties).
- [x] T15.2: Interactive Repository Map & Context Selector (`spec:RepositoryStructureMapping`, `spec:GranularMultiFileContext`):
  - [x] T15.2.1: RepoMapViewerComponent (Standalone, SVG dependency graph, symbol centrality scaling, search filtering, node selection drawer).
- [x] T15.4: LSP Diagnostics & Automated Test Loop Panel (`spec:LanguageServerProtocolIntegration`, `spec:AutomatedTestLoopIntegration`):
  - [x] T15.4.1: LspTestLoopPanelComponent (Standalone, live LSP compiler diagnostics grouped by severity, automated test execution loop status with collapsible failure snippets).
- [x] T15.5: Execution Mode & Checkpoint Controller (`spec:FlexibleExecutionModes`, `spec:AutomatedGitCheckpoints`, `spec:GitUndoRedoCommands`):
  - [x] T15.5.1: ExecutionModeSelectorComponent (Standalone, mobile-first segmented control for Plan, Build, and Auto execution safety modes).
  - [x] T15.5.2: CheckpointTimelineComponent (Standalone, Git shadow micro-checkpoint timeline with instant Undo/Redo triggers).
  - [x] T15.5.3: Unit & Component Testing (Verified with Vitest Angular testing suite in phase15-components.spec.ts passing 100%).

---

## Archived Phase 16: Verification, Integration & System Auditing
*Completed & Verified in Commit: `9c90321`*

- [x] T16.1: End-to-End Testing of New Subsystems:
  - [x] T16.1.1: Verify LSP client startup, diagnostic publishing, and error injection on real TypeScript and Java workspaces.
  - [x] T16.1.2: Verify multi-provider inference with Ollama, LM Studio, and frontier fallback routing.
  - [x] T16.1.3: Verify tree-sitter repository map generation and PageRank ranking across multi-file repositories.
  - [x] T16.1.4: Verify automated test loop and closed-loop error remediation with failing unit tests.
  - [x] T16.1.5: Verify git checkpoints, `/undo`, and `/redo` commands in isolated worktrees.
  - [x] T16.1.6: Verify TUI rendering, prompt queueing, and mid-stream interrupt in terminal sessions.
- [x] T16.2: System Architecture Audit & Resource Benchmark:
  - [x] T16.2.1: Audit memory and VRAM footprints during combined LSP, Tree-Sitter, and Ollama operations on Vega APU.
  - [x] T16.2.2: Ensure all external calls and sensitive tokens are strictly managed in `.env` and `SecretVault`.
  - [x] T16.2.3: Validate zero emojis policy and strict typing across all new modules.
- [x] T16.3: Update Documentation & Runbooks:
  - [x] T16.3.1: Document new CLI commands, TUI shortcuts, and custom markdown template authoring in `docs/operations_manual.md`.
  - [x] T16.3.2: Update API and JSON-RPC protocol specifications in `docs/api_spec.md`.



