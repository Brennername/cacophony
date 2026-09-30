# Hardware Diagnostics & Telemetry Specification

## 1. Overview

Cacophony features an abstract hardware diagnostic telemetry engine designed to monitor low-level system metrics on the host machine across diverse acceleration hardware (APUs, discrete GPUs, TPUs, and full CPU fallback). The reference baseline profile targets the **AMD Cezanne / Vega APU (amdgpu)** architecture, providing deep insight into GPU utilization, VRAM usage, GTT memory, temperature, core voltage, electrical wattage, and clock speeds, similar to KDE System Monitor widgets.

---

## 2. AMD Vega / Cezanne APU Sysfs Telemetry Architecture

On Linux kernels with the `amdgpu` driver, hardware telemetry is exposed via two primary kernel interfaces:
1. **DRM Subsystem (`/sys/class/drm/card*/device/`)**: Core GPU load and memory allocation statistics.
2. **Hwmon Subsystem (`/sys/class/hwmon/hwmon*/`)**: Thermal sensors, voltages, power usage, and clock frequencies.

### 2.1 DRM Memory & Load Metrics

| Metric | Sysfs Path | Units / Format | Calculation |
| :--- | :--- | :--- | :--- |
| **GPU Busy Load** | `/sys/class/drm/card1/device/gpu_busy_percent` | Integer percentage `0-100` | Direct parse: `parseInt(val, 10)` |
| **VRAM Used** | `/sys/class/drm/card1/device/mem_info_vram_used` | Integer bytes | `bytes / (1024 * 1024)` for MB |
| **VRAM Total** | `/sys/class/drm/card1/device/mem_info_vram_total` | Integer bytes | `bytes / (1024 * 1024)` for MB |
| **VRAM Utilization %** | Derived | Float percentage | `(vram_used / vram_total) * 100` |
| **GTT Memory Used** | `/sys/class/drm/card1/device/mem_info_gtt_used` | Integer bytes | System RAM shared memory used |
| **GTT Memory Total** | `/sys/class/drm/card1/device/mem_info_gtt_total` | Integer bytes | System RAM shared memory total |

### 2.2 Hwmon Sensor Metrics (AMDGPU Driver)

The telemetry provider scans `/sys/class/hwmon/hwmon*` to dynamically locate the directory containing `name` equal to `amdgpu`. On the reference Vega machine, this maps to `/sys/class/hwmon/hwmon2`.

| Metric | Attribute File | Label File | Units / Scaling | Calculation |
| :--- | :--- | :--- | :--- | :--- |
| **Edge Temperature** | `temp1_input` | `temp1_label` ("edge") | Millidegrees Celsius | `parseInt(val, 10) / 1000` -> °C |
| **Core Voltage** | `in0_input` | `in0_label` ("vddgfx") | Millivolts (mV) | Direct parse: `parseInt(val, 10)` -> mV |
| **SoC Voltage** | `in1_input` | `in1_label` ("vddnb") | Millivolts (mV) | Direct parse: `parseInt(val, 10)` -> mV |
| **Package Power (PPT)** | `power1_input` | `power1_label` ("PPT") | Microwatts (uW) | `parseInt(val, 10) / 1000000` -> Watts |
| **Core Clock (SCLK)** | `freq1_input` | `freq1_label` ("sclk") | Hertz (Hz) | `parseInt(val, 10) / 1000000` -> MHz |

---

## 3. Inference Engine Telemetry Integration (Ollama & OpenAI-Compatible)

In addition to hardware sensors, the telemetry engine correlates hardware consumption with the active model state by polling the inference runtime. While Ollama is configured as the default local runtime, the telemetry provider interface is architected for generic OpenAI-compatible inference backends as well:

- Endpoint: `GET http://<host>:11434/api/ps`
- Response Payload Structure:
  ```json
  {
    "models": [
      {
        "name": "qwen2.5-coder:7b",
        "model": "qwen2.5-coder:7b",
        "size": 4683075584,
        "digest": "...",
        "details": { "format": "gguf", "family": "qwen2", "parameter_size": "7.6B", "quantization_level": "Q4_K_M" },
        "expires_at": "0001-01-01T00:00:00Z",
        "size_vram": 4683075584
      }
    ]
  }
  ```
- **Telemetry Enrichment**: The engine pairs `models[0].name` and `models[0].size_vram` with the DRM VRAM readings to visualize exact model memory allocation vs total available VRAM in the Angular UI.

---

## 4. Thermal Throttling & Pacing Thresholds

To safeguard APU compute stability and prevent hardware thermal degradation during sustained 24/7 autonomous operation:

