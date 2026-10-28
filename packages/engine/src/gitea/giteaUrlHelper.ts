import * as os from "node:os";
import * as fs from "node:fs";

/**
 * Utility helper for normalizing and sanitizing Git/Gitea URLs.
 *
 * Inside containerized environments, internal services communicate using Docker network
 * aliases (e.g. `http://cacophony-gitea:3000`). However, links exposed to client browsers
 * or saved in user-facing task records must resolve to the externally accessible endpoint.
 *
 * When accessed from mobile devices on a local area network or VPN, `localhost` links fail
 * because `localhost` resolves to the phone itself. This utility dynamically ensures
 * the host machine's domain is used as the primary access endpoint while rejecting
 * ephemeral Docker container ID hashes.
 */

export interface NetworkAccessSettings {
  readonly allowLocalNetwork: boolean;
  readonly customHostSpecified: boolean;
  readonly customHostDomain: string;
}

let networkAccessSettings: NetworkAccessSettings = {
  allowLocalNetwork: true,
  customHostSpecified: false,
  customHostDomain: "localhost",
};

let globalHostDomainOverride: string | null = null;

/**
 * Checks if a given hostname matches an ephemeral Docker container ID hash (12 or 64 hex characters).
 */
export function isContainerId(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const clean = hostname.trim().toLowerCase();
  return /^[0-9a-f]{12}$/.test(clean) || /^[0-9a-f]{64}$/.test(clean);
}

/**
 * Returns the current network access and multi-device ingress settings.
 */
export function getNetworkAccessSettings(): NetworkAccessSettings {
  return { ...networkAccessSettings };
}

/**
 * Updates the network access settings and applies corresponding domain overrides.
 */
export function updateNetworkAccessSettings(
  updates: Partial<NetworkAccessSettings>,
): NetworkAccessSettings {
  const merged = {
    ...networkAccessSettings,
    ...updates,
  };
  if (merged.customHostDomain !== undefined) {
    merged.customHostDomain = merged.customHostDomain.trim() || "localhost";
  }
  networkAccessSettings = merged;
  if (!networkAccessSettings.allowLocalNetwork) {
    setGlobalHostDomain("localhost");
  } else if (networkAccessSettings.customHostSpecified) {
    setGlobalHostDomain(networkAccessSettings.customHostDomain);
  } else {
    setGlobalHostDomain(null);
  }
  return { ...networkAccessSettings };
}

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
 * 1. If local network is disabled, return "localhost"
 * 2. If custom host is specified in settings, return customHostDomain
 * 3. Runtime global override set via setGlobalHostDomain() (excluding container IDs)
 * 4. Explicit environment variables: HOST_DOMAIN, PUBLIC_HOST, CUSTOM_DOMAIN, LAN_HOSTNAME
 * 5. Host machine /etc/hostname mounted into container (/host/etc/hostname)
 * 6. Local /etc/hostname when running directly on Linux/Unix host
 * 7. System hostname from os.hostname() when available, not a loopback, and not a container ID
 * 8. Active non-internal LAN IPv4 address from network interfaces
 * 9. Fallback to "localhost"
 */
