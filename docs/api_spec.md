# Cacophony API & JSON-RPC 2.0 Protocol Specification

This document specifies the REST, Server-Sent Events (SSE), and JSON-RPC 2.0 interface contracts for Cacophony.

---

## 1. REST Endpoints

### GET `/api/status`

Returns high-level daemon and arena operational health.

**Response:** `200 OK`

```json
{
  "arena": "ONLINE",
  "schedulerPaused": false,
  "pendingTasksCount": 0,
  "timestamp": "2026-09-23T22:00:00.000Z"
}
```

### GET `/api/tasks`

Lists all pending, active, and completed tasks.

**Query Parameters:**

- `status` (optional): Filter by task status (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `REMEDIATED`).

**Response:** `200 OK`

```json
[
  {
    "id": "task-101",
    "title": "Implement AST inspection validator",
    "status": "RUNNING",
    "priority": "P0",
    "role": "implementer"
  }
]
```

### POST `/api/tasks`

Enqueues a new autonomous unit of work.

**Request Body:**

```json
{
  "title": "Refactor SessionManager",
  "prompt": "Refactor SessionManager adhering to SOLID principles",
  "role": "implementer",
  "priority": "P0",
  "focusFiles": ["packages/engine/src/inference/SessionManager.ts"],
  "testCommand": "npm test --workspace=@cacophony/engine",
  "metadataHints": {
    "modelAffinity": "qwen2.5-coder:14b",
    "temperature": 0.1,
    "maxTokens": 4096,
    "timeoutMs": 600000,
    "ruleBypassFlags": ["emoji_scrubber"]
  }
}
```


**Response:** `201 Created`

```json
{
  "id": "task-102",
  "status": "PENDING",
  "message": "Task enqueued successfully"
}
```

### GET `/api/tasks/:id`

Retrieves detailed status, logs, diffs, and execution steps for a specific task.

### DELETE `/api/tasks/:id`

Cancels or removes an enqueued task from the active queue.

### DELETE `/api/tasks`

Purges pending tasks from the active queue. Supports an optional `?pattern=` query parameter to filter by task ID or title substring.

**Query Parameters:**

- `pattern` (optional): Filter substring to purge only matching pending tasks.

**Response:** `200 OK`

```json
{
  "success": true,
  "deletedCount": 584
}
```

### GET `/api/tasks/:id/gantt`

Returns stage durations and timeline spans for Gantt transport visualization.

### GET `/api/tasks/:id/opinion`

Returns distilled cognitive opinion, key decisions, identified risks, and reasoning metrics extracted from the task's generation stage transcript.

**Response:** `200 OK`

```json
{
  "taskId": "task-101",
  "hasReasoning": true,
  "reasoningTranscript": "Analyzed compiler diagnostics and determined missing import...",
  "thinkingDurationMs": 4200,
  "opinion": {
    "summary": "Extracted reasoning transcript and architectural plan.",
    "keyDecisions": ["Use linear string index scanning instead of regex"],
    "identifiedRisks": ["Non-linear regex backtracking"],
    "confidenceScore": 0.95
  }
}
```

### GET `/api/tasks/:id/pr-review`

Returns structured automated PR review verdict, SOLID compliance score, and automated reviewer comments for the task.

**Response:** `200 OK`

```json
{
  "taskId": "task-101",
  "prUrl": "http://localhost:19634/NeXeN/cacophony/pulls/12",
  "targetBranch": "main",
  "verdict": "APPROVED",
  "solidComplianceScore": 98,
  "reviewNotes": "All verification gates passed.",
  "comments": [
    {
      "path": "packages/engine/src/service.ts",
      "lineNumber": 1,
      "comment": "Adherence to architectural guidelines validated.",
      "severity": "info"
    }
  ],
  "merged": true
}
```

### POST `/api/tasks/:id/retry`

Immediately retries and requeues a failed or pending task into the active execution queue, bypassing retry count quarantines (`force=true`).

**Response:** `200 OK`

```json
{
  "success": true,
  "taskId": "task-101",
  "requeued": true,
  "requeuedCount": 1
}
```

### GET `/api/tasks/:id/diagnostics`

