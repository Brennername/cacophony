# Cacophony Taskcade: Autonomous Local Model Arena & Code Orchestrator

## Architectural Directives & Operational Rules
- Zero Emojis in any code, comments, documentation, or commits (unless a feature explicitly declares emoji exemption).
- SOLID principles strictly enforced across all modules.
- Strict typing: TypeScript (Node.js/Bun) and modern Angular (v20+ with Signals, Zoneless, Standalone); strictly NO Python in core codebase.
- Database: PGlite (in-process WASM/Node PostgreSQL) with clean abstraction for SQLite, PostgreSQL, and MariaDB.
- Single-concurrency scheduler: Vega APU affinity grouping (minimizes Ollama model unloads), model failure eviction (3-4 consecutive fails), and weighted random fallback.
- Mobile-first responsive UI with Dark Mode (default), Light Mode, and High Contrast Mode adhering to Angular best practices (`docs/SKILL.md`).
- All secrets strictly confined to .env and encrypted vault.
- Zero Hardcoding & Whitebox Configurability: Any option, parameter, hyperparameter, model identifier, context limit, or threshold must be configurable via typed options/config schemas with intelligent defaults, never hardcoded as arbitrary string or numeric literals.
- Never delete source files with rm; move deprecated files to .trash/ with justification documentation.
- Always commit changes, keep workspace clean, and ensure work is production ready.

---

## Taskcade Rotation & History Protocol
1. **Verification Gate**: No task is marked completed `[x]` or rotated without passing its verified automated test suite or operational validation.
2. **Archival Procedure**: When an entire phase or major milestone is fully verified, its completed checklist items are transferred from `docs/taskcade.md` to `docs/taskcade-history.md`.
3. **Traceability**: Each archived phase preserves its task IDs, descriptions, subtask trees, associated git commit hashes, and verification scope.
4. **Token Efficiency**: Active planning and execution in `docs/taskcade.md` remain uncluttered, allowing AI agents and human operators to focus directly on pending work without context exhaustion.
5. **Reference**: See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 10.

---

## Active Phase 6 Outstanding Item
- [x] T6.1.4: Implement automated code formatter invocation (Prettier / ESLint programmatic autofix) integrated into `CodeScrubber` pipeline.

---

## Phase 11: Context & Intelligence Engine (OpenCode & Aider Spec)
*RDF Category: `spec:ContextAndIntelligenceCategory`*

### T11.1: Language Server Protocol (LSP) Integration (`spec:LanguageServerProtocolIntegration`)
- [x] T11.1.1: Core LSP Client & Lifecycle Manager:
  - [x] T11.1.1.1: Define `ILspClient` interface (lifecycle `start`, `stop`, `restart`, `sendRequest`, `onNotification`, `onDiagnostic`).
  - [x] T11.1.1.2: Implement `LspProcessSupervisor` managing child language server processes via JSON-RPC stdio.
  - [x] T11.1.1.3: Implement auto-detection and launcher for `typescript-language-server` / `tsserver`.
  - [x] T11.1.1.4: Implement auto-detection and launcher for Java (`jdtls` / Eclipse JDT LS).
  - [x] T11.1.1.5: Implement auto-detection and launcher for Go (`gopls`).
  - [x] T11.1.1.6: Implement auto-detection and launcher for Rust (`rust-analyzer`).
  - [x] T11.1.1.7: Implement LSP workspace capability negotiation (`textDocument/publishDiagnostics`, `textDocument/definition`, `textDocument/references`, `textDocument/hover`, `textDocument/documentSymbol`).
- [x] T11.1.2: Compiler Diagnostics & Type Error Ingestion:
  - [x] T11.1.2.1: Implement `LspDiagnosticIngestor` subscribing to `textDocument/publishDiagnostics`.
  - [x] T11.1.2.2: Implement structured normalization of compiler diagnostics (severity: Error, Warning, Info, Hint; code, source, message, range).
  - [x] T11.1.2.3: Implement `LspDiagnosticStore` tracking active workspace errors and warnings keyed by URI and revision.
  - [x] T11.1.2.4: Implement post-edit diagnostic settling barrier (wait for language server debounced analysis to complete before proceeding to test phase).