export function resolvePrimaryHostDomain(): string {
  if (!networkAccessSettings.allowLocalNetwork) {
    return "localhost";
  }

  if (networkAccessSettings.customHostSpecified) {
    return networkAccessSettings.customHostDomain.trim() || "localhost";
  }

  if (globalHostDomainOverride && !isContainerId(globalHostDomainOverride)) {
    return globalHostDomainOverride;
  }

  const envHost =
    process.env["HOST_DOMAIN"] ||
    process.env["PUBLIC_HOST"] ||
    process.env["CUSTOM_DOMAIN"] ||
    process.env["LAN_HOSTNAME"] ||
    process.env["HOST_HOSTNAME"];
  if (envHost && envHost.trim() && !isContainerId(envHost.trim())) {
    return envHost.trim();
  }

  // 1. Check mounted host /etc/hostname inside Docker container
  try {
    if (fs.existsSync("/host/etc/hostname")) {
      const hostFile = fs.readFileSync("/host/etc/hostname", "utf-8").trim();
      if (hostFile && !isContainerId(hostFile) && hostFile !== "localhost") {
        return hostFile;
      }
    }
  } catch {
    // Ignore file system read errors
  }

  // 2. Check local /etc/hostname when running directly on host
  try {
    if (fs.existsSync("/etc/hostname")) {
      const hostFile = fs.readFileSync("/etc/hostname", "utf-8").trim();
      if (hostFile && !isContainerId(hostFile) && hostFile !== "localhost") {
        return hostFile;
      }
    }
  } catch {
    // Ignore file system read errors
  }

  // 3. Check os.hostname() if it is not an ephemeral Docker container ID
  try {
    const sysHostname = os.hostname();
    if (
      sysHostname &&
      sysHostname.trim() &&
      sysHostname !== "localhost" &&
      sysHostname !== "127.0.0.1" &&
      sysHostname !== "::1" &&
      !isContainerId(sysHostname)
    ) {
      return sysHostname.trim();
    }
  } catch {
    // os.hostname may fail in restricted sandboxes
  }

  // 4. Enumerate local LAN IPv4 network interfaces if running in container without mounted hostname
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      if (
        name.startsWith("lo") ||
        name.startsWith("docker") ||
        name.startsWith("br-") ||
        name.startsWith("veth")
      ) {
        continue;
      }
      const list = interfaces[name];
      if (!list) continue;
      for (const info of list) {
        if (info.family === "IPv4" && !info.internal && !info.address.startsWith("127.")) {
          return info.address;
        }
      }
    }
  } catch {
    // Ignore network interface enumeration failures
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
  // extract host without port and use it if it is not a Docker container ID:
  if (clientHost && clientHost.trim()) {
    const cleanHost = clientHost.trim().split(":")[0]!;
    if (
      cleanHost &&
      cleanHost !== "localhost" &&
      cleanHost !== "127.0.0.1" &&
      !isContainerId(cleanHost)
    ) {
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
    // If the configured URL uses localhost/127.0.0.1 or a container ID, and a primary host domain exists,
    // remap it to the primary host domain so mobile devices on LAN can resolve the link via local DNS:
    if (
      primaryDomain !== "localhost" &&
      primaryDomain !== "127.0.0.1" &&
      !isContainerId(primaryDomain)
    ) {
      base = base.replace(
        /^(https?:\/\/)(?:localhost|127\.0\.0\.1|[0-9a-f]{12,64})(?::\d+)?/i,
        `$1${primaryDomain}:${giteaPort}`,
      );
    }
    return base;
  }

  return `http://${primaryDomain}:${giteaPort}`;
}

/**
 * Normalizes a raw Gitea URL by replacing any internal Docker container alias,
 * invalid custom protocol scheme, ephemeral container ID hash, or hardcoded localhost loopback
 * with the primary browser-accessible host domain.
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

  // 2. Remap ephemeral Docker container ID hostnames (12 or 64 hex characters) e.g. //ac2c026bbfff:19634
  normalized = normalized.replace(
    /^(https?:\/\/)[0-9a-f]{12,64}(?::\d+)?(\/.*)?$/i,
    (_match, _proto, restPath) => `${publicBase}${restPath || ""}`,
  );

  // 3. If publicBase points to a host domain,
  //    remap any hardcoded localhost/127.0.0.1 references in Gitea URLs so mobile devices
  //    and local DNS can reach the link when clicked:
  if (
    publicBase &&
    !publicBase.includes("//localhost") &&
    !publicBase.includes("//127.0.0.1")
  ) {
    normalized = normalized.replace(
      /^(https?:\/\/)(?:localhost|127\.0\.0\.1)(?::\d+)?(\/.*)?$/i,
      (_match, _proto, restPath) => `${publicBase}${restPath || ""}`,
    );
  }

  return normalized;
}
