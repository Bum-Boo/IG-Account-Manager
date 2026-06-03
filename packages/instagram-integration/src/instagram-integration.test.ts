import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAccount } from "@ig-manager/domain";
import { createDatabase, createRepositories, runMigrations, type DatabaseHandle } from "@ig-manager/db";
import { createInstagramIntegration } from "./factory.js";
import { InstagramGraphHttpClient, type FetchLike } from "./instagram-graph-client.js";
import { createInstagramOAuthState, verifyInstagramOAuthState } from "./oauth-state.js";
import { EncryptedTokenVault } from "./token-vault.js";

const vaultKey = Buffer.alloc(32, 7).toString("base64");
const fixedNow = new Date("2026-06-01T00:00:00.000Z");

describe("instagram integration", () => {
  let handle: DatabaseHandle;
  let repos: ReturnType<typeof createRepositories>;

  beforeEach(() => {
    handle = createDatabase();
    runMigrations(handle.client);
    repos = createRepositories(handle.db);
    repos.accounts.create(
      createAccount({
        id: "account_instagram_test",
        platform: { id: "local", displayName: "Local", metadata: {} },
        handle: "local_account",
        createdAt: fixedNow.toISOString(),
        updatedAt: fixedNow.toISOString()
      })
    );
  });

  afterEach(() => {
    handle.close();
  });

  it("signs OAuth state and rejects tampering", () => {
    const state = createInstagramOAuthState({
      accountId: "account_instagram_test",
      secret: "state-secret",
      now: fixedNow
    });

    expect(verifyInstagramOAuthState({ state: state.state, secret: "state-secret", now: fixedNow }).accountId).toBe(
      "account_instagram_test"
    );
    expect(() => verifyInstagramOAuthState({ state: `${state.state}x`, secret: "state-secret", now: fixedNow })).toThrow(
      "Instagram OAuth state could not be verified."
    );
  });

  it("encrypts and decrypts token payloads through the vault", () => {
    const vault = new EncryptedTokenVault({
      repository: repos.secretVault,
      key: vaultKey,
      now: () => fixedNow
    });
    const ref = vault.store({ accessToken: "user-token", pageAccessToken: "page-token", scopes: ["instagram_basic"] });
    const stored = repos.secretVault.getById(ref);

    expect(stored?.ciphertext).not.toContain("user-token");
    expect(stored?.ciphertext).not.toContain("page-token");
    expect(vault.read(ref)).toMatchObject({ accessToken: "user-token", pageAccessToken: "page-token" });
  });

  it("completes OAuth, stores tokens in the vault, and connects one eligible Instagram account", async () => {
    const integration = createInstagramIntegration({
      repositories: repos,
      config: testConfig(),
      fetch: queueFetch([
        { access_token: "short-token", token_type: "bearer", expires_in: 100 },
        { access_token: "long-token", token_type: "bearer", expires_in: 5000 },
        {
          data: [
            {
              id: "page_1",
              name: "Studio Page",
              access_token: "page-token",
              instagram_business_account: { id: "ig_1", username: "studio", name: "Studio IG" }
            }
          ]
        }
      ]),
      now: () => fixedNow
    });

    const start = integration.connectionService?.startConnection("account_instagram_test");
    const state = new URL(start?.authorizationUrl ?? "").searchParams.get("state");
    const completed = await integration.connectionService?.completeOAuthCallback({ state: state ?? "", code: "code_1" });
    const token = await integration.tokenProvider?.getAccessToken({
      accountId: "account_instagram_test",
      externalAccountId: "ig_1",
      requiredScopes: testConfig().requiredScopes
    });

    expect(completed?.status).toBe("connected");
    expect(completed?.connection).toMatchObject({ externalAccountId: "ig_1", handle: "studio" });
    expect(repos.accounts.getById("account_instagram_test")).toMatchObject({
      platform: { id: "instagram" },
      externalAccountId: "ig_1",
      status: "connected"
    });
    expect(token?.accessToken).toBe("page-token");
    expect(repos.secretVault.listByNamespace("instagram")[0]?.ciphertext).not.toContain("long-token");
  });

  it("keeps multiple eligible accounts pending until a user selects one", async () => {
    const integration = createInstagramIntegration({
      repositories: repos,
      config: testConfig(),
      fetch: queueFetch([
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
      ]),
      now: () => fixedNow
    });

    const start = integration.connectionService?.startConnection("account_instagram_test");
    const state = new URL(start?.authorizationUrl ?? "").searchParams.get("state");
    const completed = await integration.connectionService?.completeOAuthCallback({ state: state ?? "", code: "code_1" });
    const selected = integration.connectionService?.selectAccount("account_instagram_test", "ig_2");
    const token = await integration.tokenProvider?.getAccessToken({
      accountId: "account_instagram_test",
      externalAccountId: "ig_2",
      requiredScopes: testConfig().requiredScopes
    });

    expect(completed?.status).toBe("pending_selection");
    expect(completed?.connection.availableAccounts?.map((account) => account.username)).toEqual(["first", "second"]);
    expect(selected).toMatchObject({ status: "connected", externalAccountId: "ig_2", handle: "second" });
    expect(token?.accessToken).toBe("page-token-2");
  });

  it("calls the Graph API client for image container, publish, and first comment", async () => {
    const calls: string[] = [];
    const graphClient = new InstagramGraphHttpClient({
      fetch: async (url, init) => {
        calls.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);

        if (url.includes("/media_publish")) return jsonResponse({ id: "media_1" });
        if (url.includes("/comments")) return jsonResponse({ id: "comment_1" });
        if (url.includes("fields=status_code")) return jsonResponse({ status_code: "FINISHED" });
        if (url.includes("fields=permalink")) return jsonResponse({ permalink: "https://instagram.example/p/media_1" });
        return jsonResponse({ id: "container_1" });
      },
      config: { containerPollIntervalMs: 1, containerPollTimeoutMs: 100 }
    });

    const container = await graphClient.createMediaContainer({
      accessToken: "token",
      instagramBusinessAccountId: "ig_1",
      graphApiBaseUrl: "https://graph.example",
      media: [{ uri: "https://cdn.example/image.jpg", mediaType: "image" }],
      caption: "Caption"
    });
    const published = await graphClient.publishMediaContainer({
      accessToken: "token",
      instagramBusinessAccountId: "ig_1",
      graphApiBaseUrl: "https://graph.example",
      containerId: container.containerId
    });
    const comment = await graphClient.createFirstComment({
      accessToken: "token",
      instagramBusinessAccountId: "ig_1",
      graphApiBaseUrl: "https://graph.example",
      mediaId: published.mediaId,
      text: "First comment"
    });

    expect(calls).toEqual([
      "POST /ig_1/media",
      "GET /container_1",
      "POST /ig_1/media_publish",
      "GET /media_1",
      "POST /media_1/comments"
    ]);
    expect(published.permalink).toBe("https://instagram.example/p/media_1");
    expect(comment.commentId).toBe("comment_1");
  });
});

