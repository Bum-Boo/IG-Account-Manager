import {
  createAccount,
  createAuditLog,
  createConcept,
  createContentAsset,
  createContentRecipe,
  createPluginRegistration,
  createPostCandidate,
  createPublishJob,
  type Account,
  type AuditLog,
  type Concept,
  type ContentAsset,
  type ContentRecipe,
  type PluginRegistration,
  type PostCandidate,
  type PublishJob
} from "@ig-manager/domain";

export interface DemoData {
  accounts: Account[];
  concepts: Concept[];
  assets: ContentAsset[];
  recipes: ContentRecipe[];
  candidates: PostCandidate[];
  plugins: PluginRegistration[];
  publishJobs: PublishJob[];
  auditLogs: AuditLog[];
}

const now = "2026-05-31T00:00:00.000Z";
const platform = {
  id: "instagram",
  displayName: "Instagram",
  officialApiBaseUrl: "https://graph.facebook.com",
  metadata: {}
};

export function createDemoData(): DemoData {
  const accounts = [
    createAccount({
      id: "account_studio",
      platform,
      externalAccountId: "external_studio",
      handle: "studio_ops",
      displayName: "Studio Ops",
      status: "connected",
      connectedAt: now,
      schedulePolicy: {
        timezone: "UTC",
        minLeadTimeMinutes: 30,
        maxPostsPerDay: 4,
        allowedWeekdays: [1, 2, 3, 4, 5],
        allowedTimeWindows: [{ start: "09:00", end: "17:00" }]
      },
      createdAt: now,
      updatedAt: now
    }),
    createAccount({
      id: "account_field_notes",
      platform,
      handle: "field_notes_daily",
      displayName: "Field Notes Daily",
      status: "draft",
      schedulePolicy: {
        timezone: "UTC",
        minLeadTimeMinutes: 30,
        maxPostsPerDay: 2,
        allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
        allowedTimeWindows: [{ start: "08:00", end: "20:00" }]
      },
      createdAt: now,
      updatedAt: now
    })
  ];

  const concepts = [
    createConcept({
      id: "concept_workflow",
      accountId: "account_studio",
      name: "Workflow Notes",
      description: "Short operational posts about repeatable content systems.",
      audience: "Small teams operating several content concepts.",
      pillars: ["workflow", "review", "scheduling"],
      voice: "Concise and practical.",
      createdAt: now,
      updatedAt: now
    }),
    createConcept({
      id: "concept_assets",
      accountId: "account_studio",
      name: "Asset Library",
      description: "Posts that explain content asset reuse and reference hygiene.",
      audience: "Creators with growing media libraries.",
      pillars: ["assets", "references"],
      voice: "Clear and concrete.",
      createdAt: now,
      updatedAt: now
    }),
    createConcept({
      id: "concept_field",
      accountId: "account_field_notes",
      name: "Daily Field Notes",
      description: "Quiet daily observations from production work.",
      audience: "Independent creators building operating habits.",
      pillars: ["habit", "observation"],
      voice: "Reflective but direct.",
      createdAt: now,
      updatedAt: now
    })
  ];

  const assets = [
    createContentAsset({
      id: "asset_workflow_board",
      type: "image",
      uri: "file://assets/workflow-board.png",
      title: "Workflow board",
      tags: ["workflow", "planning"],
      accountIds: ["account_studio"],
      conceptIds: ["concept_workflow"],
      rights: { usage: "owned" },
      importedAt: now,
      createdAt: now,
      updatedAt: now
    }),
    createContentAsset({
      id: "asset_studio_template",
      type: "template",
      uri: "file://assets/studio-template.fig",
      title: "Studio template",
      tags: ["template"],
      accountIds: ["account_studio"],
      conceptIds: [],
      rights: { usage: "owned" },
      importedAt: now,
      createdAt: now,
      updatedAt: now
    }),
    createContentAsset({
      id: "asset_asset_tags",
      type: "image",
      uri: "file://assets/tags.png",
      title: "Asset tags",
      tags: ["assets"],
      accountIds: ["account_studio"],
      conceptIds: ["concept_assets"],
      rights: { usage: "owned" },
      importedAt: now,
      createdAt: now,
      updatedAt: now
    }),
    createContentAsset({
      id: "asset_field_photo",
      type: "image",
      uri: "file://assets/field-photo.png",
      title: "Field photo",
      tags: ["field"],
      accountIds: ["account_field_notes"],
      conceptIds: ["concept_field"],
      rights: { usage: "owned" },
      importedAt: now,
      createdAt: now,
      updatedAt: now
    })
  ];

  const recipes = [
    createContentRecipe({
      id: "recipe_checklist",
      conceptId: "concept_workflow",
      name: "Checklist Post",
      summary: "A compact checklist format for workflow concepts.",
      contentPillars: ["workflow"],
      requiredAssetTypes: ["image"],
      format: "feed_image",
      instructions: ["Pick one workflow point.", "Pair it with a clear visual.", "End with one review question."],
      reviewChecklist: ["Matches concept voice", "No unsupported publishing assumptions"],
      createdAt: now,
      updatedAt: now
    }),
    createContentRecipe({
      id: "recipe_field_note",
      conceptId: "concept_field",
      name: "Field Note",
      summary: "A short observation-driven post.",
      contentPillars: ["observation"],
      requiredAssetTypes: ["image"],
      format: "feed_image",
      instructions: ["Choose one observation.", "Keep the caption grounded."],
      createdAt: now,
      updatedAt: now
    })
  ];

  const candidates = [
    createPostCandidate({
      id: "candidate_workflow_ready",
      accountId: "account_studio",
      conceptId: "concept_workflow",
      recipeId: "recipe_checklist",
      assetIds: ["asset_workflow_board"],
      status: "ready_for_review",
      format: "feed_image",
      caption: "A content queue is useful only when review state is visible.",
      createdAt: now,
      updatedAt: now
    }),
    createPostCandidate({
      id: "candidate_workflow_scheduled",
      accountId: "account_studio",
      conceptId: "concept_workflow",
      recipeId: "recipe_checklist",
      assetIds: ["asset_studio_template"],
      status: "scheduled",
      format: "feed_image",
      caption: "Schedule from approved work, not from loose drafts.",
      scheduledAt: "2026-06-01T10:00:00.000Z",
      approvedAt: "2026-05-31T01:00:00.000Z",
      approvedBy: "seed",
      createdAt: now,
      updatedAt: now
    }),
    createPostCandidate({
      id: "candidate_field_draft",
      accountId: "account_field_notes",
      conceptId: "concept_field",
      recipeId: "recipe_field_note",
      assetIds: ["asset_field_photo"],
      status: "draft",
      format: "feed_image",
      caption: "The daily note starts with one concrete observation.",
      createdAt: now,
      updatedAt: now
    })
  ];

  const plugins = [
    createPluginRegistration({
      id: "plugin_official_publisher",
      pluginId: "official.publisher.demo",
      name: "Official Publisher Demo",
      version: "0.1.0",
      type: "publisher",
      enabled: true,
      officialApiOnly: true,
      capabilities: ["publish", "validate"],
      permissions: ["account:read", "candidate:read", "publish:approved"],
      settingsRef: "secret-store://official.publisher.demo",
      metadata: {
        token: "must-not-be-returned",
        publicLabel: "demo"
      },
      createdAt: now,
      updatedAt: now
    }),
    createPluginRegistration({
      id: "plugin_analytics_disabled",
      pluginId: "analytics.demo",
      name: "Analytics Demo",
      version: "0.1.0",
      type: "analytics",
      enabled: false,
      officialApiOnly: true,
      capabilities: ["metrics"],
      permissions: ["analytics:read"],
      createdAt: now,
      updatedAt: now
    })
  ];

  const publishJobs = [
    createPublishJob({
      id: "job_due",
      candidateId: "candidate_workflow_scheduled",
      accountId: "account_studio",
      pluginRegistrationId: "plugin_official_publisher",
      status: "queued",
      scheduledAt: "2026-06-01T10:00:00.000Z",
      maxAttempts: 3,
      createdAt: now,
      updatedAt: now
    }),
    createPublishJob({
      id: "job_future",
      candidateId: "candidate_workflow_scheduled",
      accountId: "account_studio",
      pluginRegistrationId: "plugin_official_publisher",
      status: "queued",
      scheduledAt: "2026-06-03T10:00:00.000Z",
      maxAttempts: 3,
      createdAt: now,
      updatedAt: now
    })
  ];

  const auditLogs = [
    createAuditLog({
      id: "audit_seed_created",
      action: "seed.created",
      actorId: "seed",
      entityType: "workspace",
      entityId: "demo",
      metadata: { source: "seed" },
      createdAt: now
    })
  ];

  return {
    accounts,
    concepts,
    assets,
    recipes,
    candidates,
    plugins,
    publishJobs,
    auditLogs
  };
}

