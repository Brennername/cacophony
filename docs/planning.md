# Active Feature Planning & Taskcade Specification (`docs/planning.md`)

> [!IMPORTANT]
> **Operational Purpose & Authoring Directive:**
> This document serves as the formal architectural bridge between long-term conceptual ideas ([`docs/future.md`](future.md)) and executable work phases in [`docs/taskcade.md`](taskcade.md).
> Only features that have been explicitly selected and approved by the user for active design and implementation are documented here.
> For each selected feature, the AI assistant must:
> 1. Formulate clear architectural designs, contracts, interfaces, and database schemas adhering to SOLID principles and strict typing.
> 2. Break down the design into structured, numbered phases with atomic subtasks.
> 3. Define explicit automated verification gates (unit, integration, and e2e tests).
> 4. Export the finalized phases directly into [`docs/taskcade.md`](taskcade.md) to drive execution.

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
- **Objective**: Granular multi-stage progress tracking (`1/7 Planning` through `7/7 PR Review`) with progress bars, intra-stage token velocity, and Gantt timeline.
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

### 1.10 Historical Arena Telemetry Ingestion & Versioned Dataset Import
- **Objective**: Import and normalize historical empirical arena telemetry from versioned dataset archives (`data/arena/` containing historical task runs, postmortems, lineage trees, and patch diffs) into clean, typed Cacophony database schemas. Decouple Cacophony entirely from external legacy project directories while leveraging empirical data across schema versions to seed hyperparameter searches.
- **Architectural Scope**:
  - `HistoricalArenaIngestionAdapter`: Safely parses dataset archives across schema versions (`v1.0.0` legacy format without manifest, and `v2.0.0` canonical specification containing `manifest.json`), reading `stats.json`, `completed/`, `failed/`, `exhausted/`, and `postmortems/`.
  - Telemetry Normalizer: Maps raw failure categories (`review_failed`, `validation_failed`, `disallowed_root_files`, `test_failed`, `no_changes_produced`) into structured `task_stages` and `failure_taxonomies`.
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
    - AMD Vega APU (Default): `OLLAMA_IGPU_ENABLE=1`, `OLLAMA_VULKAN=1`, `OLLAMA_FLASH_ATTENTION=0`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1`, `OLLAMA_KEEP_ALIVE=-1`, `HSA_OVERRIDE_GFX_VERSION=9.0.0`, kernel `amdgpu.lockup_timeout=180000`.
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
### 1.14 Dynamic Ollama Model Lifecycle Management & Multi-Tenant Hardware Adaptation
- **Objective**: Provide automated control of Ollama model selection, benchmarking candidate models, pulling new models, and evicting underperforming models based on hardware profile, while strictly enforcing user tenancy guardrails and whitelist protections.
- **Architectural Scope**:
  - `OllamaModelManager`: Communicates directly with the Ollama REST engine (`/api/tags`, `/api/pull`, `/api/delete`, `/api/show`).
  - `ModelTenancyGuard`: Protects external-use models (whitelisted via `protectedModels`) from automated deletion, enforces disk quotas, and allows disabling automated management altogether (`managedModelsEnabled: false`).
  - `ModelBenchmarkRunner`: Standardized synthetic coding benchmark assessing real tok/s and AST validity on the host hardware profile.
  - Automated Eviction Governor: Safely purges non-whitelisted degraded models when disk space or consecutive failure limits are exceeded.
- **Assigned Taskcade Phase**: Phase 75 (`spec:OllamaModelManager`, `spec:ModelTenancyGuard`, `spec:ModelBenchmarkRunner`).

### 1.15 Frontend Model Fleet Manager, Download Terminal & Tenancy Controls
- **Objective**: Transform the models view (`/models`) into an interactive Fleet Management Console allowing operators to inspect installed models, trigger new downloads with real-time piped terminal logs, manage eviction policies, and configure tenancy protections.
- **Architectural Scope**:
  - Installed Model Grid: Hardware suitability badges, parameter count, quantization, memory footprint, and protected tenancy pills.
  - `ModelPullModalComponent`: Searchable catalog with curated tags and a piped terminal log viewer streaming server stdout/stderr (`model_pull_progress`).
  - Tenancy Settings Panel: Interactive protected model whitelist tags, storage quota limits, and automated eviction toggles.
- **Assigned Taskcade Phase**: Phase 76 (`spec:ModelFleetConsole`, `spec:ModelPullTerminal`, `spec:TenancyConfigPanel`).

### 1.16 Reasoning Model `<think>` Stream Separation, Distillation & Opinion Synthesis
- **Objective**: Segregate raw `<think>...</think>` cognitive traces from executable code output in real-time, distill the reasoning into atomic opinions, and provide differentiated frontend views and prompt engineering tailored per model archetype.
- **Architectural Scope**:
  - `ReasoningStreamDemuxer`: Dual-channel stateful parser demuxing streaming tokens into `reasoning_chunk` and `code_chunk` events.
  - `ReasoningDistillationService`: Distills verbose thought transcripts into an atomic `ModelOpinionRecord` for Mixture of Experts (MoE) consensus planning.
  - Differentiated Model Views: Collapsible Cognitive Trace with thinking velocity for reasoning models (R1, o-series, thinking Qwen) vs. dense syntax/diff views for direct coders.
  - Database schema expansion: Persisting reasoning transcripts and distilled opinions in `task_stages`.
- **Assigned Taskcade Phase**: Phase 77 (`spec:ReasoningStreamDemuxer`, `spec:ReasoningDistillation`, `spec:DifferentiatedModelViews`).

### 1.17 End-to-End In-House Pull Request Lifecycle & Review Pipeline (Gitea + GitHub Compatibility)
- **Objective**: Establish a complete in-house pull request and review workflow operating in ephemeral git worktrees with cross-platform support for both Gitea (local self-hosted) and GitHub (remote/enterprise), complete with automated PR code reviews and merge gates.
- **Architectural Scope**:
  - `IGitPlatformProvider`: Unified abstraction supporting branch creation, pull request publication, review submission, and automated merging across Gitea and GitHub.
  - `GitWorktreeManager`: Ephemeral worktree isolation per task (`workspaces/worktree-<taskId>`) preventing working tree collisions.
  - Automated PR Reviewer: Analyzes generated diffs against specifications, SOLID principles, and test outputs with optional frontier model escalation (`FRONTIER_REVIEW_API_KEY`).
  - Frontend PR Inspector: Displays pull request status, diff comments, and review badges in task detail modals.
- **Assigned Taskcade Phase**: Phase 78 (`spec:GitPlatformProvider`, `spec:WorktreeIsolation`, `spec:AutomatedPrReviewPipeline`).

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
export type ComputeHardwareVendor = "amd" | "nvidia" | "intel" | "apple" | "tpu" | "cpu_only";

export interface ComputeDeviceCandidate {
  readonly pciAddress: string;
  readonly vendor: ComputeHardwareVendor;
  readonly modelName: string;
  readonly architecture: string; // e.g. "Vega / gfx900", "RDNA3 / gfx1100", "Ada Lovelace", "TPU v4", "x86_64"
  readonly vramBytes: number;
  readonly isApu: boolean;
  readonly isPrimaryDisplay: boolean;
  readonly computeBackendsSupported: readonly ("vulkan" | "rocm" | "cuda" | "metal" | "tpu" | "cpu")[];
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

### 2.4 Continuous Observability, AST Surface & Air-Gapped Telemetry Contracts

```typescript
export interface CompoundCompletionMetrics {
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly totalTasksSampled: number;
  readonly syntacticYieldRate: number; // Accepted lines / generated lines [0.0, 1.0]
  readonly effectiveTokenVelocity: number; // Raw tok/s * passRate
  readonly defectHalfLifeMs: number; // Mean ms to self-heal or resolve failures
  readonly astMutationDensity: number; // Functional AST mutations / raw byte diff
  readonly thermalThrottlingIncidents: number;
}

