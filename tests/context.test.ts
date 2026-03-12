import { describe, test, expect } from "bun:test";
import { acquireContext } from "../src/context";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const TEST_ROOT = "/tmp/arena-context-test";

async function setupTestFiles() {
  await rm(TEST_ROOT, { recursive: true, force: true });
  await mkdir(TEST_ROOT, { recursive: true });
  await writeFile(join(TEST_ROOT, "file1.txt"), "content of file 1");
  await writeFile(join(TEST_ROOT, "file2.txt"), "content of file 2");
}

async function cleanupTestFiles() {
  await rm(TEST_ROOT, { recursive: true, force: true });
}

describe("acquireContext", () => {
  describe("raw source", () => {
    test("should return raw code directly", async () => {
      const result = await acquireContext([{ type: "raw", code: "const x = 1;" }]);
      expect(result.content).toBe("const x = 1;");
      expect(result.metadata.source_type).toBe("raw");
      expect(result.metadata.size_bytes).toBe(12);
    });
  });

  describe("file_list source", () => {
    test("should read multiple files", async () => {
      await setupTestFiles();
      const result = await acquireContext([
        { type: "file_list", paths: ["file1.txt", "file2.txt"], root: TEST_ROOT },
      ]);
      expect(result.content).toContain("=== file1.txt ===");
      expect(result.content).toContain("content of file 1");
      expect(result.content).toContain("=== file2.txt ===");
      expect(result.content).toContain("content of file 2");
      expect(result.metadata.file_count).toBe(2);
      await cleanupTestFiles();
    });

    test("should reject absolute paths", async () => {
      await expect(
        acquireContext([{ type: "file_list", paths: ["/etc/passwd"], root: TEST_ROOT }])
      ).rejects.toThrow("Absolute paths not allowed");
    });

    test("should reject path traversal with ..", async () => {
      await expect(
        acquireContext([{ type: "file_list", paths: ["../../../etc/passwd"], root: TEST_ROOT }])
      ).rejects.toThrow("Path escapes workspace");
    });

    test("should throw on non-existent file", async () => {
      await setupTestFiles();
      await expect(
        acquireContext([{ type: "file_list", paths: ["nonexistent.txt"], root: TEST_ROOT }])
      ).rejects.toThrow("Failed to read file");
      await cleanupTestFiles();
    });

    test("should use cwd when root not provided", async () => {
      const result = await acquireContext([{ type: "file_list", paths: ["package.json"] }]);
      expect(result.content).toContain("arena");
    });
  });

  describe("git_ref source", () => {
    test("should fetch git ref content", async () => {
      const result = await acquireContext([{ type: "git_ref", ref: "HEAD" }]);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.metadata.source_type).toBe("git_ref");
    });

    test("should throw on invalid ref", async () => {
      await expect(
        acquireContext([{ type: "git_ref", ref: "nonexistent-ref-xyz" }])
      ).rejects.toThrow("git show failed");
    });
  });

  describe("git_range source", () => {
    test("should fetch git diff", async () => {
      const result = await acquireContext([{ type: "git_range", from: "HEAD~1", to: "HEAD" }]);
      expect(result.metadata.source_type).toBe("git_range");
    });

    test("should throw on invalid range", async () => {
      await expect(
        acquireContext([{ type: "git_range", from: "invalid-ref", to: "HEAD" }])
      ).rejects.toThrow("git diff failed");
    });
  });

  describe("patch_file source", () => {
    test("should read patch file from cwd", async () => {
      await writeFile("test.patch", "diff --git a/file.txt b/file.txt\n+new line");
      const result = await acquireContext([{ type: "patch_file", path: "test.patch" }]);
      expect(result.content).toContain("diff --git");
      expect(result.content).toContain("+new line");
      await rm("test.patch", { force: true });
    });

    test("should reject path traversal", async () => {
      await expect(
        acquireContext([{ type: "patch_file", path: "../../../etc/passwd" }])
      ).rejects.toThrow("Path escapes workspace");
    });
  });

  describe("size limits", () => {
    test("should enforce MAX_CONTEXT_SIZE", async () => {
      const largeCode = "x".repeat(2_000_000); // 2MB
      await expect(
        acquireContext([{ type: "raw", code: largeCode }])
      ).rejects.toThrow("Context size");
    });

    test("should accumulate size across multiple sources", async () => {
      const code1 = "x".repeat(600_000);
      const code2 = "y".repeat(600_000);
      await expect(
        acquireContext([{ type: "raw", code: code1 }, { type: "raw", code: code2 }])
      ).rejects.toThrow("Context size");
    });
  });

  describe("multiple sources", () => {
    test("should combine multiple sources with separator", async () => {
      const result = await acquireContext([
        { type: "raw", code: "part1" },
        { type: "raw", code: "part2" },
      ]);
      expect(result.content).toBe("part1\n\npart2");
      expect(result.metadata.source_type).toBe("raw+raw");
    });
  });
});
