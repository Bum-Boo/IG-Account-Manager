import type { PublisherPlugin, PublishRequest, PublishValidationRequest, ValidationIssue } from "@ig-manager/plugin-sdk";
import { pluginFailure, pluginSuccess, type PluginExecutionResult } from "@ig-manager/plugin-sdk";
import type { PublishOutput, ValidationOutput } from "@ig-manager/plugin-sdk";
import type { PluginManifest } from "@ig-manager/plugin-sdk";

export const mockPublisherManifest: PluginManifest = {
  schemaVersion: "ig-manager.plugin.v1",
  id: "official.mock-publisher",
  name: "Official Mock Publisher",
  version: "0.1.0",
  description: "Official MVP publisher that simulates publishing locally without external API calls.",
  type: "publisher",
  distribution: "official",
  private: false,
  officialApiOnly: true,
  entry: "./dist/index.js",
  permissions: ["candidate:read", "publish:validate", "publish:approved"],
  capabilities: [{ id: "publish.mock", description: "Validate and simulate publish requests." }],
  uiExtensionPoints: [],
  dryRun: { supported: true, modes: ["validate_only", "preview", "no_write"] },
  author: { name: "IG Manager" },
  metadata: { officialMvp: true }
};

export interface MockPublisherOptions {
  idPrefix?: string;
}

export function createMockPublisherPlugin(options: MockPublisherOptions = {}): PublisherPlugin {
  const idPrefix = options.idPrefix ?? "mock";

  return {
    manifest: mockPublisherManifest,
    validatePublish: async (request, context) => {
      const dryRun = isDryRun(request, context.dryRun);
      const issues = validatePublishInput(request);
      const valid = issues.every((issue) => issue.severity !== "error");

      context.logger.info("mock publisher validation completed", {
        candidateId: request.candidate.id,
        valid,
        issueCount: issues.length,
        dryRun
      });

      return pluginSuccess(
        {
          valid,
          issues
        },
        {
          dryRun,
          warnings: issues.filter((issue) => issue.severity !== "error").map((issue) => ({
            code: issue.code,
            message: issue.message,
            path: issue.path
          }))
        }
      );
    },
    publish: async (request, context): Promise<PluginExecutionResult<PublishOutput>> => {
      const dryRun = isDryRun(request, context.dryRun);
      const validation = validatePublishInput(request);
      const errors = validation.filter((issue) => issue.severity === "error");

      if (errors.length > 0) {
        context.logger.warn("mock publisher rejected invalid publish request", {
          candidateId: request.candidate.id,
          errorCount: errors.length,
          dryRun
        });

        return pluginFailure(
          {
            code: "mock_publish_validation_failed",
            message: "Publish request is missing required media or caption fields.",
            retryable: false,
            details: { issues: errors }
          },
          { dryRun }
        );
      }

      const externalPostId = `${dryRun ? "dry_run" : idPrefix}_${request.candidate.id}_${request.job?.attempt ?? 0}`;

      context.logger.info("mock publisher simulated publish", {
        candidateId: request.candidate.id,
        accountId: request.account.id,
        externalPostId,
        dryRun
      });

      return pluginSuccess(
        {
          externalPostId,
          permalink: `https://example.invalid/ig-manager/${externalPostId}`,
          publishedAt: dryRun ? undefined : new Date().toISOString(),
          rawResultRef: `mock-publisher://${externalPostId}`
        },
        {
          dryRun,
          audit: {
            simulated: true,
            candidateId: request.candidate.id,
            accountId: request.account.id,
            jobId: request.job?.id
          }
        }
      );
    }
  };
}

export const plugin = createMockPublisherPlugin();
export default plugin;

function validatePublishInput(request: PublishValidationRequest | PublishRequest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!request.candidate.caption.trim()) {
    issues.push({
      code: "caption_required",
      severity: "error",
      message: "Candidate caption is required before publishing.",
      path: "candidate.caption"
    });
  }

  if (request.candidate.caption.length > 2200) {
    issues.push({
      code: "caption_too_long",
      severity: "error",
      message: "Candidate caption exceeds the MVP caption limit of 2,200 characters.",
      path: "candidate.caption"
    });
  }

  if (request.candidate.assetIds.length === 0) {
    issues.push({
      code: "media_required",
      severity: "error",
      message: "At least one media asset is required before publishing.",
      path: "candidate.assetIds"
    });
  }

  if (!request.candidate.format.trim()) {
    issues.push({
      code: "format_required",
      severity: "error",
      message: "Candidate format is required before publishing.",
      path: "candidate.format"
    });
  }

  if (request.account.status !== "connected") {
    issues.push({
      code: "account_not_connected",
      severity: "warning",
      message: "Account is not connected. Mock publishing can continue but a real publisher would require connection.",
      path: "account.status"
    });
  }

  return issues;
}

function isDryRun(request: PublishValidationRequest | PublishRequest, contextDryRun: boolean): boolean {
  return contextDryRun || request.dryRun?.enabled === true;
}
