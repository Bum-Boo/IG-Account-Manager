export type InstagramPublishMode = "mock" | "live";

export interface InstagramIntegrationConfig {
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
  graphApiBaseUrl: string;
  graphApiVersion?: string;
  requiredScopes: string[];
  publishMode: InstagramPublishMode;
  webBaseUrl: string;
  tokenVaultKey?: string;
  oauthStateSecret?: string;
  containerPollIntervalMs: number;
  containerPollTimeoutMs: number;
}

export function readInstagramIntegrationConfig(env: NodeJS.ProcessEnv = process.env): InstagramIntegrationConfig {
  return {
    appId: readOptionalString(env.INSTAGRAM_APP_ID),
    appSecret: readOptionalString(env.INSTAGRAM_APP_SECRET),
    redirectUri: readOptionalString(env.INSTAGRAM_REDIRECT_URI),
    graphApiBaseUrl: readOptionalString(env.INSTAGRAM_GRAPH_API_BASE_URL) ?? "https://graph.facebook.com",
    graphApiVersion: readOptionalString(env.INSTAGRAM_GRAPH_API_VERSION),
    requiredScopes: readList(env.INSTAGRAM_REQUIRED_SCOPES, [
      "pages_show_list",
      "instagram_basic",
      "instagram_content_publish"
    ]),
    publishMode: env.INSTAGRAM_PUBLISH_MODE === "live" ? "live" : "mock",
    webBaseUrl: readOptionalString(env.IG_MANAGER_WEB_BASE_URL) ?? "http://localhost:5173",
    tokenVaultKey: readOptionalString(env.IG_MANAGER_TOKEN_VAULT_KEY),
    oauthStateSecret: readOptionalString(env.INSTAGRAM_OAUTH_STATE_SECRET),
    containerPollIntervalMs: readPositiveInteger(env.INSTAGRAM_CONTAINER_POLL_INTERVAL_MS, 1_000),
    containerPollTimeoutMs: readPositiveInteger(env.INSTAGRAM_CONTAINER_POLL_TIMEOUT_MS, 30_000)
  };
}

export function assertOAuthConfigured(config: InstagramIntegrationConfig): void {
  const missing = [
    ["INSTAGRAM_APP_ID", config.appId],
    ["INSTAGRAM_APP_SECRET", config.appSecret],
    ["INSTAGRAM_REDIRECT_URI", config.redirectUri],
    ["IG_MANAGER_TOKEN_VAULT_KEY", config.tokenVaultKey]
  ].flatMap(([name, value]) => (value ? [] : [name]));

  if (missing.length > 0) {
    throw new Error(`Instagram OAuth is not configured. Missing: ${missing.join(", ")}.`);
  }
}

function readOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readList(value: string | undefined, fallback: string[]): string[] {
  const values = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return values && values.length > 0 ? values : fallback;
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
