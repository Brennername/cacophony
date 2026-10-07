import { HashStubGenerator } from "../context/HashStubGenerator.js";

export interface Pass1ArchitectPromptParams {
  readonly taskPrompt: string;
  readonly targetFilePath: string;
  readonly existingSignatures?: string | undefined;
  readonly contextSummary?: string | undefined;
}

export interface Pass2ImplementerPromptParams {
  readonly methodName: string;
  readonly methodSignature: string;
  readonly hashAnchor: string;
  readonly targetFilePath: string;
  readonly surroundingContext: string;
  readonly taskGoal: string;
}

/**
 * PromptTemplateRegistry
 *
 * Implements the two-pass prompt protocol:
 * - Pass 1 (Architect): Produces overall file scaffolding, class signatures, and collision-free hash-stub comments.
 * - Pass 2 (Implementer): Takes individual method scopes and implements only the targeted method body.
 */
export class PromptTemplateRegistry {
  /**
   * Formats the Pass 1 prompt for architectural structuring and hash-stubbing.
   */
  public static createPass1ArchitectPrompt(params: Pass1ArchitectPromptParams): string {
    return `You are an expert TypeScript architect. Design the high-level class architecture and method stubs for the following requirement:

Task Goal: ${params.taskPrompt}
Target File: ${params.targetFilePath}
${params.contextSummary ? `Project Context:\n${params.contextSummary}\n` : ""}
Directives:
1. Provide all necessary imports, interfaces, and class skeletons.
2. For each method implementation, do NOT write the full implementation body.
3. Instead, stub each method body using this exact comment anchor format:
   /* [${HashStubGenerator.STUB_PREFIX}:<8-char-hex>:<methodName>] */
   throw new Error("Method not implemented.");
4. Output valid TypeScript enclosed in \`\`\`typescript ... \`\`\` code block without conversational filler.`;
  }

  /**
   * Formats the Pass 2 prompt for focused method body generation.
   */
  public static createPass2ImplementerPrompt(params: Pass2ImplementerPromptParams): string {
    return `You are a high-speed TypeScript implementer. Implement the method body for the following targeted method:

Target Method: ${params.methodName}
Signature: ${params.methodSignature}
Hash Anchor: ${params.hashAnchor}
Target File: ${params.targetFilePath}
Task Goal: ${params.taskGoal}

Surrounding File Types & Context:
\`\`\`typescript
${params.surroundingContext}
\`\`\`

Directives:
1. Implement ONLY this specific method: ${params.methodName}
2. Adhere to strict TypeScript typing with zero 'any' types unless necessary.
3. Return the complete method declaration and body starting with the method declaration.
4. Output the code block enclosed in \`\`\`typescript ... \`\`\` without markdown commentary.`;
  }

  /**
   * Cleans and extracts the method body from the model output.
   */
  public static extractMethodFromOutput(output: string): string {
    const codeBlockMatch = output.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
    const raw = codeBlockMatch ? codeBlockMatch[1] : output;
    return (raw || "").trim();
  }
}
