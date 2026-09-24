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

---

## Archived Phase 17: Authentik & Authelia Enterprise SSO Provider Integration
*Completed & Verified in Commit: `a6e524a`*

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

## Archived Phase 18: Full-Stack Real Data Pipeline & Elimination of Mocks
*Completed & Verified in Commit: `91cecca`*

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

## Archived Phase 19: Network-Agnostic URL Resolution & Multi-Device Access
*Completed & Verified in Commit: `93bba2c`*

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

## Archived Phase 20: Mobile-First Routed Navigation & High-Density Desktop Layout
*Completed & Verified in Commit: `56e4751`*

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

## Archived Phase 21: Real-Time Task Progress, Granular Stages & Gantt Transport
*Completed & Verified in Commit: `634f33a`*

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

## Archived Phase 22: Historical Failure Taxonomy, Analytics & Area-Under-Curve (AOC) Visualizations
*Completed & Verified in Commit: `2184b40`*

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

## Archived Phase 23: AST Code Signature Compression & Mechanistic Interface Enforcement
*Completed & Verified in Commit: `bac6589`*

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

## Archived Phase 24: Distributed Multi-Node Fleet Architecture & Hardware Profiling
*Completed & Verified in Commit: `9b23388`*

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

## Archived Phase 25: Composable Deterministic Repair Rule DSL & Pipeline Engine
*Completed & Verified in Commit: `486effd`*

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

## Archived Phase 26: Decoupled Historical Arena Ingestion & Stochastic Hyperparameter Optimization
*Completed & Verified in Commit: `60b31b1`*

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

## Archived Phase 27: Autonomous Hardware Feature Discovery & Whitebox Ollama Tuning
*Completed & Verified in Commit: `02ef269` and `183265f`*

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
  - [x] T27.1.2.5: Document and show in the UI for the user what tools they need to install (`apt install radeontop lm-sensors btop ...`) to enable hardware monitoring and capabilities that were disabled due to missing system tools.

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

## Archived Phase 28: Stochastic Exploration Scheduler & Multi-Armed Bandit Dispatcher
*Completed & Verified in Commit: `b7e0d9c`*

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

---

## Archived Phase 29: Gitea Deep API Integration, Least-Privilege Permission Guardrails & Automated PR Engine
*Completed & Verified in Commit: `5af4854`*

### T29.1: Scoped API Token Abstraction & Role-Gated Permission Guardrails (`spec:GiteaPermissionGuardrails`)
- [x] T29.1.1: Granular Gitea Scope Matrix Implementation:
  - [x] T29.1.1.1: Define typed `GiteaScope` enumeration and token permission schema in `@cacophony/shared-types` matching official Gitea OAuth/API scopes: `activitypub`, `admin`, `issue`, `misc`, `notification`, `organization`, `package`, `repository`, `user` with access levels (`none`, `read`, `write`).
  - [x] T29.1.1.2: Implement `GiteaPermissionGuard` in `@cacophony/engine`: Validates token scopes prior to executing any API call, rejecting unauthorized operations before network transmission.
  - [x] T29.1.1.3: Enforce Subsystem Permission Segregation:
    - Public / Web Dashboard Inspector: strictly restricted to `repository:read`, `user:read`, `issue:read`.
    - Reviewer & QA Agent: restricted to `repository:read`, `issue:read`, `package:read`.
    - Autonomous Implementer Agent: restricted to `repository:read`, `repository:write` (restricted to feature/fix branches), `issue:read_write`.
    - Bootstrapper / Setup Script: isolated admin access (`admin:write`), never exposed to LLM context windows or agent runtimes.
  - [x] T29.1.1.4: Implement scope assertion middleware in `GiteaApiClient` preventing accidental privilege escalation.

### T29.2: Autonomous Issue Ingestion & Dynamic Branch/PR Engine (`spec:GiteaIssueAndPrEngine`)
- [x] T29.2.1: Autonomous Issue Ingestion:
  - [x] T29.2.1.1: Implement `listIssues(owner, repo, filter)` and `getIssue(owner, repo, issueNumber)` in `GiteaApiClient`.
  - [x] T29.2.1.2: Implement `GiteaIssueIngestionWorker`: Periodically or on-demand fetches assigned issues labeled `cacophony` or `auto-fix`, converting them into structured arena tasks.
  - [x] T29.2.1.3: Update issue state and post automated status comments (`POST /repos/{owner}/{repo}/issues/{index}/comments`) informing users of task start, test runs, and completion.
