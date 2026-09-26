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

### GET `/api/history`
Returns paginated historical task records, stage execution durations, and model win rates.

### GET `/api/models/leaderboard`
Returns dynamic model leaderboard metrics, win rates, tokens/second, and eviction counts.

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

### GET `/api/config/network`
Returns resolved client origin URL and network accessibility profile (`lan_shared`, `local_only`).

---

## 2. Server-Sent Events (SSE) Stream

### GET `/api/events`
Opens a persistent streaming channel broadcasting real-time arena diagnostics and task state transitions.

**Event Types:**
- `stage`: Emitted when a task transitions to a new stage (`planning`, `generation`, `test`, `review`).
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
    "focusFiles": ["packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts"]
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
