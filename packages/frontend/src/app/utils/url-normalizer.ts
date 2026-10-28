/**
 * Utility functions for frontend URL normalization and sanitization.
 * Ensures internal container hosts and custom schemes (such as `cacophony-gitea`),
 * ephemeral Docker container ID hashes, or hardcoded `localhost` references are safely
 * remapped to browser-accessible host endpoints using the domain of the host
 * as primary access for local DNS and mobile clients.
 */

let globalFrontendHostDomainOverride: string | null = null;

/**
 * Checks if a hostname matches an ephemeral Docker container ID hash (12 or 64 hex characters).
 */
export function isContainerId(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const clean = hostname.trim().toLowerCase();
  return /^[0-9a-f]{12}$/.test(clean) || /^[0-9a-f]{64}$/.test(clean);
}

/**
 * Sets a runtime override for the host domain in the frontend.
 */
export function setFrontendHostDomain(domain: string | null | undefined): void {
  globalFrontendHostDomainOverride = domain ? domain.trim() : null;
}

/**
 * Resolves the current host domain from the browser environment.
 */
export function resolveFrontendHostDomain(): string {
  if (globalFrontendHostDomainOverride && !isContainerId(globalFrontendHostDomainOverride)) {
    return globalFrontendHostDomainOverride;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname.trim();
    if (host && !isContainerId(host)) {
      return host;
    }
  }
  return 'localhost';
}

/**
 * Resolves the default browser base URL for Gitea links.
 */
export function getDefaultFrontendGiteaBase(): string {
  const host = resolveFrontendHostDomain();
  const protocol =
    typeof window !== 'undefined' && window.location && window.location.protocol
      ? window.location.protocol
      : 'http:';
  return `${protocol}//${host}:19634`;
}

/**
 * Sanitizes a Git/Gitea URL to ensure it points to a browser-accessible host.
 * Automatically adapts to the current host domain when accessed from
 * mobile devices or local network clients.
 *
 * @param rawUrl The URL returned from the server or task entity.
 * @param publicBase Optional explicit override for public host URL.
 * @returns The sanitized, clickable URL string.
 */
export function sanitizeGiteaUrl(
  rawUrl: string | null | undefined,
  publicBase?: string,
): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '';
  }

  let base = publicBase || getDefaultFrontendGiteaBase();
  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }

  let result = trimmed;

  // 1. http(s)://cacophony-gitea:3000/... or http(s)://cacophony-gitea/...
  if (/^(?:https?:)?\/\/cacophony-gitea(?::\d+)?/i.test(result)) {
    result = result.replace(/^(?:https?:)?\/\/cacophony-gitea(?::\d+)?/i, base);
  } else if (/^cacophony-gitea:\/\//i.test(result)) {
    // 2. Custom protocol alias: cacophony-gitea://cacophony-gitea:3000/... or cacophony-gitea://owner/repo/...
    const afterScheme = result.replace(/^cacophony-gitea:\/\//i, '');
    let cleanPath = afterScheme.replace(/^cacophony-gitea(?::\d+)?\/?/i, '');
    while (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.slice(1);
    }
    result = `${base}/${cleanPath}`;
  }

  // 3. Remap ephemeral Docker container ID hostnames (12 or 64 hex characters) e.g. //ac2c026bbfff:19634
  result = result.replace(
    /^(https?:\/\/)[0-9a-f]{12,64}(?::\d+)?(\/.*)?$/i,
    (_match, _proto, restPath) => `${base}${restPath || ''}`,
  );

  // 4. If primary host is not localhost/127.0.0.1, dynamically remap hardcoded localhost:19634 links
  // so mobile devices can access them through local DNS:
  const hostDomain = resolveFrontendHostDomain();
  if (
    hostDomain &&
    hostDomain !== 'localhost' &&
    hostDomain !== '127.0.0.1' &&
    !base.includes('//localhost') &&
    !base.includes('//127.0.0.1')
  ) {
    result = result.replace(
      /^(https?:\/\/)(?:localhost|127\.0\.0\.1):19634(\/.*)?$/i,
      `$1${hostDomain}:19634$2`,
    );
  }

  return result;
}
