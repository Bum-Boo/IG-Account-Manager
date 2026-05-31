import { z } from "zod";
import {
  AccountStatusSchema,
  AssetTypeSchema,
  AutomationPolicySchema,
  CandidateStatusSchema,
  IdSchema,
  ISODateTimeSchema,
  PermissionSchema,
  PlatformSchema,
  PluginTypeSchema,
  PublishJobStatusSchema,
  SchedulePolicySchema
} from "./value-objects.js";

export const RightsSchema = z
  .object({
    usage: z.enum(["owned", "licensed", "reference_only", "unknown"]).default("unknown"),
    source: z.string().trim().max(500).optional(),
    expiresAt: ISODateTimeSchema.optional()
  })
  .strict();
export type Rights = z.infer<typeof RightsSchema>;

export const AccountSchema = z
  .object({
    id: IdSchema,
    platform: PlatformSchema,
    externalAccountId: z.string().trim().min(1).max(256).optional(),
    handle: z.string().trim().min(1).max(120),
    displayName: z.string().trim().min(1).max(120).optional(),
    status: AccountStatusSchema,
    automationPolicy: AutomationPolicySchema,
    schedulePolicy: SchedulePolicySchema,
    pluginRegistrationIds: z.array(IdSchema).default([]),
    notes: z.string().max(5000).optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    connectedAt: ISODateTimeSchema.optional(),
    createdAt: ISODateTimeSchema,
    updatedAt: ISODateTimeSchema
  })
  .strict();
export type Account = z.infer<typeof AccountSchema>;

export const ConceptSchema = z
  .object({
    id: IdSchema,
    accountId: IdSchema,
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(1).max(1000),
    audience: z.string().trim().min(1).max(1000),
    pillars: z.array(z.string().trim().min(1).max(120)).min(1),
    voice: z.string().trim().min(1).max(1000),
    visualGuidelines: z.string().trim().max(2000).optional(),
    captionGuidelines: z.string().trim().max(2000).optional(),
    negativeGuidelines: z.array(z.string().trim().min(1).max(300)).default([]),
    referenceAssetIds: z.array(IdSchema).default([]),
    recipeIds: z.array(IdSchema).default([]),
    metadata: z.record(z.string(), z.unknown()).default({}),
    createdAt: ISODateTimeSchema,
    updatedAt: ISODateTimeSchema,
    archivedAt: ISODateTimeSchema.optional()
  })
  .strict();
export type Concept = z.infer<typeof ConceptSchema>;

export const ContentAssetSchema = z
  .object({
    id: IdSchema,
    type: AssetTypeSchema,
    uri: z.string().trim().min(1).max(2000),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(80)).default([]),
    accountIds: z.array(IdSchema).default([]),
    conceptIds: z.array(IdSchema).default([]),
    rights: RightsSchema.default({ usage: "unknown" }),
    checksum: z.string().trim().min(1).max(256).optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    importedAt: ISODateTimeSchema,
    createdAt: ISODateTimeSchema,
    updatedAt: ISODateTimeSchema
  })
  .strict();
export type ContentAsset = z.infer<typeof ContentAssetSchema>;

export const ContentRecipeSchema = z
  .object({
    id: IdSchema,
    conceptId: IdSchema,
    name: z.string().trim().min(2).max(120),
    summary: z.string().trim().min(1).max(1000),
    contentPillars: z.array(z.string().trim().min(1).max(120)).min(1),
    requiredAssetTypes: z.array(AssetTypeSchema).default([]),
    format: z.string().trim().min(1).max(120),
    instructions: z.array(z.string().trim().min(1).max(500)).min(1),
    reviewChecklist: z.array(z.string().trim().min(1).max(300)).default([]),
    metadata: z.record(z.string(), z.unknown()).default({}),
    createdAt: ISODateTimeSchema,
    updatedAt: ISODateTimeSchema,
    archivedAt: ISODateTimeSchema.optional()
  })
  .strict();
export type ContentRecipe = z.infer<typeof ContentRecipeSchema>;

export const FirstCommentSchema = z
  .object({
    text: z.string().trim().min(1).max(2200),
    createdBy: z.string().trim().min(1).max(120).optional(),
    createdAt: ISODateTimeSchema
  })
  .strict();
