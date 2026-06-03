import type {
  InstagramCreateFirstCommentInput,
  InstagramCreateFirstCommentOutput,
  InstagramCreateMediaContainerInput,
  InstagramCreateMediaContainerOutput,
  InstagramGraphApiClient,
  InstagramMediaInput,
  InstagramPublishMediaContainerInput,
  InstagramPublishMediaContainerOutput
} from "@ig-manager/plugin-official-instagram-publisher";
import type { InstagramIntegrationConfig } from "./config.js";
import { InstagramIntegrationError, redactInstagramErrorDetails } from "./errors.js";

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
) => Promise<FetchResponseLike>;

export interface EligibleInstagramAccount {
  instagramBusinessAccountId: string;
  username: string;
  name?: string;
  pageId: string;
  pageName: string;
  pageAccessToken?: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  tokenType?: string;
  expiresAt?: string;
}

export class InstagramGraphHttpClient implements InstagramGraphApiClient {
  private readonly fetch: FetchLike;
  private readonly config: Pick<InstagramIntegrationConfig, "containerPollIntervalMs" | "containerPollTimeoutMs">;

  constructor(options: {
    fetch?: FetchLike;
    config?: Partial<Pick<InstagramIntegrationConfig, "containerPollIntervalMs" | "containerPollTimeoutMs">>;
  } = {}) {
    this.fetch = options.fetch ?? (globalThis.fetch as unknown as FetchLike);
    this.config = {
      containerPollIntervalMs: options.config?.containerPollIntervalMs ?? 1_000,
      containerPollTimeoutMs: options.config?.containerPollTimeoutMs ?? 30_000
    };
  }

  buildAuthorizationUrl(input: {
    appId: string;
    redirectUri: string;
    state: string;
    scopes: readonly string[];
    graphApiVersion?: string;
  }): string {
    const url = new URL(joinGraphPath("https://www.facebook.com", input.graphApiVersion, "/dialog/oauth"));
    url.searchParams.set("client_id", input.appId);
    url.searchParams.set("redirect_uri", input.redirectUri);
    url.searchParams.set("state", input.state);
    url.searchParams.set("scope", input.scopes.join(","));
    url.searchParams.set("response_type", "code");
    return url.toString();
  }

  async exchangeCodeForAccessToken(input: {
    appId: string;
    appSecret: string;
    redirectUri: string;
    code: string;
    graphApiBaseUrl: string;
    graphApiVersion?: string;
    signal?: AbortSignal;
  }): Promise<OAuthTokenResponse> {
    const url = new URL(joinGraphPath(input.graphApiBaseUrl, input.graphApiVersion, "/oauth/access_token"));
    url.searchParams.set("client_id", input.appId);
    url.searchParams.set("client_secret", input.appSecret);
    url.searchParams.set("redirect_uri", input.redirectUri);
    url.searchParams.set("code", input.code);

    const body = await this.requestJson(url, { signal: input.signal });
    return parseOAuthToken(body);
  }

  async exchangeForLongLivedAccessToken(input: {
    appId: string;
    appSecret: string;
    accessToken: string;
    graphApiBaseUrl: string;
    graphApiVersion?: string;
    signal?: AbortSignal;
  }): Promise<OAuthTokenResponse> {
    const url = new URL(joinGraphPath(input.graphApiBaseUrl, input.graphApiVersion, "/oauth/access_token"));
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", input.appId);
    url.searchParams.set("client_secret", input.appSecret);
    url.searchParams.set("fb_exchange_token", input.accessToken);

    const body = await this.requestJson(url, { signal: input.signal });
    return parseOAuthToken(body);
  }

  async resolveEligibleInstagramAccounts(input: {
    accessToken: string;
    graphApiBaseUrl: string;
    graphApiVersion?: string;
    signal?: AbortSignal;
  }): Promise<EligibleInstagramAccount[]> {
    const url = new URL(joinGraphPath(input.graphApiBaseUrl, input.graphApiVersion, "/me/accounts"));
    url.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username,name}");
    url.searchParams.set("access_token", input.accessToken);

    const body = await this.requestJson(url, { signal: input.signal });
    const record = asRecord(body);
    const data = Array.isArray(record?.data) ? record.data : [];

