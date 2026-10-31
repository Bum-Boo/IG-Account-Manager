import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPluginRegistration } from "@ig-manager/domain";
import { createDatabase, createRepositories, runMigrations, type DatabaseHandle } from "@ig-manager/db";
import { createApiServer } from "./server.js";

const auth = {
  authorization: "Bearer test-token"
};

describe("api server", () => {
  let handle: DatabaseHandle;
  let server: ReturnType<typeof createApiServer>;

  beforeEach(() => {
    handle = createDatabase();
    runMigrations(handle.client);

    const repositories = createRepositories(handle.db);
    repositories.plugins.create(
      createPluginRegistration({
        id: "plugin_test_publisher",
        pluginId: "test.publisher",
        name: "Test Publisher",
        version: "0.1.0",
        type: "publisher",
        enabled: true,
        officialApiOnly: true,
        capabilities: ["publish"],
        permissions: ["candidate:read", "publish:approved"],
        metadata: {
          publicLabel: "safe",
          token: "should-not-leak"
        },
        createdAt: "2026-05-31T00:00:00.000Z",
        updatedAt: "2026-05-31T00:00:00.000Z"
      })
    );

    server = createApiServer({
      logger: false,
      databaseHandle: handle,
      applyMigrations: false,
      closeDatabaseOnClose: true,
      apiToken: "test-token",
      actorId: "api-test"
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it("returns health status without authentication", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "api"
    });
  });

  it("requires the local token for core routes", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/accounts"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "unauthorized",
        message: "Missing or invalid local API token."
      }
    });
  });

  it("runs the main content workflow routes", async () => {
    const account = await injectJson("POST", "/accounts", {
      id: "account_api",
      platform: {
        id: "local",
        displayName: "Local Platform"
      },
      handle: "api_account",
      status: "connected",
      schedulePolicy: {
        timezone: "UTC",
        minLeadTimeMinutes: 0,
        allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
        allowedTimeWindows: [{ start: "00:00", end: "23:59" }]
      }
    });

    expect(account.statusCode).toBe(201);
    expect(account.body.data.id).toBe("account_api");

    const accounts = await injectJson("GET", "/accounts");
    expect(accounts.body.data.map((item: { id: string }) => item.id)).toEqual(["account_api"]);

    const concept = await injectJson("POST", "/concepts", {
      id: "concept_api",
      accountId: "account_api",
      name: "API Concept",
      description: "Concept created through the local API.",
      audience: "Operators",
      pillars: ["workflow"],
      voice: "Direct"
    });
    expect(concept.statusCode).toBe(201);

    const updatedConcept = await injectJson("PUT", "/concepts/concept_api", {
      voice: "Direct and calm"
    });
    expect(updatedConcept.body.data.voice).toBe("Direct and calm");

    const accountConcepts = await injectJson("GET", "/accounts/account_api/concepts");
    expect(accountConcepts.body.data.map((item: { id: string }) => item.id)).toEqual(["concept_api"]);

    const asset = await injectJson("POST", "/assets", {
      id: "asset_api",
      type: "image",
      uri: "file://assets/api.png",
      title: "API Asset",
      accountIds: ["account_api"],
      conceptIds: ["concept_api"],
      rights: { usage: "owned" }
    });
    expect(asset.statusCode).toBe(201);

    const assets = await injectJson("GET", "/assets?conceptId=concept_api");
    expect(assets.body.data.map((item: { id: string }) => item.id)).toEqual(["asset_api"]);

    const recipe = await injectJson("POST", "/recipes", {
      id: "recipe_api",
      conceptId: "concept_api",
      name: "API Recipe",
      summary: "A local API recipe.",
      contentPillars: ["workflow"],
      format: "feed_image",
      instructions: ["Create the candidate."]
    });
    expect(recipe.statusCode).toBe(201);

    const recipes = await injectJson("GET", "/recipes?conceptId=concept_api");
    expect(recipes.body.data.map((item: { id: string }) => item.id)).toEqual(["recipe_api"]);

    const candidate = await injectJson("POST", "/candidates", {
      id: "candidate_api",
      accountId: "account_api",
      conceptId: "concept_api",
      recipeId: "recipe_api",
      assetIds: ["asset_api"],
      status: "ready_for_review",
      format: "feed_image",
      caption: "A candidate created through the local API."
    });
    expect(candidate.statusCode).toBe(201);
    expect(candidate.body.data.status).toBe("ready_for_review");

    const approved = await injectJson("POST", "/candidates/candidate_api/approve", {});
    expect(approved.body.data.status).toBe("approved");

    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduled = await injectJson("POST", "/candidates/candidate_api/schedule", {
      scheduledAt,
      publisherPluginId: "plugin_test_publisher",
      publishJobId: "job_api"
    });
    expect(scheduled.body.data.candidate.status).toBe("scheduled");
    expect(scheduled.body.data.publishJob.id).toBe("job_api");

    const candidates = await injectJson("GET", "/candidates?status=scheduled");
    expect(candidates.body.data.map((item: { id: string }) => item.id)).toEqual(["candidate_api"]);

    const jobs = await injectJson("GET", "/publish-jobs");
    expect(jobs.body.data.map((item: { id: string }) => item.id)).toEqual(["job_api"]);

    const auditLogs = await injectJson("GET", "/audit-logs?entityType=candidate&entityId=candidate_api");
    expect(auditLogs.body.data.map((item: { action: string }) => item.action)).toEqual([
      "candidate.created",
      "candidate.approved",
      "candidate.scheduled"
    ]);
  });

  it("refuses to seed a workspace that already has data", async () => {
    await injectJson("POST", "/accounts", {
      id: "account_existing",
      platform: { id: "local", displayName: "Local Platform" },
      handle: "existing"
    });

    const seeded = await injectJson("POST", "/workspace/seed", {});

    expect(seeded.statusCode).toBe(409);
    expect(seeded.body.error.code).toBe("workspace_not_empty");
    const accounts = await injectJson("GET", "/accounts");
    expect(accounts.body.data.map((item: { id: string }) => item.id)).toEqual(["account_existing"]);
  });

  it("hands run and retry requests to the worker instead of leaving jobs running", async () => {
    await injectJson("POST", "/workspace/seed", {});
    await injectJson("POST", "/candidates/candidate_starter_morning/approve", {});
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await injectJson("POST", "/candidates/candidate_starter_morning/schedule", {
      scheduledAt,
      publisherPluginId: "plugin_starter_mock_publisher",
      publishJobId: "job_run"
    });

    const run = await injectJson("POST", "/publish-jobs/job_run/run", {});
    expect(run.statusCode).toBe(200);
    expect(run.body.data.status).toBe("queued");
    expect(Date.parse(run.body.data.scheduledAt)).toBeLessThanOrEqual(Date.now());
    expect(run.body.data.metadata.runRequest.requestedBy).toBe("api-test");

    const repositories = createRepositories(handle.db);
    const job = repositories.publishJobs.getById("job_run")!;
    repositories.publishJobs.update({
      ...job,
      status: "retry_scheduled",
      attempt: 1,
      retryAfter: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      metadata: {}
    });

    const retried = await injectJson("POST", "/publish-jobs/job_run/retry", {});
    // Regression: retry used to return status "running" with no worker attempt behind it.
    expect(retried.statusCode).toBe(200);
    expect(retried.body.data.status).toBe("retry_scheduled");
    expect(retried.body.data.attempt).toBe(1);
    expect(Date.parse(retried.body.data.retryAfter)).toBeLessThanOrEqual(Date.now());

    const due = await injectJson("GET", `/publish-jobs?dueBefore=${encodeURIComponent(new Date().toISOString())}`);
    expect(due.body.data.map((item: { id: string }) => item.id)).toEqual(["job_run"]);

    const succeeded = repositories.publishJobs.getById("job_run")!;
    repositories.publishJobs.update({ ...succeeded, status: "succeeded", finishedAt: new Date().toISOString() });
    const refused = await injectJson("POST", "/publish-jobs/job_run/run", {});
    expect(refused.statusCode).toBe(409);
  });

  it("lists and toggles plugins without leaking secrets", async () => {
    const plugins = await injectJson("GET", "/plugins");

    expect(plugins.statusCode).toBe(200);
    expect(plugins.body.data[0].metadata).toEqual({ publicLabel: "safe" });

    const disabled = await injectJson("POST", "/plugins/plugin_test_publisher/disable");
    expect(disabled.body.data.enabled).toBe(false);

    const enabled = await injectJson("POST", "/plugins/plugin_test_publisher/enable");
    expect(enabled.body.data.enabled).toBe(true);
  });

  async function injectJson(method: "GET" | "POST" | "PUT", url: string, payload?: object) {
    const response = await server.inject({
      method,
      url,
      headers: auth,
      payload
    });

    return {
      statusCode: response.statusCode,
      body: response.json()
    };
  }
});

