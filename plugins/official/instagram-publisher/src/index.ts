import { z } from "zod";
import type {
  PluginExecutionResult,
  PluginManifest,
  PluginWarning,
  PublishOutput,
  PublisherPlugin,
  PublishRequest,
  PublishValidationRequest,
  ValidationIssue,
  ValidationOutput
} from "@ig-manager/plugin-sdk";
import { pluginFailure, pluginSuccess } from "@ig-manager/plugin-sdk";

const INSTAGRAM_MEDIA_TYPES = ["image", "video", "carousel", "reel", "story"] as const;

export const instagramPublisherManifest: PluginManifest = {
  schemaVersion: "ig-manager.plugin.v1",
  id: "official.instagram-publisher",
  name: "Official Instagram Publisher",
  version: "0.1.0",
  description:
    "Official Instagram publisher skeleton using only official Instagram APIs. Live API calls are intentionally behind interfaces.",
  type: "publisher",
  distribution: "official",
  private: false,
  officialApiOnly: true,
  entry: "./dist/index.js",
  permissions: ["candidate:read", "publish:validate", "publish:approved"],
  capabilities: [
    {
      id: "instagram.publish.media",
      description: "Publish approved, scheduled media through official Instagram APIs."
    },
    {
      id: "instagram.publish.first-comment",
      description: "Optionally create a first comment after media publish through official Instagram APIs."
    },
    {
      id: "instagram.publish.mock",
      description: "Simulate Instagram publishing locally without external network calls."
    }
  ],
  uiExtensionPoints: [],
  dryRun: { supported: true, modes: ["validate_only", "preview", "no_write"] },
  author: { name: "IG Manager" },
  metadata: {
    officialMvp: true,
    modes: ["dry_run", "mock", "live"],
    networkCallsBehindInterface: true
  }
};

export const InstagramPublisherConfigSchema = z
  .object({
    mode: z.enum(["mock", "live"]).default("mock"),
    graphApiBaseUrl: z.string().url().default("https://graph.facebook.com"),
    graphApiVersion: z.string().trim().min(1).max(32).optional(),
    createFirstComment: z.boolean().default(true),
    mockPermalinkBaseUrl: z.string().url().default("https://example.invalid/ig-manager/instagram"),
    requiredScopes: z.array(z.string().trim().min(1).max(120)).default(["instagram_content_publish"])
  })
  .strict();

export type InstagramPublisherConfig = z.infer<typeof InstagramPublisherConfigSchema>;
export type InstagramPublisherConfigInput = z.input<typeof InstagramPublisherConfigSchema>;

export const InstagramMediaInputSchema = z
  .object({
    assetId: z.string().trim().min(1).max(128).optional(),
    uri: z.string().trim().min(1).max(2000).optional(),
    mediaType: z.enum(INSTAGRAM_MEDIA_TYPES).default("image"),
    altText: z.string().trim().max(1000).optional()
  })
  .strict()
  .superRefine((media, ctx) => {
    if (!media.assetId && !media.uri) {
      ctx.addIssue({
        code: "custom",
        path: ["uri"],
        message: "Media must include either an asset id or a resolvable URI."
      });
    }
  });

export type InstagramMediaInput = z.infer<typeof InstagramMediaInputSchema>;

export const InstagramPublishInputSchema = z
  .object({
    accountId: z.string().trim().min(1).max(128),
    externalAccountId: z.string().trim().min(1).max(256).optional(),
    candidateId: z.string().trim().min(1).max(128),
    jobId: z.string().trim().min(1).max(128).optional(),
    media: z.array(InstagramMediaInputSchema).min(1),
    caption: z.string().trim().min(1).max(2200),
    hashtags: z.array(z.string().trim().min(1).max(120)).default([]),
    firstComment: z.string().trim().min(1).max(2200).optional(),
    dryRun: z.boolean().default(false)
  })
  .strict();

export type InstagramPublishInput = z.infer<typeof InstagramPublishInputSchema>;

