# Cacophony Operation Manual & System Architecture Runbook

## 1. Overview

**Cacophony** is an autonomous, containerized 24/7 multi-agent code orchestration platform and local model arena designed for resource-constrained consumer hardware (AMD APUs, unified VRAM architectures, and local Ollama instances).

---

## 2. Port Allocations & Network Topology

| Service | Internal Port | Host Port | Protocol | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web UI** | `3000` | `24072` | HTTP | Angular v22 Standalone Zoneless Dashboard |
| **Engine REST & SSE API** | `3002` | `24161` | HTTP / SSE | Task queue, telemetry, and live SSE event stream |
| **Model Context Protocol (MCP)** | `3003` | `21264` | HTTP / SSE / Stdio | External AI model tool execution server |
| **Gitea Web Interface** | `3000` | `19634` | HTTP | Local Git repository and PR platform |
| **Gitea SSH Port** | `2222` | `17883` | SSH | Git remote transport |
| **Mailpit Web UI** | `8025` | `15417` | HTTP | Email inspection for registration verification |
| **Mailpit SMTP** | `1025` | `18860` | SMTP | Local SMTP trap |

---

## 3. CLI Command Palette (`bin/cacophony`)

The single executable entrypoint `bin/cacophony` controls all daemon lifecycles, stream audits, queue queries, and scrubber executions:

```bash
# Daemon Lifecycle
cacophony status                 # Inspect daemon status, active task, and APU sensors
cacophony start [--daemon]       # Launch Cacophony engine (foreground or detached background)
cacophony start-daemon           # Launch detached daemon process
cacophony ensure-start           # Idempotent start if not running
cacophony pause                  # Pause task scheduler execution loop
cacophony resume                 # Resume task scheduler
cacophony stop                   # Graceful drain: finish active task, then terminate
cacophony kill                   # Immediate emergency termination

# Queue & Task Operations
cacophony tasks list             # List pending or executing tasks
cacophony tasks get <id>         # Inspect task details, prompt, and focus files
cacophony tasks enqueue          # Enqueue new task into the arena
cacophony tasks cancel <id>      # Cancel scheduled task

# Real-Time LLM Stream Tapping & Auditing
cacophony stream tap [id]        # Attach to live token generation stream in real-time
cacophony stream suspend [id]    # Suspend token generation for active task
cacophony stream resume [id]     # Resume suspended generation

# Deterministic Scrubber
cacophony scrub <file> [--write] # Run deterministic scrubbers (emojis, ESM imports, banned libs)
```

---

## 4. Hardware Telemetry & Thermal Governor

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

## 5. Security & Execution Guard

Tool execution is gated by strict policy filters:
- Path traversal outside workspace boundary is blocked (`Security Violation`).
- Destructive commands (`rm`, `shred`, `sudo`, `dd`, `mkfs`, `git reset --hard`, `git push --force`) are blacklisted and rejected by `ExecutionGuard`.
- Deprecated source files must be moved to `.trash/` with justification in `.trash/README.md`.

---

## 6. Docker Deployment

```bash
# Start all containers in background
docker compose up -d

# Check running containers
docker compose ps

# Register Gitea OAuth application automatically
./bin/register-gitea-oauth.sh
```