Retrieves detailed failure post-mortem diagnostics from `.cacophony/diagnostics/<id>.json` or synthesized stage telemetry, including pre-scrubbed LLM generation, scrubber unified diffs, and test runner stderr.

**Response:** `200 OK`

```json
{
  "taskId": "task-101",
  "foundOnDisk": true,
  "loggedAt": "2026-10-14T05:00:00.000Z",
  "model": "qwen2.5-coder:7b",
  "testCommand": "npm test",
  "exitCode": 1,
  "stderr": "FAIL packages/engine/test.ts",
  "stdout": "",
  "preScrubbedOutput": "export class Foo {}",
  "scrubberDiff": "--- original\n+++ scrubbed",
  "failureReason": "Test assertion failure in test_execution stage",
  "stages": []
}
```

### POST `/api/tasks/decompose-spec`

Ingests specification documents (`docs/spec.md`, `README.md`, OpenAPI JSON) and autonomously derives topological task sequences.

### POST `/api/tasks/requeue`

Retries failed tasks with a three-failure quarantine safeguard (`force=true` bypasses).

**Query Parameters:**
- `pattern` (optional string): Filter tasks to requeue by title or ID prefix.
- `force` (optional boolean, default `false`): When `true`, overrides the 3-failure quarantine and requeues all matching failed tasks.

**Response:** `200 OK`

```json
{
  "success": true,
  "requeuedCount": 4,
  "maxAutomaticFailures": 3,
  "force": false
}
```

### POST `/api/tasks/seed`

Ingests uncompleted tasks from `docs/taskcade.md` into the active queue via `TaskcadeSeedLoader`.

**Query Parameters:**
- `limit` (optional integer, default `400`): Maximum count of uncompleted tasks to parse and ingest.
- `phase` (optional string): Restrict ingestion to tasks within a specific phase identifier (e.g. `T100`).

**Response:** `200 OK`

```json
{
  "success": true,
  "totalParsed": 128,
  "seededCount": 12
}
```

### POST `/api/tasks/reclaim`

Reclaims stale running tasks back to `PENDING` state when worker execution exceeds the inactivity threshold.

**Query Parameters:**
- `timeoutMinutes` (optional integer, default `15`): Inactivity cutoff window in minutes for considering a `RUNNING` task orphaned.

**Response:** `200 OK`

```json
{
  "success": true,
  "reclaimedCount": 2
}
```

### POST `/api/tasks/groom`

Grooms the task queue by reconciling active and pending task records against merged Gitea pull requests and completed tasks archived in `docs/taskcade.md` / `docs/taskcade-history.md`. Normalizes heavy model allocations to lightweight instruct variants and deduplicates pending tasks with redundant task codes.

**Response:** `200 OK`

```json
{
  "success": true,
  "reconciledPrCount": 3,
  "normalizedModelCount": 1,
  "deduplicatedCount": 2,
  "pendingRemaining": 15
}
```

### POST `/api/tasks/:id/rehabilitate`

Executes deterministic task rehabilitation and subtask decomposition for failed tasks that exceeded retry thresholds. Uses git bisect regression isolation, prompt scoping, or subtask breakdown without throwing duplicate key errors.

**Response:** `200 OK`

```json
{
  "rehabilitated": true,
  "action": "DECOMPOSED",
  "reason": "TypeScript compilation diagnostic error TS2305",
  "subtasks": [
    {
      "id": "taskcade-t65.6.3.1",
      "title": "Subtask 1: Define missing symbol exports",
      "priority": "P0"
    }
  ]
}
```

### GET `/api/analytics/window-success`

Evaluates dynamic rolling window success rates, Discrete velocity, acceleration derivatives, and plateau convergence metrics across arbitrary window sizes (10, 20, 50, 100, 1000).

### GET `/api/analytics/commit-impact`

Evaluates statistical and empirical impact of recent git commits on task execution win rates, identifying regression spikes and isolating problematic changes.

**Query Parameters:**

- `commitHash` (optional): Git SHA to evaluate specific commit impact.
- `limit` (optional): Number of recent commit impact reports to return (default: 15).

**Response:** `200 OK`

