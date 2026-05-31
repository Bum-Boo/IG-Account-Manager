import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PluginManifestError,
  PluginPermissionError,
  parsePluginManifest,
  requirePermission,
  requirePermissions
} from "./index.js";

const validPublisherManifest = {
  schemaVersion: "ig-manager.plugin.v1",
  id: "mock.publisher",
  name: "Mock Publisher",
  version: "0.1.0",
  description: "A dry-run publisher for SDK tests.",
  type: "publisher",
  distribution: "community",
  officialApiOnly: true,
  permissions: ["candidate:read", "publish:validate", "publish:approved"],
  capabilities: [{ id: "publish.mock", description: "Mock publish action." }],
  dryRun: { supported: true, modes: ["validate_only", "preview", "no_write"] }
};
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("plugin manifest schema", () => {
  it("passes a valid manifest", () => {
    const manifest = parsePluginManifest(validPublisherManifest);

    expect(manifest.id).toBe("mock.publisher");
    expect(manifest.type).toBe("publisher");
    expect(manifest.private).toBe(false);
  });

  it("fails an invalid manifest", () => {
    expect(() =>
      parsePluginManifest({
        schemaVersion: "ig-manager.plugin.v1",
        id: "Invalid Plugin Id",
        name: "",
        version: "",
        description: "Invalid manifest.",
        type: "publisher",
        officialApiOnly: true,
        permissions: ["candidate:read", "publish:validate", "publish:approved"],
        capabilities: [{ id: "publish.mock" }]
      })
    ).toThrow(PluginManifestError);
  });

  it("fails when required permissions are missing", () => {
    expect(() =>
      parsePluginManifest({
        ...validPublisherManifest,
        permissions: ["candidate:read", "publish:validate"]
      })
    ).toThrow(PluginManifestError);

    expect(() => requirePermission(["candidate:read"], "publish:approved")).toThrow(
      PluginPermissionError
    );
    expect(() => requirePermissions(["candidate:read"], ["candidate:read"])).not.toThrow();
  });

  it("fails unknown plugin types", () => {
    expect(() =>
      parsePluginManifest({
        ...validPublisherManifest,
        type: "stealth_browser"
      })
    ).toThrow(PluginManifestError);
  });

  it("recognizes private plugin flag", () => {
    const manifest = parsePluginManifest({
      schemaVersion: "ig-manager.plugin.v1",
      id: "private.caption.factory",
      name: "Private Caption Factory",
      version: "0.1.0",
      description: "Private copy-generation plugin.",
      type: "copy_generator",
      distribution: "private",
      private: true,
      permissions: ["copy:generate", "candidate:write"],
      capabilities: [{ id: "copy.caption" }]
    });

    expect(manifest.private).toBe(true);
    expect(manifest.distribution).toBe("private");
  });

  it("validates bundled example manifests", () => {
    const examplePaths = [
      "plugins/examples/mock-publisher/plugin.json",
      "plugins/examples/caption-tone-plugin/plugin.json",
      "plugins/examples/analytics-csv-exporter/plugin.json"
    ];

    const manifests = examplePaths.map((examplePath) =>
      parsePluginManifest(JSON.parse(readFileSync(resolve(repoRoot, examplePath), "utf8")))
    );

    expect(manifests.map((manifest) => manifest.id)).toEqual([
      "mock.publisher",
      "caption.tone",
      "analytics.csv-exporter"
    ]);
  });
});