- [x] T11.1.3: Self-Healing LSP Error Feedback:
  - [x] T11.1.3.1: Implement `LspErrorFeedbackFormatter` generating targeted markdown error snippets with exact line context and compiler error codes.
  - [x] T11.1.3.2: Integrate LSP diagnostic feedback into `SelfHealingParseLoop` to trigger auto-remediation before running full test suites.
  - [x] T11.1.3.3: Store LSP diagnostics in database table `lsp_diagnostic_snapshots` for telemetry and model error tracking.
- [x] T11.1.4: Symbol Navigation & Workspace Querying:
  - [x] T11.1.4.1: Implement LSP-powered go-to-definition and find-references tools for the engine.
  - [x] T11.1.4.2: Expose `lsp_get_diagnostics` and `lsp_find_definition` as callable tools in `packages/tools`.
  - [x] T11.1.4.3: Write comprehensive unit tests for LSP JSON-RPC message framing, process supervisor, and diagnostic parsing.

### T11.2: Model-Agnostic Registry & Multi-Provider Architecture (`spec:ModelAgnosticRegistry`)
- [x] T11.2.1: Unified Model Registry Abstraction:
  - [x] T11.2.1.1: Define `IModelRegistry` interface (register, deregister, discover, queryCapabilities, benchmarkModel, getOptimalModelForTask).
  - [x] T11.2.1.2: Implement `ModelSpec` schema (model ID, family, provider, context window size, max output tokens, tool calling capability, diff format capability, cost per 1k tokens, local vs cloud).
  - [x] T11.2.1.3: Create database table `model_registry_entries` and repository in `@cacophony/db`.
- [x] T11.2.2: Local Provider Adapters:
  - [x] T11.2.2.1: Implement `LMStudioProvider` connecting to local LM Studio server (`http://localhost:1234/v1`).
  - [x] T11.2.2.2: Implement `OllamaDiscoveryService` dynamically querying `/api/tags` and `/api/show` to extract model parameters and quantization info.
  - [x] T11.2.2.3: Implement `LocalEndpointScanner` probing standard local inference ports (Ollama: 11434, LM Studio: 1234, vLLM: 8000, LocalAI: 8080).
- [x] T11.2.3: Cloud & Frontier Provider Adapters:
  - [x] T11.2.3.1: Refactor `FrontierProvider` into modular provider drivers: `OpenAiDriver`, `AnthropicDriver`, `GeminiDriver`, `GroqDriver`, `MistralDriver`.
  - [x] T11.2.3.2: Implement OpenAI-compatible generic driver supporting any custom baseURL and API key.
  - [x] T11.2.3.3: Implement rate limiting and exponential backoff retry policies per provider.
- [x] T11.2.4: Model Benchmarking & Dynamic Capability Matrix:
  - [x] T11.2.4.1: Implement `ModelCapabilityProber` running lightweight probe tasks (JSON formatting, diff generation, code completion) on model registration.
  - [x] T11.2.4.2: Dynamically tag models as `WHOLE_FILE_ONLY` vs `DIFF_CAPABLE` based on probe results.
  - [x] T11.2.4.3: Write unit tests verifying provider registry registration, discovery, and dynamic routing.

### T11.3: Model Context Protocol (MCP) Client & External Tool Discovery (`spec:ModelContextProtocolSupport`)
- [x] T11.3.1: Bidirectional MCP Client Core:
  - [x] T11.3.1.1: Implement `McpClientManager` supporting outbound connections to external MCP servers via Stdio and SSE transports.
  - [x] T11.3.1.2: Implement MCP tool discovery protocol (`tools/list`) querying external servers and registering discovered tools into engine runtime.
  - [x] T11.3.1.3: Implement MCP resource discovery (`resources/list`, `resources/read`) to pull external documentation and configuration.
  - [x] T11.3.1.4: Implement MCP prompt template ingestion (`prompts/list`, `prompts/get`).
- [x] T11.3.2: Configuration & Third-Party Server Connections:
  - [x] T11.3.2.1: Define MCP configuration schema in `conf/mcp_servers.json` (server command, arguments, environment variables, transport type).
  - [x] T11.3.2.2: Implement secure credential injection from `SecretVault` for external MCP servers requiring authentication.
  - [x] T11.3.2.3: Implement connection health checks and automatic reconnection for SSE and stdio MCP servers.
