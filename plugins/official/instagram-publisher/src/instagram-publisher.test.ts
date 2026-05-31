import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAccount, createPostCandidate, createPublishJob } from "@ig-manager/domain";
import { parsePluginManifest, type PluginContext } from "@ig-manager/plugin-sdk";
import { describe, expect, it } from "vitest";
import {
  InstagramPublisher,
  instagramPublisherManifest,
  type InstagramGraphApiClient,
  type InstagramTokenProvider
} from "./index.js";

const now = "2026-05-31T00:00:00.000Z";

describe("official instagram publisher", () => {
  it("ships a valid plugin manifest", () => {
    const manifestPath = resolve("plugin.json");
    const manifest = parsePluginManifest(JSON.parse(readFileSync(manifestPath, "utf8")));

    expect(manifest).toEqual(instagramPublisherManifest);
    expect(manifest.type).toBe("publisher");
    expect(manifest.officialApiOnly).toBe(true);
  });

  it("dry-run publish does not call token provider or API client", async () => {
    let tokenCalls = 0;
    let apiCalls = 0;
    const logs: string[] = [];
    const plugin = new InstagramPublisher({
      config: { mode: "live" },
      tokenProvider: {
        getAccessToken: async () => {
          tokenCalls += 1;
          return { accessToken: "test-token" };
        }
      },
      apiClient: createCountingApiClient(() => {
        apiCalls += 1;
      })
    });

    const result = await plugin.publish(
      {
        account,
        candidate,
        job,
        approvedBy: "reviewer",
        dryRun: { enabled: true, mode: "no_write" }
      },
      createContext(logs)
    );

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.dryRun).toBe(true);
    expect(result.data.externalPostId).toBe("dry_run_instagram_candidate_valid_1");
    expect(result.data.publishedAt).toBeUndefined();
    expect(tokenCalls).toBe(0);
    expect(apiCalls).toBe(0);
    expect(logs.some((line) => line.includes("dry-run completed without network calls"))).toBe(true);
  });

  it("mock publish returns a fake Instagram post id and permalink", async () => {
    let tokenCalls = 0;
    let apiCalls = 0;
    const logs: string[] = [];
    const plugin = new InstagramPublisher({
      config: { mode: "mock" },
      tokenProvider: {
        getAccessToken: async () => {
          tokenCalls += 1;
          return { accessToken: "test-token" };
        }
      },
      apiClient: createCountingApiClient(() => {
        apiCalls += 1;
      }),
      now: () => new Date("2026-06-01T12:00:00.000Z")
    });

    const result = await plugin.publish(
      {
        account,
        candidate,
        job,
        approvedBy: "reviewer"
      },
      createContext(logs)
    );

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.dryRun).toBe(false);
    expect(result.data.externalPostId).toBe("mock_instagram_candidate_valid_1");
    expect(result.data.permalink).toBe("https://example.invalid/ig-manager/instagram/mock_instagram_candidate_valid_1");
    expect(result.data.publishedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(result.audit?.firstCommentCreated).toBe(true);
    expect(tokenCalls).toBe(0);
    expect(apiCalls).toBe(0);
    expect(logs.some((line) => line.includes("mock publish completed without network calls"))).toBe(true);
  });

  it("rejects candidates that are not approved and scheduled", async () => {
    const plugin = new InstagramPublisher({ config: { mode: "mock" } });
    const invalidCandidate = {
      ...candidate,
      status: "ready_for_review" as const,
      scheduledAt: undefined,
      approvedAt: undefined,
      approvedBy: undefined
    };

    const result = await plugin.publish(
      {
        account,
        candidate: invalidCandidate,
        job,
        approvedBy: "reviewer"
      },
      createContext()
    );

    if (result.ok) {
      throw new Error("Expected invalid Instagram publish request to fail.");
    }

    expect(result.error.code).toBe("instagram_publish_validation_failed");
    expect(result.error.retryable).toBe(false);
    expect(result.error.details?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "candidate_not_scheduled" }),
        expect.objectContaining({ code: "scheduled_at_required" }),
        expect.objectContaining({ code: "candidate_not_approved" })
      ])
    );
  });

  it("live mode keeps real API calls behind injected interfaces", async () => {
    const calls: string[] = [];
    const tokenProvider: InstagramTokenProvider = {
      getAccessToken: async () => ({ accessToken: "test-token", scopes: ["instagram_content_publish"] })
    };
    const apiClient: InstagramGraphApiClient = {
      createMediaContainer: async () => {
        calls.push("create-container");
        return { containerId: "container_1", rawResultRef: "container-ref" };
      },
      publishMediaContainer: async () => {
        calls.push("publish-container");
        return { mediaId: "media_1", permalink: "https://instagram.example.invalid/p/media_1" };
      },
      createFirstComment: async () => {
        calls.push("first-comment");
        return { commentId: "comment_1" };
      }
    };
    const plugin = new InstagramPublisher({
      config: { mode: "live" },
      tokenProvider,
      apiClient,
      now: () => new Date("2026-06-01T12:00:00.000Z")
    });

    const result = await plugin.publish(
      {
        account,
        candidate,
        job,
        approvedBy: "reviewer"
      },
      createContext()
    );

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(calls).toEqual(["create-container", "publish-container", "first-comment"]);
    expect(result.data.externalPostId).toBe("media_1");
    expect(result.data.permalink).toBe("https://instagram.example.invalid/p/media_1");
  });
});

