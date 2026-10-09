# Contributor Hardware Guide: Running Cacophony on Heterogeneous Systems

This guide explains how external contributors can configure and run the autonomous Cacophony local model arena on different hardware architectures.

## Supported Hardware Architectures

Cacophony features native zero-configuration auto-detection and pluggable hardware telemetry across multiple compute platforms:

1. **AMD APU & RDNA GPUs (Vega / Navi / Strix / Phoenix)**
   - Utilizes direct Linux kernel sysfs interfaces (`/sys/class/drm` and `/sys/class/hwmon`) and ROCm `/dev/kfd`.
   - Native thermal pacing via `ThermalGovernor` prevents thermal throttling during 24/7 autonomous loops.
   - Recommended Docker Compose profile: `amd`.

2. **NVIDIA CUDA GPUs (Ampere, Ada Lovelace, Hopper, Pascal, Turing)**
   - Leverages NVML and `nvidia-smi` telemetry reporting per-GPU VRAM usage, temperature, power draw in Watts, and SM compute utilization.
   - Automatically enables Flash Attention and parallel worker threads.
   - Recommended Docker Compose profile: `nvidia`.

3. **Apple Silicon (M1 / M2 / M3 / M4 Pro / Max / Ultra)**
   - Leverages unified memory architecture and macOS thermal pressure telemetry (`Nominal`, `Fair`, `Serious`, `Critical`).
   - Maps thermal pressure directly to scheduler delays to ensure silent and sustained execution.
   - Recommended Docker Compose profile: `default`.

4. **Intel Arc / Iris Xe & CPU Fallback**
   - Fallback provider utilizing Node.js operating system telemetry (`os.totalmem()`, `os.freemem()`, load averages) and sysfs thermal zones.
   - Safe allocations suitable for lightweight developer machines.
   - Recommended Docker Compose profile: `cpu`.

---

## Quickstart Hardware Onboarding

### 1. Run Automated Hardware Profiler
Run the onboarding detector script to inspect host accelerators, available memory, and compute profiles:

```bash
# Dry run inspection (non-destructive)
bash bin/setup-hardware.sh --dry-run

# Automatically configure .env for detected hardware
bash bin/setup-hardware.sh
```

### 2. Configure Docker Compose Profile

Select the profile corresponding to your accelerator architecture:

- **Standard / Default (Native Host Ollama)**:
  ```bash
  docker compose up -d
  ```

- **NVIDIA GPU Acceleration**:
  Ensure the NVIDIA Container Toolkit is installed (`nvidia-container-toolkit`).
  ```bash
  docker compose --profile nvidia up -d
  ```

- **AMD ROCm / APU Acceleration**:
  Ensure `/dev/kfd` and `/dev/dri` are accessible by the video and render user groups.
  ```bash
  docker compose --profile amd up -d
  ```

- **CPU-Only / Lightweight Mode**:
  Runs without GPU device pass-through or privileged sysfs mounts:
  ```bash
  docker compose --profile cpu up -d
  ```

---

## Zero-Config Hyperparameter Auto-Sizing

The `HardwareHyperparameterAutoSizer` calculates optimal runtime parameters based on detected total VRAM:

| VRAM Tier | Safe Allocation (70%) | Context Window | Parallel Streams | Recommended Model |
| :--- | :--- | :--- | :--- | :--- |
| **<= 6 GB** | ~4.2 GB | 4,096 tokens | 1 | `qwen2.5-coder:7b-instruct-q4_K_M` |
| **8 GB** | ~5.7 GB | 8,192 tokens | 1 | `qwen2.5-coder:7b-instruct-q4_K_M` |
| **12 GB** | ~8.6 GB | 16,384 tokens | 1 | `qwen2.5-coder:7b-instruct-q4_K_M` |
| **16 GB** | ~11.4 GB | 16,384 tokens | 2 | `qwen2.5-coder:14b-instruct-q4_K_M` |
| **24 GB** | ~17.2 GB | 32,768 tokens | 2 | `deepseek-coder-v2:16b` |
| **64 GB+** | ~45.8 GB | 65,536 tokens | 4 | `deepseek-coder-v2:latest` |

---

## Verifying Telemetry Health

After starting the container stack, check that hardware telemetry is actively sampling:

```bash
# Verify daemon status and queue length
curl -s http://localhost:24161/api/status

# Verify live hardware telemetry snapshot
curl -s http://localhost:24161/api/telemetry/snapshot
```
