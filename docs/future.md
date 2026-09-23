# Future Architecture & Planned Capabilities: Gitea API Integration & Least-Privilege Permission Firewalling

This document outlines architectural plans for post-Phase 16 feature sets, specifically focused on deep Gitea API integration and fine-grained, least-privilege permission firewalling across the Cacophony subsystem topology.

---

## 1. Gitea API Scopes & Permission Matrix

Selected token permissions limit authorization only to the corresponding [API](http://localhost:19634/api/swagger) routes. Reference: [Gitea OAuth2 Provider Documentation](https://docs.gitea.com/development/oauth2-provider#scopes).

| Scope | Available Levels | Intended Cacophony Role / Subsystem | Firewall Policy |
| :--- | :--- | :--- | :--- |
| `activitypub` | No Access / Read / Read and Write | External Federation | **No Access** (Disabled by default) |
| `admin` | No Access / Read / Read and Write | Infrastructure / Provisioner | **No Access** for worker agents; restricted to initial bootstrapping |
| `issue` | No Access / Read / Read and Write | Task Ingestion / Autonomous Bug Fixer | **Read** for Ingestion, **Read and Write** for Autonomous Issue Resolver |
| `misc` | No Access / Read / Read and Write | General Metadata | **Read** only |
| `notification` | No Access / Read / Read and Write | Notification Poller | **Read** for live webhook/event fallback |
| `organization` | No Access / Read / Read and Write | Team / Workspace Context | **Read** only |
| `package` | No Access / Read / Read and Write | Package Registry / Artifact Storage | **Read** for dependency auditing, **Read and Write** for build artifact publishing |
| `repository` | No Access / Read / Read and Write | Code Orchestration & PR Engine | **Read** for code exploration, **Read and Write** for branch creation and PR submissions |
| `user` | No Access / Read / Read and Write | SSO & Identity Verification | **Read** (Profile & Email verification only) |

---

## 2. Least-Privilege Permission Firewalling Model

Similar to relational database security (where API read-replicas cannot write, and analytical roles cannot alter schemas), Cacophony will implement role-based token firewalling:

### Subsystem Permission Segregation
1. **Public/Read-Only Inspector (Web Dashboard)**:
   - Scopes: `repository:read`, `user:read`, `issue:read`.
   - Cannot mutate git history, open PRs, or modify repository configurations.
2. **Reviewer & QA Agent**:
   - Scopes: `repository:read`, `issue:read`, `package:read`.
   - Evaluates diffs and submits review comments without write permission to branch heads.
3. **Autonomous Implementer Agent**:
   - Scopes: `repository:read`, `repository:write` (restricted to feature/fix branches), `issue:read_write`.
   - Allowed to push shadow commits, create pull requests, and comment on linked issues.
4. **Bootstrapper / Admin Role**:
   - Scopes: `admin:read_write`, `organization:read_write`.
   - Confined strictly to container initialization and automated webhook provisioning. Never exposed to LLM context.

---

## 3. Planned Gitea API Integrations

### Autonomous Issue-to-PR Pipeline
- Automated polling of assigned issues via Gitea API (`GET /repos/{owner}/{repo}/issues`).
- Dynamic creation of dedicated task branches (`POST /repos/{owner}/{repo}/branches`).
- Automatic PR creation with markdown task summaries (`POST /repos/{owner}/{repo}/pulls`).
- Inline code review comments powered by local model evaluation (`POST /repos/{owner}/{repo}/pulls/{index}/reviews`).

### Webhook Event Dispatcher
- Real-time ingestion of `issue_comment`, `pull_request`, and `push` events to trigger arena tasks without polling overhead.

### Artifact Registry Verification
- Integration with Gitea's built-in container and npm package registries for reproducible build artifact provenance.
