# Cacophony Taskcade: Autonomous Local Model Arena & Code Orchestrator

## Architectural Directives & Operational Rules

- Zero Emojis in any code, comments, documentation, or commits (unless a feature explicitly declares emoji exemption).
- SOLID principles strictly enforced across all modules.
- Strict typing: TypeScript (Node.js/Bun) and modern Angular (v20+ with Signals, Zoneless, Standalone); strictly NO Python in core codebase.
- Database: PGlite (in-process WASM/Node PostgreSQL) with clean abstraction for SQLite, PostgreSQL, and MariaDB.
- Single-concurrency scheduler: Vega APU affinity grouping (minimizes Ollama model unloads), model failure eviction (3-4 consecutive fails), and weighted random fallback.
- Mobile-first responsive UI with Dark Mode (default), Light Mode, and High Contrast Mode adhering to Angular best practices (`docs/SKILL.md`).
- All secrets strictly confined to .env and encrypted vault.
- Zero Hardcoding & Whitebox Configurability: Any option, parameter, hyperparameter, model identifier, context limit, host, IP, or port must be configurable via typed options/config schemas with intelligent defaults, never hardcoded as arbitrary string or numeric literals.
- Network Agnosticism: Dynamic host header/IP resolution across Docker bridge, Wi-Fi LAN, VPN, and reverse proxy domains without hardcoding localhost.
- Never delete source files with rm; move deprecated files to .trash/ with justification documentation.
- The Integrity Rule (Zero Integrity Traps): All agents (local and frontier) must operate with strict engineering integrity:
  1. Never fake or short-circuit test passes (e.g. inserting dummy "Passed!" prints, removing assertions, or mocking tests to artificially simulate 100% pass rate). Tests must perform authentic validation of production invariants.
  2. Never execute destructive bypasses (e.g. dropping database tables or deleting configuration to avoid schema migrations or typing mismatches). Always author backward-compatible migrations and robust type unions.
  3. Transactional Integrity: When a task fails verification or remediation, all modified files must be safely rolled back to their pre-task snapshot so the repository remains pristine.
  4. Genuine Problem Resolution: Always resolve root causes rather than masking symptoms or bypassing guardrails.
- Showcase / Demo Mode Mock Preservation: Mock elimination tasks (such as Phase 48) apply to production paths, component stubs, and UI mocks, but must NEVER eliminate or break `MockInferenceStreamProvider` or `FallbackTelemetryProvider` when running under `DEMO_MODE=true` / `SIMULATION_MODE=true` (T71.3). The visual showcase and simulated zero-hardware demonstration mode must remain fully preserved and operational.
- Always commit changes, keep workspace clean, and ensure work is production ready.

---

## Taskcade Rotation & History Protocol

1. **Verification Gate**: No task is marked completed `[x]` or rotated without passing its verified automated test suite or operational validation.
2. **Archival Procedure**: When an entire phase or major milestone is fully verified, its completed checklist items are transferred from `docs/taskcade.md` to `docs/taskcade-history.md`.
3. **Traceability**: Each archived phase preserves its task IDs, descriptions, subtask trees, associated git commit hashes, and verification scope.
4. **Token Efficiency**: Active planning and execution in `docs/taskcade.md` remain uncluttered, allowing AI agents and human operators to focus directly on pending work without context exhaustion.
5. **Reference**: See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 44, plus fully verified Phases 45-64, 70, 73, 75, 77-86, and 89-95.

---

## Active Milestone Era: Gitea Deep API Integration, Dynamic Branching, Least-Privilege Guardrails & Webhook Orchestration

_See [`docs/taskcade-history.md`](taskcade-history.md) for archived Phases 1 through 44, plus fully verified Phases 45-64, 70, 73, 75, 77-86, and 89-95._

---

## Active Sprint Priority Queue & Immediate Execution Order

> [!NOTE]
> Phase 102 is active: Focused strictly on unit testing, component spec coverage, and edge-case verification across frontend components and backend services. Major architectural pipeline implementations will be conducted via frontier models.

---

## Phase 102: Comprehensive Unit Test Expansion & Edge-Case Coverage

