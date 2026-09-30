# Docker Topology & Sandboxed Workspace Strategy

## 1. Architectural Philosophy: Clean Host, Isolated Workspaces

A critical deficiency in previous iterations was scattering shell scripts, ad-hoc binaries, and loose files across the host machine's `bin/` directories and repository trees. Maintaining and backporting changes across scattered installations created significant maintenance overhead.

**Cacophony enforces a zero-host-pollution standard:**
1. No scripts or custom binaries are installed into the host user's `~/bin`, `/usr/local/bin`, or workspace roots.
2. All execution environments, linters, compilers, deterministic tools, and test harnesses execute strictly within the Docker container or local project dependencies.
3. Repositories are cloned and worked on using isolated **Git Worktrees** inside sandboxed container volumes (`/workspaces/`).
4. Configuration and persistence are mediated exclusively through clean **bind mounts** and environment variables.

---

## 2. Docker Compose Topology

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              HOST MACHINE                              │
│                                                                        │
│   Native Ollama Service (http://localhost:11434)                       │
│   AMD Sysfs & DRM Nodes (/sys/class/drm, /sys/class/hwmon)             │
│                                                                        │
│   Host Directories:                                                    │
│   ├── ./conf                                    (Bind Mount)           │
│   ├── ./data                                    (Bind Mount)           │
│   ├── ./workspaces                              (Bind Mount)           │
│   └── ./.env                                    (Bind Mount)           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      DOCKER BRIDGE NETWORK                     │   │
│   │                                                                │   │
│   │   ┌─────────────────────────┐      ┌───────────────────────┐   │   │
│   │   │ cacophony-engine        │      │ cacophony-gitea       │   │   │
│   │   │                         │      │                       │   │   │
│   │   │ Host / Container Ports: │      │ Host / Container:     │   │   │
│   │   │ - 24072 (Angular UI)    │ <──> │ - 19634 (Web & REST)  │   │   │
│   │   │ - 24161 (API & SSE)     │      │ - 17883 (SSH Git)     │   │   │
│   │   │ - 21264 (MCP Stdio/SSE) │      │                       │   │   │
│   │   └─────────────────────────┘      └───────────────────────┘   │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Bind Mounts vs Volumes

To balance durability, local configurability, and container sandboxing:

| Host Path | Container Mount | Mode | Purpose |
| :--- | :--- | :--- | :--- |
| `./conf` | `/app/conf` | `ro` (Read-Only) | JSON runtime configuration defining model assignments, thresholds, and directives. |
| `./data` | `/app/data` | `rw` (Read-Write) | PGlite embedded database files (`/app/data/cacophony_pglite`) and job logs. |
| `./workspaces` | `/app/workspaces` | `rw` (Read-Write) | Sandboxed Git clones and ephemeral worktrees where agents perform work. |
| `./.git` | `/app/.git` | `rw` (Read-Write) | Host Git metadata for branch locking and ephemeral worktrees. |
| `./.env` | `/app/.env` | `ro` (Read-Only) | Secret environment variables (Gitea tokens, master vault keys, provider keys). |
| `/sys/class/drm` | `/host/sys/class/drm` | `ro` (Read-Only) | Hardware GPU load and VRAM sysfs nodes passed to telemetry provider. |
| `/sys/class/hwmon`| `/host/sys/class/hwmon`| `ro` (Read-Only) | Hardware thermal, voltage, and wattage sysfs nodes. |

---

## 4. Communication with Host Ollama

Because the AMD Cezanne Vega APU requires Vulkan compute drivers and custom kernel lockup timeouts configured natively on the host (`setup-amdgpu-fix.sh`), Ollama runs natively on the host operating system rather than inside Docker.

The container connects to host Ollama using Docker's host gateway:
- In `docker-compose.yml`:
  ```yaml
  extra_hosts:
    - "host.docker.internal:host-gateway"
  ```
- Environment variable:
  ```env
  OLLAMA_BASE_URL=http://host.docker.internal:11434
  ```

---

## 5. Sandboxed Git Worktree Management

When executing tasks on a repository:
1. Cacophony clones the target repository once into `/app/workspaces/repos/<project-name>`.
2. For each task, an ephemeral Git worktree is created:
   ```bash
   git worktree add /app/workspaces/workers/<task-id> -b arena/<task-id>
   ```
3. The model, test runners, and deterministic scrubbers execute exclusively inside `/app/workspaces/workers/<task-id>`.
4. If tests pass, the branch is pushed to Gitea (`git push origin arena/<task-id>`), and the worktree is cleanly removed:
   ```bash
   git worktree remove /app/workspaces/workers/<task-id>
   ```
5. If the task fails or is cancelled, the worktree is pruned without leaving dirty states or detached HEADs in the primary repo.