- [x] T11.3.3: Tool Namespace & Security Isolation:
  - [x] T11.3.3.1: Implement tool namespacing (`serverName:toolName`) to prevent collision between internal and external tools.
  - [x] T11.3.3.2: Apply `ExecutionGuard` security policies to external MCP tool invocations (auditing, parameter sanitation, timeout gating).
  - [x] T11.3.3.3: Write unit tests verifying MCP client handshake, tool catalog synchronization, and secure execution.

### T11.4: Auto-Compacting Conversation Sessions (`spec:AutoCompactingSessions`)
- [x] T11.4.1: Token Budget & Utilization Monitor:
  - [x] T11.4.1.1: Implement `TokenUsageTracker` measuring accumulated prompt and completion tokens per session against model context limits.
  - [x] T11.4.1.2: Implement configurable compaction triggers (warning threshold: 70%, compaction threshold: 85% of max context window).
  - [x] T11.4.1.3: Implement message importance scoring (system directives, user instructions, latest code changes vs intermediate debug logs).
- [x] T11.4.2: Background Conversation Summarizer:
  - [x] T11.4.2.1: Implement `SessionCompactor` creating hierarchical summaries of past conversation turns.
  - [x] T11.4.2.2: Extract and preserve critical state: modified files list, architectural decisions, outstanding errors, and test outcomes.
  - [x] T11.4.2.3: Replace historical turns with a structured `[Session Summary]` block while keeping initial system prompts and the latest N turns intact.
  - [x] T11.4.2.4: Execute compaction asynchronously in background without blocking active generation streams.
- [x] T11.4.3: Compaction Verification & Rollback:
  - [x] T11.4.3.1: Validate that compacted context reduces token count by at least 40% while preserving key facts.
  - [x] T11.4.3.2: Store compaction snapshots in database table `session_compaction_history` to permit conversational rollback.
  - [x] T11.4.3.3: Write unit tests verifying token calculation, compaction thresholds, and summary preservation.

### T11.5: Persistent Multi-Tab Session Storage (`spec:PersistentSessionStorage`)
- [x] T11.5.1: Session Schema & Persistence Layer:
  - [x] T11.5.1.1: Create database table `sessions` (id, title, branch, active_model, total_tokens, status, created_at, updated_at).
  - [x] T11.5.1.2: Create database table `session_messages` (id, session_id, role, content, tool_calls_json, tool_results_json, token_count, created_at).
  - [x] T11.5.1.3: Create database table `session_tabs` (id, session_id, tab_name, active_file, cursor_position, order_index).
  - [x] T11.5.1.4: Implement `SessionRepository` and `SessionMessageRepository` in `@cacophony/db`.
- [x] T11.5.2: Multi-Tab Session Manager:
  - [x] T11.5.2.1: Implement `SessionManager` supporting concurrent multi-tab sessions with isolated conversational contexts.
  - [x] T11.5.2.2: Implement branch-scoped session binding (switching git branches auto-switches or filters relevant sessions).
  - [x] T11.5.2.3: Implement session save, export (JSON/Markdown), fork, and resume capabilities.
- [x] T11.5.3: Session Search & Indexing:
  - [x] T11.5.3.1: Implement full-text search across session messages and tool invocations using PostgreSQL full-text search in PGlite.
  - [x] T11.5.3.2: Implement session tagging and bookmarking for high-value architectural decisions.
  - [x] T11.5.3.3: Write unit tests verifying multi-tab session state isolation, persistence, and message retrieval.

---

## Phase 12: Repository Mapping & Granular Multi-File Context (Aider Core)
*RDF Category: `spec:GitAndWorkflowCategory`*

### T12.1: Repository Structure Mapping (`spec:RepositoryStructureMapping`)
- [ ] T12.1.1: Tree-Sitter & AST Symbol Extraction:
  - [ ] T12.1.1.1: Integrate `web-tree-sitter` (WASM) or TypeScript Compiler API for multi-language AST parsing (TypeScript, JavaScript, Java, Go, Rust, Python, HTML/CSS).
  - [ ] T12.1.1.2: Implement `SymbolExtractor` extracting classes, interfaces, methods, functions, type aliases, and exported variables with line ranges.
  - [ ] T12.1.1.3: Implement cross-file dependency graph builder analyzing imports, exports, and call hierarchies across the workspace.
