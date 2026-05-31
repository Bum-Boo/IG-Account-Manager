import type { PluginRegistration } from "@ig-manager/domain";
import type { PublisherPlugin } from "@ig-manager/plugin-sdk";
import { pluginSuccess } from "@ig-manager/plugin-sdk";
import type { PublisherPluginRegistry } from "@ig-manager/workflow-engine";

export interface PluginLookupRepository {
  getById(id: string): PluginRegistration | undefined | Promise<PluginRegistration | undefined>;
}

export function createApiPublisherRegistry(plugins: PluginLookupRepository): PublisherPluginRegistry {
  const cache = new Map<string, PublisherPlugin>();

  return {
    async getPublisher(pluginRegistrationId: string) {
      const registration = await plugins.getById(pluginRegistrationId);

      if (!registration || !registration.enabled || registration.type !== "publisher") {
        return undefined;
      }

      const cached = cache.get(registration.id);

      if (cached) {
        return cached;
      }

      const publisher = createMockPublisher(registration.pluginId);
      cache.set(registration.id, publisher);
      return publisher;
    }
  };
}

function createMockPublisher(pluginId: string): PublisherPlugin {
  return {
    manifest: {
      schemaVersion: "ig-manager.plugin.v1",
      id: pluginId,
      name: "Local API Mock Publisher",
      version: "0.1.0",
      description: "Local API mock publisher contract for workflow validation.",
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
    validatePublish: async () => pluginSuccess({ valid: true, issues: [] }),
    publish: async () =>
      pluginSuccess({
        externalPostId: "local_api_mock_post",
        rawResultRef: "mock://local-api"
      })
  };
}
