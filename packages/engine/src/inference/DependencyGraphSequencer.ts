import type { AgentRole } from "@cacophony/shared-types";

export type TaskCategoryLayer =
  | "types"
  | "migration"
  | "repository"
  | "service"
  | "route"
  | "component"
  | "test";

export interface DecomposedTaskNode {
  readonly id: string;
  readonly title: string;
  readonly role: AgentRole;
  readonly category: TaskCategoryLayer;
  readonly dependencies: readonly string[];
  readonly focusFiles: readonly string[];
  readonly testCommand: string;
  readonly prompt?: string | undefined;
}

/**
 * DependencyGraphSequencer
 *
 * Implements topological dependency graph task sequencing (Phase 81 T81.4).
 * Arranges decomposed tasks in architectural dependency order:
 * Shared Types & Migrations -> Repositories -> Services -> HTTP Routes -> UI Components -> Tests.
 * Detects and breaks circular task dependencies.
 */
export class DependencyGraphSequencer {
  private static readonly LAYER_PRIORITY: Record<TaskCategoryLayer, number> = {
    types: 1,
    migration: 2,
    repository: 3,
    service: 4,
    route: 5,
    component: 6,
    test: 7
  };

  /**
   * Arranges tasks in topologically sorted dependency order adhering to architectural layering.
   */
  public sequenceTasks(tasks: readonly DecomposedTaskNode[]): readonly DecomposedTaskNode[] {
    const taskMap = new Map<string, DecomposedTaskNode>();
    for (const task of tasks) {
      taskMap.set(task.id, task);
    }

    // Resolve circular dependencies first
    const sanitizedTasks = this.resolveCircularDependencies(tasks);

    // Build in-degree graph
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    for (const task of sanitizedTasks) {
      inDegree.set(task.id, 0);
      dependents.set(task.id, []);
    }

    for (const task of sanitizedTasks) {
      for (const depId of task.dependencies) {
        if (inDegree.has(depId)) {
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
          dependents.get(depId)!.push(task.id);
        }
      }
    }

    // Queue nodes with in-degree 0, sorted by architectural layer
    const available: DecomposedTaskNode[] = sanitizedTasks.filter((t) => inDegree.get(t.id) === 0);
    this.sortTasksByLayer(available);

    const ordered: DecomposedTaskNode[] = [];

    while (available.length > 0) {
      const current = available.shift()!;
      ordered.push(current);

      for (const depId of dependents.get(current.id) || []) {
        const remaining = (inDegree.get(depId) || 1) - 1;
        inDegree.set(depId, remaining);
        if (remaining === 0) {
          const taskNode = taskMap.get(depId);
          if (taskNode) {
            available.push(taskNode);
            this.sortTasksByLayer(available);
          }
        }
      }
    }

    // Append any orphan nodes that may not have resolved due to external dependencies
    if (ordered.length < sanitizedTasks.length) {
      const orderedIds = new Set(ordered.map((t) => t.id));
      const remaining = sanitizedTasks.filter((t) => !orderedIds.has(t.id));
      this.sortTasksByLayer(remaining);
      ordered.push(...remaining);
    }

    return ordered;
  }

  /**
   * Detects and breaks circular task dependencies.
   */
  public resolveCircularDependencies(
    tasks: readonly DecomposedTaskNode[]
  ): readonly DecomposedTaskNode[] {
    const taskMap = new Map<string, DecomposedTaskNode>();
    for (const t of tasks) {
      taskMap.set(t.id, t);
    }

    const sanitized: DecomposedTaskNode[] = [];

    for (const task of tasks) {
      const cleanedDeps: string[] = [];
      for (const depId of task.dependencies) {
        // Direct self-cycle check
        if (depId === task.id) continue;

        // Check if dep has a dependency back to task (2-node cycle)
        const depNode = taskMap.get(depId);
        if (depNode && depNode.dependencies.includes(task.id)) {
          // Break cycle by respecting layer priority: lower layer number wins
          const currentPriority = DependencyGraphSequencer.LAYER_PRIORITY[task.category] || 99;
          const depPriority = DependencyGraphSequencer.LAYER_PRIORITY[depNode.category] || 99;
          if (currentPriority > depPriority) {
            cleanedDeps.push(depId);
          }
        } else {
          cleanedDeps.push(depId);
        }
      }

      sanitized.push({
        ...task,
        dependencies: cleanedDeps
      });
    }

    return sanitized;
  }

  private sortTasksByLayer(tasks: DecomposedTaskNode[]): void {
    tasks.sort((a, b) => {
      const pA = DependencyGraphSequencer.LAYER_PRIORITY[a.category] || 50;
      const pB = DependencyGraphSequencer.LAYER_PRIORITY[b.category] || 50;
      return pA - pB;
    });
  }
}
