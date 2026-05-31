import type { IgManagerPlugin } from "./contracts.js";
import type { PluginManifest } from "./manifest.js";

export interface PluginManifestSource {
  id?: string;
  uri: string;
}

export interface LoadedPluginManifest {
  manifest: PluginManifest;
  source: PluginManifestSource;
}

export interface PluginLoader {
  readManifest(source: PluginManifestSource): Promise<unknown>;
  validateManifest(input: unknown): PluginManifest;
  loadManifest(source: PluginManifestSource): Promise<LoadedPluginManifest>;
}

export interface PluginRegistry {
  registerManifest(manifest: PluginManifest): Promise<void> | void;
  getManifest(pluginId: string): Promise<PluginManifest | undefined> | PluginManifest | undefined;
  listManifests(): Promise<PluginManifest[]> | PluginManifest[];
}

export interface InMemoryPluginHandle {
  manifest: PluginManifest;
  instance: IgManagerPlugin;
}

