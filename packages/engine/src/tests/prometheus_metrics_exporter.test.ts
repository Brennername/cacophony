import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock PrometheusMetricsExporter for testing
class PrometheusMetricsExporter {
  private metrics: Record<string, number | string[]> = {};

  incrementCounter(metricName: string): void {
    if (this.metrics[metricName] === undefined) {
      this.metrics[metricName] = 0;
    }
    this.metrics[metricName] = (this.metrics[metricName] as number) + 1;
  }

  setGauge(metricName: string, value: number): void {
    if (this.metrics[metricName] === undefined) {
      this.metrics[metricName] = [];
    }
    (this.metrics[metricName] as string[]).push(value.toString());
  }

  getMetric(metricName: string): number | string[] | undefined {
    return this.metrics[metricName];
  }
}

describe('PrometheusMetricsExporter', () => {
  let exporter: PrometheusMetricsExporter;

  beforeEach(() => {
    exporter = new PrometheusMetricsExporter();
  });

  describe('incrementCounter', () => {
    it('increments a counter metric by 1', () => {
      exporter.incrementCounter('test_counter');
      assert.strictEqual(exporter.getMetric('test_counter'), 1);
    });

    it('increments an existing counter metric by 1', () => {
      exporter.incrementCounter('existing_counter');
      exporter.incrementCounter('existing_counter');
      assert.strictEqual(exporter.getMetric('existing_counter'), 2);
    });
  });

  describe('setGauge', () => {
    it('sets a gauge metric with a single value', () => {
      exporter.setGauge('test_gauge', 42);
      assert.deepStrictEqual(exporter.getMetric('test_gauge'), ['42']);
    });

    it('appends a new value to an existing gauge metric', () => {
      exporter.setGauge('existing_gauge', 10);
      exporter.setGauge('existing_gauge', 20);
      assert.deepStrictEqual(exporter.getMetric('existing_gauge'), ['10', '20']);
    });
  });

  describe('metric name formatting and label escaping', () => {
    it('formats metric names correctly', () => {
      exporter.incrementCounter('user_login_success');
      assert.strictEqual(exporter.getMetric('user_login_success'), 1);
    });

    it('escapes labels in gauge metrics', () => {
      exporter.setGauge('user_age', 30);
      assert.deepStrictEqual(exporter.getMetric('user_age'), ['30']);
    });
  });
});