- [x] T102.1.1: Write unit tests verifying `TerminalLogViewerComponent` log line rendering, auto-scrolling, and ANSI escape code sanitation. [Files: packages/frontend/src/app/components/terminal-log-viewer/terminal-log-viewer.component.ts, packages/frontend/src/app/components/terminal-log-viewer/terminal-log-viewer.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.1.2: Write unit tests verifying `ProcessInspectorComponent` process selection, terminal output display, and status badge rendering. [Files: packages/frontend/src/app/components/process-inspector/process-inspector.component.ts, packages/frontend/src/app/components/process-inspector/process-inspector.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.1.3: Write unit tests verifying `QueueManagerComponent` status filtering, priority badges, and task cancellation dispatches. [Files: packages/frontend/src/app/components/queue-manager/queue-manager.component.ts, packages/frontend/src/app/components/queue-manager/queue-manager.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.1.4: Write unit tests verifying `ExplorationControlComponent` epsilon slider reactivity, model strategy selection, and budget persistence. [Files: packages/frontend/src/app/components/exploration-control/exploration-control.component.ts, packages/frontend/src/app/components/exploration-control/exploration-control.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.1.5: Write unit tests verifying `AuthCallbackComponent` query parameter token extraction, error state handling, and router navigation. [Files: packages/frontend/src/app/components/auth-callback/auth-callback.component.ts, packages/frontend/src/app/components/auth-callback/auth-callback.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.6: Write unit tests verifying `RepoMapViewerComponent` tree node expansion, symbol selection, and file navigation dispatches. [Files: packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.ts, packages/frontend/src/app/components/repo-map-viewer/repo-map-viewer.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.7: Write unit tests verifying `TaskHistoryComponent` status pill display, duration formatting, and task item selection. [Files: packages/frontend/src/app/components/task-history/task-history.component.ts, packages/frontend/src/app/components/task-history/task-history.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.8: Write unit tests verifying `FrontierModalComponent` provider credential inputs, temperature sliders, and submission events. [Files: packages/frontend/src/app/components/frontier-modal/frontier-modal.component.ts, packages/frontend/src/app/components/frontier-modal/frontier-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.9: Write unit tests verifying `ProcessDrawerComponent` drawer open/close toggles, active process counting, and tab switches. [Files: packages/frontend/src/app/components/process-drawer/process-drawer.component.ts, packages/frontend/src/app/components/process-drawer/process-drawer.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.10: Write unit tests verifying `ConfirmationDialogComponent` backdrop dismissal, confirmation callback triggers, and destructive styling. [Files: packages/frontend/src/app/components/confirmation-dialog/confirmation-dialog.component.ts, packages/frontend/src/app/components/confirmation-dialog/confirmation-dialog.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.11: Write unit tests verifying `ModelPullModalComponent` model tag selection, progress bar updates, and pull cancellation. [Files: packages/frontend/src/app/components/model-pull-modal/model-pull-modal.component.ts, packages/frontend/src/app/components/model-pull-modal/model-pull-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.12: Write unit tests verifying `ModelTuningPanelComponent` hyperparameter slider bindings, preset saving, and reset defaults. [Files: packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.ts, packages/frontend/src/app/components/model-tuning-panel/model-tuning-panel.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.13: Write unit tests verifying `TenancyConfigPanelComponent` tenant isolation toggles, concurrency limits, and quota validation. [Files: packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.ts, packages/frontend/src/app/components/tenancy-config-panel/tenancy-config-panel.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.14: Write unit tests verifying `TestFilterToolbarComponent` test search debounce, failure-only filter toggles, and suite re-run clicks. [Files: packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.ts, packages/frontend/src/app/components/test-filter-toolbar/test-filter-toolbar.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.15: Write unit tests verifying `TestRunModalComponent` test output live streaming, pass/fail badge rendering, and modal dismissal. [Files: packages/frontend/src/app/components/test-run-modal/test-run-modal.component.ts, packages/frontend/src/app/components/test-run-modal/test-run-modal.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.16: Write unit tests verifying `WindowedSuccessTrendComponent` moving average calculations, trend arrow rendering, and window size adjustment. [Files: packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.ts, packages/frontend/src/app/components/windowed-success-trend/windowed-success-trend.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.17: Write unit tests verifying `CheckpointTimelineComponent` undo/redo button state management, commit author display, and rewind dispatch. [Files: packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.ts, packages/frontend/src/app/components/checkpoint-timeline/checkpoint-timeline.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.18: Write unit tests verifying `ConversationTimelineComponent` role badges, markdown snippet formatting, and auto-scroll to bottom. [Files: packages/frontend/src/app/components/conversation-timeline/conversation-timeline.component.ts, packages/frontend/src/app/components/conversation-timeline/conversation-timeline.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.19: Write unit tests verifying `ExecutionModeSelectorComponent` autonomous vs supervised mode switching and indicator badges. [Files: packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.ts, packages/frontend/src/app/components/execution-mode-selector/execution-mode-selector.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.1.20: Write unit tests verifying `GanttTransportComponent` stage span bar scaling, zoom level adjustments, and hover tooltip positioning. [Files: packages/frontend/src/app/components/gantt-transport/gantt-transport.component.ts, packages/frontend/src/app/components/gantt-transport/gantt-transport.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [x] T102.2.1: Write unit tests verifying `AmdVegaTelemetryProvider` sysfs path discovery, missing node handling, and APU fallback metrics. [Files: packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts, packages/engine/src/tests/amd_vega_telemetry.test.ts] [Test: node --test packages/engine/dist/tests/amd_vega_telemetry.test.js]
- [x] T102.2.2: Write unit tests verifying `ModelVramCatalog` model parameter footprint sizing across 3B, 7B, 8B, 14B, and 16B parameter scales with dynamic context window limits. [Files: packages/engine/src/hardware/ModelVramCatalog.ts, packages/engine/src/tests/model_vram_catalog.test.ts] [Test: node --test packages/engine/dist/tests/model_vram_catalog.test.js]
- [x] T102.2.3: Write unit tests verifying `ThermalGovernor` throttling state transitions, cooldown timers, and recovery thresholds under fluctuating sensor readings. [Files: packages/engine/src/telemetry/ThermalGovernor.ts, packages/engine/src/tests/thermal_governor.test.ts] [Test: node --test packages/engine/dist/tests/thermal_governor.test.js]
- [x] T102.2.4: Write unit tests verifying `RateLimiter` client IP tracking, sliding window expiry, and HTTP 429 rejection responses. [Files: packages/engine/src/daemon/RateLimiter.ts, packages/engine/src/tests/rate_limiter.test.ts] [Test: node --test packages/engine/dist/tests/rate_limiter.test.js]
- [ ] T102.2.5: Write unit tests verifying `JwtValidator` HS256 signature verification, expired token rejection, and malformed payload handling. [Files: packages/engine/src/auth/JwtValidator.ts, packages/engine/src/tests/jwt_validator.test.ts] [Test: node --test packages/engine/dist/tests/jwt_validator.test.js]
- [ ] T102.2.6: Write unit tests verifying `CpuFallbackProvider` proc/cpuinfo parsing, core frequency calculation, and synthetic thermal modeling. [Files: packages/engine/src/telemetry/CpuFallbackProvider.ts, packages/engine/src/tests/cpu_fallback_provider.test.ts] [Test: node --test packages/engine/dist/tests/cpu_fallback_provider.test.js]
- [ ] T102.2.7: Write unit tests verifying `HardwareProviderFactory` auto-detection precedence (amdgpu sysfs, nvidia-smi nvml, cpu fallback). [Files: packages/engine/src/telemetry/HardwareProviderFactory.ts, packages/engine/src/tests/hardware_provider_factory.test.ts] [Test: node --test packages/engine/dist/tests/hardware_provider_factory.test.js]
- [ ] T102.2.8: Write unit tests verifying `NvidiaSmiParser` XML/CSV query output parsing, VRAM allocation extraction, and temperature reading. [Files: packages/engine/src/telemetry/NvidiaSmiParser.ts, packages/engine/src/tests/nvidia_smi_parser.test.ts] [Test: node --test packages/engine/dist/tests/nvidia_smi_parser.test.js]
- [ ] T102.2.9: Write unit tests verifying `PrometheusMetricsExporter` metric name formatting, label escaping, and counter/gauge incrementing. [Files: packages/engine/src/telemetry/PrometheusMetricsExporter.ts, packages/engine/src/tests/prometheus_metrics_exporter.test.ts] [Test: node --test packages/engine/dist/tests/prometheus_metrics_exporter.test.js]
- [ ] T102.2.10: Write unit tests verifying `TelemetryCorrelationService` rolling window buffer management, correlation coefficient calculations, and anomaly flagging. [Files: packages/engine/src/telemetry/TelemetryCorrelationService.ts, packages/engine/src/tests/telemetry_correlation_service.test.ts] [Test: node --test packages/engine/dist/tests/telemetry_correlation_service.test.js]
- [ ] T102.2.11: Write unit tests verifying `SystemToolScanner` binary discovery for git, ollama, curl, and docker in system PATH. [Files: packages/engine/src/hardware/SystemToolScanner.ts, packages/engine/src/tests/system_tool_scanner.test.ts] [Test: node --test packages/engine/dist/tests/system_tool_scanner.test.js]
- [ ] T102.2.12: Write unit tests verifying `GpuDeviceManager` multi-device enumeration, device selection by free VRAM, and health state query. [Files: packages/engine/src/hardware/GpuDeviceManager.ts, packages/engine/src/tests/gpu_device_manager.test.ts] [Test: node --test packages/engine/dist/tests/gpu_device_manager.test.js]
- [ ] T102.2.13: Write unit tests verifying `ComputeHardwareProfile` profile serialization, capacity rating, and memory headroom validation. [Files: packages/engine/src/hardware/ComputeHardwareProfile.ts, packages/engine/src/tests/compute_hardware_profile.test.ts] [Test: node --test packages/engine/dist/tests/compute_hardware_profile.test.js]
- [ ] T102.2.14: Write unit tests verifying `HardwareDiscoveryEngine` APU vs discrete GPU classification and telemetry capability reporting. [Files: packages/engine/src/hardware/HardwareDiscoveryEngine.ts, packages/engine/src/tests/hardware_discovery_engine.test.ts] [Test: node --test packages/engine/dist/tests/hardware_discovery_engine.test.js]
- [ ] T102.3.1: Write unit tests verifying `GiteaPermissionGuard` repository permission role checks, token scopes, and unauthorized access rejection. [Files: packages/engine/src/gitea/GiteaPermissionGuard.ts, packages/engine/src/tests/gitea_permission_guard.test.ts] [Test: node --test packages/engine/dist/tests/gitea_permission_guard.test.js]
- [ ] T102.3.2: Write unit tests verifying `GitCheckpointManager` tree snapshot creation, tag naming, and rollback point indexing. [Files: packages/engine/src/gitea/GitCheckpointManager.ts, packages/engine/src/tests/git_checkpoint_manager.test.ts] [Test: node --test packages/engine/dist/tests/git_checkpoint_manager.test.js]
- [ ] T102.3.3: Write unit tests verifying `GitPlatformProviderFactory` provider selection based on environment configuration (Gitea vs GitHub). [Files: packages/engine/src/gitea/GitPlatformProviderFactory.ts, packages/engine/src/tests/git_platform_provider_factory.test.ts] [Test: node --test packages/engine/dist/tests/git_platform_provider_factory.test.js]
- [ ] T102.3.4: Write unit tests verifying `ReleaseBundlerService` changelog aggregation, semantic version bumping, and release note formatting. [Files: packages/engine/src/gitea/ReleaseBundlerService.ts, packages/engine/src/tests/release_bundler_service.test.ts] [Test: node --test packages/engine/dist/tests/release_bundler_service.test.js]
- [ ] T102.3.5: Write unit tests verifying `GitUndoManager` single-commit revert generation, dirty tree guard checks, and rollback safety. [Files: packages/engine/src/git/GitUndoManager.ts, packages/engine/src/tests/git_undo_manager.test.ts] [Test: node --test packages/engine/dist/tests/git_undo_manager.test.js]
- [ ] T102.3.6: Write unit tests verifying `GitCheckpointService` automated checkpoint intervals, hash deduplication, and retention pruning. [Files: packages/engine/src/git/GitCheckpointService.ts, packages/engine/src/tests/git_checkpoint_service.test.ts] [Test: node --test packages/engine/dist/tests/git_checkpoint_service.test.js]
- [ ] T102.4.1: Write unit tests verifying `FailureClassifier` error string pattern matching, category tagging (syntax, type, test, timeout), and priority scoring. [Files: packages/engine/src/analytics/FailureClassifier.ts, packages/engine/src/tests/failure_classifier.test.ts] [Test: node --test packages/engine/dist/tests/failure_classifier.test.js]
- [ ] T102.4.2: Write unit tests verifying `IncidentBundleRecorder` error context capture, stack trace truncation, and incident JSON serialization. [Files: packages/engine/src/analytics/IncidentBundleRecorder.ts, packages/engine/src/tests/incident_bundle_recorder.test.ts] [Test: node --test packages/engine/dist/tests/incident_bundle_recorder.test.js]
- [ ] T102.4.3: Write unit tests verifying `GitRegressionCorrelator` commit blame mapping, diff change set correlation, and offending commit detection. [Files: packages/engine/src/analytics/GitRegressionCorrelator.ts, packages/engine/src/tests/git_regression_correlator.test.ts] [Test: node --test packages/engine/dist/tests/git_regression_correlator.test.js]
- [ ] T102.4.4: Write unit tests verifying `RollingWindowAnalyticsService` moving window statistics, percentile latency calculation, and throughput aggregation. [Files: packages/engine/src/analytics/RollingWindowAnalyticsService.ts, packages/engine/src/tests/rolling_window_analytics.test.ts] [Test: node --test packages/engine/dist/tests/rolling_window_analytics.test.js]
- [ ] T102.5.1: Write unit tests verifying `EpsilonGreedyPolicy` exploration vs exploitation decision split, random choice distribution, and decaying epsilon. [Files: packages/engine/src/bandit/EpsilonGreedyPolicy.ts, packages/engine/src/tests/epsilon_greedy_policy.test.ts] [Test: node --test packages/engine/dist/tests/epsilon_greedy_policy.test.js]
- [ ] T102.5.2: Write unit tests verifying `ThompsonSamplingPolicy` beta distribution sampling, alpha/beta score updates, and model selection. [Files: packages/engine/src/bandit/ThompsonSamplingPolicy.ts, packages/engine/src/tests/thompson_sampling_policy.test.ts] [Test: node --test packages/engine/dist/tests/thompson_sampling_policy.test.js]
- [ ] T102.5.3: Write unit tests verifying `BanditTaskScheduler` arm selection, reward recording, and model performance convergence. [Files: packages/engine/src/bandit/BanditTaskScheduler.ts, packages/engine/src/tests/bandit_task_scheduler.test.ts] [Test: node --test packages/engine/dist/tests/bandit_task_scheduler.test.js]
- [ ] T102.6.1: Write unit tests verifying `AstSignatureAlignRule` method signature comparison, parameter count alignment, and missing return type warnings. [Files: packages/engine/src/rules/catalog/AstSignatureAlignRule.ts, packages/engine/src/tests/ast_signature_align_rule.test.ts] [Test: node --test packages/engine/dist/tests/ast_signature_align_rule.test.js]
- [ ] T102.6.2: Write unit tests verifying `FilePlacementAndNamingConventionRule` PascalCase component naming, kebab-case file paths, and placement validation. [Files: packages/engine/src/rules/catalog/FilePlacementAndNamingConventionRule.ts, packages/engine/src/tests/file_placement_rule.test.ts] [Test: node --test packages/engine/dist/tests/file_placement_rule.test.js]
- [ ] T102.6.3: Write unit tests verifying `BannedImportScrubberRule` forbidden package detection (jest, mocha, chai, lodash) and replacement recommendations. [Files: packages/engine/src/rules/catalog/BannedImportScrubberRule.ts, packages/engine/src/tests/banned_import_scrubber_rule.test.ts] [Test: node --test packages/engine/dist/tests/banned_import_scrubber_rule.test.js]
- [ ] T102.6.4: Write unit tests verifying `EmptyFileGuardRule` 0-byte file detection, whitespace-only file rejection, and minimum statement count checks. [Files: packages/engine/src/rules/catalog/EmptyFileGuardRule.ts, packages/engine/src/tests/empty_file_guard_rule.test.ts] [Test: node --test packages/engine/dist/tests/empty_file_guard_rule.test.js]
- [ ] T102.6.5: Write unit tests verifying `EnforceEsmJsExtensionRule` relative import statement inspection and automated `.js` extension injection. [Files: packages/engine/src/rules/catalog/EnforceEsmJsExtensionRule.ts, packages/engine/src/tests/enforce_esm_js_extension_rule.test.ts] [Test: node --test packages/engine/dist/tests/enforce_esm_js_extension_rule.test.js]
- [ ] T102.6.6: Write unit tests verifying `StripEmojisRule` Unicode emoji detection across code, comments, string literals, and template files. [Files: packages/engine/src/rules/catalog/StripEmojisRule.ts, packages/engine/src/tests/strip_emojis_rule.test.ts] [Test: node --test packages/engine/dist/tests/strip_emojis_rule.test.js]
- [ ] T102.6.7: Write unit tests verifying `WhitespaceAndEolNormalizerRule` mixed CRLF/LF normalization, trailing whitespace stripping, and final newline enforcement. [Files: packages/engine/src/rules/catalog/WhitespaceAndEolNormalizerRule.ts, packages/engine/src/tests/whitespace_normalizer_rule.test.ts] [Test: node --test packages/engine/dist/tests/whitespace_normalizer_rule.test.js]
- [ ] T102.6.8: Write unit tests verifying `LooseRootFileGuardRule` root directory placement guard, rejection of unauthorized root files, and subfolder routing. [Files: packages/engine/src/rules/catalog/LooseRootFileGuardRule.ts, packages/engine/src/tests/loose_root_file_guard_rule.test.ts] [Test: node --test packages/engine/dist/tests/loose_root_file_guard_rule.test.js]
- [ ] T102.6.9: Write unit tests verifying `RulePipelineEngine` sequential rule execution, change set accumulation, and short-circuit on fatal violation. [Files: packages/engine/src/rules/RulePipelineEngine.ts, packages/engine/src/tests/rule_pipeline_engine.test.ts] [Test: node --test packages/engine/dist/tests/rule_pipeline_engine.test.js]
- [ ] T102.7.1: Write unit tests verifying `AuthentikOAuthProvider` authorization URL construction, state parameter verification, and token exchange. [Files: packages/engine/src/auth/AuthentikOAuthProvider.ts, packages/engine/src/tests/authentik_oauth_provider.test.ts] [Test: node --test packages/engine/dist/tests/authentik_oauth_provider.test.js]
- [ ] T102.7.2: Write unit tests verifying `AutheliaSsoProvider` forward auth header extraction (`Remote-User`, `Remote-Groups`), and user profile construction. [Files: packages/engine/src/auth/AutheliaSsoProvider.ts, packages/engine/src/tests/authelia_sso_provider.test.ts] [Test: node --test packages/engine/dist/tests/authelia_sso_provider.test.js]
- [ ] T102.7.3: Write unit tests verifying `LocalBypassSsoProvider` mock user injection, demo credentials validation, and role assignment. [Files: packages/engine/src/auth/LocalBypassSsoProvider.ts, packages/engine/src/tests/local_bypass_sso_provider.test.ts] [Test: node --test packages/engine/dist/tests/local_bypass_sso_provider.test.js]
- [ ] T102.7.4: Write unit tests verifying `OidcDiscoveryService` well-known configuration endpoint fetch, jwks_uri extraction, and cache expiration. [Files: packages/engine/src/auth/OidcDiscoveryService.ts, packages/engine/src/tests/oidc_discovery_service.test.ts] [Test: node --test packages/engine/dist/tests/oidc_discovery_service.test.js]
- [ ] T102.7.5: Write unit tests verifying `SsoProviderFactory` provider selection based on SSO_PROVIDER environment variable. [Files: packages/engine/src/auth/SsoProviderFactory.ts, packages/engine/src/tests/sso_provider_factory.test.ts] [Test: node --test packages/engine/dist/tests/sso_provider_factory.test.js]
- [ ] T102.8.1: Write unit tests verifying `StructuredTestOutputParser` pass/fail counter extraction, test duration parsing, and failure reason isolation. [Files: packages/engine/src/testing/StructuredTestOutputParser.ts, packages/engine/src/tests/structured_test_output_parser.test.ts] [Test: node --test packages/engine/dist/tests/structured_test_output_parser.test.js]
- [ ] T102.8.2: Write unit tests verifying `TestFailureTriager` classification of syntax vs assertion vs timeout failures and suggested remediation strategies. [Files: packages/engine/src/testing/TestFailureTriager.ts, packages/engine/src/tests/test_failure_triager.test.ts] [Test: node --test packages/engine/dist/tests/test_failure_triager.test.js]
- [ ] T102.8.3: Write unit tests verifying `SandboxedProcessRunner` timeout termination, memory usage capping, and exit code propagation. [Files: packages/engine/src/testing/SandboxedProcessRunner.ts, packages/engine/src/tests/sandboxed_process_runner.test.ts] [Test: node --test packages/engine/dist/tests/sandboxed_process_runner.test.js]
- [ ] T102.8.4: Write unit tests verifying `BackgroundTestWorkerPool` worker allocation, queue concurrency limits, and idle worker recycling. [Files: packages/engine/src/testing/BackgroundTestWorkerPool.ts, packages/engine/src/tests/background_test_worker_pool.test.ts] [Test: node --test packages/engine/dist/tests/background_test_worker_pool.test.js]
- [ ] T102.8.5: Write unit tests verifying `DiagnosticPreFlightChecker` syntax check execution before running full test suites. [Files: packages/engine/src/testing/DiagnosticPreFlightChecker.ts, packages/engine/src/tests/diagnostic_pre_flight_checker.test.ts] [Test: node --test packages/engine/dist/tests/diagnostic_pre_flight_checker.test.js]
- [ ] T102.8.6: Write unit tests verifying `StubCommentSanitizer` detection and cleaning of temporary test stubs and placeholder assertions. [Files: packages/engine/src/testing/StubCommentSanitizer.ts, packages/engine/src/tests/stub_comment_sanitizer.test.ts] [Test: node --test packages/engine/dist/tests/stub_comment_sanitizer.test.js]
- [ ] T102.8.7: Write unit tests verifying `TestRunnerDetector` framework auto-detection (node:test, vitest, ng test) from package.json and project files. [Files: packages/engine/src/testing/TestRunnerDetector.ts, packages/engine/src/tests/test_runner_detector.test.ts] [Test: node --test packages/engine/dist/tests/test_runner_detector.test.js]
- [ ] T102.9.1: Write unit tests verifying `RustSignatureHarvester` struct, enum, and trait function signature parsing. [Files: packages/engine/src/signature/RustSignatureHarvester.ts, packages/engine/src/tests/rust_signature_harvester.test.ts] [Test: node --test packages/engine/dist/tests/rust_signature_harvester.test.js]
- [ ] T102.9.2: Write unit tests verifying `GoSignatureHarvester` interface, struct, and exported function signature parsing. [Files: packages/engine/src/signature/GoSignatureHarvester.ts, packages/engine/src/tests/go_signature_harvester.test.ts] [Test: node --test packages/engine/dist/tests/go_signature_harvester.test.js]
- [ ] T102.9.3: Write unit tests verifying `SignatureAlignmentScrubber` cross-language signature comparison and drift warning emission. [Files: packages/engine/src/signature/SignatureAlignmentScrubber.ts, packages/engine/src/tests/signature_alignment_scrubber.test.ts] [Test: node --test packages/engine/dist/tests/signature_alignment_scrubber.test.js]
- [ ] T102.9.4: Write unit tests verifying `SignatureStore` signature caching, indexed lookup by symbol name, and invalidation on file edits. [Files: packages/engine/src/signature/SignatureStore.ts, packages/engine/src/tests/signature_store.test.ts] [Test: node --test packages/engine/dist/tests/signature_store.test.js]
- [ ] T102.10.1: Write unit tests verifying `LspDiagnosticIngestor` LSP publishDiagnostics notification parsing and diagnostic severity mapping. [Files: packages/engine/src/lsp/LspDiagnosticIngestor.ts, packages/engine/src/tests/lsp_diagnostic_ingestor.test.ts] [Test: node --test packages/engine/dist/tests/lsp_diagnostic_ingestor.test.js]
- [ ] T102.10.2: Write unit tests verifying `LspProcessSupervisor` language server spawn, stdio JSON-RPC communication, and graceful process shutdown. [Files: packages/engine/src/lsp/LspProcessSupervisor.ts, packages/engine/src/tests/lsp_process_supervisor.test.ts] [Test: node --test packages/engine/dist/tests/lsp_process_supervisor.test.js]
- [ ] T102.10.3: Write unit tests verifying `LspDetector` language server binary discovery (typescript-language-server, rust-analyzer, gopls). [Files: packages/engine/src/lsp/LspDetector.ts, packages/engine/src/tests/lsp_detector.test.ts] [Test: node --test packages/engine/dist/tests/lsp_detector.test.js]
- [ ] T102.11.1: Write unit tests verifying `UserSessionRepository` session creation, token lookup, touch activity timestamp, and expired session purge. [Files: packages/db/src/repositories/UserSessionRepository.ts, packages/db/src/tests/user_session_repository.test.ts] [Test: node --test packages/db/dist/tests/user_session_repository.test.js]
- [ ] T102.11.2: Write unit tests verifying `TestExecutionRepository` run recording, status filtering, and test duration aggregation. [Files: packages/db/src/repositories/TestExecutionRepository.ts, packages/db/src/tests/test_execution_repository.test.ts] [Test: node --test packages/db/dist/tests/test_execution_repository.test.js]
- [ ] T102.11.3: Write unit tests verifying `VaultRepository` secret encryption key storage, secret retrieval by key name, and deletion. [Files: packages/db/src/repositories/VaultRepository.ts, packages/db/src/tests/vault_repository.test.ts] [Test: node --test packages/db/dist/tests/vault_repository.test.js]
- [ ] T102.11.4: Write unit tests verifying `ModelHealthRepository` heartbeat logging, error rate calculation, and eviction trigger thresholds. [Files: packages/db/src/repositories/ModelHealthRepository.ts, packages/db/src/tests/model_health_repository.test.ts] [Test: node --test packages/db/dist/tests/model_health_repository.test.js]
- [ ] T102.11.5: Write unit tests verifying `TaskTelemetryCorrelationRepository` metric point insertion, time-range querying, and correlation rollup. [Files: packages/db/src/repositories/TaskTelemetryCorrelationRepository.ts, packages/db/src/tests/task_telemetry_correlation_repository.test.ts] [Test: node --test packages/db/dist/tests/task_telemetry_correlation_repository.test.js]
- [ ] T102.11.6: Write unit tests verifying `TelemetryRepository` hardware sample batch insertion, temperature peak querying, and retention pruning. [Files: packages/db/src/repositories/TelemetryRepository.ts, packages/db/src/tests/telemetry_repository.test.ts] [Test: node --test packages/db/dist/tests/telemetry_repository.test.js]
- [ ] T102.11.7: Write unit tests verifying `ModelRegistryRepository` model registration, active/disabled flag toggles, and context size indexing. [Files: packages/db/src/repositories/ModelRegistryRepository.ts, packages/db/src/tests/model_registry_repository.test.ts] [Test: node --test packages/db/dist/tests/model_registry_repository.test.js]
- [ ] T102.11.8: Write unit tests verifying `RepositorySymbolRepository` symbol graph node upserts, edge relationships, and file path invalidation. [Files: packages/db/src/repositories/RepositorySymbolRepository.ts, packages/db/src/tests/repository_symbol_repository.test.ts] [Test: node --test packages/db/dist/tests/repository_symbol_repository.test.js]
- [ ] T102.11.9: Write unit tests verifying `StackProfileRepository` framework profile persistence, rule overrides, and default runner lookup. [Files: packages/db/src/repositories/StackProfileRepository.ts, packages/db/src/tests/stack_profile_repository.test.ts] [Test: node --test packages/db/dist/tests/stack_profile_repository.test.js]
- [ ] T102.11.10: Write unit tests verifying `GitCheckpointRepository` checkpoint creation, SHA retrieval, and parent commit tracking. [Files: packages/db/src/repositories/GitCheckpointRepository.ts, packages/db/src/tests/git_checkpoint_repository.test.ts] [Test: node --test packages/db/dist/tests/git_checkpoint_repository.test.js]
- [ ] T102.11.11: Write unit tests verifying `LspDiagnosticRepository` diagnostic record batch upsert, severity filtering, and error grouping. [Files: packages/db/src/repositories/LspDiagnosticRepository.ts, packages/db/src/tests/lsp_diagnostic_repository.test.ts] [Test: node --test packages/db/dist/tests/lsp_diagnostic_repository.test.js]
- [ ] T102.11.12: Write unit tests verifying `DatabaseMaintenanceService` WAL checkpoint triggering, vacuum execution, and retention pruning thresholds. [Files: packages/db/src/services/DatabaseMaintenanceService.ts, packages/db/src/tests/database_maintenance_service.test.ts] [Test: node --test packages/db/dist/tests/database_maintenance_service.test.js]
- [ ] T102.12.1: Write unit tests verifying `AstInspectTool` TypeScript AST inspection, class declaration discovery, and method node extraction. [Files: packages/tools/src/implementations/AstInspectTool.ts, packages/tools/src/tests/ast_inspect_tool.test.ts] [Test: node --test packages/tools/dist/tests/ast_inspect_tool.test.js]
- [ ] T102.12.2: Write unit tests verifying `LocateFeatureTool` fuzzy token search, symbol location ranking, and workspace scoping. [Files: packages/tools/src/implementations/LocateFeatureTool.ts, packages/tools/src/tests/locate_feature_tool.test.ts] [Test: node --test packages/tools/dist/tests/locate_feature_tool.test.js]
- [ ] T102.12.3: Write unit tests verifying `MultiReplaceFileContentTool` multi-chunk replacement atomicity, offset recalculation, and rollback on mismatch. [Files: packages/tools/src/implementations/MultiReplaceFileContentTool.ts, packages/tools/src/tests/multi_replace_file_content_tool.test.ts] [Test: node --test packages/tools/dist/tests/multi_replace_file_content_tool.test.js]
- [ ] T102.12.4: Write unit tests verifying `ReplaceFileContentTool` single chunk replacement, exact whitespace matching, and error on ambiguity. [Files: packages/tools/src/implementations/ReplaceFileContentTool.ts, packages/tools/src/tests/replace_file_content_tool.test.ts] [Test: node --test packages/tools/dist/tests/replace_file_content_tool.test.js]
- [ ] T102.12.5: Write unit tests verifying `WriteToFileTool` file creation, overwrite prevention flags, and automatic directory tree creation. [Files: packages/tools/src/implementations/WriteToFileTool.ts, packages/tools/src/tests/write_to_file_tool.test.ts] [Test: node --test packages/tools/dist/tests/write_to_file_tool.test.js]
- [ ] T102.12.6: Write unit tests verifying `ViewFileTool` line slicing, windowed viewing, byte offset limits, and binary file prevention. [Files: packages/tools/src/implementations/ViewFileTool.ts, packages/tools/src/tests/view_file_tool.test.ts] [Test: node --test packages/tools/dist/tests/view_file_tool.test.js]
- [ ] T102.12.7: Write unit tests verifying `ListDirTool` recursive directory listing, child counts, hidden file filtering, and path resolution. [Files: packages/tools/src/implementations/ListDirTool.ts, packages/tools/src/tests/list_dir_tool.test.ts] [Test: node --test packages/tools/dist/tests/list_dir_tool.test.js]
- [ ] T102.12.8: Write unit tests verifying `GrepSearchTool` ripgrep execution, glob filtering, line number inclusion, and match capping. [Files: packages/tools/src/implementations/GrepSearchTool.ts, packages/tools/src/tests/grep_search_tool.test.ts] [Test: node --test packages/tools/dist/tests/grep_search_tool.test.js]
- [ ] T102.12.9: Write unit tests verifying `RunCommandTool` command execution, timeout termination, exit code capture, and output truncation. [Files: packages/tools/src/implementations/RunCommandTool.ts, packages/tools/src/tests/run_command_tool.test.ts] [Test: node --test packages/tools/dist/tests/run_command_tool.test.js]
- [ ] T102.12.10: Write unit tests verifying `RegexTool` regular expression compilation, multiline matches, capture group extraction, and safety timeouts. [Files: packages/tools/src/implementations/RegexTool.ts, packages/tools/src/tests/regex_tool.test.ts] [Test: node --test packages/tools/dist/tests/regex_tool.test.js]
- [ ] T102.12.11: Write unit tests verifying `ExecutionGuard` destructive command blocking (rm -rf, mkfs, dd), path traversal prevention, and shell injection escaping. [Files: packages/tools/src/security/ExecutionGuard.ts, packages/tools/src/tests/execution_guard.test.ts] [Test: node --test packages/tools/dist/tests/execution_guard.test.js]
- [ ] T102.12.12: Write unit tests verifying `ToolRegistry` dynamic tool registration, schema validation, tool execution dispatch, and unknown tool error handling. [Files: packages/tools/src/ToolRegistry.ts, packages/tools/src/tests/tool_registry.test.ts] [Test: node --test packages/tools/dist/tests/tool_registry.test.js]
- [ ] T102.13.1: Write unit tests verifying `TaskApiService` task list fetching, task cancellation dispatch, manual task enqueue, and error mapping. [Files: packages/frontend/src/app/services/task-api.service.ts, packages/frontend/src/app/services/task-api.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.2: Write unit tests verifying `RepoStateService` branch listing, diff fetching, file tree navigation, and active commit tracking. [Files: packages/frontend/src/app/services/repo-state.service.ts, packages/frontend/src/app/services/repo-state.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.3: Write unit tests verifying `ModelFleetService` model telemetry polling, status updating, model pull invocation, and latency tracking. [Files: packages/frontend/src/app/services/model-fleet.service.ts, packages/frontend/src/app/services/model-fleet.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.4: Write unit tests verifying `AuthService` token storage, authenticated state Signal derivation, login redirection, and logout clearing. [Files: packages/frontend/src/app/services/auth.service.ts, packages/frontend/src/app/services/auth.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.5: Write unit tests verifying `HistoryMetricsService` epoch statistics rollup, success rate computation, and filter query parameters. [Files: packages/frontend/src/app/services/history-metrics.service.ts, packages/frontend/src/app/services/history-metrics.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.6: Write unit tests verifying `ReactiveSignalService` WebSocket event handling, Signal stream updates, and reconnection backoff. [Files: packages/frontend/src/app/services/reactive-signal.service.ts, packages/frontend/src/app/services/reactive-signal.service.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.7: Write unit tests verifying `GiteaAuthGuard` route activation allowing authenticated users and redirecting unauthenticated users to login. [Files: packages/frontend/src/app/guards/gitea-auth.guard.ts, packages/frontend/src/app/guards/gitea-auth.guard.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.8: Write unit tests verifying `QueueViewComponent` task filtering, bulk task actions, and responsive layout adaptations. [Files: packages/frontend/src/app/components/views/queue-view.component.ts, packages/frontend/src/app/components/views/queue-view.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.9: Write unit tests verifying `ProcessesViewComponent` process table sorting, CPU/memory metric display, and process termination dispatch. [Files: packages/frontend/src/app/components/views/processes-view.component.ts, packages/frontend/src/app/components/views/processes-view.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.13.10: Write unit tests verifying `RepomapViewComponent` SVG graph rendering, zoom/pan controls, and symbol node search. [Files: packages/frontend/src/app/components/views/repomap-view.component.ts, packages/frontend/src/app/components/views/repomap-view.component.spec.ts] [Test: npm run test --workspace=@cacophony/frontend]
- [ ] T102.14.1: Write unit tests verifying `HashStubGenerator` method body hashing, stub comment generation, and idempotence. [Files: packages/engine/src/context/HashStubGenerator.ts, packages/engine/src/tests/hash_stub_generator.test.ts] [Test: node --test packages/engine/dist/tests/hash_stub_generator.test.js]
- [ ] T102.14.2: Write unit tests verifying `AstContextSlicer` AST depth limiting, interface preservation, and irrelevant method pruning. [Files: packages/engine/src/context/AstContextSlicer.ts, packages/engine/src/tests/ast_context_slicer.test.ts] [Test: node --test packages/engine/dist/tests/ast_context_slicer.test.js]
- [ ] T102.14.3: Write unit tests verifying `DeterministicImportInjector` missing import resolution, duplicate prevention, and import sorting. [Files: packages/engine/src/context/DeterministicImportInjector.ts, packages/engine/src/tests/deterministic_import_injector.test.ts] [Test: node --test packages/engine/dist/tests/deterministic_import_injector.test.js]
- [ ] T102.14.4: Write unit tests verifying `ImportPruningEngine` unused import detection, side-effect import preservation, and multi-line import cleanup. [Files: packages/engine/src/context/ImportPruningEngine.ts, packages/engine/src/tests/import_pruning_engine.test.ts] [Test: node --test packages/engine/dist/tests/import_pruning_engine.test.js]
- [ ] T102.14.5: Write unit tests verifying `FocusedDiffBuilder` hunk generation, line offset alignment, and context margin formatting. [Files: packages/engine/src/context/FocusedDiffBuilder.ts, packages/engine/src/tests/focused_diff_builder.test.ts] [Test: node --test packages/engine/dist/tests/focused_diff_builder.test.js]
- [ ] T102.14.6: Write unit tests verifying `ContextRecommender` related file scoring based on import graph proximity and recent commit co-edits. [Files: packages/engine/src/context/ContextRecommender.ts, packages/engine/src/tests/context_recommender.test.ts] [Test: node --test packages/engine/dist/tests/context_recommender.test.js]
- [ ] T102.14.7: Write unit tests verifying `IncrementalClassMerger` class member addition, existing method preservation, and decorator handling. [Files: packages/engine/src/context/IncrementalClassMerger.ts, packages/engine/src/tests/incremental_class_merger.test.ts] [Test: node --test packages/engine/dist/tests/incremental_class_merger.test.js]
- [ ] T102.14.8: Write unit tests verifying `MultiFileEditCoordinator` atomic multi-file staged writes, rollback on write error, and lock acquisition. [Files: packages/engine/src/context/MultiFileEditCoordinator.ts, packages/engine/src/tests/multi_file_edit_coordinator.test.ts] [Test: node --test packages/engine/dist/tests/multi_file_edit_coordinator.test.js]
- [ ] T102.14.9: Write unit tests verifying `SlotFillPromptBuilder` slot token replacement, context budget clamping, and template validation. [Files: packages/engine/src/refactoring/SlotFillPromptBuilder.ts, packages/engine/src/tests/slot_fill_prompt_builder.test.ts] [Test: node --test packages/engine/dist/tests/slot_fill_prompt_builder.test.js]
- [ ] T102.14.10: Write unit tests verifying `TypeScriptMethodSplicer` method replacement by AST node match, comment retention, and indentation alignment. [Files: packages/engine/src/refactoring/TypeScriptMethodSplicer.ts, packages/engine/src/tests/typescript_method_splicer.test.ts] [Test: node --test packages/engine/dist/tests/typescript_method_splicer.test.js]
- [ ] T102.15.1: Write unit tests verifying `WorkspaceSymbolHarvester` recursive file crawling, ignore pattern filtering, and symbol indexing. [Files: packages/engine/src/repomap/WorkspaceSymbolHarvester.ts, packages/engine/src/tests/workspace_symbol_harvester.test.ts] [Test: node --test packages/engine/dist/tests/workspace_symbol_harvester.test.js]
- [ ] T102.15.2: Write unit tests verifying `SymbolGraphBuilder` symbol dependency graph construction, cycle detection, and topological sorting. [Files: packages/engine/src/repomap/SymbolGraphBuilder.ts, packages/engine/src/tests/symbol_graph_builder.test.ts] [Test: node --test packages/engine/dist/tests/symbol_graph_builder.test.js]
- [ ] T102.15.3: Write unit tests verifying `SymbolExtractor` interface, function, and variable extraction across TypeScript files. [Files: packages/engine/src/repomap/SymbolExtractor.ts, packages/engine/src/tests/symbol_extractor.test.ts] [Test: node --test packages/engine/dist/tests/symbol_extractor.test.js]
- [ ] T102.15.4: Write unit tests verifying `RepoMapGenerator` PageRank symbol importance scoring, Markdown summary formatting, and token budgeting. [Files: packages/engine/src/repomap/RepoMapGenerator.ts, packages/engine/src/tests/repo_map_generator.test.ts] [Test: node --test packages/engine/dist/tests/repo_map_generator.test.js]
- [ ] T102.15.5: Write unit tests verifying `SymbolGraph` node insertion, edge querying, neighbor traversal, and connected component isolation. [Files: packages/engine/src/repomap/SymbolGraph.ts, packages/engine/src/tests/symbol_graph.test.ts] [Test: node --test packages/engine/dist/tests/symbol_graph.test.js]
- [ ] T102.15.6: Write unit tests verifying `MethodEditAdapter` diff application, boundary validation, and error reporting on target not found. [Files: packages/engine/src/refactoring/MethodEditAdapter.ts, packages/engine/src/tests/method_edit_adapter.test.ts] [Test: node --test packages/engine/dist/tests/method_edit_adapter.test.js]
- [ ] T102.15.7: Write unit tests verifying `HashStubMethodSplicer` hash comparison, change detection, and stub replacement. [Files: packages/engine/src/context/HashStubMethodSplicer.ts, packages/engine/src/tests/hash_stub_method_splicer.test.ts] [Test: node --test packages/engine/dist/tests/hash_stub_method_splicer.test.js]
- [ ] T102.15.8: Write unit tests verifying `ContextManager` multi-source context assembly, priority ordering, and cache eviction. [Files: packages/engine/src/context/ContextManager.ts, packages/engine/src/tests/context_manager.test.ts] [Test: node --test packages/engine/dist/tests/context_manager.test.js]
- [ ] T102.16.1: Write unit tests verifying `FleetMasterCoordinator` remote worker heartbeat tracking, task dispatch distribution, and timeout failover. [Files: packages/engine/src/fleet/FleetMasterCoordinator.ts, packages/engine/src/tests/fleet_master_coordinator.test.ts] [Test: node --test packages/engine/dist/tests/fleet_master_coordinator.test.js]
- [ ] T102.16.2: Write unit tests verifying `FleetWebSocketClient` connection lifecycle, handshake message exchange, and heartbeat transmission. [Files: packages/engine/src/fleet/FleetWebSocketClient.ts, packages/engine/src/tests/fleet_websocket_client.test.ts] [Test: node --test packages/engine/dist/tests/fleet_websocket_client.test.js]
- [ ] T102.16.3: Write unit tests verifying `FleetHealthMonitor` unhealthy node detection, eviction triggers, and recovery state notifications. [Files: packages/engine/src/fleet/FleetHealthMonitor.ts, packages/engine/src/tests/fleet_health_monitor.test.ts] [Test: node --test packages/engine/dist/tests/fleet_health_monitor.test.js]
- [ ] T102.16.4: Write unit tests verifying `WorkspaceIsolationManager` ephemeral worktree creation, clean teardown, and git lock protection. [Files: packages/engine/src/isolation/WorkspaceIsolationManager.ts, packages/engine/src/tests/workspace_isolation_manager.test.ts] [Test: node --test packages/engine/dist/tests/workspace_isolation_manager.test.js]
- [ ] T102.16.5: Write unit tests verifying `ScreenBuffer` character cell grid updates, ANSI color styling, and dirty rect calculation. [Files: packages/engine/src/tui/ScreenBuffer.ts, packages/engine/src/tests/screen_buffer.test.ts] [Test: node --test packages/engine/dist/tests/screen_buffer.test.js]
- [ ] T102.16.6: Write unit tests verifying `TuiTheme` color palette definition, contrast ratios, and theme switching. [Files: packages/engine/src/tui/TuiTheme.ts, packages/engine/src/tests/tui_theme.test.ts] [Test: node --test packages/engine/dist/tests/tui_theme.test.js]
- [ ] T102.16.7: Write unit tests verifying `TuiPanes` split pane layout calculation, focus navigation, and pane resize events. [Files: packages/engine/src/tui/TuiPanes.ts, packages/engine/src/tests/tui_panes.test.ts] [Test: node --test packages/engine/dist/tests/tui_panes.test.js]
- [ ] T102.16.8: Write unit tests verifying `TerminalApp` key event handling, render loop throttling, and clean terminal exit. [Files: packages/engine/src/tui/TerminalApp.ts, packages/engine/src/tests/terminal_app.test.ts] [Test: node --test packages/engine/dist/tests/terminal_app.test.js]
- [ ] T102.17.1: Write unit tests verifying `StochasticHyperparameterOptimizer` temperature perturbation, prompt variation sampling, and score comparison. [Files: packages/engine/src/optimization/StochasticHyperparameterOptimizer.ts, packages/engine/src/tests/stochastic_hyperparameter_optimizer.test.ts] [Test: node --test packages/engine/dist/tests/stochastic_hyperparameter_optimizer.test.js]
- [ ] T102.17.2: Write unit tests verifying `HistoricalArenaIngestionAdapter` task outcome record ingestion, metric parsing, and database batch staging. [Files: packages/engine/src/optimization/HistoricalArenaIngestionAdapter.ts, packages/engine/src/tests/historical_arena_ingestion_adapter.test.ts] [Test: node --test packages/engine/dist/tests/historical_arena_ingestion_adapter.test.js]
- [ ] T102.17.3: Write unit tests verifying `DatasetVersionMigrator` schema version validation, transformation rule application, and rollback checkpoints. [Files: packages/engine/src/optimization/DatasetVersionMigrator.ts, packages/engine/src/tests/dataset_version_migrator.test.ts] [Test: node --test packages/engine/dist/tests/dataset_version_migrator.test.js]
- [ ] T102.17.4: Write unit tests verifying `RuleBacktestRunner` historical task playback against candidate rule sets, false positive/negative counting, and report generation. [Files: packages/engine/src/optimization/RuleBacktestRunner.ts, packages/engine/src/tests/rule_backtest_runner.test.ts] [Test: node --test packages/engine/dist/tests/rule_backtest_runner.test.js]
- [ ] T102.17.5: Write unit tests verifying `CommitImpactTracker` commit-to-test pass correlation, regression blame attribution, and stability score computation. [Files: packages/engine/src/analytics/CommitImpactTracker.ts, packages/engine/src/tests/commit_impact_tracker.test.ts] [Test: node --test packages/engine/dist/tests/commit_impact_tracker.test.js]
- [ ] T102.17.6: Write unit tests verifying `PlateauInterventionDispatcher` stagnation detection across sliding windows and intervention trigger dispatches. [Files: packages/engine/src/analytics/PlateauInterventionDispatcher.ts, packages/engine/src/tests/plateau_intervention_dispatcher.test.ts] [Test: node --test packages/engine/dist/tests/plateau_intervention_dispatcher.test.js]

---

## Phase 101: Test Command Scoping Regression Mitigation, Orphaned Subtask Reconciliation, and Automated Epoch Recovery

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-101-test-command-scoping-regression-mitigation-orphaned-subtask-reconciliation-and-automated-epoch-recovery)_

---

## Phase 100: Deterministic Guardrails, AST Inline Template Elimination, Resilient Seed Loading & Automated Regression Mitigation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-100-deterministic-guardrails-ast-inline-template-elimination-resilient-seed-loading--automated-regression-mitigation)_


---

## Phase 47: Queue Execution Recovery, Stale Task Reclamation & Scheduler Resilience

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-47-queue-execution-recovery-stale-task-reclamation--scheduler-resilience)_

---

## Phase 55: Multi-Armed Bandit Model Exploration & Empirical Reward Engine

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-55-multi-armed-bandit-model-exploration--empirical-reward-engine)_

---

## Phase 56: Distributed Heterogeneous Fleet Orchestration & Hardware Telemetry

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-56-distributed-heterogeneous-fleet-orchestration--hardware-telemetry)_

---

## Phase 57: Rolling 100-Task Success Meter & Failure-to-Success Quality Telemetry

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-57-rolling-100-task-success-meter--failure-to-success-quality-telemetry)_

---

## Phase 59: Live Test Execution Stream & Dedicated Testing Panel (Refactoring 'Processes' View to 'Testing')

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-59-live-test-execution-stream--dedicated-testing-panel-refactoring-processes-view-to-testing)_

---

## Phase 60: Real Multi-Armed Bandit Implementation (Thompson Sampling, UCB-1 & Epsilon-Greedy Wireup)

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-60-real-multi-armed-bandit-implementation-thompson-sampling-ucb-1--epsilon-greedy-wireup)_

---

## Phase 62: AST Context Slicing, Import Pruning & Focused Prompt Generation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-62-ast-context-slicing-import-pruning--focused-prompt-generation)_

---

## Phase 63: Automated Remediation Loop & Compiler Diagnostic Feedback Propagation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-63-automated-remediation-loop--compiler-diagnostic-feedback-propagation)_

---

## Phase 64: Gitea Autonomous Worktree Management, PR Automation & Review Verdicts

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-64-gitea-autonomous-worktree-management-pr-automation--review-verdicts)_

---

## Phase 65: Mobile-First Testing View Polish, Responsive Process Manager & Live Test Telemetry

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-65-mobile-first-testing-view-polish-responsive-process-manager--live-test-telemetry)_

---

## Phase 66: Clean Slate Real-History Persistence & Model Stat Reset Daemon

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-66-clean-slate-real-history-persistence--model-stat-reset-daemon)_

---

## Phase 67: Real-Time Stream Tap Filtering & Multi-Task Tap Isolation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-67-real-time-stream-tap-filtering--multi-task-tap-isolation)_

---

## Phase 68: Multi-Model Load Balancer & VRAM-Aware Task Placement

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-68-multi-model-load-balancer--vram-aware-task-placement)_

---

## Phase 69: Telemetry Visual Redesign, Hardware Safety Limits & Self-Healing Pipeline Remediation

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-69-telemetry-visual-redesign-hardware-safety-limits--self-healing-pipeline-remediation)_

---

## Phase 70: Schematic Code Generators, Import Scaffolding & Zero-Boilerplate Generation Architecture

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-70-schematic-code-generators-import-scaffolding--zero-boilerplate-generation-architecture)_

---

## Phase 71: Dataset Schema Versioning & Pluggable Compute / Inference Profiles

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-71-dataset-schema-versioning--pluggable-compute--inference-profiles)_

---

## Phase 72: Taskcade Metadata Specifiers, Granular Pipeline Hints & Agent Ingestion Protocol

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-72-taskcade-metadata-specifiers-granular-pipeline-hints--agent-ingestion-protocol)_

---


## Phase 74: Security Hardening, Operational Resilience & Infrastructure Mitigations

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-74-security-hardening-operational-resilience--infrastructure-mitigations)_

---

## Phase 76: Frontend Model Fleet Manager, Download Terminal & Tenancy Controls

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-76-frontend-model-fleet-manager-download-terminal--tenancy-controls)_

---

## Phase 80: Multi-Stage Staging (Gitea) to Production (GitHub) Release Gate & Batched Promotion Pipeline

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-80-multi-stage-staging-gitea-to-production-github-release-gate--batched-promotion-pipeline)_

---

## Phase 81: Autonomous Project File Ingestion, Architectural Decomposer & Acceptance Criteria Engine

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-81-autonomous-project-file-ingestion-architectural-decomposer--acceptance-criteria-engine)_

---

## Phase 82: Arena Telemetry Epoching & Clean-Slate Model Health Reset Engine

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-82-arena-telemetry-epoching--clean-slate-model-health-reset-engine)_

---

## Phase 83: Heterogeneous Hardware Detection, Zero-Config Hardware Profiler & Contributor Onboarding Engine

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-83-heterogeneous-hardware-detection-zero-config-hardware-profiler--contributor-onboarding-engine)_

---

## Phase 84: Auto-Mode Hardening & Bi-Directional GitHub Issue Sync

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-84-auto-mode-hardening--bi-directional-github-issue-sync)_

---

## Phase 85: Multi-Window Convergence Analytics, Git Regression Pinpointing & Plateau Intervention Dispatcher

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-85-multi-window-convergence-analytics-git-regression-pinpointing--plateau-intervention-dispatcher)_

---

## Phase 86: Distributed Fleet Load Balancing & Elastic Worker Scaling

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-86-distributed-fleet-load-balancing--elastic-worker-scaling)_

## Phase 87: Predictive Telemetry Pre-fetching & Caching Optimization

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-87-predictive-telemetry-pre-fetching--caching-optimization)_

---

## Phase 88: Critical Code-Safe Generation & Independent PR Assessment

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-88-critical-code-safe-generation--independent-pr-assessment)_

---

## Phase 89: Two-Tier Review Gates, Anti-Stub AST Enforcement & Role-Tiered Model Routing

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-89-two-tier-review-gates-anti-stub-ast-enforcement--role-tiered-model-routing)_

---

## Phase 96: Granular Test Suites, Strict Typing Hardening & Edge-Case Guardrails

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-96-granular-test-suites-strict-typing-hardening--edge-case-guardrails)_

---

## Phase 97: Hardware Diagnostics, Sensor Parsing & Dynamic Resolver Unit Tests

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-97-hardware-diagnostics-sensor-parsing--dynamic-resolver-unit-tests)_

---

## Phase 98: Heuristic Scrubbers, AST Parsers & Commit Generators Hardening

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-98-heuristic-scrubbers-ast-parsers--commit-generators-hardening)_

---

## Phase 99: Commit-to-Task Attribution, Deterministic Task Rehabilitation & Resilient Failure Requeue Pipeline

_Completed & Archived — See [`docs/taskcade-history.md`](taskcade-history.md#archived-phase-99-commit-to-task-attribution-deterministic-task-rehabilitation--resilient-failure-requeue-pipeline)_

---

## Rehabilitated Taskcade Queue

_All active taskcade failure rehabilitations completed and verified. Archived in [`docs/taskcade-history.md`](taskcade-history.md#archived-rehabilitated-tasks-phase-97--phase-102-queue-recovery)_

