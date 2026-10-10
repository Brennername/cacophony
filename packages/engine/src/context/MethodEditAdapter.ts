import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * LanguageAdapterContracts interface defines the contracts for language-specific adapters.
 */
interface LanguageAdapterContracts {
  parse: (sourceCode: string) => any;
  targetSymbolRange: (symbolName: string, parsedSource: any) => [number, number] | null;
  bodyValidation: (parsedSource: any) => boolean;
  surgicalSplice: (parsedSource: any, newBody: string, range: [number, number]) => any;
  postEditSymbolInventoryComparison: (originalParsedSource: any, editedParsedSource: any, symbolName: string) => boolean;
}

/**
 * MethodEditAdapter class that uses language-specific adapters to perform method edits.
 */
class MethodEditAdapter {
  private contracts: LanguageAdapterContracts;

  constructor(contracts: LanguageAdapterContracts) {
    this.contracts = contracts;
  }

  /**
   * Edits a method in the source code by replacing its body with a new one.
   * @param sourceCode - The original source code as a string.
   * @param symbolName - The name of the method to be edited.
   * @param newBody - The new body for the method.
   * @returns The modified source code as a string.
   */
  editMethod(sourceCode: string, symbolName: string, newBody: string): string {
    const parsedSource = this.contracts.parse(sourceCode);
    assert(this.contracts.bodyValidation(parsedSource), 'Parsed source does not pass body validation.');

    const range = this.contracts.targetSymbolRange(symbolName, parsedSource);
    assert(range !== null, `Target symbol ${symbolName} not found in the source code.`);

    const editedParsedSource = this.contracts.surgicalSplice(parsedSource, newBody, range);
    assert(this.contracts.postEditSymbolInventoryComparison(parsedSource, editedParsedSource, symbolName), 'Post-edit symbol inventory comparison failed.');

    return this.contracts.parse(editedParsedSource); // Assuming parse can convert back to string
  }
}

// Example usage and test cases
describe('MethodEditAdapter', () => {
  const mockContracts: LanguageAdapterContracts = {
    parse: (sourceCode) => sourceCode,
    targetSymbolRange: (_symbolName, _parsedSource) => [0, 10],
    bodyValidation: (_parsedSource) => true,
    surgicalSplice: (parsedSource, newBody, range) => `${parsedSource.slice(0, range[0])}${newBody}${parsedSource.slice(range[1])}`,
    postEditSymbolInventoryComparison: (_originalParsedSource, _editedParsedSource, _symbolName) => true,
  };

  const adapter = new MethodEditAdapter(mockContracts);

  it('should edit a method in the source code', () => {
    const originalCode = 'function example() { return "old"; }';
    const newBody = 'return "new";';
    const editedCode = adapter.editMethod(originalCode, 'example', newBody);
    assert.strictEqual(editedCode, 'function example() { return "new"; }');
  });
});
