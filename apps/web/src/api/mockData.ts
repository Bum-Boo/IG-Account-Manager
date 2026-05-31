import type { WorkspaceData } from "../types.js";

const now = "2026-05-31T00:00:00.000Z";

export const mockWorkspaceData: WorkspaceData = {
  accounts: [
    {
      id: "account_studio",
      platform: {
        id: "instagram",
        displayName: "Instagram",
        officialApiBaseUrl: "https://graph.facebook.com",
        metadata: {}
      },
      externalAccountId: "external_studio",
      handle: "studio_ops",
      displayName: "Studio Ops",
      status: "connected",
      automationPolicy: {
        candidateGeneration: "plugin_assisted",
        requireHumanApproval: true,
        allowAutoScheduling: true,
        allowAutoPublishing: false
      },
      schedulePolicy: {
        timezone: "UTC",
        minLeadTimeMinutes: 30,
        maxPostsPerDay: 4,
        allowedWeekdays: [1, 2, 3, 4, 5],
        allowedTimeWindows: [{ start: "09:00", end: "17:00" }],
        requireApprovedCandidate: true
      },
      pluginRegistrationIds: ["plugin_official_publisher"],
      notes: "Primary workflow and operations account.",
      metadata: {},
      connectedAt: now,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "account_field_notes",
      platform: { id: "instagram", displayName: "Instagram", metadata: {} },
      handle: "field_notes_daily",
      displayName: "Field Notes Daily",
      status: "draft",
      automationPolicy: {
        candidateGeneration: "manual",
        requireHumanApproval: true,
        allowAutoScheduling: false,
        allowAutoPublishing: false
      },
      schedulePolicy: {
        timezone: "UTC",
        minLeadTimeMinutes: 30,
        maxPostsPerDay: 2,
        allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
        allowedTimeWindows: [{ start: "08:00", end: "20:00" }],
        requireApprovedCandidate: true
      },
      pluginRegistrationIds: [],
      metadata: {},
      createdAt: now,
      updatedAt: now
    }
  ],
  concepts: [
    {
      id: "concept_workflow",
      accountId: "account_studio",
      name: "Workflow Notes",
      description: "Operational posts about repeatable content systems.",
      audience: "Small teams operating several content concepts.",
      pillars: ["workflow", "review", "scheduling"],
      voice: "Concise and practical.",
      visualGuidelines: "Screens, boards, and plain production artifacts with restrained annotation.",
      captionGuidelines: "Lead with one concrete operating point. Close with a review-oriented prompt.",
      negativeGuidelines: ["No growth-hack framing", "No platform-limit speculation"],
      referenceAssetIds: ["asset_workflow_board"],
      recipeIds: ["recipe_checklist"],
      metadata: {
        hashtagPolicy: "Use 3-5 narrow workflow tags. Avoid broad viral tags.",
        workflowPolicy: { autoSchedule: true, autoPublish: false },
        schedulePolicy: { cadence: "3 weekday posts", preferredWindow: "10:00-14:00 UTC" }
      },
      createdAt: now,
      updatedAt: now
    },
    {
      id: "concept_assets",
      accountId: "account_studio",
      name: "Asset Library",
      description: "Posts that explain asset reuse and reference hygiene.",
      audience: "Creators with growing media libraries.",
      pillars: ["assets", "rights", "reuse"],
      voice: "Clear and concrete.",
      visualGuidelines: "Close crops of file systems, contact sheets, and version labels.",
      captionGuidelines: "Use short captions with one source-control lesson.",
      negativeGuidelines: [],
      referenceAssetIds: ["asset_asset_tags"],
      recipeIds: [],
      metadata: {
        hashtagPolicy: "Prefer asset-management tags and content-ops tags.",
        workflowPolicy: { autoSchedule: false, autoPublish: false }
      },
      createdAt: now,
      updatedAt: now
    },
    {
      id: "concept_field",
      accountId: "account_field_notes",
      name: "Daily Field Notes",
      description: "Quiet daily observations from production work.",
      audience: "Independent creators building operating habits.",
      pillars: ["habit", "observation"],
      voice: "Reflective but direct.",
      visualGuidelines: "Natural light, single subject, minimal overlays.",
      captionGuidelines: "One observation, one implication, one next action.",
      negativeGuidelines: ["No generic inspiration quotes"],
      referenceAssetIds: ["asset_field_photo"],
      recipeIds: ["recipe_field_note"],
      metadata: {
        hashtagPolicy: "Use recurring branded tags plus one topic tag.",
        workflowPolicy: { autoSchedule: false, autoPublish: false }
      },
      createdAt: now,
      updatedAt: now
    }
  ],
  assets: [
    {
      id: "asset_workflow_board",
      type: "image",
      uri: "file://assets/workflow-board.png",
      title: "Workflow board",
      tags: ["workflow", "planning"],
      accountIds: ["account_studio"],
      conceptIds: ["concept_workflow"],
      rights: { usage: "owned" },
      metadata: {},
      importedAt: now,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "asset_studio_template",
      type: "template",
      uri: "file://assets/studio-template.fig",
      title: "Studio template",
      tags: ["template"],
      accountIds: ["account_studio"],
      conceptIds: [],
      rights: { usage: "owned" },
      metadata: {},
      importedAt: now,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "asset_generated_review_mock",
      type: "image",
      uri: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 900'%3E%3Crect width='900' height='900' fill='%23dfe7dd'/%3E%3Crect x='210' y='140' width='480' height='620' rx='34' fill='%23f9fbf7'/%3E%3Ccircle cx='450' cy='300' r='88' fill='%2394aa9b'/%3E%3Cpath d='M300 650c48-114 252-114 300 0' fill='%232d6c54' opacity='0.82'/%3E%3Ctext x='450' y='815' text-anchor='middle' font-family='Arial' font-size='38' fill='%23202522'%3EReview candidate%3C/text%3E%3C/svg%3E",
      title: "Generated review mock",
      description: "Mock generated visual for mobile review.",
      tags: ["generated", "review"],
      accountIds: ["account_studio"],
      conceptIds: ["concept_workflow"],
      rights: { usage: "owned", source: "mock" },
      metadata: {},
      importedAt: now,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "asset_asset_tags",
      type: "image",
      uri: "file://assets/tags.png",
      title: "Asset tags",
      tags: ["assets", "rights"],
      accountIds: ["account_studio"],
      conceptIds: ["concept_assets"],
      rights: { usage: "owned" },
      metadata: {},
      importedAt: now,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "asset_field_photo",
      type: "image",
      uri: "file://assets/field-photo.png",
      title: "Field photo",
      tags: ["field", "daily"],
      accountIds: ["account_field_notes"],
      conceptIds: ["concept_field"],
      rights: { usage: "owned" },
      metadata: {},
      importedAt: now,
      createdAt: now,
      updatedAt: now
    }
  ],
  recipes: [
    {
      id: "recipe_checklist",
      conceptId: "concept_workflow",
      name: "Checklist Post",
      summary: "A compact checklist format for workflow concepts.",
      contentPillars: ["workflow"],
      requiredAssetTypes: ["image"],
      format: "feed_image",
      instructions: ["Pick one workflow point.", "Pair it with a clear visual.", "End with one review question."],
      reviewChecklist: ["Matches concept voice", "No unsupported publishing assumptions"],
      metadata: {},
      createdAt: now,
      updatedAt: now
    },
    {
      id: "recipe_field_note",
      conceptId: "concept_field",
      name: "Field Note",
      summary: "A short observation-driven post.",
      contentPillars: ["observation"],
      requiredAssetTypes: ["image"],
      format: "feed_image",
      instructions: ["Choose one observation.", "Keep the caption grounded."],
      reviewChecklist: ["Specific observation", "No broad claim"],
      metadata: {},
      createdAt: now,
      updatedAt: now
    }
  ],
  candidates: [
    {
      id: "candidate_workflow_draft",
      accountId: "account_studio",
      conceptId: "concept_workflow",
      recipeId: "recipe_checklist",
      assetIds: ["asset_workflow_board"],
      status: "draft",
      format: "feed_image",
      caption: "A content queue is useful only when review state is visible.",
      provenance: { source: "manual", sourceAssetIds: [], sourceReferenceIds: [] },
      metadata: {},
      createdAt: now,
      updatedAt: now
    },
    {
      id: "candidate_workflow_ready",
      accountId: "account_studio",
      conceptId: "concept_workflow",
      recipeId: "recipe_checklist",
      assetIds: ["asset_generated_review_mock", "asset_studio_template"],
      status: "ready_for_review",
      format: "feed_image",
      caption: "Review queues work best when every post has one clear decision owner.\n\n#contentops #reviewflow #localfirst",
      firstComment: {
        text: "Selected assets: Studio template, generated review mock.",
        createdBy: "private.ai-content-factory",
        createdAt: "2026-05-31T01:00:00.000Z"
      },
      provenance: { source: "plugin", pluginRegistrationId: "plugin_private_factory", sourceAssetIds: [], sourceReferenceIds: [] },
      metadata: {
        aiContentFactory: {
          statusLabel: "needs_review",
          selectedAssetIds: ["asset_generated_review_mock", "asset_studio_template"],
          generatedAssetId: "asset_generated_review_mock",
          hashtags: ["contentops", "reviewflow", "localfirst"],
          selectionExplanation: {
            compatibilityScore: 0.92,
            diversityNotes: [{ assetId: "asset_studio_template", note: "Not used inside the diversity window." }]
          }
        }
      },
      createdAt: "2026-05-31T01:00:00.000Z",
      updatedAt: "2026-05-31T01:00:00.000Z"
    },
    {
      id: "candidate_assets_approved",
      accountId: "account_studio",
      conceptId: "concept_assets",
      assetIds: ["asset_asset_tags"],
      status: "approved",
      format: "feed_image",
      caption: "Rights metadata saves time only when it is attached before reuse.",
      provenance: { source: "manual", sourceAssetIds: [], sourceReferenceIds: [] },
      approvedAt: "2026-05-31T02:00:00.000Z",
      approvedBy: "reviewer",
      metadata: {},
      createdAt: "2026-05-31T02:00:00.000Z",
      updatedAt: "2026-05-31T02:00:00.000Z"
    },
    {
      id: "candidate_workflow_scheduled",
      accountId: "account_studio",
      conceptId: "concept_workflow",
      recipeId: "recipe_checklist",
      assetIds: ["asset_workflow_board"],
      status: "scheduled",
      format: "feed_image",
      caption: "Schedule from approved work, not from loose drafts.",
      provenance: { source: "manual", sourceAssetIds: [], sourceReferenceIds: [] },
      scheduledAt: "2026-06-01T10:00:00.000Z",
      approvedAt: "2026-05-31T03:00:00.000Z",
      approvedBy: "reviewer",
      metadata: {},
      createdAt: "2026-05-31T03:00:00.000Z",
      updatedAt: "2026-05-31T03:00:00.000Z"
    },
    {
      id: "candidate_field_published",
      accountId: "account_field_notes",
      conceptId: "concept_field",
      recipeId: "recipe_field_note",
      assetIds: ["asset_field_photo"],
      status: "published",
      format: "feed_image",
      caption: "The daily note starts with one concrete observation.",
      provenance: { source: "manual", sourceAssetIds: [], sourceReferenceIds: [] },
      scheduledAt: "2026-05-30T10:00:00.000Z",
      metadata: {},
      createdAt: "2026-05-30T00:00:00.000Z",
      updatedAt: "2026-05-30T10:00:00.000Z"
    },
    {
      id: "candidate_field_failed",
      accountId: "account_field_notes",
      conceptId: "concept_field",
      recipeId: "recipe_field_note",
      assetIds: ["asset_field_photo"],
      status: "publish_failed",
      format: "feed_image",
      caption: "A failed publish should return to operations, not disappear.",
      provenance: { source: "manual", sourceAssetIds: [], sourceReferenceIds: [] },
      scheduledAt: "2026-05-31T11:00:00.000Z",
      metadata: {},
      createdAt: "2026-05-31T04:00:00.000Z",
      updatedAt: "2026-05-31T11:05:00.000Z"
    }
  ],
  publishJobs: [
    {
      id: "job_due",
      candidateId: "candidate_workflow_scheduled",
      accountId: "account_studio",
      pluginRegistrationId: "plugin_official_publisher",
      status: "queued",
      scheduledAt: "2026-06-01T10:00:00.000Z",
      attempt: 0,
      maxAttempts: 3,
      metadata: { autoPublish: false },
      createdAt: now,
      updatedAt: now
    },
    {
      id: "job_failed",
      candidateId: "candidate_field_failed",
      accountId: "account_field_notes",
      pluginRegistrationId: "plugin_official_publisher",
      status: "retry_scheduled",
      scheduledAt: "2026-05-31T11:00:00.000Z",
      attempt: 1,
      maxAttempts: 3,
      retryAfter: "2026-05-31T12:00:00.000Z",
      lastError: { code: "temporary_failure", message: "Temporary publisher failure.", retryable: true },
      metadata: { autoPublish: false },
      createdAt: now,
      updatedAt: now
    }
  ],
  plugins: [
    {
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
      metadata: { publicLabel: "demo" },
      createdAt: now,
      updatedAt: now
    },
    {
      id: "plugin_private_factory",
      pluginId: "private.ai.content-factory",
      name: "Private Content Factory",
      version: "0.1.0",
      type: "candidate_generator",
      enabled: false,
      officialApiOnly: true,
      capabilities: ["generate_candidates"],
      permissions: ["concept:read", "asset:read", "candidate:write"],
      metadata: { private: true },
      createdAt: now,
      updatedAt: now
    }
  ],
  auditLogs: [
    {
      id: "audit_1",
      action: "candidate.approved",
      actorId: "reviewer",
      entityType: "candidate",
      entityId: "candidate_assets_approved",
      metadata: {},
      createdAt: "2026-05-31T02:00:00.000Z"
    },
    {
      id: "audit_2",
      action: "candidate.scheduled",
      actorId: "scheduler",
      entityType: "candidate",
      entityId: "candidate_workflow_scheduled",
      metadata: { publishJobId: "job_due" },
      createdAt: "2026-05-31T03:00:00.000Z"
    }
  ]
};