- [ ] T12.1.2: Graph Centrality & PageRank Ranking:
  - [ ] T12.1.2.1: Implement dependency graph data structure (`SymbolGraph` with nodes=symbols/files and edges=imports/calls).
  - [ ] T12.1.2.2: Implement PageRank algorithm over `SymbolGraph` to determine key architectural hubs and high-centrality files.
  - [ ] T12.1.2.3: Cache ranked symbol index in database table `repository_symbol_graph` with file mtime invalidation.
- [ ] T12.1.3: Compressed Architectural Map Generation (Repo Map):
  - [ ] T12.1.3.1: Implement `RepoMapGenerator` fitting repository structure into configurable token budgets (e.g., 1024, 2048, 4096 tokens).
  - [ ] T12.1.3.2: Format output showing file paths, critical classes, and signatures with indentation matching directory hierarchy.
  - [ ] T12.1.3.3: Implement query-focused repo map: given a user query, bias symbol ranking toward files containing query keywords and their immediate graph neighbors.
  - [ ] T12.1.3.4: Write unit tests verifying symbol extraction, graph ranking, token budget adherence, and query biasing.

### T12.2: Granular Multi-File Context Selection (`spec:GranularMultiFileContext`)
- [ ] T12.2.1: Context Tagging & Scoping Engine:
  - [ ] T12.2.1.1: Implement `ContextManager` maintaining active session context files categorized as `EDITABLE` (read-write) or `REFERENCE` (read-only).
  - [ ] T12.2.1.2: Implement commands `/add <file>`, `/drop <file>`, `/read-only <file>`, and `/clear` in both CLI and engine API.
  - [ ] T12.2.1.3: Implement glob pattern matching for batch file inclusion (`/add src/services/*.ts`).
- [ ] T12.2.2: Smart Context Recommendations:
  - [ ] T12.2.2.1: Implement `ContextRecommender` analyzing user prompt and active files, suggesting related files based on the dependency graph.
  - [ ] T12.2.2.2: Implement automatic inclusion of test files corresponding to editable source files (e.g., `foo.ts` -> `foo.test.ts` or `foo.spec.ts`).
  - [ ] T12.2.2.3: Warn users when context size exceeds 60% of model window, providing actionable suggestions to drop unneeded files.
- [ ] T12.2.3: Multi-File Edit Coordination:
  - [ ] T12.2.3.1: Implement multi-file transaction staging: coordinate generation of changes across multiple files before committing any to disk.
  - [ ] T12.2.3.2: Verify cross-file type consistency and interface matching prior to disk application.
  - [ ] T12.2.3.3: Write unit tests for context tagging, budget allocation, and multi-file staging.

### T12.3: Automated Git Checkpoints & Micro-Snapshots (`spec:AutomatedGitCheckpoints`)
- [ ] T12.3.1: Shadow Git Checkpoint Manager:
  - [ ] T12.3.1.1: Implement `GitCheckpointService` creating atomic lightweight git commits or shadow git refs (`refs/cacophony/checkpoints/<timestamp>`) before and after edits.
  - [ ] T12.3.1.2: Implement pre-edit snapshotting capturing dirty workspace state without interfering with user working tree.
  - [ ] T12.3.1.3: Implement structured commit message generator documenting task ID, model assigned, and summary of changes.
- [ ] T12.3.2: Checkpoint Metadata & Storage:
  - [ ] T12.3.2.1: Create database table `git_checkpoints` (id, session_id, task_id, commit_hash, parent_hash, message, files_changed, created_at).
  - [ ] T12.3.2.2: Implement checkpoint diff generator producing readable unified diffs between checkpoints.
  - [ ] T12.3.2.3: Implement automatic checkpoint retention policy (pruning checkpoints older than 7 days or exceeding 500 per workspace).
- [ ] T12.3.3: Testing & Resilience:
  - [ ] T12.3.3.1: Verify checkpoints work seamlessly inside isolated git worktrees.
  - [ ] T12.3.3.2: Write unit tests verifying checkpoint creation, ref storage, and metadata indexing.

### T12.4: Git-Based Undo / Redo Engine (`spec:GitUndoRedoCommands`)
- [ ] T12.4.1: Instant State Rollback:
  - [ ] T12.4.1.1: Implement `GitUndoManager` handling `/undo` command: reverts working tree to the immediate pre-task checkpoint.
  - [ ] T12.4.1.2: Implement `/redo` command: reapplies rolled-back checkpoint forward if no conflicting edits have occurred.
  - [ ] T12.4.1.3: Synchronize conversational context state upon undo (remove corresponding LLM turns or mark them as undone).
