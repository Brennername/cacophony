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
  - [x] T21.2.2.1: Create `GanttTransportComponent` (standalone): Horizontal timeline with moving transport head scrub bar.
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
  - [x] T26.1.1.1: Implement `HistoricalArenaIngestionAdapter` in `@cacophony/engine` reading empirical telemetry from versioned arena datasets (`data/arena/` or `ARENA_DATASET_DIR`) across format revisions without relying on legacy scripts.
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
    - Generate kernel module parameter configuration `/etc/modprobe.d/amdgpu.conf` with `options amdgpu lockup_timeout=180000` to prevent compute ring resets.
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

---

## Archived Phase 41: Database Engine Portability, Auto-Vacuuming & Storage Optimization
*Completed & Verified in Commit: `23f59ad`*

### T41.1: PGlite WAL Compaction & Automated Vacuum Daemon
  - [x] T41.1.1: Implement DatabaseMaintenanceService in packages/db/ running periodic VACUUM ANALYZE and checkpoint compaction.
  - [x] T41.1.2: Add storage size monitoring: track PGlite directory size in data/cacophony_pglite and emit warning if size exceeds threshold.
  - [x] T41.1.3: Implement telemetry table partitioning: split telemetry_snapshots by week or archive older snapshots to parquet/json files.
  - [x] T41.1.4: Write integration test verifying database compaction does not lock active task transactions.

### T41.2: Multi-Driver Compatibility Verification (PostgreSQL, SQLite, MariaDB)
  - [x] T41.2.1: Verify DDL migrations on external PostgreSQL 16+ instance using pg connection string.
  - [x] T41.2.2: Verify SQLite fallback driver in node:sqlite experimental mode for zero-dependency local runs.
  - [x] T41.2.3: Document DB_DRIVER and DB_CONNECTION_STRING configuration options in conf/cacophony.example.json.
  - [x] T41.2.4: Write cross-driver repository test asserting identical CRUD behavior across PGlite and SQLite drivers.

---

## Archived Phase 42: AST Dependency Slicing & Context Token Minimizer
*Completed & Verified in Commit: `460780d`*

### T42.1: AST Slicing & Focused Import Skeleton Generator
  - [x] T42.1.1: Implement AstContextSlicer in packages/engine/src/context/ parsing referenced imports and extracting only utilized function/type signatures.
  - [x] T42.1.2: Replace full file content of secondary dependencies with compact type skeletons in ContextMinimizer.
  - [x] T42.1.3: Benchmark token reduction: assert at least 40% reduction in prompt token size on multi-file refactoring tasks.
  - [x] T42.1.4: Write unit tests verifying generated import skeletons preserve type fidelity without breaking compiler verification.

---

## Archived Phase 43: Frontier Fallback Router, Circuit Breaker & Quota Tracking
*Completed & Verified in Commit: `85f194b`*

### T43.1: Frontier Fallback Router with Provider Circuit Breakers
  - [x] T43.1.1: Implement CircuitBreaker in packages/engine/src/inference/ tracking 429 rate-limits and 5xx errors per external provider (OpenAI, Anthropic, Gemini).
  - [x] T43.1.2: Automatically fall back to secondary provider or high-reasoning local model (deepseek-r1:8b) when circuit opens.
  - [x] T43.1.3: Implement TokenQuotaTracker recording daily and monthly token consumption and estimated dollar cost per provider.
  - [x] T43.1.4: Expose GET /api/config/quotas endpoint returning remaining token budget and circuit breaker health statuses.

---

## Archived Phase 44: Cross-Workspace Sandboxing, Dynamic IPC Channels & Multi-Session Isolation
*Completed & Verified in Commit: `8a39ff5`*

### T44.1: Multi-Workspace Sandbox Isolation & Subprocess Limits
  - [x] T44.1.1: Implement WorkspaceIsolationManager in packages/engine/src/isolation/ managing per-workspace temporary roots, permissions, and environment sandboxing.
  - [x] T44.1.2: Add memory limits and process group cgroup isolation controls to prevent external compiler subprocesses from destabilizing the host system.
  - [x] T44.1.3: Provide automated cleanup of stale temporary workspaces when sessions terminate or reach idle timeout.
  - [x] T44.1.4: Write unit and integration tests verifying concurrent task execution across isolated workspace sandboxes without path collisions.

---

## Archived Phase 45: Real-Time Stream Tap Filtering, Telemetry HUD Metrics & Visual Pacing Alerts
*Completed & Verified in Commit: `460780d`*

*RDF Category: telemetry*

### T45.1: Real-Time Telemetry HUD Stream Filtering & Visual Pacing Alerts
  - [x] T45.1.1: Implement TelemetryHudBridge in packages/engine/src/telemetry/ streaming high-frequency AMD Vega sensor readouts (VRAM, APU frequency, edge temp, PPT watts) to WebSocket/SSE clients.
  - [x] T45.1.2: Add visual thermal pacing alert thresholds in frontend TelemetryBar for Nominal (<70C), Warm (70-79C), Elevated (80-89C), and Danger (>=90C).
  - [x] T45.1.3: Integrate automated pacing status in DashboardViewComponent showing active model pacing delays (0s, 5s, 15s).
  - [x] T45.1.4: Write frontend unit tests verifying reactive signal updates on telemetry threshold crossings.

---

---

## Archived Phase 46: End-to-End Autonomous Pipeline Integration: Multi-Stage Telemetry, Git Worktrees & PR Automation
*Completed & Verified in Commit: `460780d`*

*RDF Category: orchestration*

### T46.1: Live Pipeline Multi-Stage Transitions & Real-Time Stepper Telemetry
  - [x] T46.1.1: Connect AutonomousWorkerPipeline stages (Planning, Generation, Scrubbing, Testing, Review, Merge) to stageRepo records and broadcast stage transitions over SSE. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T46.1.2: Update TaskInspectorComponent stage stepper to dynamically highlight active pipeline stages in real-time instead of hardcoded stage numbers. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test]
  - [x] T46.1.3: Persist generated code diffs directly into task.logSnippet so Code Diffs tab in TaskDetailModalComponent displays actual diffs. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T46.1.4: Write unit tests verifying stage transition broadcasts and stage timing telemetry. [File: packages/engine/src/tests/stage_telemetry.test.ts] [Test: npm test -- packages/engine/src/tests/stage_telemetry.test.ts]

### T46.2: Git Worktree Branch Isolation & Autonomous Gitea PR Publication
  - [x] T46.2.1: Integrate GitWorktreeManager with AutonomousWorkerPipeline: create ephemeral branch `task/<priority>-<taskId>` per task execution. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T46.2.2: Commit verified code modifications to task branch using git worktree without touching main workspace. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T46.2.3: Wire AutomatedPrPublisher to open pull requests in Gitea automatically upon test passing. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T46.2.4: Write integration tests verifying automated branch creation, commit creation, and PR publication workflow. [File: packages/engine/src/tests/gitea_integration.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]

---

---

## Archived Phase 48: UI Mock Elimination & Full-Stack Service Wiring
*Completed & Verified in Commit: `460780d`*

*RDF Category: frontend*
*Note: Targets production UI and component stub mocks only. Preserves `MockInferenceStreamProvider` and `FallbackTelemetryProvider` for `DEMO_MODE=true` / `SIMULATION_MODE=true` visual showcase functionality.*

### T48.1: Eliminate Mock in FrontierModalComponent via Real Decomposition API
  - [x] T48.1.1: Add backend endpoint POST /api/tasks/decompose invoking FrontierTaskDecomposer.decomposeEpic(). [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/tasks/decompose] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T48.1.2: Remove simulateDecomposition() setTimeout mock in FrontierModalComponent and call /api/tasks/decompose via fetch. [File: packages/frontend/src/app/components/frontier-modal/frontier-modal.component.ts] [Method: FrontierModalComponent.decomposeWithFrontier] [Test: npm test]
  - [x] T48.1.3: Wire FrontierModalComponent.commitTasks() to call POST /api/tasks/batch to persist decomposed tasks directly to database. [File: packages/frontend/src/app/components/frontier-modal/frontier-modal.component.ts] [Method: FrontierModalComponent.commitTasks] [Test: npm test]
  - [x] T48.1.4: Write frontend unit tests verifying FrontierModalComponent states (analyzing, previews rendered, commit dispatched). [File: packages/frontend/src/app/components/frontier-modal/frontier-modal.component.spec.ts] [Test: npm test]

### T48.2: Eliminate Mock in FleetViewComponent via Dynamic Hardware & Node Queries
  - [x] T48.2.1: Initialize nodes signal in FleetViewComponent as empty array instead of hardcoded node-master-vega dummy objects. [File: packages/frontend/src/app/components/views/fleet-view.component.ts] [Class: FleetViewComponent] [Test: npm test]
  - [x] T48.2.2: Implement FleetNodeManager in engine registering local engine as node-local on startup with live telemetry. [File: packages/engine/src/fleet/FleetNodeManager.ts] [Class: FleetNodeManager] [Test: npm test -- packages/engine/src/tests/fleet_manager.test.ts]
  - [x] T48.2.3: Update GET /api/fleet/nodes in CacophonyHttpServer to return live registered nodes from FleetNodeManager. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/fleet/nodes] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T48.2.4: Write frontend unit tests verifying FleetViewComponent displays real node telemetry and handles empty node lists cleanly. [File: packages/frontend/src/app/components/views/fleet-view.component.spec.ts] [Test: npm test]

### T48.3: Eliminate Mock in GanttTransportComponent via Real Stage Spans
  - [x] T48.3.1: Remove hardcoded default fake spans array from GanttTransportComponent inputs and default to empty array. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.ts] [Class: GanttTransportComponent] [Test: npm test]
  - [x] T48.3.2: Bind TaskInspectorComponent to pass live task stage spans into app-gantt-transport [spans]="activeTaskSpans()". [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Class: TaskInspectorComponent] [Test: npm test]
  - [x] T48.3.3: Implement activeTaskSpans computed signal in TaskInspectorComponent fetching /api/tasks/:id/gantt for current task. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Computed: activeTaskSpans] [Test: npm test]
  - [x] T48.3.4: Write frontend unit tests verifying GanttTransportComponent renders real stage timelines with correct millisecond offsets. [File: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.spec.ts] [Test: npm test]

### T48.4: Eliminate Mock in RepoStateService & RepoMapViewerComponent via AST Harvester
  - [x] T48.4.1: Implement WorkspaceSymbolHarvester in packages/engine/src/repomap/ using TypeScript Compiler API to extract actual symbols. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Class: WorkspaceSymbolHarvester] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [x] T48.4.2: Replace static symbols in GET /api/repomap with live output from WorkspaceSymbolHarvester. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/repomap] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T48.4.3: Update RepoStateService.fetchRepoSymbols() to handle dynamic node centrality and symbol types without static fallbacks. [File: packages/frontend/src/app/services/repo-state.service.ts] [Method: RepoStateService.fetchRepoSymbols] [Test: npm test]
  - [x] T48.4.4: Write unit tests verifying that TypeScript classes, interfaces, and methods in packages/ are correctly mapped to RepoSymbolNode. [File: packages/engine/src/tests/symbol_harvester.test.ts] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]

### T48.5: Eliminate Mock in CheckpointTimelineComponent via Git Shadow Checkpoints
  - [x] T48.5.1: Implement GitCheckpointManager in packages/engine/src/gitea/ querying git log --tags=checkpoint-* for shadow commit history. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Class: GitCheckpointManager] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [x] T48.5.2: Replace static single checkpoint in GET /api/checkpoints with dynamic checkpoint records from GitCheckpointManager. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/checkpoints] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T48.5.3: Add POST /api/checkpoints/:id/revert endpoint executing git checkout or git reset to target checkpoint. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/checkpoints/:id/revert] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T48.5.4: Write frontend unit tests verifying CheckpointTimelineComponent dispatches undo/redo requests to revert API. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.spec.ts] [Test: npm test]

### T48.6: Mount and Wire ExecutionModeSelectorComponent Across App & Backend
  - [x] T48.6.1: Add executionMode signal ('plan' | 'build' | 'auto') to ArenaStateStore with localStorage persistence. [File: packages/frontend/src/app/services/arena-state.store.ts] [Signal: executionMode] [Test: npm test]
  - [x] T48.6.2: Bind ExecutionModeSelectorComponent in app.ts to ArenaStateStore.executionMode with two-way signal binding. [File: packages/frontend/src/app/app.ts] [Template: app-execution-mode-selector] [Test: npm test]
  - [x] T48.6.3: Add GET/PUT /api/config/execution-mode endpoints in CacophonyHttpServer syncing safety mode with engine daemon. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: /api/config/execution-mode] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T48.6.4: Write frontend unit tests verifying safety mode toggling updates store, notifies backend, and adjusts UI indicators. [File: packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.spec.ts] [Test: npm test]

### T48.7: Wire ExplorationControlComponent to Real BanditTaskScheduler Telemetry
  - [x] T48.7.1: Add GET /api/bandit/arms endpoint in CacophonyHttpServer exposing live BanditTaskScheduler arm statistics. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/bandit/arms] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T48.7.2: Add PUT /api/bandit/policy endpoint in CacophonyHttpServer dynamically updating active exploration policy and epsilon. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: PUT /api/bandit/policy] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T48.7.3: Remove hardcoded dummy arms from ExplorationControlComponent and fetch real arms from /api/bandit/arms on init. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts] [Class: ExplorationControlComponent] [Test: npm test]
  - [x] T48.7.4: Write frontend unit tests verifying policy selection and epsilon slider changes call backend API and update signals. [File: packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm test]

### T48.8: Wire LspTestLoopPanelComponent to Real Language Server Diagnostics
  - [x] T48.8.1: Implement LspDiagnosticCollector in packages/engine/src/lsp/ running TypeScript compiler diagnostics across modified files. [File: packages/engine/src/lsp/LspDiagnosticCollector.ts] [Class: LspDiagnosticCollector] [Test: npm test -- packages/engine/src/tests/lsp_collector.test.ts]
  - [x] T48.8.2: Replace empty array in GET /api/diagnostics with real compiler error/warning diagnostics from LspDiagnosticCollector. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/diagnostics] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T48.8.3: Wire RepomapViewComponent to pass live diagnostics and scoped test runner state into LspTestLoopPanelComponent. [File: packages/frontend/src/app/components/views/repomap-view.component.ts] [Class: RepomapViewComponent] [Test: npm test]
  - [x] T48.8.4: Write frontend unit tests verifying LspTestLoopPanelComponent renders error pills with line numbers and triggers reRunTests. [File: packages/frontend/src/app/components/lsp-test-loop-panel/lsp-test-loop-panel.component.spec.ts] [Test: npm test]

### T48.9: Mobile-First Shell Fit & Responsive Viewport Elimination of Pinch-to-Zoom
  - [x] T48.9.1: Constrain ExecutionModeSelectorComponent and SessionTabsComponent with :host display block, width 100%, and min-width 0, removing the 140px fixed option width blowout. [File: packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.ts] [Test: npm test]
  - [x] T48.9.2: Constrain HardwareMonitorComponent badges, subtext, and sensors-grid using minmax(0, 1fr) and flexible high-water mark badge widths. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Test: npm test]
  - [x] T48.9.3: Add word-break break-all and overflow-wrap anywhere to TaskInspectorComponent terminal logs and enable touch scrolling on stepper container. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test]
  - [x] T48.9.4: Add global viewport shield to styles.css ensuring all media, tables, pre/code blocks, and component hosts conform to 100% viewport width without horizontal scrollbars. [File: packages/frontend/src/styles.css] [Test: npm test]