```text
  Temperature (°C)
  100°C ──────────────────────────────────
   90°C ──[ Danger Zone ] ──> Active 10s Pause Loop (Wait until < 80°C)
   80°C ──[ Elevated ]    ──> 15-second Cooldown Delay between tasks
   70°C ──[ Warm ]        ──> 5-second Pacing Breath between tasks
    0°C ──[ Nominal ]     ──> 0-second Delay
```

- **Nominal Zone (< 70°C)**: Hardware operating under safe continuous envelope. New tasks execute immediately upon preceding task completion.
- **Warm Zone (70°C – 79°C)**: 5-second pacing breath inserted before next inference dispatch.
- **Elevated Zone (80°C – 89°C)**: 15-second active cooling delay inserted between task stages.
- **Danger Zone (≥ 90°C)**: Execution lock engaged. Scheduler suspends task pipeline and re-evaluates temperature in 10-second polling intervals until temperature subsides below 80°C.

---

## 5. Cross-Platform Fallback Strategy

When running in environments where direct `/sys/class/drm` or `/sys/class/hwmon` nodes are restricted or non-AMD GPUs are detected, the telemetry layer gracefully falls back:

1. **Linux `sensors` CLI**: Parses output of `sensors -j` or regex patterns for `Tctl`, `edge`, or CPU package temperature.
2. **RadeonTop CLI**: If `radeontop -d - -l 1` is present on the path, parses live GPU busy percentage and VRAM.
3. **NVIDIA `nvidia-smi`**: If NVIDIA GPU is detected, executes `nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw --format=csv,noheader,nounits`.
4. **Mock / Containerized Fallback**: When running inside an isolated CI container without hardware device pass-through, emits simulated telemetry metrics to ensure all dashboard meters and charts render reliably during testing.

---

## 6. UMA VRAM Profiles & Model Fleet Allocation (Ryzen 9 5900HX / Vega APU)

### 6.1 VRAM Allocation Profiles (8GB vs 10GB vs 16GB UMA)

On AMD APU architectures with Unified Memory Architecture (UMA), the VRAM envelope allocated in BIOS dictates both the viable model parameter class and the available KV-cache headroom:

| Allocation Profile | Usable Model VRAM | Reserved System RAM | Recommended Active Models | Operational Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **8GB UMA** | ~6.0 GB | ~2.0 GB OS / Services | `qwen2.5-coder:3b` (1.9 GB)<br>`gemma3:4b-it-qat-4k` (4.0 GB) | High-speed lightweight execution; avoids VRAM swap to system RAM. |
| **10GB UMA** | ~8.0 GB | ~2.0 GB OS / Services | `qwen2.5-coder:7b-instruct-q4_K_M` (4.7 GB)<br>`phi4-mini:latest` (2.5 GB) | Standard sweet spot for 7B coding models with smooth desktop operation. |
| **16GB UMA** | ~13.5 GB | ~2.5 GB OS / Services | `qwen2.5-coder:7b-instruct-q4_K_M` (4.7 GB)<br>`deepseek-r1:8b-4k` (5.2 GB) | **Dual-Model Co-Residency**: Both models pinned simultaneously via `keep_alive: -1`. |

### 6.2 The 14B Parameter Class Math & APU Bandwidth Limits
Dense 14B models (e.g. `qwen2.5-coder:14b`, `phi4:latest`, or `deepseek-r1:14b`) require **9.0 GB to 9.5 GB** for quantized weights alone. On a 16GB UMA configuration:
1. Model weights occupy ~9.5 GB, leaving < 6.5 GB for KV-cache and system memory.
2. Context windows extending past 8,192 tokens balloon KV-cache allocations, triggering system page swapping.
3. Due to shared DDR4 system memory bandwidth on mobile APUs, memory swapping collapses generation throughput from 8-10 tok/s down to 2-3 tok/s.
4. **Guideline**: Coder models in the automated worker loop should be constrained to 3B-7B parameter classes or dense 14B models with strict 4k context limits (`-4k`).

### 6.3 Strategic Role Tiering vs. Unified Dense Execution
- **Unified Dense Worker Loop (Primary)**: Use `qwen2.5-coder:7b-instruct-q4_K_M` and `qwen2.5-coder:3b` for automated code generation. They output formatted code blocks directly without verbose `<think>` internal monologues, easily finishing inside 180s timeouts.
- **Segregated Reasoning (Phase 77)**: Restrict reasoning models (`deepseek-r1:8b-4k`) strictly to Stage 1 (Planning) or manual debugging via the UI. Isolate cognitive traces from Stage 2 (Generation) to prevent parser collisions.
- **Model Pruning Invariant**: Always prioritize `-4k` variants (e.g. `deepseek-r1:8b-4k`, `gemma3:4b-it-qat-4k`) over unconstrained context variants to eliminate memory fragmentation on Vega APU architectures.

