import { z } from "zod";
import { AgentRoleSchema } from "./task.js";

/**
 * System configuration schema governing Cacophony execution parameters.
 */
export const CacophonySystemConfigSchema = z.object({
  system_name: z.string().default("cacophony"),
  data_dir: z.string().default("data/cacophony_pglite"),
  workspaces_dir: z.string().default("workspaces"),
  concurrency_limit: z.number().int().positive().default(1),
  default_session_model: z.string().default("qwen2.5-coder:7b"),
  default_context_tokens: z.number().int().positive().default(8192),
  role_models: z.record(AgentRoleSchema, z.string()),
  candidate_models: z.array(z.string()),
  eviction_thresholds: z.object({
    consecutive_failures: z.number().int().min(1).default(3),
    cooldown_period_seconds: z.number().int().default(1800)
  }),
  thermal_limits: z.object({
    nominal_max: z.number().default(70),
    warm_max: z.number().default(80),
    elevated_max: z.number().default(90),
    pacing_delays_seconds: z.object({
      nominal: z.number().default(0),
      warm: z.number().default(5),
      elevated: z.number().default(15),
      danger_pause: z.number().default(10)
    })
  }),
  execution_guards: z.object({
    blacklisted_commands: z.array(z.string()),
    max_command_timeout_ms: z.number().int().default(180000)
  }),
  deterministic_scrubbing: z.object({
    enforce_js_extension_on_relative_ts_imports: z.boolean().default(true),
    strip_unicode_emojis: z.boolean().default(true),
    banned_dependencies: z.array(z.string()).default([])
  }),
  directives: z.array(z.string())
});

export type CacophonySystemConfig = z.infer<typeof CacophonySystemConfigSchema>;
