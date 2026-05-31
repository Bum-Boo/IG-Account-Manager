import { describe, expect, it } from "vitest";
import {
  createAccount,
  createPostCandidate,
  createPublishJob,
  failPublishJob,
  startPublishJob,
  succeedPublishJob,
  type Account,
  type PostCandidate,
  type PublishJob
} from "@ig-manager/domain";
import { pluginFailure, pluginSuccess, type PublisherPlugin } from "@ig-manager/plugin-sdk";
import type { PublisherPluginRegistry } from "@ig-manager/workflow-engine";
import type { Clock } from "./clock.js";
import { InMemoryJobLock } from "./job-lock.js";
import { FixedIntervalRetryPolicy } from "./retry-policy.js";
import { SchedulerService, type SchedulerWorkflowEngine } from "./scheduler-service.js";

const fixedNow = new Date("2026-05-31T12:00:00.000Z");
const dueAt = "2026-05-31T11:55:00.000Z";
const futureAt = "2026-05-31T12:30:00.000Z";

describe("SchedulerService", () => {
  it("selects due jobs and executes them", async () => {
    const workflow = createFakeWorkflow([createJob("job_due", dueAt)]);
    const publisher = createCountingPublisher();
    const service = createService(workflow, publisher.registry);

    const result = await service.pollOnce();

    expect(result.selected).toBe(1);
    expect(result.results).toEqual([{ jobId: "job_due", status: "succeeded" }]);
    expect(workflow.runCalls).toEqual(["job_due"]);
    expect(publisher.publishCalls).toBe(1);
    expect(workflow.jobs.get("job_due")?.status).toBe("succeeded");
  });

  it("ignores future jobs", async () => {
    const workflow = createFakeWorkflow([createJob("job_future", futureAt)]);
    const publisher = createCountingPublisher();
    const service = createService(workflow, publisher.registry);

    const result = await service.pollOnce();

    expect(result.selected).toBe(0);
    expect(result.results).toEqual([]);
    expect(workflow.runCalls).toEqual([]);
    expect(publisher.publishCalls).toBe(0);
  });

  it("skips locked jobs", async () => {
    const workflow = createFakeWorkflow([createJob("job_locked", dueAt)]);
    const lock = new InMemoryJobLock(testClock);
    const heldLock = await lock.acquire("job_locked");
    const publisher = createCountingPublisher();
    const service = createService(workflow, publisher.registry, { lock });

    const result = await service.pollOnce();

    expect(result.selected).toBe(1);
    expect(result.results).toEqual([{ jobId: "job_locked", status: "locked" }]);
    expect(workflow.runCalls).toEqual([]);
    expect(publisher.publishCalls).toBe(0);

    await heldLock?.release();
  });

  it("retries failed jobs according to policy", async () => {
    const workflow = createFakeWorkflow([createJob("job_retry", dueAt)]);
    const publisher = createCountingPublisher({ fail: true, retryable: true });
    const service = createService(workflow, publisher.registry, {
      retryPolicy: new FixedIntervalRetryPolicy(3, 60_000)
    });

    const result = await service.pollOnce();

    expect(result.results).toEqual([
      { jobId: "job_retry", status: "failed", error: "Publisher is temporarily unavailable." }
    ]);
    expect(workflow.failures).toEqual([
      {
        publishJobId: "job_retry",
        code: "temporary_publisher_error",
        message: "Publisher is temporarily unavailable.",
        retryable: true,
        retryAfter: "2026-05-31T12:01:00.000Z"
      }
    ]);
    expect(workflow.jobs.get("job_retry")?.status).toBe("retry_scheduled");
  });

  it("dry-run does not call the publisher or start the job", async () => {
    const workflow = createFakeWorkflow([createJob("job_dry_run", dueAt)]);
    const publisher = createCountingPublisher();
    const service = createService(workflow, publisher.registry, { dryRun: true });

    const result = await service.pollOnce();

    expect(result.results).toEqual([{ jobId: "job_dry_run", status: "dry_run" }]);
    expect(workflow.runCalls).toEqual([]);
    expect(publisher.publishCalls).toBe(0);
    expect(workflow.jobs.get("job_dry_run")?.status).toBe("queued");
  });
});

function createService(
  workflow: FakeWorkflow,
  publishers: PublisherPluginRegistry,
  options: {
    dryRun?: boolean;
    lock?: InMemoryJobLock;
    retryPolicy?: FixedIntervalRetryPolicy;
  } = {}
) {
  return new SchedulerService({
    workflow,
    publishers,
    jobLock: options.lock ?? new InMemoryJobLock(testClock),
    clock: testClock,
    retryPolicy: options.retryPolicy,
    dryRun: options.dryRun,
    trigger: "manual"
  });
}

function createJob(id: string, scheduledAt: string): PublishJob {
  return createPublishJob({
    id,
    accountId: account.id,
    candidateId: candidate.id,
    pluginRegistrationId: "plugin_mock_publisher",
    scheduledAt,
    maxAttempts: 3,
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  });
}

function createFakeWorkflow(seedJobs: PublishJob[]): FakeWorkflow {
  return new FakeWorkflow(seedJobs);
}

