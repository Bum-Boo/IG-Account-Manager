import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createAccount,
  createAuditLog,
  createConcept,
  createContentAsset,
  createContentRecipe,
  createPluginRegistration,
  createPostCandidate,
  createPublishJob
} from "@ig-manager/domain";
import { createDatabase, type DatabaseHandle } from "./database.js";
import { runMigrations } from "./migrations.js";
import { createRepositories } from "./repositories/index.js";
import { createDemoData } from "./demo-data.js";

type Repositories = ReturnType<typeof createRepositories>;

describe("repositories", () => {
  let handle: DatabaseHandle;
  let repos: Repositories;

  beforeEach(() => {
    handle = createDatabase();
    runMigrations(handle.client);
    repos = createRepositories(handle.db);
    seed(repos);
  });

  afterEach(() => {
    handle.close();
  });

  it("performs account CRUD", () => {
    const account = createAccount({
      id: "account_crud",
      platform: { id: "mastodon", displayName: "Mastodon", metadata: {} },
      handle: "ops",
      displayName: "Ops",
      status: "draft",
      createdAt: "2026-05-31T00:00:00.000Z",
      updatedAt: "2026-05-31T00:00:00.000Z"
    });

    repos.accounts.create(account);
    expect(repos.accounts.getById(account.id)?.handle).toBe("ops");

    repos.accounts.update({ ...account, displayName: "Ops Updated" });
    expect(repos.accounts.getById(account.id)?.displayName).toBe("Ops Updated");

    repos.accounts.delete(account.id);
    expect(repos.accounts.getById(account.id)).toBeUndefined();
  });

  it("gets concepts by account", () => {
    const concepts = repos.concepts.getByAccount("account_studio");

    expect(concepts.map((concept) => concept.id)).toEqual([
      "concept_assets",
      "concept_workflow"
    ]);
  });

  it("performs concept, asset, recipe, candidate, plugin, job, and audit CRUD paths", () => {
    const concept = createConcept({
      id: "concept_crud",
      accountId: "account_studio",
      name: "CRUD Concept",
      description: "CRUD coverage concept.",
      audience: "Test operators.",
      pillars: ["testing"],
      voice: "Precise.",
      createdAt: "2026-05-31T00:00:00.000Z",
      updatedAt: "2026-05-31T00:00:00.000Z"
    });
    repos.concepts.create(concept);
    repos.concepts.update({ ...concept, name: "CRUD Concept Updated" });
    expect(repos.concepts.getById(concept.id)?.name).toBe("CRUD Concept Updated");

    const asset = createContentAsset({
      id: "asset_crud",
      type: "image",
      uri: "file://assets/crud.png",
      title: "CRUD Asset",
      accountIds: ["account_studio"],
      conceptIds: [concept.id],
      importedAt: "2026-05-31T00:00:00.000Z",
      createdAt: "2026-05-31T00:00:00.000Z",
      updatedAt: "2026-05-31T00:00:00.000Z"
    });
    repos.assets.create(asset);
    repos.assets.update({ ...asset, title: "CRUD Asset Updated" });
    expect(repos.assets.getById(asset.id)?.title).toBe("CRUD Asset Updated");

    const recipe = createContentRecipe({
      id: "recipe_crud",
      conceptId: concept.id,
      name: "CRUD Recipe",
      summary: "CRUD recipe.",
      contentPillars: ["testing"],
      format: "feed_image",
      instructions: ["Write the test."],
      createdAt: "2026-05-31T00:00:00.000Z",
      updatedAt: "2026-05-31T00:00:00.000Z"
    });
    repos.recipes.create(recipe);
    repos.recipes.update({ ...recipe, name: "CRUD Recipe Updated" });
    expect(repos.recipes.getById(recipe.id)?.name).toBe("CRUD Recipe Updated");

    const candidate = createPostCandidate({
      id: "candidate_crud",
      accountId: "account_studio",
      conceptId: concept.id,
      recipeId: recipe.id,
      assetIds: [asset.id],
      status: "draft",
      format: "feed_image",
      caption: "CRUD candidate.",
      createdAt: "2026-05-31T00:00:00.000Z",
      updatedAt: "2026-05-31T00:00:00.000Z"
    });
    repos.candidates.create(candidate);
    repos.candidates.update({ ...candidate, status: "ready_for_review" });
    expect(repos.candidates.getById(candidate.id)?.status).toBe("ready_for_review");

    const plugin = createPluginRegistration({
      id: "plugin_crud",
      pluginId: "crud.publisher",
      name: "CRUD Publisher",
      version: "0.1.0",
      type: "publisher",
      enabled: true,
      officialApiOnly: true,
      permissions: ["publish:approved"],
      capabilities: ["publish"],
      createdAt: "2026-05-31T00:00:00.000Z",
      updatedAt: "2026-05-31T00:00:00.000Z"
    });
    repos.plugins.create(plugin);
    repos.plugins.update({ ...plugin, enabled: false });
    expect(repos.plugins.getById(plugin.id)?.enabled).toBe(false);

    const job = createPublishJob({
      id: "job_crud",
      accountId: "account_studio",
      candidateId: candidate.id,
      pluginRegistrationId: plugin.id,
      scheduledAt: "2026-06-01T10:00:00.000Z",
      createdAt: "2026-05-31T00:00:00.000Z",
      updatedAt: "2026-05-31T00:00:00.000Z"
    });
    repos.publishJobs.create(job);
    repos.publishJobs.update({ ...job, status: "canceled" });
    expect(repos.publishJobs.getById(job.id)?.status).toBe("canceled");

    const auditLog = createAuditLog({
      id: "audit_crud",
      action: "crud.test",
      entityType: "candidate",
      entityId: candidate.id,
      createdAt: "2026-05-31T00:00:00.000Z"
    });
    repos.auditLogs.append(auditLog);
    expect(repos.auditLogs.getById(auditLog.id)?.action).toBe("crud.test");

    repos.publishJobs.delete(job.id);
    repos.plugins.delete(plugin.id);
    repos.candidates.delete(candidate.id);
    repos.recipes.delete(recipe.id);
    repos.assets.delete(asset.id);
    repos.concepts.delete(concept.id);

    expect(repos.concepts.getById(concept.id)).toBeUndefined();
  });

  it("gets candidates by status", () => {
    const candidates = repos.candidates.getByStatus("ready_for_review");

    expect(candidates.map((candidate) => candidate.id)).toEqual(["candidate_workflow_ready"]);
  });

  it("gets scheduled jobs due before a timestamp", () => {
    const retryJob = createPublishJob({
      id: "job_retry_due",
      candidateId: "candidate_workflow_scheduled",
      accountId: "account_studio",
      pluginRegistrationId: "plugin_official_publisher",
      status: "retry_scheduled",
      scheduledAt: "2026-06-01T09:00:00.000Z",
      retryAfter: "2026-06-01T10:15:00.000Z",
      attempt: 1,
      maxAttempts: 3,
      createdAt: "2026-05-31T00:00:00.000Z",
      updatedAt: "2026-05-31T00:00:00.000Z"
    });
    repos.publishJobs.create(retryJob);

    const due = repos.publishJobs.getScheduledJobsDueBefore("2026-06-01T10:30:00.000Z");

    expect(due.map((job) => job.id)).toEqual(["job_retry_due", "job_due"]);
  });

  it.each(["running", "succeeded"] as const)("does not automatically requeue a %s job", (status) => {
    const job = repos.publishJobs.getById("job_due");
    if (!job) throw new Error("Expected the seeded due job");
    repos.publishJobs.update({ ...job, status });

    const due = repos.publishJobs.getScheduledJobsDueBefore("2027-01-01T00:00:00.000Z");

    expect(due.map((entry) => entry.id)).not.toContain(job.id);
    expect(repos.publishJobs.getById(job.id)?.status).toBe(status);
  });

  it("updates a publish job only if it is unchanged since it was read", () => {
    const job = repos.publishJobs.getById("job_due")!;
    const running = { ...job, status: "running" as const, attempt: 1, updatedAt: "2026-06-01T10:00:01.000Z" };

    expect(repos.publishJobs.updateIfUnchanged(running, job)).toBe(true);
    // A second writer holding the same stale snapshot must not win.
    expect(repos.publishJobs.updateIfUnchanged({ ...job, metadata: { stale: true } }, job)).toBe(false);
    expect(repos.publishJobs.getById("job_due")).toMatchObject({ status: "running", attempt: 1 });
  });

  it("gets assets compatible with a concept", () => {
    const assets = repos.assets.getAssetsCompatibleWithConcept("concept_workflow");

    expect(assets.map((asset) => asset.id)).toEqual([
      "asset_studio_template",
      "asset_workflow_board"
    ]);
  });

  it("gets enabled plugins by type without leaking secrets", () => {
    const plugins = repos.plugins.getEnabledByType("publisher");

    expect(plugins).toHaveLength(1);
    expect(plugins[0]?.id).toBe("plugin_official_publisher");
    expect(plugins[0]?.metadata).toEqual({ publicLabel: "demo" });
    expect(plugins[0]?.permissions).toEqual([
      "account:read",
      "candidate:read",
      "publish:approved"
    ]);
  });

  it("appends audit log entries", () => {
    const entry = createAuditLog({
      id: "audit_candidate_reviewed",
      action: "candidate.reviewed",
      actorId: "reviewer",
      entityType: "candidate",
      entityId: "candidate_workflow_ready",
      metadata: { decision: "changes_requested" },
      createdAt: "2026-05-31T02:00:00.000Z"
    });

    repos.auditLogs.append(entry);
    const entries = repos.auditLogs.listForEntity("candidate", "candidate_workflow_ready");

    expect(entries.map((auditLog) => auditLog.id)).toEqual(["audit_candidate_reviewed"]);
  });
});

function seed(repos: Repositories): void {
  const demo = createDemoData();

  for (const account of demo.accounts) repos.accounts.create(account);
  for (const concept of demo.concepts) repos.concepts.create(concept);
  for (const asset of demo.assets) repos.assets.create(asset);
  for (const recipe of demo.recipes) repos.recipes.create(recipe);
  for (const candidate of demo.candidates) repos.candidates.create(candidate);
  for (const plugin of demo.plugins) repos.plugins.create(plugin);
  for (const publishJob of demo.publishJobs) repos.publishJobs.create(publishJob);
  for (const auditLog of demo.auditLogs) repos.auditLogs.append(auditLog);
}