- [ ] T12.4.2: Selective & Partial Rollback:
  - [ ] T12.4.2.1: Implement `/undo <file>` allowing rollback of a single specific file while preserving changes to other files.
  - [ ] T12.4.2.2: Implement conflict detection warning users if manual uncommitted edits will be overwritten by undo.
  - [ ] T12.4.2.3: Write unit tests validating single-file undo, full task undo, redo chains, and context synchronization.

---

## Phase 13: Execution & Automated Test Feedback Loop (Aider & OpenCode)
*RDF Category: `spec:ExecutionAndFeedbackCategory`*

### T13.1: Automated Test Loop Integration (`spec:AutomatedTestLoopIntegration`)
- [ ] T13.1.1: Project Test Suite Auto-Discovery:
  - [ ] T13.1.1.1: Implement `TestRunnerDetector` auto-detecting project test frameworks (Vitest, Jest, Mocha, Playwright, JUnit/Maven, JUnit/Gradle, Go Test, Cargo Test).
  - [ ] T13.1.1.2: Implement fine-grained test scoping (run only tests affected by changed files based on dependency graph).
  - [ ] T13.1.1.3: Allow workspace and task-level test command overrides in configuration and UI.
- [ ] T13.1.2: Post-Edit Test Execution Runner:
  - [ ] T13.1.2.1: Implement `AutomatedTestLoopRunner` executing scoped test suites automatically upon code application.
  - [ ] T13.1.2.2: Capture real-time stdout, stderr, process exit codes, and execution duration.
  - [ ] T13.1.2.3: Implement test execution timeout guard (prevent runaway tests or infinite loops with configurable threshold).
- [ ] T13.1.3: Failure Diagnostics & Stack Trace Extraction:
  - [ ] T13.1.3.1: Implement `TestOutputParser` parsing stack traces, failed assertion diffs (expected vs received), and file/line locations.
  - [ ] T13.1.3.2: Filter out noisy test runner boilerplate, isolating root failure causes.
  - [ ] T13.1.3.3: Store test execution logs in database table `test_execution_runs`.
- [ ] T13.1.4: Closed-Loop Model Remediation:
  - [ ] T13.1.4.1: If tests fail, feed parsed error traces, failing assertion details, and line snippets directly back to the model.
  - [ ] T13.1.4.2: Enforce bounded remediation cycle (maximum 3 retry attempts before declaring task failed or escalating to frontier model).
  - [ ] T13.1.4.3: Automatically rollback changes via `GitUndoManager` if remediation fails after maximum attempts.
  - [ ] T13.1.4.4: Write unit and integration tests verifying test runner invocation, failure parsing, and closed-loop retry logic.

---

## Phase 14: Terminal User Interface (TUI) & Developer Experience
*RDF Category: `spec:InterfaceAndControlCategory`*

### T14.1: Advanced Terminal User Interface (`spec:AdvancedTerminalUserInterface`)
- [ ] T14.1.1: TUI Architecture & Framework Setup:
  - [ ] T14.1.1.1: Select and integrate Node.js TUI framework (such as `@inquirer/core`, `blessed`, or terminal-kit) within `@cacophony/cli`.
  - [ ] T14.1.1.2: Implement responsive terminal layout engine handling resizing and responsive terminal dimensions.
  - [ ] T14.1.1.3: Design terminal color themes matching backend (Dark, Light, High-Contrast ANSI palettes).
- [ ] T14.1.2: Split Panes & Widgets:
  - [ ] T14.1.2.1: Implement Main Conversation Pane: formatted markdown rendering, code syntax highlighting, and message streaming.
  - [ ] T14.1.2.2: Implement Hardware & Telemetry Bar: compact live readouts of GPU %, VRAM, temp, active Ollama model.
  - [ ] T14.1.2.3: Implement Context & File Inspector Pane: listing active editable files, reference files, and token budget.
  - [ ] T14.1.2.4: Implement Streaming Log & Process Output Drawer: toggleable split view showing test runs, git output, and tool logs.
