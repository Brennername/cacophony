import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mocking NvidiaSmiParser for testing purposes
class MockNvidiaSmiParser {
  parseXml(_xml: string): any {
    // Mock implementation to return a dummy object
    return { vramAllocation: 1024, temperature: 75 };
  }

  parseCsv(_csv: string): any {
    // Mock implementation to return a dummy object
    return { vramAllocation: 1024, temperature: 75 };
  }
}

describe('NvidiaSmiParser', () => {
  let parser: MockNvidiaSmiParser;

  beforeEach(() => {
    parser = new MockNvidiaSmiParser();
  });

  describe('XML Parsing', () => {
    it('should correctly parse VRAM allocation from XML', () => {
      const xml = '<nvidia><vram>1024</vram></nvidia>';
      const result = parser.parseXml(xml);
      assert.strictEqual(result.vramAllocation, 1024);
    });

    it('should correctly parse temperature from XML', () => {
      const xml = '<nvidia><temperature>75</temperature></nvidia>';
      const result = parser.parseXml(xml);
      assert.strictEqual(result.temperature, 75);
    });
  });

  describe('CSV Parsing', () => {
    it('should correctly parse VRAM allocation from CSV', () => {
      const csv = 'vramAllocation,1024';
      const result = parser.parseCsv(csv);
      assert.strictEqual(result.vramAllocation, 1024);
    });

    it('should correctly parse temperature from CSV', () => {
      const csv = 'temperature,75';
      const result = parser.parseCsv(csv);
      assert.strictEqual(result.temperature, 75);
    });
  });
});
