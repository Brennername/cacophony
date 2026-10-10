import type { GiteaApiClient } from "./GiteaApiClient.js";
import type { OllamaProvider } from "../inference/OllamaProvider.js";
import type { PrReviewRecord, ReviewVerdict, ReviewComment } from "@cacophony/shared-types";

export interface ReviewLoopOptions {
  readonly owner: string;
  readonly repo: string;
  readonly prNumber: number;
  readonly taskId: string;
  readonly reviewerModel: string;
  readonly autoMergeOnApproval?: boolean;
}

export interface ReviewLoopResult {
  readonly verdict: ReviewVerdict;
  readonly record: PrReviewRecord;
  readonly merged: boolean;
  readonly remediationRequired: boolean;
}

export class ReviewVerdictParser {
  public static parse(llmText: string): {
    verdict: ReviewVerdict;
    reviewNotes: string;
    comments: ReviewComment[];
  } {
    try {
      const firstBrace = llmText.indexOf("{");
      const lastBrace = llmText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonSubstring = llmText.slice(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonSubstring);
        const verdict = ["APPROVE", "REQUEST_CHANGES", "REJECT"].includes(parsed.verdict)
          ? (parsed.verdict as ReviewVerdict)
          : "REQUEST_CHANGES";

        return {
          verdict,
          reviewNotes: parsed.reviewNotes || "Review evaluated automatically.",
          comments: Array.isArray(parsed.comments) ? parsed.comments : []
        };
      }
    } catch {
      // Fall through to plain text parsing
    }

    if (llmText.toUpperCase().includes("APPROVE")) {
      return {
        verdict: "APPROVE",
        reviewNotes: llmText,
        comments: []
      };
    }

    return {
      verdict: "REQUEST_CHANGES",
      reviewNotes: llmText,
      comments: []
    };
  }
}

export class AutomatedPrReviewLoop {
  private readonly giteaClient: GiteaApiClient;
  private readonly inferenceProvider: OllamaProvider;

  constructor(giteaClient: GiteaApiClient, inferenceProvider: OllamaProvider) {
    this.giteaClient = giteaClient;
    this.inferenceProvider = inferenceProvider;
  }

  public async evaluatePullRequest(options: ReviewLoopOptions): Promise<ReviewLoopResult> {
    const diff = await this.giteaClient.getPullRequestDiff(options.owner, options.repo, options.prNumber);

    const reviewPrompt = this.buildPrompt(diff);
    const response = await this.inferenceProvider.generate({
      model: options.reviewerModel,
      messages: [
        {
          role: "system",
          content: "You are an automated senior code review architect evaluating pull requests."
        },
        {
          role: "user",
          content: reviewPrompt
        }
      ],
      temperature: 0.1
    });

    const parsed = this.parseReviewResponse(response.content);

    await this.giteaClient.submitPullRequestReview(options.owner, options.repo, options.prNumber, {
      event: parsed.verdict === "APPROVE" ? "APPROVED" : parsed.verdict === "REQUEST_CHANGES" ? "REQUEST_CHANGES" : "COMMENT",
      body: parsed.reviewNotes,
      comments: parsed.comments.map((c) => ({
        body: `[${c.severity.toUpperCase()}] ${c.comment}`,
        path: c.path,
        line: c.lineNumber
      }))
    });

    let merged = false;

    if (parsed.verdict === "APPROVE" && (options.autoMergeOnApproval ?? true)) {
      try {
        await this.giteaClient.mergePullRequest(options.owner, options.repo, options.prNumber, {
          Do: "squash",
          MergeTitleField: `Merge PR #${options.prNumber} [Automated Review Approved]`
        });
        merged = true;
      } catch {
        merged = false;
      }
    }

    const record: PrReviewRecord = {
      id: Date.now(),
      taskId: options.taskId,
      giteaPrId: options.prNumber,
      reviewerModel: options.reviewerModel,
      verdict: parsed.verdict,
      reviewNotes: parsed.reviewNotes,
      comments: parsed.comments,
      diffAnalyzed: diff.slice(0, 10000),
      createdAt: new Date().toISOString()
    };

    return {
      verdict: parsed.verdict,
      record,
      merged,
      remediationRequired: parsed.verdict === "REQUEST_CHANGES"
    };
  }

  private buildPrompt(diff: string): string {
    return [
      "Analyze the following git diff and provide a rigorous code review.",
      "Check for SOLID principles, architectural consistency, type safety, and potential regressions.",
      "Respond strictly with a JSON object in this format:",
      "{",
      '  "verdict": "APPROVE" | "REQUEST_CHANGES" | "REJECT",',
      '  "reviewNotes": "Detailed summary explanation of verdict",',
      '  "comments": [',
      '    { "path": "filename.ts", "lineNumber": 12, "comment": "Note", "severity": "info" | "warning" | "blocker" }',
      "  ]",
      "}",
      "",
      "--- DIFF ---",
      diff.slice(0, 30000)
    ].join("\n");
  }

  private parseReviewResponse(llmText: string): {
    verdict: ReviewVerdict;
    reviewNotes: string;
    comments: ReviewComment[];
  } {
    return ReviewVerdictParser.parse(llmText);
  }
}