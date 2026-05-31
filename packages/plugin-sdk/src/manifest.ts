import { z } from "zod";
import { PluginManifestError } from "./errors.js";
import { PluginPermissionSchema, type PluginPermission } from "./permissions.js";

const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,127}$/;

export const PluginTypeSchema = z.enum([
  "source_importer",
  "media_generator",
  "copy_generator",
  "validator",
  "scheduler_policy",
  "publisher",
  "analytics",
  "ui_extension"
]);
export type PluginType = z.infer<typeof PluginTypeSchema>;

export const PluginDistributionSchema = z.enum(["official", "community", "private"]);
export type PluginDistribution = z.infer<typeof PluginDistributionSchema>;

export const PluginCapabilitySchema = z
  .object({
    id: z.string().trim().min(2).max(120),
    description: z.string().trim().min(1).max(500).optional()
  })
  .strict();
export type PluginCapability = z.infer<typeof PluginCapabilitySchema>;

export const UiExtensionPointSchema = z.enum([
  "candidate.detail.panel",
  "concept.detail.panel",
  "asset.detail.panel",
  "schedule.sidebar",
  "settings.plugins.panel"
]);
export type UiExtensionPoint = z.infer<typeof UiExtensionPointSchema>;

export const PluginManifestSchema = z
  .object({
    schemaVersion: z.literal("ig-manager.plugin.v1"),
    id: z
      .string()
      .trim()
      .regex(PLUGIN_ID_PATTERN, "Plugin id must be lowercase and may include dots, underscores, and hyphens."),
    name: z.string().trim().min(1).max(120),
    version: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(1000),
    type: PluginTypeSchema,
    distribution: PluginDistributionSchema.default("community"),
    private: z.boolean().default(false),
    officialApiOnly: z.boolean().default(false),
    entry: z.string().trim().min(1).max(500).optional(),
    permissions: z.array(PluginPermissionSchema).min(1),
    capabilities: z.array(PluginCapabilitySchema).min(1),
    uiExtensionPoints: z.array(UiExtensionPointSchema).default([]),
    dryRun: z
      .object({
        supported: z.boolean(),
        modes: z.array(z.enum(["validate_only", "preview", "no_write"])).default([])
      })
      .strict()
      .default({ supported: true, modes: ["validate_only"] }),
    author: z
      .object({
        name: z.string().trim().min(1).max(120),
        url: z.string().url().optional()
      })
      .strict()
      .optional(),
    homepage: z.string().url().optional(),
    repository: z.string().url().optional(),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()
  .superRefine((manifest, ctx) => {
    const required = REQUIRED_PERMISSIONS_BY_TYPE[manifest.type];
    const granted = new Set(manifest.permissions);

    for (const permission of required) {
      if (!granted.has(permission)) {
        ctx.addIssue({
          code: "custom",
          path: ["permissions"],
          message: `Plugin type '${manifest.type}' requires permission '${permission}'.`
        });
      }
    }

    if (manifest.type === "publisher" && !manifest.officialApiOnly) {
      ctx.addIssue({
        code: "custom",
        path: ["officialApiOnly"],
        message: "Publisher plugins must declare officialApiOnly: true."
      });
    }

    if (manifest.type === "ui_extension" && manifest.uiExtensionPoints.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["uiExtensionPoints"],
        message: "UI extension plugins must declare at least one extension point."
      });
    }
  });

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export const REQUIRED_PERMISSIONS_BY_TYPE: Record<PluginType, readonly PluginPermission[]> = {
  source_importer: ["source:import"],
  media_generator: ["media:generate", "asset:write"],
  copy_generator: ["copy:generate", "candidate:write"],
  validator: ["validator:run"],
  scheduler_policy: ["scheduler:policy"],
  publisher: ["candidate:read", "publish:validate", "publish:approved"],
  analytics: ["analytics:read", "analytics:export"],
  ui_extension: ["ui:render"]
};

export function parsePluginManifest(input: unknown): PluginManifest {
  const result = PluginManifestSchema.safeParse(input);

  if (!result.success) {
    throw new PluginManifestError("Invalid plugin manifest.", result.error);
  }

  return result.data;
}

