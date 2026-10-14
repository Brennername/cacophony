# Taskcade Metadata Specifiers, Pipeline Hints & Ingestion Protocol

This document defines the formal specification for granular task metadata specifiers and pipeline execution hints within Cacophony. These hints allow task authors, automated groomers, and supervisor agents to fine-tune execution parameters, enforce model affinities, configure inference hyperparameters, and selectively bypass deterministic scrubbers.

---

## 1. Overview & Architecture

When tasks are parsed from `docs/taskcade.md`, submitted via the REST API (`POST /api/tasks`), or registered via the `enqueue_taskcade_task` MCP tool, granular execution directives can be attached using strongly-typed metadata structures.

```
+-------------------------------------------------------------------------------+
| Ingestion Sources:                                                            |
|  - docs/taskcade.md markdown lines with bracket annotations                  |
|  - REST API (POST /api/tasks with metadataHints JSON payload)                 |
|  - MCP Tool (enqueue_taskcade_task)                                           |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| TaskcadeSeedLoader / Zod Schema Validation (TaskMetadataHintsSchema)         |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| Database Persistence (Migration 019: tasks.metadata_hints TEXT column)       |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| Runtime Pipeline Execution:                                                   |
|  - TaskScheduler: selectCandidateModel() honors modelAffinity pinning        |
|  - AutonomousWorkerPipeline: temperature and maxTokens bound to inference     |
|  - RulePipelineEngine: bypassRules flags skip specific AST / regex scrubbers  |
+-------------------------------------------------------------------------------+
```

---

## 2. Inline Markdown Syntax

Tasks defined in `docs/taskcade.md` support inline bracket annotations. The `TaskcadeSeedLoader` extracts these directives into typed `TaskMetadataHints` and strips them from the title and prompt to prevent prompt leakage.

| Annotation Tag | Value Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `[Role: ...]` | `AgentRole` enum | Assigns the operational agent persona (e.g. `implementer`, `reviewer`, `architect`, `planner`, `test_engineer`, `doc_writer`, `type_specialist`, `security_auditor`, `chore_runner`). | `[Role: architect]` |
| `[Model: ...]` | String | Explicit model affinity. Overrides automatic scheduler selection and pins execution directly to the specified model variant. | `[Model: qwen2.5-coder:14b]` |
| `[Temp: ...]` | Float (0.0 - 1.0) | Sampling temperature for inference requests passed to the Ollama provider. Default is `0.1`. | `[Temp: 0.2]` |
| `[MaxTokens: ...]` | Integer | Maximum generation token budget for the model response. | `[MaxTokens: 4096]` |
| `[Timeout: ...]` | Integer (ms) | Execution deadline for task execution in milliseconds. | `[Timeout: 600000]` |
| `[BypassRules: ...]` | Comma-separated Strings | Deterministic scrubber rules or aliases to bypass for this task. | `[BypassRules: emoji_scrubber, empty_file_guard]` |
| `[Stack: ...]` | String | Technology stack affinity profile (e.g. `angular`, `nestjs`, `node`). | `[Stack: angular]` |

### Example Markdown Item:
```markdown
- [ ] `T75.1`: High-throughput AST Indexer [Role: architect] [Model: qwen2.5-coder:14b] [Temp: 0.2] [MaxTokens: 4096] [Timeout: 600000] [BypassRules: emoji_scrubber]
```

---

## 3. Data Contract & TypeScript Schema

The schema is defined in `@cacophony/shared-types` under `TaskMetadataHintsSchema`:

```typescript
export const TaskMetadataHintsSchema = z.object({
  modelAffinity: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  contextBudget: z.number().optional(),
  timeoutMs: z.number().optional(),
  ruleBypassFlags: z.array(z.string()).optional(),
  stack: z.string().optional(),
  executionGuardrails: z.record(z.any()).optional(),
  customDirectives: z.record(z.string()).optional(),
});

export type TaskMetadataHints = z.infer<typeof TaskMetadataHintsSchema>;
```

