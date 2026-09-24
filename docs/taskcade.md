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

*See [`docs/taskcade-history.md`](file:///home/nexen/projects/cacophony/docs/taskcade-history.md) for archived Phases 1 through 28.*

---

## Phase 29: Gitea Deep API Integration, Least-Privilege Permission Guardrails & Automated PR Engine
*RDF Category: `spec:GiteaDeepIntegrationCategory`*

### T29.1: Scoped API Token Abstraction & Role-Gated Permission Guardrails (`spec:GiteaPermissionGuardrails`)
- [ ] T29.1.1: Granular Gitea Scope Matrix Implementation:
  - [ ] T29.1.1.1: Define typed `GiteaScope` enumeration and token permission schema in `@cacophony/shared-types` matching official Gitea OAuth/API scopes: `activitypub`, `admin`, `issue`, `misc`, `notification`, `organization`, `package`, `repository`, `user` with access levels (`none`, `read`, `write`).
  - [ ] T29.1.1.2: Implement `GiteaPermissionGuard` in `@cacophony/engine`: Validates token scopes prior to executing any API call, rejecting unauthorized operations before network transmission.
  - [ ] T29.1.1.3: Enforce Subsystem Permission Segregation:
    - Public / Web Dashboard Inspector: strictly restricted to `repository:read`, `user:read`, `issue:read`.
    - Reviewer & QA Agent: restricted to `repository:read`, `issue:read`, `package:read`.
    - Autonomous Implementer Agent: restricted to `repository:read`, `repository:write` (restricted to feature/fix branches), `issue:read_write`.
    - Bootstrapper / Setup Script: isolated admin access (`admin:write`), never exposed to LLM context windows or agent runtimes.
  - [ ] T29.1.1.4: Implement scope assertion middleware in `GiteaApiClient` preventing accidental privilege escalation.

### T29.2: Autonomous Issue Ingestion & Dynamic Branch/PR Engine (`spec:GiteaIssueAndPrEngine`)
- [ ] T29.2.1: Autonomous Issue Ingestion:
  - [ ] T29.2.1.1: Implement `listIssues(owner, repo, filter)` and `getIssue(owner, repo, issueNumber)` in `GiteaApiClient`.
  - [ ] T29.2.1.2: Implement `GiteaIssueIngestionWorker`: Periodically or on-demand fetches assigned issues labeled `cacophony` or `auto-fix`, converting them into structured arena tasks.
  - [ ] T29.2.1.3: Update issue state and post automated status comments (`POST /repos/{owner}/{repo}/issues/{index}/comments`) informing users of task start, test runs, and completion.
- [ ] T29.2.2: Dynamic Branching & Protected Branch Guardrails:
  - [ ] T29.2.2.1: Enforce branch creation naming convention (`feat/issue-{num}-{slug}` or `fix/issue-{num}-{slug}`) via `POST /repos/{owner}/{repo}/branches`.
  - [ ] T29.2.2.2: Implement `ProtectedBranchGuard`: Hard blocks direct commits or pushes to default/protected branches (`main`, `master`, `release/*`).
- [ ] T29.2.3: Automated Pull Request & Review Generation:
  - [ ] T29.2.3.1: Implement automated PR creation via `createPullRequest(owner, repo, req)` with structured Markdown summaries, test run outputs, and list of modified symbols.
  - [ ] T29.2.3.2: Implement automated PR code review submission via `submitPullRequestReview(owner, repo, prNumber, review)` with line-level comments and verdicts (`APPROVED`, `REQUEST_CHANGES`).

### T29.3: Real-Time Webhook Event Dispatching & HMAC Validation (`spec:GiteaWebhookDispatcher`)
- [ ] T29.3.1: Enhanced Webhook Dispatcher:
  - [ ] T29.3.1.1: Expand `GiteaWebhookReceiver` to support events: `issue_comment` (e.g. `/cacophony run`, `/cacophony retry`), `pull_request` (open, synchronize, review_requested), `push`.
  - [ ] T29.3.1.2: Implement constant-time cryptographic HMAC-SHA256 signature verification with configurable webhook secret in `.env`.
  - [ ] T29.3.1.3: Route incoming webhook actions directly to `SingleConcurrencyScheduler` without polling overhead.

### T29.4: Package & Artifact Provenance Integration (`spec:GiteaPackageRegistry`)
- [ ] T29.4.1: Artifact & Build Provenance:
  - [ ] T29.4.1.1: Implement `GiteaPackageClient` in `@cacophony/engine` interfacing with Gitea Package Registry (Generic/npm packages).
  - [ ] T29.4.1.2: Publish reproducible build artifacts and test report bundles with cryptographic SHA256 checksums to Gitea package storage.
  - [ ] T29.4.1.3: Link published package metadata directly into generated Pull Request bodies for full end-to-end traceability.

### T29.5: Automated Verification & Unit Test Suite (`spec:GiteaIntegrationVerification`)
- [ ] T29.5.1: Unit & Integration Tests:
  - [ ] T29.5.1.1: Write unit tests verifying `GiteaPermissionGuard` role-scope boundary enforcement and rejection of unpermitted operations.
  - [ ] T29.5.1.2: Write unit tests for `GiteaApiClient` testing issue querying, commenting, PR generation, and branch protection.
  - [ ] T29.5.1.3: Write integration tests for `GiteaWebhookReceiver` verifying signature validation, issue comment commands, and PR synchronization.
  - [ ] T29.5.1.4: Run full monorepo test suite (`npm test`) asserting 100% pass rate.

