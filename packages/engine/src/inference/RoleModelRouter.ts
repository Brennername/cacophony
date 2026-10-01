import { RoleModel } from '../shared-types/RoleModel';
import { ModelAvailabilityService } from '../tools/ModelAvailabilityService';

export class RoleModelRouter {
  private modelAvailabilityService: ModelAvailabilityService;

  constructor(modelAvailabilityService: ModelAvailabilityService) {
    this.modelAvailabilityService = modelAvailabilityService;
  }

  public async getRoleModel(roleId: string): Promise<RoleModel> {
    const preferredModel = await this.modelAvailabilityService.getPreferredModel(roleId);
    if (preferredModel && !this.isModelUnavailableOrInCooldown(preferredModel)) {
      return preferredModel;
    } else {
      const fallbackModels = await this.modelAvailabilityService.getFallbackModels(roleId);
      for (const model of fallbackModels) {
        if (!this.isModelUnavailableOrInCooldown(model)) {
          return model;
        }
      }
      throw new Error('No available models found');
    }
  }

  private isModelUnavailableOrInCooldown(model: RoleModel): boolean {
    const now = Date.now();
    return model.status === 'unavailable' || (model.cooldownEnd && now < model.cooldownEnd);
  }
}