---

---

## Archived Phase 49: Centralized Multi-Stage Telemetry Engine & Live Operational Console
*Completed & Verified in Commit: `460780d`*

*RDF Category: telemetry*

### T49.1: Instrument AutonomousWorkerPipeline for All Six Pipeline Stages
  - [x] T49.1.1: Record 'planning' stage in stageRepo on task dispatch: duration of context assembly and focus file discovery. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Stage: planning] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T49.1.2: Record 'generation' stage in stageRepo: duration of LLM inference, total input tokens, total output tokens, and average tok/s. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Stage: generation] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T49.1.3: Record 'scrub' stage in stageRepo: AST parameter correction checks, placeholder stub detection, and rule diff summary. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Stage: scrub] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T49.1.4: Record 'git_commit' stage in stageRepo: worktree branch creation, commit SHA, and changed file list. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Stage: git_commit] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]

### T49.2: Broadcast Real-Time Stage Transitions Over Server-Sent Events
  - [x] T49.2.1: Add event types 'stage_start', 'stage_progress', and 'stage_complete' to SSE event contract in shared-types. [File: packages/shared-types/src/index.ts] [Type: SseEventType] [Test: npm test -- packages/engine/src/tests/sse_stream.test.ts]
  - [x] T49.2.2: Emit SSE events from AutonomousWorkerPipeline at the boundary of each pipeline stage transition. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: broadcastStageTransition] [Test: npm test -- packages/engine/src/tests/sse_stream.test.ts]
  - [x] T49.2.3: Update ArenaStateStore to listen for 'stage_start' and 'stage_complete' events and update active task signals. [File: packages/frontend/src/app/services/arena-state.store.ts] [Method: handleSseMessage] [Test: npm test]
  - [x] T49.2.4: Write unit tests verifying that SSE clients receive properly serialized stage transition payloads in real-time. [File: packages/engine/src/tests/sse_stage_events.test.ts] [Test: npm test -- packages/engine/src/tests/sse_stage_events.test.ts]

### T49.3: Centralized Operational Log Stream in TaskInspectorComponent
  - [x] T49.3.1: Create OperationalLogAggregator in engine interleaving LLM tokens, rule scrubber logs, compiler stdout, and git output. [File: packages/engine/src/telemetry/OperationalLogAggregator.ts] [Class: OperationalLogAggregator] [Test: npm test -- packages/engine/src/tests/log_aggregator.test.ts]
  - [x] T49.3.2: Expose unified operational log stream via GET /api/tasks/:id/operational-log for active and historical tasks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/tasks/:id/operational-log] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T49.3.3: Replace token-only terminal in TaskInspectorComponent with tabbed or unified console showing compiler and test outputs. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Class: TaskInspectorComponent] [Test: npm test]
  - [x] T49.3.4: Write frontend unit tests verifying that terminal display updates when test execution stdout or review comments arrive. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.spec.ts] [Test: npm test]

### T49.4: Dynamically Bind TaskInspector Stepper to Active Stage
  - [x] T49.4.1: Create activeStageIndex computed signal in TaskInspectorComponent mapping stage name to step index 1 through 6. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Computed: activeStageIndex] [Test: npm test]
  - [x] T49.4.2: Replace static .step.done and .step.active CSS classes with dynamic [class.done] and [class.active] bindings. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Template: stepper-container] [Test: npm test]
  - [x] T49.4.3: Add error state styling to stepper circle when active stage status is 'FAILURE'. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Style: .step.failed] [Test: npm test]
  - [x] T49.4.4: Write frontend unit tests verifying stepper advances correctly across Planning, Generation, Scrub, Test, Review, Merge. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.spec.ts] [Test: npm test]

### T49.5: Dynamically Bind StageProgressBarComponent to Current Stage
  - [x] T49.5.1: Compute currentStageNumber (1-6) and activeStageLabel dynamically from task's active stage record in store. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Class: TaskInspectorComponent] [Test: npm test]
  - [x] T49.5.2: Replace hardcoded currentStageNumber="3" and activeStageLabel="3/7 Generation" with dynamic inputs. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Template: app-stage-progress-bar] [Test: npm test]
  - [x] T49.5.3: Calculate progressPercent based on completed stages count (e.g. 1/6 = 16%, 2/6 = 33%, etc.). [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Computed: taskProgressPercent] [Test: npm test]
  - [x] T49.5.4: Write frontend unit tests verifying StageProgressBarComponent updates fill width and label as stages advance. [File: packages/frontend/src/app/components/stage-progress-bar/stage-progress-bar.component.spec.ts] [Test: npm test]

### T49.6: Populate TaskDetailModalComponent Stages Tab with Real Stage Telemetry
  - [x] T49.6.1: Ensure GET /api/tasks/:id populates stages array with full records from StageRepository. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/tasks/:id] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T49.6.2: Format stage log accordion in TaskDetailModalComponent to display tokens, duration, and formatted stdout/stderr. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: stages-list] [Test: npm test]
  - [x] T49.6.3: Add visual status badges (PENDING, RUNNING, SUCCESS, FAILURE) with distinct accessible color coding per stage. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Styles: stage-status] [Test: npm test]
  - [x] T49.6.4: Write frontend unit tests verifying that all recorded execution stages render in chronological order with correct durations. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm test]

### T49.7: Populate TaskDetailModalComponent Code Diffs Tab with Unified Git Diffs
  - [x] T49.7.1: Capture git diff of modified focus files inside worktree before commit in AutonomousWorkerPipeline. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: captureWorktreeDiff] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T49.7.2: Store captured diff in task.logSnippet or dedicated diff_summary column in tasks table. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updateLogSnippet] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T49.7.3: Render syntax-highlighted git diff (+ added, - deleted) in Code Diffs tab of TaskDetailModalComponent. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: diff-content] [Test: npm test]
  - [x] T49.7.4: Write frontend unit tests verifying that Code Diffs tab displays actual patch lines when task modifies code. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm test]

### T49.8: Populate TaskDetailModalComponent Test Stderr Tab with Real Runner Output
  - [x] T49.8.1: Persist test stdout and stderr snippets into test_execution stage logOutput in StageRepository. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T49.8.2: Extract test stderr from test_execution stage in TaskDetailModalComponent to populate Test Stderr tab. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Computed: testStderrContent] [Test: npm test]
  - [x] T49.8.3: Add empty state message ("No test failures or stderr warnings recorded") when test suite passed with zero errors. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: tab-stderr] [Test: npm test]
  - [x] T49.8.4: Write frontend unit tests verifying Test Stderr tab correctly displays assertion failures from failed test runs. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm test]

---

---

## Archived Phase 50: Git Worktree Isolation & Ephemeral Task Branch Lifecycle
*Completed & Verified in Commit: `460780d`*

*RDF Category: orchestration*

### T50.1: Git Worktree Allocation on Task Dispatch
  - [x] T50.1.1: Implement GitWorktreeManager.createWorktreeForTask(taskId, branchName) creating isolated directory under /workspaces. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: GitWorktreeManager.createWorktreeForTask] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.1.2: Derive deterministic branch name task/<priority>-<taskId>-<slug> from task attributes. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: generateBranchName] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.1.3: Update task record in TaskRepository with targetBranch name upon worktree allocation. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updateTargetBranch] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T50.1.4: Write unit tests verifying that worktrees are created on separate isolated branches without locking root repo. [File: packages/engine/src/tests/git_worktrees.test.ts] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]

### T50.2: Redirect File Write Operations & Scrubber Hooks to Worktree
  - [x] T50.2.1: Update AutonomousWorkerPipeline to write generated code into worktree path instead of workspaceRoot. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [x] T50.2.2: Pass worktree directory as projectRoot to RulePipelineEngine pre-write and post-write hooks. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [x] T50.2.3: Ensure root workspace remains completely clean (git status porcelain is empty) during task execution. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Assertion: rootWorkspaceClean] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [x] T50.2.4: Write unit tests confirming that code edits happen exclusively within the task's assigned worktree folder. [File: packages/engine/src/tests/worktree_isolation.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_isolation.test.ts]

### T50.3: Execute Sandboxed Test Runner Inside Worktree CWD
  - [x] T50.3.1: Configure SandboxedProcessRunner options to use worktree path as execution cwd. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [RunnerOption: cwd] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [x] T50.3.2: Symlink or reference root node_modules into ephemeral worktree to prevent redundant npm install overhead. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: linkDependencies] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.3.3: Capture test runner exit code and stdout/stderr executed directly within worktree environment. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [x] T50.3.4: Write unit tests verifying test suite executes against modified files in worktree and reports accurate pass/fail. [File: packages/engine/src/tests/worktree_test_runner.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_test_runner.test.ts]

### T50.4: Automated Git Commit Generation with Strict Conventional Formatting
  - [x] T50.4.1: Stage modified focus files using git add inside the worktree directory. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: stageFiles] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.4.2: Create commit with message feat(arena): [taskId] <title> omitting emojis and authoring as Cacophony Agent. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: commitWorktree] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.4.3: Extract git commit SHA and record commit metadata in task_stages git_commit record. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [x] T50.4.4: Write unit tests verifying git commit creation, commit message formatting, and SHA extraction. [File: packages/engine/src/tests/git_commit.test.ts] [Test: npm test -- packages/engine/src/tests/git_commit.test.ts]

### T50.5: Git Worktree Teardown & Safe Pruning
  - [x] T50.5.1: Implement GitWorktreeManager.removeWorktree(taskId) safely unmounting and removing worktree directory. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: GitWorktreeManager.removeWorktree] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.5.2: Execute git worktree prune on task finalization to keep git repository metadata clean. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: pruneWorktrees] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.5.3: Ensure worktree cleanup occurs in a finally block so failures and timeouts still clean up disk space. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Block: finally] [Test: npm test -- packages/engine/src/tests/worktree_pipeline.test.ts]
  - [x] T50.5.4: Write unit tests verifying that worktree folders are cleanly deleted after task completion. [File: packages/engine/src/tests/worktree_cleanup.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_cleanup.test.ts]

### T50.6: Worktree Collision Detection & Stale Directory Eviction
  - [x] T50.6.1: Check if worktree directory already exists prior to allocation and force-prune orphaned worktrees. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: ensureCleanWorktreeDir] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.6.2: Add orphan worktree garbage collection sweep on CacophonyDaemon startup. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: sweepOrphanWorktrees] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [x] T50.6.3: Implement worktree disk usage quota check warning if total worktrees exceed configured storage threshold. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: checkWorktreeDiskUsage] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.6.4: Write unit tests verifying collision avoidance when consecutive tasks have identical branch identifiers. [File: packages/engine/src/tests/worktree_collision.test.ts] [Test: npm test -- packages/engine/src/tests/worktree_collision.test.ts]

### T50.7: Git Status & Changed File Telemetry Capture
  - [x] T50.7.1: Query git status --porcelain inside worktree after test pass to verify exact list of modified files. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: getChangedFiles] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.7.2: Verify no untracked binaries, node_modules artifacts, or secret files (.env) are included in change set. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: validateCleanChangeset] [Test: npm test -- packages/engine/src/tests/git_worktrees.test.ts]
  - [x] T50.7.3: Persist changed file paths and line delta metrics (added/deleted counts) into task record. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updateMetrics] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T50.7.4: Write unit tests ensuring changesets containing prohibited files are rejected before commit creation. [File: packages/engine/src/tests/changeset_validation.test.ts] [Test: npm test -- packages/engine/src/tests/changeset_validation.test.ts]

---

---

## Archived Phase 51: Autonomous Gitea PR Publication & Webhook Synchronization
*Completed & Verified in Commit: `460780d`*

*RDF Category: orchestration*

### T51.1: Push Ephemeral Task Branch to Gitea Remote
  - [x] T51.1.1: Implement GitWorktreeManager.pushBranch(branchName) pushing committed branch to Gitea origin. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: pushBranch] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T51.1.2: Resolve Gitea authenticated push URL using configured GITEA_API_TOKEN from secret vault. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: getAuthenticatedRemoteUrl] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T51.1.3: Add retry backoff for network push operations handling transient Docker network latency. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: pushWithRetry] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T51.1.4: Write integration tests verifying branch push creates branch on local Gitea instance. [File: packages/engine/src/tests/gitea_push.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_push.test.ts]

### T51.2: Open Gitea Pull Request via REST API
  - [x] T51.2.1: Call GiteaApiClient.createPullRequest() specifying head branch, base branch (master), title, and body. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Method: publishPullRequest] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T51.2.2: Generate structured markdown PR description including prompt directive, focus files, and test output. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Method: generatePrBody] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T51.2.3: Record pr_url and pr_number in tasks table and broadcast 'pr_opened' event over SSE. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updatePrUrl] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]
  - [x] T51.2.4: Write integration tests verifying PR creation returns valid PR number and HTML URL from Gitea. [File: packages/engine/src/tests/gitea_pr_creation.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_pr_creation.test.ts]

### T51.3: Update Gitea Commit Status Checks
  - [x] T51.3.1: Implement GiteaApiClient.createCommitStatus(owner, repo, sha, statusPayload) setting commit status. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Method: createCommitStatus] [Test: npm test -- packages/engine/src/tests/gitea_api_client.test.ts]
  - [x] T51.3.2: Report 'pending' status when task begins verification tests, and 'success' upon test passing. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Method: updateCommitCheck] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T51.3.3: Set commit status context to "cacophony/test-suite" with description showing execution duration. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Constant: COMMIT_STATUS_CONTEXT] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T51.3.4: Write unit tests verifying that commit status payloads conform to Gitea OpenAPI commit status schema. [File: packages/engine/src/tests/gitea_commit_status.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_commit_status.test.ts]

### T51.4: Register Gitea Webhooks for Real-Time Notification
  - [x] T51.4.1: Implement GiteaWebhookBootstrap ensuring repo webhook pointing to /api/webhooks/gitea exists on startup. [File: packages/engine/src/gitea/GiteaWebhookReceiver.ts] [Method: ensureWebhookRegistered] [Test: npm test -- packages/engine/src/tests/gitea_webhooks.test.ts]
  - [x] T51.4.2: Sign webhook payloads with shared secret and verify HMAC-SHA256 signature in GiteaWebhookReceiver. [File: packages/engine/src/gitea/GiteaWebhookReceiver.ts] [Method: verifySignature] [Test: npm test -- packages/engine/src/tests/gitea_webhooks.test.ts]
  - [x] T51.4.3: Handle pull_request events ('opened', 'closed', 'reopened', 'synchronized') updating task state in DB. [File: packages/engine/src/gitea/GiteaWebhookReceiver.ts] [Method: handlePullRequestEvent] [Test: npm test -- packages/engine/src/tests/gitea_webhooks.test.ts]
  - [x] T51.4.4: Write unit tests verifying that valid webhook events trigger appropriate repository state updates. [File: packages/engine/src/tests/gitea_webhooks.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_webhooks.test.ts]

