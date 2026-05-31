export type AppEnvironment = "development" | "test" | "production";
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface AppConfig {
  environment: AppEnvironment;
  logLevel: LogLevel;
  apiHost: string;
  apiPort: number;
  webPort: number;
  comfyUiPath?: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    environment: readEnvironment(env.NODE_ENV),
    logLevel: readLogLevel(env.LOG_LEVEL),
    apiHost: env.API_HOST ?? "0.0.0.0",
    apiPort: readPort(env.API_PORT, 3001),
    webPort: readPort(env.WEB_PORT, 5173),
    comfyUiPath: readOptionalString(env.COMFYUI_PATH)
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

function readOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