```json
[
  {
    "commitHash": "a1b2c3d",
    "tasksBefore": 20,
    "tasksAfter": 20,
    "winRateBefore": 85.0,
    "winRateAfter": 65.0,
    "winRateDelta": -20.0,
    "classification": "REGRESSION"
  }
]
```

### GET `/api/bandit/arms`

Retrieves multi-armed bandit model arms with exploration distributions, empirical rewards, and selected arm counts.

### GET & POST `/api/bandit/policy`

Reads or updates the active multi-armed bandit exploration policy (`thompson_sampling`, `ucb1`, `epsilon_greedy`).

### GET `/api/arena/epochs`

Lists all arena epochs and active degradation reset states.

### POST `/api/arena/epoch` & POST `/api/models/epoch`

Advances arena epoch and performs clean-slate model degradation reset, un-ejecting evicted models and snapshotting the previous epoch to history.

**Request Body (Optional)**:

```json
{
  "name": "Epoch 2",
  "reason": "Mitigate regression cascades and reset baseline",
  "notes": "All degraded models un-ejected to ACTIVE"
}
```

**Response**:

```json
{
  "success": true,
  "epoch": {
    "epochId": 2,
    "name": "Epoch 2",
    "reason": "Mitigate regression cascades and reset baseline",
    "notes": "All degraded models un-ejected to ACTIVE",
    "startedAt": "2026-10-14T03:19:15.000Z",
    "isActive": true
  }
}
```

### GET `/api/arena/epochs/:id/history`

Retrieves the snapshotted model health leaderboard and remediation telemetry history for a specific completed or historical epoch.

**Path Parameters:**
- `id` (integer): Unique epoch sequence identifier.

**Response:** `200 OK`

```json
[
  {
    "modelId": "qwen2.5-coder:7b",
    "provider": "ollama",
    "totalTasks": 28,
    "totalSuccess": 25,
    "totalFailures": 3,
    "consecutiveFailures": 0,
    "avgLatencyMs": 4200,
    "avgTokensPerSec": 28.5,
    "status": "ACTIVE",
    "totalRemediationAttempts": 5,
    "totalRemediationSuccess": 4
  }
]
```

### POST `/api/models/reset-stats`

Resets model health metrics and failure tallies to baseline across all registered models.

**Response**:

```json
{
  "success": true,
  "message": "All model health metrics reset to clean baseline."
}
```

### GET `/api/models/installed`

Lists all installed Ollama models annotated with their tenancy protection status, disk footprint, quantization, and parameter size.

**Response:** `200 OK`

```json
[
  {
    "name": "qwen2.5-coder:7b-instruct-q4_K_M",
    "size": 4680000000,
    "parameterSize": "7B",
    "quantizationLevel": "Q4_K_M",
    "modifiedAt": "2026-10-14T10:00:00.000Z",
    "isProtected": true
  }
]
```

### POST `/api/models/pull`

Triggers an asynchronous download of a model via Ollama. Broadcasts incremental download progress events (`model_pull_progress`) across open Server-Sent Events (SSE) connections. Validates disk headroom against tenancy quotas before commencing download.

**Request Body:**

```json
{
  "model": "qwen2.5-coder:3b"
}
```

**Response:** `202 Accepted`

```json
{
  "status": "pulling",
  "model": "qwen2.5-coder:3b"
}
```

### POST `/api/models/preload`

Speculatively pre-loads model weights into GPU VRAM (T87.1.3). Can be invoked programmatically or by background coordinators to eliminate cold-start inference latencies.

**Request Body:**

```json
{
  "model": "deepseek-r1:8b",
  "keep_alive": "10m"
}
```

**Response:** `200 OK`

```json
{
  "status": "ok",
  "model": "deepseek-r1:8b",
  "message": "Model preload initiated successfully"
}
```

**Error Responses:**
- `400 Bad Request`: `{ "error": "Missing or invalid 'model' parameter" }`
- `500 Internal Server Error`: `{ "error": "Failed to preload model" }`

### GET `/api/models/preload`

Queries current telemetry and cache hit/miss statistics for VRAM speculative prefetching.

**Response:** `200 OK`

