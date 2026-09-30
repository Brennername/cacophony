import type { IGitPlatformProvider } from "./IGitPlatformProvider.js";
import { GiteaPlatformProvider } from "./GiteaPlatformProvider.js";
import { GitHubPlatformProvider } from "./GitHubPlatformProvider.js";
import { GiteaApiClient } from "./GiteaApiClient.js";

export interface GitPlatformProviderFactoryOptions {
  readonly platform?: "gitea" | "github" | string | undefined;
  readonly giteaBaseUrl?: string | undefined;
  readonly giteaApiToken?: string | undefined;
  readonly githubToken?: string | undefined;
  readonly githubBaseUrl?: string | undefined;
}

export class GitPlatformProviderFactory {
  public static create(options: GitPlatformProviderFactoryOptions = {}): IGitPlatformProvider {
    const platform = (options.platform || process.env["GIT_PLATFORM_PROVIDER"] || "gitea").toLowerCase();

    if (platform === "github") {
      const token = options.githubToken || process.env["GITHUB_TOKEN"] || "";
      if (!token) {
        throw new Error("GITHUB_TOKEN is required when GIT_PLATFORM_PROVIDER is set to 'github'.");
      }
      return new GitHubPlatformProvider({
        token,
        baseUrl: options.githubBaseUrl || process.env["GITHUB_API_URL"]
      });
    }

    // Default: Gitea
    const baseUrl = options.giteaBaseUrl || process.env["GITEA_BASE_URL"] || "http://cacophony-gitea:3000";
    const apiToken = options.giteaApiToken || process.env["GITEA_API_TOKEN"];

    const client = new GiteaApiClient({
      baseUrl,
      apiToken
    });

    return new GiteaPlatformProvider(client);
  }

  public static createFromEnv(): IGitPlatformProvider {
    return GitPlatformProviderFactory.create();
  }
}
