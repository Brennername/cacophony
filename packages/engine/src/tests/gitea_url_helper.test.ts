import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGiteaUrl,
  setGlobalHostDomain,
  getGlobalHostDomain,
  resolvePrimaryHostDomain,
  resolvePublicGiteaBase,
} from "../gitea/giteaUrlHelper.js";

describe("giteaUrlHelper normalizeGiteaUrl & Host Domain Resolution", () => {
  const originalEnvHost = process.env.HOST_DOMAIN;
  const originalPublicUrl = process.env.GITEA_PUBLIC_URL;

  beforeEach(() => {
    setGlobalHostDomain(null);
    delete process.env.HOST_DOMAIN;
  });

  afterEach(() => {
    setGlobalHostDomain(null);
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

  it("should preserve clean external and localhost URLs when override is localhost", () => {
    const local = "http://localhost:19634/NeXeN/cacophony/pulls/5";
    assert.equal(normalizeGiteaUrl(local, "http://localhost:19634"), local);

    const gh = "https://github.com/Brennername/cacophony/pull/99";
    assert.equal(normalizeGiteaUrl(gh, "http://localhost:19634"), gh);
  });

  it("should dynamically resolve clientHost domain (e.g. from mobile request) instead of localhost", () => {
    const rawContainer = "http://cacophony-gitea:3000/NeXeN/cacophony/pulls/108";
    const normalized = normalizeGiteaUrl(rawContainer, undefined, "nexen-desktop:24161");
    assert.equal(normalized, "http://nexen-desktop:19634/NeXeN/cacophony/pulls/108");

    // Also remaps raw localhost link to clientHost domain for mobile access
    const rawLocal = "http://localhost:19634/NeXeN/cacophony/issues/868";
    const remapped = normalizeGiteaUrl(rawLocal, undefined, "nexen-desktop:24161");
    assert.equal(remapped, "http://nexen-desktop:19634/NeXeN/cacophony/issues/868");
  });

  it("should support setGlobalHostDomain to configure host domain globally", () => {
    setGlobalHostDomain("nexen-desktop");
    assert.equal(getGlobalHostDomain(), "nexen-desktop");
    assert.equal(resolvePrimaryHostDomain(), "nexen-desktop");

    const base = resolvePublicGiteaBase();
    assert.equal(base, "http://nexen-desktop:19634");

    const raw = "http://localhost:19634/NeXeN/cacophony/pulls/50";
    const normalized = normalizeGiteaUrl(raw);
    assert.equal(normalized, "http://nexen-desktop:19634/NeXeN/cacophony/pulls/50");
  });

  it("should prioritize HOST_DOMAIN environment variable if global setter is null", () => {
    process.env.HOST_DOMAIN = "internal-lan.box";
    assert.equal(resolvePrimaryHostDomain(), "internal-lan.box");

    const raw = "cacophony-gitea://NeXeN/cacophony/pulls/12";
    const normalized = normalizeGiteaUrl(raw);
    assert.equal(normalized, "http://internal-lan.box:19634/NeXeN/cacophony/pulls/12");
  });
});