### T51.5: Gitea OAuth2 & API Token Secure Lifecycle
  - [x] T51.5.1: Implement GiteaTokenRotator checking token expiration and requesting fresh tokens via OAuth2 refresh grant. [File: packages/engine/src/gitea/GiteaOAuthProvider.ts] [Method: refreshToken] [Test: npm test -- packages/engine/src/tests/gitea_auth.test.ts]
  - [x] T51.5.2: Store updated access and refresh tokens encrypted in secret_vault table using AES-256-GCM. [File: packages/db/src/repositories/VaultRepository.ts] [Method: VaultRepository.saveSecret] [Test: npm test -- packages/db/src/tests/VaultRepository.test.ts]
  - [x] T51.5.3: Fallback gracefully to GITEA_API_TOKEN environment variable when OAuth2 token is unavailable. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Method: resolveAuthHeader] [Test: npm test -- packages/engine/src/tests/gitea_api_client.test.ts]
  - [x] T51.5.4: Write unit tests verifying encrypted storage and retrieval of Gitea authentication tokens. [File: packages/engine/src/tests/gitea_token_vault.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_token_vault.test.ts]

### T51.6: PR Link Display in Frontend Task Lists & Modals
  - [x] T51.6.1: Update TaskHistoryComponent to render clickable Gitea PR link badge with external link icon. [File: packages/frontend/src/app/components/task-history/task-history.component.ts] [Template: pr-link-badge] [Test: npm test]
  - [x] T51.6.2: Ensure TaskDetailModalComponent overview tab renders active PR URL linking directly to Gitea web UI. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: pr-link] [Test: npm test]
  - [x] T51.6.3: Add PR status badge ('OPEN', 'MERGED', 'CLOSED') dynamically based on Gitea PR state. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Component: PrStatusBadge] [Test: npm test]
  - [x] T51.6.4: Write frontend unit tests verifying that PR link badges display correctly when task.prUrl is populated. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm test]

### T51.7: Gitea Webhook Heartbeat & Connection Health Telemetry
  - [x] T51.7.1: Add Gitea connection status check (HTTP reachability and API latency) in GET /api/status. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/status] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T51.7.2: Broadcast 'gitea_status' event over SSE when Gitea connectivity transitions between ONLINE and OFFLINE. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Method: checkGiteaHealth] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T51.7.3: Display Gitea service status indicator in frontend TelemetryBar alongside database and Ollama indicators. [File: packages/frontend/src/app/components/views/dashboard-view.component.ts] [Template: gitea-status-indicator] [Test: npm test]
  - [x] T51.7.4: Write unit tests verifying Gitea health check accurately detects network timeouts and server errors. [File: packages/engine/src/tests/gitea_health.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_health.test.ts]

---

---

## Archived Phase 52: Autonomous Code Review Loop & Remediation Requeue Engine
*Completed & Verified in Commit: `460780d`*

*RDF Category: orchestration*

### T52.1: Execution Mode Guard: Plan, Build, and Auto Routing
  - [x] T52.1.1: Implement ExecutionSafetyGuard in AutonomousWorkerPipeline enforcing mode constraints. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Class: ExecutionSafetyGuard] [Test: npm test -- packages/engine/src/tests/safety_modes.test.ts]
  - [x] T52.1.2: In 'plan' mode: simulate task execution, generate diff preview, do NOT commit or push, mark COMPLETED. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Mode: plan] [Test: npm test -- packages/engine/src/tests/safety_modes.test.ts]
  - [x] T52.1.3: In 'build' mode: apply edits and run tests, commit to branch and open PR, pause for human approval. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Mode: build] [Test: npm test -- packages/engine/src/tests/safety_modes.test.ts]
  - [x] T52.1.4: In 'auto' mode: execute full closed loop: generate, test, commit, PR, review with model, and auto-merge. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Mode: auto] [Test: npm test -- packages/engine/src/tests/safety_modes.test.ts]

### T52.2: Automated PR Reviewer Model Dispatch
  - [x] T52.2.1: Select best available model (e.g. deepseek-r1:8b or qwen2.5-coder:7b) for the 'reviewer' role. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: selectReviewerModel] [Test: npm test -- packages/engine/src/tests/pr_review_loop.test.ts]
  - [x] T52.2.2: Assemble review prompt with architectural directives, PR unified diff, original task directive, and test output. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: assembleReviewPrompt] [Test: npm test -- packages/engine/src/tests/pr_review_loop.test.ts]
  - [x] T52.2.3: Execute inference with reviewer model and stream review tokens into review stage stream tap. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: evaluatePullRequest] [Test: npm test -- packages/engine/src/tests/pr_review_loop.test.ts]
  - [x] T52.2.4: Write unit tests verifying that reviewer prompt includes full diff context and architectural guidelines. [File: packages/engine/src/tests/reviewer_prompt.test.ts] [Test: npm test -- packages/engine/src/tests/reviewer_prompt.test.ts]

### T52.3: Structural Review Verdict Parsing
  - [x] T52.3.1: Implement ReviewVerdictParser extracting VERDICT: APPROVE | REQUEST_CHANGES | REJECT from model response. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Class: ReviewVerdictParser] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]
  - [x] T52.3.2: Extract line-level review comments: file path, line number, severity ('blocker' | 'warning' | 'nit'), comment text. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: parseInlineComments] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]
  - [x] T52.3.3: Handle ambiguous or unformatted model outputs by defaulting to REQUEST_CHANGES with explanatory note. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: handleUnparseableReview] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]
  - [x] T52.3.4: Write unit tests covering diverse model response formats to ensure robust verdict and comment extraction. [File: packages/engine/src/tests/verdict_parser.test.ts] [Test: npm test -- packages/engine/src/tests/verdict_parser.test.ts]

### T52.4: Post Review Comments & Verdict to Gitea PR
  - [x] T52.4.1: Call GiteaApiClient.submitReview(owner, repo, prNumber, reviewPayload) with verdict and summary notes. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Method: submitReview] [Test: npm test -- packages/engine/src/tests/gitea_api_client.test.ts]
  - [x] T52.4.2: Post inline review comments to specific diff lines using Gitea PR review comment API. [File: packages/engine/src/gitea/AutomatedPrWorkflow.ts] [Method: postInlineReviewComments] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T52.4.3: Persist full review record into pr_reviews database table for audit and historical analysis. [File: packages/engine/src/gitea/AutomatedPrReviewLoop.ts] [Method: persistReviewRecord] [Test: npm test -- packages/engine/src/tests/pr_review_loop.test.ts]
  - [x] T52.4.4: Write integration tests verifying review submission appears on Gitea PR conversation timeline. [File: packages/engine/src/tests/gitea_review_submission.test.ts] [Test: npm test -- packages/engine/src/tests/gitea_review_submission.test.ts]

### T52.5: Auto-Merge on Approval via Gitea API
  - [x] T52.5.1: If verdict is APPROVE, execute squash-and-merge via GiteaApiClient.mergePullRequest(). [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Method: executeCycle] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [x] T52.5.2: Format squash merge title Merge PR #<num>: <taskTitle> and commit message summarizing changes. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Method: executeCycle] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [x] T52.5.3: Delete ephemeral task branch on Gitea remote following successful squash merge. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Method: deleteBranch] [Test: npm test -- packages/engine/src/tests/gitea_api_client.test.ts]
  - [x] T52.5.4: Transition task status to COMPLETED and record completedAt timestamp. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updateStatus] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]

### T52.6: Automated Remediation Requeue on Changes Requested
  - [x] T52.6.1: If verdict is REQUEST_CHANGES, synthesize a P0 remediation task remedy-<taskId>-<timestamp>. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Method: executeCycle] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [x] T52.6.2: Format remediation prompt embedding reviewer notes, flagged comments, and original task directives. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Method: synthesizeRemediationPrompt] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [x] T52.6.3: Target existing task branch so remediation worker commits fixes directly onto the active PR branch. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Property: targetBranch] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [x] T52.6.4: Enqueue remediation task into TaskRepository with priority P0 and status PENDING. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.create] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]

### T52.7: Remediation Stage Telemetry & Stage Stepper Extension
  - [x] T52.7.1: Record 'remediation' stage in task_stages recording reviewer feedback and remediation attempt counter. [File: packages/db/src/repositories/StageRepository.ts] [Stage: remediation] [Test: npm test -- packages/db/src/tests/StageRepository.test.ts]
  - [x] T52.7.2: Broadcast 'remediation_enqueued' event over SSE notifying frontend of kick-back for revisions. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Event: remediation_enqueued] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T52.7.3: Update TaskInspectorComponent to render remediation loop indicator when task has been kicked back. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Component: RemediationBadge] [Test: npm test]
  - [x] T52.7.4: Write unit tests verifying remediation cycle increments failure count and creates correctly targeted P0 task. [File: packages/engine/src/tests/remediation_cycle.test.ts] [Test: npm test -- packages/engine/src/tests/remediation_cycle.test.ts]

### T52.8: Reviewer Model Failure Handling & Escalation
  - [x] T52.8.1: Limit max consecutive remediation cycles to 3 attempts before marking task as ESCALATED_FOR_HUMAN_REVIEW. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Constant: MAX_REMEDIATION_CYCLES] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [x] T52.8.2: Add label 'needs-human-review' to Gitea PR when max automated remediation attempts are exhausted. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Method: addIssueLabels] [Test: npm test -- packages/engine/src/tests/gitea_api_client.test.ts]
  - [x] T52.8.3: Post summary of automated failure causes to Gitea PR comment thread for human developer triage. [File: packages/engine/src/gitea/ClosedLoopPrCoordinator.ts] [Method: postEscalationSummary] [Test: npm test -- packages/engine/src/tests/closed_loop_pr.test.ts]
  - [x] T52.8.4: Write unit tests verifying escalation logic and Gitea label application when remediation loop exceeds threshold. [File: packages/engine/src/tests/review_escalation.test.ts] [Test: npm test -- packages/engine/src/tests/review_escalation.test.ts]

---

---

## Archived Phase 53: AST Symbol Graph Extraction & Interactive RepoMap Engine
*Completed & Verified in Commit: `460780d`*

*RDF Category: repomap*

### T53.1: TypeScript Compiler API Symbol Harvester Implementation
  - [x] T53.1.1: Initialize ts.createProgram() pointing to tsconfig.base.json to parse workspace source files. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: initializeProgram] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [x] T53.1.2: Traverse AST nodes extracting ts.SyntaxKind.ClassDeclaration, InterfaceDeclaration, and FunctionDeclaration. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: visitNode] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [x] T53.1.3: Extract symbol identifiers, exported flags, file paths, line ranges, and JSDoc documentation comments. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: extractSymbolMetadata] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [x] T53.1.4: Write unit tests verifying all exported classes and functions in packages/engine are extracted accurately. [File: packages/engine/src/tests/symbol_harvester.test.ts] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]

### T53.2: Graph Centrality Computation & Edge Mapping
  - [x] T53.2.1: Extract import and export statements to construct directed dependency edges between symbol nodes. [File: packages/engine/src/repomap/SymbolGraphBuilder.ts] [Class: SymbolGraphBuilder] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]
  - [x] T53.2.2: Compute in-degree and PageRank centrality score [0.0, 1.0] for each architectural symbol. [File: packages/engine/src/repomap/SymbolGraphBuilder.ts] [Method: computeCentrality] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]
  - [x] T53.2.3: Identify core architectural hub classes (highest centrality) for context minimization prioritization. [File: packages/engine/src/repomap/SymbolGraphBuilder.ts] [Method: getHubSymbols] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]
  - [x] T53.2.4: Write unit tests verifying that highly imported base utilities have higher centrality scores than leaf modules. [File: packages/engine/src/tests/symbol_graph.test.ts] [Test: npm test -- packages/engine/src/tests/symbol_graph.test.ts]

### T53.3: REST API: GET /api/repomap with In-Memory Caching
  - [x] T53.3.1: Expose GET /api/repomap returning array of RepoSymbolNode with id, name, kind, filePath, centrality. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/repomap] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T53.3.2: Cache symbol graph in memory and invalidate automatically on task completion or file modification. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: invalidateCache] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [x] T53.3.3: Support query parameter ?kind=class|interface|function to filter returned symbol types. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/repomap] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T53.3.4: Write integration tests verifying /api/repomap returns 200 with complete architectural symbol inventory. [File: packages/engine/src/tests/repomap_endpoint.test.ts] [Test: npm test -- packages/engine/src/tests/repomap_endpoint.test.ts]

### T53.4: Interactive SVG Graph Rendering in RepoMapViewerComponent
  - [x] T53.4.1: Render symbol nodes with radius scaled proportionally to centrality score in RepoMapViewerComponent. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Template: svg-graph] [Test: npm test]
  - [x] T53.4.2: Color-code nodes by kind: classes (blue), interfaces (purple), functions (green), methods (amber). [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Style: node-color] [Test: npm test]
  - [x] T53.4.3: Implement zoom and pan controls supporting smooth exploration of dense workspace symbol networks. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Method: onGraphPan] [Test: npm test]
  - [x] T53.4.4: Write frontend unit tests verifying SVG circles and labels are generated for all supplied symbol nodes. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.spec.ts] [Test: npm test]

### T53.5: Symbol Search, Filtering & Detail Drawer
  - [x] T53.5.1: Add search input in RepoMapViewerComponent filtering visible nodes in real-time by symbol name or file path. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Signal: searchQuery] [Test: npm test]
  - [x] T53.5.2: Open side drawer on node click showing full symbol details: export status, line number, and dependents. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Method: selectSymbol] [Test: npm test]
  - [x] T53.5.3: Add "Copy File Path" button in symbol detail drawer for quick developer copy to clipboard. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts] [Method: copyFilePath] [Test: npm test]
  - [x] T53.5.4: Write frontend unit tests verifying search query filter updates displayed SVG node count accurately. [File: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.spec.ts] [Test: npm test]

### T53.6: Incremental AST Invalidation on File System Changes
  - [x] T53.6.1: Connect WorkspaceSymbolHarvester to file system watcher triggering incremental re-parse on file save. [File: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts] [Method: watchFiles] [Test: npm test -- packages/engine/src/tests/symbol_harvester.test.ts]
  - [x] T53.6.2: Broadcast 'repomap_updated' event over SSE when symbol graph changes due to completed tasks. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Event: repomap_updated] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T53.6.3: Update RepoStateService to re-fetch /api/repomap on receiving 'repomap_updated' SSE event. [File: packages/frontend/src/app/services/repo-state.service.ts] [Method: setupSseListener] [Test: npm test]
  - [x] T53.6.4: Write integration tests verifying that modifying a class in packages/ updates symbol graph without server restart. [File: packages/engine/src/tests/incremental_ast.test.ts] [Test: npm test -- packages/engine/src/tests/incremental_ast.test.ts]

---

---

## Archived Phase 54: Git Shadow Micro-Checkpoints & Interactive Time Travel Engine
*Completed & Verified in Commit: `460780d`*

*RDF Category: git*

