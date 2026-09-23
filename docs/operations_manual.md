# Cacophony System Operations & Architecture Manual

## 1. System Overview

Cacophony is an autonomous, containerized multi-agent code orchestration platform and local model arena designed for resource-constrained consumer hardware (such as AMD APUs with unified VRAM architecture) and local Ollama instances.

---

## 2. Port Allocations & Network Topology

All network services are configurable via environment variables in `.env`:

| Service | Internal Port | Host Port | Protocol | Description | Default URL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend Web UI & API** | `24161` | `24072` | HTTP | Angular v20+ Standalone Zoneless Dashboard | `http://localhost:24072` |
| **Engine REST & SSE API** | `24161` | `24161` | HTTP / SSE | Task queue, telemetry, and live SSE event stream | `http://localhost:24161` |
| **Model Context Protocol (MCP)** | `21264` | `21264` | HTTP / SSE / Stdio | External AI model tool execution server | `http://localhost:21264/mcp` |
| **Gitea Web Interface** | `3000` | `19634` | HTTP | Local Git repository and PR platform | `http://localhost:19634` |
| **Gitea SSH Port** | `2222` | `17883` | SSH | Git remote transport | `ssh://git@localhost:17883` |
| **Mailpit Web UI** | `8025` | `15417` | HTTP | Email inspection for registration verification | `http://localhost:15417` |
| **Mailpit SMTP** | `1025` | `18860` | SMTP | Local SMTP trap | `smtp://localhost:18860` |

---

## 3. CLI Command Palette (`bin/cacophony`)

The single executable entrypoint `bin/cacophony` controls all daemon lifecycles, stream audits, queue queries, and scrubber executions:

```bash
# Daemon Lifecycle Commands
cacophony status                 # Inspect daemon status, active task, and APU sensors
cacophony start [--daemon]       # Launch Cacophony engine (foreground or detached background)
cacophony start-daemon           # Launch detached daemon process
cacophony ensure-start           # Idempotent start: starts if offline, exits cleanly if running
cacophony pause                  # Pause task scheduler execution loop
cacophony resume                 # Resume task scheduler
cacophony stop                   # Graceful drain: finish active task, then terminate
cacophony kill                   # Immediate emergency termination

# Queue & Task Operations
cacophony tasks list             # List pending or executing tasks
cacophony tasks get <id>         # Inspect task details, prompt, and focus files
cacophony tasks enqueue          # Enqueue new task into the arena
cacophony tasks cancel <id>      # Cancel scheduled task
cacophony history [id]           # Query execution stages and telemetry logs for a task

# Real-Time LLM Stream Tapping & Auditing
cacophony stream tap [id]        # Attach to live token generation stream in real-time
cacophony stream suspend [id]    # Suspend token generation for active task
cacophony stream resume [id]     # Resume suspended generation

# Deterministic Scrubber
cacophony scrub <file> [--write] # Run deterministic scrubbers (emojis, ESM imports, banned libs)
```

---

## 4. Terminal User Interface (TUI) & Keyboard Shortcuts

Cacophony features an integrated Terminal User Interface (`TerminalApp`) providing split panes:
- **Conversation Pane**: Markdown message streaming and syntax-highlighted code.
- **Hardware Telemetry Bar**: Compact live readouts of GPU load, VRAM, edge temperature, and resident model.
- **Context Inspector Pane**: Pinned focus files, reference files, and token budget counters.
- **Stream Output Drawer**: Real-time test outputs, tool execution audits, and subprocess logs.

### Keybindings
- `Tab`: Cycle active pane focus (`Conversation` -> `Context` -> `Drawer`).
- `Ctrl+P` or `/`: Open fuzzy searchable Command Palette modal.
- `Ctrl+T`: Toggle bottom stream log drawer visibility.
- `Ctrl+C`: Interrupt active generation or cancel task.
- `Up` / `Down`: Navigate menu and command palette items.
- `Enter`: Select or execute highlighted item.
- `Escape`: Close modal overlays.

---

## 5. Custom Markdown Commands

Users can define custom commands in `.cacophony/commands/*.md` (workspace-specific) or `conf/commands/*.md` (global).

### Specification & Frontmatter Format

```markdown
---
name: refactor
description: Refactor targeted symbol to adhere strictly to SOLID principles
role: user
temperature: 0.2
arguments: targetSymbol, file
---
Please review and refactor `$ARG1` in `$ARG2`.
Requirements:
1. Adhere strictly to SOLID principles.
2. Zero emojis in code or comments.
3. Maintain full type-safety and ensure no regressions.

Selection Context:
$SELECTION
```

### Interpolation Variables
- `$ARG1`, `$ARG2`, `$ARGn`: Positional command parameters.
- `$SELECTION`: Code snippet currently highlighted in editor or terminal.
- `$FILES`: Comma-separated list of focus and context files.
- `$TEST_OUTPUT`: Raw failure log or stack trace from most recent automated test run.

---

## 6. Execution Safety Modes

The platform supports three distinct execution safety modes:
1. **Plan Mode**: Read-only workspace inspection. Disk modification tools are strictly blocked by `ExecutionSafetyManager`. Generates implementation plans.
2. **Build Mode**: Disk modifications and test loop runs permitted. Git commits and PR generation require explicit user approval.
3. **Auto Mode**: Full closed-loop autonomy (Plan -> Code -> Scrub -> Test Loop -> Commit).

---

## 7. Headless Server Protocol (JSON-RPC 2.0)

For integration with external editors (such as VS Code or Cursor), Cacophony provides a bi-directional JSON-RPC 2.0 protocol over WebSocket and Unix Domain Sockets:

### Methods
- `session/create`: Initialize new multi-tab conversation session.
- `session/prompt`: Submit instruction turn with focus file context.
- `session/interrupt`: Immediately cancel in-flight token stream.
- `context/addFile`: Tag workspace file as `EDITABLE` or `READ_ONLY`.
- `repo/getMap`: Retrieve compressed repository architectural tree.
- `engine/status`: Query active task and Vega APU telemetry metrics.

### Streaming Notifications
- `stream/token`: Incremental token emitted during inference.
- `task/stageChange`: Pipeline step progression (`planning`, `generation`, `test`).
- `telemetry/update`: Live hardware sensor snapshot.
- `test/output`: Streamed test runner output and assertion diffs.

---

## 8. Hardware Telemetry & Thermal Governor

Cacophony directly reads Linux sysfs direct nodes to monitor hardware state without polling overhead:
- `/sys/class/drm/card0/device/gpu_busy_percent`
- `/sys/class/drm/card0/device/mem_info_vram_used`
- `/sys/class/hwmon/hwmon*/temp1_input`
- `/sys/class/drm/card0/device/hwmon/hwmon*/power1_average`

### Pacing Governor Thresholds
- **Nominal (< 70°C):** Normal execution; zero inter-task pacing delay.
- **Warm (70°C - 80°C):** 5-second cooldown delay between tasks.
- **Elevated (80°C - 90°C):** 15-second cooldown delay.
- **Danger (>= 90°C):** Execution suspended for 10-second thermal recovery loops.

---

## 9. Security & Execution Guard

Tool execution is gated by strict policy filters:
- Path traversal outside workspace boundary is blocked (`Security Violation`).
- Destructive commands (`rm`, `shred`, `sudo`, `dd`, `mkfs`, `git reset --hard`, `git push --force`) are blacklisted and rejected by `ExecutionGuard`.
- Deprecated source files must be moved to `.trash/` with justification in `.trash/README.md`.