- [ ] T14.1.3: Keyboard Navigation & Searchable Command Palette:
  - [ ] T14.1.3.1: Implement fuzzy searchable command palette (`Ctrl+P` or `/`) with autocomplete.
  - [ ] T14.1.3.2: Implement keyboard shortcuts (`Ctrl+C` cancel, `Ctrl+L` clear, `Ctrl+T` toggle pane, `Tab` cycle focus).
  - [ ] T14.1.3.3: Write automated tests verifying TUI rendering, keybinding dispatch, and screen buffer management.

### T14.2: Steerable Generation & Prompt Queue (`spec:SteerableGenerationAndQueue`)
- [ ] T14.2.1: Mid-Stream Execution Interruption:
  - [ ] T14.2.1.1: Implement `AbortController` propagation across inference providers, cancelling in-flight HTTP requests and model generation instantly.
  - [ ] T14.2.1.2: Clean up partial workspace modifications upon mid-stream interruption via pre-edit checkpoints.
  - [ ] T14.2.1.3: Broadcast interruption events over IPC and SSE to notify connected UIs.
- [ ] T14.2.2: Live Prompt Queue & Follow-Up Injection:
  - [ ] T14.2.2.1: Implement `LivePromptQueue` allowing users to type and submit instructions while the model is actively streaming.
  - [ ] T14.2.2.2: Queue follow-up prompts into session sequence, automatically executing next prompt upon completion of current turn.
  - [ ] T14.2.2.3: Implement mid-stream steering: allow user to inject guidance annotations that append to the current generation context.
  - [ ] T14.2.2.4: Write unit tests verifying prompt queue sequencing, stream cancellation, and state recovery.

### T14.3: Custom Markdown Commands (`spec:CustomMarkdownCommands`)
- [ ] T14.3.1: Template Format & Discovery:
  - [ ] T14.3.1.1: Define Markdown command specification in `.cacophony/commands/*.md` and user home `~/.cacophony/commands/*.md`.
  - [ ] T14.3.1.2: Implement YAML frontmatter parsing for command metadata (name, description, arguments, role, temperature, focus files).
  - [ ] T14.3.1.3: Implement variable placeholder interpolation (`$ARG1`, `$ARG2`, `$SELECTION`, `$FILES`, `$TEST_OUTPUT`).
- [ ] T14.3.2: Built-in Command Library:
  - [ ] T14.3.2.1: Create `/refactor`: structured code refactoring with focus file targeting.
  - [ ] T14.3.2.2: Create `/test`: generate unit tests for selected file adhering to testing framework conventions.
  - [ ] T14.3.2.3: Create `/review`: perform in-depth code review against SOLID principles and strict typing.
  - [ ] T14.3.2.4: Create `/explain`: explain complex algorithms or architecture with mermaid diagrams.
  - [ ] T14.3.2.5: Create `/doc`: generate comprehensive API documentation and comments.
- [ ] T14.3.3: Execution & Discovery Engine:
  - [ ] T14.3.3.1: Implement `CustomCommandRegistry` scanning and registering commands on startup and file change.
  - [ ] T14.3.3.2: Expose custom commands in CLI autocomplete, TUI command palette, and Angular web UI.
  - [ ] T14.3.3.3: Write unit tests verifying template interpolation, argument validation, and command discovery.

### T14.4: Flexible Execution Modes (`spec:FlexibleExecutionModes`)
- [ ] T14.4.1: Non-Interactive CLI Mode (Headless Batch):
  - [ ] T14.4.1.1: Implement CLI flag `--non-interactive` / `-b` for headless CI/CD and automation scripts (`cacophony -b "fix linter errors in src/"`).
  - [ ] T14.4.1.2: Implement structured JSON output mode (`--json`) emitting machine-readable results, diffs, and exit codes.
  - [ ] T14.4.1.3: Implement return codes (0: success, 1: test failure, 2: syntax error, 3: timeout/hardware thermal).
- [ ] T14.4.2: Interactive Execution Safety Modes:
  - [ ] T14.4.2.1: Implement `Plan Mode`: generates and presents implementation plan for user review without modifying disk.
  - [ ] T14.4.2.2: Implement `Build Mode`: applies changes to disk and runs tests, requiring manual approval before git commits or PRs.
  - [ ] T14.4.2.3: Implement `Auto Mode`: fully autonomous execution (plan -> code -> scrub -> test -> commit/PR) with safety guardrails.
  - [ ] T14.4.2.4: Implement mode switching via `/mode <plan|build|auto>` at runtime.
  - [ ] T14.4.2.5: Write unit tests verifying mode enforcement and execution barriers.