const runReadOnlyIntegration = process.env.IG_MANAGER_RUN_INSTAGRAM_INTEGRATION_TESTS === "true" && !!process.env.INSTAGRAM_TEST_ACCESS_TOKEN;
(runReadOnlyIntegration ? it : it.skip)("runs guarded read-only Graph API account resolution", async () => {
  const graphClient = new InstagramGraphHttpClient();
  const accounts = await graphClient.resolveEligibleInstagramAccounts({
    accessToken: process.env.INSTAGRAM_TEST_ACCESS_TOKEN as string,
    graphApiBaseUrl: process.env.INSTAGRAM_GRAPH_API_BASE_URL ?? "https://graph.facebook.com",
    graphApiVersion: process.env.INSTAGRAM_GRAPH_API_VERSION
  });

  expect(Array.isArray(accounts)).toBe(true);
});

function testConfig() {
  return {
    appId: "app-id",
    appSecret: "app-secret",
    redirectUri: "http://localhost:3001/instagram/oauth/callback",
    graphApiBaseUrl: "https://graph.example",
    graphApiVersion: "v99.0",
    requiredScopes: ["pages_show_list", "instagram_basic", "instagram_content_publish"],
    publishMode: "mock" as const,
    webBaseUrl: "http://localhost:5173",
    tokenVaultKey: vaultKey,
    containerPollIntervalMs: 1,
    containerPollTimeoutMs: 100
  };
}

function queueFetch(payloads: unknown[]): FetchLike {
  return async () => {
    const payload = payloads.shift();

    if (payload === undefined) {
      throw new Error("No queued fetch payload.");
    }

    return jsonResponse(payload);
  };
}

function jsonResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  };
}