- [x] T29.2.2: Dynamic Branching & Protected Branch Guardrails:
  - [x] T29.2.2.1: Enforce branch creation naming convention (`feat/issue-{num}-{slug}` or `fix/issue-{num}-{slug}`) via `POST /repos/{owner}/{repo}/branches`.
  - [x] T29.2.2.2: Implement `ProtectedBranchGuard`: Hard blocks direct commits or pushes to default/protected branches (`main`, `master`, `release/*`).
- [x] T29.2.3: Automated Pull Request & Review Generation:
  - [x] T29.2.3.1: Implement automated PR creation via `createPullRequest(owner, repo, req)` with structured Markdown summaries, test run outputs, and list of modified symbols.
  - [x] T29.2.3.2: Implement automated PR code review submission via `submitPullRequestReview(owner, repo, prNumber, review)` with line-level comments and verdicts (`APPROVED`, `REQUEST_CHANGES`).

### T29.3: Real-Time Webhook Event Dispatching & HMAC Validation (`spec:GiteaWebhookDispatcher`)
- [x] T29.3.1: Enhanced Webhook Dispatcher:
  - [x] T29.3.1.1: Expand `GiteaWebhookReceiver` to support events: `issue_comment` (e.g. `/cacophony run`, `/cacophony retry`), `pull_request` (open, synchronize, review_requested), `push`.
  - [x] T29.3.1.2: Implement constant-time cryptographic HMAC-SHA256 signature verification with configurable webhook secret in `.env`.
  - [x] T29.3.1.3: Route incoming webhook actions directly to `SingleConcurrencyScheduler` without polling overhead.

### T29.4: Package & Artifact Provenance Integration (`spec:GiteaPackageRegistry`)
- [x] T29.4.1: Artifact & Build Provenance:
  - [x] T29.4.1.1: Implement `GiteaPackageClient` in `@cacophony/engine` interfacing with Gitea Package Registry (Generic/npm packages).
  - [x] T29.4.1.2: Publish reproducible build artifacts and test report bundles with cryptographic SHA256 checksums to Gitea package storage.
  - [x] T29.4.1.3: Link published package metadata directly into generated Pull Request bodies for full end-to-end traceability.

### T29.5: Automated Verification & Unit Test Suite (`spec:GiteaIntegrationVerification`)
- [x] T29.5.1: Unit & Integration Tests:
  - [x] T29.5.1.1: Write unit tests verifying `GiteaPermissionGuard` role-scope boundary enforcement and rejection of unpermitted operations.
  - [x] T29.5.1.2: Write unit tests for `GiteaApiClient` testing issue querying, commenting, PR generation, and branch protection.
  - [x] T29.5.1.3: Write integration tests for `GiteaWebhookReceiver` verifying signature validation, issue comment commands, and PR synchronization.
  - [x] T29.5.1.4: Run full monorepo test suite (`npm test`) asserting 100% pass rate.

---

## Archived Phase 30: System Entrypoints & Comprehensive Interface Documentation (`docs/entrypoints.md`)
*Completed & Verified in Commit: `162e94b`*

### T30.1: Complete Interface Catalog & Execution Entrypoints Specification (`spec:EntrypointsDocumentation`)
- [x] T30.1.1: Author `docs/entrypoints.md` documenting all executable entrypoints, ports, CLI binaries, HTTP endpoints, WebSocket channels, and headless server protocols:
  - [x] T30.1.1.1: Document CLI Entrypoints (`bin/cacophony`, `cacophony tui`, `cacophony rules optimize`, `cacophony hardware inspect`, `bin/bootstrap-authentik.sh`).
  - [x] T30.1.1.2: Document HTTP REST & SSE Endpoints (`/api/tasks`, `/api/events`, `/api/telemetry`, `/api/models`, `/api/repomap`, `/api/fleet`, `/api/webhooks/gitea`, `/api/mcp`).
  - [x] T30.1.1.3: Document Angular Frontend Routes (`/dashboard`, `/queue`, `/history`, `/models`, `/repomap`, `/processes`, `/fleet`, `/settings`).
  - [x] T30.1.1.4: Document Headless JSON-RPC 2.0 & WebSocket Protocols.
  - [x] T30.1.1.5: Document Container Topology & Port Allocations (Frontend 24072, API 24161, MCP 21264, Gitea 19634/17883, Authentik 9000/9443).

