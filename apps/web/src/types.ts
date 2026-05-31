export type AccountStatus = "draft" | "connected" | "disconnected" | "disabled" | "archived";
export type AssetType = "image" | "video" | "audio" | "document" | "text" | "link" | "template" | "other";
export type CandidateStatus =
  | "draft"
  | "ready_for_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "publish_failed"
  | "archived";
export type PublishJobStatus = "queued" | "running" | "retry_scheduled" | "succeeded" | "failed" | "canceled";
export type PluginType = "publisher" | "analytics" | "asset_processor" | "candidate_generator" | "workflow" | "importer" | "exporter";

export interface Platform {
  id: string;
  displayName: string;
  officialApiBaseUrl?: string;
  metadata: Record<string, unknown>;
}

export interface AutomationPolicy {
  candidateGeneration: "manual" | "plugin_assisted";
  requireHumanApproval: boolean;
  allowAutoScheduling: boolean;
  allowAutoPublishing: boolean;
}

export interface TimeWindow {
  start: string;
  end: string;
}

export interface SchedulePolicy {
  timezone: string;
  minLeadTimeMinutes: number;
  maxPostsPerDay: number;
  allowedWeekdays: number[];
  allowedTimeWindows: TimeWindow[];
  requireApprovedCandidate: boolean;
}

export interface Account {
  id: string;
  platform: Platform;
  externalAccountId?: string;
  handle: string;
  displayName?: string;
  status: AccountStatus;
  automationPolicy: AutomationPolicy;
  schedulePolicy: SchedulePolicy;
  pluginRegistrationIds: string[];
  notes?: string;
  metadata: Record<string, unknown>;
  connectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Concept {
  id: string;
  accountId: string;
  name: string;
  description: string;
  audience: string;
  pillars: string[];
  voice: string;
  visualGuidelines?: string;
  captionGuidelines?: string;
  negativeGuidelines: string[];
  referenceAssetIds: string[];
  recipeIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface ContentAsset {
  id: string;
  type: AssetType;
  uri: string;
  title: string;
  description?: string;
  tags: string[];
  accountIds: string[];
  conceptIds: string[];
  rights: {
    usage: "owned" | "licensed" | "reference_only" | "unknown";
    source?: string;
    expiresAt?: string;
  };
  checksum?: string;
  metadata: Record<string, unknown>;
  importedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentRecipe {
  id: string;
  conceptId: string;
  name: string;
  summary: string;
  contentPillars: string[];
  requiredAssetTypes: AssetType[];
  format: string;
  instructions: string[];
  reviewChecklist: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface PostCandidate {
  id: string;
  accountId: string;
  conceptId: string;
  recipeId?: string;
  assetIds: string[];
  status: CandidateStatus;
  format: string;
  caption: string;
  firstComment?: {
    text: string;
    createdBy?: string;
    createdAt: string;
  };
  internalNotes?: string;
  provenance: {
    source: "manual" | "plugin";
    pluginRegistrationId?: string;
    sourceAssetIds: string[];
    sourceReferenceIds: string[];
    notes?: string;
  };
  scheduledAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PublishJob {
  id: string;
  candidateId: string;
  accountId: string;
  pluginRegistrationId: string;
  status: PublishJobStatus;
  scheduledAt: string;
  attempt: number;
  maxAttempts: number;
  startedAt?: string;
  finishedAt?: string;
  retryAfter?: string;
  lastError?: {
    code?: string;
    message: string;
    retryable: boolean;
  };
  result?: {
    externalPostId?: string;
    permalink?: string;
    rawResultRef?: string;
  };
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PluginRegistration {
  id: string;
  pluginId: string;
  name: string;
  version: string;
  type: PluginType;
  enabled: boolean;
  officialApiOnly: boolean;
  capabilities: string[];
  permissions: string[];
  settingsRef?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WorkspaceData {
  accounts: Account[];
  concepts: Concept[];
  assets: ContentAsset[];
  recipes: ContentRecipe[];
  candidates: PostCandidate[];
  publishJobs: PublishJob[];
  plugins: PluginRegistration[];
  auditLogs: AuditLog[];
}

export type DataSource = "api" | "mock";

export interface WorkspaceSnapshot {
  data: WorkspaceData;
  source: DataSource;
  error?: string;
}

export type BoardGroup = "candidate" | "needs_review" | "approved" | "scheduled" | "published" | "failed";