    return data.flatMap((page): EligibleInstagramAccount[] => {
      const pageRecord = asRecord(page);
      const igRecord = asRecord(pageRecord?.instagram_business_account);
      const instagramBusinessAccountId = typeof igRecord?.id === "string" ? igRecord.id : undefined;
      const username = typeof igRecord?.username === "string" ? igRecord.username : undefined;
      const pageId = typeof pageRecord?.id === "string" ? pageRecord.id : undefined;
      const pageName = typeof pageRecord?.name === "string" ? pageRecord.name : undefined;

      if (!instagramBusinessAccountId || !username || !pageId || !pageName) {
        return [];
      }

      return [
        {
          instagramBusinessAccountId,
          username,
          name: typeof igRecord?.name === "string" ? igRecord.name : undefined,
          pageId,
          pageName,
          pageAccessToken: typeof pageRecord?.access_token === "string" ? pageRecord.access_token : undefined
        }
      ];
    });
  }

  async createMediaContainer(input: InstagramCreateMediaContainerInput): Promise<InstagramCreateMediaContainerOutput> {
    const media = validateSingleImageMedia(input.media);
    const url = new URL(joinGraphPath(input.graphApiBaseUrl, input.graphApiVersion, `/${input.instagramBusinessAccountId}/media`));
    const params = new URLSearchParams();
    params.set("image_url", media.uri as string);
    params.set("caption", input.caption);
    params.set("access_token", input.accessToken);

    if (media.altText) {
      params.set("alt_text", media.altText);
    }

    const body = await this.requestJson(url, {
      method: "POST",
      body: params.toString(),
      signal: input.signal
    });
    const id = readRequiredString(body, "id", "Instagram media container response did not include an id.");

    await this.waitForContainerReady({
      containerId: id,
      accessToken: input.accessToken,
      graphApiBaseUrl: input.graphApiBaseUrl,
      graphApiVersion: input.graphApiVersion,
      signal: input.signal
    });

    return {
      containerId: id,
      rawResultRef: `instagram://container/${id}`
    };
  }

  async publishMediaContainer(input: InstagramPublishMediaContainerInput): Promise<InstagramPublishMediaContainerOutput> {
    const url = new URL(joinGraphPath(input.graphApiBaseUrl, input.graphApiVersion, `/${input.instagramBusinessAccountId}/media_publish`));
    const params = new URLSearchParams();
    params.set("creation_id", input.containerId);
    params.set("access_token", input.accessToken);

    const body = await this.requestJson(url, {
      method: "POST",
      body: params.toString(),
      signal: input.signal
    });
    const mediaId = readRequiredString(body, "id", "Instagram publish response did not include a media id.");
    const permalink = await this.resolvePermalink({
      mediaId,
      accessToken: input.accessToken,
      graphApiBaseUrl: input.graphApiBaseUrl,
      graphApiVersion: input.graphApiVersion,
      signal: input.signal
    });

    return {
      mediaId,
      permalink,
      rawResultRef: `instagram://media/${mediaId}`
    };
  }

  async createFirstComment(input: InstagramCreateFirstCommentInput): Promise<InstagramCreateFirstCommentOutput> {
    const url = new URL(joinGraphPath(input.graphApiBaseUrl, input.graphApiVersion, `/${input.mediaId}/comments`));
    const params = new URLSearchParams();
    params.set("message", input.text);
    params.set("access_token", input.accessToken);

    const body = await this.requestJson(url, {
      method: "POST",
      body: params.toString(),
      signal: input.signal
    });
    const commentId = readRequiredString(body, "id", "Instagram first comment response did not include an id.");

    return {
      commentId,
      rawResultRef: `instagram://comment/${commentId}`
    };
  }

  private async waitForContainerReady(input: {
    containerId: string;
    accessToken: string;
    graphApiBaseUrl: string;
    graphApiVersion?: string;
    signal?: AbortSignal;
  }): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt <= this.config.containerPollTimeoutMs) {
      const url = new URL(joinGraphPath(input.graphApiBaseUrl, input.graphApiVersion, `/${input.containerId}`));
      url.searchParams.set("fields", "status_code,status");
      url.searchParams.set("access_token", input.accessToken);
      const body = await this.requestJson(url, { signal: input.signal });
      const record = asRecord(body);
      const statusCode = typeof record?.status_code === "string" ? record.status_code : undefined;

      if (statusCode === "FINISHED") {
        return;
      }

      if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        throw new InstagramIntegrationError({
          code: "instagram_media_container_failed",
          message: `Instagram media container ended with status '${statusCode}'.`,
          statusCode: 502,
          retryable: false,
          details: redactInstagramErrorDetails(record)
        });
      }

      await sleep(this.config.containerPollIntervalMs, input.signal);
    }

    throw new InstagramIntegrationError({
      code: "instagram_media_container_timeout",
      message: "Timed out waiting for Instagram media container processing.",
      statusCode: 504,
      retryable: true
    });
  }

  private async resolvePermalink(input: {
    mediaId: string;
    accessToken: string;
    graphApiBaseUrl: string;
    graphApiVersion?: string;
    signal?: AbortSignal;
  }): Promise<string | undefined> {
    const url = new URL(joinGraphPath(input.graphApiBaseUrl, input.graphApiVersion, `/${input.mediaId}`));
    url.searchParams.set("fields", "permalink");
    url.searchParams.set("access_token", input.accessToken);
    const body = await this.requestJson(url, { signal: input.signal });
    const record = asRecord(body);
    return typeof record?.permalink === "string" ? record.permalink : undefined;
  }

  private async requestJson(
    url: URL,
    init: {
      method?: string;
      body?: string;
      signal?: AbortSignal;
    }
  ): Promise<unknown> {
    const response = await this.fetch(url.toString(), {
      method: init.method ?? "GET",
      headers: init.body ? { "content-type": "application/x-www-form-urlencoded" } : undefined,
      body: init.body,
      signal: init.signal
    });

    if (!response.ok) {
      const details = await readErrorPayload(response);
      throw new InstagramIntegrationError({
        code: "instagram_graph_api_error",
        message: `Instagram Graph API request failed with HTTP ${response.status}.`,
        statusCode: response.status >= 500 ? 502 : 400,
        retryable: response.status >= 500 || response.status === 429,
        details
      });
    }

    return response.json();
  }
}