### T54.1: Git Shadow Checkpoint Creation Before & After Every Stage
  - [x] T54.1.1: Implement GitCheckpointManager.createCheckpoint(taskId, stageName, message) creating git shadow commit ref. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: createCheckpoint] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [x] T54.1.2: Store checkpoint refs under hidden namespace refs/cacophony/checkpoints/<taskId>-<stageName>. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Constant: CHECKPOINT_REF_PREFIX] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [x] T54.1.3: Trigger pre-stage checkpoint before code generation and post-stage checkpoint after rule scrubbing. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/checkpoint_pipeline.test.ts]
  - [x] T54.1.4: Write unit tests verifying that git shadow checkpoint commits preserve exact working tree state. [File: packages/engine/src/tests/git_checkpoints.test.ts] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]

### T54.2: REST API: GET /api/checkpoints Listing Real Historical Snapshots
  - [x] T54.2.1: Query git for all refs in refs/cacophony/checkpoints/ returning commit hash, message, date, and changed files. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: listCheckpoints] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [x] T54.2.2: Map git log output to typed CheckpointRecord array in GET /api/checkpoints. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/checkpoints] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T54.2.3: Support query parameter ?taskId=id to filter checkpoints associated with a specific task execution. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/checkpoints] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T54.2.4: Write integration tests verifying /api/checkpoints returns chronological checkpoint history. [File: packages/engine/src/tests/checkpoints_endpoint.test.ts] [Test: npm test -- packages/engine/src/tests/checkpoints_endpoint.test.ts]

### T54.3: REST API: POST /api/checkpoints/:id/revert One-Click Rollback
  - [x] T54.3.1: Implement GitCheckpointManager.revertToCheckpoint(checkpointId) checking out snapshot into workspace. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: revertToCheckpoint] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [x] T54.3.2: Verify working tree has no uncommitted changes before executing rollback, or create safety backup checkpoint. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: safeRollback] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [x] T54.3.3: Return rollback result: reverted commit hash, affected files count, and updated workspace git status. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/checkpoints/:id/revert] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T54.3.4: Write unit tests verifying workspace rollback restores exact prior file contents. [File: packages/engine/src/tests/checkpoint_revert.test.ts] [Test: npm test -- packages/engine/src/tests/checkpoint_revert.test.ts]

### T54.4: Wire CheckpointTimelineComponent Undo and Redo Operations
  - [x] T54.4.1: Connect Undo button in CheckpointTimelineComponent to call POST /api/checkpoints/:id/revert for prior checkpoint. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts] [Method: triggerUndo] [Test: npm test]
  - [x] T54.4.2: Connect Redo button in CheckpointTimelineComponent to advance to the next forward checkpoint. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts] [Method: triggerRedo] [Test: npm test]
  - [x] T54.4.3: Dynamically compute canUndo and canRedo boolean signals based on activeCheckpointId position in array. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts] [Computed: canUndo] [Test: npm test]
  - [x] T54.4.4: Write frontend unit tests verifying undo/redo buttons disable appropriately at boundaries and trigger API calls. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.spec.ts] [Test: npm test]

### T54.5: Visual Diff Comparison Against Selected Checkpoint
  - [x] T54.5.1: Add endpoint GET /api/checkpoints/:id/diff returning unified diff between checkpoint and current workspace. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/checkpoints/:id/diff] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T54.5.2: Open diff preview drawer in CheckpointTimelineComponent when clicking on a checkpoint row. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts] [Template: checkpoint-diff-drawer] [Test: npm test]
  - [x] T54.5.3: Highlight lines added (+ green) and lines removed (- red) in checkpoint diff view. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts] [Style: diff-line] [Test: npm test]
  - [x] T54.5.4: Write frontend unit tests verifying diff drawer opens on checkpoint selection and renders diff text. [File: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.spec.ts] [Test: npm test]

### T54.6: Checkpoint Retention Policy & Garbage Collection
  - [x] T54.6.1: Implement GitCheckpointManager.pruneOldCheckpoints(maxAgeDays: number, maxCount: number) cleaning old refs. [File: packages/engine/src/gitea/GitCheckpointManager.ts] [Method: pruneOldCheckpoints] [Test: npm test -- packages/engine/src/tests/git_checkpoints.test.ts]
  - [x] T54.6.2: Add automated checkpoint garbage collection task to daily maintenance schedule in CacophonyDaemon. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Method: runDailyMaintenance] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [x] T54.6.3: Expose manual checkpoint pruning endpoint POST /api/checkpoints/prune. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/checkpoints/prune] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T54.6.4: Write unit tests verifying that pruning deletes refs older than retention window while preserving recent checkpoints. [File: packages/engine/src/tests/checkpoint_pruning.test.ts] [Test: npm test -- packages/engine/src/tests/checkpoint_pruning.test.ts]

---

---

## Archived Phase 58: Dynamic Multi-Model Rotation, Failure Fallback Cascade & Adaptive Context Window Reduction (8k -> 4k)
*Completed & Verified in Commit: `460780d`*

*RDF Category: orchestration*

### T58.1: Heterogeneous Model Task Distributor & Anti-Starvation Scheduler
  - [x] T58.1.1: Refactor TaskScheduler.selectModelForTask to distribute task assignments across all healthy models in ModelRegistry instead of locking to a single model. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: selectModelForTask] [Test: npm test -- packages/engine/src/tests/scheduler_model_rotation.test.ts]
  - [x] T58.1.2: Implement model usage balancing: track run counts per model in memory and prioritize idle registered models (e.g. qwen2.5-coder:7b, deepseek-r1:8b, gemma3:4b). [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: getLeastRecentlyUsedModel] [Test: npm test -- packages/engine/src/tests/scheduler_model_rotation.test.ts]
  - [x] T58.1.3: Remove hardcoded modelName in TaskcadePlanningService.replenishQueueIfLow, allowing dynamic model assignment from registered model pool. [File: packages/engine/src/inference/TaskcadePlanningService.ts] [Method: replenishQueueIfLow] [Test: npm test -- packages/engine/src/tests/taskcade_planning.test.ts]
  - [x] T58.1.4: Write unit tests verifying that 20 consecutive queued tasks receive balanced allocations across 3 distinct registered model IDs. [File: packages/engine/src/tests/model_distribution.test.ts] [Test: npm test -- packages/engine/src/tests/model_distribution.test.ts]

### T58.2: Role-to-Model Specialization Router (Architect, Implementer, Reviewer, DocWriter)
  - [x] T58.2.1: Implement RoleModelAffinityMatrix mapping task roles to preferred model capabilities: architect -> reasoning models (8b), implementer -> code generation (3b/7b), reviewer -> verification (8b), doc_writer -> language models (4b/7b). [File: packages/engine/src/inference/RoleModelRouter.ts] [Class: RoleModelRouter] [Test: npm test -- packages/engine/src/tests/role_model_router.test.ts]
  - [x] T58.2.2: Evaluate model availability: fallback to next best qualified model in the affinity tier if preferred model is unavailable or in cooldown. [File: packages/engine/src/inference/RoleModelRouter.ts] [Method: resolveModelForRole] [Test: npm test -- packages/engine/src/tests/role_model_router.test.ts]
  - [x] T58.2.3: Support runtime override of role affinity configuration via GET/PUT /api/config/role-models REST endpoints. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: /api/config/role-models] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T58.2.4: Write unit tests verifying that tasks with role 'architect' receive deepseek-r1:8b while role 'implementer' receives qwen2.5-coder models. [File: packages/engine/src/tests/role_model_router.test.ts] [Test: npm test -- packages/engine/src/tests/role_model_router.test.ts]

### T58.3: Dynamic Failure Fallback Cascade (Sequential Alternative Model Selection)
  - [x] T58.3.1: Implement FailureFallbackCascade in TaskScheduler: when a task fails execution, identify the next alternative model in the role cascade. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: getFallbackModelForTask] [Test: npm test -- packages/engine/src/tests/failure_fallback_cascade.test.ts]
  - [x] T58.3.2: Requeue failed task with incremented failureCount, updated modelAssigned to fallback model, and status PENDING. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: handleTaskFailure] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T58.3.3: Cap retries at maxTaskRetries (default 3); mark task permanently FAILED only after exhausting all available alternative models in cascade. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Method: handleFailedTaskRetries] [Test: npm test -- packages/engine/src/tests/failure_fallback_cascade.test.ts]
  - [x] T58.3.4: Write unit tests verifying task failing under model A automatically retries under model B and records fallback lineage. [File: packages/engine/src/tests/failure_fallback_cascade.test.ts] [Test: npm test -- packages/engine/src/tests/failure_fallback_cascade.test.ts]

### T58.4: Adaptive Context Window Reduction (Automatic Fallback from 8192 to 4096 Tokens)
  - [x] T58.4.1: Add contextWindowSize option (default 8192) to OllamaInferenceOptions and InferenceJob payload. [File: packages/shared-types/src/inference.ts] [Type: OllamaInferenceOptions] [Test: npm test]
  - [x] T58.4.2: Implement AdaptiveContextManager detecting task failures caused by context overflow, repetitive loops, or VRAM pressure. [File: packages/engine/src/inference/AdaptiveContextManager.ts] [Class: AdaptiveContextManager] [Test: npm test -- packages/engine/src/tests/adaptive_context.test.ts]
  - [x] T58.4.3: On retry of a failed task, reduce context window parameter num_ctx from 8192 to 4096 tokens to force concise generation and reduce VRAM allocation. [File: packages/engine/src/inference/AdaptiveContextManager.ts] [Method: calculateRetryContextOptions] [Test: npm test -- packages/engine/src/tests/adaptive_context.test.ts]
  - [x] T58.4.4: Trigger aggressive AST import pruning and context minimization when context window drops to 4096 tokens. [File: packages/engine/src/inference/ContextMinimizer.ts] [Method: pruneForCompactWindow] [Test: npm test -- packages/engine/src/tests/context_minimizer.test.ts]
  - [x] T58.4.5: Write unit tests verifying num_ctx is set to 8192 on initial attempt and reduced to 4096 on first retry following failure. [File: packages/engine/src/tests/adaptive_context.test.ts] [Test: npm test -- packages/engine/src/tests/adaptive_context.test.ts]

### T58.5: Model Eviction Recovery & Consecutive Failure Cooldown Daemon
  - [x] T58.5.1: Enhance ModelEvictionManager with cooldown timer: models with 3 consecutive failures enter COOLDOWN state for 5 minutes instead of permanent ejection. [File: packages/engine/src/scheduler/ModelEvictionManager.ts] [Method: handleModelFailure] [Test: npm test -- packages/engine/src/tests/model_eviction.test.ts]
  - [x] T58.5.2: Implement probe task execution: after cooldown expires, dispatch a low-complexity P2 test task to evaluate whether model has recovered. [File: packages/engine/src/scheduler/ModelEvictionManager.ts] [Method: scheduleProbeTask] [Test: npm test -- packages/engine/src/tests/model_eviction.test.ts]
  - [x] T58.5.3: Restore model status to ACTIVE on probe success; escalate to EJECTED only if probe task fails. [File: packages/engine/src/scheduler/ModelEvictionManager.ts] [Method: handleProbeResult] [Test: npm test -- packages/engine/src/tests/model_eviction.test.ts]
  - [x] T58.5.4: Write unit tests verifying model enters COOLDOWN after 3 consecutive failures and recovers cleanly upon passing probe task. [File: packages/engine/src/tests/model_eviction_cooldown.test.ts] [Test: npm test -- packages/engine/src/tests/model_eviction_cooldown.test.ts]

### T58.6: Failure Classifier Feedback Propagation for Adaptive Retries
  - [x] T58.6.1: Classify task failure error type (SYNTAX_ERROR, TYPE_MISMATCH, ASSERTION_FAILURE, TIMEOUT, MEMORY_OOM) in FailureClassifier. [File: packages/engine/src/analytics/FailureClassifier.ts] [Method: classify] [Test: npm test -- packages/engine/src/tests/failure_classifier.test.ts]
  - [x] T58.6.2: Format targeted retry prompt directive: append categorized error explanation and exact failing assertion to retry prompt. [File: packages/engine/src/inference/AdaptiveContextManager.ts] [Method: formatRetryPromptWithDiagnostics] [Test: npm test -- packages/engine/src/tests/adaptive_context.test.ts]
  - [x] T58.6.3: Record failure category in stageRepo records for longitudinal failure mode correlation analytics. [File: packages/db/src/repositories/StageRepository.ts] [Method: recordStageCompletion] [Test: npm test -- packages/db/src/tests/StageRepository.test.ts]
  - [x] T58.6.4: Write unit tests verifying retry prompt includes exact compiler error diagnostic and tailored instruction to fix failing test. [File: packages/engine/src/tests/retry_prompt_diagnostics.test.ts] [Test: npm test -- packages/engine/src/tests/retry_prompt_diagnostics.test.ts]

---

---

## Archived Phase 61: Test Execution Subprocess Isolation, Guardrails & Memory Limits
*Completed & Verified in Commit: `460780d`*

*RDF Category: testing*

### T61.1: Sandboxed Subprocess Test Execution Runner with Structured Execution Options
  - [x] T61.1.1: Create SandboxedSubprocessRunner in packages/engine/src/testing/SandboxedSubprocessRunner.ts executing task test commands using node:child_process spawn. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Class: SandboxedSubprocessRunner] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [x] T61.1.2: Sanitize execution environment: whitelist safe environment variables (PATH, NODE_ENV, HOME) and scrub all API keys and vault secrets from child process env. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: sanitizeEnvironment] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [x] T61.1.3: Set process execution current working directory strictly to target workspace or isolated task worktree folder. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: executeTest] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [x] T61.1.4: Write unit tests verifying that subprocess runner executes test commands and captures standard output and exit codes cleanly. [File: packages/engine/src/tests/subprocess_runner.test.ts] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]

### T61.2: Subprocess Memory Limit Guardrails via Cgroups and Node Memory Caps
  - [x] T61.2.1: Implement memory guardrail injecting --max-old-space-size=2048 into NODE_OPTIONS for Node.js test executions. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: applyMemoryLimits] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [x] T61.2.2: Poll child process memory usage via /proc/<pid>/statm or pidusage every 500ms; terminate process if RSS exceeds 2500 MB. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: monitorMemory] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [x] T61.2.3: Record MEMORY_EXCEEDED failure diagnostic when test execution is killed due to memory limit breach. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Type: TestExecutionResult] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [x] T61.2.4: Write unit tests verifying memory monitoring aborts high-memory allocating processes and flags memory limit breach. [File: packages/engine/src/tests/subprocess_memory_limits.test.ts] [Test: npm test -- packages/engine/src/tests/subprocess_memory_limits.test.ts]

