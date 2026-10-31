import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { GitPlatformProviderFactory } from "../gitea/GitPlatformProviderFactory.js";
import { GiteaPlatformProvider } from "../gitea/GiteaPlatformProvider.js";
import { GitHubPlatformProvider } from "../gitea/GitHubPlatformProvider.js";

describe("GitPlatformProviderFactory Test Suite", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env["GIT_PLATFORM_PROVIDER"];
    delete process.env["GITHUB_TOKEN"];
    delete process.env["GITHUB_API_URL"];
    delete process.env["GITEA_BASE_URL"];
    delete process.env["GITEA_API_TOKEN"];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("Gitea Platform Instantiation", () => {
    it("should default to Gitea platform provider when no options or environment variables are set", () => {
      const provider = GitPlatformProviderFactory.create();
      assert.ok(provider instanceof GiteaPlatformProvider);
      assert.strictEqual(provider.providerType, "gitea");
    });

    it("should instantiate Gitea platform provider with explicit options", () => {
      const provider = GitPlatformProviderFactory.create({
        platform: "gitea",
        giteaBaseUrl: "http://localhost:3000",
        giteaApiToken: "test-token",
      });
      assert.ok(provider instanceof GiteaPlatformProvider);
      assert.strictEqual(provider.providerType, "gitea");
    });

    it("should instantiate Gitea platform provider using environment variables", () => {
      process.env["GIT_PLATFORM_PROVIDER"] = "gitea";
      process.env["GITEA_BASE_URL"] = "http://internal-gitea:3000";
      process.env["GITEA_API_TOKEN"] = "env-token";

      const provider = GitPlatformProviderFactory.createFromEnv();
      assert.ok(provider instanceof GiteaPlatformProvider);
      assert.strictEqual(provider.providerType, "gitea");
    });
  });

  describe("GitHub Platform Instantiation", () => {
    it("should throw an error when GitHub platform is specified without a token", () => {
      assert.throws(
        () => GitPlatformProviderFactory.create({ platform: "github" }),
        /GITHUB_TOKEN is required when GIT_PLATFORM_PROVIDER is set to 'github'./,
      );
    });

    it("should instantiate GitHub platform provider when valid token is supplied in options", () => {
      const provider = GitPlatformProviderFactory.create({
        platform: "github",
        githubToken: "ghp_mocktoken123456",
        githubBaseUrl: "https://api.github.com",
      });
      assert.ok(provider instanceof GitHubPlatformProvider);
      assert.strictEqual(provider.providerType, "github");
    });

    it("should instantiate GitHub platform provider using environment variables", () => {
      process.env["GIT_PLATFORM_PROVIDER"] = "github";
      process.env["GITHUB_TOKEN"] = "ghp_envtoken987654";

      const provider = GitPlatformProviderFactory.createFromEnv();
      assert.ok(provider instanceof GitHubPlatformProvider);
      assert.strictEqual(provider.providerType, "github");
    });
  });
});
