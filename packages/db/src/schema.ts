import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";
import type {
  AccountStatus,
  AssetType,
  AutomationPolicy,
  CandidateStatus,
  FirstComment,
  Permission,
  PluginType,
  PublishJobStatus,
  Rights,
  SchedulePolicy
} from "@ig-manager/domain";

type JsonRecord = Record<string, unknown>;

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey().notNull(),
    platformId: text("platform_id").notNull(),
    platformDisplayName: text("platform_display_name").notNull(),
    platformOfficialApiBaseUrl: text("platform_official_api_base_url"),
    platformMetadata: text("platform_metadata", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    externalAccountId: text("external_account_id"),
    handle: text("handle").notNull(),
    displayName: text("display_name"),
    status: text("status").$type<AccountStatus>().notNull(),
    automationPolicy: text("automation_policy", { mode: "json" }).$type<AutomationPolicy>().notNull(),
    schedulePolicy: text("schedule_policy", { mode: "json" }).$type<SchedulePolicy>().notNull(),
    pluginRegistrationIds: text("plugin_registration_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    notes: text("notes"),
    metadata: text("metadata", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    connectedAt: text("connected_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    index("accounts_platform_idx").on(table.platformId),
    index("accounts_status_idx").on(table.status),
    uniqueIndex("accounts_platform_handle_idx").on(table.platformId, table.handle)
  ]
);

export const concepts = sqliteTable(
  "concepts",
  {
    id: text("id").primaryKey().notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    audience: text("audience").notNull(),
    pillars: text("pillars", { mode: "json" }).$type<string[]>().notNull(),
    voice: text("voice").notNull(),
    visualGuidelines: text("visual_guidelines"),
    captionGuidelines: text("caption_guidelines"),
    negativeGuidelines: text("negative_guidelines", { mode: "json" }).$type<string[]>().notNull().default([]),
    referenceAssetIds: text("reference_asset_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    recipeIds: text("recipe_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    metadata: text("metadata", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    archivedAt: text("archived_at")
  },
  (table) => [
    index("concepts_account_idx").on(table.accountId),
    index("concepts_name_idx").on(table.name)
  ]
);

export const contentAssets = sqliteTable(
  "content_assets",
  {
    id: text("id").primaryKey().notNull(),
    type: text("type").$type<AssetType>().notNull(),
    uri: text("uri").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    accountIds: text("account_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    conceptIds: text("concept_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    primaryAccountId: text("primary_account_id"),
    primaryConceptId: text("primary_concept_id"),
    rights: text("rights", { mode: "json" }).$type<Rights>().notNull().default({ usage: "unknown" }),
    checksum: text("checksum"),
    metadata: text("metadata", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    importedAt: text("imported_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    index("content_assets_type_idx").on(table.type),
    index("content_assets_primary_account_idx").on(table.primaryAccountId),
    index("content_assets_primary_concept_idx").on(table.primaryConceptId)
  ]
);

export const contentRecipes = sqliteTable(
  "content_recipes",
  {
    id: text("id").primaryKey().notNull(),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    contentPillars: text("content_pillars", { mode: "json" }).$type<string[]>().notNull(),
    requiredAssetTypes: text("required_asset_types", { mode: "json" }).$type<AssetType[]>().notNull().default([]),
    format: text("format").notNull(),
    instructions: text("instructions", { mode: "json" }).$type<string[]>().notNull(),
    reviewChecklist: text("review_checklist", { mode: "json" }).$type<string[]>().notNull().default([]),
    metadata: text("metadata", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    archivedAt: text("archived_at")
  },
  (table) => [
    index("content_recipes_concept_idx").on(table.conceptId),
    index("content_recipes_format_idx").on(table.format)
  ]
);

export const postCandidates = sqliteTable(
  "post_candidates",
  {
    id: text("id").primaryKey().notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    recipeId: text("recipe_id").references(() => contentRecipes.id, { onDelete: "set null" }),
    assetIds: text("asset_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    status: text("status").$type<CandidateStatus>().notNull(),
    format: text("format").notNull(),
    caption: text("caption").notNull(),
    firstComment: text("first_comment", { mode: "json" }).$type<FirstComment>(),
    internalNotes: text("internal_notes"),
    provenance: text("provenance", { mode: "json" })
      .$type<{
        source: "manual" | "plugin";
        pluginRegistrationId?: string;
        sourceAssetIds: string[];
        sourceReferenceIds: string[];
        notes?: string;
      }>()
      .notNull()
      .default({ source: "manual", sourceAssetIds: [], sourceReferenceIds: [] }),
    scheduledAt: text("scheduled_at"),
    approvedAt: text("approved_at"),
    approvedBy: text("approved_by"),
    rejectedAt: text("rejected_at"),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    metadata: text("metadata", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    index("post_candidates_account_idx").on(table.accountId),
    index("post_candidates_concept_idx").on(table.conceptId),
    index("post_candidates_status_idx").on(table.status),
    index("post_candidates_scheduled_at_idx").on(table.scheduledAt)
  ]
);

export const plugins = sqliteTable(
  "plugins",
  {
    id: text("id").primaryKey().notNull(),
    pluginId: text("plugin_id").notNull(),
    name: text("name").notNull(),
    version: text("version").notNull(),
    type: text("type").$type<PluginType>().notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull(),
    officialApiOnly: integer("official_api_only", { mode: "boolean" }).notNull().default(false),
    capabilities: text("capabilities", { mode: "json" }).$type<string[]>().notNull().default([]),
    settingsRef: text("settings_ref"),
    metadata: text("metadata", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    index("plugins_type_idx").on(table.type),
    index("plugins_enabled_type_idx").on(table.enabled, table.type),
    uniqueIndex("plugins_plugin_id_idx").on(table.pluginId)
  ]
);

export const pluginPermissions = sqliteTable(
  "plugin_permissions",
  {
    pluginRegistrationId: text("plugin_registration_id")
      .notNull()
      .references(() => plugins.id, { onDelete: "cascade" }),
    permission: text("permission").$type<Permission>().notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => [
    primaryKey({ columns: [table.pluginRegistrationId, table.permission] }),
    index("plugin_permissions_permission_idx").on(table.permission)
  ]
);

export const publishJobs = sqliteTable(
  "publish_jobs",
  {
    id: text("id").primaryKey().notNull(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => postCandidates.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    pluginRegistrationId: text("plugin_registration_id")
      .notNull()
      .references(() => plugins.id, { onDelete: "cascade" }),
    status: text("status").$type<PublishJobStatus>().notNull(),
    scheduledAt: text("scheduled_at").notNull(),
    attempt: integer("attempt").notNull(),
    maxAttempts: integer("max_attempts").notNull(),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
    retryAfter: text("retry_after"),
    lastError: text("last_error", { mode: "json" }).$type<{
      code?: string;
      message: string;
      retryable: boolean;
    }>(),
    result: text("result", { mode: "json" }).$type<{
      externalPostId?: string;
      permalink?: string;
      rawResultRef?: string;
    }>(),
    metadata: text("metadata", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    index("publish_jobs_status_idx").on(table.status),
    index("publish_jobs_due_idx").on(table.status, table.scheduledAt, table.retryAfter),
    index("publish_jobs_candidate_idx").on(table.candidateId)
  ]
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey().notNull(),
    action: text("action").notNull(),
    actorId: text("actor_id"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: text("before", { mode: "json" }).$type<JsonRecord>(),
    after: text("after", { mode: "json" }).$type<JsonRecord>(),
    metadata: text("metadata", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    createdAt: text("created_at").notNull()
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt)
  ]
);

export const workflowEvents = sqliteTable(
  "workflow_events",
  {
    id: text("id").primaryKey().notNull(),
    type: text("type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    data: text("data", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    actorId: text("actor_id"),
    metadata: text("metadata", { mode: "json" }).$type<JsonRecord>().notNull().default({}),
    occurredAt: text("occurred_at").notNull()
  },
  (table) => [
    index("workflow_events_type_idx").on(table.type),
    index("workflow_events_entity_idx").on(table.entityType, table.entityId),
    index("workflow_events_occurred_at_idx").on(table.occurredAt)
  ]
);

export const schema = {
  accounts,
  auditLogs,
  concepts,
  contentAssets,
  contentRecipes,
  pluginPermissions,
  plugins,
  postCandidates,
  publishJobs,
  workflowEvents
};

export type Schema = typeof schema;

