import type { PluginManifest } from "./manifest.js";
import type { PluginPermission } from "./permissions.js";

export interface PluginLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface PluginSecretStore {
  get(name: string): Promise<string | undefined>;
}

export interface PluginContext {
  workspaceId: string;
  pluginId: string;
  manifest: PluginManifest;
  permissions: readonly PluginPermission[];
  dryRun: boolean;
  requestId?: string;
  logger: PluginLogger;
  secrets?: PluginSecretStore;
  signal?: AbortSignal;
}

