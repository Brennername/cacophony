import * as os from "node:os";

/**
 * Utility helper for normalizing and sanitizing Git/Gitea URLs.
 *
 * Inside containerized environments, internal services communicate using Docker network
 * aliases (e.g. `http://cacophony-gitea:3000`). However, links exposed to client browsers
 * or saved in user-facing task records must resolve to the externally accessible endpoint
 * (e.g. `http://nexen-desktop:19634` or configured host domain).
 *
 * When accessed from mobile devices on a local area network or VPN, `localhost` links fail
 * because `localhost` resolves to the phone itself. This utility dynamically ensures
 * the host machine's domain (e.g. `nexen-desktop`) is used as the primary access endpoint.
 */

let globalHostDomainOverride: string | null = null;

/**
 * Sets a runtime global host domain override (e.g. from server configuration, incoming requests, or CLI).
 */
export function setGlobalHostDomain(domain: string | null | undefined): void {
  globalHostDomainOverride = domain ? domain.trim() : null;
}

/**
 * Returns the currently configured global host domain, if any.
 */
export function getGlobalHostDomain(): string | null {
  return globalHostDomainOverride;
}

/**
 * Resolves the primary host domain for external client access.
 * Priority order:
 * 1. Runtime global override set via setGlobalHostDomain()
 * 2. Explicit environment variables: HOST_DOMAIN, PUBLIC_HOST, CUSTOM_DOMAIN
 * 3. System hostname from os.hostname() when available and not a loopback
 * 4. Fallback to "localhost"
 */
export function resolvePrimaryHostDomain(): string {
  if (globalHostDomainOverride) {
    return globalHostDomainOverride;
  }

  const envHost =
    process.env["HOST_DOMAIN"] ||
    process.env["PUBLIC_HOST"] ||
    process.env["CUSTOM_DOMAIN"];
  if (envHost && envHost.trim()) {
    return envHost.trim();
  }

  try {
    const sysHostname = os.hostname();
    if (
      sysHostname &&
      sysHostname.trim() &&
      sysHostname !== "localhost" &&
      sysHostname !== "127.0.0.1" &&
      sysHostname !== "::1"
    ) {
      return sysHostname.trim();
    }
  } catch {
    // os.hostname may fail in restricted sandboxes
  }

  return "localhost";
}

/**
 * Resolves the effective public base URL for Gitea browser clicks.
 * If overridePublicBase or clientHost is supplied, it is preferred.
 * Otherwise, resolves against GITEA_PUBLIC_URL remapped to primary host domain.
 */
export function resolvePublicGiteaBase(
  overridePublicBase?: string | null,
  clientHost?: string | null,
): string {
  if (overridePublicBase && overridePublicBase.trim()) {
    let base = overridePublicBase.trim();
    while (base.endsWith("/")) {
      base = base.slice(0, -1);
    }
    return base;
  }

  const giteaPort = process.env["PORT_GITEA_HTTP"] || "19634";

  // If clientHost was passed (e.g. from an HTTP request's Host or X-Forwarded-Host header),
  // extract host without port and use it:
  if (clientHost && clientHost.trim()) {
    const cleanHost = clientHost.trim().split(":")[0]!;
    if (cleanHost && cleanHost !== "localhost" && cleanHost !== "127.0.0.1") {
      return `http://${cleanHost}:${giteaPort}`;
    }
  }

  const configuredPublicUrl = process.env["GITEA_PUBLIC_URL"]?.trim();
  const primaryDomain = resolvePrimaryHostDomain();

  if (configuredPublicUrl) {
    let base = configuredPublicUrl;
    while (base.endsWith("/")) {
      base = base.slice(0, -1);
    }
    // If the configured URL uses localhost/127.0.0.1, and a primary host domain exists
    // (e.g. nexen-desktop or HOST_DOMAIN), remap it to the primary host domain
    // so mobile devices on LAN can resolve the link via local DNS:
    if (primaryDomain !== "localhost" && primaryDomain !== "127.0.0.1") {
      base = base.replace(
        /^(https?:\/\/)(?:localhost|127\.0\.0\.1)(?::\d+)?/i,
        `$1${primaryDomain}:${giteaPort}`,
      );
    }
    return base;
  }

  return `http://${primaryDomain}:${giteaPort}`;
}

/**
 * Normalizes a raw Gitea URL by replacing any internal Docker container alias,
 * invalid custom protocol scheme, or hardcoded localhost loopback with the primary
 * browser-accessible host domain.
 *
 * @param rawUrl The raw URL string returned from Gitea API or stored in records.
 * @param overridePublicBase Optional override for the public base URL.
 * @param clientHost Optional client host domain extracted from incoming request headers.
 * @returns The normalized, browser-accessible URL string, or null if input was empty.
 */
export function normalizeGiteaUrl(
  rawUrl: string | null | undefined,
  overridePublicBase?: string | null,
  clientHost?: string | null,
): string | null {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  const publicBase = resolvePublicGiteaBase(overridePublicBase, clientHost);
  let normalized = trimmed;

  // 1. Remap internal Docker container aliases: //cacophony-gitea(?::\d+)? or cacophony-gitea://
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

  // 2. If publicBase points to a host domain (such as nexen-desktop),
  //    remap any hardcoded localhost/127.0.0.1 references in Gitea URLs so mobile devices
  //    and local DNS can reach the link when clicked:
  if (
    publicBase &&
    !publicBase.includes("//localhost") &&
    !publicBase.includes("//127.0.0.1")
  ) {
    normalized = normalized.replace(
      /^(https?:\/\/)(?:localhost|127\.0\.0\.1)(?::\d+)?(\/.*)?$/i,
      (_match, _proto, restPath) => {
        return `${publicBase}${restPath || ""}`;
      },
    );
  }

  return normalized;
}
