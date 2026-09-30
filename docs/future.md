# Future Capabilities & Conceptual Feature Roadmap (`docs/future.md`)

> [!IMPORTANT]
> **Operational Purpose & Authoring Directive:**
> This document serves as the high-level conceptual repository for uncommitted future features, aspirational ideas, and exploratory capabilities.
> When updating this document, the AI assistant must **synthesize and distill** raw user ideas into clear, cohesive, and logically structured architectural specifications.
> **Do NOT copy verbatim or reproduce incoherent prompt phrasing.** Reorganize, categorize, and logically design the content so it cleanly articulates the features envisioned for the future, without prematurely committing them to the active implementation roadmap.
> Once specific features are selected and approved for active architectural design, they transition from this document to [`docs/planning.md`](planning.md), where they will be broken down into concrete phases to form the next taskcade.

---

## 1. Gitea API Integration & Least-Privilege Permission Guardrails

### 1.1 Gitea API Scopes & Access Control Matrix

Selected token permissions limit authorization strictly to the corresponding local API Swagger routes (`http://localhost:19634/api/swagger`). Reference: [Gitea Documentation](https://docs.gitea.com).

| Scope | Available Levels | Intended Cacophony Role / Subsystem | Permission Guardrail Policy |
| :--- | :--- | :--- | :--- |
| `activitypub` | No Access / Read / Read and Write | External Federation | **No Access** (Disabled across all agents) |
| `admin` | No Access / Read / Read and Write | Infrastructure Bootstrapping | **No Access** for worker agents; isolated to setup scripts |
| `issue` | No Access / Read / Read and Write | Task Ingestion / Autonomous Bug Fixer | **Read** for Ingestion, **Read and Write** for Autonomous Issue Resolver |
| `misc` | No Access / Read / Read and Write | General Metadata | **Read** only |
| `notification` | No Access / Read / Read and Write | Event Poller Fallback | **Read** for polling event fallbacks |
| `organization` | No Access / Read / Read and Write | Team & Workspace Context | **Read** only |
| `package` | No Access / Read / Read and Write | Package Registry & Build Artifacts | **Read** for dependency auditing, **Read and Write** for artifact publishing |
| `repository` | No Access / Read / Read and Write | Code Orchestration & PR Engine | **Read** for code exploration, **Read and Write** for branch creation and PR submissions |
| `user` | No Access / Read / Read and Write | SSO & Identity Verification | **Read** (Profile and email verification only) |

---

### 1.2 Least-Privilege Permission Guardrails

Just as modern database architectures separate permissions between read-replicas, write masters, and migration operators, Cacophony enforces strict privilege separation between agent roles and UI layers. No single token or agent possesses blanket permissions across the entire platform.

#### Subsystem Permission Segregation
1. **Public / Read-Only Inspector (Web Dashboard)**:
   - Scopes: `repository:read`, `user:read`, `issue:read`.
   - Guardrail: Cannot mutate git branches, alter repository settings, or trigger unauthorized PRs.
2. **Reviewer & QA Agent**:
   - Scopes: `repository:read`, `issue:read`, `package:read`.
   - Guardrail: Allowed to analyze pull request diffs, inspect test outputs, and submit review verdicts without write access to repository heads.
3. **Autonomous Implementer Agent**:
   - Scopes: `repository:read`, `repository:write` (restricted to designated task branches), `issue:read_write`.
   - Guardrail: Allowed to stage commits, create isolated feature/fix branches, open pull requests, and update linked issue tickets. Protected master/release branches remain write-blocked.
4. **Bootstrapper & System Administrator**:
   - Scopes: `admin:read_write`, `organization:read_write`.
   - Guardrail: Confined exclusively to local container initialization, repository provisioning, and webhook setup. These tokens are never exposed to LLM context windows or agent execution runtimes.

---

### 1.3 Deep Gitea API Integration Capabilities

#### Autonomous Issue-to-Pull-Request Lifecycle
- Automated task ingestion directly from assigned Gitea issues via `GET /repos/{owner}/{repo}/issues`.
- Dynamic branching for incoming tasks via `POST /repos/{owner}/{repo}/branches`.
- Automated submission of detailed pull requests with structured markdown summaries and test verification reports via `POST /repos/{owner}/{repo}/pulls`.
- Automated code reviews evaluating SOLID compliance, test coverage, and security boundaries via `POST /repos/{owner}/{repo}/pulls/{index}/reviews`.

#### Real-Time Webhook Event Dispatching
- Bi-directional event hooks capturing `issue_comment`, `pull_request`, and `push` events to trigger arena tasks immediately without constant polling overhead.

#### Integrated Package & Artifact Provenance
- Direct integration with Gitea's built-in package registry to publish and verify reproducible build bundles, test caches, and distribution packages.

---

## 2. Autonomous Queue-Chewing Architecture & Continuous Vacancy Management

### 2.1 Autonomous Engine Ideology
Unlike conventional developer-facing assistants that remain idle awaiting human prompts or external MCP tool triggers, Cacophony is designed as an autonomous, full-throttle code generation engine. The system operates continuously at the hardware's maximum safe thermal and compute envelope, consuming an endless task backlog.

### 2.2 The Vacancy Real Estate Model
Compute capacity is treated under a real estate vacancy paradigm: unutilized hardware cycles represent irrecoverable resource loss. When external task queues are exhausted, the system transitions to internal continuous generation:
1. **Autonomous Refactoring & AST Grooming**: Detecting architectural code smells, dead code paths, and deprecated interfaces.
2. **Exhaustive Mutation Testing**: Generating synthetic edge cases and property-based test suites to probe existing boundaries.
3. **Speculative Pre-Generation**: Evaluating speculative implementation branches for upcoming roadmap phases to populate warm cache pools.

### 2.3 Zero-Dev Autonomous Operations
In full autonomous mode, the developer feedback loop is entirely eliminated. The application autonomously discovers operational friction and user behavior, plans feature enhancements, derives test specifications, validates regressions against local test gates, and merges changes without requiring human-in-the-loop intervention.

---

## 3. Whiteboxed Archetypes & Local Hardware Specialization

### 3.1 Appliance Model for Non-Technical Operators
Cacophony delivers an IT appliance experience designed for operators, product managers, and systems administrators rather than software engineers. The platform provides pre-packaged, whiteboxed architectural archetypes that drop into existing infrastructure without source modifications.

### 3.2 Dynamic Hardware Adaptation
The system dynamically configures inference hyperparameters based on discovered physical hardware (APU, GPU, TPU, CPU):
- Allocates VRAM and GTT memory to avoid out-of-memory kernel interventions.
- Tunes context window sizes and quantization profiles (e.g. Q4_K_M vs Q8_0) to maintain target token velocity.
- Matches agent roles to hardware strengths (e.g. high-throughput lightweight models for scrubbing, large quantized models for architectural planning).

### 3.3 Embedded Social Workflow Network
Operators can export, publish, and exchange verified execution workflows across a decentralized social registry. Workflows encompass task cascades, deterministic rule sets, and model dispatch policies, enabling organizations to subscribe to and follow top-performing operational configurations.

---

## 4. Decentralized Compute Exchange & Idle Hardware Monetization

### 4.1 Anonymous Task Brokering & Token Economy
Compute resources are pooled into a distributed exchange that pairs idle hardware with active task queues:
- **Consumer Hardware Participation**: Enables everyday devices (including mobile phones connected to fast chargers overnight) and idle workstations to process queue segments.
- **Tokenized Metering**: Node contributors earn compute tokens proportional to verified work completed (effective tokens per second and test pass yield).
- **Abstracted Execution Tasks**: Tasks distributed across the network are stripped of proprietary semantics and sensitive metadata. Identifiers, entity names, and data shapes are anonymized prior to dispatch and reconstructed deterministically upon return.

### 4.2 Mixture of Experts (MoE) Immune Auditing
To defend against malicious nodes, poisoned weights, and tampered code submissions, the platform employs a multi-tiered immune audit:
1. **Deterministic Black-Box Verification**: Every submitted code patch must pass isolated unit and integration test suites in an execution sandbox.
2. **Thermal vs. Tampering Telemetry Disambiguation**: Telemetry models analyze execution anomalies. If a worker exhibits aberrant error rates, the system cross-references thermal throttling and clock frequency data to determine whether degradation was environmental or intentional tampering.
3. **Homomorphic / Commutative Cryptographic Verification**: Exploration of commutative hash functions over encrypted AST representations to verify computational correctness without exposing underlying source code.

---

## 5. Air-Gapped Market Research & Non-User-User-Survey (NUUS) Engine

### 5.1 Injection-Resistant Air Gap
Direct user feedback mechanisms (e.g. comment boxes, prompt dialogs) create catastrophic attack vectors for prompt injection and memetic social engineering. Cacophony enforces a strict air gap between user interactions and the autonomous developer loop:
- **Zero In-Band Feedback**: No unstructured text entered by end users ever directly touches agent context windows.
- **Aggregated Behavioral Telemetry (NUUS)**: The system gathers Non-User-User-Survey metrics based strictly on implicit telemetry: navigation drop-offs, repetitive user actions, latency anomalies, feature misuses, and operational friction heatmaps.
- **Deterministic Sanitization**: Behavioral anomalies are compiled into structured operational reports by an intermediary aggregator before feature planning tasks are queued.

### 5.2 Deterministic Policy Hacking & Customer Alignment Facade
Organizations must enforce non-negotiable legal, regulatory, and fiscal policies. Within these deterministic boundaries, the autonomous system explores user-satisfying operational pathways:
- Hard guardrails (financial constraints, security boundaries, rate limits) are enforced deterministically by invariant rules.
- Local LLMs explore edge cases within policy parameters to find flexible resolutions for user friction, providing users with the perception of personalized assistance while strictly complying with corporate invariants.

---

## 6. AST Dependency Surface Mapping & Untested ABI Blindspot Analysis

### 6.1 Dependency Surface Coverage Matrix
When shared libraries and dependencies are developed, early consumers (Component A and Component B) exercise only a subset of the exposed API/ABI surface. When Component C introduces new dependencies, unexercised library methods present severe hidden regression risks.
- **AST Surface Extractor**: Parses internal codebases and third-party libraries into abstract syntax tree call graphs.
- **Coverage Intersection**: Computes the exact intersection:
  $$\text{Exercised Surface} = \text{Surface}(A) \cup \text{Surface}(B)$$
  $$\text{Blindspot Surface}(C) = \text{Surface}(C) \setminus (\text{Surface}(A) \cup \text{Surface}(B))$$
- **Targeted Integration Verification**: Automatically generates focused integration suites for the blindspot surface prior to staging Component C into production.

### 6.2 No-Code Operational Ticket Routing
Operational teams monitor aggregate health and visual heatmaps without inspecting source code. When anomalous behavior occurs:
1. The telemetry anomaly is correlated with the corresponding AST node and call path.
2. The system automatically files an internal task with precise focus files and AST coordinates pre-attached.
3. The autonomous pipeline consumes the ticket, executes the repair, and validates the patch without human coding intervention.

---

## 7. Segregated Architectural Suggestions & Exploratory Considerations

> [!NOTE]
> **Authoring Separation:**
> The following items represent technical recommendations and exploratory implementation strategies formulated by the AI assistant to fulfill the requirements in Sections 2 through 6. They are segregated here for independent evaluation prior to formal architectural promotion.

### 7.1 Compound Completion Factoid Definitions
Rather than relying solely on raw task pass percentages, the platform should compute composite efficiency scores:
1. **Syntactic Yield Rate (SYR)**:
   $$\text{SYR} = \frac{\text{Accepted Diff Lines in Master}}{\text{Total Generated Diff Lines}}$$
   Measures the signal-to-noise ratio of generated code and penalizes repetitive hallucination loops.
2. **Effective Token Velocity (ETV)**:
   $$\text{ETV} = \text{Raw Tokens Per Second} \times \text{Pass Rate}$$
   Reflects true computational throughput, demonstrating that a slower model with 90% accuracy outperforms a fast model with 20% accuracy.
3. **Defect Half-Life (DHL)**:
   The mean wall-clock duration required for the automated repair loop (Scrub, Test, Self-Healing) to resolve a generated syntax error or test failure without human intervention.
4. **AST Mutation Density (AMD)**:
   The ratio of functional AST node alterations to overall file byte diffs, penalizing whole-file rewrites that introduce formatting churn.

### 7.2 Interactive Time-Series Playback & Root-Cause Scrubbing UI
To allow operators to investigate historical anomalies without boredom:
- **Unified Timeline Scrubber**: A synchronized horizontal timeline that plays back Git commit hashes, hardware temperatures, VRAM allocations, token throughput, and task completion bursts simultaneously.
- **Regression Inversion Scrubbing**: Clicking any regression spike displays the corresponding Git commit diff, AST call graph delta, and active LLM prompt configuration, instantly highlighting the root cause.
- **Modular Dashboard Composer**: Allows operators to drag, pin, and compare live and historical metrics across disparate model families and prompt templates.

### 7.3 Recurring Frontier Model Evaluator Cron
To continuously assess local arena performance:
- A lightweight scheduled background task (hourly or daily) pulls recent telemetry summaries from `/api/history` and `/api/analytics/failures`.
- The evaluator runs a frontier model against the aggregate dataset to detect macro-trends:
  - Identifies prompt degradation and context saturation patterns.
  - Correlates sudden error clusters with hardware events (thermal throttling, driver memory leaks).
  - Generates recommended hyperparameter adjustments for local model dispatching.
