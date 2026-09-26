# Cacophony

> Autonomous Local Model Arena & Multi-Agent Code Orchestration Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%2F%206.x-blue.svg)](https://www.typescriptlang.org/)
[![Angular](https://img.shields.io/badge/Angular-v20%2B%20Signals-red.svg)](https://angular.dev/)
[![Docker](https://img.shields.io/badge/Docker-Sandboxed-2496ED.svg)](https://www.docker.com/)

---

## Overview

Cacophony is an enterprise-grade autonomous code orchestration platform and competitive model arena engineered to operate 24/7 on local edge hardware while harmonizing with frontier models and internal Git repositories.

Built specifically to conquer the thermal and VRAM constraints of unified-memory APUs and discrete GPUs, Cacophony replaces ad-hoc shell automation with:

- A strictly typed TypeScript monorepo governed by SOLID principles.
- An in-process SQL persistence engine powered by PGlite (with modular adapters for SQLite, PostgreSQL, and MariaDB).
- Single-concurrency task scheduling with model-affinity batching, continuous thermal pacing, consecutive failure eviction, and weighted roulette fallback.
- Deterministic code scrubbing enforcing ESM compliance, relative path correctness, and absolute zero-emoji purity.
- A full Gemini/Codex-style deterministic tool suite exposed locally and via the Model Context Protocol (MCP).
- A mobile-first Angular v20+ dashboard offering real-time hardware telemetry, live queue management, stage inspectors, Gantt timeline execution tracking, and Gitea pull request tracking.

---

## Architectural Topology

```text
+-------------------------------------------------------------------------------+
|                           CACOPHONY ENGINE (DOCKER)                           |
|                                                                               |
|   +-----------------------------------------------------------------------+   |
|   |                  Angular v20+ Mobile-First Frontend                   |   |
|   |     (Gantt Timeline, Hardware Gauges, Stage Steppers, Models)     |   |
|   +-----------------------------------------------------------------------+   |
|                                      | SSE / REST                             |
|                                      v                                        |
|   +-----------------------------------------------------------------------+   |
|   |                        HTTP / REST / MCP Engine                       |   |
|   +-----------------------------------------------------------------------+   |
|                 |                            |                                |
|                 v                            v                                |
|   +--------------------------+    +---------------------------------------+   |
|   |   Task Scheduler         |    |   Database Persistence (PGlite)       |   |
|   |   - Single Concurrency   |    |   - Tasks & Stage Transitions         |   |
|   |   - Model-Affinity Cache |    |   - Hardware Telemetry & Logs         |   |
|   |   - Thermal Pacing Gate  |    |   - Dynamic Provider Configurations   |   |
|   +--------------------------+    +---------------------------------------+   |
|                 |                                    |                        |
|        +--------+------------------+                 |                        |
|        v                           v                 v                        |
|  +--------------------+   +-------------------+  +-------------------------+  |
|  | Deterministic Code |   | Tool Engine (MCP) |  | Hardware Diagnostics    |  |
|  | Scrubber & Linters |   | Shell, Git, Files |  | Sysfs DRM/Hwmon Monitor |  |
|  +--------------------+   +-------------------+  +-------------------------+  |
|        |                           |                                          |
+--------+---------------------------+------------------------------------------+
         |                           |
         v                           v
+-----------------------+   +-----------------------+   +-----------------------+
| Native Ollama Engine  |   | Gitea Service (Git)   |   | Frontier Providers    |
| (Host via HTTP API)   |   | Automated PR Branches |   | Anthropic, OpenAI,    |
| Qwen, DeepSeek, Gemma |   | Worktree Isolation    |   | Gemini via Encrypted  |
+-----------------------+   +-----------------------+   +-----------------------+
```

---

## Monorepo Architecture

The workspace is organized as an npm workspace monorepo under `packages/`:

| Package                   | Path                    | Description                                                                                                      |
| :------------------------ | :---------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `@cacophony/shared-types` | `packages/shared-types` | Canonical domain models, pipeline stage enums, task status types, and telemetry interfaces.                      |
| `@cacophony/db`           | `packages/db`           | Database abstraction layer with PGlite in-process WASM/Node PostgreSQL and automated migration runners.          |
| `@cacophony/tools`        | `packages/tools`        | Deterministic file manipulation, safe shell execution, git worktree management, and MCP tool handlers.           |
| `@cacophony/engine`       | `packages/engine`       | Core autonomous worker pipeline, model affinity scheduler, thermal governor, and SSE/REST server.                |
| `@cacophony/frontend`     | `packages/frontend`     | Responsive Angular v20+ SPA featuring Zoneless change detection, Signals, Gantt transport, and hardware HUD. |

---

## Prerequisites

- **Operating System**: Linux (Kernel 6.x recommended for sysfs DRM/hwmon access)
- **Node.js**: >= 22.0.0
- **Docker & Docker Compose**: Compose v2+
- **Inference Runtime**: Ollama running locally or accessible via network
- **Hardware Recommendations**:
  - AMD APU (e.g., Ryzen 5000/7000/8000 with Vega/RDNA) or Discrete GPU (8 GB+ VRAM recommended).
  - 16 GB+ System RAM.

---

## Quick Start

### 1. Clone Repository & Setup Environment

```bash
git clone https://github.com/your-org/cacophony.git
cd cacophony
cp .env.example .env
```

Review `.env` and verify your local Ollama URL and preferred port bindings:

```bash
# Server Ports
PORT_FRONTEND=24072
PORT_API=24161
PORT_MCP=21264

# Ollama Endpoint
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

### 2. Install Dependencies & Build

```bash
npm install
npm run build
```

### 3. Launch via Docker

```bash
docker compose up -d --build
```

Access the application in your browser:

- **Web Dashboard**: `http://localhost:24072`
- **Engine API**: `http://localhost:24161/api/health`
- **Internal Gitea**: `http://localhost:19634`

### 4. CLI Controls

Cacophony includes a command-line interface in `bin/cacophony`:

```bash
# Check running engine and service status
./bin/cacophony status

# Recompile monorepo packages live without restarting containers
npm run rebuild
# or directly:
./bin/rebuild-all.sh
```

---

## Core Capabilities

### Single Concurrency & Model-Affinity Scheduling

Local LLMs encounter heavy performance penalties when constantly unloaded and reloaded from VRAM. Cacophony groups queued tasks by model affinity, batching consecutive executions on the active model before switching. If a model encounters 3-4 consecutive test failures, it is temporarily evicted with a weighted random roulette selecting an alternative model.

### Hardware Thermal Governor

Sysfs hardware telemetry directly monitors GPU edge temperature, core clock frequencies, VRAM allocation, and package wattage. If thermal thresholds are crossed:

- **Nominal (<70 C)**: Zero artificial delay between tasks.
- **Warm (70-79 C)**: 5-second pacing delay injected between inference passes.
- **Elevated (80-89 C)**: 15-second pacing delay injected; logs warning to telemetry stream.
- **Danger (>=90 C)**: Pipeline paused until cooling occurs.

### Gantt Transport & Telemetry HUD

The frontend interface has:

- Continuous transport scrubber tracking live stage durations.
- Zoom in/out timeline controls with viewport fit toggle.
- Dual booking tracking real-time generation and test runs simultaneously.
- Mobile-first responsive layout with dark and high-contrast themes.

---

## Development & Testing

### Running Tests

```bash
# Run unit tests across all monorepo packages
npm test

# Run frontend tests with Vitest
npm run --workspace=@cacophony/frontend test

# Run engine unit tests
npm run --workspace=@cacophony/engine test
```

### Code Formatting & Quality

```bash
# Verify formatting
npm run format:check

# Format files
npm run format

# Run linter
npm run lint
```

---

## Contributing

We welcome contributions from the community. Please review our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting pull requests.

---

## Security

For security vulnerabilities and responsible disclosure guidelines, see [SECURITY.md](SECURITY.md).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
