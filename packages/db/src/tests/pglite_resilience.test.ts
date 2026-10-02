import { PgliteDriver } from '@cacophony/db';
import { expect } from 'chai';

describe('Pglite Driver Resilience', () => {
  let driver: PgliteDriver;

  beforeEach(async () => {
    driver = new PgliteDriver();
    await driver.connect();
  });

  afterEach(async () => {
    await driver.disconnect();
  });

  it('should re-establish connection after disconnection', async () => {
    await driver.disconnect();
    await expect(driver.connect()).to.eventually.be.fulfilled;
  });

  it('should handle concurrency locks gracefully', async () => {
    const lockKey = 'testLock';
    let lockAcquired = false;

    // Simulate acquiring a lock
    await driver.acquireLock(lockKey);
    lockAcquired = true;

    // Attempt to acquire the same lock again (should fail)
    try {
      await driver.acquireLock(lockKey);
      expect.fail('Expected lock acquisition to fail');
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.include('lock already held');
    }

    // Release the lock
    await driver.releaseLock(lockKey);

    // Attempt to acquire the lock again (should succeed)
    await driver.acquireLock(lockKey);
    expect(lockAcquired).to.be.true;
  });
});