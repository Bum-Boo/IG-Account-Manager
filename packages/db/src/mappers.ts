import {
  AccountSchema,
  AuditLogSchema,
  ConceptSchema,
  ContentAssetSchema,
  ContentRecipeSchema,
  PluginRegistrationSchema,
  PostCandidateSchema,
  PublishJobSchema,
  type Account,
  type AuditLog,
  type Concept,
  type ContentAsset,
  type ContentRecipe,
  type PluginRegistration,
  type PostCandidate,
  type PublishJob
} from "@ig-manager/domain";
import type {
  accounts,
  auditLogs,
  concepts,
  contentAssets,
  contentRecipes,
  plugins,
  postCandidates,
  publishJobs
} from "./schema.js";

type AccountRow = typeof accounts.$inferSelect;
type ConceptRow = typeof concepts.$inferSelect;
type ContentAssetRow = typeof contentAssets.$inferSelect;
type ContentRecipeRow = typeof contentRecipes.$inferSelect;
type PostCandidateRow = typeof postCandidates.$inferSelect;
type PublishJobRow = typeof publishJobs.$inferSelect;
type PluginRow = typeof plugins.$inferSelect;
type AuditLogRow = typeof auditLogs.$inferSelect;

type AccountInsert = typeof accounts.$inferInsert;
type ConceptInsert = typeof concepts.$inferInsert;
type ContentAssetInsert = typeof contentAssets.$inferInsert;
type ContentRecipeInsert = typeof contentRecipes.$inferInsert;
type PostCandidateInsert = typeof postCandidates.$inferInsert;
type PublishJobInsert = typeof publishJobs.$inferInsert;
type PluginInsert = typeof plugins.$inferInsert;
type AuditLogInsert = typeof auditLogs.$inferInsert;

const secretKeyPattern = /(token|secret|password|credential|api[_-]?key)/i;