```json
{
  "prefetchesInitiated": 12,
  "hits": 10,
  "misses": 2,
  "hitRatio": 0.83,
  "lastPrefetchedModel": "deepseek-r1:8b",
  "isPrefetchInProgress": false
}
```

### DELETE `/api/models/:modelId`


Evicts and uninstalls a model from disk via Ollama, marking its health profile status as `EJECTED`. Protected models matching the tenancy whitelist cannot be evicted and will return `403 Forbidden`.

**Response:** `200 OK`

```json
{
  "success": true,
  "modelId": "qwen2.5-coder:3b",
  "status": "EVICTED"
}
```

### GET `/api/models/config`

Retrieves active model tenancy management configurations.

**Response:** `200 OK`

```json
{
  "managedModelsEnabled": true,
  "protectedModels": [
    "deepseek-r1:8b-4k",
    "qwen2.5-coder:7b-instruct-q4_K_M"
  ],
  "maxDiskStorageGb": 50,
  "autoEvictionEnabled": true,
  "minimumSuccessRateThreshold": 0.4,
  "maxConsecutiveFailuresBeforeEviction": 3
}
```

### PUT `/api/models/config`

Updates model tenancy configuration parameters (storage quotas, whitelist, auto-eviction thresholds).

**Request Body:** Partial or complete `ModelManagementConfig` object.

**Response:** `200 OK`

```json
{
  "success": true,
  "config": {
    "managedModelsEnabled": true,
    "protectedModels": [
      "deepseek-r1:8b-4k",
      "qwen2.5-coder:7b-instruct-q4_K_M"
    ],
    "maxDiskStorageGb": 60,
    "autoEvictionEnabled": true,
    "minimumSuccessRateThreshold": 0.4,
    "maxConsecutiveFailuresBeforeEviction": 3
  }
}
```

### POST `/api/models/benchmark`

Executes an isolated baseline evaluation benchmark against a specific model to record tokens per second, prompt latency, and inference responsiveness.

**Request Body:**

```json
{
  "model": "qwen2.5-coder:7b-instruct-q4_K_M"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "model": "qwen2.5-coder:7b-instruct-q4_K_M",
  "tokensPerSecond": 42.5,
  "latencyMs": 120
}
```

### GET `/api/models/profiles`

Lists all model tuning and inference parameter profiles (sampling parameters, context window sizes, temperature, and penalty settings).

**Response:** `200 OK`

```json
[
  {
    "id": "qwen2.5-coder:7b",
    "modelName": "qwen2.5-coder:7b",
    "role": "implementer",
    "numPredict": 8192,
    "numCtx": 16384,
    "temperature": 0.1,
    "topK": 40,
    "topP": 0.9,
    "repeatPenalty": 1.1,
    "autoTuned": true,
    "isActive": true
  }
]
```

### PUT `/api/models/profiles/:id`

Upserts an inference configuration and tuning profile for a specific model ID and role.

**Path Parameters:**
- `id` (string): Model profile identifier.

**Request Body:**

```json
{
  "modelName": "qwen2.5-coder:7b",
  "role": "implementer",
  "numPredict": 8192,
  "numCtx": 16384,
  "temperature": 0.1,
  "topK": 40,
  "topP": 0.9,
  "repeatPenalty": 1.1,
  "autoTuned": false,
  "isActive": true
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "profile": {
    "id": "qwen2.5-coder:7b",
    "modelName": "qwen2.5-coder:7b",
    "role": "implementer",
    "numPredict": 8192,
    "numCtx": 16384,
    "temperature": 0.1,
    "topK": 40,
    "topP": 0.9,
    "repeatPenalty": 1.1,
    "autoTuned": false,
    "isActive": true
  }
}
```

### POST `/api/models/profiles/auto-tune`

Autonomously runs empirical parameter sweep benchmarks to calibrate optimal `numCtx`, `numPredict`, `temperature`, and `repeatPenalty` values against local VRAM budgets.

**Request Body (Optional):**

```json
{
  "models": ["qwen2.5-coder:7b", "gemma3:4b-it-qat"]
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "count": 2,
  "profiles": [
    {
      "id": "qwen2.5-coder:7b",
      "modelName": "qwen2.5-coder:7b",
      "role": "implementer",
      "numPredict": 8192,
      "numCtx": 16384,
      "temperature": 0.1,
      "topK": 40,
      "topP": 0.9,
      "repeatPenalty": 1.1,
      "autoTuned": true,
      "isActive": true
    }
  ]
}
```