export interface SymbolCallSignature {
  readonly identifier: string;
  readonly containingFile: string;
  readonly kind: "method" | "function" | "class" | "interface" | "type_alias";
  readonly signatureHash: string;
  readonly isThirdParty: boolean;
}

export interface AstSurfaceCoverageMap {
  readonly targetPackage: string;
  readonly totalExposedSymbols: readonly SymbolCallSignature[];
  readonly exercisedSymbols: readonly SymbolCallSignature[];
  readonly unexercisedBlindspots: readonly SymbolCallSignature[];
  readonly coverageRatio: number; // exercised / total [0.0, 1.0]
}

export interface NuusTelemetryReport {
  readonly reportId: string;
  readonly timestamp: string;
  readonly interactionFrictionScore: number; // Computed from navigation drop-offs & latency [0.0, 1.0]
  readonly affectedComponentRoute: string;
  readonly correlatedAstNode?: string;
  readonly anonymizedActionPattern: readonly string[];
  readonly policyComplianceStatus: "COMPLIANT" | "REMEDIATION_REQUIRED" | "GUARDRAIL_BLOCKED";
}
```

### 2.5 Model Management, Reasoning Demuxer & Git Platform Contracts

```typescript
export interface ModelManagementConfig {
  readonly managedModelsEnabled: boolean;
  readonly protectedModels: readonly string[];
  readonly maxDiskStorageGb: number;
  readonly autoEvictionEnabled: boolean;
  readonly minimumSuccessRateThreshold: number;
  readonly maxConsecutiveFailuresBeforeEviction: number;
}

