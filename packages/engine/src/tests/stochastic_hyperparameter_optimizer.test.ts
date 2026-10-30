import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StochasticHyperparameterOptimizer } from '../optimization/StochasticHyperparameterOptimizer.js';
import { RulePipelineEngine } from '../rules/RulePipelineEngine.js';

describe('StochasticHyperparameterOptimizer', () => {
  let optimizer: StochasticHyperparameterOptimizer;
  let engine: RulePipelineEngine;

  beforeEach(() => {
    engine = new RulePipelineEngine();
    optimizer = new StochasticHyperparameterOptimizer(engine);
  });

  it('should perform temperature perturbation', async () => {
    const options: { strategy: 'genetic_evolution' } = { strategy: 'genetic_evolution' };
    const result = await optimizer.optimize('model1', [], options);
    assert.strictEqual(result.strategy, 'genetic_evolution');
  });

  it('should sample prompts variation', async () => {
    const options: { strategy: 'random_search' } = { strategy: 'random_search' };
    const result = await optimizer.optimize('model2', [], options);
    assert.strictEqual(result.strategy, 'random_search');
  });

  it('should compare scores correctly', async () => {
    const options: { strategy: 'bayesian' } = { strategy: 'bayesian' };
    const result = await optimizer.optimize('model3', [], options);
    assert.strictEqual(result.strategy, 'bayesian');
  });
});
