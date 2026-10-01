import { ModelEvictionManager } from '../ModelEvictionManager';
import { MockModel } from '../../__mocks__/MockModel';

describe('Model Eviction Cooldown Test Suite', () => {
  let modelEvictionManager: ModelEvictionManager;
  let mockModel: MockModel;

  beforeEach(() => {
    mockModel = new MockModel();
    modelEvictionManager = new ModelEvictionManager(mockModel);
  });

  it('should enter COOLDOWN after 3 consecutive failures', async () => {
    // Simulate 3 consecutive failures
    for (let i = 0; i < 3; i++) {
      await mockModel.simulateFailure();
    }

    // Check if model is in COOLDOWN
    expect(modelEvictionManager.isInCooldown()).toBe(true);
  });

  it('should recover cleanly upon passing probe task', async () => {
    // Simulate 3 consecutive failures
    for (let i = 0; i < 3; i++) {
      await mockModel.simulateFailure();
    }

    // Check if model is in COOLDOWN
    expect(modelEvictionManager.isInCooldown()).toBe(true);

    // Simulate passing probe task
    await mockModel.simulateSuccess();

    // Check if model has recovered
    expect(modelEvictionManager.isInCooldown()).toBe(false);
  });
});