---

## Archived Phase 31: Closed-Loop PR Review & Self-Remediation Workflow with Missing Tool Diagnostic Guidance
*Completed & Verified in Phase 31 Verification Suite*

### T31.1: End-to-End Autonomous PR Lifecycle & Scheduler Integration (`spec:ClosedLoopPrWorkflow`)
- [x] T31.1.1: Closed-Loop PR Review & Remediation Coordinator:
  - [x] T31.1.1.1: Implement `ClosedLoopPrCoordinator` in `@cacophony/engine/gitea`: coordinates `AutomatedPrWorkflow` and `AutomatedPrReviewLoop` with `TaskScheduler`.
  - [x] T31.1.1.2: When `AutomatedPrReviewLoop` returns `remediationRequired: true` (`REQUEST_CHANGES` with inline comments), automatically synthesize and enqueue a high-priority (`P0`) remediation task targeting the existing worktree and branch.
  - [x] T31.1.1.3: Ensure remediation tasks bypass duplicate branch creation, focus on flagged lines from review comments, and execute automated test suites.
  - [x] T31.1.1.4: When review verdict is `APPROVED`, trigger automated squash merge via `GiteaApiClient.mergePullRequest` and record resolution in `task_stages` and `pr_reviews` tables.

### T31.2: System Tool Availability & Missing Dependency Diagnostic Engine (`spec:MissingToolsDiagnostics`)
- [x] T31.2.1: Host System Capability & Tool Scanner:
  - [x] T31.2.1.1: Define `ToolRequirement` and `SystemToolsDiagnosticReport` interfaces in `@cacophony/shared-types` identifying key binary capabilities: `radeontop`, `lm-sensors`, `btop`, `vulkan-tools` (`vulkaninfo`), `pciutils` (`lspci`), `mesa-utils`, `rocm-smi`, `nvidia-smi`.
  - [x] T31.2.1.2: Implement `SystemToolScanner` in `@cacophony/engine/hardware`: tests `which <tool>` or executes probe to determine installation status, version, and feature enablement.
  - [x] T31.2.1.3: Expose `GET /api/hardware/tools` REST endpoint returning complete diagnostic report with missing tools, affected capabilities, and copy-paste installation commands.
- [x] T31.2.2: Mobile-First Frontend Missing Tools Guidance Widget:
  - [x] T31.2.2.1: Update Angular `FleetViewComponent` and `HardwareMonitorComponent` to dynamically query `/api/hardware/tools`.
  - [x] T31.2.2.2: If missing tools are detected, render high-visibility, mobile-friendly alert card listing disabled functionality and one-click copy-paste command for `sudo apt install`.
  - [x] T31.2.2.3: Automatically hide or mark as verified when all required utilities are installed.

### T31.3: Automated Verification & Integration Suite (`spec:ClosedLoopVerification`)
- [x] T31.3.1: Unit & Integration Tests:
  - [x] T31.3.1.1: Write unit tests verifying `ClosedLoopPrCoordinator` lifecycle: task creation -> PR publish -> review evaluation -> remediation enqueuing on change request -> auto-merge on approval.
  - [x] T31.3.1.2: Write unit tests for `SystemToolScanner` verifying accurate detection of present vs missing binaries and installation command generation.
  - [x] T31.3.1.3: Run full monorepo test suite (`npm test`) asserting 100% pass rate.

---

## Archived Phase 32: Autonomous Continuous Arena Engine & Self-Taskcade Database Grooming
*Completed & Verified in Phase 32 Verification Suite*

