import type { PublisherPlugin } from "@ig-manager/plugin-sdk";
import { pluginSuccess } from "@ig-manager/plugin-sdk";

export interface MockPublisherPluginOptions {
  id?: string;
  fail?: boolean;
  retryableFailure?: boolean;
}

export function createMockPublisherPlugin(options: MockPublisherPluginOptions = {}): PublisherPlugin {
  const id = options.id ?? "mock.publisher";

  return {
    manifest: {
      schemaVersion: "ig-manager.plugin.v1",
      id,
      name: "Mock Publisher",
      version: "0.1.0",
      description: "Local mock publisher for dry runs and development.",
      type: "publisher",
      distribution: "community",
      private: false,
      officialApiOnly: true,
      permissions: ["candidate:read", "publish:validate", "publish:approved"],
      capabilities: [{ id: "publish.mock" }],
      uiExtensionPoints: [],
      dryRun: { supported: true, modes: ["validate_only", "preview", "no_write"] },
      metadata: {}
    },
    validatePublish: async () =>
      pluginSuccess({
        valid: true,
        issues: []
      }),
    publish: async (request) => {
      if (options.fail) {
        return {
          ok: false,
          dryRun: Boolean(request.dryRun?.enabled),
          warnings: [],
          error: {
            code: "mock_publish_failed",
            message: "Mock publisher failure.",
            retryable: options.retryableFailure ?? true
          }
        };
      }

      return pluginSuccess(
        {
          externalPostId: `mock_${request.candidate.id}`,
          permalink: `https://example.invalid/posts/${request.candidate.id}`,
          publishedAt: new Date().toISOString()
        },
        { dryRun: Boolean(request.dryRun?.enabled) }
      );
    }
  };
}

