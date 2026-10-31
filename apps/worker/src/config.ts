import { defaultDatabaseFilename } from "@ig-manager/db";
import type { LogLevel } from "@ig-manager/logger";

export interface WorkerConfig {
  databaseUrl: string;
  pollIntervalMs: number;
  dryRun: boolean;
  runOnce: boolean;
  logLevel: LogLevel;
  actorId: string;
  workspaceId: string;
  trigger: "manual" | "auto";
  retryMaxAttempts: number;
  retryIntervalMs: number;
}

export function readWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return {
    databaseUrl: readString(env.WORKER_DATABASE_URL ?? env.DATABASE_URL, defaultDatabaseFilename()),
    pollIntervalMs: readPositiveInteger(env.WORKER_POLL_INTERVAL_MS, 30_000),
    dryRun: readBoolean(env.WORKER_DRY_RUN, false),
    runOnce: readBoolean(env.WORKER_RUN_ONCE, false),
    logLevel: readLogLevel(env.WORKER_LOG_LEVEL ?? env.LOG_LEVEL),
    actorId: readString(env.WORKER_ACTOR_ID, "local-worker"),
    workspaceId: readString(env.WORKER_WORKSPACE_ID, "local"),
    trigger: readTrigger(env.WORKER_TRIGGER),
    retryMaxAttempts: readPositiveInteger(env.WORKER_RETRY_MAX_ATTEMPTS, 3),
    retryIntervalMs: readPositiveInteger(env.WORKER_RETRY_INTERVAL_MS, 5 * 60_000)
  };
}

function readString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function readLogLevel(value: string | undefined): LogLevel {
  if (value === "debug" || value === "warn" || value === "error") {
    return value;
  }

  return "info";
}

function readTrigger(value: string | undefined): "manual" | "auto" {
  return value === "manual" ? "manual" : "auto";
}