### T32.1: Autonomous Taskcade Self-Grooming & In-Database Task Planning (`spec:DatabaseTaskcadeGroomer`)
- [x] T32.1.1: Database-Native Taskcade Storage & Grooming Engine:
  - [x] T32.1.1.1: Define `TaskcadePlanningService` in `@cacophony/engine`: parses high-level system objectives and decomposes them directly into `tasks` and `task_stages` tables in PGlite.
  - [x] T32.1.1.2: Implement autonomous queue replenishment: when active queue drops below threshold, automatically trigger Frontier/Ollama task decomposition from backlog objectives.
  - [x] T32.1.1.3: Provide database status sync between PGlite and `docs/taskcade.md` tracking execution lifecycle state.

### T32.2: Continuous Autonomous Code Generation & Self-Healing Execution Daemon (`spec:AutonomousExecutionDaemon`)
- [x] T32.2.1: Continuous Execution Loop Integration:
  - [x] T32.2.1.1: Connect `TaskScheduler.setExecutionHandler` to an autonomous worker pipeline: Context Minimizer -> Ollama/Frontier Code Generation -> Deterministic Rule Pipeline -> Scoped Test Verification -> Git Checkpoint.
  - [x] T32.2.1.2: If generation or compilation fails, automatically trigger `ClosedLoopTestRemediator` with compiler/LSP error feedback.
---

## Archived Phase 33: Multi-Hour Autonomous Continuous Arena Stream & Multi-Stack Self-Evolution
*Completed & Verified in Phase 33 Verification Suite*

### T33.1: Sustained Multi-Hour Autonomous Task Execution Stream (`spec:SustainedTaskStream`)
- [x] T33.1.1: Multi-Hour Arena Autonomous Workstream:
  - [x] T33.1.1.1: Seed `TaskcadePlanningService` with comprehensive engineering backlog (3+ hours estimated runtime across multi-language benchmarks, AST refactoring, and deterministic scrub tests).
  - [x] T33.1.1.2: Enforce ThermalGovernor throttling and Vega APU VRAM headroom preservation during long continuous runs.
  - [x] T33.1.1.3: Continuous queue replenishment: autonomously ingest tasks from Gitea issues, internal backlog, and failure retries without manual operator intervention.

### T33.2: Multi-Stack Profile Expansion & Cross-Language AST Verification (`spec:MultiStackAstVerification`)
- [x] T33.2.1: Multi-Stack Benchmark Tasks:
  - [x] T33.2.1.1: Java/Maven micro-benchmark task: compile and verify Java AST interface signatures and JUnit test execution.
  - [x] T33.2.1.2: Go struct signature harvesting and unit test runner integration.
  - [x] T33.2.1.3: TypeScript NodeNext vs Bundler dynamic stack switching verification.

### T33.3: Operational Runbook & Background Process Supervisor (`spec:ProcessSupervisorValidation`)
- [x] T33.3.1: Daemon Lifecycle & Live Dashboard Monitoring:
  - [x] T33.3.1.1: Launch Cacophony engine background daemon (`bin/cacophony start --daemon`).
  - [x] T33.3.1.2: Verify HTTP server listening on port 24161 and serving live Angular dashboard.
  - [x] T33.3.1.3: Verify SSE event stream `/api/events` actively broadcasting sensor telemetry and execution stage progress.

---

## Archived Phase 34: Enterprise SSO & Dynamic Identity Integration (Authentik, Authelia, Gitea OAuth2)
*Completed & Verified in Phase 34 Enterprise SSO Verification Suite*

### T34.1: Authentik & Authelia OIDC Discovery and Configuration Endpoint Provider
  - [x] T34.1.1: Implement OidcDiscoveryService in packages/engine/src/auth/ to parse .well-known/openid-configuration from configurable ISSUER_URL with caching.
  - [x] T34.1.2: Implement JwksKeyManager in packages/engine/src/auth/ to dynamically fetch, parse, and rotate public RSA/ECDSA signing keys from the JWKS URI.
  - [x] T34.1.3: Add REST endpoint GET /api/config/auth returning dynamic provider status (Gitea OAuth, Authentik, Authelia) with client redirect URLs.
  - [x] T34.1.4: Add environment configuration schema in conf/cacophony.example.json for OIDC_ISSUER_URL, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET.