export function joinGraphPath(baseUrl: string, version: string | undefined, path: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  const cleanVersion = version?.replace(/^\/+|\/+$/g, "");
  return cleanVersion ? `${cleanBase}/${cleanVersion}/${cleanPath}` : `${cleanBase}/${cleanPath}`;
}

function parseOAuthToken(value: unknown): OAuthTokenResponse {
  const record = asRecord(value);
  const accessToken = typeof record?.access_token === "string" ? record.access_token : undefined;

  if (!accessToken) {
    throw new InstagramIntegrationError({
      code: "instagram_oauth_token_response_invalid",
      message: "Instagram OAuth token response did not include an access token.",
      statusCode: 502,
      retryable: false,
      details: redactInstagramErrorDetails(value)
    });
  }

  const expiresIn = typeof record?.expires_in === "number" ? record.expires_in : undefined;

  return {
    accessToken,
    tokenType: typeof record?.token_type === "string" ? record.token_type : undefined,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1_000).toISOString() : undefined
  };
}

function validateSingleImageMedia(media: readonly InstagramMediaInput[]): InstagramMediaInput {
  if (media.length !== 1 || media[0]?.mediaType !== "image") {
    throw new InstagramIntegrationError({
      code: "instagram_media_type_unsupported",
      message: "Live Instagram publishing currently supports one image media item.",
      statusCode: 400,
      retryable: false
    });
  }

  const item = media[0];

  if (!item.uri || !/^https:\/\//i.test(item.uri)) {
    throw new InstagramIntegrationError({
      code: "instagram_media_url_required",
      message: "Live Instagram publishing requires a publicly reachable HTTPS media URL.",
      statusCode: 400,
      retryable: false
    });
  }

  return item;
}

async function readErrorPayload(response: FetchResponseLike): Promise<unknown> {
  try {
    return redactInstagramErrorDetails(await response.json());
  } catch {
    return redactInstagramErrorDetails(await response.text().catch(() => undefined));
  }
}

function readRequiredString(value: unknown, key: string, message: string): string {
  const record = asRecord(value);
  const result = typeof record?.[key] === "string" ? record[key] : undefined;

  if (!result) {
    throw new InstagramIntegrationError({
      code: "instagram_graph_response_invalid",
      message,
      statusCode: 502,
      retryable: true,
      details: redactInstagramErrorDetails(value)
    });
  }

  return result;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(signal.reason);
      },
      { once: true }
    );
  });
}