class FakeWorkflow implements SchedulerWorkflowEngine {
  readonly jobs = new Map<string, PublishJob>();
  readonly runCalls: string[] = [];
  readonly failures: Array<{
    publishJobId: string;
    code?: string;
    message: string;
    retryable?: boolean;
    retryAfter?: string;
  }> = [];

  constructor(seedJobs: PublishJob[]) {
    for (const job of seedJobs) {
      this.jobs.set(job.id, job);
    }
  }

  async enqueueDuePublishJobs(command: { dueBefore: string }) {
    const jobs = [...this.jobs.values()].filter(
      (job) =>
        (job.status === "queued" && job.scheduledAt <= command.dueBefore) ||
        (job.status === "retry_scheduled" && job.retryAfter && job.retryAfter <= command.dueBefore)
    );

    return { data: { jobs }, events: [], auditLogs: [] };
  }

  async runPublishJob(command: { publishJobId: string; now?: Date }) {
    this.runCalls.push(command.publishJobId);
    const job = this.getJob(command.publishJobId);
    const running = startPublishJob(job, (command.now ?? fixedNow).toISOString());
    this.jobs.set(running.id, running);

    return {
      data: {
        job: running,
        account,
        candidate,
        publisherPluginId: running.pluginRegistrationId
      },
      events: [],
      auditLogs: []
    };
  }

  async markPublishSucceeded(command: { publishJobId: string; now?: Date }) {
    const job = this.getJob(command.publishJobId);
    const succeeded = succeedPublishJob(job, {
      externalPostId: "external_post_1",
      now: (command.now ?? fixedNow).toISOString()
    });
    this.jobs.set(succeeded.id, succeeded);

    return { data: succeeded, events: [], auditLogs: [] };
  }

  async markPublishFailed(command: {
    publishJobId: string;
    code?: string;
    message: string;
    retryable?: boolean;
    retryAfter?: string;
    now?: Date;
  }) {
    this.failures.push({
      publishJobId: command.publishJobId,
      code: command.code,
      message: command.message,
      retryable: command.retryable,
      retryAfter: command.retryAfter
    });
    const job = this.getJob(command.publishJobId);
    const failed = failPublishJob(job, {
      code: command.code,
      message: command.message,
      retryAfter: command.retryAfter,
      now: (command.now ?? fixedNow).toISOString()
    });
    this.jobs.set(failed.id, failed);

    return { data: failed, events: [], auditLogs: [] };
  }

  private getJob(id: string): PublishJob {
    const job = this.jobs.get(id);

    if (!job) {
      throw new Error(`Unknown job '${id}'.`);
    }

    return job;
  }
}

function createCountingPublisher(options: { fail?: boolean; retryable?: boolean } = {}) {
  let publishCalls = 0;
  const plugin: PublisherPlugin = {
    manifest: {
      schemaVersion: "ig-manager.plugin.v1",
      id: "mock.publisher",
      name: "Mock Publisher",
      version: "0.1.0",
      description: "Mock publisher for scheduler tests.",
      type: "publisher",
      distribution: "community",
      private: false,
      officialApiOnly: true,
      permissions: ["candidate:read", "publish:validate", "publish:approved"],
      capabilities: [{ id: "publish.mock" }],
      uiExtensionPoints: [],
      dryRun: { supported: true, modes: ["validate_only", "preview", "no_write"] },
      metadata: {}
    },
    validatePublish: async () => pluginSuccess({ valid: true, issues: [] }),
    publish: async () => {
      publishCalls += 1;

      if (options.fail) {
        return pluginFailure({
          code: "temporary_publisher_error",
          message: "Publisher is temporarily unavailable.",
          retryable: options.retryable ?? true
        });
      }

      return pluginSuccess({
        externalPostId: "external_post_1",
        permalink: "https://example.invalid/posts/external_post_1",
        rawResultRef: "mock://external_post_1"
      });
    }
  };

  return {
    registry: {
      getPublisher: (pluginRegistrationId: string) =>
        pluginRegistrationId === "plugin_mock_publisher" ? plugin : undefined
    },
    get publishCalls() {
      return publishCalls;
    }
  };
}

const testClock: Clock = {
  now: () => fixedNow,
  sleep: async () => undefined
};

const account: Account = createAccount({
  id: "account_main",
  platform: { id: "local", displayName: "Local Test", metadata: {} },
  handle: "main",
  status: "connected",
  schedulePolicy: {
    timezone: "UTC",
    minLeadTimeMinutes: 0,
    maxPostsPerDay: 10,
    allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    allowedTimeWindows: [{ start: "00:00", end: "23:59" }]
  },
  createdAt: "2026-05-31T00:00:00.000Z",
  updatedAt: "2026-05-31T00:00:00.000Z"
});

const candidate: PostCandidate = createPostCandidate({
  id: "candidate_scheduled",
  accountId: account.id,
  conceptId: "concept_main",
  status: "scheduled",
  format: "feed_image",
  caption: "Scheduled candidate.",
  scheduledAt: dueAt,
  approvedAt: "2026-05-31T00:00:00.000Z",
  approvedBy: "reviewer",
  createdAt: "2026-05-31T00:00:00.000Z",
  updatedAt: "2026-05-31T00:00:00.000Z"
});
