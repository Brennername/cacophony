import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { TaskRepository } from "@cacophony/db";
import type {
  TaskRecord,
  EnqueueTaskDto,
  ITaskRehabilitationPlan,
  AgentRole,
  TaskPriority
} from "@cacophony/shared-types";

export interface ITaskRehabilitationServiceOptions {
  readonly taskRepo: TaskRepository;
  readonly taskcadePath?: string;
  readonly maxRetriesBeforeRehab?: number;
}

/**
 * TaskRehabilitationService
 *
 * Provides deterministic rehabilitation and solvability decomposition for tasks
 * that exceed retry thresholds. Instead of permanently abandoning failed tasks,
 * it inspects failure signatures, breaks complex scopes into atomic, solvable subtasks,
 * and records replanned units in docs/taskcade.md for operational traceability.
 */
export class TaskRehabilitationService {
  private readonly taskRepo: TaskRepository;
  private readonly taskcadePath: string;
  private readonly maxRetries: number;

  constructor(options: ITaskRehabilitationServiceOptions) {
    this.taskRepo = options.taskRepo;
    this.taskcadePath =
      options.taskcadePath ??
      path.resolve(process.cwd(), "docs/taskcade.md");
    this.maxRetries = options.maxRetriesBeforeRehab ?? 3;
  }

  /**
   * Returns the configured failure threshold before rehabilitation triggers.
   */
  public getMaxRetries(): number {
    return this.maxRetries;
  }

  /**
   * Determines whether a given task has exceeded retry limits and requires rehabilitation.
   */
  public shouldRehabilitate(task: TaskRecord): boolean {
    return task.failureCount >= this.maxRetries;
  }

  /**
   * Deterministically rehabilitates a repeatedly failing task by decomposing it
   * into smaller, solvable units and recording the replan in the taskcade.
   */
  public async rehabilitateTask(
    failedTask: TaskRecord,
    failureReason: string,
    culpritCommitHash?: string | null
  ): Promise<ITaskRehabilitationPlan> {
    // If task has already been decomposed, do not duplicate subtasks
    if (failedTask.rehabStatus === "DECOMPOSED") {
      const existingChildren = await this.taskRepo.listByParentTaskId(failedTask.id);
      return {
        parentTaskId: failedTask.id,
        failureReason,
        culpritCommitHash: culpritCommitHash ?? null,
        rationale: "Task previously decomposed into atomic units.",
        decomposedTasks: existingChildren.map((c) => ({
          title: c.title,
          prompt: c.prompt,
          role: c.role,
          priority: c.priority,
          testCommand: c.testCommand ?? undefined,
          focusFiles: c.focusFiles ?? undefined,
          parentTaskId: failedTask.id
        }))
      };
    }

    const subtasks = this.decomposeTask(failedTask, failureReason, culpritCommitHash);

    // Persist decomposed subtasks in repository
    const now = new Date().toISOString();
    for (let i = 0; i < subtasks.length; i++) {
      const dto = subtasks[i]!;
      const subtaskId = `${failedTask.id}.${i + 1}`;
      const childRecord: TaskRecord = {
        id: subtaskId,
        title: dto.title,
        prompt: dto.prompt,
        role: dto.role as AgentRole,
        status: "PENDING",
        priority: (dto.priority as TaskPriority) ?? failedTask.priority,
        modelAssigned: null,
        testCommand: dto.testCommand ?? failedTask.testCommand,
        focusFiles: dto.focusFiles ?? failedTask.focusFiles,
        targetBranch: failedTask.targetBranch,
        prUrl: null,
        failureCount: 0,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        parentTaskId: failedTask.id,
        rehabStatus: "NONE"
      };

      await this.taskRepo.create(childRecord);
    }

    // Mark parent task as DECOMPOSED
    await this.taskRepo.updateRehabStatus(failedTask.id, "DECOMPOSED");
    await this.taskRepo.updateLogSnippet(
      failedTask.id,
      `[TaskRehabilitationService] Decomposed into ${subtasks.length} subtasks due to: ${failureReason.slice(0, 300)}`
    );

    // Record the rehabilitation and decomposed queue in docs/taskcade.md
    await this.recordRehabilitationInTaskcade(failedTask, subtasks, failureReason, culpritCommitHash);

    return {
      parentTaskId: failedTask.id,
      failureReason,
      culpritCommitHash: culpritCommitHash ?? null,
      rationale: `Decomposed complex task into ${subtasks.length} atomic units to restore solvability under local model context.`,
      decomposedTasks: subtasks
    };
  }