export interface OllamaInstalledModel {
  readonly name: string;
  readonly model: string;
  readonly modifiedAt: string;
  readonly sizeBytes: number;
  readonly digest: string;
  readonly details: {
    readonly parentModel: string;
    readonly format: string;
    readonly family: string;
    readonly families: readonly string[];
    readonly parameterSize: string;
    readonly quantizationLevel: string;
  };
  readonly isProtected: boolean;
  readonly isLoadedInVram: boolean;
}

export interface OllamaPullProgressEvent {
  readonly status: string;
  readonly digest?: string;
  readonly total?: number;
  readonly completed?: number;
  readonly percent?: number;
}

export interface ReasoningDemuxResult {
  readonly reasoningTokens: string;
  readonly executableCode: string;
  readonly containsThinking: boolean;
  readonly thinkingDurationMs?: number;
}

export interface ModelOpinionRecord {
  readonly taskId: string;
  readonly modelId: string;
  readonly summary: string;
  readonly keyDecisions: readonly string[];
  readonly tradeOffs: readonly string[];
  readonly confidenceScore: number; // [0.0, 1.0]
  readonly rawThinkingLength: number;
}

export interface PullRequestRecord {
  readonly id: string | number;
  readonly number: number;
  readonly title: string;
  readonly htmlUrl: string;
  readonly state: "open" | "closed";
  readonly headBranch: string;
  readonly baseBranch: string;
  readonly reviewStatus: "PENDING" | "APPROVED" | "CHANGES_REQUESTED";
}

