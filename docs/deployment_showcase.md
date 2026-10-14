# Public Demonstration and Staging Deployment Guide

This document outlines the deployment procedure for hosting Cacophony in public staging environments using containerized zero-hardware and mock inference profiles.

## Overview

Cacophony can run in headless and demo modes without local GPUs or discrete accelerator hardware. By selecting the `mock` or `cpu` inference providers, all orchestration features, AST parsers, self-healing pipelines, test execution harnesses, and real-time frontend telemetry dashboards operate fully in public demonstration environments (e.g., containerized staging instances, Fly.io, Heroku, or self-hosted Docker hosts).

## Configuration Profiles

### Mock Inference Profile

For public demonstrations and continuous integration testbeds where local LLM weights cannot be pulled or executed:

- `INFERENCE_PROVIDER=mock`: Synthesizes deterministic completions adhering to AST guardrails and type signatures.
- `DEFAULT_EXECUTION_MODE=auto`: Operates autonomous queue processing continuously.
- `DATABASE_DRIVER=pglite`: Uses embedded WASM Postgres without requiring external database servers.

### Environment Variables

| Variable | Description | Default | Demo Recommended |
|---|---|---|---|
| `PORT` | HTTP daemon listening port | `24161` | `24161` / `$PORT` |
| `NODE_ENV` | Runtime execution environment | `production` | `production` |
| `INFERENCE_PROVIDER` | Inference provider engine (`ollama`, `mock`, `nvidia`) | `ollama` | `mock` |
| `OLLAMA_HOST` | Remote or local Ollama URL (if using external provider) | `http://127.0.0.1:11434` | Optional |
| `DATABASE_DRIVER` | Database engine (`pglite`, `postgres`) | `pglite` | `pglite` |
| `PGLITE_DATA_DIR` | Filesystem storage path for PGlite database | `./data/pglite` | `./data/pglite` |
| `LOG_LEVEL` | Diagnostic logging verbosity | `info` | `info` |

## Docker Staging Deployment

### Building the Image

```bash
docker build -t cacophony:staging -f Dockerfile .
```

### Running with Mock Inference

```bash
docker run -d \
  --name cacophony-staging \
  -p 24161:24161 \
  -e INFERENCE_PROVIDER=mock \
  -e DEFAULT_EXECUTION_MODE=auto \
  -e NODE_ENV=production \
  -v cacophony-data:/app/data \
  cacophony:staging
```

### Validating Health and Readiness

Query the health endpoint to confirm operational status:

```bash
curl -f http://localhost:24161/api/health
```

Expected JSON response:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptimeSeconds": 12,
  "inferenceProvider": "mock",
  "activeEpoch": 1
}
```

## Public Showcase Hosting (Heroku / Fly.io / Container PaaS)

### heroku.yml Configuration

When deploying via Git-based container registries:

```yaml
build:
  docker:
    web: Dockerfile
run:
  web: bin/cacophony start-daemon
```

Configure environment configuration:

```bash
heroku config:set INFERENCE_PROVIDER=mock NODE_ENV=production
```

## Security and Tenancy Considerations

1. **Ephemeral Sandboxing**: Ensure write paths for isolated worktrees (`/tmp` or `/app/workspaces`) have appropriate filesystem quotas.
2. **Secrets Protection**: Do not bake API tokens or Gitea passwords into image layers; always inject them at runtime via environment variables or secret vaults.
3. **Public Exposure**: For internet-facing deployments, configure TLS termination and rate limiting at reverse proxy layer (e.g. Nginx, Caddy, or Cloudflare).
