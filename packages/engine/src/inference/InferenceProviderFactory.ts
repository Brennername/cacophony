import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mock environment variables for testing
process.env.INFERENCE_PROVIDER = 'ollama';
process.env.INFERENCE_BASE_URL = 'http://example.com/api';
process.env.INFERENCE_API_KEY = 'test-api-key';

class InferenceProvider {
  constructor(public type: string, public baseUrl: string, public apiKey: string) {}
}

class InferenceProviderFactory {
  createProvider(): InferenceProvider {
    const providerType = process.env.INFERENCE_PROVIDER;
    const baseUrl = process.env.INFERENCE_BASE_URL || '';
    const apiKey = process.env.INFERENCE_API_KEY || '';

    if (providerType === 'ollama') {
      return new InferenceProvider('ollama', baseUrl, apiKey);
    } else if (providerType === 'openai_compatible') {
      return new InferenceProvider('openai_compatible', baseUrl, apiKey);
    } else {
      throw new Error('Unsupported inference provider');
    }
  }
}

describe('InferenceProviderFactory', () => {
  it('should create an Ollama provider when INFERENCE_PROVIDER is ollama', () => {
    const factory = new InferenceProviderFactory();
    const provider = factory.createProvider();
    assert.strictEqual(provider.type, 'ollama');
    assert.strictEqual(provider.baseUrl, 'http://example.com/api');
    assert.strictEqual(provider.apiKey, 'test-api-key');
  });

  it('should throw an error for unsupported INFERENCE_PROVIDER', () => {
    process.env.INFERENCE_PROVIDER = 'unsupported';
    const factory = new InferenceProviderFactory();
    assert.throws(() => factory.createProvider(), /Unsupported inference provider/);
  });
});
