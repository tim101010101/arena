import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { agentEnv, withTimeout, makeTempFile, cleanupTempFile, whichBinary, readStderr, spawnProcess } from "../src/utils";
import { unlink, access } from "node:fs/promises";

describe("agentEnv", () => {
  test("should inherit full process.env", () => {
    const env = agentEnv();
    expect(env.PATH).toBe(process.env.PATH);
    expect(env.HOME).toBe(process.env.HOME);
  });

  test("should inject DISABLE_AUTOUPDATER", () => {
    const env = agentEnv();
    expect(env.DISABLE_AUTOUPDATER).toBe("1");
  });

  test("should preserve custom env vars", () => {
    process.env.TEST_CUSTOM_VAR = "test_value";
    const env = agentEnv();
    expect(env.TEST_CUSTOM_VAR).toBe("test_value");
    delete process.env.TEST_CUSTOM_VAR;
  });
});

describe("withTimeout", () => {
  test("should resolve when promise completes before timeout", async () => {
    const promise = Promise.resolve("success");
    const result = await withTimeout(promise, 1000, "test");
    expect(result).toBe("success");
  });

  test("should reject when promise exceeds timeout", async () => {
    const promise = new Promise((resolve) => setTimeout(resolve, 200));
    await expect(withTimeout(promise, 50, "test")).rejects.toThrow("test timed out after 50ms");
  });

  test("should reject with original error if promise fails before timeout", async () => {
    const promise = Promise.reject(new Error("original error"));
    await expect(withTimeout(promise, 1000, "test")).rejects.toThrow("original error");
  });
});

describe("makeTempFile and cleanupTempFile", () => {
  let tempFile: string;

  afterEach(async () => {
    if (tempFile) await cleanupTempFile(tempFile);
  });

  test("should create temp file path with prefix", async () => {
    tempFile = await makeTempFile("test-prefix");
    expect(tempFile).toContain("arena-test-prefix-");
    expect(tempFile).toContain("output-");
  });

  test("should create unique paths on multiple calls", async () => {
    const file1 = await makeTempFile("test");
    const file2 = await makeTempFile("test");
    expect(file1).not.toBe(file2);
    await cleanupTempFile(file1);
    await cleanupTempFile(file2);
  });

  test("cleanupTempFile should not throw on non-existent file", async () => {
    await expect(cleanupTempFile("/nonexistent/path")).resolves.toBeUndefined();
  });
});

describe("whichBinary", () => {
  test("should return true for existing binary", async () => {
    const result = await whichBinary("ls");
    expect(result).toBe(true);
  });

  test("should return false for non-existent binary", async () => {
    const result = await whichBinary("nonexistent-binary-xyz");
    expect(result).toBe(false);
  });
});

describe("readStderr", () => {
  test("should read stderr stream", async () => {
    const proc = spawnProcess(["sh", "-c", "echo 'error message' >&2"], {
      stderr: "pipe",
      stdout: "ignore",
    });
    const stderr = await readStderr(proc);
    expect(stderr).toContain("error message");
  });

  test("should return empty string for empty stderr", async () => {
    const proc = spawnProcess(["echo", "test"], {
      stderr: "pipe",
      stdout: "ignore",
    });
    const stderr = await readStderr(proc);
    expect(stderr).toBe("");
  });
});
