# Engine Modularization Roadmap

This document contains one future direction: separate Cacophony's reusable orchestration engine from its coding workflow so the engine can host additional workflow domains without inheriting code-specific assumptions.

## Target boundary

### Orchestration kernel

The kernel owns generic work execution and lifecycle contracts:

- Work item identity, priority, dependencies, assignment, and lifecycle state.
- Workflow definitions, stage transitions, retries, cancellation, and recovery.
- Model and tool selection through capability-aware provider ports.
- Review, verification, and human decision requests as explicit workflow outcomes.
- Durable event, metric, and artifact references.
- Scheduling policies that consume measured provider performance and runtime availability.

The kernel must not depend on source files, Git, pull requests, programming languages, compilers, code tests, or a particular database or inference provider.

### Workflow-domain adapters

A domain adapter defines the meaning of a work item and supplies its stages, context builder, tools, and acceptance checks. The existing coding workflow becomes one adapter. Its concerns remain together behind that boundary:

- Repository maps, language-aware context extraction, AST edits, and code-safety rules.
- Git worktrees, commits, branches, pull requests, and code-review annotations.
- Compilers, formatters, test runners, and code-specific verification.
- Code-specific stages and failure classification.

Other workflow domains can provide different adapters without adding domain logic to the kernel. They must use the same lifecycle, scheduling, persistence, telemetry, and decision contracts.

### Infrastructure ports and adapters

The kernel accesses external capabilities through narrow interfaces:

| Port | Kernel contract | Existing or replaceable adapters |
|---|---|---|
| Work store | Create, update, query, and recover work items and runs | PGlite, PostgreSQL, SQLite |
| Inference | Generate, stream, cancel, and report model usage | Ollama and frontier providers |
| Tool execution | Invoke named capabilities with validated inputs and scoped grants | MCP and isolated process/container tools |
| Artifact storage | Persist and retrieve immutable inputs, outputs, and evidence | Local volume or object storage |
| Event delivery | Publish lifecycle events and progress | SSE, webhooks, message broker |
| Verification | Evaluate declared acceptance criteria and return evidence | Domain-provided verifier |
| Decision gate | Request, record, and resume after a human or delegated decision | Dashboard or external review service |
| Runtime capacity | Report available memory, accelerators, and process capacity | Hardware and container adapters |

Adapters own provider-specific configuration and translation. Kernel contracts use shared domain types and do not expose provider SDK types.

## Proposed package and build shape

The modularization is incremental and should preserve the current application while making a reusable build possible.

| Build target | Contents | Excluded concerns |
|---|---|---|
| build:core | Orchestration contracts, scheduler, generic run lifecycle, queue policies, provider ports, persistence ports, and telemetry contracts | Frontend, Git, parsers, compiler and test-runner adapters |
| build:coding | Coding domain adapter and its Git, AST, language, compiler, test, and PR integrations | Other domain implementations |
| build | Core, coding adapter, current daemon, and dashboard | None; remains the compatibility build for Cacophony |

A future package boundary such as packages/engine-core is a candidate, not a required first edit. First identify dependency direction and contracts; then move code in small, behavior-preserving steps. The existing Cacophony daemon remains the composition root that selects adapters.

## Contracts to stabilize before extraction

Use explicit typed shapes before moving implementations:

- WorkItem: stable ID, domain, requested outcome, priority, constraints, and lineage.
- WorkflowDefinition: domain, ordered or conditional stages, retry policy, and required evidence.
- WorkflowRun: work-item ID, current stage, status, attempt, assignment, timestamps, and result reference.
- StageResult: status, structured output, evidence references, and retryability.
- DecisionRequest: question, options, evidence, required authority, and resume token.
- ReviewReport: reviewer identity, verdict, findings, evidence, and requested next action.
- Provider ports: capability declarations, health, capacity, and measured performance.

Persisted records need schema versions and explicit migrations. Historical runs and review evidence remain readable when contracts evolve.

## Extraction gates

Each extraction step preserves the existing coding workflow and is verified before promotion:

1. Inventory runtime imports and classify each module as kernel, domain adapter, infrastructure adapter, or presentation.
2. Define shared contracts and dependency rules; prohibit kernel imports from domain and infrastructure packages.
3. Add the core build target and prove it builds without loading coding, Git, frontend, or host-specific modules.
4. Move one lifecycle component at a time behind a port while the existing application uses the new contract.
5. Compare task transitions, persisted history, assignments, verification results, and failure recovery before and after each move.
6. Keep the current full build as a compatibility gate until the isolated target has stable integration coverage.
7. Add a second non-coding adapter only after the core contracts and isolated build are proven; do not add domain-specific assumptions to the kernel to simplify that adapter.

The modularization is complete when the core target can schedule, persist, observe, and resume a workflow using replaceable adapters, while the coding adapter retains the current repository and code-verification behavior.
