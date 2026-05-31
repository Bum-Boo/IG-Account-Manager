import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAccount, createPostCandidate, createPublishJob } from "@ig-manager/domain";
import { parsePluginManifest, type PluginContext } from "@ig-manager/plugin-sdk";
import { createMockPublisherPlugin, mockPublisherManifest } from "./index.js";

const now = "2026-05-31T00:00:00.000Z";

describe("official mock publisher", () => {
  it("ships a valid plugin manifest", () => {
    const manifestPath = resolve("plugin.json");
    const manifest = parsePluginManifest(JSON.parse(readFileSync(manifestPath, "utf8")));

    expect(manifest).toEqual(mockPublisherManifest);
    expect(manifest.type).toBe("publisher");
    expect(manifest.distribution).toBe("official");
  });

  it("validates media and caption fields", async () => {
    const plugin = createMockPublisherPlugin();
    const invalidCandidate = { ...candidate, caption: "", assetIds: [] };
    const result = await plugin.validatePublish(
      {
        account,
        candidate: invalidCandidate
      },
      createContext()
    );

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.data.valid).toBe(false);
    expect(result.data.issues.map((issue) => issue.code)).toEqual(["caption_required", "media_required"]);
  });

  it("returns a fake external post id for valid publish requests", async () => {
    const logs: string[] = [];
    const plugin = createMockPublisherPlugin({ idPrefix: "test_mock" });
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

    expect(result.data.externalPostId).toBe("test_mock_candidate_valid_1");
    expect(result.dryRun).toBe(false);
    expect(logs.some((line) => line.includes("mock publisher simulated publish"))).toBe(true);
  });

  it("supports dry-run without marking a real published timestamp", async () => {
    const plugin = createMockPublisherPlugin();
    const result = await plugin.publish(
      {
        account,
        candidate,
        job,
        approvedBy: "reviewer",
        dryRun: { enabled: true, mode: "no_write" }
      },
      createContext()
    );

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.dryRun).toBe(true);
    expect(result.data.externalPostId).toBe("dry_run_candidate_valid_1");
    expect(result.data.publishedAt).toBeUndefined();
  });

  it("returns a clear non-retryable error for invalid publish requests", async () => {
    const plugin = createMockPublisherPlugin();
    const invalidCandidate = { ...candidate, caption: "", assetIds: [] };
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
      throw new Error("Expected invalid publish request to fail.");
    }

    expect(result.error.code).toBe("mock_publish_validation_failed");
    expect(result.error.retryable).toBe(false);
  });
});

function createContext(logs: string[] = []): PluginContext {
  return {
    workspaceId: "test",
    pluginId: mockPublisherManifest.id,
    manifest: mockPublisherManifest,
    permissions: mockPublisherManifest.permissions,
    dryRun: false,
    logger: {
      debug: (message) => logs.push(message),
      info: (message) => logs.push(message),
      warn: (message) => logs.push(message),
      error: (message) => logs.push(message)
    }
  };
}

const account = createAccount({
  id: "account_main",
  platform: { id: "instagram", displayName: "Instagram", metadata: {} },
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
  createdAt: now,
  updatedAt: now
});

const job = createPublishJob({
  id: "job_main",
  accountId: account.id,
  candidateId: candidate.id,
  pluginRegistrationId: "plugin_mock",
  scheduledAt: "2026-06-01T10:00:00.000Z",
  attempt: 1,
  maxAttempts: 3,
  createdAt: now,
  updatedAt: now
});