function createContext(logs: string[] = []): PluginContext {
  return {
    workspaceId: "test",
    pluginId: instagramPublisherManifest.id,
    manifest: instagramPublisherManifest,
    permissions: instagramPublisherManifest.permissions,
    dryRun: false,
    logger: {
      debug: (message) => logs.push(message),
      info: (message) => logs.push(message),
      warn: (message) => logs.push(message),
      error: (message) => logs.push(message)
    }
  };
}

function createCountingApiClient(onCall: () => void): InstagramGraphApiClient {
  return {
    createMediaContainer: async () => {
      onCall();
      return { containerId: "container_1" };
    },
    publishMediaContainer: async () => {
      onCall();
      return { mediaId: "media_1" };
    },
    createFirstComment: async () => {
      onCall();
      return { commentId: "comment_1" };
    }
  };
}

const account = createAccount({
  id: "account_instagram",
  platform: { id: "instagram", displayName: "Instagram", officialApiBaseUrl: "https://graph.facebook.com", metadata: {} },
  externalAccountId: "ig_business_123",
  handle: "main",
  status: "connected",
  createdAt: now,
  updatedAt: now
});

const candidate = createPostCandidate({
  id: "candidate_valid",
  accountId: account.id,
  conceptId: "concept_main",
  status: "scheduled",
  format: "feed_image",
  caption: "Ready to publish.",
  assetIds: ["asset_main"],
  scheduledAt: "2026-06-01T10:00:00.000Z",
  approvedAt: "2026-05-31T10:00:00.000Z",
  approvedBy: "reviewer",
  firstComment: {
    text: "First comment",
    createdBy: "reviewer",
    createdAt: "2026-05-31T10:30:00.000Z"
  },
  metadata: {
    instagram: {
      hashtags: ["concept", "#workflow"],
      media: [
        {
          assetId: "asset_main",
          uri: "file:///tmp/asset-main.jpg",
          mediaType: "image",
          altText: "Studio product image."
        }
      ]
    }
  },
  createdAt: now,
  updatedAt: now
});

const job = createPublishJob({
  id: "job_instagram",
  accountId: account.id,
  candidateId: candidate.id,
  pluginRegistrationId: "plugin_instagram",
  scheduledAt: "2026-06-01T10:00:00.000Z",
  attempt: 1,
  maxAttempts: 3,
  createdAt: now,
  updatedAt: now
});