export interface IGitPlatformProvider {
  readonly providerName: "gitea" | "github";
  createBranch(branchName: string, baseSha: string): Promise<void>;
  openPullRequest(title: string, body: string, headBranch: string, baseBranch: string): Promise<PullRequestRecord>;
  submitReview(prNumber: number, verdict: "APPROVE" | "REQUEST_CHANGES" | "COMMENT", commentBody: string): Promise<void>;
  mergePullRequest(prNumber: number, method: "merge" | "squash" | "rebase"): Promise<boolean>;
}
```

---

### 1.13 Multi-Stage Staging (Gitea) to Production (GitHub) Promotion Gate & Batched Promotion Pipeline
- **Objective**: Establish an automated quarantine gate and release promotion pipeline that bridges local Gitea (staging/testing) to public GitHub (production). Replaces fragmented single-file PR pushes with cohesive, semantically versioned milestone releases and verified bug fix PRs.
- **Architectural Scope**:
  - Full Monorepo Compilation Gate: Validates `@cacophony/shared-types`, `@cacophony/db`, `@cacophony/tools`, `@cacophony/engine`, and `@cacophony/frontend` build cleanly without errors before any upstream push.
  - Full Test Suite Gate: Validates 100% test pass rate across engine and frontend before promotion.
  - Secret & Policy Scrubber: Verifies zero leaked `.env` keys, zero emojis, and compliance with SOLID typing.
  - Batched Release Promotion Engine (`GitHubPromotionPipeline`): Batches completed staging tasks into versioned release PRs (e.g. `release/v1.1.0`) with automated markdown changelogs.
- **Assigned Taskcade Phase**: Phase 80 (`spec:GitHubPromotionGate`, `spec:BatchedReleaseBundler`).

---

### 1.14 Autonomous Project File Ingestion, Architectural Decomposer & Acceptance Criteria Engine
- **Objective**: Implement the Autonomous Software Factory pipeline allowing operators to drop in raw project specification files (`docs/spec.md`, `README.md`, or architecture diagrams) and have the system autonomously derive data schemas, SOLID architectural contracts, acceptance criteria, and atomic taskcade task lists.
- **Architectural Scope**:
  - `ProjectSpecIngestionService`: Ingests markdown, OpenAPI, and code files to build functional requirement models.
  - `FrontierTaskDecomposer` expansion: Automatically specifies concrete acceptance criteria, explicit focus files, and machine-executable test commands per task.
  - Topological Dependency Sorter: Orders tasks so interfaces and migrations precede implementations and UI views.
- **Assigned Taskcade Phase**: Phase 81 (`spec:SpecIngestionReader`, `spec:AcceptanceCriteriaDerivation`).

---

### 1.15 Arena Telemetry Epoching & Clean-Slate Model Health Reset Engine
- **Objective**: Provide a mathematical epoching system separating dirty bootstrap failure statistics from active operational telemetry. Allows resetting model health counters to clean baselines while preserving all historical trials for postmortems and bandit retraining.
- **Architectural Scope**:
  - Migration 015 (`015_arena_epochs.ts`): Tables `arena_epochs` and `model_health_epoch_history`.
  - `ModelHealthRepository` expansion: `advanceEpoch()`, `resetAllStats()`, and `getCurrentEpoch()`.
  - REST API routes: `POST /api/models/epoch`, `POST /api/models/reset-stats`, and `GET /api/arena/epochs`.
  - Frontend UI Epoch Selector on `/models` allowing operators to view stats per epoch or all-time.
- **Assigned Taskcade Phase**: Phase 82 (`spec:ArenaEpochSchema`, `spec:CleanSlateResetApi`).

---

### 1.16 Heterogeneous Hardware Detection, Zero-Config Hardware Profiler & Contributor Onboarding Engine
- **Objective**: Enable decentralized community contributors with diverse GPU hardware (NVIDIA CUDA, Apple Silicon Metal, AMD ROCm, Intel Arc, and CPU-only) to run Cacophony out-of-the-box with auto-sized contexts and quantization profiles.
- **Architectural Scope**:
  - Universal `IHardwareTelemetryProvider` abstraction: Vendor-specific detectors for NVML, ROCm SMI, macOS `powermetrics`, and Level-Zero.
  - Zero-Config Hyperparameter Auto-Sizer: Allocates context windows (4k, 8k, 16k) and model sizes (3B, 7B, 14B, 32B) based on discovered VRAM and thermal envelopes.
  - Contributor Onboarding Script (`bin/setup-hardware.sh`) and Docker compose profiles (`nvidia`, `amd`, `cpu`).
- **Assigned Taskcade Phase**: Phase 83 (`spec:UniversalHardwareDetector`, `spec:HyperparameterAutoSizer`).

---

### 1.17 Auto-Mode Sovereign Loop Hardening & Bi-Directional GitHub Issue Sync
- **Objective**: Defocus manual Build and Plan modes and harden Auto Mode so the arena operates 24/7 autonomously without human intervention. Synchronizes public GitHub issues directly into the local execution queue and returns verified pull requests.
- **Architectural Scope**:
  - Sovereign Loop Supervisor: Recovers from unhandled process exceptions, monitors thermal limits, and re-enqueues stalled tasks automatically.
  - GitHub Issue Sync Daemon: Periodically polls `GET /repos/{owner}/{repo}/issues`, parses `arena:auto` issues into taskcade items, and posts status updates.
  - Worktree Pre-Commit Gate: Verifies modified worktrees build cleanly prior to commit, preventing corrupted code from entering staging `main`.
- **Assigned Taskcade Phase**: Phase 84 (`spec:SovereignLoopSupervisor`, `spec:GitHubIssueSyncDaemon`).

---

### 1.18 Multi-Window Convergence Analytics, Git Regression Pinpointing & Plateau Intervention Dispatcher
- **Objective**: Establish flexible sliding-window success analytics, discrete derivative calculus for convergence and plateau detection, automated correlation of failure windows with git commit hashes, and priority regression remediation agent dispatching.
- **Architectural Scope**:
  - `RollingWindowAnalyticsService`: Configurable sliding windows (10, 20, 50, 100, 1000, capped at total qualified tasks; minimum N >= 2 or 3 tasks) across contiguous time-series or multi-dimensional qualifications (role, model, commit).
  - `ConvergenceAnalyzer`: Computes first and second discrete derivatives of success/failure curves, recognizing rate plateauing across nested windows (e.g. 50-task vs 10-task).
  - `GitRegressionCorrelator` & `RegressionDispatchSupervisor`: Maps failure surges to culprit git commit hashes, dispatches high-reasoning models to diagnose regressions or spot hallucinations, synthesizes test assertions, applies worktree fixes, and triggers smarter interventions upon stagnation.
  - Mobile-First Dashboard Trend Chart: Angular responsive widget with dark/light themes displaying failure/success window trends next to overall rate.
- **Assigned Taskcade Phase**: Phase 85 (`spec:RollingWindowAnalytics`, `spec:ConvergencePlateauAnalyzer`, `spec:GitRegressionDispatcher`).

---

### 1.19 Bounded Code Generation & Structural Preservation
- **Objective**: Keep model output proportional to the requested change. Large or multi-method files must be decomposed into symbol-scoped context and changed through syntax-aware, bounded edits that preserve unrelated code.
- **Generation Contract**:
  - Index the target file into symbols, scopes, signatures, references, imports, and state dependencies. Supply the target implementation with its required contracts and relevant call edges, not unrelated sibling bodies.
  - Generate a single target body or a typed edit request. Cross-symbol changes must be explicit peer edits with a reason and their own verification; they must not be smuggled into a whole-file response.
  - Reject placeholder bodies and comments that claim omitted work, including `// previous code goes here`, `// ... rest of method`, empty TODO stubs, and suspicious method deletion. Preserve the original bytes on rejection.
  - Parse and type-check the proposed replacement in its language context, splice only the target range, format the touched file, and compare symbol inventories and non-target ranges before accepting it.
  - Use language adapters behind a common parser and edit contract. The current TypeScript method splicer is the first adapter; unsupported or ambiguous syntax must use a conservative fallback or request a smaller task.