export interface InstagramTokenRequest {
  accountId: string;
  externalAccountId?: string;
  requiredScopes: readonly string[];
  signal?: AbortSignal;
}

export interface InstagramAccessToken {
  accessToken: string;
  expiresAt?: string;
  scopes?: readonly string[];
}

export interface InstagramTokenProvider {
  getAccessToken(request: InstagramTokenRequest): Promise<InstagramAccessToken | undefined>;
}

export interface InstagramCreateMediaContainerInput {
  accessToken: string;
  instagramBusinessAccountId: string;
  media: readonly InstagramMediaInput[];
  caption: string;
  graphApiBaseUrl: string;
  graphApiVersion?: string;
  signal?: AbortSignal;
}

export interface InstagramCreateMediaContainerOutput {
  containerId: string;
  rawResultRef?: string;
}

export interface InstagramPublishMediaContainerInput {
  accessToken: string;
  instagramBusinessAccountId: string;
  containerId: string;
  graphApiBaseUrl: string;
  graphApiVersion?: string;
  signal?: AbortSignal;
}

export interface InstagramPublishMediaContainerOutput {
  mediaId: string;
  permalink?: string;
  rawResultRef?: string;
}

export interface InstagramCreateFirstCommentInput {
  accessToken: string;
  instagramBusinessAccountId: string;
  mediaId: string;
  text: string;
  graphApiBaseUrl: string;
  graphApiVersion?: string;
  signal?: AbortSignal;
}

export interface InstagramCreateFirstCommentOutput {
  commentId: string;
  rawResultRef?: string;
}

export interface InstagramGraphApiClient {
  createMediaContainer(input: InstagramCreateMediaContainerInput): Promise<InstagramCreateMediaContainerOutput>;
  publishMediaContainer(input: InstagramPublishMediaContainerInput): Promise<InstagramPublishMediaContainerOutput>;
  createFirstComment(input: InstagramCreateFirstCommentInput): Promise<InstagramCreateFirstCommentOutput>;
}

export class InstagramApiNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramApiNotConfiguredError";
  }
}

export class UnconfiguredInstagramGraphApiClient implements InstagramGraphApiClient {
  async createMediaContainer(): Promise<InstagramCreateMediaContainerOutput> {
    // TODO(real Instagram API): create a media container through the official Instagram API.
    throw new InstagramApiNotConfiguredError("TODO: create media container through the official Instagram API.");
  }

  async publishMediaContainer(): Promise<InstagramPublishMediaContainerOutput> {
    // TODO(real Instagram API): publish the created media container through the official Instagram API.
    throw new InstagramApiNotConfiguredError("TODO: publish media container through the official Instagram API.");
  }

  async createFirstComment(): Promise<InstagramCreateFirstCommentOutput> {
    // TODO(real Instagram API): create the first comment through the official Instagram API.
    throw new InstagramApiNotConfiguredError("TODO: create first comment through the official Instagram API.");
  }
}

export interface InstagramPublisherOptions {
  config?: InstagramPublisherConfigInput;
  tokenProvider?: InstagramTokenProvider;
  apiClient?: InstagramGraphApiClient;
  now?: () => Date;
}

export class InstagramPublisher implements PublisherPlugin {
  readonly manifest = instagramPublisherManifest;
  readonly config: InstagramPublisherConfig;

  private readonly tokenProvider?: InstagramTokenProvider;
  private readonly apiClient: InstagramGraphApiClient;
  private readonly now: () => Date;

  constructor(options: InstagramPublisherOptions = {}) {
    this.config = InstagramPublisherConfigSchema.parse(options.config ?? {});
    this.tokenProvider = options.tokenProvider;
    this.apiClient = options.apiClient ?? new UnconfiguredInstagramGraphApiClient();
    this.now = options.now ?? (() => new Date());
  }

