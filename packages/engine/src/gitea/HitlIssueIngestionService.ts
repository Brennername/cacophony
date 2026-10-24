import type {
  HitlTicketRecord,
  AuthorClassification,
  CreateHitlTicketInput,
} from "@cacophony/shared-types";
import type { HitlTicketRepository } from "@cacophony/db";
import { PromptSlipstreamGuard } from "../security/PromptSlipstreamGuard.js";

export interface HitlIssueIngestionOptions {
  readonly repoOwner?: string | undefined;
  readonly repoName?: string | undefined;
  readonly githubToken?: string | undefined;
  readonly internalAccounts?: readonly string[] | undefined;
  readonly promptGuard?: PromptSlipstreamGuard | undefined;
}

export interface RawGitHubIssue {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body?: string | null | undefined;
  readonly state: "open" | "closed";
  readonly html_url: string;
  readonly user?: {
    readonly login: string;
    readonly avatar_url?: string | null | undefined;
  } | null | undefined;
  readonly labels?: Array<{ readonly name: string } | string> | undefined;
  readonly pull_request?: unknown | undefined;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * HitlIssueIngestionService
 *
 * Implements zero-cost ingestion of public GitHub issues, discriminates between
 * internal bot/admin accounts and external community contributors, sanitizes issue
 * content against prompt slipstreaming, and records them in the HITL ticket repository.
 */
export class HitlIssueIngestionService {
  private readonly repoOwner: string;
  private readonly repoName: string;
  private readonly githubToken: string;
  private readonly internalAccounts: Set<string>;
  private readonly promptGuard: PromptSlipstreamGuard;

  constructor(
    private readonly ticketRepo: HitlTicketRepository,
    options?: HitlIssueIngestionOptions,
  ) {
    this.repoOwner =
      options?.repoOwner ||
      process.env.GITHUB_REPO_OWNER ||
      process.env.GIT_REPO_OWNER ||
      "Cacophony";
    this.repoName =
      options?.repoName || process.env.GITHUB_REPO_NAME || "cacophony";
    this.githubToken = options?.githubToken || process.env.GITHUB_TOKEN || "";
    this.promptGuard = options?.promptGuard || new PromptSlipstreamGuard();

    const configuredInternals = options?.internalAccounts || [
      process.env.GIT_REPO_OWNER || "Cacophony",
      process.env.ADMIN_USERNAME || "NeXeN",
      "cacophony-bot",
      "dependabot[bot]",
    ];
    this.internalAccounts = new Set(
      configuredInternals.map((a) => a.toLowerCase().trim()),
    );
  }

  /**
   * Classifies an issue author based on configured internal account names.
   */
  public classifyAuthor(authorLogin: string): AuthorClassification {
    const normalized = authorLogin.toLowerCase().trim();
    if (this.internalAccounts.has(normalized)) {
      if (normalized.endsWith("-bot") || normalized.endsWith("[bot]")) {
        return "INTERNAL_BOT";
      }
      return "INTERNAL_ADMIN";
    }
    return "EXTERNAL_CONTRIBUTOR";
  }

  /**
   * Ingests a single GitHub issue into the HITL pipeline.
   * If the author is external, a ticket is created with HITL_PENDING status.
   */
  public async ingestIssue(
    issue: RawGitHubIssue,
  ): Promise<{ readonly ingested: boolean; readonly ticket?: HitlTicketRecord }> {
    // Skip pull requests
    if (issue.pull_request) {
      return { ingested: false };
    }

    const authorLogin = issue.user?.login || "anonymous";
    const classification = this.classifyAuthor(authorLogin);

    // Internal accounts are handled by standard automation or skipped from HITL
    if (classification !== "EXTERNAL_CONTRIBUTOR") {
      return { ingested: false };
    }

    // Check for existing ticket
    const existing = await this.ticketRepo.getByGithubIssueNumber(issue.number);
    if (existing) {
      return { ingested: false, ticket: existing };
    }

    const labels = (issue.labels || []).map((l) =>
      typeof l === "string" ? l : l.name,
    );

    const rawBody = issue.body || "";
    const analysis = this.promptGuard.analyzeAndSanitize(issue.title, rawBody);

    const input: CreateHitlTicketInput = {
      githubIssueNumber: issue.number,
      githubIssueId: issue.id,
      githubIssueUrl: issue.html_url,
      author: authorLogin,
      authorAvatarUrl: issue.user?.avatar_url ?? null,
      title: issue.title,
      rawBody,
      labels,
      targetBranch: "main",
      priority: analysis.riskLevel === "high" ? "P2" : "P1",
    };

    const created = await this.ticketRepo.createTicket(input);

    // Save pre-computed sanitized prompt on the ticket record
    await this.ticketRepo.updateStatus(created.id, "HITL_PENDING", {
      sanitizedPrompt: analysis.sanitizedContent,
    });

    const refreshed = await this.ticketRepo.getById(created.id);
    return { ingested: true, ticket: refreshed || created };
  }

  /**
   * Fetches public issues from GitHub REST API (completely free tier) and ingests candidate tickets.
   */
  public async fetchAndIngest(): Promise<number> {
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues?state=open`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Cacophony-HITL-Ingestion",
    };

    if (this.githubToken) {
      headers["Authorization"] = `Bearer ${this.githubToken}`;
    }

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        return 0;
      }

      const issues = (await response.json()) as RawGitHubIssue[];
      let ingestedCount = 0;

      for (const issue of issues) {
        const res = await this.ingestIssue(issue);
        if (res.ingested) {
          ingestedCount++;
        }
      }

      return ingestedCount;
    } catch {
      return 0;
    }
  }
}
