/**
 * Utility functions for frontend URL normalization and sanitization.
 * Ensures internal container hosts and custom schemes (such as `cacophony-gitea`)
 * are safely remapped to user-accessible localhost browser endpoints.
 */

/**
 * Sanitizes a Git/Gitea URL to ensure it points to a browser-accessible host.
 *
 * @param rawUrl The URL returned from the server or task entity.
 * @param publicBase Fallback public host URL (default: http://localhost:19634).
 * @returns The sanitized, clickable URL string.
 */
export function sanitizeGiteaUrl(
  rawUrl: string | null | undefined,
  publicBase = 'http://localhost:19634',
): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '';
  }

  let base = publicBase;
  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }

  // 1. http(s)://cacophony-gitea:3000/... or http(s)://cacophony-gitea/...
  if (/^(?:https?:)?\/\/cacophony-gitea(?::\d+)?/i.test(trimmed)) {
    return trimmed.replace(/^(?:https?:)?\/\/cacophony-gitea(?::\d+)?/i, base);
  }

  // 2. Custom protocol alias: cacophony-gitea://cacophony-gitea:3000/... or cacophony-gitea://owner/repo/...
  if (/^cacophony-gitea:\/\//i.test(trimmed)) {
    const afterScheme = trimmed.replace(/^cacophony-gitea:\/\//i, '');
    let cleanPath = afterScheme.replace(/^cacophony-gitea(?::\d+)?\/?/i, '');
    while (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.slice(1);
    }
    return `${base}/${cleanPath}`;
  }

  return trimmed;
}