  /**
   * Deterministically derives atomic subtasks from a failed task definition.
   */
  public decomposeTask(
    task: TaskRecord,
    failureReason: string,
    culpritCommitHash?: string | null
  ): readonly EnqueueTaskDto[] {
    const rawFocus = task.focusFiles
      ? task.focusFiles.split(",").map((f) => f.trim()).filter((f) => f.length > 0)
      : [];

    const isMultiFile = rawFocus.length > 1;
    const hasTestFile = rawFocus.some((f) => f.includes(".test.") || f.includes(".spec."));
    const typeFiles = rawFocus.filter((f) => f.includes("types") || f.includes("interface"));
    const implFiles = rawFocus.filter((f) => !f.includes(".test.") && !f.includes(".spec.") && !f.includes("types"));

    const subtasks: EnqueueTaskDto[] = [];
    const culpritContext = culpritCommitHash
      ? `\nRecent correlated commit: ${culpritCommitHash}. Verify compatibility with recent changes.`
      : "";

    if (isMultiFile && implFiles.length > 0) {
      // 3-way decomposition: Types -> Implementation -> Tests
      const typeFocus = typeFiles.length > 0 ? typeFiles.join(",") : rawFocus[0];
      subtasks.push({
        title: `[Rehab 1/3] Type Contracts & Interfaces: ${task.title}`,
        prompt: `Phase 1 of decomposed task ${task.id}.\nDefine strict TypeScript interfaces, contracts, and schemas for: ${task.title}.\nEnsure zero placeholder stubs and complete type safety.\nOriginal Requirements:\n${task.prompt}${culpritContext}`,
        role: "type_specialist",
        priority: task.priority,
        focusFiles: typeFocus,
        testCommand: "npm run build",
        parentTaskId: task.id
      });

      subtasks.push({
        title: `[Rehab 2/3] Core Implementation Unit: ${task.title}`,
        prompt: `Phase 2 of decomposed task ${task.id}.\nImplement core logic satisfying defined types for: ${task.title}.\nMaintain SOLID principles and error handling.\nOriginal Requirements:\n${task.prompt}${culpritContext}`,
        role: "implementer",
        priority: task.priority,
        focusFiles: implFiles.join(","),
        testCommand: task.testCommand ?? "npm run build",
        parentTaskId: task.id
      });

      subtasks.push({
        title: `[Rehab 3/3] Unit Test & Validation Suite: ${task.title}`,
        prompt: `Phase 3 of decomposed task ${task.id}.\nAuthor authentic, strict unit tests verifying ${task.title}.\nValidate happy path and edge cases.\nOriginal Requirements:\n${task.prompt}`,
        role: "test_engineer",
        priority: task.priority,
        focusFiles: hasTestFile ? rawFocus.filter((f) => f.includes(".test.")).join(",") : rawFocus.join(","),
        testCommand: task.testCommand ?? "npm test",
        parentTaskId: task.id
      });
    } else {
      // 2-way decomposition: Interface / Contract Scaffold -> Concrete Implementation & Tests
      subtasks.push({
        title: `[Rehab 1/2] Scaffold & Type Contracts: ${task.title}`,
        prompt: `Part 1 of decomposed task ${task.id}.\nScaffold data structures, interfaces, and validation contracts for: ${task.title}.\nOriginal Context:\n${task.prompt}${culpritContext}`,
        role: "type_specialist",
        priority: task.priority,
        focusFiles: task.focusFiles ?? undefined,
        testCommand: "npm run build",
        parentTaskId: task.id
      });

      subtasks.push({
        title: `[Rehab 2/2] Implementation & Test Verification: ${task.title}`,
        prompt: `Part 2 of decomposed task ${task.id}.\nComplete concrete implementation and unit tests for: ${task.title}.\nDiagnostic context from prior failure: ${failureReason.slice(0, 400)}\nOriginal Context:\n${task.prompt}`,
        role: "implementer",
        priority: task.priority,
        focusFiles: task.focusFiles ?? undefined,
        testCommand: task.testCommand ?? "npm test",
        parentTaskId: task.id
      });
    }

    return subtasks;
  }

  /**
   * Appends rehabilitation documentation into docs/taskcade.md under a dedicated section.
   */
  private async recordRehabilitationInTaskcade(
    parentTask: TaskRecord,
    subtasks: readonly EnqueueTaskDto[],
    failureReason: string,
    culpritCommitHash?: string | null
  ): Promise<void> {
    try {
      let content = "";
      try {
        content = await fs.readFile(this.taskcadePath, "utf-8");
      } catch {
        return;
      }

      const timestamp = new Date().toISOString();
      const sectionHeader = "## Rehabilitated Taskcade Queue";
      const hasSection = content.includes(sectionHeader);

      let recordBlock = `\n### Task ${parentTask.id} Rehabilitation [${timestamp}]\n`;
      recordBlock += `- **Parent Task**: ${parentTask.title} (\`${parentTask.id}\`)\n`;
      recordBlock += `- **Failure Count**: ${parentTask.failureCount + 1}\n`;
      recordBlock += `- **Failure Reason**: ${failureReason.slice(0, 250).replace(/\n/g, " ")}\n`;
      if (culpritCommitHash) {
        recordBlock += `- **Culprit Commit**: \`${culpritCommitHash}\`\n`;
      }
      recordBlock += `- **Decomposed Subtasks**:\n`;
      for (let i = 0; i < subtasks.length; i++) {
        const st = subtasks[i]!;
        recordBlock += `  - [ ] \`${parentTask.id}.${i + 1}\`: ${st.title} [Role: ${st.role}] [Files: ${st.focusFiles || "all"}]\n`;
      }

      let updatedContent: string;
      if (hasSection) {
        const parts = content.split(sectionHeader);
        updatedContent = parts[0] + sectionHeader + "\n" + recordBlock + parts.slice(1).join(sectionHeader);
      } else {
        updatedContent =
          content.trimEnd() +
          "\n\n---\n\n" +
          sectionHeader +
          "\n*Autonomous Deterministic Decompositions from Exceeded Failure Limits*\n" +
          recordBlock;
      }

      await fs.writeFile(this.taskcadePath, updatedContent, "utf-8");
    } catch (err) {
      console.warn(`[TaskRehabilitationService] Failed to append to taskcade:`, err);
    }
  }
}
