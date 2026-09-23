import * as fs from "node:fs";
import * as path from "node:path";
import type { IStackProfile } from "./IStackProfile.js";
import { DEFAULT_STACK_PROFILES, GENERIC_STACK_PROFILE } from "./defaultProfiles.js";

/**
 * StackDetector
 *
 * Probes the target workspace directory to automatically detect active technology stacks,
 * module systems, and test runners based on marker files and configuration signatures.
 */
export class StackDetector {
  private readonly profiles: readonly IStackProfile[];

  constructor(customProfiles?: readonly IStackProfile[]) {
    this.profiles = customProfiles && customProfiles.length > 0
      ? [...customProfiles, ...DEFAULT_STACK_PROFILES]
      : DEFAULT_STACK_PROFILES;
  }

  /**
   * Detects the matching stack profile for a project directory.
   */
  public detect(projectDir: string): IStackProfile {
    for (const profile of this.profiles) {
      for (const marker of profile.markers) {
        const markerPath = path.resolve(projectDir, marker.file);
        if (fs.existsSync(markerPath)) {
          if (!marker.contentContains) {
            return profile;
          }

          // Check if file content matches signature substring
          try {
            const content = fs.readFileSync(markerPath, "utf-8").toLowerCase();
            if (content.includes(marker.contentContains.toLowerCase())) {
              return profile;
            }
          } catch {
            // Ignore read errors
          }
        }
      }
    }

    return GENERIC_STACK_PROFILE;
  }

  /**
   * Looks up a registered stack profile by its unique ID.
   */
  public getById(id: string): IStackProfile {
    const found = this.profiles.find((p) => p.id === id);
    return found ?? GENERIC_STACK_PROFILE;
  }
}