### T34.2: JWT Signature Verification, Claims Decoding & Nonce Protection
  - [x] T34.2.1: Implement JwtValidator in packages/engine/src/auth/ verifying RS256/ES256 signatures against cached JWKS keys without external Node crypto polyfills.
  - [x] T34.2.2: Enforce standard claim validations: issuer matching, audience matching, expiration (exp), not-before (nbf), and anti-replay nonce.
  - [x] T34.2.3: Support fallback HS256 HMAC verification using VAULT_MASTER_KEY for internal daemon session tokens.
  - [x] T34.2.4: Write unit tests verifying valid token acceptance and rejection of expired, malformed, or altered tokens.

### T34.3: User Session Lifecycle, Refresh Token Flow & Revocation
  - [x] T34.3.1: Create SQL table user_sessions (session_id, user_id, provider, access_token_enc, refresh_token_enc, expires_at, created_at) in packages/db.
  - [x] T34.3.2: Implement SessionRepository in packages/db with encryption via SecretVault for persistent tokens.
  - [x] T34.3.3: Implement POST /api/auth/refresh endpoint exchanging valid refresh tokens for fresh access tokens via upstream IdP.
  - [x] T34.3.4: Implement POST /api/auth/logout endpoint revoking local session and notifying upstream IdP end_session_endpoint.

### T34.4: Role-Based Access Control (RBAC) & Tiered Authorization
  - [x] T34.4.1: Define UserRole enum (ADMIN, OPERATOR, VIEWER) and AuthContext in packages/shared-types.
  - [x] T34.4.2: Implement AuthorizationMiddleware in CacophonyHttpServer enforcing required permission tiers on mutating endpoints (e.g. POST /api/tasks requires OPERATOR+).
  - [x] T34.4.3: Map upstream IdP group claims (e.g. authentik groups, gitea admin flag) to Cacophony internal roles in AuthService.
  - [x] T34.4.4: Update Angular frontend navigation to conditionally disable or hide sensitive management controls for read-only VIEWER sessions.

---

## Archived Phase 35: Hardware Telemetry Capture, Prometheus Exporter & Success Analytics
*Completed & Verified in Phase 35 Telemetry & Analytics Suite*

### T35.1: High-Fidelity Telemetry Persistence & Time-Series Sampling
  - [x] T35.1.1: Update TelemetryRepository.recordSnapshot to persist full APU metrics: vddgfxMv, socMv, vddnbMv, pptWatts, sclkMhz, mclkMhz, and thermalZone.
  - [x] T35.1.2: Implement sliding-window circular buffer in TelemetryPoller storing last 300 data points (5 minutes at 1s interval) in memory for instant chart hydration.
  - [x] T35.1.3: Expose REST endpoint GET /api/telemetry/history?window=1h returning aggregated min/avg/max telemetry buckets for dashboard rendering.
  - [x] T35.1.4: Add automated pruning cron in CacophonyDaemon deleting telemetry snapshots older than retention limit (default 14 days).

### T35.2: Task Execution Telemetry & Model Pass-Rate Correlation Engine
  - [x] T35.2.1: Create SQL table task_telemetry_correlations linking taskId to avgGpuBusy, peakEdgeTemp, totalTokens, avgTokensPerSec, and APU thermal throttle events.
  - [x] T35.2.2: Implement TelemetryCorrelationService calculating thermal impact and inference velocity per model family (qwen vs deepseek vs gemma).
  - [x] T35.2.3: Expose REST endpoint GET /api/analytics/models returning model efficiency scores (tokens/sec per Watt, failure rate vs temperature).
  - [x] T35.2.4: Integrate correlation metrics into model selection heuristic in TaskScheduler to prefer cooler-running models when APU is in warm/elevated zone.

### T35.3: Prometheus & OpenMetrics Compatibility Endpoint
  - [x] T35.3.1: Implement PrometheusMetricsExporter in packages/engine/src/telemetry/ formatting metrics according to OpenMetrics text specification.
  - [x] T35.3.2: Export gauges: cacophony_gpu_busy_percent, cacophony_vram_used_bytes, cacophony_vram_total_bytes, cacophony_apu_temp_celsius, cacophony_power_watts.
  - [x] T35.3.3: Export counters: cacophony_tasks_total{status, role, model}, cacophony_tokens_total{direction}, cacophony_scheduler_pacing_delay_seconds_total.
  - [x] T35.3.4: Expose GET /metrics endpoint in CacophonyHttpServer for scraping by external Prometheus/Grafana instances.

