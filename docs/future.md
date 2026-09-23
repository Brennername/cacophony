# Future Architecture & Planned Capabilities: Gitea API Integration & Least-Privilege Permission Guardrails

This document outlines architectural plans for post-Phase 16 feature sets, specifically focused on deep Gitea API integration and fine-grained, least-privilege permission guardrails across the Cacophony subsystem topology.

---

## 1. Gitea API Scopes & Access Control Matrix

Selected token permissions limit authorization strictly to the corresponding [API](http://localhost:19634/api/swagger) routes. Reference: [Gitea OAuth2 Provider Documentation](https://docs.gitea.com/development/oauth2-provider#scopes).

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

## 2. Least-Privilege Permission Guardrails

Just as modern database architectures separate permissions between read-replicas, write masters, and migration operators, Cacophony enforces strict privilege separation between agent roles and UI layers. No single token or agent possesses blanket permissions across the entire platform.

### Subsystem Permission Segregation
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

## 3. Deep Gitea API Integration Capabilities

### Autonomous Issue-to-Pull-Request Lifecycle
- Automated task ingestion directly from assigned Gitea issues via `GET /repos/{owner}/{repo}/issues`.
- Dynamic branching for incoming tasks via `POST /repos/{owner}/{repo}/branches`.
- Automated submission of detailed pull requests with structured markdown summaries and test verification reports via `POST /repos/{owner}/{repo}/pulls`.
- Automated code reviews evaluating SOLID compliance, test coverage, and security boundaries via `POST /repos/{owner}/{repo}/pulls/{index}/reviews`.

### Real-Time Webhook Event Dispatching
- Bi-directional event hooks capturing `issue_comment`, `pull_request`, and `push` events to trigger arena tasks immediately without constant polling overhead.

### Integrated Package & Artifact Provenance
- Direct integration with Gitea's built-in package registry to publish and verify reproducible build bundles, test caches, and distribution packages.
