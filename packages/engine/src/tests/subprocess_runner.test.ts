import { strict as assert } from 'assert';
import { SubprocessRunner } from '../subprocess_runner';

describe('SubprocessRunner', () => {
  it('should execute test commands and capture standard output and exit codes cleanly', async () => {
    const subprocessRunner = new SubprocessRunner();

    // Mock the exec method to simulate command execution
    const mockExec = (command: string, options?: { cwd?: string }) => {
      return Promise.resolve({
        stdout: `Output of ${command}`,
        stderr: '',
        code: 0,
      });
    };

    // Replace the actual exec method with our mock
    subprocessRunner['exec'] = mockExec;

    const command = 'echo "Hello, World!"';
    const result = await subprocessRunner.run(command);

    assert.strictEqual(result.stdout, 'Output of echo "Hello, World!"');
    assert.strictEqual(result.stderr, '');
    assert.strictEqual(result.code, 0);
  });

  it('should handle non-zero exit codes', async () => {
    const subprocessRunner = new SubprocessRunner();

    // Mock the exec method to simulate command execution with a non-zero exit code
    const mockExec = (command: string, options?: { cwd?: string }) => {
      return Promise.resolve({
        stdout: '',
        stderr: 'Error occurred',
        code: 1,
      });
    };

    // Replace the actual exec method with our mock
    subprocessRunner['exec'] = mockExec;

    const command = 'false';
    try {
      await subprocessRunner.run(command);
      assert.fail('Expected an error to be thrown');
    } catch (error) {
      assert.strictEqual(error.message, 'Command failed with exit code 1');
    }
  });

  it('should handle errors in exec method', async () => {
    const subprocessRunner = new SubprocessRunner();

    // Mock the exec method to simulate an error
    const mockExec = (command: string, options?: { cwd?: string }) => {
      return Promise.reject(new Error('Failed to execute command'));
    };

    // Replace the actual exec method with our mock
    subprocessRunner['exec'] = mockExec;

    const command = 'echo "Hello, World!"';
    try {
      await subprocessRunner.run(command);
      assert.fail('Expected an error to be thrown');
    } catch (error) {
      assert.strictEqual(error.message, 'Failed to execute command');
    }
  });
});