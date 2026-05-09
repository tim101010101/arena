import { describe, test, expect } from "bun:test";
import { VERSION } from "../src/version";
import packageJson from "../package.json";

describe("VERSION", () => {
  test("should match package.json version", () => {
    expect(VERSION).toBe(packageJson.version);
  });

  test("should be a semver-shaped string", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
