import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeGiteaUrl } from "../gitea/giteaUrlHelper.js";

describe("giteaUrlHelper normalizeGiteaUrl", () => {
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

  it("should preserve clean external and localhost URLs", () => {
    const local = "http://localhost:19634/NeXeN/cacophony/pulls/5";
    assert.equal(normalizeGiteaUrl(local), local);

    const gh = "https://github.com/Brennername/cacophony/pull/99";
    assert.equal(normalizeGiteaUrl(gh), gh);
  });
});