  async validatePublish(
    request: PublishValidationRequest,
    context: Parameters<PublisherPlugin["validatePublish"]>[1]
  ): Promise<PluginExecutionResult<ValidationOutput>> {
    const dryRun = isDryRun(request, context.dryRun);
    const issues = validateInstagramPublishRequest(request, {
      requireLiveConfiguration: this.config.mode === "live" && !dryRun,
      hasTokenProvider: this.tokenProvider !== undefined
    });
    const valid = issues.every((issue) => issue.severity !== "error");

    context.logger.info("instagram publisher validation completed", {
      candidateId: request.candidate.id,
      accountId: request.account.id,
      valid,
      issueCount: issues.length,
      mode: this.config.mode,
      dryRun
    });

    return pluginSuccess(
      {
        valid,
        issues
      },
      {
        dryRun,
        warnings: issuesToWarnings(issues)
      }
    );
  }

  async publish(
    request: PublishRequest,
    context: Parameters<PublisherPlugin["publish"]>[1]
  ): Promise<PluginExecutionResult<PublishOutput>> {
    const dryRun = isDryRun(request, context.dryRun);
    const issues = validateInstagramPublishRequest(request, {
      requireLiveConfiguration: this.config.mode === "live" && !dryRun,
      hasTokenProvider: this.tokenProvider !== undefined
    });
    const errors = issues.filter((issue) => issue.severity === "error");

    if (errors.length > 0) {
      context.logger.warn("instagram publisher rejected invalid publish request", {
        candidateId: request.candidate.id,
        accountId: request.account.id,
        errorCount: errors.length,
        mode: this.config.mode,
        dryRun
      });

      return pluginFailure(
        {
          code: "instagram_publish_validation_failed",
          message: "Instagram publish request is missing required approval, schedule, media, caption, or configuration.",
          retryable: false,
          details: { issues: errors }
        },
        {
          dryRun,
          warnings: issuesToWarnings(issues)
        }
      );
    }

    const input = buildInstagramPublishInput(request, dryRun);

    if (dryRun) {
      return this.publishDryRun(input, request, context);
    }

    if (this.config.mode === "mock") {
      return this.publishMock(input, request, context);
    }

    return this.publishLive(input, request, context);
  }

  private publishDryRun(
    input: InstagramPublishInput,
    request: PublishRequest,
    context: Parameters<PublisherPlugin["publish"]>[1]
  ): PluginExecutionResult<PublishOutput> {
    const externalPostId = createExternalPostId("dry_run_instagram", request);

    context.logger.info("instagram publisher dry-run completed without network calls", {
      candidateId: input.candidateId,
      accountId: input.accountId,
      jobId: input.jobId,
      mediaCount: input.media.length,
      hasFirstComment: input.firstComment !== undefined
    });

    return pluginSuccess(
      {
        externalPostId,
        permalink: `${this.config.mockPermalinkBaseUrl}/${externalPostId}`,
        rawResultRef: `instagram-publisher://dry-run/${externalPostId}`
      },
      {
        dryRun: true,
        audit: {
          simulated: true,
          mode: "dry_run",
          candidateId: input.candidateId,
          accountId: input.accountId,
          jobId: input.jobId
        }
      }
    );
  }

  private publishMock(
    input: InstagramPublishInput,
    request: PublishRequest,
    context: Parameters<PublisherPlugin["publish"]>[1]
  ): PluginExecutionResult<PublishOutput> {
    const externalPostId = createExternalPostId("mock_instagram", request);

    context.logger.info("instagram publisher mock publish completed without network calls", {
      candidateId: input.candidateId,
      accountId: input.accountId,
      jobId: input.jobId,
      mediaCount: input.media.length,
      hasFirstComment: input.firstComment !== undefined
    });

    return pluginSuccess(
      {
        externalPostId,
        permalink: `${this.config.mockPermalinkBaseUrl}/${externalPostId}`,
        publishedAt: this.now().toISOString(),
        rawResultRef: `instagram-publisher://mock/${externalPostId}`
      },
      {
        dryRun: false,
        audit: {
          simulated: true,
          mode: "mock",
          candidateId: input.candidateId,
          accountId: input.accountId,
          jobId: input.jobId,
          firstCommentCreated: input.firstComment !== undefined && this.config.createFirstComment
        }
      }
    );
  }

