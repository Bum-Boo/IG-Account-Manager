import type { PluginRegistration } from "@ig-manager/domain";
import type { Logger } from "@ig-manager/logger";
import { createMockPublisherPlugin } from "@ig-manager/scheduler-core";
import type { PublisherPlugin } from "@ig-manager/plugin-sdk";
import type { PublisherPluginRegistry } from "@ig-manager/workflow-engine";

export interface PluginLookupRepository {
  getById(id: string): PluginRegistration | undefined | Promise<PluginRegistration | undefined>;
}

export interface LocalPublisherRegistryOptions {
  plugins: PluginLookupRepository;
  logger: Logger;
  createInstagramPublisher?: () => PublisherPlugin;
}

export function createLocalPublisherRegistry(options: LocalPublisherRegistryOptions): PublisherPluginRegistry {
  const cache = new Map<string, PublisherPlugin>();

  return {
    async getPublisher(pluginRegistrationId: string) {
      const registration = await options.plugins.getById(pluginRegistrationId);

      if (!registration || !registration.enabled || registration.type !== "publisher") {
        return undefined;
      }

      const cached = cache.get(registration.id);

      if (cached) {
        return cached;
      }

      const publisher =
        registration.pluginId === "official.instagram-publisher" && options.createInstagramPublisher
          ? options.createInstagramPublisher()
          : createMockPublisherPlugin({ id: registration.pluginId });
      cache.set(registration.id, publisher);

      options.logger.debug("mock publisher bound to plugin registration", {
        pluginRegistrationId: registration.id,
        pluginId: registration.pluginId
      });

      return publisher;
    }
  };
}
