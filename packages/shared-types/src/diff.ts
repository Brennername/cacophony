import { z } from "zod";

/**
 * Single change hunk inside a unified diff.
 */
export interface DiffHunk {
  readonly oldStart: number;
  readonly oldLines: number;
  readonly newStart: number;
  readonly newLines: number;
  readonly lines: readonly string[];
}

export const DiffHunkSchema = z.object({
  oldStart: z.number(),
  oldLines: z.number(),
  newStart: z.number(),
  newLines: z.number(),
  lines: z.array(z.string()),
});

/**
 * Structured representation of a unified file diff.
 */
export interface UnifiedDiff {
  readonly filePath: string;
  readonly hunks: readonly DiffHunk[];
  readonly rawDiff: string;
  readonly additions?: number;
  readonly deletions?: number;
}

export const UnifiedDiffSchema = z.object({
  filePath: z.string(),
  hunks: z.array(DiffHunkSchema),
  rawDiff: z.string(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
});

export type Diff = UnifiedDiff;
export const DiffSchema = UnifiedDiffSchema;
