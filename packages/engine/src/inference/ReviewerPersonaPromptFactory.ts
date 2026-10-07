import {
  ReviewDomainPersona,
  PersonaReviewResult,
  PersonaFinding,
} from "@cacophony/shared-types";

export interface ReviewPromptContext {
  readonly taskId: string;
  readonly taskTitle: string;
  readonly taskPrompt: string;
  readonly diffText: string;
  readonly focusFiles?: readonly string[] | undefined;
}

/**
 * ReviewerPersonaPromptFactory
 *
 * Generates tailored prompt envelopes and machine-parseable verdict schemas
 * for specialized autonomous review personas:
 * - SecurityAuditor: sanitization, injection, secret exposure, dangerous APIs.
 * - ArchitectureAuditor: SOLID boundaries, coupling, layering, interface isolation.
 * - DxUxAuditor: typing ergonomics, mobile responsiveness, error clarity.
 */
export class ReviewerPersonaPromptFactory {
  /**
   * Generates the domain-tailored system instructions for a review persona.
   */
  public static createSystemPrompt(persona: ReviewDomainPersona): string {
    switch (persona) {
      case "SecurityAuditor":
        return `You are an expert Security Code Reviewer (SecurityAuditor).
Your mandate:
1. Detect any potential secrets, keys, credentials, or sensitive tokens hardcoded in code (must use .env).
2. Detect command injection, SQL injection, path traversal, or unescaped shell executions.
3. Detect insecure deserialization, dangerous eval(), or unsafe innerHTML usage.
4. Verify input sanitization and defensive boundary validation.

You MUST respond strictly with valid JSON conforming to this schema:
{
  "verdict": "APPROVE" | "REQUEST_CHANGES",
  "summary": "High-level review assessment",
  "findings": [
    {
      "path": "path/to/file.ts",
      "lineNumber": 12,
      "ruleId": "NO_HARDCODED_SECRETS",
      "severity": "blocker" | "warning" | "info",
      "message": "Detailed explanation of the issue",
      "suggestion": "How to resolve the issue"
    }
  ]
}
If any blocker findings exist, verdict MUST be "REQUEST_CHANGES".`;

      case "ArchitectureAuditor":
        return `You are an expert Software Architecture Reviewer (ArchitectureAuditor).
Your mandate:
1. Enforce SOLID principles: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
2. Verify clean layering, loose coupling, and modularity between packages.
3. Prevent circular dependencies and God-class anti-patterns.
4. Ensure interfaces are lean and implementation details are not prematurely leaked.

You MUST respond strictly with valid JSON conforming to this schema:
{
  "verdict": "APPROVE" | "REQUEST_CHANGES",
  "summary": "High-level review assessment",
  "findings": [
    {
      "path": "path/to/file.ts",
      "lineNumber": 12,
      "ruleId": "SOLID_SINGLE_RESPONSIBILITY",
      "severity": "blocker" | "warning" | "info",
      "message": "Detailed explanation of the issue",
      "suggestion": "How to resolve the issue"
    }
  ]
}
If any blocker findings exist, verdict MUST be "REQUEST_CHANGES".`;

      case "DxUxAuditor":
        return `You are an expert Developer Experience and Mobile-First UX Reviewer (DxUxAuditor).
Your mandate:
1. Enforce strict TypeScript typing: avoid loose 'any' and unconstrained generic types.
2. Verify mobile-first design: responsive layouts, touch-friendly touch targets, no horizontal overflow.
3. Verify clarity of user-facing error messages, diagnostics, and telemetry HUD indicators.
4. Ensure dark/light mode consistency and accessibility standards.

You MUST respond strictly with valid JSON conforming to this schema:
{
  "verdict": "APPROVE" | "REQUEST_CHANGES",
  "summary": "High-level review assessment",
  "findings": [
    {
      "path": "path/to/file.ts",
      "lineNumber": 12,
      "ruleId": "STRICT_TYPING_COMPLIANCE",
      "severity": "blocker" | "warning" | "info",
      "message": "Detailed explanation of the issue",
      "suggestion": "How to resolve the issue"
    }
  ]
}
If any blocker findings exist, verdict MUST be "REQUEST_CHANGES".`;
    }
  }

  /**
   * Generates the evaluation prompt presenting the PR diff and task requirements.
   */
  public static createUserPrompt(
    persona: ReviewDomainPersona,
    context: ReviewPromptContext
  ): string {
    return `Evaluate the following Pull Request diff through your domain lens as ${persona}:

Task ID: ${context.taskId}
Task Title: ${context.taskTitle}
Task Requirements:
${context.taskPrompt}

${context.focusFiles ? `Focus Files: ${context.focusFiles.join(", ")}\n` : ""}
Pull Request Diff:
\`\`\`diff
${context.diffText}
\`\`\`

Analyze the changes thoroughly and output the machine-parseable JSON verdict.`;
  }

  /**
   * Parses and validates raw model output into a PersonaReviewResult.
   */
  public static parsePersonaResponse(
    rawOutput: string,
    persona: ReviewDomainPersona
  ): PersonaReviewResult {
    try {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const verdict = parsed.verdict === "APPROVE" ? "APPROVE" : "REQUEST_CHANGES";
        const findings: PersonaFinding[] = Array.isArray(parsed.findings)
          ? parsed.findings.map((f: Record<string, unknown>) => ({
              path: typeof f["path"] === "string" ? f["path"] : "unknown",
              lineNumber: typeof f["lineNumber"] === "number" ? f["lineNumber"] : undefined,
              ruleId: typeof f["ruleId"] === "string" ? f["ruleId"] : undefined,
              message: typeof f["message"] === "string" ? f["message"] : "No message provided",
              severity:
                f["severity"] === "blocker" || f["severity"] === "warning" || f["severity"] === "info"
                  ? (f["severity"] as "blocker" | "warning" | "info")
                  : "warning",
              suggestion: typeof f["suggestion"] === "string" ? f["suggestion"] : undefined,
            }))
          : [];

        const hasBlocker = findings.some((f) => f.severity === "blocker");
        const effectiveVerdict = hasBlocker ? "REQUEST_CHANGES" : verdict;

        return {
          persona,
          verdict: effectiveVerdict,
          findings,
          summary: typeof parsed.summary === "string" ? parsed.summary : "Persona review completed",
        };
      }
    } catch {
      // Fall through to heuristic fallback
    }

    const hasRejectionKeywords =
      /REQUEST_CHANGES|REJECT|VULNERABILITY|VIOLATION|BLOCKER|FAIL/i.test(rawOutput);

    return {
      persona,
      verdict: hasRejectionKeywords ? "REQUEST_CHANGES" : "APPROVE",
      findings: hasRejectionKeywords
        ? [
            {
              path: "general",
              message: rawOutput.slice(0, 300).trim(),
              severity: "blocker",
            },
          ]
        : [],
      summary: hasRejectionKeywords
        ? "Heuristic review indicated issues requiring changes"
        : "Heuristic review approved changes",
    };
  }
}