---

## Archived Phase 36: Heterogeneous Multi-Device Accelerator Grid & Remote Fleet Discovery
*Completed & Verified in Phase 36 Accelerator Grid Suite*

### T36.1: Multi-GPU Card Sysfs Discovery & Device Enumerator
  - [x] T36.1.1: Expand AmdVegaTelemetryProvider to enumerate all card0, card1, cardN instances in /sys/class/drm and /sys/class/hwmon.
  - [x] T36.1.2: Implement GpuDeviceManager in packages/engine/src/hardware/ maintaining registry of all detected GPUs/APUs with driver type, VRAM, and PCI bus ID.
  - [x] T36.1.3: Update GET /api/system to return array of detected accelerators: [{ id, name, pciBus, vramTotal, isPrimaryApu }].
  - [x] T36.1.4: Update Angular HardwareMonitorComponent to render a responsive device grid card when multiple GPUs are present, with per-card usage/temperature gauges.

### T36.2: Fleet Node WebSocket Communication & Remote Telemetry Feed
  - [x] T36.2.1: Implement FleetWebSocketClient in packages/engine/src/fleet/ connecting local worker daemon to primary orchestration node.
  - [x] T36.2.2: Implement bidirectional heartbeat and node capacity reporting: available VRAM, active model, pending task queue count.
  - [x] T36.2.3: Implement remote task delegation protocol: primary scheduler dispatches task payload to worker node and streams tokens back over WebSocket.
  - [x] T36.2.4: Add node status monitoring and disconnect handling: automatically re-queue running tasks if remote node heartbeat drops for >15s.

---

## Archived Phase 37: Multi-Stack Profile Verifiers, AST Inversion Repair & Scrubber Catalog
*Completed & Verified in Commit: `7393190`*

### T37.1: TypeScript AST Parameter Inversion & Signature Scrubber
  - [x] T37.1.1: Implement AstParameterCorrectionRules in packages/engine/src/rules/catalog/ using TypeScript AST parser to detect transposed arguments.
  - [x] T37.1.2: Implement deterministic repair rule verifying parameter name matching between call-site expressions and function declarations.
  - [x] T37.1.3: Add unit tests verifying inverted function arguments (e.g. fn(b, a) when definition is fn(a, b)) are automatically corrected.
  - [x] T37.1.4: Register AstParameterCorrectionRules in RulePipelineEngine standard post_generation hook.

### T37.2: Go Struct Signature Harvester & Cross-Language AST Parser
  - [x] T37.2.1: Implement GoSignatureHarvester in packages/engine/src/signature/ extracting struct definitions, interface methods, and package comments from .go files.
  - [x] T37.2.2: Add go test command scoping and test assertion extraction in QueueGroomer for Go projects.
  - [x] T37.2.3: Implement Go AST scrubber stripping forbidden emojis and enforcing gofmt-compliant tab indentation in generated Go source.
  - [x] T37.2.4: Write unit tests verifying Go struct signature extraction and verification against mock go.mod projects.

### T37.3: Rust Struct & Trait Signature Harvester
  - [x] T37.3.1: Implement RustSignatureHarvester in packages/engine/src/signature/ parsing pub struct, pub trait, and pub fn definitions from Cargo projects.
  - [x] T37.3.2: Add cargo test scoping in QueueGroomer detecting workspace member crates and applying -p <crate> flags.
  - [x] T37.3.3: Implement Rust syntax scrubber stripping markdown fences, unescaped raw string literals, and emoji comments.
  - [x] T37.3.4: Write unit tests verifying Cargo workspace package detection and scoped test command resolution.

---

## Archived Phase 38: Automated Test Runner Guardrails, Process Sandboxing & Failure Taxonomy
*Completed & Verified in Commit: `f057b87`*