### T14.5: Headless Server Protocol & Extension Hooks (`spec:HeadlessServerProtocol`)
- [ ] T14.5.1: JSON-RPC & WebSocket Protocol Layer:
  - [ ] T14.5.1.1: Define JSON-RPC 2.0 protocol specifications for remote engine control over WebSocket and Unix Domain Sockets.
  - [ ] T14.5.1.2: Implement bidirectional RPC methods: `session/create`, `session/prompt`, `session/interrupt`, `context/addFile`, `repo/getMap`, `engine/status`.
  - [ ] T14.5.1.3: Implement streaming notification events: `stream/token`, `task/stageChange`, `telemetry/update`, `test/output`.
- [ ] T14.5.2: Editor & Extension Hooks:
  - [ ] T14.5.2.1: Create VS Code / Cursor extension protocol adapter enabling external IDEs to drive the Cacophony engine.
  - [ ] T14.5.2.2: Implement file change synchronization hooks (syncing external editor unsaved buffer edits with engine context).
  - [ ] T14.5.2.3: Implement authentication token verification for remote headless connections.
  - [ ] T14.5.2.4: Write unit tests verifying protocol serialization, message dispatch, and socket connection lifecycle.

---

## Phase 15: Modern Angular UI Enhancements for New Features
*Requirements: Adhere strictly to `docs/SKILL.md` (Angular v20+ Standalone, Zoneless `provideZonelessChangeDetection()`, Signals `signal()`, `computed()`, `effect()`, `input()`, `output()`, `model()`, `@defer` incremental hydration, Mobile-First CSS Custom Properties)*

### T15.1: Multi-Tab Session & Conversation Inspector (`spec:PersistentSessionStorage`)
- [ ] T15.1.1: Create `SessionTabsComponent` (standalone):
  - [ ] T15.1.1.1: Use Angular Signals (`signal<SessionTab[]>`, `model<string>`) to manage active and background tabs.
  - [ ] T15.1.1.2: Support tab creation, close, rename, and branch switching with zero `zone.js` dependencies.
  - [ ] T15.1.1.3: Mobile-first responsive scrollable tab bar with touch swipe gestures.
- [ ] T15.1.2: Create `ConversationTimelineComponent` (standalone):
  - [ ] T15.1.2.1: Signal-based message stream rendering with computed token counter and cost tracker.
  - [ ] T15.1.2.2: Render formatted markdown, syntax-highlighted code diffs, and tool invocation accordions.
  - [ ] T15.1.2.3: Implement `@defer (on viewport)` for historical message virtualization and lazy rendering.
- [ ] T15.1.3: Create `SessionSearchModalComponent` (standalone):
  - [ ] T15.1.3.1: Full-text search input with `computed()` filtered results across archived and active sessions.
  - [ ] T15.1.3.2: Keyboard navigation (`Escape` close, arrows navigate, `Enter` select session).

### T15.2: Interactive Repository Map & Context Selector (`spec:RepositoryStructureMapping`, `spec:GranularMultiFileContext`)
- [ ] T15.2.1: Create `RepoMapViewerComponent` (standalone):
  - [ ] T15.2.1.1: SVG/Canvas dependency graph visualizer showing symbol centrality and architectural clusters.
  - [ ] T15.2.1.2: Zoom, pan, and node focus using fine-grained Signals state.
  - [ ] T15.2.1.3: Lazy-load graph engine via `@defer (hydrate on interaction)`.
- [ ] T15.2.2: Create `ContextTaggingBarComponent` (standalone):
  - [ ] T15.2.2.1: Visual chip list of currently tagged files (`EDITABLE` vs `READ_ONLY`) with token count badges.
  - [ ] T15.2.2.2: Quick `/add` and `/drop` search dropdown with autocomplete.
  - [ ] T15.2.2.3: Visual warning indicator when context exceeds recommended token budget.

