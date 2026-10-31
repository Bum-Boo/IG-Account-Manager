import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// This module lives at packages/db/{src,dist}/paths.*, so the workspace root is
// three directories up in both source (tsx) and compiled (node dist) layouts.
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * Default SQLite file shared by the API, the worker and the seed/migrate scripts.
 *
 * pnpm runs each package script from that package's own directory, so a
 * cwd-relative default such as `./data/ig-manager.sqlite` gave the API and the
 * worker two different databases. Anchoring the default to the workspace root
 * keeps every local process on the same workspace file.
 */
export function defaultDatabaseFilename(): string {
  return resolve(workspaceRoot, "data", "ig-manager.sqlite");
}

/** Resolves `:memory:`, `file:` URLs and paths (relative paths use the current directory). */
export function resolveDatabaseFilename(databaseUrl: string): string {
  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  if (databaseUrl.startsWith("file:")) {
    return fileURLToPath(databaseUrl);
  }

  return resolve(databaseUrl);
}

export function ensureDatabaseDirectory(filename: string): void {
  if (filename === ":memory:") {
    return;
  }

  const directory = dirname(filename);

  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}
