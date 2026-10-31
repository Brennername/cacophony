import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { LspDetector } from "../lsp/LspDetector.js";

describe("LspDetector", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-lsp-detector-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("Server Binary Discovery via Workspace Markers", () => {
    test("should discover typescript-language-server when tsconfig.json is present", () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");

      const server = LspDetector.detectServer(tempDir);
      assert.ok(server);
      assert.equal(server.name, "typescript-language-server");
      assert.equal(server.command, "npx");
      assert.deepEqual(server.args, ["-y", "typescript-language-server", "--stdio"]);
    });

    test("should discover typescript-language-server when package.json is present", () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "{}");

      const server = LspDetector.detectServer(tempDir);
      assert.ok(server);
      assert.equal(server.name, "typescript-language-server");
    });

    test("should discover rust-analyzer when Cargo.toml is present", () => {
      fs.writeFileSync(path.join(tempDir, "Cargo.toml"), "[package]");

      const server = LspDetector.detectServer(tempDir);
      assert.ok(server);
      assert.equal(server.name, "rust-analyzer");
      assert.equal(server.command, "rust-analyzer");
    });

    test("should discover gopls when go.mod is present", () => {
      fs.writeFileSync(path.join(tempDir, "go.mod"), "module test");

      const server = LspDetector.detectServer(tempDir);
      assert.ok(server);
      assert.equal(server.name, "gopls");
      assert.equal(server.command, "gopls");
    });

    test("should discover jdtls when pom.xml is present", () => {
      fs.writeFileSync(path.join(tempDir, "pom.xml"), "<project></project>");

      const server = LspDetector.detectServer(tempDir);
      assert.ok(server);
      assert.equal(server.name, "jdtls");
      assert.equal(server.command, "jdtls");
    });

    test("should return null when no markers match", () => {
      const server = LspDetector.detectServer(tempDir);
      assert.equal(server, null);
    });
  });

  describe("Client Instantiation", () => {
    test("should create client based on detected server", () => {
      fs.writeFileSync(path.join(tempDir, "Cargo.toml"), "[package]");

      const client = LspDetector.createClient(tempDir);
      assert.ok(client);
      assert.equal(client.serverName, "rust-analyzer");
      assert.equal(client.isRunning, false);
    });

    test("should allow customConfig overrides for command and server name", () => {
      const client = LspDetector.createClient(tempDir, {
        name: "custom-rust-analyzer",
        command: "/opt/bin/rust-analyzer",
        args: ["--log-file", "rust.log"],
      });

      assert.ok(client);
      assert.equal(client.serverName, "custom-rust-analyzer");
      assert.equal(client.isRunning, false);
    });
  });
});
