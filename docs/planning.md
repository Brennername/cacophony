# Active Feature Planning & Taskcade Specification (`docs/planning.md`)

> [!IMPORTANT]
> **Operational Purpose & Authoring Directive:**
> This document serves as the formal architectural bridge between long-term conceptual ideas ([`docs/future.md`](file:///home/nexen/projects/cacophony/docs/future.md)) and executable work phases in [`docs/taskcade.md`](file:///home/nexen/projects/cacophony/docs/taskcade.md).
> Only features that have been explicitly selected and approved by the user for active design and implementation are documented here.
> For each selected feature, the AI assistant must:
> 1. Formulate clear architectural designs, contracts, interfaces, and database schemas adhering to SOLID principles and strict typing.
> 2. Break down the design into structured, numbered phases with atomic subtasks.
> 3. Define explicit automated verification gates (unit, integration, and e2e tests).
> 4. Export the finalized phases directly into [`docs/taskcade.md`](file:///home/nexen/projects/cacophony/docs/taskcade.md) to drive execution.

---

## 1. Selected Features for Current Execution Era

### 1.1 Authentik & Authelia Enterprise SSO Provider Integration
- **Objective**: Replace Gitea as identity provider with Authentik (OIDC/OAuth2) and provide adapter for Authelia.
- **Architectural Scope**:
  - Container compose definitions for Authentik server, worker, and Redis cache.
  - Pluggable `ISsoProvider` interface with `AuthentikOAuthProvider` and `AutheliaSsoProvider` implementations.
  - Automated blueprint onboarding script (`bin/bootstrap-authentik.sh`) avoiding manual UI setup.
- **Assigned Taskcade Phase**: Phase 17 (`spec:AuthentikArchitecture`, `spec:AuthentikOnboarding`).

### 1.2 Full-Stack Real Data Pipeline & Elimination of Mocks
- **Objective**: Purge all hardcoded mock signals (`ArenaStateStore`, `HistoryMetricsService`, `RepoMapViewerComponent`, `CheckpointTimelineComponent`, `LspTestLoopPanelComponent`) and wire 100% of data flow to real database repositories and sysfs sensor streams.
- **Architectural Scope**:
  - Dedicated Angular data services (`TaskApiService`, `ProcessMonitorService`, `TelemetryStreamService`, `HistoryApiService`, `RepoMapApiService`, `GitCheckpointApiService`).
  - Backend REST API expansion (`GET /api/history`, `GET /api/models/leaderboard`, `GET /api/processes`, `GET /api/repomap`, `GET /api/checkpoints`).
  - Hardened SSE streaming protocol with heartbeat pings and event filtering.
- **Assigned Taskcade Phase**: Phase 18 (`spec:EliminateFrontendMocks`, `spec:BackendApiExpansion`).

### 1.3 Network-Agnostic URL Resolution & Multi-Device Access
- **Objective**: Support access from any device (phone over Wi-Fi LAN, VPN, reverse proxy domain) without hardcoding `localhost`.
- **Architectural Scope**:
  - Host header inspection (`X-Forwarded-Host`, `Host`) dynamically formatting redirect URIs and API endpoints.
  - Cross-Origin Resource Sharing (CORS) and CSP rules adapting to client ingress IP.
- **Assigned Taskcade Phase**: Phase 19 (`spec:DynamicHostResolution`).

### 1.4 Mobile-First Routed Navigation & High-Density Desktop Layout
- **Objective**: Replace monolithic single-page forever-scroll with modular Angular child routing (`/dashboard`, `/queue`, `/history`, `/models`, `/repomap`, `/processes`, `/settings`), mobile slide-out drawer, mobile bottom navigation bar, and dense auto-fitting desktop grid.
- **Architectural Scope**:
  - Angular Router configuration with standalone lazy-loaded view components.
  - Mobile bottom navigation bar and slide-out hamburger drawer with WCAG tap targets > 48px.
  - CSS Grid with `grid-auto-flow: dense` eliminating empty column gaps on desktop displays.
- **Assigned Taskcade Phase**: Phase 20 (`spec:AngularRouting`, `spec:DesktopGridOptimization`).

### 1.5 Real-Time Task Progress, Granular Stages & Gantt Transport
- **Objective**: Granular multi-stage progress tracking (`1/7 Planning` through `7/7 PR Review`) with progress bars, intra-stage token velocity, and audio DAW-inspired interactive Gantt timeline.
- **Architectural Scope**:
  - Segmented progress bar components and intra-stage token velocity gauges.
  - `GanttTransportComponent` rendering concurrent model inference, background test runs, and git operations on stacked swimlanes.
- **Assigned Taskcade Phase**: Phase 21 (`spec:MultiLevelProgress`, `spec:GanttTransportTimeline`).

### 1.6 Historical Failure Taxonomy & Area-Under-Curve (AOC) Visualizations
- **Objective**: Deterministic error categorization and KDE System Monitor aesthetic multi-series trend lines with shaded area-under-curve visualizations.
- **Architectural Scope**:
  - `FailureClassifier` mapping errors to normalized categories (`SYNTAX_ERROR`, `TEST_ASSERTION_FAILURE`, etc.).
  - Lightweight SVG `TrendChartComponent` rendering semi-transparent AOC graphs and interactive hover tooltips.
- **Assigned Taskcade Phase**: Phase 22 (`spec:FailureTaxonomy`, `spec:AocCharts`).

### 1.7 AST Code Signature Compression & Mechanistic Interface Enforcement
- **Objective**: Maximize local model first-pass success rate by extracting deep AST signature maps, exposing queryable MCP tools, and mechanistically aligning hallucinations before test execution.
- **Architectural Scope**:
  - `SignatureHarvester` extracting compact type shapes and constructor overloads across TypeScript, Java, and Go.
  - Model Context Protocol (MCP) tools: `query_data_shape`, `query_functional_interface`, `query_overload_map`.
  - `SignatureAlignmentScrubber` deterministically correcting parameter typos and mismatched argument orders.
- **Assigned Taskcade Phase**: Phase 23 (`spec:SignatureMapExtraction`, `spec:MechanisticCorrection`).

### 1.8 Distributed Multi-Node Fleet Architecture & Hardware Profiling
- **Objective**: Multi-machine coordinator/worker cluster with automated hardware profiling across NVIDIA, modern AMD RDNA, and Apple Silicon nodes.
- **Architectural Scope**:
  - `FleetMasterCoordinator` scheduling tasks across remote worker daemons over persistent WebSockets.
  - Hardware telemetry providers for NVML, AMD RDNA, and macOS `powermetrics`.
  - Hardware benchmark suite establishing optimal batch sizes and context limits per card.
- **Assigned Taskcade Phase**: Phase 24 (`spec:FleetTopology`, `spec:HardwareProfiling`).

### 1.9 Composable Deterministic Repair Rule DSL & Pipeline Chaining
- **Objective**: Provide a fully whiteboxed, declarative Domain-Specific Language (DSL) and execution engine for deterministic code repairs, mitigations, and validations. Rules can be toggled on/off, parameterized, sequenced into pipelines, and assigned distinct severity levels (`silent_repair`, `soft_warning`, `hard_rejection`, `disabled`). Prevents over-aggressive deterministic mitigations from rejecting workable LLM code and driving up false failure rates.
- **Architectural Scope**:
  - Declarative DSL syntax (supporting both JSON/YAML declarative AST and human-readable pipeline script format).
  - Pluggable `IRepairRule<TContext, TResult>` abstraction with lifecycle execution hooks: `PRE_GENERATION`, `POST_GENERATION`, `PRE_TEST`, `POST_TEST`.
  - Core Rule Catalog: `StripEmojisRule`, `EnforceEsmJsExtensionRule`, `BannedImportScrubberRule`, `LooseRootFileGuardRule`, `EmptyFileGuardRule`, `PlaceholderStubDetectorRule`, `AstSignatureAlignRule`, `TypeScriptDiagnosticRepairRule`.
  - Pipeline chaining engine (`RulePipelineEngine`) supporting short-circuiting, fallbacks, dry-run simulations, and execution telemetry logging.
- **Assigned Taskcade Phase**: Phase 25 (`spec:RuleDslArchitecture`, `spec:CoreRuleCatalog`, `spec:PipelineExecutionEngine`).

### 1.10 Historical Arena Telemetry Ingestion & Decoupled Baseline Import
- **Objective**: Import and normalize historical empirical arena telemetry from legacy external directories (`~/projects/drumalyzer/data/arena/` containing 3,584+ task runs, postmortems, lineage trees, and patch diffs) into clean, typed Cacophony PGlite database schemas. Decouple Cacophony entirely from legacy bash/js tooling while leveraging the empirical data to seed hyperparameter searches.
- **Architectural Scope**:
  - `HistoricalArenaIngestionAdapter`: Safely parses legacy `.arena.json`, `stats.json`, `completed/`, `failed/`, `exhausted/`, and `postmortems/` files without executing legacy shell or JS scripts.
  - Telemetry Normalizer: Maps legacy failure categories (`review_failed: 1049`, `validation_failed: 134`, `disallowed_root_files: 84`, `test_failed: 167`, `no_changes_produced: 1520`) into structured `task_stages` and `failure_taxonomies`.
  - Mitigation Paradox Analyzer: Distinguishes true functional test failures from artificial rejections generated by deterministic verifiers, computing the false-rejection multiplier per model.
- **Assigned Taskcade Phase**: Phase 26 (`spec:HistoricalArenaIngestion`, `spec:MitigationParadoxAnalyzer`).

### 1.11 Stochastic Hyperparameter Optimization Engine for Rule Pipelines
- **Objective**: Run stochastic optimization (Random Search, Bayesian Optimization via Gaussian Process surrogate, and Genetic Pipeline Mutation) across rule selections, parameter thresholds, and sequencing order to discover optimal configurations that maximize test pass rates while minimizing false rejections and token overhead.
- **Architectural Scope**:
  - Search Space Specification: Discrete toggles (enabled/disabled), categorical severity (`silent_repair` vs `hard_rejection`), and continuous thresholds (timeout ms, AST max complexity, AST signature similarity threshold).
  - Multi-Objective Loss Formulation: $L(\theta) = -w_1 \cdot \text{PassRate} + w_2 \cdot \text{FalseRejectionRate} + w_3 \cdot \text{Latency} + w_4 \cdot \text{TokenCost}$.
  - Offline Backtest Runner: Evaluates candidate rule pipelines against historical arena task datasets without invoking live LLMs.
  - Optimal Profile Exporter: Emits tuned rule pipeline configurations per model architecture (e.g. Qwen 2.5 Coder 7B, DeepSeek R1 8B, Gemma 3 4B) and hardware profile.
- **Assigned Taskcade Phase**: Phase 26 (`spec:HyperparameterOptimizationEngine`).

### 1.12 Autonomous Hardware Feature Discovery & Whitebox Ollama Tuning
- **Objective**: Dynamically detect host GPU/APU compute capabilities using native Linux sysfs and system utilities (`lshw`, `lspci`, `lsusb`, `rocminfo`, `vulkaninfo`, `nvidia-smi`), generate whitebox systemd service overrides for Ollama, and establish tailored hardware profiles with primary optimization for the AMD Vega APU setup and full portability for NVIDIA, modern AMD RDNA, Intel Arc, and Apple Silicon.
- **Architectural Scope**:
  - Multi-tier hardware scanner probing `/sys/class/drm`, `/sys/class/kfd`, `/proc/cpuinfo`, PCI vendor IDs (`0x1002` AMD, `0x10de` NVIDIA, `0x8086` Intel), unified memory aperture, and compute ring watchdog timeouts.
  - Ollama systemd override generator emitting `/etc/systemd/system/ollama.service.d/override.conf` and `modprobe.d/amdgpu.conf` with transparent diff preview and safety checks.
  - Pre-calibrated hardware profiles:
    - AMD Vega APU (Default): `OLLAMA_IGPU_ENABLE=1`, `OLLAMA_VULKAN=1`, `OLLAMA_FLASH_ATTENTION=0`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1`, `OLLAMA_KEEP_ALIVE=-1`, `HSA_OVERRIDE_GFX_VERSION=9.0.0`, kernel `amdgpu.lockup_timeout=60000`.
    - AMD RDNA2/3: Native ROCm 6.x, `HSA_OVERRIDE_GFX_VERSION=10.3.0`/`11.0.0`, flash attention enabled.
    - NVIDIA CUDA: `CUDA_VISIBLE_DEVICES`, flash attention enabled, multi-model concurrency.
    - Apple Silicon & CPU: Metal acceleration, thread pool affinity matching P-cores/E-cores.
  - Automated micro-benchmark suite measuring real eval tok/s, prompt ingestion tok/s, and VRAM stability across context windows (2k, 4k, 8k, 16k, 32k).
- **Assigned Taskcade Phase**: Phase 27 (`spec:HardwareProbingEngine`, `spec:OllamaWhiteboxTuning`, `spec:HardwareBenchmarking`).

### 1.13 Stochastic Exploration Scheduler & Multi-Armed Bandit Model Selection
- **Objective**: Prevent local minima in task scheduling by introducing an epsilon-greedy ($\epsilon \approx 0.10 - 0.15$) and Upper Confidence Bound (UCB-1 / Thompson Sampling) bandit dispatcher that periodically samples exploratory configurations (e.g. larger context windows like 8k/16k, non-default models assigned to roles, alternative sampling temperatures) to collect empirical telemetry and dynamically promote successful candidates on retries and future tasks.
- **Architectural Scope**:
  - Epsilon-Greedy Exploration Policy: $P(\text{explore}) = \epsilon$, uniformly or softmax-sampling from qualified candidate models and extended context tiers; $P(\text{exploit}) = 1 - \epsilon$, selecting the highest-ranked model from historical leaderboard.
  - Context Window Tier Stepper: Dynamically probes 4k -> 8k -> 16k -> 32k context allocations based on task prompt token volume and GPU memory headroom.
  - Bayesian Win-Rate Updater: Continuously adjusts posterior distribution $Beta(\alpha + \text{wins}, \beta + \text{losses})$ per model-role pair, rewarding verified code generation (+1.0) and penalizing crash/timeout (-1.0).
  - Dynamic Retry Routing: Escalates failed tasks along an empirical decision tree informed by bandit affinity scores rather than hardcoded fallbacks.
  - Mobile-First Telemetry UI: Angular widgets displaying exploration rate controls, Thompson sampling confidence intervals, and Pareto-frontier scatter plots.
- **Assigned Taskcade Phase**: Phase 28 (`spec:BanditScheduler`, `spec:ContextAndRoleExploration`, `spec:DynamicPromotionEngine`, `spec:StochasticUiDashboard`).

---

## 2. Core Architectural Interfaces & Contracts

### 2.1 Rule DSL & Execution Contracts
```typescript
/** Severity level governing rule evaluation outcome */
export type RuleSeverity = "silent_repair" | "soft_warning" | "hard_rejection" | "disabled";

/** Lifecycle execution phases where rules can intercept */
export type RuleLifecycleHook = "pre_generation" | "post_generation" | "pre_test" | "post_test";

/** Context passed into rule evaluation */
export interface RuleEvaluationContext {
  readonly taskId: string;
  readonly modelId: string;
  readonly projectDir: string;
  readonly filesModified: readonly string[];
  readonly promptText?: string;
  readonly rawOutputText?: string;
  readonly hardwareProfileId: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Diagnostic issue emitted during rule evaluation */
export interface RuleDiagnostic {
  readonly ruleId: string;
  readonly file?: string;
  readonly line?: number;
  readonly severity: RuleSeverity;
  readonly message: string;
  readonly remediationApplied?: string;
}

/** Result of single rule execution */
export interface RuleExecutionResult {
  readonly ruleId: string;
  readonly passed: boolean;
  readonly modifiedFiles: readonly string[];
  readonly diagnostics: readonly RuleDiagnostic[];
  readonly durationMs: number;
}

/** Pluggable rule interface */
export interface IRepairRule {
  readonly id: string;
  readonly description: string;
  readonly hook: RuleLifecycleHook;
  readonly defaultSeverity: RuleSeverity;
  evaluate(context: RuleEvaluationContext, options: Readonly<Record<string, unknown>>): Promise<RuleExecutionResult>;
}

/** Composable pipeline definition */
export interface IRulePipeline {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly targetModelPattern?: string;
  readonly targetHardwareProfile?: string;
  readonly rules: ReadonlyArray<{
    readonly ruleId: string;
    readonly enabled: boolean;
    readonly severity: RuleSeverity;
    readonly options: Readonly<Record<string, unknown>>;
  }>;
}
```

### 2.2 Hardware Discovery & Ollama Tuning Contracts
```typescript
export type GpuVendor = "amd" | "nvidia" | "intel" | "apple" | "cpu_only";

export interface GpuDeviceCandidate {
  readonly pciAddress: string;
  readonly vendor: GpuVendor;
  readonly modelName: string;
  readonly architecture: string; // e.g. "Vega / gfx900", "RDNA3 / gfx1100", "Ada Lovelace"
  readonly vramBytes: number;
  readonly isApu: boolean;
  readonly isPrimaryDisplay: boolean;
  readonly computeBackendsSupported: readonly ("vulkan" | "rocm" | "cuda" | "metal" | "cpu")[];
}

export interface HardwareDiscoveryReport {
  readonly hostname: string;
  readonly kernelVersion: string;
  readonly cpuModel: string;
  readonly totalSystemMemoryBytes: number;
  readonly devices: readonly GpuDeviceCandidate[];
  readonly recommendedProfileId: string;
  readonly detectedBottlenecks: readonly string[];
}

export interface OllamaEnvironmentOverride {
  readonly targetServiceFile: string;
  readonly environmentVariables: Readonly<Record<string, string>>;
  readonly kernelModuleParameters?: Readonly<Record<string, string>>;
  readonly explanation: string;
}
```

### 2.3 Stochastic Hyperparameter Search & Exploration Contracts
```typescript
export interface RuleHyperparameterSearchSpace {
  readonly pipelineId: string;
  readonly ruleToggles: Readonly<Record<string, readonly boolean[]>>;
  readonly ruleSeverities: Readonly<Record<string, readonly RuleSeverity[]>>;
  readonly numericParameters: Readonly<Record<string, { readonly min: number; readonly max: number; readonly step: number }>>;
}

export interface HyperparameterOptimizationCandidate {
  readonly candidateId: string;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly predictedPassRate: number;
  readonly falseRejectionRate: number;
  readonly score: number;
}

export interface BanditModelOption {
  readonly modelId: string;
  readonly role: string;
  readonly contextTierTokens: number;
  readonly alpha: number; // Beta distribution wins
  readonly beta: number;  // Beta distribution losses
  readonly totalTrials: number;
  readonly averageTokensPerSecond: number;
}

export interface ExplorationDecision {
  readonly isExploratory: boolean;
  readonly selectedModelId: string;
  readonly selectedContextTokens: number;
  readonly explorationReason: string;
  readonly candidatePoolSize: number;
}
```