### T61.3: Execution Timeout Watchdog with Graceful SIGTERM/SIGKILL Cascade
  - [x] T61.3.1: Implement timeout watchdog timer (configurable per task, default 60 seconds) aborting hanging or deadlocked test processes. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: startWatchdog] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [x] T61.3.2: Implement two-stage termination: send SIGTERM, wait 3 seconds for graceful process cleanup, then escalate to SIGKILL if process remains alive. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: terminateChildProcess] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [x] T61.3.3: Record TIMEOUT error classification and preserve any stdout/stderr captured prior to process termination. [File: packages/engine/src/testing/SandboxedSubprocessRunner.ts] [Method: handleTimeout] [Test: npm test -- packages/engine/src/tests/subprocess_runner.test.ts]
  - [x] T61.3.4: Write unit tests verifying that a hanging child process (e.g. infinite loop) is terminated within timeout threshold and marked TIMEOUT. [File: packages/engine/src/tests/subprocess_timeout.test.ts] [Test: npm test -- packages/engine/src/tests/subprocess_timeout.test.ts]

### T61.4: Structured Test Output Parser for Vitest, Node Test Runner, and Jest
  - [x] T61.4.1: Create StructuredTestOutputParser in packages/engine/src/testing/StructuredTestOutputParser.ts parsing raw terminal text into structured test results. [File: packages/engine/src/testing/StructuredTestOutputParser.ts] [Class: StructuredTestOutputParser] [Test: npm test -- packages/engine/src/tests/test_output_parser.test.ts]
  - [x] T61.4.2: Parse total tests, passed count, failed count, skipped count, and duration from Vitest and Node.js native test runner summaries. [File: packages/engine/src/testing/StructuredTestOutputParser.ts] [Method: parseSummary] [Test: npm test -- packages/engine/src/tests/test_output_parser.test.ts]
  - [x] T61.4.3: Extract failing test file paths, failing assertion descriptions, and line numbers from stderr stack traces. [File: packages/engine/src/testing/StructuredTestOutputParser.ts] [Method: extractFailures] [Test: npm test -- packages/engine/src/tests/test_output_parser.test.ts]
  - [x] T61.4.4: Write unit tests verifying parser extracts accurate pass/fail counts and failure locations from sample Vitest, Node test, and Jest outputs. [File: packages/engine/src/tests/test_output_parser.test.ts] [Test: npm test -- packages/engine/src/tests/test_output_parser.test.ts]

### T61.5: Test Run Record Persistence in test_execution_runs Database Table
  - [x] T61.5.1: Create TestExecutionRepository in packages/db/src/repositories/TestExecutionRepository.ts managing test_execution_runs table records. [File: packages/db/src/repositories/TestExecutionRepository.ts] [Class: TestExecutionRepository] [Test: npm test -- packages/db/src/tests/TestExecutionRepository.test.ts]
  - [x] T61.5.2: Persist complete test execution record: taskId, command, exitCode, durationMs, passedCount, failedCount, stdoutSnippet, stderrSnippet, status. [File: packages/db/src/repositories/TestExecutionRepository.ts] [Method: recordRun] [Test: npm test -- packages/db/src/tests/TestExecutionRepository.test.ts]
  - [x] T61.5.3: Add method listRecentRuns(limit: number, filter?: { status?: string }) returning historical test runs ordered by created_at DESC. [File: packages/db/src/repositories/TestExecutionRepository.ts] [Method: listRecentRuns] [Test: npm test -- packages/db/src/tests/TestExecutionRepository.test.ts]
  - [x] T61.5.4: Write unit tests verifying test run records are inserted and queried correctly with full payload fidelity. [File: packages/db/src/tests/test_execution_runs.test.ts] [Test: npm test -- packages/db/src/tests/test_execution_runs.test.ts]

### T61.6: Test Failure Triage Engine Extracting Exact Failing Assertion and Line
  - [x] T61.6.1: Implement TestFailureTriager in packages/engine/src/testing/TestFailureTriager.ts analyzing test stderr to determine root cause category. [File: packages/engine/src/testing/TestFailureTriager.ts] [Class: TestFailureTriager] [Test: npm test -- packages/engine/src/tests/failure_triager.test.ts]
  - [x] T61.6.2: Classify failures: AssertionFailure (expected vs actual), CompilationError (TS syntax/type), RuntimeCrash (uncaught exception), Timeout. [File: packages/engine/src/testing/TestFailureTriager.ts] [Type: FailureClassification] [Test: npm test -- packages/engine/src/tests/failure_triager.test.ts]
  - [x] T61.6.3: Extract minimal failing code snippet and expected value to inject directly into next remediation prompt. [File: packages/engine/src/testing/TestFailureTriager.ts] [Method: buildRemediationContext] [Test: npm test -- packages/engine/src/tests/failure_triager.test.ts]
  - [x] T61.6.4: Write unit tests verifying triager correctly isolates assertion mismatches and formats clean remediation context. [File: packages/engine/src/tests/failure_triager.test.ts] [Test: npm test -- packages/engine/src/tests/failure_triager.test.ts]

---

---

## Archived Phase 73: Task Runtime Metrics, Model Velocity Tracking & History Efficiency View
*Completed & Verified in Commit: `460780d`*

*RDF Category: telemetry*
*Note: Preserves MockInferenceStreamProvider and FallbackTelemetryProvider for demo/showcase mode. Model-calibrated pacing rates (3B=54, 4B=38, 7B=28, 8B=16 tok/s) ensure meaningful leaderboard differentiation without hardware.*

### T73.1: Database Schema & Repository: duration_ms and tokens_per_sec Columns
  - [x] T73.1.1: Author migration 012_task_runtime_metrics.ts adding duration_ms INTEGER DEFAULT 0 and tokens_per_sec REAL DEFAULT 0.0 columns to tasks table via IF NOT EXISTS guards. [File: packages/db/src/migrations/012_task_runtime_metrics.ts] [Test: npm test -- packages/db]
  - [x] T73.1.2: Register migration012 in MigrationRegistry in correct chronological slot after migration011. [File: packages/db/src/migrations/MigrationRegistry.ts] [Test: npm test -- packages/db]
  - [x] T73.1.3: Extend TaskRecord in @cacophony/shared-types with optional readonly durationMs and tokensPerSec fields with full JSDoc documentation. [File: packages/shared-types/src/task.ts] [Test: npm test -- packages/shared-types]
  - [x] T73.1.4: Update TaskRepository.updateStatus to accept durationMs and tokensPerSec optional parameters and persist them in a single conditional UPDATE; update mapRow to read both columns with exactOptionalPropertyTypes-safe spread pattern. [File: packages/db/src/repositories/TaskRepository.ts] [Test: npm test -- packages/db]

### T73.2: Engine Execution: Real Token Velocity Measurement & Propagation
  - [x] T73.2.1: Update MockInferenceStreamProvider to implement getTokensPerSecondForModel() deriving per-model-family realistic velocities (3B: 54, 4B: 38, 7B: 28, 8B: 16 tok/s) keyed from model name substring. [File: packages/engine/src/inference/MockInferenceStreamProvider.ts] [Test: npm test -- packages/engine]
  - [x] T73.2.2: Update AutonomousWorkerPipeline.executeTask return type from Promise<boolean> to Promise<{ success: boolean; tokensPerSec: number }> and capture parseResult.tokensPerSec into measuredTps after generation stage. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T73.2.3: Update TaskExecutionHandler type in TaskScheduler to Promise<TaskExecutionResult> and thread actualTps into taskRepo.updateStatus and evictionManager.recordRunOutcome; remove hardcoded 30.0 tok/s. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Test: npm test -- packages/engine]
  - [x] T73.2.4: Remove hardcoded 35.0 tok/s fallback from CacophonyHttpServer /api/models/leaderboard endpoint; pass p.avgTokensPerSec || 0.0 for honest zero-value display. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Test: curl http://localhost:24072/api/models/leaderboard]

### T73.3: Frontend History View: Runtime & Velocity Columns
  - [x] T73.3.1: Add tokensPerSec to HistoryItem interface and update HistoryMetricsService API payload type to include createdAt, durationMs, tokensPerSec; replace durationMs:3500 dummy with real stored value plus timestamp-delta fallback for pre-migration records. [File: packages/frontend/src/app/services/history-metrics.service.ts] [Test: npm test]
  - [x] T73.3.2: Add Runtime and Velocity table columns to task-history.component with formatDuration helper (ms/s/m+s display), and conditional tok/s cell showing '--' when no data is present. [File: packages/frontend/src/app/components/task-history/task-history.component.ts] [Test: npm test]
  - [x] T73.3.3: Add formatDuration method to models-view.component replacing raw {{ task.durationMs }}ms display with clean time strings; remove 35.0 fallback from selectedModelHwm computed. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Test: npm test]
  - [x] T73.3.4: Fix test assertions in autonomous_continuous_arena.test.ts and stage_telemetry.test.ts to check result.success instead of direct boolean equality after executeTask return type change. [File: packages/engine/src/tests/autonomous_continuous_arena.test.ts, packages/engine/src/tests/stage_telemetry.test.ts] [Test: npm test -- packages/engine]


---

---

## Archived Phase 75: Dynamic Ollama Model Lifecycle Management & Multi-Tenant Hardware Adaptation
*Completed & Verified in Commit: `460780d`*

*RDF Category: hardware*
*Priority: SPRINT PRIORITY 1*

### T75.1: Ollama Model Client & Lifecycle Controller
  - [x] T75.1.1: Create OllamaModelManager in packages/engine/src/inference/OllamaModelManager.ts implementing listInstalledModels() querying Ollama GET /api/tags and mapping sizes, digests, and modified timestamps. [File: packages/engine/src/inference/OllamaModelManager.ts] [Class: OllamaModelManager] [Test: npm test -- packages/engine/src/tests/ollama_model_manager.test.ts]
  - [x] T75.1.2: Implement pullModel(modelName: string, onProgress: (event: OllamaPullProgressEvent) => void) in OllamaModelManager parsing ndjson streaming chunks from Ollama POST /api/pull. [File: packages/engine/src/inference/OllamaModelManager.ts] [Method: pullModel] [Test: npm test -- packages/engine/src/tests/ollama_model_manager.test.ts]
  - [x] T75.1.3: Implement deleteModel(modelName: string) in OllamaModelManager issuing DELETE /api/delete with JSON body { model: modelName } and verifying eviction. [File: packages/engine/src/inference/OllamaModelManager.ts] [Method: deleteModel] [Test: npm test -- packages/engine/src/tests/ollama_model_manager.test.ts]
  - [x] T75.1.4: Implement showModelInfo(modelName: string) in OllamaModelManager querying POST /api/show to extract parameter_size, quantization_level, and architecture family. [File: packages/engine/src/inference/OllamaModelManager.ts] [Method: showModelInfo] [Test: npm test -- packages/engine/src/tests/ollama_model_manager.test.ts]
  - [x] T75.1.5: Write unit tests with mocked fetch verifying listInstalledModels, pullModel progress demuxing, deleteModel, and showModelInfo. [File: packages/engine/src/tests/ollama_model_manager.test.ts] [Test: npm test -- packages/engine/src/tests/ollama_model_manager.test.ts]

### T75.2: Multi-Tenant Model Protection & Tenancy Guardrail Engine
  - [x] T75.2.1: Define ModelManagementConfig in packages/shared-types/src/config.ts with managedModelsEnabled, protectedModels whitelist, maxDiskStorageGb, autoEvictionEnabled, minimumSuccessRateThreshold, and maxConsecutiveFailuresBeforeEviction. [File: packages/shared-types/src/config.ts] [Interface: ModelManagementConfig] [Test: npm test -- packages/shared-types]
  - [x] T75.2.2: Implement ModelTenancyGuard in packages/engine/src/scheduler/ModelTenancyGuard.ts verifying whether a model tag matches protectedModels wildcard patterns before any deletion is permitted. [File: packages/engine/src/scheduler/ModelTenancyGuard.ts] [Class: ModelTenancyGuard] [Test: npm test -- packages/engine/src/tests/model_tenancy_guard.test.ts]
  - [x] T75.2.3: Add disk capacity evaluation in ModelTenancyGuard checking available host disk space via statfs before initiating model download to prevent disk exhaustion. [File: packages/engine/src/scheduler/ModelTenancyGuard.ts] [Method: checkDiskHeadroom] [Test: npm test -- packages/engine/src/tests/model_tenancy_guard.test.ts]
  - [x] T75.2.4: Write unit tests verifying that protected models are strictly rejected from eviction calls and that disk quota limits reject excessive downloads. [File: packages/engine/src/tests/model_tenancy_guard.test.ts] [Test: npm test -- packages/engine/src/tests/model_tenancy_guard.test.ts]

### T75.3: Automated Hardware-Model Benchmark & Eviction Governor
  - [x] T75.3.1: Implement ModelBenchmarkRunner in packages/engine/src/scheduler/ModelBenchmarkRunner.ts executing a fixed synthetic prompt and evaluating syntax correctness, tokens/sec, and latency. [File: packages/engine/src/scheduler/ModelBenchmarkRunner.ts] [Class: ModelBenchmarkRunner] [Test: npm test -- packages/engine/src/tests/model_benchmark_runner.test.ts]
  - [x] T75.3.2: Connect ModelBenchmarkRunner results to ModelHealthRepository to seed initial success rates and velocity metrics for newly downloaded models. [File: packages/engine/src/scheduler/ModelBenchmarkRunner.ts] [Method: recordBenchmark] [Test: npm test -- packages/engine/src/tests/model_benchmark_runner.test.ts]
  - [x] T75.3.3: Update ModelEvictionManager in packages/engine/src/scheduler/ModelEvictionManager.ts to check ModelTenancyGuard and invoke OllamaModelManager.deleteModel when autoEvictionEnabled is true and consecutive failures reach threshold. [File: packages/engine/src/scheduler/ModelEvictionManager.ts] [Method: evaluateModelEviction] [Test: npm test -- packages/engine/src/tests/model_eviction_manager.test.ts]
  - [x] T75.3.4: Write unit tests validating that degraded non-protected models are automatically deleted while protected models remain intact and marked degraded. [File: packages/engine/src/tests/model_eviction_manager.test.ts] [Test: npm test -- packages/engine/src/tests/model_eviction_manager.test.ts]

### T75.4: Model Management HTTP REST Endpoints & SSE Streaming
  - [x] T75.4.1: Add GET /api/models/installed route in CacophonyHttpServer returning installed models annotated with protected tenancy status and VRAM residency. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/models/installed] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]
  - [x] T75.4.2: Add POST /api/models/pull route streaming Ollama pull progress events over SSE event channel 'model_pull_progress'. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/models/pull] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]
  - [x] T75.4.3: Add DELETE /api/models/:modelId route validating tenancy rules through ModelTenancyGuard and deleting model via OllamaModelManager. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: DELETE /api/models/:modelId] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]
  - [x] T75.4.4: Add GET and PUT /api/models/config routes reading and updating runtime ModelManagementConfig in memory and persisting to conf/cacophony.json. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: /api/models/config] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]
  - [x] T75.4.5: Add POST /api/models/benchmark route triggering ModelBenchmarkRunner on specified model tag and returning empirical metrics. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/models/benchmark] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]
  - [x] T75.4.6: Write unit tests covering all model management REST endpoints, verifying permission guards and error handling for invalid models. [File: packages/engine/src/tests/models_http_api.test.ts] [Test: npm test -- packages/engine/src/tests/models_http_api.test.ts]

---

---

## Archived Phase 77: Reasoning Model `<think>` Stream Separation, Distillation & Opinion Synthesis
*Completed & Verified in Commit: `460780d`*

