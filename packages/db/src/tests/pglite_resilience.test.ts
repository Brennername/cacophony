import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";

describe("PGliteDriver Resilience Test Suite (T47.4.4)", () => {
  let driver: PGliteDriver;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should execute basic queries when connected", async () => {
    const res = await driver.query<{ val: number }>("SELECT 1 as val;");
    assert.equal(res.length, 1);
    assert.equal(res[0]?.val, 1);
  });

  test("should re-establish connection after close", async () => {
    await driver.close();
    await driver.connect();
    const res = await driver.query<{ val: number }>("SELECT 42 as val;");
    assert.equal(res.length, 1);
    assert.equal(res[0]?.val, 42);
  });
});