export function toAccountRow(account: Account): AccountInsert {
  return {
    id: account.id,
    platformId: account.platform.id,
    platformDisplayName: account.platform.displayName,
    platformOfficialApiBaseUrl: account.platform.officialApiBaseUrl ?? null,
    platformMetadata: account.platform.metadata,
    externalAccountId: account.externalAccountId ?? null,
    handle: account.handle,
    displayName: account.displayName ?? null,
    status: account.status,
    automationPolicy: account.automationPolicy,
    schedulePolicy: account.schedulePolicy,
    pluginRegistrationIds: account.pluginRegistrationIds,
    notes: account.notes ?? null,
    metadata: account.metadata,
    connectedAt: account.connectedAt ?? null,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

export function fromAccountRow(row: AccountRow): Account {
  return AccountSchema.parse({
    id: row.id,
    platform: {
      id: row.platformId,
      displayName: row.platformDisplayName,
      officialApiBaseUrl: nullToUndefined(row.platformOfficialApiBaseUrl),
      metadata: row.platformMetadata
    },
    externalAccountId: nullToUndefined(row.externalAccountId),
    handle: row.handle,
    displayName: nullToUndefined(row.displayName),
    status: row.status,
    automationPolicy: row.automationPolicy,
    schedulePolicy: row.schedulePolicy,
    pluginRegistrationIds: row.pluginRegistrationIds,
    notes: nullToUndefined(row.notes),
    metadata: row.metadata,
    connectedAt: nullToUndefined(row.connectedAt),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
}

export function toConceptRow(concept: Concept): ConceptInsert {
  return {
    id: concept.id,
    accountId: concept.accountId,
    name: concept.name,
    description: concept.description,
    audience: concept.audience,
    pillars: concept.pillars,
    voice: concept.voice,
    visualGuidelines: concept.visualGuidelines ?? null,
    captionGuidelines: concept.captionGuidelines ?? null,
    negativeGuidelines: concept.negativeGuidelines,
    referenceAssetIds: concept.referenceAssetIds,
    recipeIds: concept.recipeIds,
    metadata: concept.metadata,
    createdAt: concept.createdAt,
    updatedAt: concept.updatedAt,
    archivedAt: concept.archivedAt ?? null
  };
}

export function fromConceptRow(row: ConceptRow): Concept {
  return ConceptSchema.parse({
    ...row,
    visualGuidelines: nullToUndefined(row.visualGuidelines),
    captionGuidelines: nullToUndefined(row.captionGuidelines),
    archivedAt: nullToUndefined(row.archivedAt)
  });
}

export function toContentAssetRow(asset: ContentAsset): ContentAssetInsert {
  return {
    id: asset.id,
    type: asset.type,
    uri: asset.uri,
    title: asset.title,
    description: asset.description ?? null,
    tags: asset.tags,
    accountIds: asset.accountIds,
    conceptIds: asset.conceptIds,
    primaryAccountId: asset.accountIds[0] ?? null,
    primaryConceptId: asset.conceptIds[0] ?? null,
    rights: asset.rights,
    checksum: asset.checksum ?? null,
    metadata: asset.metadata,
    importedAt: asset.importedAt,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt
  };
}

export function fromContentAssetRow(row: ContentAssetRow): ContentAsset {
  return ContentAssetSchema.parse({
    id: row.id,
    type: row.type,
    uri: row.uri,
    title: row.title,
    description: nullToUndefined(row.description),
    tags: row.tags,
    accountIds: row.accountIds,
    conceptIds: row.conceptIds,
    rights: row.rights,
    checksum: nullToUndefined(row.checksum),
    metadata: row.metadata,
    importedAt: row.importedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
}

export function toContentRecipeRow(recipe: ContentRecipe): ContentRecipeInsert {
  return {
    id: recipe.id,
    conceptId: recipe.conceptId,
    name: recipe.name,
    summary: recipe.summary,
    contentPillars: recipe.contentPillars,
    requiredAssetTypes: recipe.requiredAssetTypes,
    format: recipe.format,
    instructions: recipe.instructions,
    reviewChecklist: recipe.reviewChecklist,
    metadata: recipe.metadata,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    archivedAt: recipe.archivedAt ?? null
  };
}

export function fromContentRecipeRow(row: ContentRecipeRow): ContentRecipe {
  return ContentRecipeSchema.parse({
    ...row,
    archivedAt: nullToUndefined(row.archivedAt)
  });
}

export function toPostCandidateRow(candidate: PostCandidate): PostCandidateInsert {
  return {
    id: candidate.id,
    accountId: candidate.accountId,
    conceptId: candidate.conceptId,
    recipeId: candidate.recipeId ?? null,
    assetIds: candidate.assetIds,
    status: candidate.status,
    format: candidate.format,
    caption: candidate.caption,
    firstComment: candidate.firstComment ?? null,
    internalNotes: candidate.internalNotes ?? null,
    provenance: candidate.provenance,
    scheduledAt: candidate.scheduledAt ?? null,
    approvedAt: candidate.approvedAt ?? null,
    approvedBy: candidate.approvedBy ?? null,
    rejectedAt: candidate.rejectedAt ?? null,
    rejectedBy: candidate.rejectedBy ?? null,
    rejectionReason: candidate.rejectionReason ?? null,
    metadata: candidate.metadata,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt
  };
}

export function fromPostCandidateRow(row: PostCandidateRow): PostCandidate {
  return PostCandidateSchema.parse({
    ...row,
    recipeId: nullToUndefined(row.recipeId),
    firstComment: nullToUndefined(row.firstComment),
    internalNotes: nullToUndefined(row.internalNotes),
    scheduledAt: nullToUndefined(row.scheduledAt),
    approvedAt: nullToUndefined(row.approvedAt),
    approvedBy: nullToUndefined(row.approvedBy),
    rejectedAt: nullToUndefined(row.rejectedAt),
    rejectedBy: nullToUndefined(row.rejectedBy),
    rejectionReason: nullToUndefined(row.rejectionReason)
  });
}

export function toPublishJobRow(job: PublishJob): PublishJobInsert {
  return {
    id: job.id,
    candidateId: job.candidateId,
    accountId: job.accountId,
    pluginRegistrationId: job.pluginRegistrationId,
    status: job.status,
    scheduledAt: job.scheduledAt,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    startedAt: job.startedAt ?? null,
    finishedAt: job.finishedAt ?? null,
    retryAfter: job.retryAfter ?? null,
    lastError: job.lastError ?? null,
    result: job.result ?? null,
    metadata: job.metadata,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}

export function fromPublishJobRow(row: PublishJobRow): PublishJob {
  return PublishJobSchema.parse({
    ...row,
    startedAt: nullToUndefined(row.startedAt),
    finishedAt: nullToUndefined(row.finishedAt),
    retryAfter: nullToUndefined(row.retryAfter),
    lastError: nullToUndefined(row.lastError),
    result: nullToUndefined(row.result)
  });
}

export function toPluginRow(plugin: PluginRegistration): PluginInsert {
  return {
    id: plugin.id,
    pluginId: plugin.pluginId,
    name: plugin.name,
    version: plugin.version,
    type: plugin.type,
    enabled: plugin.enabled,
    officialApiOnly: plugin.officialApiOnly,
    capabilities: plugin.capabilities,
    settingsRef: plugin.settingsRef ?? null,
    metadata: sanitizeSecrets(plugin.metadata),
    createdAt: plugin.createdAt,
    updatedAt: plugin.updatedAt
  };
}

export function fromPluginRow(row: PluginRow, permissions: PluginRegistration["permissions"]): PluginRegistration {
  return PluginRegistrationSchema.parse({
    id: row.id,
    pluginId: row.pluginId,
    name: row.name,
    version: row.version,
    type: row.type,
    enabled: row.enabled,
    officialApiOnly: row.officialApiOnly,
    capabilities: row.capabilities,
    permissions,
    settingsRef: nullToUndefined(row.settingsRef),
    metadata: sanitizeSecrets(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
}

export function toAuditLogRow(entry: AuditLog): AuditLogInsert {
  return {
    id: entry.id,
    action: entry.action,
    actorId: entry.actorId ?? null,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    metadata: entry.metadata,
    createdAt: entry.createdAt
  };
}

export function fromAuditLogRow(row: AuditLogRow): AuditLog {
  return AuditLogSchema.parse({
    ...row,
    actorId: nullToUndefined(row.actorId),
    before: nullToUndefined(row.before),
    after: nullToUndefined(row.after)
  });
}

export function sanitizeSecrets(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !secretKeyPattern.test(key))
  );
}

function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

