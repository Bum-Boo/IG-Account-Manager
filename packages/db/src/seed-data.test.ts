import { describe, expect, it } from "vitest";
import { createDatabase } from "./database.js";
import { runMigrations } from "./migrations.js";
import { createRepositories } from "./repositories/index.js";
import { STARTER_SEED_VERSION, WorkspaceNotEmptyError, seedStarterWorkspace } from "./seed-data.js";

describe("starter seed", () => {
  it("writes a reviewable, clearly marked starter workspace into an empty database", () => {
    const handle = createDatabase();
    runMigrations(handle.client);

    seedStarterWorkspace(handle, { now: "2026-10-31T00:00:00.000Z" });
    const repos = createRepositories(handle.db);

    const accounts = repos.accounts.list();
    const candidates = repos.candidates.list();
    const publishers = repos.plugins.list().filter((plugin) => plugin.type === "publisher" && plugin.enabled);

    expect(accounts).toHaveLength(1);
    expect(candidates.filter((candidate) => candidate.status === "ready_for_review").length).toBeGreaterThanOrEqual(2);
    expect(publishers.map((plugin) => plugin.pluginId)).toEqual(["official.mock-publisher"]);
    expect(repos.publishJobs.list()).toEqual([]);
    for (const record of [...accounts, ...candidates, ...repos.concepts.getByAccount("account_starter_studio"), ...repos.assets.list()]) {
      expect(record.metadata.seed).toBe(STARTER_SEED_VERSION);
    }
    expect(repos.auditLogs.list().map((entry) => entry.action)).toEqual(["workspace.seeded"]);
    handle.close();
  });

  it("refuses to seed a workspace that already has accounts and leaves it unchanged", () => {
    const handle = createDatabase();
    runMigrations(handle.client);
    seedStarterWorkspace(handle);
    const repos = createRepositories(handle.db);
    const before = repos.candidates.list().length;

    expect(() => seedStarterWorkspace(handle)).toThrow(WorkspaceNotEmptyError);
    expect(repos.candidates.list()).toHaveLength(before);
    handle.close();
  });

  it("contains no real credentials or production endpoints", () => {
    const handle = createDatabase();
    runMigrations(handle.client);
    const seed = seedStarterWorkspace(handle);
    const serialized = JSON.stringify(seed);

    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/token|secret|password/i);
    handle.close();
  });
});
