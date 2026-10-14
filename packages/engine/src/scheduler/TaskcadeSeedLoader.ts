import fs from "node:fs/promises";
import * as fsSync from "node:fs";
import path from "node:path";
import type {
  TaskRecord,
  AgentRole,
  TaskPriority,
} from "@cacophony/shared-types";

export interface ParsedTaskcadeItem {
  readonly taskId: string;
  readonly title: string;
  readonly prompt: string;
  readonly role: AgentRole;
  readonly priority: TaskPriority;
  readonly focusFiles: string | null;
  readonly testCommand: string | null;
  readonly completed: boolean;
  readonly phaseName: string;
}

/**
 * TaskcadeSeedLoader
 *
 * Parses pending tasks from docs/taskcade.md into strongly-typed TaskRecord domain entities.
 * Extracts markdown checklist items, file paths, test commands, and architectural metadata.
 */
export class TaskcadeSeedLoader {
  private readonly taskcadeFilePath: string;
  private readonly historyFilePath: string | null;
  private cachedCompletedIds: Set<string> | null = null;
  private lastCompletedIdsTime = 0;
  private static readonly CACHE_TTL_MS = 5000;

  constructor(taskcadeFilePath?: string, historyFilePath?: string) {
    if (taskcadeFilePath) {
      this.taskcadeFilePath = taskcadeFilePath;
    } else {
      const candidates = [
        path.resolve(process.cwd(), "docs/taskcade.md"),
        path.resolve(process.cwd(), "../../docs/taskcade.md"),
        path.resolve(process.cwd(), "../docs/taskcade.md"),
      ];
      this.taskcadeFilePath =
        candidates.find((c) => fsSync.existsSync(c)) || candidates[0]!;
    }

    if (historyFilePath) {
      this.historyFilePath = historyFilePath;
    } else {
      const historyCandidates = [
        path.resolve(process.cwd(), "docs/taskcade-history.md"),
        path.resolve(process.cwd(), "../../docs/taskcade-history.md"),
        path.resolve(process.cwd(), "../docs/taskcade-history.md"),
      ];
      this.historyFilePath =
        historyCandidates.find((c) => fsSync.existsSync(c)) || null;
    }
  }

