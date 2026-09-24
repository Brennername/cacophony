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

## Active Milestone Era: Gitea Deep API Integration, Dynamic Branching, Least-Privilege Guardrails & Webhook Orchestration

*See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 36.*

---

## Phase 37: Multi-Stack Profile Verifiers, AST Inversion Repair & Scrubber Catalog
*RDF Category: *

### T37.1: TypeScript AST Parameter Inversion & Signature Scrubber
  - [ ] T37.1.1: Implement AstParameterCorrectionRules in packages/engine/src/rules/catalog/ using TypeScript AST parser to detect transposed arguments.
  - [ ] T37.1.2: Implement deterministic repair rule verifying parameter name matching between call-site expressions and function declarations.
  - [ ] T37.1.3: Add unit tests verifying inverted function arguments (e.g. fn(b, a) when definition is fn(a, b)) are automatically corrected.
  - [ ] T37.1.4: Register AstParameterCorrectionRules in RulePipelineEngine standard post_generation hook.

### T37.2: Go Struct Signature Harvester & Cross-Language AST Parser
  - [ ] T37.2.1: Implement GoSignatureHarvester in packages/engine/src/signature/ extracting struct definitions, interface methods, and package comments from .go files.
  - [ ] T37.2.2: Add go test command scoping and test assertion extraction in QueueGroomer for Go projects.
  - [ ] T37.2.3: Implement Go AST scrubber stripping forbidden emojis and enforcing gofmt-compliant tab indentation in generated Go source.
  - [ ] T37.2.4: Write unit tests verifying Go struct signature extraction and verification against mock go.mod projects.

### T37.3: Rust Struct & Trait Signature Harvester
  - [ ] T37.3.1: Implement RustSignatureHarvester in packages/engine/src/signature/ parsing pub struct, pub trait, and pub fn definitions from Cargo projects.
  - [ ] T37.3.2: Add cargo test scoping in QueueGroomer detecting workspace member crates and applying -p <crate> flags.
  - [ ] T37.3.3: Implement Rust syntax scrubber stripping markdown fences, unescaped raw string literals, and emoji comments.
  - [ ] T37.3.4: Write unit tests verifying Cargo workspace package detection and scoped test command resolution.


---

## Phase 38: Automated Test Runner Guardrails, Process Sandboxing & Failure Taxonomy
*RDF Category: *

### T38.1: Sandboxed Subprocess Execution with Memory & Timeout Bounds
  - [ ] T38.1.1: Implement SandboxedProcessRunner in packages/engine/src/testing/ executing test commands via child_process.spawn with strict timeout and maxBuffer.
  - [ ] T38.1.2: Enforce process group termination: kill all child spawned subprocesses on timeout to prevent zombie compiler/test processes.
  - [ ] T38.1.3: Capture stdout and stderr streams in real-time, enforcing maximum log output size limit (default 256KB) to avoid memory bloating.
  - [ ] T38.1.4: Persist structured test results (exitCode, durationMs, stdoutSnippet, stderrSnippet) into task_stages table.

### T38.2: Failure Cause Classifier & Automated Root-Cause Taxonomy
  - [ ] T38.2.1: Implement FailureClassifier in packages/engine/src/analytics/ categorizing test failures into taxonomy buckets: SYNTAX_ERROR, TYPE_MISMATCH, ASSERTION_FAILURE, TIMEOUT, MISSING_DEPENDENCY.
  - [ ] T38.2.2: Extract specific failure line numbers and error messages from stack traces (Jest, Vitest, cargo test, go test, mvn test).
  - [ ] T38.2.3: Expose REST endpoint GET /api/analytics/failures returning historical failure cause distributions across models and roles.
  - [ ] T38.2.4: Feed classified failure context into ClosedLoopTestRemediator prompt for targeted one-shot error repair.


---

## Phase 39: Closed-Loop Gitea PR Automation, GitOps & Micro-Checkpoints
*RDF Category: *

### T39.1: Autonomous Git Worktree Allocation & Ephemeral Branch Isolation
  - [ ] T39.1.1: Implement GitWorktreeManager in packages/engine/src/git/ creating isolated git worktrees per task under workspaces/worktree-<taskId>.
  - [ ] T39.1.2: Enforce branch naming convention: task/<priority>-<taskId>-<slug> branching off targetBranch (default main).
  - [ ] T39.1.3: Implement automated cleanup: prune worktree directories and branches when task reaches terminal state (COMPLETED or FAILED after retries).
  - [ ] T39.1.4: Write unit tests verifying clean git worktree creation, commit isolation, and worktree removal.