### POST `/api/fleet/heartbeat`

Receives periodic UDP/HTTP worker node health heartbeats (VRAM usage, APU/GPU thermals, task assignments).

### GET `/api/fleet/nodes`

Lists active and registered fleet worker nodes with availability and load states.

### GET `/api/fleet/events`

Server-Sent Events (SSE) stream broadcasting real-time cluster fleet events (`fleet_init`, `fleet_heartbeat`, `fleet_node_updated`, `thermal_warning`).

### GET `/api/history`

Returns paginated historical task records, stage execution durations, and model win rates.

### DELETE `/api/history`

Purges completed, failed, and cancelled task history while strictly preserving active `PENDING` and `RUNNING` tasks. Cascades deletions across associated stages, telemetry correlations, and test execution runs. Role-gated: requires `ADMIN` role when user session authentication is active.

**Query Parameters:**

- `olderThanDays` (optional): Only purge tasks older than the specified number of days (e.g. `?olderThanDays=30`).
- `status` (optional): Comma-separated list or query array of task statuses to purge (`COMPLETED`, `FAILED`, `CANCELLED`). `PENDING` and `RUNNING` tasks are unconditionally protected and will never be purged.

**Response:** `200 OK`

```json
{
  "success": true,
  "purgedCount": 42
}
```

### GET `/api/stream/buffer`

Retrieves the in-memory or persisted stream buffer output for a specific task ID for live inspection and historical stage replay.

**Query Parameters:**

- `taskId`: Unique identifier of the task.

**Response:** `200 OK`

```json
{
  "taskId": "task-102",
  "buffer": "export class Example {\n  ...\n}"
}
```

### GET `/api/stream/:taskId`

Opens a real-time Server-Sent Events (SSE) stream dedicated to the execution of a specific task, streaming inference tokens, stage progression, and diagnostic repairs directly to client inspectors.

**Response:** `200 OK` (`text/event-stream`)

### GET `/api/models/leaderboard`

Returns dynamic model leaderboard metrics, win rates, tokens/second, eviction counts, and remediation recovery telemetry.

**Response Payload**:

```json
{
  "leaderboard": [
    {
      "modelId": "qwen2.5-coder:7b",
      "provider": "ollama",
      "totalTasks": 24,
      "totalSuccesses": 20,
      "totalFailures": 4,
      "consecutiveFailures": 0,
      "winRate": 83.3,
      "avgLatencyMs": 1420,
      "tokensPerSec": 28.4,
      "status": "HEALTHY",
      "totalRemediationAttempts": 6,
      "totalRemediationSuccess": 5,
      "remediationRecoveryRate": 83.33
    }
  ]
}
```

### GET `/api/analytics/failures`

Returns rolling failure taxonomy distribution across configurable time windows (24h, 7d, 30d).

### GET `/api/repomap`

Returns dynamic AST symbol graph with PageRank centrality ranking.

### GET `/api/checkpoints`

Returns shadow git micro-checkpoints for undo/redo state tracking.

### GET `/api/diagnostics`

Returns live TypeScript and language server compiler diagnostics.

### GET `/api/diagnostics/config`

Returns dynamic telemetry and deep task pipeline diagnostic tracing configuration without requiring daemon restarts.

**Response:** `200 OK`

```json
{
  "debugTaskPipeline": true,
  "diagnosticsDir": ".cacophony/diagnostics",
  "maxRetainedDiagnostics": 100
}
```

### PUT `/api/diagnostics/config`

Dynamically configures task pipeline diagnostic tracing and rolling eviction cache limits at runtime.

**Request Body:**

```json
{
  "debugTaskPipeline": true,
  "maxRetainedDiagnostics": 100
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "debugTaskPipeline": true,
  "diagnosticsDir": ".cacophony/diagnostics",
  "maxRetainedDiagnostics": 100
}
```

### GET `/api/hardware/tools`

