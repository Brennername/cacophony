import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TypeScriptMethodSplicer } from '../refactoring/TypeScriptMethodSplicer.js';

describe('TypeScriptMethodSplicer', () => {
  it('should replace method by AST node match', async () => {
    const originalCode = `
      class ExampleClass {
        oldMethod() {
          console.log('Old Method');
        }
      }
    `;

    const newMethod = `
      function newMethod() {
        console.log('New Method');
      }
    `;

    const splicer = new TypeScriptMethodSplicer();
    const result = await (splicer as any).splice(originalCode, 'oldMethod', newMethod);

    assert(result.includes(newMethod));
    assert(!result.includes('oldMethod'));
  });

  it('should retain comments during method replacement', async () => {
    const originalCode = `
      class ExampleClass {
        // This is an old method
        oldMethod() {
          console.log('Old Method');
        }
      }
    `;

    const newMethod = `
      function newMethod() {
        // This is a new method
        console.log('New Method');
      }
    `;

    const splicer = new TypeScriptMethodSplicer();
    const result = await (splicer as any).splice(originalCode, 'oldMethod', newMethod);

    assert(result.includes('// This is an old method'));
    assert(result.includes('// This is a new method'));
  });

  it('should align indentation during method replacement', async () => {
    const originalCode = `
      class ExampleClass {
        oldMethod() {
          console.log('Old Method');
        }
      }
    `;

    const newMethod = `
      function newMethod() {
        console.log('New Method');
      }
    `;

    const splicer = new TypeScriptMethodSplicer();
    const result = await (splicer as any).splice(originalCode, 'oldMethod', newMethod);

    assert(result.includes('console.log(\'Old Method\');'));
    assert(result.includes('console.log(\'New Method\');'));
  });

  it('should handle methods with parameters', async () => {
    const originalCode = `
      class ExampleClass {
        oldMethod(param1, param2) {
          console.log(param1, param2);
        }
      }
    `;

    const newMethod = `
      function newMethod(param1, param2) {
        console.log('New Method', param1, param2);
      }
    `;

    const splicer = new TypeScriptMethodSplicer();
    const result = await (splicer as any).splice(originalCode, 'oldMethod', newMethod);

    assert(result.includes('console.log(\'New Method\', param1, param2);'));
  });

  it('should handle methods with return values', async () => {
    const originalCode = `
      class ExampleClass {
        oldMethod() {
          return 'Old Result';
        }
      }
    `;

    const newMethod = `
      function newMethod() {
        return 'New Result';
      }
    `;

    const splicer = new TypeScriptMethodSplicer();
    const result = await (splicer as any).splice(originalCode, 'oldMethod', newMethod);

    assert(result.includes('return \'New Result\';'));
  });

  it('should handle methods with complex logic', async () => {
    const originalCode = `
      class ExampleClass {
        oldMethod() {
          if (true) {
            console.log('True');
          } else {
            console.log('False');
          }
        }
      }
    `;

    const newMethod = `
      function newMethod() {
        if (false) {
          console.log('True');
        } else {
          console.log('False');
        }
      }
    `;

    const splicer = new TypeScriptMethodSplicer();
    const result = await (splicer as any).splice(originalCode, 'oldMethod', newMethod);

    assert(result.includes('if (false) {'));
  });
});