*RDF Category: inference*
*Priority: SPRINT PRIORITY 3*

### T77.1: Real-Time Cognitive Stream Token Demuxer
  - [x] T77.1.1: Create ReasoningStreamDemuxer in packages/engine/src/inference/ReasoningStreamDemuxer.ts statefully scanning streaming token deltas for <think> and </think> boundaries. [File: packages/engine/src/inference/ReasoningStreamDemuxer.ts] [Class: ReasoningStreamDemuxer] [Test: npm test -- packages/engine/src/tests/reasoning_stream_demuxer.test.ts]
  - [x] T77.1.2: Wire ReasoningStreamDemuxer into StreamTapManager emitting dual SSE events: 'reasoning_chunk' for cognitive trace and 'code_chunk' for generated artifacts. [File: packages/engine/src/telemetry/StreamTapManager.ts] [Method: handleTokenStream] [Test: npm test -- packages/engine/src/tests/stream_tap_manager.test.ts]
  - [x] T77.1.3: Measure intra-reasoning token velocity and duration separately from code generation velocity in AutonomousWorkerPipeline. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeGenerationStage] [Test: npm test -- packages/engine/src/tests/stage_telemetry.test.ts]
  - [x] T77.1.4: Write unit tests verifying that code fences inside thinking tags are not prematurely parsed as executable code and that the demuxer handles split tag boundaries across chunks. [File: packages/engine/src/tests/reasoning_stream_demuxer.test.ts] [Test: npm test -- packages/engine/src/tests/reasoning_stream_demuxer.test.ts]
  - [x] T77.1.5: Guard against orphan </think> tags in ReasoningStreamDemuxer, AdaptiveOutputFormatter, and SelfHealingParser, and ensure prompt directives in AdaptiveOutputFormatter only instruct reasoning models on </think> blocks. [File: packages/engine/src/inference/AdaptiveOutputFormatter.ts] [Class: AdaptiveOutputFormatter] [Test: npm test -- packages/engine/src/tests/reasoning_stream_demuxer.test.ts]

### T77.2: Reasoning Trace Persistence & Stage Schema Migration
  - [x] T77.2.1: Author database migration 013_reasoning_transcripts.ts adding reasoning_transcript TEXT and distilled_opinion TEXT columns to task_stages table with SQLite and Postgres cross-dialect compatibility. [File: packages/db/src/migrations/013_reasoning_transcripts.ts] [Test: npm test -- packages/db]
  - [x] T77.2.2: Update StageRecord in packages/shared-types/src/stage.ts to include optional reasoningTranscript, distilledOpinion, and thinkingDurationMs fields. [File: packages/shared-types/src/stage.ts] [Interface: StageRecord] [Test: npm test -- packages/shared-types]
  - [x] T77.2.3: Update StageRepository in packages/db/src/repositories/StageRepository.ts to persist reasoning transcripts and distilled opinions in recordStageCompletion. [File: packages/db/src/repositories/StageRepository.ts] [Method: recordStageCompletion] [Test: npm test -- packages/db]
  - [x] T77.2.4: Write integration tests verifying database migration executes cleanly on both SQLite and PGlite drivers and stores full reasoning strings. [File: packages/db/src/tests/reasoning_persistence.test.ts] [Test: npm test -- packages/db/src/tests/reasoning_persistence.test.ts]

### T77.3: Reasoning Distillation & Consensus Opinion Extractor
  - [x] T77.3.1: Create ReasoningDistillationService in packages/engine/src/inference/ReasoningDistillationService.ts taking raw <think> traces and passing them through a lightweight summarizer prompt. [File: packages/engine/src/inference/ReasoningDistillationService.ts] [Class: ReasoningDistillationService] [Test: npm test -- packages/engine/src/tests/reasoning_distillation.test.ts]
  - [x] T77.3.2: Format distilled output into typed ModelOpinionRecord containing summary, keyDecisions, identifiedRisks, and confidenceScore. [File: packages/engine/src/inference/ReasoningDistillationService.ts] [Interface: ModelOpinionRecord] [Test: npm test -- packages/engine/src/tests/reasoning_distillation.test.ts]
  - [x] T77.3.3: Expose GET /api/tasks/:id/opinion endpoint returning distilled architectural opinion and reasoning metrics for the specified task. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/tasks/:id/opinion] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T77.3.4: Write unit tests verifying that ReasoningDistillationService extracts structured decisions from messy reasoning traces and handles empty traces gracefully. [File: packages/engine/src/tests/reasoning_distillation.test.ts] [Test: npm test -- packages/engine/src/tests/reasoning_distillation.test.ts]

### T77.4: Differentiated Frontend Model Views & Archetype-Specific UI
  - [x] T77.4.1: Update TaskDetailModalComponent in packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts adding a dedicated 'Cognitive Trace' tab for reasoning models (DeepSeek R1, Qwen Thinking). [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: cognitive-trace-tab] [Test: npm test]
  - [x] T77.4.2: Render collapsible thoughts panel with live thinking velocity gauge and formatted markdown distilled opinion card. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: thoughts-panel] [Test: npm test]
  - [x] T77.4.3: Provide dense syntax diff view for direct coder models (Qwen 2.5 Coder, Gemma 3) omitting empty reasoning sections and focusing on file tree and AST mutations. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: code-diff-view] [Test: npm test]
  - [x] T77.4.4: Inject archetype-specific prompt directives in QueueGroomer instructing reasoning models to enclose analysis in <think> tags and direct coder models to output code fences immediately. [File: packages/engine/src/scheduler/QueueGroomer.ts] [Method: formatPromptForModelArchetype] [Test: npm test -- packages/engine/src/tests/queue_groomer.test.ts]

---

---

## Archived Phase 78: End-to-End In-House Pull Request Lifecycle & Review Pipeline (Gitea + GitHub Compatibility)
*Completed & Verified in Commit: `460780d`*

*RDF Category: orchestration*
*Priority: SPRINT PRIORITY 4*

### T78.1: Unified Git Platform Provider Abstraction (Gitea & GitHub)
  - [x] T78.1.1: Create IGitPlatformProvider interface in packages/engine/src/gitea/IGitPlatformProvider.ts declaring createBranch, openPullRequest, submitReview, and mergePullRequest. [File: packages/engine/src/gitea/IGitPlatformProvider.ts] [Interface: IGitPlatformProvider] [Test: npm test -- packages/engine/src/tests/git_platform_provider.test.ts]
  - [x] T78.1.2: Implement GiteaPlatformProvider in packages/engine/src/gitea/GiteaPlatformProvider.ts communicating with local Gitea instance via Swagger REST API. [File: packages/engine/src/gitea/GiteaPlatformProvider.ts] [Class: GiteaPlatformProvider] [Test: npm test -- packages/engine/src/tests/git_platform_provider.test.ts]
  - [x] T78.1.3: Implement GitHubPlatformProvider in packages/engine/src/gitea/GitHubPlatformProvider.ts communicating with GitHub REST API using configured GITHUB_TOKEN. [File: packages/engine/src/gitea/GitHubPlatformProvider.ts] [Class: GitHubPlatformProvider] [Test: npm test -- packages/engine/src/tests/git_platform_provider.test.ts]
  - [x] T78.1.4: Create GitPlatformProviderFactory in packages/engine/src/gitea/GitPlatformProviderFactory.ts instantiating provider based on GIT_PLATFORM_PROVIDER environment setting (defaulting to gitea). [File: packages/engine/src/gitea/GitPlatformProviderFactory.ts] [Class: GitPlatformProviderFactory] [Test: npm test -- packages/engine/src/tests/git_platform_provider.test.ts]
  - [x] T78.1.5: Write unit tests verifying that both providers correctly format pull request payloads and handle API error responses. [File: packages/engine/src/tests/git_platform_provider.test.ts] [Test: npm test -- packages/engine/src/tests/git_platform_provider.test.ts]

### T78.2: Ephemeral Git Worktree Isolation per Task Execution
  - [x] T78.2.1: Enhance GitWorktreeManager in packages/engine/src/gitea/GitWorktreeManager.ts to create isolated worktrees at workspaces/worktree-<taskId> on ephemeral branch task/<priority>-<taskId>. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: createWorktree] [Test: npm test -- packages/engine/src/tests/git_worktree_isolation.test.ts]
  - [x] T78.2.2: Ensure AutonomousWorkerPipeline executes file modifications, scrubbing, and test commands strictly inside the isolated worktree directory without modifying the main repository checkout. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeTask] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T78.2.3: Implement cleanWorktree(taskId: string) in GitWorktreeManager safely removing the ephemeral directory and pruning the git worktree entry upon task completion or rollback. [File: packages/engine/src/gitea/GitWorktreeManager.ts] [Method: cleanWorktree] [Test: npm test -- packages/engine/src/tests/git_worktree_isolation.test.ts]
  - [x] T78.2.4: Write integration tests verifying that concurrent tasks modify separate worktrees without file conflicts and that cleanup leaves the git status clean. [File: packages/engine/src/tests/git_worktree_isolation.test.ts] [Test: npm test -- packages/engine/src/tests/git_worktree_isolation.test.ts]

### T78.3: Automated Multi-Stage Review & Merge Gate
  - [x] T78.3.1: Wire Stage 5 (Review) in AutonomousWorkerPipeline to generate a structured review checklist evaluating SOLID principles, test coverage, and security boundaries. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeReviewStage] [Test: npm test -- packages/engine/src/tests/stage_telemetry.test.ts]
  - [x] T78.3.2: Add optional Frontier Model Reviewer integration: when FRONTIER_REVIEW_API_KEY is configured, dispatch the patch diff and review prompt to the frontier model for high-rigor evaluation. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: evaluateReview] [Test: npm test -- packages/engine/src/tests/frontier_reviewer.test.ts]
  - [x] T78.3.3: Automatically open pull request via IGitPlatformProvider.openPullRequest upon passing review and submit review verdict. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: publishPullRequest] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
  - [x] T78.3.4: Wire Stage 6 (Merge) to merge pull request into target branch when auto-merge is configured and all verification stages pass. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeMergeStage] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]

### T78.4: Frontend PR Inspector & Review Timeline Badge
  - [x] T78.4.1: Update TaskDetailModalComponent to display Pull Request banner with clickable link (prUrl), branch name, and review status badge (APPROVED, CHANGES_REQUESTED). [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: pr-banner] [Test: npm test]
  - [x] T78.4.2: Add PR reviews tab in TaskDetailModalComponent displaying reviewer verdict, line-level comments, and SOLID compliance score. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.ts] [Template: pr-reviews-tab] [Test: npm test]
  - [x] T78.4.3: Add PR indicator icon and branch pill to TaskInspectorComponent stage progression bar during Stage 5 and Stage 6. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Template: stage-pr-indicator] [Test: npm test]
  - [x] T78.4.4: Write frontend unit tests verifying PR badge rendering and link target formatting for both Gitea and GitHub URL patterns. [File: packages/frontend/src/app/components/task-detail-modal/task-detail-modal.component.spec.ts] [Test: npm test]

---

---

## Archived Phase 79: Dynamic Model Profile Tuning, Multi-Model Cognitive Handoff & Prompt Compression
*Completed & Verified in Commit: `460780d`*

*RDF Category: optimization*
*Priority: SPRINT PRIORITY 5*

### T79.1: Whitebox Model Tuning Configuration & Profile Persistence
  - [x] T79.1.1: Author database migration `014_model_profiles.ts` creating `model_tuning_profiles` table with columns: `id`, `model_name`, `role`, `num_predict`, `num_ctx`, `temperature`, `top_k`, `top_p`, `repeat_penalty`, `auto_tuned`, `is_active`, `created_at`, `updated_at`. [File: packages/db/src/migrations/014_model_profiles.ts] [Test: npm test -- packages/db]
  - [x] T79.1.2: Implement `ModelProfileRepository` in `packages/db/src/repositories/ModelProfileRepository.ts` with methods to fetch active profile by model/role, upsert custom profiles, and query auto-tuning metrics. [File: packages/db/src/repositories/ModelProfileRepository.ts] [Class: ModelProfileRepository] [Test: npm test -- packages/db]
  - [x] T79.1.3: Expose REST API routes `GET /api/models/profiles`, `PUT /api/models/profiles/:id`, and `POST /api/models/profiles/auto-tune` in `CacophonyHttpServer.ts`. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T79.1.4: Update `OllamaProvider.ts` to dynamically resolve model options (`num_predict`, `num_ctx`, `temperature`) from the matched active tuning profile before falling back to environment defaults. [File: packages/engine/src/inference/OllamaProvider.ts] [Method: resolveModelOptions] [Test: npm test -- packages/engine/src/tests/model_tuning.test.ts]

### T79.2: Multi-Model Cognitive Handoff (Architect Reasoner to Implementer Coder)
  - [x] T79.2.1: Implement `CognitiveHandoffCoordinator` in `packages/engine/src/inference/CognitiveHandoffCoordinator.ts` extracting cognitive `<think>` trace from architect models and formatting as actionable implementation briefs. [File: packages/engine/src/inference/CognitiveHandoffCoordinator.ts] [Class: CognitiveHandoffCoordinator] [Test: npm test -- packages/engine/src/tests/cognitive_handoff.test.ts]
  - [x] T79.2.2: Wire `AutonomousWorkerPipeline` multi-model execution path: when architect model (DeepSeek R1) completes thinking without full code output, immediately hand off the distilled plan to the configured implementer model (Qwen 2.5 Coder) without failing the task. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Method: executeGenerationStage] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T79.2.3: Persist handoff chain telemetry in `task_stages` recording primary reasoner model, secondary coder model, and token transfer counts. [File: packages/db/src/repositories/StageRepository.ts] [Test: npm test -- packages/db]
  - [x] T79.2.4: Write unit tests verifying that truncated reasoning outputs trigger graceful handoff rather than burning retries. [File: packages/engine/src/tests/cognitive_handoff.test.ts] [Test: npm test -- packages/engine/src/tests/cognitive_handoff.test.ts]

### T79.3: Prompt Compression & Context Token Budget Maximizer
  - [x] T79.3.1: Create `PromptCompressor` in `packages/engine/src/inference/PromptCompressor.ts` stripping redundant comment blocks, collapsing whitespace, and omitting unreferenced interface declarations. [File: packages/engine/src/inference/PromptCompressor.ts] [Class: PromptCompressor] [Test: npm test -- packages/engine/src/tests/prompt_compression.test.ts]
  - [x] T79.3.2: Integrate `PromptCompressor` into `ContextMinimizer.ts` reporting measured compression ratio and token savings in `ContextBundle.tokenSavingsEstimate`. [File: packages/engine/src/inference/ContextMinimizer.ts] [Method: assembleContext] [Test: npm test -- packages/engine/src/tests/context_minimizer.test.ts]
  - [x] T79.3.3: Implement intelligent fallback compression triggers when prompt tokens exceed 75% of active `num_ctx`. [File: packages/engine/src/inference/ContextMinimizer.ts] [Test: npm test -- packages/engine/src/tests/context_minimizer.test.ts]
  - [x] T79.3.4: Write unit tests verifying AST-level semantic preservation during prompt compression. [File: packages/engine/src/tests/prompt_compression.test.ts] [Test: npm test -- packages/engine/src/tests/prompt_compression.test.ts]

