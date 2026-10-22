import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SystemToolScanner,
  MONITORED_SYSTEM_TOOLS,
} from "../hardware/SystemToolScanner.js";

describe("SystemToolScanner Diagnostic & Discovery Tests", () => {
  it("should discover docker when in PATH", async () => {
    const customExec = async (file: string, args: string[]) => {
      if (file === "which" && args[0] === "docker") {
        return { stdout: "/usr/bin/docker\n", stderr: "" };
      }
      if (file === "docker") {
        return { stdout: "Docker version 24.0.5, build ced0996\n", stderr: "" };
      }
      throw new Error(`Command not found: ${file} ${args.join(" ")}`);
    };

    const scanner = new SystemToolScanner(undefined, customExec);
    const result = await scanner.findTool("docker");

    assert.ok(result, "Expected docker to be found in PATH");
    assert.strictEqual(result.binaryName, "docker");
    assert.strictEqual(result.installed, true);
  });

  it("should discover ollama when in PATH", async () => {
    const customExec = async (file: string, args: string[]) => {
      if (file === "which" && args[0] === "ollama") {
        return { stdout: "/usr/local/bin/ollama\n", stderr: "" };
      }
      if (file === "ollama") {
        return { stdout: "ollama version is 0.3.14\n", stderr: "" };
      }
      throw new Error(`Command not found: ${file} ${args.join(" ")}`);
    };

    const scanner = new SystemToolScanner(undefined, customExec);
    const result = await scanner.findTool("ollama");

    assert.ok(result, "Expected ollama to be found in PATH");
    assert.strictEqual(result.binaryName, "ollama");
    assert.strictEqual(result.installed, true);
  });

  it("should return undefined if tool is not in PATH", async () => {
    const customExec = async () => {
      throw new Error("Command not found");
    };

    const scanner = new SystemToolScanner(undefined, customExec);
    const result = await scanner.findTool("non_existent_tool");

    assert.strictEqual(result, undefined);
  });

  it("should handle missing binaries in system PATH", async () => {
    const customExec = async (file: string, args: string[]) => {
      if (file === "which" && args[0] === "sensors") {
        return { stdout: "/usr/bin/sensors\n", stderr: "" };
      }
      throw new Error("not found");
    };

    const scanner = new SystemToolScanner(undefined, customExec);
    const missingResult = await scanner.findTool("radeontop");
    assert.strictEqual(missingResult, undefined);

    const foundResult = await scanner.findTool("sensors");
    assert.ok(foundResult);
    assert.strictEqual(foundResult.installed, true);
  });

  it("should handle empty system PATH", async () => {
    const customExec = async () => {
      throw new Error("which: command not found (PATH is empty)");
    };

    const scanner = new SystemToolScanner(undefined, customExec);
    const result = await scanner.findTool("");

    assert.strictEqual(result, undefined);
  });

  it("should handle tool names with spaces", async () => {
    const scanner = new SystemToolScanner();
    await assert.rejects(
      async () => {
        await scanner.findTool("invalid binary with spaces");
      },
      {
        name: "Error",
        message: /Invalid binary name/,
      },
    );
  });

  it("should return correct tool status when installed", async () => {
    const customExec = async (file: string, args: string[]) => {
      if (file === "which" && args[0] === "radeontop") {
        return { stdout: "/usr/bin/radeontop\n", stderr: "" };
      }
      if (file === "radeontop") {
        return { stdout: "radeontop 1.4\n", stderr: "" };
      }
      throw new Error("not found");
    };

    const scanner = new SystemToolScanner(undefined, customExec);
    const def = MONITORED_SYSTEM_TOOLS.find((t) => t.binaryName === "radeontop");
    assert.ok(def);

    const status = await scanner.checkTool(def);
    assert.strictEqual(status.installed, true);
    assert.strictEqual(status.binaryName, "radeontop");
  });

  it("should return correct tool status when not installed", async () => {
    const customExec = async () => {
      throw new Error("not found");
    };

    const scanner = new SystemToolScanner(undefined, customExec);
    const def = MONITORED_SYSTEM_TOOLS.find((t) => t.binaryName === "radeontop");
    assert.ok(def);

    const status = await scanner.checkTool(def);
    assert.strictEqual(status.installed, false);
    assert.strictEqual(status.binaryName, "radeontop");
  });

  it("should scan all monitored system tools and build unified install command", async () => {
    const customExec = async (file: string, args: string[]) => {
      if (file === "which" && args[0] === "sensors") {
        return { stdout: "/usr/bin/sensors\n", stderr: "" };
      }
      throw new Error("not found");
    };

    const scanner = new SystemToolScanner(undefined, customExec);
    const report = await scanner.scan();

    assert.strictEqual(report.allRequiredInstalled, false);
    assert.ok(report.missingTools.length > 0);
    assert.ok(report.unifiedInstallCommand.includes("sudo apt update && sudo apt install -y"));
    assert.ok(report.tools.some((t) => t.binaryName === "sensors" && t.installed));
  });
});
