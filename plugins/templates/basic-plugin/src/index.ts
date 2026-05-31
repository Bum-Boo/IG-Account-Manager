import type { PluginManifest, ValidationIssue, ValidatorPlugin } from "@ig-manager/plugin-sdk";
import { pluginSuccess } from "@ig-manager/plugin-sdk";

export const manifest: PluginManifest = {
  schemaVersion: "ig-manager.plugin.v1",
  id: "community.basic-validator",
  name: "Basic Validator",
  version: "0.1.0",
  description: "Template validator plugin for IG Manager.",
  type: "validator",
  distribution: "community",
  private: false,
  officialApiOnly: false,
  entry: "./dist/index.js",
  permissions: ["validator:run"],
  capabilities: [{ id: "validate.basic", description: "Validate candidate caption and media references." }],
  uiExtensionPoints: [],
  dryRun: { supported: true, modes: ["validate_only", "preview", "no_write"] },
  author: { name: "Your Name" },
  metadata: {}
};

export const plugin: ValidatorPlugin = {
  manifest,
  async validate(request, context) {
    const issues: ValidationIssue[] = [];

    if (!request.candidate.caption.trim()) {
      issues.push({
        code: "caption_required",
        severity: "error",
        message: "Candidate caption is required.",
        path: "candidate.caption"
      });
    }

    if (request.candidate.assetIds.length === 0) {
      issues.push({
        code: "media_required",
        severity: "error",
        message: "Candidate must reference at least one media asset.",
        path: "candidate.assetIds"
      });
    }

    context.logger.info("basic validator completed", {
      candidateId: request.candidate.id,
      issueCount: issues.length,
      dryRun: request.dryRun?.enabled === true
    });

    return pluginSuccess(
      {
        valid: issues.every((issue) => issue.severity !== "error"),
        issues
      },
      { dryRun: request.dryRun?.enabled === true }
    );
  }
};

export default plugin;
