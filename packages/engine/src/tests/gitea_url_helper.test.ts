import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGiteaUrl,
  setGlobalHostDomain,
  getGlobalHostDomain,
  resolvePrimaryHostDomain,
  resolvePublicGiteaBase,
  isContainerId,
  updateNetworkAccessSettings,
  getNetworkAccessSettings,
} from "../gitea/giteaUrlHelper.js";

describe("giteaUrlHelper normalizeGiteaUrl & Host Domain Resolution", () => {
  const originalEnvHost = process.env.HOST_DOMAIN;
  const originalPublicUrl = process.env.GITEA_PUBLIC_URL;

  beforeEach(() => {
    setGlobalHostDomain(null);
    updateNetworkAccessSettings({
      allowLocalNetwork: true,
      customHostSpecified: false,
      customHostDomain: "localhost",
    });
    delete process.env.HOST_DOMAIN;
  });

  afterEach(() => {
    setGlobalHostDomain(null);
    updateNetworkAccessSettings({
      allowLocalNetwork: true,
      customHostSpecified: false,
      customHostDomain: "localhost",
    });
    if (originalEnvHost !== undefined) {
      process.env.HOST_DOMAIN = originalEnvHost;
    } else {
      delete process.env.HOST_DOMAIN;
    }
    if (originalPublicUrl !== undefined) {
      process.env.GITEA_PUBLIC_URL = originalPublicUrl;
    } else {
      delete process.env.GITEA_PUBLIC_URL;
    }
  });

  it("should handle null and undefined safely", () => {
    assert.equal(normalizeGiteaUrl(null), null);
    assert.equal(normalizeGiteaUrl(undefined), null);
    assert.equal(normalizeGiteaUrl(""), null);
    assert.equal(normalizeGiteaUrl("   "), null);
  });

  it("should identify 12-char and 64-char Docker container ID hashes", () => {
    assert.equal(isContainerId("ac2c026bbfff"), true);
    assert.equal(
      isContainerId("ac2c026bbfff111122223333444455556666777788889999aaaabbbbccccdddd"),
      true,
    );
    assert.equal(isContainerId("localhost"), false);
    assert.equal(isContainerId("my-host.local"), false);
    assert.equal(isContainerId(""), false);
    assert.equal(isContainerId(null), false);
  });

  it("should normalize http://cacophony-gitea:3000 to public base", () => {
    const raw = "http://cacophony-gitea:3000/NeXeN/cacophony/pulls/101";
    const normalized = normalizeGiteaUrl(raw, "http://localhost:19634");
    assert.equal(normalized, "http://localhost:19634/NeXeN/cacophony/pulls/101");
  });

  it("should normalize cacophony-gitea:// custom scheme to public base", () => {
    const raw = "cacophony-gitea://NeXeN/cacophony/pulls/77";
    const normalized = normalizeGiteaUrl(raw, "http://localhost:19634");
    assert.equal(normalized, "http://localhost:19634/NeXeN/cacophony/pulls/77");
  });

  it("should normalize ephemeral Docker container ID hostnames to public base", () => {
    setGlobalHostDomain("custom-lan.local");
    const containerUrl = "http://ac2c026bbfff:19634/NeXeN/cacophony/issues/908";
    const normalized = normalizeGiteaUrl(containerUrl);
    assert.equal(
      normalized,
      "http://custom-lan.local:19634/NeXeN/cacophony/issues/908",
    );
  });

  it("should preserve clean external and localhost URLs when override is localhost", () => {
    const local = "http://localhost:19634/NeXeN/cacophony/pulls/5";
    assert.equal(normalizeGiteaUrl(local, "http://localhost:19634"), local);

    const gh = "https://github.com/Brennername/cacophony/pull/99";
    assert.equal(normalizeGiteaUrl(gh, "http://localhost:19634"), gh);
  });

  it("should dynamically resolve clientHost domain (e.g. from mobile request) instead of localhost", () => {
    const rawContainer = "http://cacophony-gitea:3000/NeXeN/cacophony/pulls/108";
    const normalized = normalizeGiteaUrl(rawContainer, undefined, "custom-lan.local:24161");
    assert.equal(normalized, "http://custom-lan.local:19634/NeXeN/cacophony/pulls/108");

    // Also remaps raw localhost link to clientHost domain for mobile access
    const rawLocal = "http://localhost:19634/NeXeN/cacophony/issues/868";
    const remapped = normalizeGiteaUrl(rawLocal, undefined, "custom-lan.local:24161");
    assert.equal(remapped, "http://custom-lan.local:19634/NeXeN/cacophony/issues/868");
  });

  it("should support setGlobalHostDomain to configure host domain globally", () => {
    setGlobalHostDomain("lan-server.local");
    assert.equal(getGlobalHostDomain(), "lan-server.local");
    assert.equal(resolvePrimaryHostDomain(), "lan-server.local");

    const base = resolvePublicGiteaBase();
    assert.equal(base, "http://lan-server.local:19634");

    const raw = "http://localhost:19634/NeXeN/cacophony/pulls/50";
    const normalized = normalizeGiteaUrl(raw);
    assert.equal(normalized, "http://lan-server.local:19634/NeXeN/cacophony/pulls/50");
  });

  it("should prioritize HOST_DOMAIN environment variable if global setter is null", () => {
    process.env.HOST_DOMAIN = "internal-lan.box";
    assert.equal(resolvePrimaryHostDomain(), "internal-lan.box");

    const raw = "cacophony-gitea://NeXeN/cacophony/pulls/12";
    const normalized = normalizeGiteaUrl(raw);
    assert.equal(normalized, "http://internal-lan.box:19634/NeXeN/cacophony/pulls/12");
  });

  it("should reject container IDs from HOST_DOMAIN environment variable and fall back", () => {
    process.env.HOST_DOMAIN = "ac2c026bbfff";
    // Should reject the 12-char hex container id and fall back
    const resolved = resolvePrimaryHostDomain();
    assert.notEqual(resolved, "ac2c026bbfff");
  });

  it("should respect network access settings to disable local network or specify custom host", () => {
    // 1. When local network is disabled, force localhost
    updateNetworkAccessSettings({ allowLocalNetwork: false });
    assert.equal(resolvePrimaryHostDomain(), "localhost");

    // 2. When custom host is specified, use custom host domain
    updateNetworkAccessSettings({
      allowLocalNetwork: true,
      customHostSpecified: true,
      customHostDomain: "specified-host.local",
    });
    assert.equal(resolvePrimaryHostDomain(), "specified-host.local");

    // 3. When custom host is specified with empty string, default to localhost
    updateNetworkAccessSettings({
      allowLocalNetwork: true,
      customHostSpecified: true,
      customHostDomain: "  ",
    });
    assert.equal(resolvePrimaryHostDomain(), "localhost");
    const current = getNetworkAccessSettings();
    assert.equal(current.allowLocalNetwork, true);
    assert.equal(current.customHostSpecified, true);
    assert.equal(current.customHostDomain, "localhost");
  });
});
