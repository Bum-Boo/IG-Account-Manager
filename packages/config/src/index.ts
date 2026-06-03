export type AppEnvironment = "development" | "test" | "production";
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface AppConfig {
  environment: AppEnvironment;
  logLevel: LogLevel;
  apiHost: string;
  apiPort: number;
  webPort: number;
  comfyUiPath?: string;
  comfyUiBaseUrl: string;
  comfyUiTimeoutMs: number;
  comfyUiPollIntervalMs: number;
  comfyUiWorkflowTemplatePath?: string;
  comfyUiOutputDir?: string;
  enablePrivateAiContentFactory: boolean;
  mediaGenerationProvider: "mock" | "comfyui";
  instagramAppId?: string;
  instagramRedirectUri?: string;
  instagramGraphApiBaseUrl: string;
  instagramGraphApiVersion?: string;
  instagramRequiredScopes: string[];
  instagramPublishMode: "mock" | "live";
  instagramWebBaseUrl: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    environment: readEnvironment(env.NODE_ENV),
    logLevel: readLogLevel(env.LOG_LEVEL),
    apiHost: env.API_HOST ?? "0.0.0.0",
    apiPort: readPort(env.API_PORT, 3001),
    webPort: readPort(env.WEB_PORT, 5173),
    comfyUiPath: readOptionalString(env.COMFYUI_PATH),
    comfyUiBaseUrl: readOptionalString(env.COMFYUI_BASE_URL) ?? "http://127.0.0.1:8188",
    comfyUiTimeoutMs: readPositiveInteger(env.COMFYUI_TIMEOUT_MS, 120_000),
    comfyUiPollIntervalMs: readPositiveInteger(env.COMFYUI_POLL_INTERVAL_MS, 1_000),
    comfyUiWorkflowTemplatePath: readOptionalString(env.COMFYUI_WORKFLOW_TEMPLATE_PATH),
    comfyUiOutputDir: readOptionalString(env.COMFYUI_OUTPUT_DIR),
    enablePrivateAiContentFactory: readBoolean(env.IG_MANAGER_ENABLE_PRIVATE_AI_CONTENT_FACTORY, false),
    mediaGenerationProvider: readMediaGenerationProvider(env.IG_MANAGER_MEDIA_GENERATION_PROVIDER),
    instagramAppId: readOptionalString(env.INSTAGRAM_APP_ID),
    instagramRedirectUri: readOptionalString(env.INSTAGRAM_REDIRECT_URI),
    instagramGraphApiBaseUrl: readOptionalString(env.INSTAGRAM_GRAPH_API_BASE_URL) ?? "https://graph.facebook.com",
    instagramGraphApiVersion: readOptionalString(env.INSTAGRAM_GRAPH_API_VERSION),
    instagramRequiredScopes: readList(env.INSTAGRAM_REQUIRED_SCOPES, [
      "pages_show_list",
      "instagram_basic",
      "instagram_content_publish"
    ]),
    instagramPublishMode: env.INSTAGRAM_PUBLISH_MODE === "live" ? "live" : "mock",
    instagramWebBaseUrl: readOptionalString(env.IG_MANAGER_WEB_BASE_URL) ?? "http://localhost:5173"
  };
}

function readEnvironment(value: string | undefined): AppEnvironment {
  if (value === "test" || value === "production") {
    return value;
  }

  return "development";
}

function readLogLevel(value: string | undefined): LogLevel {
  if (value === "debug" || value === "warn" || value === "error") {
    return value;
  }

  return "info";
}

function readPort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function readMediaGenerationProvider(value: string | undefined): "mock" | "comfyui" {
  return value === "comfyui" ? "comfyui" : "mock";
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