### T15.3: Steerable Generation & Prompt Queue Controller (`spec:SteerableGenerationAndQueue`)
- [ ] T15.3.1: Create `PromptInputBarComponent` (standalone):
  - [ ] T15.3.1.1: Multi-line autogrowing textarea with signal-based character and token estimation.
  - [ ] T15.3.1.2: Interrupt / Cancel button (`signal<boolean>` reflecting streaming state) sending immediate abort signal.
  - [ ] T15.3.1.3: Custom Markdown command autocomplete menu (`/` trigger displaying registered commands).
- [ ] T15.3.2: Create `QueuedPromptsDrawerComponent` (standalone):
  - [ ] T15.3.2.1: Drag-and-drop or reorderable list of pending follow-up prompts queued during active streaming.
  - [ ] T15.3.2.2: Edit, delete, or promote queued prompts using Signal actions.

### T15.4: LSP Diagnostics & Automated Test Loop Panel (`spec:LanguageServerProtocolIntegration`, `spec:AutomatedTestLoopIntegration`)
- [ ] T15.4.1: Create `LspDiagnosticsWidgetComponent` (standalone):
  - [ ] T15.4.1.1: Live list of workspace compiler diagnostics grouped by file and severity (Error, Warning, Info).
  - [ ] T15.4.1.2: Click-to-focus on diagnostic location, showing compiler code and documentation link.
  - [ ] T15.4.1.3: Real-time update via SSE diagnostic event stream.
- [ ] T15.4.2: Create `TestLoopInspectorComponent` (standalone):
  - [ ] T15.4.2.1: Visual indicator of post-edit test execution status (Running, Passed, Failed, Retrying).
  - [ ] T15.4.2.2: Formatted stack trace viewer with collapsible frames and failing assertion diffs.
  - [ ] T15.4.2.3: Manual trigger button to re-run scoped or global test suites.

### T15.5: Execution Mode & Checkpoint Controller (`spec:FlexibleExecutionModes`, `spec:AutomatedGitCheckpoints`, `spec:GitUndoRedoCommands`)
- [ ] T15.5.1: Create `ExecutionModeSelectorComponent` (standalone):
  - [ ] T15.5.1.1: Mode toggle switch (`Plan`, `Build`, `Auto`) with badge descriptions.
  - [ ] T15.5.1.2: Mobile-first responsive segmented control with high-contrast accessibility styling.
- [ ] T15.5.2: Create `CheckpointTimelineComponent` (standalone):
  - [ ] T15.5.2.1: Visual timeline of micro-checkpoints and shadow commits.
  - [ ] T15.5.2.2: One-click `Undo` and `Redo` action buttons with confirmation modals.
  - [ ] T15.5.2.3: Inline diff preview modal showing checkpoint changes against previous state.
- [ ] T15.5.3: Unit & Component Testing:
  - [ ] T15.5.3.1: Write component unit tests for all new standalone components verifying Signals reactivity, zoneless change detection, and theme custom property styling.

---

## Phase 16: Verification, Integration & System Auditing
- [ ] T16.1: End-to-End Testing of New Subsystems:
  - [ ] T16.1.1: Verify LSP client startup, diagnostic publishing, and error injection on real TypeScript and Java workspaces.
  - [ ] T16.1.2: Verify multi-provider inference with Ollama, LM Studio, and frontier fallback routing.
  - [ ] T16.1.3: Verify tree-sitter repository map generation and PageRank ranking across multi-file repositories.
  - [ ] T16.1.4: Verify automated test loop and closed-loop error remediation with failing unit tests.
  - [ ] T16.1.5: Verify git checkpoints, `/undo`, and `/redo` commands in isolated worktrees.
  - [ ] T16.1.6: Verify TUI rendering, prompt queueing, and mid-stream interrupt in terminal sessions.
- [ ] T16.2: System Architecture Audit & Resource Benchmark:
  - [ ] T16.2.1: Audit memory and VRAM footprints during combined LSP, Tree-Sitter, and Ollama operations on Vega APU.
  - [ ] T16.2.2: Ensure all external calls and sensitive tokens are strictly managed in `.env` and `SecretVault`.
  - [ ] T16.2.3: Validate zero emojis policy and strict typing across all new modules.
- [ ] T16.3: Update Documentation & Runbooks:
  - [ ] T16.3.1: Document new CLI commands, TUI shortcuts, and custom markdown template authoring in `docs/operations_manual.md`.
  - [ ] T16.3.2: Update API and JSON-RPC protocol specifications in `docs/api_spec.md`.
