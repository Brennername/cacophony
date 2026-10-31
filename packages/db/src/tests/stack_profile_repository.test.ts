import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { StackProfileRepository } from "../repositories/StackProfileRepository.js";

describe("StackProfileRepository", () => {
  let driver: PGliteDriver;
  let repo: StackProfileRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new StackProfileRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should persist and retrieve a stack instruction profile", async () => {
    const profile = await repo.save({
      id: "rust-actix",
      name: "Rust Actix Web Stack",
      description: "High-performance Rust web service profile",
      defaultTestRunner: "cargo test",
      dataJson: JSON.stringify({
        compiler: "rustc",
        features: ["json", "tokio"],
      }),
    });

    assert.equal(profile.id, "rust-actix");
    assert.equal(profile.name, "Rust Actix Web Stack");
    assert.equal(profile.defaultTestRunner, "cargo test");

    const fetched = await repo.getById("rust-actix");
    assert.ok(fetched);
    assert.equal(fetched.id, "rust-actix");
    assert.equal(fetched.name, "Rust Actix Web Stack");
    assert.equal(fetched.description, "High-performance Rust web service profile");
    assert.equal(fetched.defaultTestRunner, "cargo test");
    const parsedData = JSON.parse(fetched.dataJson);
    assert.equal(parsedData.compiler, "rustc");
  });

  test("should update an existing profile on conflict", async () => {
    await repo.save({
      id: "go-gin",
      name: "Go Gin Framework",
      description: "Go REST service",
      defaultTestRunner: "go test ./...",
      dataJson: JSON.stringify({ goVersion: "1.22" }),
    });

    const updated = await repo.save({
      id: "go-gin",
      name: "Go Gin Framework v2",
      description: "Updated Go REST service with modules",
      defaultTestRunner: "go test -v ./...",
      dataJson: JSON.stringify({ goVersion: "1.23", modules: true }),
    });

    assert.equal(updated.name, "Go Gin Framework v2");

    const fetched = await repo.getById("go-gin");
    assert.ok(fetched);
    assert.equal(fetched.name, "Go Gin Framework v2");
    assert.equal(fetched.defaultTestRunner, "go test -v ./...");
    const parsed = JSON.parse(fetched.dataJson);
    assert.equal(parsed.goVersion, "1.23");
    assert.equal(parsed.modules, true);
  });

  test("should return null for non-existent profile", async () => {
    const nonExistent = await repo.getById("missing-profile-id");
    assert.equal(nonExistent, null);
  });

  test("should list all registered profiles ordered by name", async () => {
    await repo.save({
      id: "profile-z",
      name: "Zebra Profile",
      description: "Zebra stack",
      defaultTestRunner: "z-test",
      dataJson: "{}",
    });
    await repo.save({
      id: "profile-a",
      name: "Alpha Profile",
      description: "Alpha stack",
      defaultTestRunner: "a-test",
      dataJson: "{}",
    });
    await repo.save({
      id: "profile-m",
      name: "Middle Profile",
      description: "Middle stack",
      defaultTestRunner: "m-test",
      dataJson: "{}",
    });

    const all = await repo.listAll();
    const names = all.map((p) => p.name);
    assert.ok(names.length >= 3);
    const alphaIndex = names.indexOf("Alpha Profile");
    const middleIndex = names.indexOf("Middle Profile");
    const zebraIndex = names.indexOf("Zebra Profile");
    assert.ok(alphaIndex < middleIndex);
    assert.ok(middleIndex < zebraIndex);
  });

  test("should delete a profile and return true, then false when missing", async () => {
    await repo.save({
      id: "to-delete",
      name: "Temporary Profile",
      description: "Temporary",
      defaultTestRunner: "none",
      dataJson: "{}",
    });

    const deleted = await repo.delete("to-delete");
    assert.equal(deleted, true);

    const fetched = await repo.getById("to-delete");
    assert.equal(fetched, null);

    const deletedAgain = await repo.delete("to-delete");
    assert.equal(deletedAgain, false);
  });
});
