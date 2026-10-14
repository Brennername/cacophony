class IModelVramCatalog {
  [key: string]: any;
  constructor(..._args: any[]) {}
}

/**
 * ModelVramCatalog class to manage and provide VRAM footprints for different models.
 */
export class ModelVramCatalog implements IModelVramCatalog {
  private modelVramMap: Map<string, number>;

  constructor() {
    this.modelVramMap = new Map();
    // Initialize the VRAM footprints for known models
    this.initializeBaselineMemoryFootprints();
  }

  /**
   * Initializes the baseline memory footprints for known models.
   */
  private initializeBaselineMemoryFootprints(): void {
    this.modelVramMap.set("qwen2.5-coder:3b", 2.2);
    this.modelVramMap.set("gemma3:4b", 3.1);
    this.modelVramMap.set("qwen2.5-coder:7b", 5.2);
    this.modelVramMap.set("deepseek-r1:8b", 6.1);
  }

  /**
   * Retrieves the VRAM footprint for a given model.
   * @param modelName - The name of the model.
   * @returns The VRAM footprint in GB, or undefined if the model is not found.
   */
  public getVramForModel(modelName: string): number | undefined {
    return this.modelVramMap.get(modelName);
  }

  /**
   * Adds a new model with its VRAM footprint to the catalog.
   * @param modelName - The name of the model.
   * @param vramFootprint - The VRAM footprint in GB.
   */
  public addModelVram(modelName: string, vramFootprint: number): void {
    this.modelVramMap.set(modelName, vramFootprint);
  }

  /**
   * Removes a model from the catalog.
   * @param modelName - The name of the model to remove.
   */
  public removeModel(modelName: string): void {
    this.modelVramMap.delete(modelName);
  }
}
