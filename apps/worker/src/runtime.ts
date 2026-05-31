import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabase, createRepositories, runMigrations, type DatabaseHandle } from "@ig-manager/db";
import { createLogger, type Logger } from "@ig-manager/logger";
import {
  FixedIntervalRetryPolicy,
  InMemoryJobLock,
  JobPoller,
  SchedulerService,
  SystemClock
} from "@ig-manager/scheduler-core";
import { WorkflowEngine } from "@ig-manager/workflow-engine";
import { readWorkerConfig, type WorkerConfig } from "./config.js";
import { createSqliteEventPublisher } from "./events.js";
import { createLocalPublisherRegistry } from "./publisher-registry.js";

export interface WorkerRuntime {
  name: "ig-manager-worker";
  startedAt: string;
  config: WorkerConfig;
  done: Promise<void>;
  stop(): Promise<void>;
}

export interface StartWorkerOptions {
  config?: WorkerConfig;
  env?: NodeJS.ProcessEnv;
}

export function startWorker(options: StartWorkerOptions = {}): WorkerRuntime {
  const config = options.config ?? readWorkerConfig(options.env);
  const logger = createLogger(config.logLevel);
  const clock = new SystemClock();
  const handle = createWorkerDatabase(config.databaseUrl);
  const repositories = createRepositories(handle.db);
  const publishers = createLocalPublisherRegistry({
    plugins: repositories.plugins,
    logger
  });
  const workflow = new WorkflowEngine({
    repositories,
    events: createSqliteEventPublisher(handle.db, logger),
    publisherPlugins: publishers,
    retryPolicy: {
      maxAttempts: config.retryMaxAttempts,
      backoffMs: config.retryIntervalMs
    }
  });
  const scheduler = new SchedulerService({
    workflow,
    publishers,
    jobLock: new InMemoryJobLock(clock),
    clock,
    retryPolicy: new FixedIntervalRetryPolicy(config.retryMaxAttempts, config.retryIntervalMs),
    logger,
    actorId: config.actorId,
    workspaceId: config.workspaceId,
    dryRun: config.dryRun,
    trigger: config.trigger
  });
  const poller = new JobPoller({
    clock,
    intervalMs: config.pollIntervalMs,
    logger,
    poll: () => scheduler.pollOnce().then(() => undefined)
  });
  const abortController = new AbortController();

  logger.info("worker starting", {
    databaseUrl: config.databaseUrl,
    pollIntervalMs: config.pollIntervalMs,
    dryRun: config.dryRun,
    runOnce: config.runOnce,
    trigger: config.trigger
  });

  runMigrations(handle.client);

  const done = runWorkerLoop({
    config,
    poller,
    scheduler,
    abortController,
    handle,
    logger
  });

  return {
    name: "ig-manager-worker",
    startedAt: clock.now().toISOString(),
    config,
    done,
    stop: async () => {
      abortController.abort();
      await done;
    }
  };
}

function createWorkerDatabase(databaseUrl: string): DatabaseHandle {
  const filename = resolveDatabaseFilename(databaseUrl);

  if (filename !== ":memory:") {
    const directory = dirname(filename);

    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  }

  return createDatabase(filename);
}

async function runWorkerLoop(options: {
  config: WorkerConfig;
  poller: JobPoller;
  scheduler: SchedulerService;
  abortController: AbortController;
  handle: DatabaseHandle;
  logger: Logger;
}): Promise<void> {
  try {
    if (options.config.runOnce) {
      await options.scheduler.pollOnce();
      return;
    }

    await options.poller.start(options.abortController.signal);
  } finally {
    options.handle.close();
    options.logger.info("worker stopped");
  }
}

function resolveDatabaseFilename(databaseUrl: string): string {
  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  if (databaseUrl.startsWith("file:")) {
    return fileURLToPath(databaseUrl);
  }

  return resolve(databaseUrl);
}
