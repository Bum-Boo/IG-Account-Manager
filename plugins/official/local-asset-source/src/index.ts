import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { z } from "zod";
import { AssetTypeSchema, createContentAsset, type AssetType, type ContentAsset } from "@ig-manager/domain";
import type { PluginManifest, SourceImporterPlugin, SourceImportRequest } from "@ig-manager/plugin-sdk";
import { pluginFailure, pluginSuccess, type PluginWarning } from "@ig-manager/plugin-sdk";

export const ASSET_CATEGORIES = ["backgrounds", "outfits", "makeup", "camera", "poses"] as const;
export type LocalAssetCategory = (typeof ASSET_CATEGORIES)[number];

export const localAssetSourceManifest: PluginManifest = {
  schemaVersion: "ig-manager.plugin.v1",
  id: "official.local-asset-source",
  name: "Official Local Asset Source",
  version: "0.1.0",
  description: "Official MVP source importer for YAML-described local content assets.",
  type: "source_importer",
  distribution: "official",
  private: false,
  officialApiOnly: true,
  entry: "./dist/index.js",
  permissions: ["source:import", "asset:write"],
  capabilities: [{ id: "asset.import.local-yaml", description: "Import ContentAsset records from content-library YAML files." }],
  uiExtensionPoints: [],
  dryRun: { supported: true, modes: ["validate_only", "preview", "no_write"] },
  author: { name: "IG Manager" },
  metadata: {
    officialMvp: true,
    categories: [...ASSET_CATEGORIES]
  }
};

const LocalAssetYamlSchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    title: z.string().trim().min(1).max(200),
    type: AssetTypeSchema.default("template"),
    uri: z.string().trim().min(1).max(2000).optional(),
    description: z.string().trim().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(80)).default([]),
    accountIds: z.array(z.string().trim().min(1).max(128)).default([]),
    conceptIds: z.array(z.string().trim().min(1).max(128)).default([]),
    compatibleWith: z.array(z.string().trim().min(1).max(128)).default([]),
    avoidWith: z.array(z.string().trim().min(1).max(128)).default([]),
    promptFragment: z.string().trim().min(1).max(1000),
    weight: z.number().min(0).max(100).default(1),
    rights: z
      .object({
        usage: z.enum(["owned", "licensed", "reference_only", "unknown"]).default("owned"),
        source: z.string().trim().max(500).optional(),
        expiresAt: z.string().datetime({ offset: true }).optional()
      })
      .strict()
      .default({ usage: "owned" }),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict();

export type LocalAssetYaml = z.infer<typeof LocalAssetYamlSchema>;

export interface LocalAssetSourceOptions {
  rootDir?: string;
}

interface DiscoveredFile {
  category: LocalAssetCategory;
  path: string;
}

export function createLocalAssetSourcePlugin(options: LocalAssetSourceOptions = {}): SourceImporterPlugin {
  return {
    manifest: localAssetSourceManifest,
    importSource: async (request, context) => {
      const dryRun = context.dryRun || request.dryRun?.enabled === true;
      const rootDir = resolveSourceRoot(request, options.rootDir);

      if (!existsSync(rootDir)) {
        context.logger.error("local asset source root was not found", { rootDir, dryRun });
        return pluginFailure(
          {
            code: "local_asset_source_missing_root",
            message: `Local asset source root was not found: ${rootDir}`,
            retryable: false
          },
          { dryRun }
        );
      }

      const warnings: PluginWarning[] = [];
      const files = await discoverYamlFiles(rootDir, warnings);
      const assets: ContentAsset[] = [];

      for (const file of files) {
        const imported = await readAssetFile(file);

        if (!imported.ok) {
          warnings.push({
            code: "invalid_asset_yaml",
            message: imported.message,
            path: file.path
          });
          context.logger.warn("local asset source skipped invalid YAML file", {
            path: file.path,
            reason: imported.message
          });
          continue;
        }

        assets.push(toContentAsset(imported.asset, file));
      }

      context.logger.info("local asset source import completed", {
        rootDir,
        filesScanned: files.length,
        assetsImported: assets.length,
        warningCount: warnings.length,
        dryRun
      });

      return pluginSuccess(
        {
          assets,
          candidates: [],
          references: []
        },
        {
          dryRun,
          warnings,
          audit: {
            rootDir,
            filesScanned: files.length,
            assetsImported: assets.length
          }
        }
      );
    }
  };
}

export const plugin = createLocalAssetSourcePlugin();
export default plugin;

async function discoverYamlFiles(rootDir: string, warnings: PluginWarning[]): Promise<DiscoveredFile[]> {
  const files: DiscoveredFile[] = [];

  for (const category of ASSET_CATEGORIES) {
    const categoryDir = resolve(rootDir, category);

    if (!existsSync(categoryDir)) {
      warnings.push({
        code: "asset_category_missing",
        message: `Asset category directory is missing: ${category}`,
        path: categoryDir
      });
      continue;
    }

    const entries = await readdir(categoryDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))) {
        files.push({ category, path: resolve(categoryDir, entry.name) });
      }
    }
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function readAssetFile(file: DiscoveredFile): Promise<
  | {
      ok: true;
      asset: LocalAssetYaml;
    }
  | {
      ok: false;
      message: string;
    }
> {
  try {
    const raw = await readFile(file.path, "utf8");
    const parsed = YAML.parse(raw);
    const result = LocalAssetYamlSchema.safeParse(parsed);

    if (!result.success) {
      return {
        ok: false,
        message: result.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ")
      };
    }

    return { ok: true, asset: result.data };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function toContentAsset(asset: LocalAssetYaml, file: DiscoveredFile): ContentAsset {
  const now = new Date().toISOString();
  const id = asset.id ?? createAssetId(file.category, asset.title);
  const type: AssetType = asset.type;

  return createContentAsset({
    id,
    type,
    uri: asset.uri ?? `file://${file.path.replace(/\\/g, "/")}`,
    title: asset.title,
    description: asset.description,
    tags: asset.tags,
    accountIds: asset.accountIds,
    conceptIds: asset.conceptIds,
    rights: asset.rights,
    metadata: {
      ...asset.metadata,
      category: file.category,
      compatibleWith: asset.compatibleWith,
      avoidWith: asset.avoidWith,
      promptFragment: asset.promptFragment,
      weight: asset.weight,
      sourceFile: file.path
    },
    importedAt: now,
    createdAt: now,
    updatedAt: now
  });
}

function createAssetId(category: LocalAssetCategory, title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

  return `asset_${category}_${slug || "local"}`;
}

function resolveSourceRoot(request: SourceImportRequest, fallback?: string): string {
  const sourceUri = request.sourceUri?.trim() || fallback || "content-library/assets";

  if (sourceUri.startsWith("file:")) {
    return fileURLToPath(sourceUri);
  }

  return resolve(sourceUri);
}