### T38.1: Sandboxed Subprocess Execution with Memory & Timeout Bounds
  - [x] T38.1.1: Implement SandboxedProcessRunner in packages/engine/src/testing/ executing test commands via child_process.spawn with strict timeout and maxBuffer.
  - [x] T38.1.2: Enforce process group termination: kill all child spawned subprocesses on timeout to prevent zombie compiler/test processes.
  - [x] T38.1.3: Capture stdout and stderr streams in real-time, enforcing maximum log output size limit (default 256KB) to avoid memory bloating.
  - [x] T38.1.4: Persist structured test results (exitCode, durationMs, stdoutSnippet, stderrSnippet) into task_stages table.

### T38.2: Failure Cause Classifier & Automated Root-Cause Taxonomy
  - [x] T38.2.1: Implement FailureClassifier in packages/engine/src/analytics/ categorizing test failures into taxonomy buckets: SYNTAX_ERROR, TYPE_MISMATCH, ASSERTION_FAILURE, TIMEOUT, MISSING_DEPENDENCY.
  - [x] T38.2.2: Extract specific failure line numbers and error messages from stack traces (Jest, Vitest, cargo test, go test, mvn test).
  - [x] T38.2.3: Expose REST endpoint GET /api/analytics/failures returning historical failure cause distributions across models and roles.
  - [x] T38.2.4: Feed classified failure context into ClosedLoopTestRemediator prompt for targeted one-shot error repair.

---

## Archived Phase 39: Closed-Loop Gitea PR Automation, GitOps & Micro-Checkpoints
*Completed & Verified in Commit: `c7d01a3`*

### T39.1: Autonomous Git Worktree Allocation & Ephemeral Branch Isolation
  - [x] T39.1.1: Implement GitWorktreeManager in packages/engine/src/git/ creating isolated git worktrees per task under workspaces/worktree-<taskId>.
  - [x] T39.1.2: Enforce branch naming convention: task/<priority>-<taskId>-<slug> branching off targetBranch (default main).
  - [x] T39.1.3: Implement automated cleanup: prune worktree directories and branches when task reaches terminal state (COMPLETED or FAILED after retries).
  - [x] T39.1.4: Write unit tests verifying clean git worktree creation, commit isolation, and worktree removal.

### T39.2: Gitea Automated PR Creation & Inline Review Remediation Loop
  - [x] T39.2.1: Implement AutomatedPrPublisher in packages/engine/src/gitea/ pushing branch to Gitea and creating Pull Request with structured task summary.
  - [x] T39.2.2: Implement GiteaWebhookDispatcher handling pull_request and pull_request_review webhooks on port 24161.
  - [x] T39.2.3: When PR review request changes is received, automatically dispatch remediation task targeting the existing PR branch.
  - [x] T39.2.4: When PR review is APPROVED, trigger automated squash-and-merge via Gitea API and mark task COMPLETED.

---

## Archived Phase 40: Mobile-First UI Density, Multi-Theme Palettes & Interactive Drill-Downs
*Completed & Verified in Commit: `ab7712f`*

### T40.1: Deep Multi-Level Drill-Down Views for Tasks, History & Telemetry
  - [x] T40.1.1: Enhance TaskDetailModalComponent with tabbed sub-views: Overview, Stages & Timings, Code Diffs, Full Stream Log, Test Stderr.
  - [x] T40.1.2: Add copy-to-clipboard actions for prompt, diff, test command, and terminal logs.
  - [x] T40.1.3: Implement direct task URL routing (/tasks/:id) so any task or history item can be directly bookmarked and shared.
  - [x] T40.1.4: Ensure all modal dialogs and drill-down panels have touch-friendly close buttons and escape key listeners complying with mobile-first standards.

### T40.2: Curated Color Theme Palettes & Dynamic Dark/Light Mode
  - [x] T40.2.1: Add theme definitions in packages/frontend/src/styles.css for OLED Dark, Nord, Cyberpunk Charcoal, and Minimalist Light.
  - [x] T40.2.2: Update ThemeService to store active theme in localStorage and toggle between dark, light, and high-contrast modes.
  - [x] T40.2.3: Verify contrast ratios meet WCAG AA standards (> 4.5:1 for body text, > 3:1 for badges and gauges) across all themes.
  - [x] T40.2.4: Add visual theme selector in top navigation bar and Settings page.
