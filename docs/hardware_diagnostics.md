# Hardware Diagnostics & Telemetry Specification

## 1. Overview

Cacophony features an abstract hardware diagnostic telemetry engine designed to monitor low-level system metrics on the host machine across diverse acceleration hardware (APUs, discrete GPUs, TPUs, and full CPU fallback). The reference baseline profile targets the **AMD Cezanne / Vega APU (amdgpu)** architecture, providing deep insight into GPU utilization, VRAM usage, GTT memory, temperature, core voltage, electrical wattage, and clock speeds, identical to KDE System Monitor widgets.

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
