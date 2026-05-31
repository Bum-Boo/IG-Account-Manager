import { describe, expect, it } from "vitest";
import { parsePluginManifest } from "@ig-manager/plugin-sdk";
import { manifest, plugin } from "./index.js";

const baseCandidate = {
  id: "candidate_template",
  accountId: "account_template",
  conceptId: "concept_template",
  assetIds: ["asset_template"],
  status: "ready_for_review" as const,
  format: "feed_image",
  caption: "Template caption.",
  provenance: { source: "manual" as const, sourceAssetIds: [], sourceReferenceIds: [] },
  metadata: {},
  createdAt: "2026-05-31T00:00:00.000Z",
  updatedAt: "2026-05-31T00:00:00.000Z"
};

describe("basic plugin template", () => {
  it("has a valid manifest", () => {
    expect(parsePluginManifest(manifest)).toEqual(manifest);
  });

  it("validates a candidate", async () => {
    const result = await plugin.validate(
      { candidate: baseCandidate, dryRun: { enabled: true, mode: "validate_only" } },
      {
        workspaceId: "workspace_template",
        pluginId: manifest.id,
        manifest,
        permissions: manifest.permissions,
        dryRun: true,
        logger: {
          debug: () => undefined,
          info: () => undefined,
          warn: () => undefined,
          error: () => undefined
        }
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.dryRun).toBe(true);
    expect(result.data.valid).toBe(true);
  });
});
