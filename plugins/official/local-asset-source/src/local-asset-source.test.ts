import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parsePluginManifest, type PluginContext } from "@ig-manager/plugin-sdk";
import { ASSET_CATEGORIES, createLocalAssetSourcePlugin, localAssetSourceManifest } from "./index.js";

describe("official local asset source", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "ig-manager-assets-"));

    for (const category of ASSET_CATEGORIES) {
      await mkdir(join(rootDir, category), { recursive: true });
    }
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("ships a valid plugin manifest", async () => {
    const manifest = parsePluginManifest(JSON.parse(await readFile(resolve("plugin.json"), "utf8")));

    expect(manifest).toEqual(localAssetSourceManifest);
    expect(manifest.type).toBe("source_importer");
    expect(manifest.distribution).toBe("official");
  });

  it("imports YAML files into ContentAsset records", async () => {
    await writeFile(
      join(rootDir, "backgrounds", "studio-wall.yaml"),
      [
        "id: asset_background_studio_wall",
        "title: Studio wall",
        "type: image",
        "uri: file://assets/backgrounds/studio-wall.png",
        "description: Neutral studio background.",
        "tags:",
        "  - studio",
        "  - neutral",
        "compatibleWith:",
        "  - outfits:minimal",
        "avoidWith:",
        "  - lighting:low-key",
        "promptFragment: neutral studio wall with soft daylight",
        "weight: 1.4",
        "rights:",
        "  usage: owned"
      ].join("\n")
    );
    await writeFile(
      join(rootDir, "poses", "seated.yaml"),
      [
        "title: Seated three-quarter pose",
        "tags: [pose, seated]",
        "compatibleWith: [camera:portrait]",
        "avoidWith: []",
        "promptFragment: seated three-quarter portrait pose",
        "weight: 0.8"
      ].join("\n")
    );

    const logs: string[] = [];
    const plugin = createLocalAssetSourcePlugin();
    const result = await plugin.importSource(
      {
        sourceUri: rootDir,
        dryRun: { enabled: true, mode: "preview" }
      },
      createContext(logs)
    );

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.dryRun).toBe(true);
    expect(result.data.assets).toHaveLength(2);
    expect(result.data.assets[0]?.metadata).toMatchObject({
      category: "backgrounds",
      compatibleWith: ["outfits:minimal"],
      avoidWith: ["lighting:low-key"],
      promptFragment: "neutral studio wall with soft daylight",
      weight: 1.4
    });
    expect(result.data.assets[1]?.id).toBe("asset_poses_seated_three_quarter_pose");
    expect(logs.some((line) => line.includes("local asset source import completed"))).toBe(true);
  });

  it("reports invalid YAML files without crashing", async () => {
    await writeFile(
      join(rootDir, "makeup", "invalid.yaml"),
      [
        "title: ",
        "tags:",
        "  - makeup",
        "promptFragment: ",
        "weight: 2"
      ].join("\n")
    );
    await writeFile(
      join(rootDir, "camera", "valid.yaml"),
      [
        "title: 35mm soft portrait",
        "tags: [camera]",
        "compatibleWith: [poses:portrait]",
        "avoidWith: [backgrounds:busy]",
        "promptFragment: 35mm lens soft portrait framing",
        "weight: 1"
      ].join("\n")
    );

    const plugin = createLocalAssetSourcePlugin();
    const result = await plugin.importSource({ sourceUri: rootDir }, createContext());

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(result.data.assets).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.code).toBe("invalid_asset_yaml");
  });

  it("returns a clear error when the source root is missing", async () => {
    const plugin = createLocalAssetSourcePlugin();
    const result = await plugin.importSource({ sourceUri: join(rootDir, "missing") }, createContext());

    if (result.ok) {
      throw new Error("Expected missing root import to fail.");
    }

    expect(result.error.code).toBe("local_asset_source_missing_root");
    expect(result.error.retryable).toBe(false);
  });
});

function createContext(logs: string[] = []): PluginContext {
  return {
    workspaceId: "test",
    pluginId: localAssetSourceManifest.id,
    manifest: localAssetSourceManifest,
    permissions: localAssetSourceManifest.permissions,
    dryRun: false,
    logger: {
      debug: (message) => logs.push(message),
      info: (message) => logs.push(message),
      warn: (message) => logs.push(message),
      error: (message) => logs.push(message)
    }
  };
}
