import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createContentAsset, createPluginRegistration, createPostCandidate } from "@ig-manager/domain";
import { createDatabase, createRepositories, runMigrations, type DatabaseHandle } from "@ig-manager/db";
import type { FetchLike } from "@ig-manager/instagram-integration";
import type { CandidateGenerationProvider } from "./generation.js";
import { createApiServer } from "./server.js";

const auth = {
  authorization: "Bearer test-token"
};

describe("api server", () => {
  let handle: DatabaseHandle;
  let server: ReturnType<typeof createApiServer>;
  let generationProvider: CandidateGenerationProvider | undefined;
  let repositories: ReturnType<typeof createRepositories>;
  let instagramFetch: FetchLike | undefined;

  beforeEach(() => {
    handle = createDatabase();
    runMigrations(handle.client);

    repositories = createRepositories(handle.db);
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

    generationProvider = undefined;
    instagramFetch = undefined;
    server = createApiServer({
      logger: false,
      databaseHandle: handle,
      applyMigrations: false,
      closeDatabaseOnClose: true,
      apiToken: "test-token",
      actorId: "api-test",
      env: {
        INSTAGRAM_APP_ID: "app-id",
        INSTAGRAM_APP_SECRET: "app-secret",
        INSTAGRAM_REDIRECT_URI: "http://localhost:3001/instagram/oauth/callback",
        INSTAGRAM_GRAPH_API_BASE_URL: "https://graph.example",
        INSTAGRAM_GRAPH_API_VERSION: "v99.0",
        INSTAGRAM_REQUIRED_SCOPES: "pages_show_list,instagram_basic,instagram_content_publish",
        INSTAGRAM_PUBLISH_MODE: "mock",
        IG_MANAGER_WEB_BASE_URL: "http://localhost:5173",
        IG_MANAGER_TOKEN_VAULT_KEY: Buffer.alloc(32, 8).toString("base64")
      },
      instagramFetch: (url, init) => {
        if (!instagramFetch) {
          throw new Error(`Unexpected Instagram fetch: ${url}`);
        }

        return instagramFetch(url, init);
      },
      candidateGenerationProvider: {
        generateCandidate: (input) => {
          if (!generationProvider) {
            throw new Error("Test generation provider was not configured.");
          }

          return generationProvider.generateCandidate(input);
        }
      }
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

  it("lists and toggles plugins without leaking secrets", async () => {
    const plugins = await injectJson("GET", "/plugins");

    expect(plugins.statusCode).toBe(200);
    expect(plugins.body.data[0].metadata).toEqual({ publicLabel: "safe" });

    const disabled = await injectJson("POST", "/plugins/plugin_test_publisher/disable");
    expect(disabled.body.data.enabled).toBe(false);

    const enabled = await injectJson("POST", "/plugins/plugin_test_publisher/enable");
    expect(enabled.body.data.enabled).toBe(true);
  });

  it("connects an Instagram account through guarded OAuth routes without leaking tokens", async () => {
    await injectJson("POST", "/accounts", {
      id: "account_instagram_api",
      platform: {
        id: "local",
        displayName: "Local Platform"
      },
      handle: "local_account"
    });
    instagramFetch = queueInstagramFetch([
      { access_token: "short-token", token_type: "bearer", expires_in: 100 },
      { access_token: "long-token", token_type: "bearer", expires_in: 5000 },
      {
        data: [
          {
            id: "page_1",
            name: "Studio Page",
            access_token: "page-token",
            instagram_business_account: { id: "ig_api_1", username: "api_studio", name: "API Studio" }
          }
        ]
      }
    ]);

    const started = await injectJson("POST", "/accounts/account_instagram_api/instagram/connect", {});
    expect(started.statusCode).toBe(201);
    const state = new URL(started.body.data.authorizationUrl).searchParams.get("state");

    const callback = await server.inject({
      method: "GET",
      url: `/instagram/oauth/callback?state=${encodeURIComponent(state ?? "")}&code=oauth_code`
    });
    const status = await injectJson("GET", "/accounts/account_instagram_api/instagram/connection");
    const account = await injectJson("GET", "/accounts/account_instagram_api");
    const vaultEntry = repositories.secretVault.listByNamespace("instagram")[0];

    expect(callback.statusCode).toBe(302);
    expect(callback.headers.location).toContain("instagramConnection=connected");
    expect(status.body.data).toMatchObject({
      status: "connected",
      externalAccountId: "ig_api_1",
      handle: "api_studio"
    });
    expect(account.body.data).toMatchObject({
      platform: { id: "instagram" },
      externalAccountId: "ig_api_1",
      status: "connected"
    });
    expect(vaultEntry?.ciphertext).not.toContain("long-token");
    expect(vaultEntry?.ciphertext).not.toContain("page-token");

    const auditLogs = await injectJson("GET", "/audit-logs");
    expect(auditLogs.body.data.map((item: { action: string }) => item.action)).toEqual(
      expect.arrayContaining(["instagram.connection_requested", "instagram.oauth_completed"])
    );
  });

  it("keeps multiple Instagram accounts pending until selection and supports disconnect", async () => {
    await injectJson("POST", "/accounts", {
      id: "account_instagram_pending",
      platform: {
        id: "local",
        displayName: "Local Platform"
      },
      handle: "local_pending"
    });
    instagramFetch = queueInstagramFetch([
      { access_token: "short-token" },
      { access_token: "long-token", expires_in: 5000 },
      {
        data: [
          {
            id: "page_1",
            name: "First Page",
            access_token: "page-token-1",
            instagram_business_account: { id: "ig_1", username: "first" }
          },
          {
            id: "page_2",
            name: "Second Page",
            access_token: "page-token-2",
            instagram_business_account: { id: "ig_2", username: "second" }
          }
        ]
      }
    ]);

    const started = await injectJson("POST", "/accounts/account_instagram_pending/instagram/connect", {});
    const state = new URL(started.body.data.authorizationUrl).searchParams.get("state");
    const callback = await server.inject({
      method: "GET",
      url: `/instagram/oauth/callback?state=${encodeURIComponent(state ?? "")}&code=oauth_code`
    });
    const pending = await injectJson("GET", "/accounts/account_instagram_pending/instagram/connection");
    const selected = await injectJson("POST", "/accounts/account_instagram_pending/instagram/select", {
      instagramBusinessAccountId: "ig_2"
    });
    const disconnected = await injectJson("POST", "/accounts/account_instagram_pending/instagram/disconnect", {});

    expect(callback.statusCode).toBe(302);
    expect(callback.headers.location).toContain("instagramConnection=pending_selection");
    expect(pending.body.data.availableAccounts.map((item: { username: string }) => item.username)).toEqual(["first", "second"]);
    expect(selected.body.data).toMatchObject({ status: "connected", externalAccountId: "ig_2", handle: "second" });
    expect(disconnected.body.data.status).toBe("disconnected");
    expect(repositories.secretVault.listByNamespace("instagram")).toHaveLength(0);
  });

  it("returns a clear Instagram OAuth error and writes failure audit", async () => {
    await injectJson("POST", "/accounts", {
      id: "account_instagram_failed",
      platform: {
        id: "local",
        displayName: "Local Platform"
      },
      handle: "local_failed"
    });
    const started = await injectJson("POST", "/accounts/account_instagram_failed/instagram/connect", {});
    const state = new URL(started.body.data.authorizationUrl).searchParams.get("state");

    const failed = await server.inject({
      method: "GET",
      url: `/instagram/oauth/callback?state=${encodeURIComponent(state ?? "")}&error=access_denied&error_description=Denied`
    });

    expect(failed.statusCode).toBe(400);
    expect(failed.json().error).toEqual({
      code: "instagram_oauth_denied",
      message: "Denied"
    });

    const auditLogs = await injectJson("GET", "/audit-logs");
    expect(auditLogs.body.data.map((item: { action: string }) => item.action)).toEqual(
      expect.arrayContaining(["instagram.connection_requested", "instagram.connection_failed"])
    );
  });

  it("creates a review candidate through the generation route using a mock provider", async () => {
    generationProvider = {
      async generateCandidate(input) {
        const now = "2026-05-31T05:00:00.000Z";
        const generatedAsset = createContentAsset({
          id: "asset_generated_api",
          type: "image",
          uri: "file:///content-library/generated/candidates/candidate_generated_api/output.png",
          title: "Generated API media",
          description: "Generated media from the test provider.",
          tags: ["generated", "mock"],
          accountIds: [input.account.id],
          conceptIds: [input.concept.id],
          rights: { usage: "owned", source: "mock-provider" },
          metadata: {
            altText: "Generated API media alt text.",
            aiContentFactory: {
              provider: "mock",
              dryRun: input.dryRun === true
            }
          },
          importedAt: now,
          createdAt: now,
          updatedAt: now
        });

        return {
          candidate: createPostCandidate({
            id: "candidate_generated_api",
            accountId: input.account.id,
            conceptId: input.concept.id,
            recipeId: input.recipe.id,
            assetIds: ["asset_api_source", generatedAsset.id],
            status: "draft",
            format: input.recipe.format,
            caption: "Generated candidate caption.\n\n#workflow",
            firstComment: {
              text: "Generated first comment.",
              createdBy: "private.ai-content-factory",
              createdAt: now
            },
            provenance: {
              source: "plugin",
              pluginRegistrationId: "private.ai-content-factory",
              sourceAssetIds: ["asset_api_source"],
              sourceReferenceIds: []
            },
            metadata: {
              aiContentFactory: {
                provider: "mock",
                selectedAssetIds: ["asset_api_source"],
                hashtags: ["workflow"]
              }
            },
            createdAt: now,
            updatedAt: now
          }),
          generatedAsset,
          selectedAssets: input.assets.filter((asset) => asset.id === "asset_api_source"),
          provider: "mock",
          prompt: "Generated prompt",
          plan: {
            explanation: {
              selectedAssets: [{ assetId: "asset_api_source", selectedBecause: ["test fixture"] }]
            }
          }
        };
      }
    };

    await seedGenerationInputs();

    const generated = await injectJson("POST", "/generation/candidates", {
      accountId: "account_generation",
      conceptId: "concept_generation",
      recipeId: "recipe_generation",
      seed: "api-test",
      dryRun: true
    });

    expect(generated.statusCode).toBe(201);
    expect(generated.body.data).toMatchObject({
      candidateId: "candidate_generated_api",
      selectedAssetIds: ["asset_api_source"],
      metadata: {
        provider: "mock",
        dryRun: true,
        generatedAssetId: "asset_generated_api",
        generatedMediaUri: "file:///content-library/generated/candidates/candidate_generated_api/output.png"
      }
    });
    expect(generated.body.data.candidate).toMatchObject({
      status: "ready_for_review",
      conceptId: "concept_generation",
      recipeId: "recipe_generation",
      caption: "Generated candidate caption.\n\n#workflow",
      firstComment: { text: "Generated first comment." }
    });
    expect(generated.body.data.candidate.metadata.aiContentFactory).toMatchObject({
      statusLabel: "needs_review",
      provider: "mock",
      dryRun: true,
      selectedAssetIds: ["asset_api_source"],
      generatedAssetId: "asset_generated_api",
      altText: "Generated API media alt text."
    });

    const candidates = await injectJson("GET", "/candidates?status=ready_for_review");
    expect(candidates.body.data.map((item: { id: string }) => item.id)).toContain("candidate_generated_api");

    const auditLogs = await injectJson("GET", "/audit-logs");
    expect(auditLogs.body.data.map((item: { action: string }) => item.action)).toEqual(
      expect.arrayContaining([
        "generation.requested",
        "generation.assets_selected",
        "generation.media_generated",
        "candidate.created",
        "generation.candidate_created"
      ])
    );
  });

  it("returns a clear generation error and writes a failure audit", async () => {
    generationProvider = {
      async generateCandidate() {
        throw new Error("ComfyUI request timed out after 10ms.");
      }
    };

    await seedGenerationInputs();

    const failed = await injectJson("POST", "/generation/candidates", {
      accountId: "account_generation",
      conceptId: "concept_generation",
      recipeId: "recipe_generation",
      dryRun: false
    });

    expect(failed.statusCode).toBe(502);
    expect(failed.body.error).toEqual({
      code: "candidate_generation_failed",
      message: "ComfyUI request timed out after 10ms."
    });

    const auditLogs = await injectJson("GET", "/audit-logs");
    expect(auditLogs.body.data.map((item: { action: string }) => item.action)).toEqual(
      expect.arrayContaining(["generation.requested", "generation.failed"])
    );
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

  async function seedGenerationInputs() {
    await injectJson("POST", "/accounts", {
      id: "account_generation",
      platform: {
        id: "local",
        displayName: "Local Platform"
      },
      handle: "generation_account",
      status: "connected"
    });
    await injectJson("POST", "/concepts", {
      id: "concept_generation",
      accountId: "account_generation",
      name: "Generation Concept",
      description: "Concept for generation tests.",
      audience: "Operators",
      pillars: ["workflow"],
      voice: "Direct"
    });
    await injectJson("POST", "/assets", {
      id: "asset_api_source",
      type: "template",
      uri: "file://assets/source.yaml",
      title: "Source asset",
      tags: ["workflow"],
      accountIds: ["account_generation"],
      conceptIds: ["concept_generation"],
      rights: { usage: "owned" },
      metadata: {
        category: "backgrounds",
        promptFragment: "source asset fragment",
        weight: 1
      }
    });
    await injectJson("POST", "/recipes", {
      id: "recipe_generation",
      conceptId: "concept_generation",
      name: "Generation Recipe",
      summary: "A generation test recipe.",
      contentPillars: ["workflow"],
      format: "feed_image",
      instructions: ["Create a candidate."],
      metadata: {
        aiContentFactory: {
          requiredCategories: ["backgrounds"]
        }
      }
    });
  }
});

function queueInstagramFetch(payloads: unknown[]): FetchLike {
  return async () => {
    const payload = payloads.shift();

    if (payload === undefined) {
      throw new Error("No queued Instagram fetch payload.");
    }

    return {
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => JSON.stringify(payload)
    };
  };
}
