import { z } from "zod";
import type { TaskRepository } from "@cacophony/db";
import type { TaskRecord, AgentRole, TaskPriority } from "@cacophony/shared-types";
import type { IInferenceProvider } from "./IInferenceProvider.js";
import { AdaptiveOutputFormatter } from "./AdaptiveOutputFormatter.js";

const DecomposedTaskItemSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  role: z.enum([
    "implementer",
    "reviewer",
    "architect",
    "planner",
    "test_engineer",
    "doc_writer",
    "type_specialist",
    "security_auditor"
  ]).default("implementer"),
  priority: z.enum(["P0", "P1", "P2"]).default("P1"),
  focusFiles: z.string().optional(),
  testCommand: z.string().optional()
});

const DecomposedTaskListSchema = z.array(DecomposedTaskItemSchema);

/**
 * FrontierTaskDecomposer
 *
 * Utilizes a high-reasoning frontier model to ingest high-level feature epics
 * or user objectives and decompose them into an ordered series of atomic, typed
 * arena tasks stored directly into the database.
 */
export class FrontierTaskDecomposer {
  private readonly provider: IInferenceProvider;
  private readonly taskRepo: TaskRepository;
  private readonly formatter: AdaptiveOutputFormatter;

  constructor(
    provider: IInferenceProvider,
    taskRepo: TaskRepository,
    formatter: AdaptiveOutputFormatter = new AdaptiveOutputFormatter()
  ) {
    this.provider = provider;
    this.taskRepo = taskRepo;
    this.formatter = formatter;
  }

  /**
   * Decomposes a high-level feature description into atomic tasks and persists them.
   */
  public async decomposeAndPersist(
    objective: string,
    modelName: string,
    workspaceSummary = ""
  ): Promise<readonly TaskRecord[]> {
    const prompt = [
      "You are the Chief Software Architect.",
      "Decompose the following high-level objective into atomic, sequentially executable engineering tasks.",
      "",
      `OBJECTIVE:\n${objective}`,
      "",
      workspaceSummary ? `WORKSPACE SUMMARY:\n${workspaceSummary}\n` : "",
      "OUTPUT INSTRUCTIONS:",
      "Output ONLY a raw JSON array matching this exact schema:",
      "```json",
      "[",
      "  {",
      '    "title": "Short title",',
      '    "prompt": "Detailed step-by-step instructions for the model",',
      '    "role": "implementer | reviewer | architect | test_engineer | doc_writer",',
      '    "priority": "P0 | P1 | P2",',
      '    "focusFiles": "packages/engine/src/rules/catalog/AstRule.ts",',
      '    "testCommand": "npm test --workspace=@cacophony/engine --if-present"',
      "  }",
      "]",
      "```"
    ].join("\n");

    const res = await this.provider.generate({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    });

    const primaryJson = this.formatter.extractPrimaryCode(res.content) || res.content;
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(primaryJson);
    } catch {
      // Clean leading/trailing markdown if JSON block wasn't cleanly fenced
      const match = primaryJson.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        parsedJson = JSON.parse(match[0]);
      } else {
        throw new Error("Frontier model response could not be parsed as a valid JSON array.");
      }
    }

    const items = DecomposedTaskListSchema.parse(parsedJson);
    const createdTasks: TaskRecord[] = [];

    const now = new Date();
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const timestamp = now.toISOString().replace(/[-:T.]/g, "").slice(0, 15);
      const randomSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
      const taskId = `task-${timestamp}_${String(i).padStart(2, "0")}_${randomSuffix}`;

      const taskRecord: TaskRecord = {
        id: taskId,
        title: item.title,
        prompt: item.prompt,
        role: item.role as AgentRole,
        status: "PENDING",
        priority: item.priority as TaskPriority,
        modelAssigned: null,
        testCommand: item.testCommand ?? null,
        focusFiles: item.focusFiles ?? null,
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      await this.taskRepo.create(taskRecord);
      createdTasks.push(taskRecord);
    }

    return createdTasks;
  }
}
