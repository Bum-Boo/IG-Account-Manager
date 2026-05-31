import { describe, expect, it } from "vitest";
import { readWorkerConfig, startWorker } from "./index.js";

describe("worker", () => {
  it("loads worker config from environment", () => {
    const config = readWorkerConfig({
      WORKER_DATABASE_URL: ":memory:",
      WORKER_POLL_INTERVAL_MS: "1000",
      WORKER_DRY_RUN: "true",
      WORKER_RUN_ONCE: "true",
      WORKER_LOG_LEVEL: "debug",
      WORKER_TRIGGER: "manual",
      WORKER_RETRY_MAX_ATTEMPTS: "5",
      WORKER_RETRY_INTERVAL_MS: "2500"
    });

    expect(config).toMatchObject({
      databaseUrl: ":memory:",
      pollIntervalMs: 1000,
      dryRun: true,
      runOnce: true,
      logLevel: "debug",
      trigger: "manual",
      retryMaxAttempts: 5,
      retryIntervalMs: 2500
    });
  });

  it("starts a run-once worker against SQLite", async () => {
    const runtime = startWorker({
      config: {
        databaseUrl: ":memory:",
        pollIntervalMs: 1000,
        dryRun: true,
        runOnce: true,
        logLevel: "error",
        actorId: "test-worker",
        workspaceId: "test",
        trigger: "auto",
        retryMaxAttempts: 3,
        retryIntervalMs: 1000
      }
    });

    await runtime.done;

    expect(runtime.name).toBe("ig-manager-worker");
    expect(runtime.config.dryRun).toBe(true);
  });
});