  private async publishLive(
    input: InstagramPublishInput,
    request: PublishRequest,
    context: Parameters<PublisherPlugin["publish"]>[1]
  ): Promise<PluginExecutionResult<PublishOutput>> {
    const token = await this.tokenProvider?.getAccessToken({
      accountId: input.accountId,
      externalAccountId: input.externalAccountId,
      requiredScopes: this.config.requiredScopes,
      signal: context.signal
    });

    if (!token) {
      context.logger.error("instagram publisher could not resolve an access token", {
        candidateId: input.candidateId,
        accountId: input.accountId
      });

      return pluginFailure({
        code: "instagram_token_unavailable",
        message: "No Instagram access token was available from the configured token provider.",
        retryable: false
      });
    }

    try {
      context.logger.info("instagram publisher starting official API publish", {
        candidateId: input.candidateId,
        accountId: input.accountId,
        jobId: input.jobId
      });

      // TODO(real Instagram API): create a media container through the official Instagram API.
      const container = await this.apiClient.createMediaContainer({
        accessToken: token.accessToken,
        instagramBusinessAccountId: input.externalAccountId as string,
        media: input.media,
        caption: composeCaption(input.caption, input.hashtags),
        graphApiBaseUrl: this.config.graphApiBaseUrl,
        graphApiVersion: this.config.graphApiVersion,
        signal: context.signal
      });

      // TODO(real Instagram API): publish the media container through the official Instagram API.
      const published = await this.apiClient.publishMediaContainer({
        accessToken: token.accessToken,
        instagramBusinessAccountId: input.externalAccountId as string,
        containerId: container.containerId,
        graphApiBaseUrl: this.config.graphApiBaseUrl,
        graphApiVersion: this.config.graphApiVersion,
        signal: context.signal
      });

      let firstCommentRef: string | undefined;
      const warnings: PluginWarning[] = [];

      if (input.firstComment && this.config.createFirstComment) {
        // TODO(real Instagram API): create the first comment through the official Instagram API.
        try {
          const firstComment = await this.apiClient.createFirstComment({
            accessToken: token.accessToken,
            instagramBusinessAccountId: input.externalAccountId as string,
            mediaId: published.mediaId,
            text: input.firstComment,
            graphApiBaseUrl: this.config.graphApiBaseUrl,
            graphApiVersion: this.config.graphApiVersion,
            signal: context.signal
          });
          firstCommentRef = firstComment.rawResultRef ?? firstComment.commentId;
        } catch {
          // The post already exists. Retrying the whole publish operation just
          // to recover its optional comment would duplicate the external post.
          warnings.push({
            code: "instagram_first_comment_failed",
            message: "Post published, but its first comment could not be created."
          });
          context.logger.warn("instagram first comment failed after post publication", {
            candidateId: input.candidateId,
            accountId: input.accountId,
            jobId: input.jobId
          });
        }
      }

      return pluginSuccess(
        {
          externalPostId: published.mediaId,
          permalink: published.permalink,
          publishedAt: this.now().toISOString(),
          rawResultRef: published.rawResultRef ?? container.rawResultRef
        },
        {
          warnings,
          audit: {
            simulated: false,
            mode: "live",
            candidateId: input.candidateId,
            accountId: input.accountId,
            jobId: input.jobId,
            firstCommentRef
          }
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = !(error instanceof InstagramApiNotConfiguredError);

      context.logger.error("instagram publisher official API publish failed", {
        candidateId: input.candidateId,
        accountId: input.accountId,
        retryable,
        error: message
      });

      return pluginFailure({
        code: "instagram_publish_failed",
        message,
        retryable,
        details: {
          configuredClient: !(error instanceof InstagramApiNotConfiguredError)
        }
      });
    }
  }
}

export function createInstagramPublisherPlugin(options: InstagramPublisherOptions = {}): PublisherPlugin {
  return new InstagramPublisher(options);
}

export const plugin = createInstagramPublisherPlugin();
export default plugin;

function validateInstagramPublishRequest(
  request: PublishValidationRequest | PublishRequest,
  options: { requireLiveConfiguration: boolean; hasTokenProvider: boolean }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const candidate = request.candidate;

  if (request.account.platform.id !== "instagram") {
    issues.push({
      code: "instagram_account_required",
      severity: "error",
      message: "The Instagram publisher can only publish accounts whose platform id is 'instagram'.",
      path: "account.platform.id"
    });
  }

  if (request.account.status !== "connected") {
    issues.push({
      code: "account_not_connected",
      severity: "error",
      message: "The account must be connected before publishing to Instagram.",
      path: "account.status"
    });
  }

  if (candidate.status !== "scheduled") {
    issues.push({
      code: "candidate_not_scheduled",
      severity: "error",
      message: "Candidate must be scheduled before the Instagram publisher can run.",
      path: "candidate.status"
    });
  }

  if (!candidate.scheduledAt) {
    issues.push({
      code: "scheduled_at_required",
      severity: "error",
      message: "Candidate must have a scheduledAt timestamp before publishing.",
      path: "candidate.scheduledAt"
    });
  }

  if (!candidate.approvedAt || !candidate.approvedBy) {
    issues.push({
      code: "candidate_not_approved",
      severity: "error",
      message: "Candidate must be approved before publishing.",
      path: "candidate.approvedAt"
    });
  }

  if (!candidate.caption.trim()) {
    issues.push({
      code: "caption_required",
      severity: "error",
      message: "Candidate caption is required before publishing.",
      path: "candidate.caption"
    });
  }

  if (candidate.caption.length > 2200) {
    issues.push({
      code: "caption_too_long",
      severity: "error",
      message: "Candidate caption exceeds the Instagram publisher MVP limit of 2,200 characters.",
      path: "candidate.caption"
    });
  }

  if (candidate.firstComment && candidate.firstComment.text.length > 2200) {
    issues.push({
      code: "first_comment_too_long",
      severity: "error",
      message: "First comment exceeds the Instagram publisher MVP limit of 2,200 characters.",
      path: "candidate.firstComment.text"
    });
  }

  const media = extractMedia(candidate);

  if (media.length === 0) {
    issues.push({
      code: "media_required",
      severity: "error",
      message: "At least one media asset or media URI is required before publishing.",
      path: "candidate.assetIds"
    });
  }

  if (options.requireLiveConfiguration) {
    if (!request.account.externalAccountId) {
      issues.push({
        code: "instagram_external_account_required",
        severity: "error",
        message: "Live mode requires an Instagram business account id resolved by the account connection layer.",
        path: "account.externalAccountId"
      });
    }

    if (!options.hasTokenProvider) {
      issues.push({
        code: "instagram_token_provider_required",
        severity: "error",
        message: "Live mode requires a token provider. Raw tokens must not be stored in plugin code.",
        path: "tokenProvider"
      });
    }

    if (media.some((item) => !item.uri)) {
      issues.push({
        code: "instagram_media_uri_required",
        severity: "error",
        message: "Live mode requires resolvable media URIs for official Instagram API container creation.",
        path: "candidate.metadata.instagram.media"
      });
    }
  }

  return issues;
}

function buildInstagramPublishInput(request: PublishValidationRequest | PublishRequest, dryRun: boolean): InstagramPublishInput {
  return InstagramPublishInputSchema.parse({
    accountId: request.account.id,
    externalAccountId: request.account.externalAccountId,
    candidateId: request.candidate.id,
    jobId: request.job?.id,
    media: extractMedia(request.candidate),
    caption: request.candidate.caption,
    hashtags: extractHashtags(request.candidate.metadata),
    firstComment: request.candidate.firstComment?.text,
    dryRun
  });
}

function extractMedia(candidate: PublishValidationRequest["candidate"]): InstagramMediaInput[] {
  const metadata = asRecord(candidate.metadata);
  const instagramMetadata = asRecord(metadata?.instagram);
  const rawMedia = instagramMetadata?.media ?? metadata?.media;

  if (Array.isArray(rawMedia)) {
    const media = rawMedia.flatMap((item): InstagramMediaInput[] => {
      if (typeof item === "string" && item.trim()) {
        return [{ uri: item.trim(), mediaType: "image" }];
      }

      const record = asRecord(item);

      if (!record) {
        return [];
      }

      const assetId = typeof record.assetId === "string" ? record.assetId.trim() : undefined;
      const uri = typeof record.uri === "string" ? record.uri.trim() : undefined;
      const mediaType = parseMediaType(record.mediaType);
      const altText = typeof record.altText === "string" ? record.altText.trim() : undefined;

      if (!assetId && !uri) {
        return [];
      }

      return [
        {
          assetId,
          uri,
          mediaType,
          altText
        }
      ];
    });

    if (media.length > 0) {
      return media;
    }
  }

  return candidate.assetIds.map((assetId) => ({
    assetId,
    mediaType: inferMediaType(candidate.format)
  }));
}

function extractHashtags(metadataValue: unknown): string[] {
  const metadata = asRecord(metadataValue);
  const instagramMetadata = asRecord(metadata?.instagram);
  const rawHashtags = instagramMetadata?.hashtags ?? metadata?.hashtags;

  if (!Array.isArray(rawHashtags)) {
    return [];
  }

  const seen = new Set<string>();
  const hashtags: string[] = [];

  for (const value of rawHashtags) {
    if (typeof value !== "string") {
      continue;
    }

    const hashtag = normalizeHashtag(value);

    if (hashtag && !seen.has(hashtag.toLowerCase())) {
      seen.add(hashtag.toLowerCase());
      hashtags.push(hashtag);
    }
  }

  return hashtags;
}

function normalizeHashtag(value: string): string | undefined {
  const normalized = value.trim().replace(/^#+/, "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseMediaType(value: unknown): InstagramMediaInput["mediaType"] {
  return typeof value === "string" && INSTAGRAM_MEDIA_TYPES.includes(value as InstagramMediaInput["mediaType"])
    ? (value as InstagramMediaInput["mediaType"])
    : "image";
}

function inferMediaType(format: string): InstagramMediaInput["mediaType"] {
  const normalized = format.toLowerCase();

  if (normalized.includes("reel")) {
    return "reel";
  }

  if (normalized.includes("story")) {
    return "story";
  }

  if (normalized.includes("video")) {
    return "video";
  }

  if (normalized.includes("carousel")) {
    return "carousel";
  }

  return "image";
}

function composeCaption(caption: string, hashtags: readonly string[]): string {
  if (hashtags.length === 0) {
    return caption;
  }

  const existing = caption.toLowerCase();
  const missing = hashtags.flatMap((hashtag): string[] => {
    const normalized = normalizeHashtag(hashtag);

    if (!normalized) {
      return [];
    }

    const tag = `#${normalized}`;
    return existing.includes(tag.toLowerCase()) ? [] : [tag];
  });

  return missing.length > 0 ? `${caption}\n\n${missing.join(" ")}` : caption;
}

function createExternalPostId(prefix: string, request: PublishRequest): string {
  return `${prefix}_${request.candidate.id}_${request.job?.attempt ?? 0}`;
}

function issuesToWarnings(issues: readonly ValidationIssue[]): PluginWarning[] {
  return issues
    .filter((issue) => issue.severity !== "error")
    .map((issue) => ({
      code: issue.code,
      message: issue.message,
      path: issue.path
    }));
}

function isDryRun(request: PublishValidationRequest | PublishRequest, contextDryRun: boolean): boolean {
  return contextDryRun || request.dryRun?.enabled === true;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