### T79.4: Autonomous Engine Auto-Tuner & Best Profile Matcher
  - [x] T79.4.1: Build `EngineAutoTuner` in `packages/engine/src/scheduler/EngineAutoTuner.ts` analyzing historical token velocities (tok/s), stage pass rates, and truncation frequency across installed models. [File: packages/engine/src/scheduler/EngineAutoTuner.ts] [Class: EngineAutoTuner] [Test: npm test -- packages/engine/src/tests/engine_auto_tuner.test.ts]
  - [x] T79.4.2: Implement heuristic hardware profile matcher mapping available host VRAM (e.g. 16GB) to optimal `num_ctx` (16384) and `num_predict` (8192) limits per quantization level. [File: packages/engine/src/scheduler/EngineAutoTuner.ts] [Method: computeOptimalProfile] [Test: npm test -- packages/engine/src/tests/engine_auto_tuner.test.ts]
  - [x] T79.4.3: Add scheduled background job or manual button to trigger profile auto-optimization. [File: packages/engine/src/daemon/CacophonyDaemon.ts] [Test: npm test -- packages/engine/src/tests/daemon_lifecycle.test.ts]
  - [x] T79.4.4: Write unit tests verifying that `EngineAutoTuner` automatically raises completion limits for models experiencing truncation. [File: packages/engine/src/tests/engine_auto_tuner.test.ts] [Test: npm test -- packages/engine/src/tests/engine_auto_tuner.test.ts]

### T79.5: Frontend Model Tuning & Profile Configuration UI
  - [x] T79.5.1: Create `ModelTuningPanelComponent` in `packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.ts` allowing operators to configure `num_predict`, `num_ctx`, temperature, and active model roles. [File: packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.ts] [Class: ModelTuningPanelComponent] [Test: npm test]
  - [x] T79.5.2: Add 'Auto-Tune Profiles' action button triggering `POST /api/models/profiles/auto-tune` with toast feedback and visual diff of adjusted parameters. [File: packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.ts] [Test: npm test]
  - [x] T79.5.3: Integrate tuning controls into `/models` route alongside installed fleet and download terminal. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Test: npm test]
  - [x] T79.5.4: Write frontend unit tests validating form inputs, dirty state tracking, and profile update payload dispatch. [File: packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.spec.ts] [Test: npm test]

### T79.6: Host UMA VRAM Governor & Timeout Watchdog Mitigation
  - [x] T79.6.1: Enforce AbortController cancellation on FrontierReviewer evaluateReview and cap review prompt maxTokens to 1024. [File: packages/engine/src/inference/FrontierReviewer.ts] [Class: FrontierReviewer] [Test: npm --prefix packages/engine test]
  - [x] T79.6.2: Configure EngineAutoTuner hardwareSpec for 8GB UMA APU architecture, clamp context window to OLLAMA_NUM_CTX, and disallow non-truncation failure inflation. [File: packages/engine/src/scheduler/EngineAutoTuner.ts] [Class: EngineAutoTuner] [Test: npm --prefix packages/engine test]
  - [x] T79.6.3: Implement dynamic lightweight model fallback in TaskScheduler for previously failed tasks (qwen2.5-coder:3b, gemma3:4b-it-qat). [File: packages/engine/src/scheduler/TaskScheduler.ts] [Class: TaskScheduler] [Test: npm --prefix packages/engine test]
  - [x] T79.6.4: Increase GiteaApiClient mergePullRequest retry budget to 10 attempts with arithmetic backoff to eliminate 405 async race conditions. [File: packages/engine/src/gitea/GiteaApiClient.ts] [Class: GiteaApiClient] [Test: npm --prefix packages/engine test]

---

## Archived Phase 89: North-to-South Responsive Layout, Real-Time Processor MHz Tri-Metric Gauge & Historic Velocity Analytics
*Completed & Verified in Engineering Session*

*RDF Category: telemetry / frontend*

### T89.1: Desktop & Mobile North-to-South Unified Responsive Grid
  - [x] T89.1.1: Refactor packages/frontend/src/app/components/views/dashboard-view.component.ts layout grid so that app-hardware-monitor and app-task-inspector flow North-to-South vertically across all breakpoints, setting both grid-card-wrapper elements to span full width on desktop (min-width: 1024px) rather than sharing a 2-column split. [File: packages/frontend/src/app/components/views/dashboard-view.component.ts] [Test: npm test -- packages/frontend/src/app/components/views/dashboard-view.component.spec.ts]
  - [x] T89.1.2: Ensure all dashboard card wrappers adhere to mobile-first responsive constraints with touch-friendly scroll bounds, zero horizontal overflow, and consistent padding. [File: packages/frontend/src/app/components/views/dashboard-view.component.ts] [Test: npm test -- packages/frontend]

### T89.2: Tri-Metric Dynamic Rolling Window Gauge Component (Trough / Avg / Peak)
  - [x] T89.2.1: Implement TriMetricGaugeComponent in packages/frontend/src/app/components/tri-metric-gauge/tri-metric-gauge.component.ts with typed inputs for liveValue, unit, label, minRange, maxRange, and windowSize. [File: packages/frontend/src/app/components/tri-metric-gauge/tri-metric-gauge.component.ts] [Class: TriMetricGaugeComponent] [Test: npm test -- packages/frontend/src/app/components/tri-metric-gauge/tri-metric-gauge.component.spec.ts]
  - [x] T89.2.2: Implement the windowed calculation engine: dynamic peak (highest observed in window), running arithmetic average (midpoint in window), and baseline trough (average of lower dips past the initial zero-ramp). Color markers: red for peak/trough, emerald green for running average, with a real-time progress head indicator tracking live ticks. [File: packages/frontend/src/app/components/tri-metric-gauge/tri-metric-gauge.component.ts] [Method: calculateWindowMetrics] [Test: npm test -- packages/frontend/src/app/components/tri-metric-gauge/tri-metric-gauge.component.spec.ts]

### T89.3: GPU Core SCLK MHz Tri-Metric Progress Integration
  - [x] T89.3.1: Integrate TriMetricGaugeComponent into HardwareMonitorComponent under the GPU Load card, displaying a dedicated MHz progress track for AMD Core Clock (sclkMhz), visual peak, average, and trough indicators. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Test: npm test -- packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.spec.ts]
  - [x] T89.3.2: Expose rolling processor frequency metrics (sclkMinMhz, sclkAvgMhz, sclkPeakMhz) via HardwareTelemetryService and ArenaStateStore. [File: packages/frontend/src/app/services/arena-state.store.ts] [Test: npm test -- packages/frontend]

### T89.4: Active Model Live vs Historical Velocity Visual Comparison
  - [x] T89.4.1: Enhance the Velocity HUD card in HardwareMonitorComponent to render dual metrics: instantaneous live token velocity (tok/s) and the active model's historical baseline average velocity retrieved from ModelHealthRepository / HistoryMetricsService. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Test: npm test -- packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.spec.ts]
  - [x] T89.4.2: Display a visual comparison variance badge indicating whether current generation speed is faster (green +X%) or degraded (amber/red -X%) relative to the model's historical baseline. [File: packages/frontend/src/app/components/hardware-monitor/hardware-monitor.component.ts] [Test: npm test -- packages/frontend]

---

## Archived Phase 90: Deep Active Task Inspector: Sub-Stage Telemetry, Real-Time Test Taps & Generation Health Watchdog
*Completed & Verified in Engineering Session*

*RDF Category: telemetry / orchestration*

### T90.1: Live Multi-Sub-Stage Inspection Panel in Task Inspector
  - [x] T90.1.1: Extend TaskInspectorComponent with sub-stage selection tabs: Live Generation & Thought Trace, Test Execution Console, AST Rule Scrubbing, and PR Review Feedback. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test -- packages/frontend/src/app/components/task-inspector/task-inspector.component.spec.ts]
  - [x] T90.1.2: Connect the Test Execution Console tab to real-time stdout/stderr streams emitted by test runners (node --test, jest, ng test) during the test execution stage, eliminating blind waiting periods. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test -- packages/frontend]
  - [x] T90.1.3: Connect the AST Rule Scrubbing tab to real-time events from RulePipelineEngine and CompilerDiagnosticAutoRepair, displaying which compiler diagnostic codes were detected and the exact deterministic transformations applied. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test -- packages/frontend]

### T90.2: Generation Heartbeat & Stall Detection Diagnostics
  - [x] T90.2.1: Implement GenerationHeartbeatTracker in packages/engine/src/inference/GenerationHeartbeatTracker.ts that measures Time-To-First-Token (TTFT), prompt ingestion time, instantaneous inter-token latency, and total silent wait time. [File: packages/engine/src/inference/GenerationHeartbeatTracker.ts] [Class: GenerationHeartbeatTracker] [Test: npm test -- packages/engine/src/tests/generation_heartbeat.test.ts]
  - [x] T90.2.2: Update StreamTapManager and SSE broadcast protocol to emit heartbeat events (generation_heartbeat: { ttftMs, promptIngestionMs, isStalled, idleMs }) every 1000ms during the generation stage. [File: packages/engine/src/inference/StreamTapManager.ts] [Test: npm test -- packages/engine/src/tests/stage_telemetry.test.ts]
  - [x] T90.2.3: In TaskInspectorComponent, display an animated Generation Health indicator: Ingesting Prompt, Streaming Tokens (X tok/s), or Stall Warning (No output for Ys), giving clear visibility into whether the model is computing or frozen. [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test -- packages/frontend]

---

## Archived Phase 91: Automated Regression Circuit Breaker, Diagnostic Incident Bundling & Rule Synthesis Engine
*Completed & Verified in Engineering Session*

*RDF Category: resilience / analytics*

### T91.1: Multi-Model Failure Burst & Cluster Detection
  - [x] T91.1.1: Implement FailureClusterDetector in packages/engine/src/analytics/FailureClusterDetector.ts that analyzes moving windows of task completions; triggers a REGRESSION_BURST_ALERT when consecutive or high-density failures occur across 2 or more distinct models within 10 tasks. [File: packages/engine/src/analytics/FailureClusterDetector.ts] [Class: FailureClusterDetector] [Test: npm test -- packages/engine/src/tests/failure_cluster_detector.test.ts]
  - [x] T91.1.2: Automatically capture an incident snapshot bundle (data/diagnostics/incident-<timestamp>.json) containing the last 10 git commits, failing task prompts, AST diagnostic logs, and exit codes. [File: packages/engine/src/analytics/IncidentBundleRecorder.ts] [Class: IncidentBundleRecorder] [Test: npm test -- packages/engine/src/tests/incident_recorder.test.ts]

### T91.2: Frontier Regression Root-Cause Analysis Hook
  - [x] T91.2.1: Implement FrontierRegressionAnalyzer in packages/engine/src/analytics/FrontierRegressionAnalyzer.ts that queries a configured frontier model (e.g. Claude 3.7 / Gemini 2.5 / DeepSeek R1) with the incident bundle to differentiate between internal engine regressions and model prompt errors. [File: packages/engine/src/analytics/FrontierRegressionAnalyzer.ts] [Class: FrontierRegressionAnalyzer] [Test: npm test -- packages/engine/src/tests/frontier_regression_analyzer.test.ts]
  - [x] T91.2.2: Automatically generate a git bisect / suspect commit recommendation when the frontier analyzer identifies breaking commits in git history. [File: packages/engine/src/analytics/FrontierRegressionAnalyzer.ts] [Test: npm test -- packages/engine/src/tests/frontier_regression_analyzer.test.ts]

### T91.3: Automated Deterministic Mitigation & Repair Rule Synthesizer
  - [x] T91.3.1: Implement RuleSynthesisQueue that harvests recurring compiler diagnostic errors and syntactic anomalies, automatically queueing high-priority meta_rule tasks to create new declarative rules for RulePipelineEngine. [File: packages/engine/src/rules/RuleSynthesisQueue.ts] [Class: RuleSynthesisQueue] [Test: npm test -- packages/engine/src/tests/rule_synthesis.test.ts]
  - [x] T91.3.2: Auto-generate TypeScript AST repair templates from verified successful remediations to continuously expand CompilerDiagnosticAutoRepair without manual intervention. [File: packages/engine/src/testing/CompilerDiagnosticAutoRepair.ts] [Test: npm test -- packages/engine/src/tests/compiler_diagnostic_auto_repair.test.ts]

---

## Archived Phase 92: Stage-Decomposed Task Architecture, Batched Model-Affinity Scheduling & Asynchronous Verification
*Completed & Verified in Engineering Session*

*RDF Category: orchestration / scheduler*

### T92.1: Asynchronous Stage-Decomposed Task State Machine
  - [x] T92.1.1: Extend TaskRecord domain schema in packages/shared-types/src/task.ts with currentStage: PipelineStageType, stageState: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED', and stage artifact payloads. [File: packages/shared-types/src/task.ts] [Test: npm test -- packages/shared-types]
  - [x] T92.1.2: Update TaskRepository to allow persisting task progress between individual stages without marking the overarching task as concluded (COMPLETED or FAILED), enabling asynchronous handoffs between different models. [File: packages/db/src/repositories/TaskRepository.ts] [Method: TaskRepository.updateStageState] [Test: npm test -- packages/db/src/tests/TaskRepository.test.ts]

### T92.2: VRAM-Preserving Batched Stage Execution (5-Task Burst Window)
  - [x] T92.2.1: Implement BatchedStageScheduler in packages/engine/src/scheduler/BatchedStageScheduler.ts: when a heavy model (e.g. qwen2.5-coder:14b or deepseek-r1:8b) is resident in VRAM, batch-dispatch up to 5 tasks requiring that model's specific stage (e.g. Planning or Review) before permitting model unload or context swaps. [File: packages/engine/src/scheduler/BatchedStageScheduler.ts] [Class: BatchedStageScheduler] [Test: npm test -- packages/engine/src/tests/batched_stage_scheduler.test.ts]
  - [x] T92.2.2: Wire BatchedStageScheduler into TaskScheduler.tick(), maintaining APU thermal boundaries and single-concurrency execution while drastically cutting Ollama model load overhead. [File: packages/engine/src/scheduler/TaskScheduler.ts] [Test: npm test -- packages/engine/src/tests/scheduler.test.ts]

### T92.3: Decoupled Background Asynchronous Test Execution
  - [x] T92.3.1: Implement BackgroundTestWorkerPool in packages/engine/src/testing/BackgroundTestWorkerPool.ts: run test commands (node --test, npm test) asynchronously in isolated host subprocesses, freeing the APU/VRAM inference lock immediately for the next queued model task. [File: packages/engine/src/testing/BackgroundTestWorkerPool.ts] [Class: BackgroundTestWorkerPool] [Test: npm test -- packages/engine/src/tests/background_test_worker.test.ts]
  - [x] T92.3.2: Reconcile test completion events asynchronously: on test pass, transition task to Review stage; on test failure, transition task to Remediation stage with captured test logs. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]

