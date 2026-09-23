import { z } from "zod";

/**
 * Zod schema for stack marker definition.
 */
export const StackMarkerSchema = z.object({
  file: z.string().min(1),
  contentContains: z.string().optional()
});
export type StackMarkerDto = z.infer<typeof StackMarkerSchema>;

/**
 * Zod schema for registering or updating custom stack instruction profiles.
 */
export const StackProfileDtoSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().default(""),
  markers: z.array(StackMarkerSchema).default([]),
  defaultTestRunner: z.string().default("npm test"),
  directives: z.array(z.string()).default([]),
  defaultBannedLibraries: z.array(z.string()).optional(),
  defaultAllowedLibraries: z.array(z.string()).optional(),
  defaultScrubberRules: z.array(z.string()).optional(),
  defaultDisabledScrubbers: z.array(z.string()).optional()
});
export type StackProfileDto = z.infer<typeof StackProfileDtoSchema>;

/**
 * Relational database record shape for stack instruction profiles.
 */
export interface StackProfileRecord {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaultTestRunner: string;
  readonly dataJson: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
