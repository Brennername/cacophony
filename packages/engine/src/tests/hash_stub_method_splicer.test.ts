import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HashStubMethodSplicer, SpliceResult } from '../context/HashStubMethodSplicer.js';
import { HashStubGenerator } from '../context/HashStubGenerator.js';

describe('HashStubMethodSplicer', () => {
  it('should return original code if target hash is not found', () => {
    const sourceCode = `
      public class MyClass {
        public method1() {}
      }
    `;
    const targetHash = 'nonexistent-hash';
    const replacementMethodCode = `
      public method2() {
        console.log('replaced');
      }
    `;

    const result: SpliceResult = HashStubMethodSplicer.splice(sourceCode, targetHash, replacementMethodCode);

    assert.strictEqual(result.updatedCode, sourceCode, 'Updated code should be the same as original');
    assert.strictEqual(result.spliced, false, 'Should not have spliced');
  });

  it('should splice method when target hash is found', () => {
    const filePath = 'temp.ts';
    const methodName = 'method1';
    const stubComment = HashStubGenerator.createStubComment(filePath, methodName);
    const sourceCode = `
      public class MyClass {
        ${stubComment}
        public method1() {}
      }
    `;

    const replacementMethodCode = `
      public method1() {
        console.log('replaced');
      }
    `;

    const targetHash = HashStubGenerator.generateHash(filePath, methodName);

    const result: SpliceResult = HashStubMethodSplicer.splice(sourceCode, targetHash, replacementMethodCode);

    assert.strictEqual(result.spliced, true, 'Should have spliced');
    assert.ok(result.updatedCode.includes('console.log(\'replaced\')'), 'Updated code should include replaced method');
  });

  it('should handle splicing when the target hash is a function', () => {
      const filePath = 'temp.ts';
      const methodName = 'myFunction';
      const stubComment = HashStubGenerator.createStubComment(filePath, methodName);
      const sourceCode = `
        public class MyClass {
          ${stubComment}
          function myFunction() {}
        }
      `;

      const replacementMethodCode = `
        function myFunction() {
          console.log('replaced');
        }
      `;

      const targetHash = HashStubGenerator.generateHash(filePath, methodName);

      const result: SpliceResult = HashStubMethodSplicer.splice(sourceCode, targetHash, replacementMethodCode);

      assert.strictEqual(result.spliced, true, 'Should have spliced');
      assert.ok(result.updatedCode.includes('console.log(\'replaced\')'), 'Updated code should include replaced method');
  });

    it('should handle splicing when the target hash is a method signature', () => {
        const filePath = 'temp.ts';
        const methodName = 'myMethod';
        const stubComment = HashStubGenerator.createStubComment(filePath, methodName);
        const sourceCode = `
          public class MyClass {
            ${stubComment}
            myMethod(): void {}
          }
        `;

        const replacementMethodCode = `
          myMethod(): void {
            console.log('replaced');
          }
        `;

        const targetHash = HashStubGenerator.generateHash(filePath, methodName);

        const result: SpliceResult = HashStubMethodSplicer.splice(sourceCode, targetHash, replacementMethodCode);

        assert.strictEqual(result.spliced, true, 'Should have spliced');
        assert.ok(result.updatedCode.includes('console.log(\'replaced\')'), 'Updated code should include replaced method');
    });

  it('should preserve the method name when splicing', () => {
      const filePath = 'temp.ts';
      const methodName = 'method1';
      const stubComment = HashStubGenerator.createStubComment(filePath, methodName);
      const sourceCode = `
        public class MyClass {
          ${stubComment}
          public method1() {}
        }
      `;

      const replacementMethodCode = `
        public method1() {
          console.log('replaced');
        }
      `;

      const targetHash = HashStubGenerator.generateHash(filePath, methodName);

      const result: SpliceResult = HashStubMethodSplicer.splice(sourceCode, targetHash, replacementMethodCode);

      assert.strictEqual(result.methodName, 'method1', 'Should preserve method name');
  });
});