### Attached to Task Records:
`TaskRecord` includes `metadataHints?: TaskMetadataHints | null;`. In the database, this is stored as serialized JSON in the `metadata_hints` column of the `tasks` table.

---

## 4. Rule Scrubber Bypasses

When code generation or repair occurs, `AutonomousWorkerPipeline` routes modified files through `RulePipelineEngine`. If `ruleBypassFlags` contains a rule identifier or its canonical alias, evaluation and mutation for that rule are bypassed.

### Recognized Rule IDs & Aliases:
- `emoji_scrubber` / `strip_emojis`: Bypasses stripping of Unicode emoji glyphs. Useful when building apps with specific emoji features or test suites asserting emoji preservation.
- `empty_file_guard` / `empty_files`: Bypasses 0-byte file rejection, allowing explicit creation of empty placeholder files or stubs.
- `banned_import_scrubber` / `banned_imports`: Bypasses banned import filtering.
- `placeholder_stub_detector` / `placeholder_stubs`: Bypasses detection of lazy TODO stubs.
- `whitespace_and_eol_normalizer` / `whitespace_normalizer`: Bypasses automatic line-ending normalization and trailing whitespace stripping.

---

## 5. Model Pinning Execution Guarantees

When `metadataHints.modelAffinity` is set on a `TaskRecord`:
1. `TaskScheduler.selectCandidateModel()` immediately returns `TaskScheduler.normalizeModelName(task.metadataHints.modelAffinity)`.
2. The task bypasses candidate fallback lists, role-based model remapping, and failure retry escalation that would otherwise reassign the task to a larger or smaller model.
3. Warm model cache affinity honors the pinned model, ensuring VRAM transitions are minimized when consecutive tasks pin the same model.

---

## 6. MCP Tool: `enqueue_taskcade_task`

Subagents and external orchestration pipelines can register tasks using the MCP tool `enqueue_taskcade_task`.

### Tool Parameter Schema:
```json
{
  "title": "Implement JWT authentication guard",
  "prompt": "Create JWT auth guard and unit tests in packages/engine/src/auth/",
  "role": "security_auditor",
  "priority": "P0",
  "modelAssigned": "qwen2.5-coder:14b",
  "testCommand": "npm test --workspace=@cacophony/engine",
  "focusFiles": "packages/engine/src/auth/AuthGuard.ts",
  "metadataHints": {
    "modelAffinity": "qwen2.5-coder:14b",
    "temperature": 0.1,
    "maxTokens": 4096,
    "timeoutMs": 600000,
    "ruleBypassFlags": ["emoji_scrubber"],
    "stack": "node"
  }
}
```

The tool validates parameters with Zod. When running inside the engine process, it persists the task directly into `TaskRepository`. When invoked remotely via MCP, it dispatches the request to `POST /api/tasks`.

---

## 7. REST API: `POST /api/tasks`

The unified daemon server exposes `POST /api/tasks`.

### Request Payload:
```json
{
  "title": "Feature Task",
  "prompt": "Task requirements",
  "role": "implementer",
  "priority": "P1",
  "metadataHints": {
    "modelAffinity": "qwen2.5-coder:7b",
    "temperature": 0.2,
    "maxTokens": 2048,
    "ruleBypassFlags": ["emoji_scrubber"]
  }
}
```

### Response (201 Created):
```json
{
  "id": "task-1718361928_a1b2",
  "title": "Feature Task",
  "prompt": "Task requirements",
  "role": "implementer",
  "status": "PENDING",
  "priority": "P1",
  "modelAssigned": null,
  "testCommand": null,
  "focusFiles": null,
  "targetBranch": "main",
  "prUrl": null,
  "failureCount": 0,
  "createdAt": "2026-10-14T12:00:00.000Z",
  "updatedAt": "2026-10-14T12:00:00.000Z",
  "completedAt": null,
  "metadataHints": {
    "modelAffinity": "qwen2.5-coder:7b",
    "temperature": 0.2,
    "maxTokens": 2048,
    "ruleBypassFlags": ["emoji_scrubber"]
  }
}
```