describe("api workspace seeding and review loop", () => {
  let server: ReturnType<typeof createApiServer>;

  beforeEach(() => {
    server = createApiServer({ logger: false, apiToken: "test-token", actorId: "reviewer" });
  });

  afterEach(async () => {
    await server.close();
  });

  it("seeds an empty workspace and runs prepare, review and schedule through the API", async () => {
    const empty = await call("GET", "/accounts");
    expect(empty.body.data).toEqual([]);

    const seeded = await call("POST", "/workspace/seed", {});
    expect(seeded.statusCode).toBe(201);
    expect(seeded.body.data).toMatchObject({ seed: "starter-v1", accounts: 1, publishers: 1 });

    const prepared = await call("POST", "/candidates", {
      accountId: "account_starter_studio",
      conceptId: "concept_starter_palette",
      status: "ready_for_review",
      format: "feed_image",
      caption: "Prepared from the dashboard form."
    });
    expect(prepared.statusCode).toBe(201);

    const approved = await call("POST", "/candidates/candidate_starter_morning/approve", {});
    expect(approved.body.data.status).toBe("approved");
    const rejected = await call("POST", "/candidates/candidate_starter_evening/reject", { reason: "Too similar to the morning post." });
    expect(rejected.body.data.status).toBe("rejected");

    const scheduled = await call("POST", "/candidates/candidate_starter_morning/schedule", {
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      publisherPluginId: "plugin_starter_mock_publisher"
    });
    expect(scheduled.statusCode).toBe(200);
    expect(scheduled.body.data.publishJob.status).toBe("queued");

    const audit = await call("GET", "/audit-logs");
    expect(audit.body.data.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining(["workspace.seeded", "candidate.created", "candidate.approved", "candidate.rejected", "candidate.scheduled"])
    );
  });

  async function call(method: "GET" | "POST", url: string, payload?: object) {
    const response = await server.inject({ method, url, headers: { authorization: "Bearer test-token" }, payload });
    return { statusCode: response.statusCode, body: response.json() };
  }
});