export type FirstComment = z.infer<typeof FirstCommentSchema>;

export const PostCandidateSchema = z
  .object({
    id: IdSchema,
    accountId: IdSchema,
    conceptId: IdSchema,
    recipeId: IdSchema.optional(),
    assetIds: z.array(IdSchema).default([]),
    status: CandidateStatusSchema,
    format: z.string().trim().min(1).max(120),
    caption: z.string().trim().min(1).max(10000),
    firstComment: FirstCommentSchema.optional(),
    internalNotes: z.string().trim().max(5000).optional(),
    provenance: z
      .object({
        source: z.enum(["manual", "plugin"]).default("manual"),
        pluginRegistrationId: IdSchema.optional(),
        sourceAssetIds: z.array(IdSchema).default([]),
        sourceReferenceIds: z.array(IdSchema).default([]),
        notes: z.string().trim().max(2000).optional()
      })
      .strict()
      .default({ source: "manual", sourceAssetIds: [], sourceReferenceIds: [] }),
    scheduledAt: ISODateTimeSchema.optional(),
    approvedAt: ISODateTimeSchema.optional(),
    approvedBy: z.string().trim().min(1).max(120).optional(),
    rejectedAt: ISODateTimeSchema.optional(),
    rejectedBy: z.string().trim().min(1).max(120).optional(),
    rejectionReason: z.string().trim().min(1).max(2000).optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    createdAt: ISODateTimeSchema,
    updatedAt: ISODateTimeSchema
  })
  .strict();
export type PostCandidate = z.infer<typeof PostCandidateSchema>;

export const PublishJobSchema = z
  .object({
    id: IdSchema,
    candidateId: IdSchema,
    accountId: IdSchema,
    pluginRegistrationId: IdSchema,
    status: PublishJobStatusSchema,
    scheduledAt: ISODateTimeSchema,
    attempt: z.number().int().min(0),
    maxAttempts: z.number().int().min(1).max(20).default(3),
    startedAt: ISODateTimeSchema.optional(),
    finishedAt: ISODateTimeSchema.optional(),
    retryAfter: ISODateTimeSchema.optional(),
    lastError: z
      .object({
        code: z.string().trim().min(1).max(120).optional(),
        message: z.string().trim().min(1).max(2000),
        retryable: z.boolean().default(false)
      })
      .strict()
      .optional(),
    result: z
      .object({
        externalPostId: z.string().trim().min(1).max(256).optional(),
        permalink: z.string().url().optional(),
        rawResultRef: z.string().trim().min(1).max(500).optional()
      })
      .strict()
      .optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    createdAt: ISODateTimeSchema,
    updatedAt: ISODateTimeSchema
  })
  .strict();
export type PublishJob = z.infer<typeof PublishJobSchema>;

export const PluginRegistrationSchema = z
  .object({
    id: IdSchema,
    pluginId: z.string().trim().min(3).max(120),
    name: z.string().trim().min(1).max(120),
    version: z.string().trim().min(1).max(80),
    type: PluginTypeSchema,
    enabled: z.boolean(),
    officialApiOnly: z.boolean().default(false),
    capabilities: z.array(z.string().trim().min(1).max(120)).default([]),
    permissions: z.array(PermissionSchema).default([]),
    settingsRef: z.string().trim().min(1).max(500).optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    createdAt: ISODateTimeSchema,
    updatedAt: ISODateTimeSchema
  })
  .strict()
  .superRefine((plugin, ctx) => {
    if (plugin.type === "publisher" && !plugin.officialApiOnly) {
      ctx.addIssue({
        code: "custom",
        path: ["officialApiOnly"],
        message: "Publisher plugins must declare official API usage only."
      });
    }
  });
export type PluginRegistration = z.infer<typeof PluginRegistrationSchema>;

export const AuditLogSchema = z
  .object({
    id: IdSchema,
    action: z.string().trim().min(1).max(160),
    actorId: z.string().trim().min(1).max(120).optional(),
    entityType: z.string().trim().min(1).max(120),
    entityId: IdSchema,
    before: z.record(z.string(), z.unknown()).optional(),
    after: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    createdAt: ISODateTimeSchema
  })
  .strict();
export type AuditLog = z.infer<typeof AuditLogSchema>;