  /**
   * Returns a normalized set of all task IDs marked completed ([x]) across
   * both docs/taskcade.md and docs/taskcade-history.md.
   */
  public async getCompletedTaskIds(forceRefresh = false): Promise<Set<string>> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.cachedCompletedIds &&
      now - this.lastCompletedIdsTime < TaskcadeSeedLoader.CACHE_TTL_MS
    ) {
      return this.cachedCompletedIds;
    }

    const completedSet = new Set<string>();

    const checkFile = async (filePath: string | null): Promise<void> => {
      if (!filePath) return;
      try {
        const text = await fs.readFile(filePath, "utf-8");
        const lines = text.split("\n");
        const itemRegex = /^[\s]*-[\s]+\[([xX])\][\s]+([A-Za-z0-9_.-]+):/;
        for (const line of lines) {
          const match = line.match(itemRegex);
          if (match && match[2]) {
            const rawCode = match[2].trim().toLowerCase();
            completedSet.add(rawCode);
            completedSet.add(`taskcade-${rawCode}`);
          }
        }
      } catch {
        // Missing or unreadable file is non-fatal
      }
    };

    await checkFile(this.taskcadeFilePath);
    await checkFile(this.historyFilePath);

    this.cachedCompletedIds = completedSet;
    this.lastCompletedIdsTime = now;
    return completedSet;
  }

  /**
   * Reads and parses all uncompleted (or all) checklist items from docs/taskcade.md.
   * Cross-references against both docs/taskcade.md and docs/taskcade-history.md
   * to guarantee that already implemented tasks are never duplicated or re-seeded.
   */
  public async loadTasks(options?: {
    readonly includeCompleted?: boolean | undefined;
    readonly phaseFilter?: string | undefined;
    readonly limit?: number | undefined;
    readonly fleetModels?: readonly string[] | undefined;
  }): Promise<readonly TaskRecord[]> {
    const content = await fs.readFile(this.taskcadeFilePath, "utf-8");
    const parsedItems = this.parseMarkdown(content);

    let filtered = parsedItems;
    if (!options?.includeCompleted) {
      const completedIds = await this.getCompletedTaskIds();
      filtered = filtered.filter((item) => {
        if (item.completed) return false;
        const normalizedId = item.taskId.toLowerCase();
        const shortId = normalizedId.replace("taskcade-", "");
        return !completedIds.has(normalizedId) && !completedIds.has(shortId);
      });
    }
    if (options?.phaseFilter) {
      const filterLower = options.phaseFilter.toLowerCase();
      filtered = filtered.filter((item) =>
        item.phaseName.toLowerCase().includes(filterLower),
      );
    }
    if (options?.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    const fleet =
      options?.fleetModels && options.fleetModels.length > 0
        ? options.fleetModels
        : null;
    return filtered.map((item, idx) => {
      const modelAssigned = fleet ? fleet[idx % fleet.length]! : null;
      return this.toTaskRecord(item, modelAssigned);
    });
  }

  /**
   * Internal parser extracting structured checklist items from markdown lines.
   */
  public parseMarkdown(content: string): readonly ParsedTaskcadeItem[] {
    const lines = content.split("\n");
    const items: ParsedTaskcadeItem[] = [];

    let currentPhase = "General";
    // Regex matching: - [ ] T46.1.1: Title description... [File: ...] [Test: ...]
    const itemRegex =
      /^[\s]*-[\s]+\[([ xX])\][\s]+([A-Za-z0-9_.-]+):[\s]+(.+)$/;
    const phaseRegex = /^##[\s]+(Phase[\s]+[0-9]+:[\s]+[^\n\r]+)$/i;

    for (const line of lines) {
      const phaseMatch = line.match(phaseRegex);
      if (phaseMatch && phaseMatch[1]) {
        currentPhase = phaseMatch[1].trim();
        continue;
      }

      const match = line.match(itemRegex);
      if (!match) continue;

      const completed = match[1]?.trim().toLowerCase() === "x";
      const taskCode = match[2]?.trim() || "";
      const rawBody = match[3]?.trim() || "";

      // Extract [File: ...] / [Files: ...], [Test: ...], [Role: ...], and [Priority: ...] annotations
      const fileMatch = rawBody.match(/\[Files?:\s*([^\]]+)\]/i);
      const testMatch = rawBody.match(/\[Test:\s*([^\]]+)\]/i);
      const roleMatch = rawBody.match(/\[Role:\s*([^\]]+)\]/i);
      const priorityMatch = rawBody.match(/\[Priority:\s*([^\]]+)\]/i);

      let cleanPrompt = rawBody
        .replace(/\[Files?:\s*[^\]]+\]/gi, "")
        .replace(/\[Test:\s*[^\]]+\]/gi, "")
        .replace(/\[Role:\s*[^\]]+\]/gi, "")
        .replace(/\[Priority:\s*[^\]]+\]/gi, "")
        .replace(/\[BypassRules:\s*[^\]]+\]/gi, "")
        .replace(/\[Temp:\s*[^\]]+\]/gi, "")
        .replace(/\[Model:\s*[^\]]+\]/gi, "")
        .replace(/\[Method:\s*[^\]]+\]/gi, "")
        .replace(/\[Class:\s*[^\]]+\]/gi, "")
        .replace(/\[Route:\s*[^\]]+\]/gi, "")
        .replace(/\[Computed:\s*[^\]]+\]/gi, "")
        .replace(/\[Template:\s*[^\]]+\]/gi, "")
        .replace(/\[Style:\s*[^\]]+\]/gi, "")
        .replace(/\[Styles:\s*[^\]]+\]/gi, "")
        .replace(/\[Stage:\s*[^\]]+\]/gi, "")
        .replace(/\[Type:\s*[^\]]+\]/gi, "")
        .replace(/\[Signal:\s*[^\]]+\]/gi, "")
        .trim();

      const focusFiles =
        fileMatch && fileMatch[1]
          ? fileMatch[1].replace(/^["']|["']$/g, "").trim()
          : null;
      let testCommand =
        testMatch && testMatch[1]
          ? testMatch[1].replace(/^["']|["']$/g, "").trim()
          : null;

      // Filter out non-runnable or CI-only test commands from arena execution
      if (testCommand) {
        const lowerTest = testCommand.toLowerCase();
        if (
          lowerTest.includes("push to branch") ||
          lowerTest.includes("docker compose") ||
          lowerTest.includes("curl ") ||
          lowerTest.includes("verify ci") ||
          lowerTest.includes("bin/cacophony")
        ) {
          const firstFocus = focusFiles ? focusFiles.split(/\s+/)[0] : null;
          const isJsTs = firstFocus
            ? /\.(?:ts|js|mjs|cjs)$/i.test(firstFocus)
            : false;
          testCommand = isJsTs ? `node --check ${firstFocus}` : "";
        }
      }

      // Assign agent role based on task nature or explicit annotation
      let role: AgentRole = "implementer";
      const promptLower = cleanPrompt.toLowerCase();
      if (roleMatch && roleMatch[1]) {
        const rawRole = roleMatch[1].trim().toLowerCase();
        if (
          [
            "architect",
            "implementer",
            "test_engineer",
            "reviewer",
            "doc_writer",
          ].includes(rawRole)
        ) {
          role = rawRole as AgentRole;
        }
      } else if (
        promptLower.includes("write unit test") ||
        promptLower.includes("write frontend unit test") ||
        promptLower.includes("write integration test")
      ) {
        role = "test_engineer";
      } else if (
        promptLower.includes("review") ||
        promptLower.includes("audit")
      ) {
        role = "reviewer";
      } else if (
        promptLower.includes("architect") ||
        promptLower.includes("design")
      ) {
        role = "architect";
      } else if (
        promptLower.includes("doc") ||
        promptLower.includes("readme")
      ) {
        role = "doc_writer";
      }

      // Priority tier mapping: explicit annotation, or default P1, P0 for critical, P2 for maintenance/docs
      let priority: TaskPriority = "P1";
      if (priorityMatch && priorityMatch[1]) {
        const rawPri = priorityMatch[1].trim().toUpperCase();
        if (["P0", "P1", "P2", "P3"].includes(rawPri)) {
          priority = rawPri as TaskPriority;
        }
      } else if (
        promptLower.includes("critical") ||
        promptLower.includes("deadlock") ||
        promptLower.includes("security")
      ) {
        priority = "P0";
      } else if (
        role === "doc_writer" ||
        promptLower.includes("vacuum") ||
        promptLower.includes("compactor")
      ) {
        priority = "P2";
      }

      const taskId = `taskcade-${taskCode.toLowerCase()}`;

      items.push({
        taskId,
        title: `${taskCode}: ${cleanPrompt.slice(0, 80)}`,
        prompt: `[TASK OBJECTIVE]: ${taskCode}: ${cleanPrompt}\n\n[PHASE]: ${currentPhase}\n${focusFiles ? `[FOCUS FILE]: ${focusFiles}\n` : ""}${testCommand ? `[TEST SUITE]: ${testCommand}\n` : ""}`,
        role,
        priority,
        focusFiles,
        testCommand,
        completed,
        phaseName: currentPhase,
      });
    }

    return items;
  }

  private toTaskRecord(
    item: ParsedTaskcadeItem,
    modelAssigned: string | null = null,
  ): TaskRecord {
    const now = new Date().toISOString();
    return {
      id: item.taskId,
      title: item.title,
      prompt: item.prompt,
      role: item.role,
      status: "PENDING",
      priority: item.priority,
      modelAssigned,
      testCommand: item.testCommand,
      focusFiles: item.focusFiles,
      targetBranch: null,
      prUrl: null,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
  }
}
