import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import { ExecutionGuard } from "../security/ExecutionGuard.js";

describe("ExecutionGuard Security Filter and Confinement Suite (T102.12.11)", () => {
  const guard = new ExecutionGuard();
  const mockWorkspace = "/home/nexen/projects/cacophony";

  describe("Dangerous Command Mitigation (regr-mvhduh5l-q5un)", () => {
    it("should block dangerous commands", () => {
      const dangerousCommands = [
        "rm -rf /",
        "rm src/unwanted.ts",
        "rmdir obsolete_dir",
        "shred -u passwords.txt",
        "unlink test_symlink",
        "dd if=/dev/zero of=/dev/sda",
        "mkfs.ext4 /dev/sdb1",
        "fdisk /dev/nvme0n1",
        "parted /dev/sda mklabel gpt",
        "git reset --hard HEAD~1",
        "git push origin main --force",
        "git push -f origin master",
        "echo bad > /dev/sda",
        ":(){ :|:& };:"
      ];

      for (const cmd of dangerousCommands) {
        const result = guard.evaluate(cmd);
        assert.strictEqual(
          result.isAllowed,
          false,
          `Expected command to be blocked: "${cmd}"`
        );
        assert.ok(
          result.reason?.includes("Execution Guard Violation"),
          `Expected Execution Guard Violation reason for: "${cmd}"`
        );
      }
    });

    it("should reject empty or whitespace command strings", () => {
      assert.strictEqual(guard.evaluate("").isAllowed, false);
      assert.strictEqual(guard.evaluate("   \t  \n").isAllowed, false);
      assert.strictEqual(ExecutionGuard.evaluate("").isAllowed, false);
    });
  });

  describe("Privilege Escalation Blocking (regr-mvhde30g-bd2k)", () => {
    it('should block the "sudo" command', () => {
      const sudoCommands = [
        "sudo rm -rf /var/log",
        "sudo apt update",
        "sudo systemctl restart nginx",
        "sudo su",
        "SUDO echo 123",
        "su - root",
        "su admin",
        "doas reboot"
      ];

      for (const cmd of sudoCommands) {
        const result = guard.evaluate(cmd);
        assert.strictEqual(
          result.isAllowed,
          false,
          `Expected privilege escalation command to be blocked: "${cmd}"`
        );
        assert.ok(
          result.reason?.includes("Privilege escalation"),
          `Expected privilege escalation reason for: "${cmd}"`
        );
      }
    });
  });

  describe('Unrecoverable Git Clean Mitigation (regr-mvhde306-gg36)', () => {
    it('should block the "git clean -f" command', () => {
      const gitCleanCommands = [
        "git clean -f",
        "git clean -fd",
        "git clean -fdx",
        "git clean -df",
        "git clean -f -d",
        "git clean -f -x -d",
        "git clean --force",
        "git clean -d --force"
      ];

      for (const cmd of gitCleanCommands) {
        const result = guard.evaluate(cmd);
        assert.strictEqual(
          result.isAllowed,
          false,
          `Expected git clean command to be blocked: "${cmd}"`
        );
        assert.ok(
          result.reason?.includes("git clean -f"),
          `Expected git clean reason for: "${cmd}"`
        );
      }
    });

    it("should allow safe non-destructive git commands", () => {
      const safeGitCommands = [
        "git status",
        "git diff",
        "git diff --staged",
        "git log -n 5",
        "git branch -a",
        "git clean -n",
        "git clean --dry-run"
      ];

      for (const cmd of safeGitCommands) {
        const result = guard.evaluate(cmd);
        assert.strictEqual(
          result.isAllowed,
          true,
          `Expected git command to be allowed: "${cmd}"`
        );
      }
    });
  });

  describe("Path Traversal Confinement (regr-mvg9gvu8-bbfd)", () => {
    it("path traversal prevention", () => {
      const badPaths = [
        "../../etc/passwd",
        "../secret_keys.pem",
        "src/../../outside.txt",
        "a/b/c/../../../../etc/shadow",
        "nested/../../../../root"
      ];

      for (const targetPath of badPaths) {

        const resultWithoutRoot = guard.validatePath(targetPath);
        assert.strictEqual(
          resultWithoutRoot.isAllowed,
          false,
          `Expected path traversal to be blocked without root: "${targetPath}"`
        );

        const resultWithRoot = guard.validatePath(targetPath, mockWorkspace);
        assert.strictEqual(
          resultWithRoot.isAllowed,
          false,
          `Expected path traversal to be blocked with root: "${targetPath}"`
        );

        assert.strictEqual(
          guard.checkPath(targetPath, mockWorkspace).isAllowed,
          false
        );
      }
    });

    it("should detect null byte injection attempts", () => {
      const nullByteResult = guard.validatePath("legit_name.ts\0.exe");
      assert.strictEqual(nullByteResult.isAllowed, false);
      assert.strictEqual(nullByteResult.blockedToken, "\\0");
      assert.ok(nullByteResult.reason?.includes("Null byte"));
    });

    it("should reject empty paths", () => {
      assert.strictEqual(guard.validatePath("").isAllowed, false);
      assert.strictEqual(guard.validatePath("   ").isAllowed, false);
      assert.strictEqual(ExecutionGuard.validatePath("").isAllowed, false);
    });
  });

  describe("Path Traversal with Dot-Dot Sequence (regr-mvg9gvu4-tyjt)", () => {
    it("blocks path traversal with ..", () => {
      const dotDotPaths = [
        "..",
        "../",
        "..\\",
        "foo/..",
        "foo/../bar/../../outside.env",
        "./../escape.json"
      ];

      for (const targetPath of dotDotPaths) {
        const result = guard.validatePath(targetPath);
        assert.strictEqual(
          result.isAllowed,
          false,
          `Expected dot-dot traversal to be blocked: "${targetPath}"`
        );
        assert.strictEqual(result.blockedToken, "..");
      }
    });
  });

  describe("Absolute Path Guard (PR #492)", () => {
    it("blocks absolute paths starting with /", () => {
      const absolutePaths = [
        "/etc/passwd",
        "/etc/shadow",
        "/root/.ssh/id_rsa",
        "/var/log/syslog",
        "/bin/sh",
        "/usr/local/bin/node",
        "/home/other_user/data.json"
      ];

      for (const targetPath of absolutePaths) {

        const resultWithoutRoot = guard.validatePath(targetPath);
        assert.strictEqual(
          resultWithoutRoot.isAllowed,
          false,
          `Expected absolute path to be blocked without root: "${targetPath}"`
        );

        const resultWithRoot = guard.validatePath(targetPath, mockWorkspace);
        assert.strictEqual(
          resultWithRoot.isAllowed,
          false,
          `Expected absolute path to be blocked with root: "${targetPath}"`
        );
      }
    });
  });

  describe("Legitimate Workspace Path and Command Operations", () => {
    it("should allow safe standard commands", () => {
      const safeCommands = [
        "npm test",
        "npm run build",
        "node --test dist/tests/unit.test.js",
        "tsc -b",
        "git status",
        "git log -n 5",
        "echo 'all good'"
      ];

      for (const cmd of safeCommands) {
        const result = guard.evaluate(cmd);
        assert.strictEqual(
          result.isAllowed,
          true,
          `Expected safe command to be allowed: "${cmd}"`
        );
      }
    });

    it("should allow legitimate relative paths within workspace", () => {
      const safePaths = [
        "src/index.ts",
        "packages/engine/src/index.ts",
        "docs/taskcade.md",
        "packages/tools/src/security/ExecutionGuard.ts",
        path.join(mockWorkspace, "src/legit.ts")
      ];

      for (const targetPath of safePaths) {
        const result = guard.validatePath(targetPath, mockWorkspace);
        assert.strictEqual(
          result.isAllowed,
          true,
          `Expected path to be allowed: "${targetPath}"`
        );
      }
    });

    it("should support static methods on ExecutionGuard class", () => {
      assert.strictEqual(ExecutionGuard.evaluate("rm -rf /").isAllowed, false);
      assert.strictEqual(ExecutionGuard.evaluate("npm test").isAllowed, true);
      assert.strictEqual(ExecutionGuard.validatePath("/etc/passwd").isAllowed, false);
      assert.strictEqual(ExecutionGuard.checkPath("src/main.ts", mockWorkspace).isAllowed, true);
    });
  });
});
