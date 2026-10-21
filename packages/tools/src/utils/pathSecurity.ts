import * as path from "node:path";

/**
 * Validates and resolves a target path against a workspace root to prevent directory traversal attacks.
 *
 * @param workspaceRoot Base directory where file operations are restricted.
 * @param relativeOrAbsolutePath Requested file or directory path.
 * @returns Fully qualified, normalized absolute path safely bounded within workspaceRoot.
 * @throws Error if the resolved path attempts to escape the workspace boundary.
 */
export function resolveSafePath(workspaceRoot: string, relativeOrAbsolutePath: string): string {
  const normalizedRoot = path.resolve(workspaceRoot);
  const cleanPath = relativeOrAbsolutePath.trim().replace(/[,;:]+$/, "");
  const resolved = path.isAbsolute(cleanPath)
    ? path.resolve(cleanPath)
    : path.resolve(normalizedRoot, cleanPath);

  // Check boundary constraints
  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error(`Security Violation: Target path "${relativeOrAbsolutePath}" attempts to escape workspace root "${workspaceRoot}".`);
  }

  return resolved;
}
