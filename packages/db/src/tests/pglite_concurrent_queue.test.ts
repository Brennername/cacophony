import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGliteDriver } from '../drivers/PGliteDriver.js';

describe('PGliteDriver Concurrent Execution Queue (T96.5.4)', () => {
  let driver: PGliteDriver;

  before(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    await driver.execute('CREATE TABLE queue_test (id INT, val TEXT);');
  });

  after(async () => {
    await driver.close();
  });

  test('handles concurrent statement execution queueing without deadlocking', async () => {
    const concurrentCount = 25;
    const insertPromises = Array.from({ length: concurrentCount }, (_, i) =>
      driver.execute('INSERT INTO queue_test (id, val) VALUES ($1, $2);', [
        i,
        `row-${i}`,
      ]),
    );

    // Concurrently execute all inserts without awaiting individually
    await Promise.all(insertPromises);

    // Concurrently query rows
    const queryPromises = Array.from({ length: concurrentCount }, (_, i) =>
      driver.queryOne<{ val: string }>(
        'SELECT val FROM queue_test WHERE id = $1;',
        [i],
      ),
    );

    const results = await Promise.all(queryPromises);
    assert.strictEqual(results.length, concurrentCount);

    for (let i = 0; i < concurrentCount; i++) {
      assert.strictEqual(results[i]?.val, `row-${i}`);
    }

    const totalRows = await driver.queryOne<{ count: string | number }>(
      'SELECT COUNT(*) as count FROM queue_test;',
    );
    assert.strictEqual(Number(totalRows?.count), concurrentCount);
  });
});
