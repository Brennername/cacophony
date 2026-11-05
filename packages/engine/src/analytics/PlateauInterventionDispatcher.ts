export interface DataPoint {
  readonly timestamp: number;
  readonly value: number;
  readonly taskId?: string | undefined;
  readonly modelId?: string | undefined;
}

export interface InterventionTrigger {
  readonly id: string;
  readonly timestamp: number;
  readonly reason: string;
  readonly status: "intervened" | "pending" | "resolved";
  readonly task?: any;
  readonly value?: number;
  readonly durationMs?: number;
}

export interface PlateauInterventionConfig {
  readonly windowSize?: number;
  readonly stagnationThreshold?: number;
  readonly minSamples?: number;
}

/**
 * PlateauInterventionDispatcher
 *
 * Evaluates performance metrics across sliding windows to detect stagnation
 * plateaus, automatically dispatching intervention triggers when progress stalls.
 */
export class PlateauInterventionDispatcher {
  private readonly windowSize: number;
  private readonly stagnationThreshold: number;
  private readonly minSamples: number;
  private readonly dataPoints: DataPoint[] = [];
  private readonly dispatchedInterventions: InterventionTrigger[] = [];
  private _isStagnating = false;

  constructor(config: PlateauInterventionConfig = {}) {
    this.windowSize = config.windowSize ?? 3;
    this.stagnationThreshold = config.stagnationThreshold ?? 0.001;
    this.minSamples = config.minSamples ?? 3;
  }

  /**
   * Ingests a new data point and computes whether the current sliding window is stagnating.
   */
  public async processData(point: DataPoint): Promise<void> {
    this.dataPoints.push(point);
    if (this.dataPoints.length > this.windowSize * 4) {
      this.dataPoints.splice(0, this.dataPoints.length - this.windowSize * 4);
    }

    if (this.dataPoints.length < this.minSamples) {
      this._isStagnating = false;
      return;
    }

    const window = this.dataPoints.slice(-this.windowSize);
    const values = window.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const delta = max - min;

    if (delta <= this.stagnationThreshold) {
      this._isStagnating = true;
      this.triggerIntervention(
        `Stagnation detected across sliding window of ${this.windowSize} points (delta=${delta.toFixed(4)})`,
      );
    } else {
      this._isStagnating = false;
    }
  }

  public isStagnating(): boolean {
    return this._isStagnating;
  }

  public triggerIntervention(reason = "Performance plateau detected"): InterventionTrigger {
    const intervention: InterventionTrigger = {
      id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      reason,
      status: "intervened",
    };
    this.dispatchedInterventions.push(intervention);
    return intervention;
  }

  public dispatchIntervention(task: any): InterventionTrigger | null {
    if (!task) {
      return null;
    }
    if (task.status && task.status !== "stagnant" && !this._isStagnating) {
      return null;
    }
    const intervention: InterventionTrigger = {
      id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      reason: `Intervention dispatched for task ${task.id || task.title || "unknown"}`,
      status: "intervened",
      task,
    };
    this.dispatchedInterventions.push(intervention);
    return intervention;
  }

  public handleOverlappingRanges(tasks: any[]): InterventionTrigger[] {
    return tasks
      .filter((t) => t && (t.status === "stagnant" || (!t.status && this._isStagnating)))
      .map((t) => this.dispatchIntervention(t))
      .filter((i): i is InterventionTrigger => i !== null);
  }

  public getDispatchedInterventions(): readonly InterventionTrigger[] {
    return [...this.dispatchedInterventions];
  }

  public clearInterventions(): void {
    this.dispatchedInterventions.length = 0;
  }

  public clearData(): void {
    this.dataPoints.length = 0;
    this._isStagnating = false;
  }
}