Returns host hardware diagnostic utilities status (`radeontop`, `sensors`, `btop`) and missing package commands.

### GET `/api/processes`

Returns active background infrastructure and test runner subprocesses with live PID, CPU utilization percentage, RSS memory allocation (MB), and execution status.

**Response:** `200 OK`

```json
[
  {
    "id": "proc-sys-ollama",
    "name": "ollama",
    "command": "ollama serve",
    "pid": 1042,
    "cpuPercent": 12.4,
    "rssMemoryMb": 520,
    "durationMs": 3600000,
    "exitCode": null,
    "status": "RUNNING",
    "startedAt": "2026-10-14T00:00:00.000Z"
  }
]
```

### POST `/api/processes/:name/restart`

Restarts a specified background subprocess or infrastructure daemon. Role-gated: requires `OPERATOR` or `ADMIN` role when authentication is enforced.

**Response:** `200 OK`

```json
{
  "success": true,
  "process": "ollama",
  "status": "restarted",
  "timestamp": "2026-10-14T04:12:00.000Z"
}
```

### POST `/api/processes/:name/terminate`

Gracefully terminates a running subprocess. Role-gated: requires `OPERATOR` or `ADMIN` role when authentication is enforced.

**Response:** `200 OK`

```json
{
  "success": true,
  "process": "test-runner",
  "status": "terminated",
  "timestamp": "2026-10-14T04:12:05.000Z"
}
```

### POST `/api/processes/:id/rerun`

Re-runs a completed, failed, or historical test-runner process in a sandboxed runner context. Role-gated: requires `OPERATOR` or `ADMIN` role when authentication is enforced.

**Response:** `200 OK`

```json
{
  "success": true,
  "processId": "proc-123",
  "command": "npm test",
  "exitCode": 0,
  "output": "All 105 tests passed",
  "timestamp": "2026-10-14T04:15:00.000Z"
}
```

### GET `/api/diagnostics`

Returns runtime diagnostics, AST parser health, memory usage, and execution counters.

### GET `/api/database/storage`

Returns storage footprint metrics for PGlite/Postgres tables, wal segments, compaction status, and row counts.

### POST `/api/database/maintenance`

Executes vacuum, table reindexing, and historical telemetry compaction.

### POST `/api/admin/backup`

Creates an on-demand, timestamped directory snapshot of the active database storage files and prunes older snapshots beyond the configured retention limit.

**Query Parameters:**

- `retentionCount` (optional): Maximum number of most recent snapshots to retain (default: 5).

**Response:** `200 OK`

```json
{
  "snapshotPath": "/path/to/backups/snapshot-2026-10-14T11-00-00-000Z",
  "timestamp": "2026-10-14T11-00-00-000Z",
  "sizeBytes": 1048576,
  "prunedSnapshots": []
}
```

### GET `/api/config/quotas`

Retrieves per-model inference rate limits, token budgets, and daily execution caps.

### GET & PUT `/api/config/role-affinity`

Reads or updates agent role model affinity mappings (e.g. mapping `architect` or `reviewer` to preferred models).

### GET `/api/config/network`

Returns dynamic network profile configuration inspected from incoming host headers, reverse proxy headers (`X-Forwarded-Host`, `X-Forwarded-Proto`), and client origins.

**Response:** `200 OK`

```json
{
  "resolvedOrigin": "http://127.0.0.1:24161",
  "forwardedHost": "127.0.0.1:24161",
  "forwardedProto": "http",
  "isLoopback": true,
  "isLan": false
}
```

- `isLoopback`: `true` if connected via localhost, 127.0.0.1, or IPv6 loopback (`::1`, `[::1]`).
- `isLan`: `true` for private RFC 1918 subnets (192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12) and Docker bridge networks (172.17.0.0/16).

### POST `/api/models/epoch`

Advances the active arena telemetry epoch, snapshotting previous performance totals, resetting degraded and eviction counters, and un-ejecting local models following pipeline regression fixes.

**Request Body:**

```json
{
  "name": "Epoch 15: Post-Tag-Resolution & Remediation Rebuild Recovery",
  "reason": "Reset degraded model baselines and clear failure streaks",
  "notes": "Optional audit metadata"
}
```

