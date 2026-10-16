import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HistoricalArenaIngestionAdapter } from '../optimization/HistoricalArenaIngestionAdapter.js';

// Mock dependencies
const mockTaskOutcomeRecord = {
  taskId: '123',
  outcome: 'success',
  timestamp: new Date().toISOString(),
};

const mockMetricParsingResult = {
  metricName: 'accuracy',
  value: 0.95,
};

const mockDatabaseBatchStaging = {
  batchId: 'batch-456',
  recordsCount: 10,
};

// Mock the HistoricalArenaIngestionAdapter class
class MockHistoricalArenaIngestionAdapter extends HistoricalArenaIngestionAdapter {
  async ingestTaskOutcomeRecord(_record: any) {
    return mockTaskOutcomeRecord;
  }

  async parseMetrics(_taskOutcomeRecord: any) {
    return mockMetricParsingResult;
  }

  async stageToDatabase(_parsedMetrics: any) {
    return mockDatabaseBatchStaging;
  }
}

describe('HistoricalArenaIngestionAdapter', () => {
  let adapter: MockHistoricalArenaIngestionAdapter;

  beforeEach(() => {
    adapter = new MockHistoricalArenaIngestionAdapter();
  });

  it('should ingest task outcome record correctly', async () => {
    const result = await adapter.ingestTaskOutcomeRecord(mockTaskOutcomeRecord);
    assert.deepStrictEqual(result, mockTaskOutcomeRecord);
  });

  it('should parse metrics from task outcome record correctly', async () => {
    const parsedMetrics = await adapter.parseMetrics(mockTaskOutcomeRecord);
    assert.deepStrictEqual(parsedMetrics, mockMetricParsingResult);
  });

  it('should stage parsed metrics to database correctly', async () => {
    const stagingResult = await adapter.stageToDatabase(mockMetricParsingResult);
    assert.deepStrictEqual(stagingResult, mockDatabaseBatchStaging);
  });

  it('should complete the ingestion process end-to-end', async () => {
    const outcomeRecord = await adapter.ingestTaskOutcomeRecord(mockTaskOutcomeRecord);
    const parsedMetrics = await adapter.parseMetrics(outcomeRecord);
    const stagingResult = await adapter.stageToDatabase(parsedMetrics);

    assert.deepStrictEqual(outcomeRecord, mockTaskOutcomeRecord);
    assert.deepStrictEqual(parsedMetrics, mockMetricParsingResult);
    assert.deepStrictEqual(stagingResult, mockDatabaseBatchStaging);
  });
});
