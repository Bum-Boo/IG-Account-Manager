import type {
  Account,
  Concept,
  ContentAsset,
  ContentRecipe,
  PostCandidate,
  PublishJob,
  SchedulePolicy
} from "@ig-manager/domain";
import type { PluginContext } from "./context.js";
import type { PluginManifest, UiExtensionPoint } from "./manifest.js";
import type { DryRunOptions, PluginExecutionResult, PluginWarning } from "./results.js";

export interface BasePlugin {
  manifest: PluginManifest;
  activate?(context: PluginContext): Promise<void> | void;
  deactivate?(context: PluginContext): Promise<void> | void;
}

export interface SourceImportRequest {
  sourceUri: string;
  accountId?: string;
  conceptId?: string;
  dryRun?: DryRunOptions;
  metadata?: Record<string, unknown>;
}

export interface SourceImportOutput {
  assets: ContentAsset[];
  candidates: PostCandidate[];
  references: ImportedReference[];
}

export interface ImportedReference {
  uri: string;
  title?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface SourceImporterPlugin extends BasePlugin {
  importSource(
    request: SourceImportRequest,
    context: PluginContext
  ): Promise<PluginExecutionResult<SourceImportOutput>>;
}

export interface MediaGenerationRequest {
  account: Account;
  concept: Concept;
  recipe?: ContentRecipe;
  prompt: string;
  sourceAssetIds?: string[];
  dryRun?: DryRunOptions;
}

export interface MediaGenerationOutput {
  assets: ContentAsset[];
  notes?: string;
}

export interface MediaGeneratorPlugin extends BasePlugin {
  generateMedia(
    request: MediaGenerationRequest,
    context: PluginContext
  ): Promise<PluginExecutionResult<MediaGenerationOutput>>;
}

export interface CopyGenerationRequest {
  account: Account;
  concept: Concept;
  recipe?: ContentRecipe;
  assetIds?: string[];
  prompt?: string;
  dryRun?: DryRunOptions;
}

export interface CopyVariant {
  text: string;
  score?: number;
  notes?: string;
}

export interface CopyGenerationOutput {
  captions: CopyVariant[];
  firstComments: CopyVariant[];
}

export interface CopyGeneratorPlugin extends BasePlugin {
  generateCopy(
    request: CopyGenerationRequest,
    context: PluginContext
  ): Promise<PluginExecutionResult<CopyGenerationOutput>>;
}

export type ValidationSeverity = "info" | "warning" | "error";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  path?: string;
}

export interface ValidationRequest {
  candidate: PostCandidate;
  account?: Account;
  concept?: Concept;
  dryRun?: DryRunOptions;
}

export interface ValidationOutput {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidatorPlugin extends BasePlugin {
  validate(
    request: ValidationRequest,
    context: PluginContext
  ): Promise<PluginExecutionResult<ValidationOutput>>;
}

export interface SchedulerPolicyRequest {
  account: Account;
  concept?: Concept;
  candidates: PostCandidate[];
  currentPolicy: SchedulePolicy;
  dryRun?: DryRunOptions;
}

export interface ScheduleSuggestion {
  candidateId: string;
  scheduledAt: string;
  reason?: string;
  warnings?: PluginWarning[];
}

export interface SchedulerPolicyOutput {
  suggestions: ScheduleSuggestion[];
  policyPatch?: Partial<SchedulePolicy>;
}

export interface SchedulerPolicyPlugin extends BasePlugin {
  proposeSchedule(
    request: SchedulerPolicyRequest,
    context: PluginContext
  ): Promise<PluginExecutionResult<SchedulerPolicyOutput>>;
}

export interface PublishValidationRequest {
  candidate: PostCandidate;
  account: Account;
  job?: PublishJob;
  dryRun?: DryRunOptions;
}

export interface PublishRequest extends PublishValidationRequest {
  approvedBy: string;
}

export interface PublishOutput {
  externalPostId?: string;
  permalink?: string;
  publishedAt?: string;
  rawResultRef?: string;
}

export interface PublisherPlugin extends BasePlugin {
  validatePublish(
    request: PublishValidationRequest,
    context: PluginContext
  ): Promise<PluginExecutionResult<ValidationOutput>>;
  publish(
    request: PublishRequest,
    context: PluginContext
  ): Promise<PluginExecutionResult<PublishOutput>>;
}

export interface AnalyticsExportRequest {
  accountIds: string[];
  conceptIds?: string[];
  from: string;
  to: string;
  format: "csv" | "json";
  dryRun?: DryRunOptions;
}

export interface AnalyticsExportOutput {
  artifactUri?: string;
  rows: Record<string, unknown>[];
  format: "csv" | "json";
}

export interface AnalyticsPlugin extends BasePlugin {
  exportAnalytics(
    request: AnalyticsExportRequest,
    context: PluginContext
  ): Promise<PluginExecutionResult<AnalyticsExportOutput>>;
}

export interface UiExtensionDefinition {
  id: string;
  point: UiExtensionPoint;
  title: string;
  componentRef: string;
  requiredPermissions: string[];
}

export interface UiExtensionPlugin extends BasePlugin {
  getUiExtensions(context: PluginContext): Promise<PluginExecutionResult<UiExtensionDefinition[]>>;
}

export type IgManagerPlugin =
  | SourceImporterPlugin
  | MediaGeneratorPlugin
  | CopyGeneratorPlugin
  | ValidatorPlugin
  | SchedulerPolicyPlugin
  | PublisherPlugin
  | AnalyticsPlugin
  | UiExtensionPlugin;

