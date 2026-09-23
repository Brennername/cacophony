/**
 * Marker rule used to probe the workspace filesystem for project stack identification.
 */
export interface StackMarker {
  readonly file: string;
  readonly contentContains?: string;
}

/**
 * Language-agnostic specification for project stack standards, testing conventions,
 * and compiler/runtime directives.
 */
export interface IStackProfile {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly markers: readonly StackMarker[];
  readonly defaultTestRunner: string;
  readonly directives: readonly string[];
  readonly defaultBannedLibraries?: readonly string[];
  readonly defaultAllowedLibraries?: readonly string[];
  readonly defaultScrubberRules?: readonly string[];
  readonly defaultDisabledScrubbers?: readonly string[];
}