### T39.2: Gitea Automated PR Creation & Inline Review Remediation Loop
  - [ ] T39.2.1: Implement AutomatedPrPublisher in packages/engine/src/gitea/ pushing branch to Gitea and creating Pull Request with structured task summary.
  - [ ] T39.2.2: Implement GiteaWebhookDispatcher handling pull_request and pull_request_review webhooks on port 24161.
  - [ ] T39.2.3: When PR review request changes is received, automatically dispatch remediation task targeting the existing PR branch.
  - [ ] T39.2.4: When PR review is APPROVED, trigger automated squash-and-merge via Gitea API and mark task COMPLETED.


---

## Phase 40: Mobile-First UI Density, Multi-Theme Palettes & Interactive Drill-Downs
*RDF Category: *

### T40.1: Deep Multi-Level Drill-Down Views for Tasks, History & Telemetry
  - [ ] T40.1.1: Enhance TaskDetailModalComponent with tabbed sub-views: Overview, Stages & Timings, Code Diffs, Full Stream Log, Test Stderr.
  - [ ] T40.1.2: Add copy-to-clipboard actions for prompt, diff, test command, and terminal logs.
  - [ ] T40.1.3: Implement direct task URL routing (/tasks/:id) so any task or history item can be directly bookmarked and shared.
  - [ ] T40.1.4: Ensure all modal dialogs and drill-down panels have touch-friendly close buttons and escape key listeners complying with mobile-first standards.

### T40.2: Curated Color Theme Palettes & Dynamic Dark/Light Mode
  - [ ] T40.2.1: Add theme definitions in packages/frontend/src/styles.css for OLED Dark, Nord, Cyberpunk Charcoal, and Minimalist Light.
  - [ ] T40.2.2: Update ThemeService to store active theme in localStorage and toggle between dark, light, and high-contrast modes.
  - [ ] T40.2.3: Verify contrast ratios meet WCAG AA standards (> 4.5:1 for body text, > 3:1 for badges and gauges) across all themes.
  - [ ] T40.2.4: Add visual theme selector in top navigation bar and Settings page.


---

## Phase 41: Database Engine Portability, Auto-Vacuuming & Storage Optimization
*RDF Category: *

### T41.1: PGlite WAL Compaction & Automated Vacuum Daemon
  - [ ] T41.1.1: Implement DatabaseMaintenanceService in packages/db/ running periodic VACUUM ANALYZE and checkpoint compaction.
  - [ ] T41.1.2: Add storage size monitoring: track PGlite directory size in data/cacophony_pglite and emit warning if size exceeds threshold.
  - [ ] T41.1.3: Implement telemetry table partitioning: split telemetry_snapshots by week or archive older snapshots to parquet/json files.
  - [ ] T41.1.4: Write integration test verifying database compaction does not lock active task transactions.

### T41.2: Multi-Driver Compatibility Verification (PostgreSQL, SQLite, MariaDB)
  - [ ] T41.2.1: Verify DDL migrations on external PostgreSQL 16+ instance using pg connection string.
  - [ ] T41.2.2: Verify SQLite fallback driver in node:sqlite experimental mode for zero-dependency local runs.
  - [ ] T41.2.3: Document DB_DRIVER and DB_CONNECTION_STRING configuration options in conf/cacophony.example.json.
  - [ ] T41.2.4: Write cross-driver repository test asserting identical CRUD behavior across PGlite and SQLite drivers.


---

## Phase 42: AST Dependency Slicing & Context Token Minimizer
*RDF Category: *

### T42.1: AST Slicing & Focused Import Skeleton Generator
  - [ ] T42.1.1: Implement AstContextSlicer in packages/engine/src/context/ parsing referenced imports and extracting only utilized function/type signatures.
  - [ ] T42.1.2: Replace full file content of secondary dependencies with compact type skeletons in ContextMinimizer.
  - [ ] T42.1.3: Benchmark token reduction: assert at least 40% reduction in prompt token size on multi-file refactoring tasks.
  - [ ] T42.1.4: Write unit tests verifying generated import skeletons preserve type fidelity without breaking compiler verification.


---

## Phase 43: Frontier Fallback Router, Circuit Breaker & Quota Tracking
*RDF Category: *

### T43.1: Frontier Fallback Router with Provider Circuit Breakers
  - [ ] T43.1.1: Implement CircuitBreaker in packages/engine/src/inference/ tracking 429 rate-limits and 5xx errors per external provider (OpenAI, Anthropic, Gemini).
  - [ ] T43.1.2: Automatically fall back to secondary provider or high-reasoning local model (deepseek-r1:8b) when circuit opens.
  - [ ] T43.1.3: Implement TokenQuotaTracker recording daily and monthly token consumption and estimated dollar cost per provider.
  - [ ] T43.1.4: Expose GET /api/config/quotas endpoint returning remaining token budget and circuit breaker health statuses.