### T92.4: Ultra-Lightweight Chore Model Squeezing (Documentation & Ephemeral Tasks)
  - [x] T92.4.1: Define chore_runner role for ultra-small models (smollm2:135m, qwen2.5-coder:1.5b/3b) to execute zero-overhead micro-tasks: appending new route docs to docs/api_spec.md, updating README summaries, and drafting commit changelogs while primary models cool down. [File: packages/engine/src/scheduler/ModelRoleSelector.ts] [Test: npm test -- packages/engine/src/tests/model_role_selector.test.ts]
  - [x] T92.4.2: Implement ApiDocAppender that automatically generates markdown documentation blocks for newly created API endpoints and commits them to docs/api_spec.md. [File: packages/engine/src/rules/ApiDocAppender.ts] [Class: ApiDocAppender] [Test: npm test -- packages/engine/src/tests/api_doc_appender.test.ts]

---

## Archived Phase 93: AST Collision-Free Hash-Stubbing & Two-Pass Method Splicing Engine
*Completed & Verified in Engineering Session*

*RDF Category: context / generation*

### T93.1: Collision-Free Hash-Stub Comment Protocol
  - [x] T93.1.1: Implement HashStubGenerator in packages/engine/src/context/HashStubGenerator.ts producing deterministic, non-colliding comment anchors (e.g. /* [CACOPHONY_HASH_STUB:7f8a9b1c:calculateRiskScore] */) paired with strict TypeScript interface signatures. [File: packages/engine/src/context/HashStubGenerator.ts] [Class: HashStubGenerator] [Test: npm test -- packages/engine/src/tests/hash_stub_generator.test.ts]
  - [x] T93.1.2: Define the two-pass prompt protocol: Pass 1 (Architect/Large Model) outputs file architecture with imports, types, and hash-marked method stubs; Pass 2 (Implementer/Fast Model) receives individual method scopes and implements only the targeted { ... } block without touching imports. [File: packages/engine/src/inference/PromptTemplateRegistry.ts] [Test: npm test -- packages/engine/src/tests/prompt_template_registry.test.ts]

### T93.2: Deterministic AST Method Splicer & Import Injector
  - [x] T93.2.1: Implement HashStubMethodSplicer in packages/engine/src/context/HashStubMethodSplicer.ts using the TypeScript Compiler API to replace targeted hash-stub comment nodes with verified method AST declarations without line drift or formatting loss. [File: packages/engine/src/context/HashStubMethodSplicer.ts] [Class: HashStubMethodSplicer] [Test: npm test -- packages/engine/src/tests/hash_stub_splicer.test.ts]
  - [x] T93.2.2: Implement DeterministicImportInjector that analyzes AST symbol references in newly spliced method bodies, matches unimported symbols against project exported symbols, and cleanly inserts missing ESM imports at the top of the file without model intervention. [File: packages/engine/src/context/DeterministicImportInjector.ts] [Class: DeterministicImportInjector] [Test: npm test -- packages/engine/src/tests/import_injector.test.ts]

### T93.3: Temporary Marker Sanitizer & Pre-Review Cleanup
  - [x] T93.3.1: Implement StubCommentSanitizer in packages/engine/src/testing/StubCommentSanitizer.ts: strips all temporary [CACOPHONY_HASH_STUB:*] markers, cage comments, and temporary scaffolding before committing to the task worktree. [File: packages/engine/src/testing/StubCommentSanitizer.ts] [Class: StubCommentSanitizer] [Test: npm test -- packages/engine/src/tests/stub_sanitizer.test.ts]
  - [x] T93.3.2: Add verification assertion rejecting any pull request commit that contains residual stub comments or unimplemented marker tags. [File: packages/engine/src/testing/GeneratedChangeGuard.ts] [Test: npm test -- packages/engine/src/tests/generated_change_guard.test.ts]

---

## Archived Phase 94: Multi-Perspective Autonomous PR Review, Specialized Domain Personas & Consensus Synthesis
*Completed & Verified in Engineering Session*

*RDF Category: inference / review*

### T94.1: Domain-Specialized Review Personas & Verification Envelopes
  - [x] T94.1.1: Define structured review domain personas in packages/shared-types/src/review.ts: SecurityAuditor (sanitization, injection, secret exposure), ArchitectureAuditor (SOLID boundaries, coupling, interface isolation), and DxUxAuditor (typing ergonomics, mobile responsiveness, error clarity). [File: packages/shared-types/src/review.ts] [Test: npm test -- packages/shared-types]
  - [x] T94.1.2: Implement specialized prompt templates per review persona with tailored checklists and machine-parseable JSON verdict schemas ({ verdict: 'APPROVE' | 'REQUEST_CHANGES', findings: [...] }). [File: packages/engine/src/inference/ReviewerPersonaPromptFactory.ts] [Class: ReviewerPersonaPromptFactory] [Test: npm test -- packages/engine/src/tests/reviewer_persona.test.ts]

### T94.2: Multi-Model Consensus & Review Synthesis Engine
  - [x] T94.2.1: Implement MultiModelConsensusCoordinator in packages/engine/src/inference/MultiModelConsensusCoordinator.ts: dispatches the PR diff to up to 3 distinct candidate models (e.g. qwen2.5-coder:14b, deepseek-r1:8b, and gemma3:4b-it-qat). [File: packages/engine/src/inference/MultiModelConsensusCoordinator.ts] [Class: MultiModelConsensusCoordinator] [Test: npm test -- packages/engine/src/tests/multi_model_consensus.test.ts]
  - [x] T94.2.2: Implement ReviewOpinionSynthesizer that unifies findings across models, deduplicates overlapping critique, derives consensus severity ratings, and formats an actionable unified review comment on the Gitea/GitHub PR. [File: packages/engine/src/inference/ReviewOpinionSynthesizer.ts] [Class: ReviewOpinionSynthesizer] [Test: npm test -- packages/engine/src/tests/review_synthesis.test.ts]

### T94.3: Model Reviewer Profiles & Interactive Remediation Loop
  - [x] T94.3.1: Extend ModelProfileRepository with per-model review capabilities: configured context window (e.g. 4k vs 8k vs 16k), review temperature, and domain affinity scores. [File: packages/db/src/repositories/ModelProfileRepository.ts] [Test: npm test -- packages/db/src/tests/ModelProfileRepository.test.ts]
  - [x] T94.3.2: Wire the review feedback loop back into the task queue: when REQUEST_CHANGES is synthesized, enqueue a targeted remediation task containing specific reviewer comments and line references for the implementer model to address. [File: packages/engine/src/gitea/PrAssessmentCoordinator.ts] [Test: npm test -- packages/engine/src/tests/pr_assessment.test.ts]

---

## Archived Phase 95: Ultra-Lightweight Tool Routing, Strategy Classifier & Zero-Latency Decision Dispatcher
*Completed & Verified in Engineering Session*

*RDF Category: inference / routing*

### T95.1: Micro-Model Binary Tool Routing & Strategy Classifier
  - [x] T95.1.1: Implement MicroModelToolRouter in packages/engine/src/inference/MicroModelToolRouter.ts using fast sub-1B / 3B models (smollm2:135m, qwen2.5-coder:3b) to classify code task strategy: MONOLITHIC_FILE_GENERATION (files < 150 lines) vs HASH_STUB_SPLICING (complex classes / multi-method edits). [File: packages/engine/src/inference/MicroModelToolRouter.ts] [Class: MicroModelToolRouter] [Test: npm test -- packages/engine/src/tests/micro_tool_router.test.ts]
  - [x] T95.1.2: Implement structured constrained JSON decoding for tool selection, verifying that small models yield valid tool invocations without hallucinations or latency penalties (< 200ms decision latency). [File: packages/engine/src/inference/MicroModelToolRouter.ts] [Method: MicroModelToolRouter.routeTaskStrategy] [Test: npm test -- packages/engine/src/tests/micro_tool_router.test.ts]

### T95.2: Automated Strategy Dispatch Wireup in Autonomous Worker Pipeline
  - [x] T95.2.1: Integrate MicroModelToolRouter into AutonomousWorkerPipeline.executeTask(): queries the strategy classifier during preflight and automatically routes task execution to either the single-file pipeline or the two-pass hash-stub splicer. [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/autonomous_continuous_arena.test.ts]
  - [x] T95.2.2: Write integration tests verifying seamless strategy selection across small single-file tasks and large multi-method classes. [File: packages/engine/src/tests/pipeline_strategy_dispatch.test.ts] [Test: npm test -- packages/engine/src/tests/pipeline_strategy_dispatch.test.ts]

---

## Engineering Session Record — 2026-10-06

- Audited arena changes from the first explicit PR merge through `44f224a`; the findings and change-size evidence are recorded in [`docs/arena-internals-audit.md`](arena-internals-audit.md).
- Added authenticated, idempotent CI-failure task ingestion and Gitea Actions workflow; strict GitHub CI completed successfully on commit `21a5c3b` (run `37417706403`).
- Disabled Angular's build-time external-font fetch so the production build does not depend on Google Fonts network access. The monorepo build passed and the engine container restarted healthy.
- Added the modularization boundary and code-safety / queued-assessment planning in [`docs/future.md`](future.md) and [`docs/planning.md`](planning.md).
- Added active high-priority implementation work as Phase 88 in [`docs/taskcade.md`](taskcade.md). Phase 88 remains planned work and is not recorded here as complete.
- GitHub branch protection and Gitea Actions runner/secrets remain operational setup items; they are called out in the audit report.

---

## Archived Phase 82: Arena Telemetry Epoching & Clean-Slate Model Health Reset Engine
*Completed & Verified in Engineering Session*

*RDF Category: empirical_metrics*

### T82.1: Database Migration `015_arena_epochs.ts`
  - [x] T82.1.1: Author database migration `015_arena_epochs.ts` creating `arena_epochs` table (`epoch_id`, `name`, `reason`, `started_at`, `ended_at`, `is_active`, `task_count`, `success_count`, `failure_count`, `notes`). [File: packages/db/src/migrations/015_arena_epochs.ts] [Test: npm test -- packages/db]
  - [x] T82.1.2: Create `model_health_epoch_history` table capturing point-in-time snapshots of model health profiles per epoch. [File: packages/db/src/migrations/015_arena_epochs.ts] [Table: model_health_epoch_history] [Test: npm test -- packages/db]
  - [x] T82.1.3: Register migration in `MigrationRegistry.ts` ensuring clean execution on startup across PostgreSQL and SQLite dialects. [File: packages/db/src/migrations/MigrationRegistry.ts] [Test: npm test -- packages/db]
  - [x] T82.1.4: Write unit tests verifying migration executes idempotently and initial baseline Epoch 1 is seeded. [File: packages/db/src/tests/arena_epoch.test.ts] [Test: npm test -- packages/db/src/tests/arena_epoch.test.ts]

### T82.2: `ModelHealthRepository` Epoch Methods
  - [x] T82.2.1: Implement `resetAllStats()` in `ModelHealthRepository.ts` resetting `total_tasks`, `total_success`, `total_failures`, `consecutive_failures` to 0, and restoring status to `ACTIVE`. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: resetAllStats] [Test: npm test -- packages/db/src/tests/arena_epoch.test.ts]
  - [x] T82.2.2: Implement `advanceEpoch(name: string, reason: string, notes?: string)` archiving current model metrics to history table and initializing a fresh epoch. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: advanceEpoch] [Test: npm test -- packages/db/src/tests/arena_epoch.test.ts]
  - [x] T82.2.3: Implement `getCurrentEpoch()` and `listEpochs()` returning historical epoch records and metadata. [File: packages/db/src/repositories/ModelHealthRepository.ts] [Method: getCurrentEpoch] [Test: npm test -- packages/db/src/tests/arena_epoch.test.ts]
  - [x] T82.2.4: Write unit tests verifying that advancing an epoch un-ejects all evicted models and snapshots historical metrics cleanly. [File: packages/db/src/tests/arena_epoch.test.ts] [Test: npm test -- packages/db/src/tests/arena_epoch.test.ts]

### T82.3: REST API Routes for Epoch Management
  - [x] T82.3.1: Expose `POST /api/models/epoch` in `CacophonyHttpServer.ts` advancing the active arena epoch and resetting model counters. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/models/epoch] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T82.3.2: Expose `POST /api/models/reset-stats` in `CacophonyHttpServer.ts` clearing dirty stats for the current epoch without advancing epoch counter. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: POST /api/models/reset-stats] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T82.3.3: Expose `GET /api/arena/epochs` returning all historical epochs with their start/end dates and aggregate pass rates. [File: packages/engine/src/daemon/CacophonyHttpServer.ts] [Route: GET /api/arena/epochs] [Test: npm test -- packages/engine/src/tests/http_api.test.ts]
  - [x] T82.3.4: Write integration tests verifying REST API routes validate authentication and return expected JSON payloads. [File: packages/engine/src/tests/epoch_api.test.ts] [Test: npm test -- packages/engine/src/tests/epoch_api.test.ts]

### T82.4: Multi-Armed Bandit Policy State Reset on Epoch Advancement
  - [x] T82.4.1: Connect `advanceEpoch` trigger to `BanditPolicy` resetting arms' alpha/beta parameters in Thompson Sampling to uniform priors. [File: packages/engine/src/bandit/ThompsonSamplingPolicy.ts] [Method: resetArms] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [x] T82.4.2: Reset exploration budget in `EpsilonGreedyPolicy` to `initialEpsilon`, allowing models to be re-explored in the new epoch. [File: packages/engine/src/bandit/EpsilonGreedyPolicy.ts] [Method: resetExploration] [Test: npm test -- packages/engine/src/tests/bandit_policies.test.ts]
  - [x] T82.4.3: Broadcast `arena_epoch_advanced` SSE event over `StreamTapManager` alerting all connected UI clients. [File: packages/engine/src/inference/StreamTapManager.ts] [Method: broadcastEpochAdvanced] [Test: npm test -- packages/engine/src/tests/stream_tap_manager.test.ts]
  - [x] T82.4.4: Write unit tests verifying bandit policies cleanly re-explore candidate models following an epoch reset. [File: packages/engine/src/tests/epoch_bandit_reset.test.ts] [Test: npm test -- packages/engine/src/tests/epoch_bandit_reset.test.ts]

### T82.5: Frontend UI Epoch Selector & Reset Control on `/models`
  - [x] T82.5.1: Add epoch selector dropdown to `ModelsViewComponent` on `/models` allowing operators to toggle between 'Current Epoch', historical epochs, and 'All Time'. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Signal: selectedEpoch] [Test: npm test]
  - [x] T82.5.2: Add 'Start New Epoch' button in UI opening a confirmation modal to record epoch name, reason, and reset dirty metrics. [File: packages/frontend/src/app/components/views/models-view.component.ts] [Method: openEpochModal] [Test: npm test]
  - [x] T82.5.3: Display visual epoch badge and current epoch run count in `SessionTabsComponent`. [File: packages/frontend/src/app/components/session-tabs/session-tabs.component.ts] [Test: npm test]
  - [x] T82.5.4: Write frontend unit tests validating epoch dropdown filtering and epoch advancement modal lifecycle. [File: packages/frontend/src/app/components/views/models-view.component.spec.ts] [Test: npm test]
