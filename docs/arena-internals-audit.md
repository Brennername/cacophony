# Arena changes to Cacophony internals

**Audit window:** first explicit arena PR merge (PR #12, 2026-10-01) through `44f224a` (2026-10-06).  
**Scope:** first-parent history of `origin/master`; surface-only UI/documentation work is excluded unless it changed runtime behavior.  
**Coverage:** 138 first-parent commits, including 95 explicit `Merge PR` commits; the audited range contains approximately 23,033 added and 15,361 removed lines. Counts are git line churn, not a count of distinct lines or defects.

The foundational build before PR #12 already introduced the database, scheduler, inference, Gitea integration, AST/LSP facilities, and CLI. This report isolates later arena intake and the substantial changes it made to those internals.

## Internal changes by subsystem

| Area | What changed | Evidence in history | Assessment |
|---|---|---|---|
| Task lifecycle and scheduling | Added retry/reclaim of stranded RUNNING tasks, queue grooming and prioritization, role-affinity routing, model fallback/cooldown, distributed fleet and bandit selection; later added optional no-progress timeout and failure-surge mitigations. | PR #18, #20, #56; commits `22410c9`, `f0d2987`, `91f92b9`, `0e6b8a1` | High behavioral risk: queue eligibility, model availability and retry limits can strand tasks or repeatedly select unhealthy models. Corrective commits show those edges needed iteration. |
| Generated-code safety and repair | Added AST signature harvesting and dependency slicing, test/compiler feedback parsers, automated repair, class merging and targeted method splicing. Later commits tightened context compression, prevented repeated test repairs and added a TypeScript body splicer. | PR #54, #61, #118; commits `77122a8`, `5d11595`, `1001270`, `f0d2987` | Highest-risk area. Whole-file output and permissive repair paths allowed stubs, placeholder comments and unrelated changes; method-sized edits and generated-change guards are the right direction but language coverage is currently narrow. |
| HTTP/API server | Added endpoints for config, RepoMap, metrics, test diagnostics, epochs and queue controls. Two merges replaced almost the entire server; another added a very large block of route code directly to this file. | PR #17 (`a49c86b`), PR #44 (`272c771`), PR #83 (`b5c9a8a`), PR #118 (`eae59f3`) | Verified destructive churn: PR #44 deleted 1,438 lines and left 5; PR #83 deleted 1,437 and left 6. PR #118 added 1,503 lines to the server. These were not small feature edits. Later corrective commits restored routes, but line-based checks did not stop the regressions at merge time. |
| Persistence and statistics | Added arena epochs/aggregates and model-health/remediation counters, plus task duration and token-velocity history. Existing failure records were retained while statistics could be scoped to epochs. | PR #118 (`eae59f3`); commits `0e6b8a1`, `b3955d7`, `58847d3` | Data-model changes can alter historical interpretation and task ranking. Preserve append-only run history; version aggregate definitions and test migrations against existing data. |
| Git/Gitea automation | Expanded worktree lifecycle, issue ingestion, PR review/remediation and merge flow; added cleanup for stale worktree records and repaired branch synchronization. | PR #51; commits `c7d01a3`, `ea4eaaa`, `69d23c3` | Broad authority and cleanup surface. Duplicate events, stale worktrees and incorrect branch targeting can create stuck or repeated work. CI feedback was absent. |
| Inference and runtime | Added adaptive model routing, stream history/telemetry, timeouts, eviction cooldown and container zombie reaping. | PR #15, #18, #29; commits `29f0878`, `f2c014f`, `d1064d0`, `499965b` | Runtime behavior changed substantially. A too-long model keep-alive was corrected to permit VRAM eviction; process init was added for zombie reaping. Failure history pointed to timeout, unavailable-model and process-lifecycle issues. |
| Test/build pipeline | Expanded generated-file, compiler and task-scoped tests; CI dependency fixes and route restorations landed after regressions. GitHub CI currently runs build/test/audit, but had a lint step that could fail without failing the job. | Commits `f7c2a18`, `d697b28`, `469970f`; `.github/workflows/ci.yml` | Passing checks were not a reliable protection while lint was advisory and documentation-only changes skipped CI. CI also does not automatically enforce GitHub branch protection. |

## Material reductions and replacements

| Commit | Change size | Why it matters |
|---|---:|---|
| `272c771` — PR #44, SSE throttling | HTTP server −1,438 / +5 lines | Replaced nearly the entire server for a throttling change. |
| `b5c9a8a` — PR #83, RepoMap endpoint | HTTP server −1,437 / +6 lines | Repeated the same near-total replacement; the change was unrelated in size to the requested endpoint. |
| `a49c86b` — PR #17, role config API | HTTP server −977 / +22 lines | Large truncation during an API addition. |
| `eae59f3` — PR #118, test-failure diagnostics | HTTP server +1,503 / −5 lines | Large route expansion in a single file increased merge and review risk. |
| `0e6b8a1` — epoch aggregation / timeout | auto-repair −380 lines; diagnostic tests −220; other tests −53 | Significant refactor/removal. The change may be intentional, but deletions of this scale deserve explicit before/after behavior and migration review. |

The later commits `f7c2a18` and `d697b28` explicitly describe restoring corrupted server/engine/frontend files. The history demonstrates that regression, but cannot establish that every other large change was defective. The audit therefore treats churn as a review signal rather than proof of a bug.

## Mitigation shipped in this session

| Control | Change | Effect |
|---|---|---|
| GitHub CI gating | Removed docs-only path exclusions and removed `continue-on-error` from lint. | Pushes and PRs now run build, dependency audit, lint command and tests for all changes. Note: root `npm run lint` currently succeeds without invoking any workspace lint scripts, so this is not yet a substantive lint gate. |
| Gitea CI parity | Added `.gitea/workflows/ci.yml` with the same Node 22 install/audit/build/lint/test sequence. | Gives Gitea Actions the same checks as GitHub and calls Cacophony after a failed job. |
| Failure-to-queue callback | Added authenticated `POST /api/ci/failures`. Stable task IDs based on repository/run ID make retries idempotent. | Failed Gitea runs become P1 implementer tasks with commit, workflow, run URL and failure summary; callback rejects missing/invalid bearer credentials. |
| Configuration | Added `CI_FAILURE_WEBHOOK_TOKEN` to compose and `.env.example`. | The Cacophony service and Gitea repository must use the same random value. Configure Gitea Actions secrets `CACOPHONY_CI_FAILURE_URL` and `CACOPHONY_CI_FAILURE_TOKEN`; the URL must be reachable from the Gitea runner. |

## Recommended continuing controls

1. Require successful CI on protected `main`/`master` branches and disallow bypass. GitHub’s API could not be reached from this environment, so branch protection could not be verified or changed here.
2. Treat large changes to core files as review triggers: require an explicit change-size report, flag deletions above a threshold, and reject unexplained whole-file replacement. Prefer splitting HTTP routes and scheduler stages into bounded modules.
3. Preserve the AST method-splice path for oversized files, then run parse/build/tests on the exact edited file and compare the diff against the task’s declared target files.
4. Gate merges on behavior, not only compilation: task reclaim/retry, no-progress timeout, unhealthy-model cooldown/fallback, migration upgrade, generated-stub detection and sibling-method preservation need durable regression coverage.
5. Keep failure logs immutable; use epochs only to reset/aggregate score windows. Link every queued CI failure to its originating commit and CI run, and deduplicate webhook retries.

**Operational setup still needed:** enable Gitea Actions and provide a runner that can reach Cacophony; configure the two repository secrets above; restart/rebuild the running container so the new callback endpoint and token variable are active. GitHub branch protection remains unverified because GitHub was unreachable during this session.

**Verification in this environment:** monorepo build passed after disabling build-time font fetching. Unit tests could not be validated end-to-end: integration suites that bind localhost fail with sandbox `listen EPERM`, and `npm audit` could not reach `registry.npmjs.org`. The test command also reported some failed child suites before it stalled; a CI runner outside this sandbox is still needed for a trustworthy full-suite result.
