import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { defaultDatabaseFilename, resolveDatabaseFilename } from "./paths.js";

const workspaceRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

describe("database paths", () => {
  it("anchors the default database to the workspace root instead of the package cwd", () => {
    const filename = defaultDatabaseFilename();

    expect(isAbsolute(filename)).toBe(true);
    expect(filename).toBe(join(workspaceRoot, "data", "ig-manager.sqlite"));
  });

  it("keeps the default identical regardless of the process cwd", () => {
    const original = process.cwd();
    const first = defaultDatabaseFilename();

    try {
      process.chdir(join(workspaceRoot, "packages"));
      expect(defaultDatabaseFilename()).toBe(first);
    } finally {
      process.chdir(original);
    }
  });

  it("resolves memory, file URLs and relative paths", () => {
    expect(resolveDatabaseFilename(":memory:")).toBe(":memory:");
    expect(resolveDatabaseFilename("file:///tmp/ig.sqlite")).toBe("/tmp/ig.sqlite");
    expect(resolveDatabaseFilename("./x.sqlite")).toBe(resolve("./x.sqlite"));
  });
});
