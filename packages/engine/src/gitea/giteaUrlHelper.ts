/**
 * Utility helper for normalizing and sanitizing Git/Gitea URLs.
 *
 * Inside containerized environments, internal services communicate using Docker network
 * aliases (e.g. `http://cacophony-gitea:3000`). However, links exposed to client browsers
 * or saved in user-facing task records must resolve to the externally accessible endpoint
 * (e.g. `http://localhost:19634` configured via `GITEA_PUBLIC_URL`).
 *
 * This utility reliably translates internal docker container aliases and custom protocol
 * schemes into consistent, browser-accessible HTTP URLs.
 */

/**
 * Normalizes a raw Gitea URL by replacing any internal Docker container alias or
 * invalid custom protocol scheme with the configured public host URL.
 *
 * @param rawUrl The raw URL string returned from Gitea API or stored in records.
 * @param overridePublicBase Optional override for the public base URL.
 * @returns The normalized, browser-accessible URL string, or null if input was empty.
 */
export function normalizeGiteaUrl(
  rawUrl: string | null | undefined,
  overridePublicBase?: string,
): string | null {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  let publicBase = (
    overridePublicBase ||
    process.env["GITEA_PUBLIC_URL"] ||
    "http://localhost:19634"
  );
  while (publicBase.endsWith("/")) {
    publicBase = publicBase.slice(0, -1);
  }

  // Match:
  // 1. http://cacophony-gitea:3000/... or https://cacophony-gitea:3000/...
  // 2. http://cacophony-gitea/... or https://cacophony-gitea/...
  // 3. cacophony-gitea://cacophony-gitea:3000/... or cacophony-gitea://owner/repo/...
  // 4. //cacophony-gitea:3000/...
  let normalized = trimmed;

  if (/^(?:https?:)?\/\/cacophony-gitea(?::\d+)?/i.test(normalized)) {
    normalized = normalized.replace(
      /^(?:https?:)?\/\/cacophony-gitea(?::\d+)?/i,
      publicBase,
    );
  } else if (/^cacophony-gitea:\/\//i.test(normalized)) {
    const afterScheme = normalized.replace(/^cacophony-gitea:\/\//i, "");
    let cleanPath = afterScheme.replace(/^cacophony-gitea(?::\d+)?\/?/i, "");
    while (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.slice(1);
    }
    normalized = `${publicBase}/${cleanPath}`;
  }

  return normalized;
}