- **Verification Gates**: Regression fixtures for stub detection, sibling-method preservation, signatures and references, comments/imports, Unicode byte offsets, parse errors, and multi-symbol edit requests. Run focused tests, package build, and required project checks before a change can become a PR.
- **Assigned Taskcade Phase**: Phase 88, Tasks T88.5–T88.6.

### 1.20 Independent PR Assessment, Queued Fixes & Review Evidence
- **Objective**: End implementation runs after a verified PR is published. Assess that PR in separate queue work, preserve reviewer evidence, and route requested changes through a new fix task and a later independent assessment round.
- **Lifecycle Contract**:
  1. The implementation task builds, tests, and publishes a PR. Its task record completes and does not continue into an assessment or repair loop.
  2. The coordinator creates independent assessment tasks for distinct eligible models, excluding the implementation model by default. Each record refers to the same work item, PR, head SHA, and assessment round; no model may silently stand in for another reviewer.
  3. Persist each structured report and publish its verdict and actionable findings to the PR. Show reviewer model, evidence, severity, affected lines, deterministic fixability, and CI status in task history and PR details.
  4. If the outcome requests changes, enqueue a separate `review_fixer` task tied to the same work item and PR. It addresses findings, runs verification, updates the PR, completes, and then starts a new independent assessment round.
  5. Only an explicit approval policy plus passing required CI can advance the PR to merge. Duplicate webhooks and retried callbacks must be idempotent.
- **Model Selection**: Use role- and task-category performance evidence with sample counts and recency; select distinct available models for independent assessments. Choose the highest weighted eligible model for fixes. If it is evicted or unhealthy, select the next weighted eligible model, record the fallback reason, and keep the fix as a separately traceable queued attempt. Prefer the configured local fleet by default; external providers remain opt-in.
- **Review Report Contract**: `{ workItemId, taskId, prUrl, headSha, round, reviewerModel, verdict, findings[], verification, createdAt }`. A finding contains `{ id, severity, category, file, startLine, endLine, evidence, rationale, deterministicFix?, requestedAction }`. Reports are immutable per head SHA; a changed head starts a new round.
- **Guardrails**: Review workers have read/review permissions, fix workers have branch-scoped write permissions, and neither may write to protected branches. GitHub/Gitea actions may execute only allowlisted deterministic fix envelopes on the reviewed PR head, then must run required checks and report their result. All other findings become bounded fix-task instructions. Reports, comments, queue transitions, model choice, fallback, and merge decision remain auditable.
- **Assigned Taskcade Phase**: Phase 88, Tasks T88.1–T88.4.