### POST `/api/models/reset-stats`

Resets active model health run and failure counters directly to baseline without rotating the epoch identifier.

### GET `/api/promotion/status`

Retrieves the current release promotion gating status, verifying canary benchmarks and test pass thresholds.

### POST `/api/promotion/release`

Triggers release tag promotion, tag creation in Gitea, and changelog generation.

### POST `/api/webhooks/gitea`

Ingests incoming webhook events from Gitea instances (e.g. `pull_request`, `push`, `pull_request_approved`, `issue_comment`).
Supports HMAC signature verification using the secret configured in `GITEA_WEBHOOK_SECRET` via headers `x-gitea-signature` or `x-hub-signature-256`.

**Headers:**
- `x-gitea-event`: Event type name (default: `pull_request`).
- `x-gitea-signature` or `x-hub-signature-256`: Hexadecimal HMAC-SHA256 signature.

**Response:** `200 OK`

```json
{
  "handled": true,
  "event": "pull_request",
  "action": "closed"
}
```

### POST `/api/ci/failures`

Ingests CI failure callback notifications from GitHub Actions or Gitea Actions runners.
Requires Bearer token authentication matching `CI_FAILURE_WEBHOOK_TOKEN` in the environment.

**Headers:**
- `Authorization`: `Bearer <token>`
- `Content-Type`: `application/json`

**Request Body:**

```json
{
  "repository": "Brennername/cacophony",
  "workflow": "CI",
  "job": "build-and-test",
  "commit": "deadbeefcafebabe0123456789abcdef01234567",
  "run_id": "100234",
  "run_url": "http://gitea.local/actions/runs/100234",
  "ref": "refs/heads/feat/auth",
  "details": "Unit test suite failure during build step",
  "workItemId": "wi-77",
  "prNumber": 42,
  "round": 1
}
```

**Response:** `200 OK`

```json
{
  "status": "QUEUED",
  "taskId": "task-ci-fail-100234",
  "message": "CI failure diagnostic task successfully enqueued"
}
```

---

## 2. Server-Sent Events (SSE) Stream

### GET `/api/events`

Opens a persistent streaming channel broadcasting real-time arena diagnostics and task state transitions.

**Event Types:**

- `stage`: Emitted when a task transitions to a new stage (`planning`, `generation`, `test`, `review`).
- `pr_created`: Emitted when an autonomous Pull Request is opened on Gitea (`{ taskId: string, branchName: string, prUrl: string }`).
- `token`: Incremental token emitted during live LLM stream inference.
- `telemetry`: 1-second interval hardware APU sensor snapshots.
- `diagnostics`: Workspace compiler diagnostics emitted by language servers.
- `system_memory_warning`: Emitted when available system memory drops below the 1.5 GB safety threshold (`{ memAvailableBytes: number, thresholdBytes: number, message: string }`).

---

## 3. JSON-RPC 2.0 Headless Protocol

Cacophony supports bi-directional JSON-RPC 2.0 communications for external editor extensions (VS Code, Cursor) and terminal clients over WebSocket or Unix Domain Sockets (`/tmp/cacophony.sock`).

### Request Structure

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "session/prompt",
  "params": {
    "sessionId": "sess-abc",
    "prompt": "Generate unit test for RepoMapViewer",
    "focusFiles": [
      "packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts"
    ]
  }
}
```

### Response Structure

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "accepted": true,
    "promptId": "prompt-177439123"
  }
}
```

### Supported RPC Methods

1. `session/create`: Create a new conversation session.
2. `session/prompt`: Submit instruction turn.
3. `session/interrupt`: Immediately cancel in-flight model stream.
4. `context/addFile`: Pin editable or reference context file.
5. `repo/getMap`: Retrieve compressed architectural symbol graph.
6. `engine/status`: Query active task and hardware telemetry metrics.

### Streaming Notifications

- `stream/token`: Emits `{ "promptId": string, "token": string }`.
- `task/stageChange`: Emits `{ "taskId": string, "stage": string, "status": string }`.
- `telemetry/update`: Emits `{ "gpu": { ... }, "thermalZone": string }`.
- `test/output`: Emits `{ "testState": { ... }, "raw": string }`.
