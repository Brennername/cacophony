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
  "testCommand": "npm test --workspace=@cacophony/engine"
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

### GET `/api/tasks/:id/gantt`

Returns stage durations and timeline spans for Gantt transport visualization.

### POST `/api/tasks/decompose-spec`

Ingests specification documents (`docs/spec.md`, `README.md`, OpenAPI JSON) and autonomously derives topological task sequences.

### POST `/api/tasks/requeue`

Retries failed tasks with a three-failure quarantine safeguard (`force=true` bypasses).

### POST `/api/tasks/seed`

Ingests uncompleted tasks from `docs/taskcade.md` into the active queue.

### POST `/api/tasks/reclaim`

Reclaims stale running tasks back to `PENDING` state.

### POST `/api/tasks/groom`

Grooms the task queue by reconciling active and pending task records against merged Gitea pull requests. Any task associated with a merged PR is automatically marked `COMPLETED`.

**Response:** `200 OK`

```json
{
  "groomedCount": 3,
  "message": "Task queue reconciled against merged pull requests"
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

### POST `/api/models/reset-stats`

Resets model health metrics and failure tallies to baseline across all registered models.

**Response**:

```json
{
  "success": true,
  "message": "All model health metrics reset to clean baseline."
}
```

### GET & PUT `/api/models/config`

Reads and updates model tenancy configurations (disk quotas, auto-eviction, model whitelist).

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
