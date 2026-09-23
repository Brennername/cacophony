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

## Active Taskcade: Phase 15 & 16 Execution
*See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 14.*

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
