import { beforeEach, describe, expect, it } from "vitest";
import {
  createAccount,
  createConcept,
  createPluginRegistration,
  type Account,
  type AuditLog,
  type CandidateStatus,
  type Concept,
  type DomainEvent,
  type PluginRegistration,
  type PostCandidate,
  type PublishJob
} from "@ig-manager/domain";
import type { PublisherPlugin } from "@ig-manager/plugin-sdk";
import { pluginSuccess } from "@ig-manager/plugin-sdk";
import { WorkflowRuleViolationError } from "./errors.js";
import type { WorkflowRepositories } from "./interfaces.js";
import { WorkflowEngine } from "./workflow-engine.js";

const fixedNow = new Date("2026-05-31T00:00:00.000Z");
const scheduledAt = "2026-06-01T10:00:00.000Z";

describe("WorkflowEngine", () => {
  let store: MemoryStore;
  let events: DomainEvent[];
  let engine: WorkflowEngine;

  beforeEach(() => {
    store = createSeededStore();
    events = [];
    engine = new WorkflowEngine({
      repositories: createMemoryRepositories(store),
      events: {
        emit: (event) => {
          events.push(event);
        }
      },
      publisherPlugins: {
        getPublisher: (pluginRegistrationId) =>
          pluginRegistrationId === "plugin_publisher" ? mockPublisherPlugin : undefined
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 60_000
      }
    });
  });

  it("candidate cannot publish before approval", async () => {
    const created = await engine.createPostCandidate({
      id: "candidate_draft",
      accountId: "account_main",
      conceptId: "concept_manual",
      status: "draft",
      format: "feed_image",
      caption: "Draft candidate.",
      actorId: "creator",
      now: fixedNow
    });

    await expect(
      engine.scheduleCandidate({
        candidateId: created.data.id,
        publisherPluginId: "plugin_publisher",
        scheduledAt,
        actorId: "scheduler",
        now: fixedNow
      })
    ).rejects.toThrow(WorkflowRuleViolationError);

    expect(store.publishJobs.size).toBe(0);
  });

  it("approved candidate can be scheduled", async () => {
    const candidate = await createReadyCandidate();
    const approved = await engine.approveCandidate({
      candidateId: candidate.id,
      actorId: "reviewer",
      now: fixedNow
    });

    const scheduled = await engine.scheduleCandidate({
      candidateId: approved.data.id,
      publisherPluginId: "plugin_publisher",
      scheduledAt,
      actorId: "scheduler",
      now: fixedNow
    });

    expect(scheduled.data.candidate.status).toBe("scheduled");
    expect(scheduled.data.candidate.scheduledAt).toBe(scheduledAt);
  });

  it("scheduled candidate creates a publish job", async () => {
    const candidate = await createReadyCandidate();
    const approved = await engine.approveCandidate({
      candidateId: candidate.id,
      actorId: "reviewer",
      now: fixedNow
    });

    const scheduled = await engine.scheduleCandidate({
      candidateId: approved.data.id,
      publisherPluginId: "plugin_publisher",
      publishJobId: "publish_job_scheduled",
      scheduledAt,
      actorId: "scheduler",
      now: fixedNow
    });

    expect(scheduled.data.publishJob.id).toBe("publish_job_scheduled");
    expect(scheduled.data.publishJob.status).toBe("queued");
    expect(scheduled.data.publishJob.pluginRegistrationId).toBe("plugin_publisher");
    expect(store.publishJobs.get("publish_job_scheduled")).toEqual(scheduled.data.publishJob);
  });

  it("failed job increments retry count", async () => {
    const scheduled = await createScheduledCandidateWithJob("candidate_retry", "publish_job_retry");

    const running = await engine.runPublishJob({
      publishJobId: scheduled.publishJob.id,
      actorId: "worker",
      now: fixedNow
    });

    expect(running.data.job.attempt).toBe(1);

    const failed = await engine.markPublishFailed({
      publishJobId: running.data.job.id,
      code: "temporary_failure",
      message: "Temporary publisher error.",
      retryable: true,
      actorId: "worker",
      now: fixedNow
    });

    expect(failed.data.status).toBe("retry_scheduled");
    expect(failed.data.attempt).toBe(1);
    expect(failed.data.retryAfter).toBe("2026-05-31T00:01:00.000Z");

    const retried = await engine.retryPublishJob({
      publishJobId: failed.data.id,
      actorId: "worker",
      now: new Date("2026-05-31T00:01:00.000Z")
    });

    expect(retried.data.status).toBe("running");
    expect(retried.data.attempt).toBe(2);
  });

  it("stores scheduled times as UTC so due-job string comparison stays correct", async () => {
    const candidate = await createReadyCandidate("candidate_offset");
    await engine.approveCandidate({ candidateId: candidate.id, actorId: "reviewer", now: fixedNow });

    const scheduled = await engine.scheduleCandidate({
      candidateId: candidate.id,
      publisherPluginId: "plugin_publisher",
      publishJobId: "publish_job_offset",
      scheduledAt: "2026-06-01T19:00:00+09:00",
      actorId: "scheduler",
      now: fixedNow
    });

    expect(scheduled.data.publishJob.scheduledAt).toBe("2026-06-01T10:00:00.000Z");
    expect(scheduled.data.candidate.scheduledAt).toBe("2026-06-01T10:00:00.000Z");
  });

  it("auto trigger skips review-first jobs until a person requests a run", async () => {
    const scheduled = await createScheduledCandidateWithJob("candidate_manual", "publish_job_manual");

    const before = await engine.enqueueDuePublishJobs({
      dueBefore: "2026-05-31T00:00:00.000Z",
      actorId: "worker",
      trigger: "auto"
    });
    expect(before.data.jobs).toEqual([]);
    await expect(
      engine.runPublishJob({ publishJobId: scheduled.publishJob.id, actorId: "worker", trigger: "auto", now: fixedNow })
    ).rejects.toBeInstanceOf(WorkflowRuleViolationError);

    const requested = await engine.requestPublishJobRun({
      publishJobId: scheduled.publishJob.id,
      actorId: "reviewer",
      now: fixedNow
    });

    expect(requested.data.status).toBe("queued");
    expect(requested.data.scheduledAt).toBe(fixedNow.toISOString());
    expect(requested.data.metadata.runRequest).toEqual({
      requestedAt: fixedNow.toISOString(),
      requestedBy: "reviewer",
      originalScheduledAt: scheduledAt
    });
    expect(store.auditLogs.at(-1)?.action).toBe("publish_job.run_requested");
    expect(events.at(-1)?.type).toBe("PublishJobRunRequested");

    const due = await engine.enqueueDuePublishJobs({
      dueBefore: fixedNow.toISOString(),
      actorId: "worker",
      trigger: "auto"
    });
    expect(due.data.jobs.map((job) => job.id)).toEqual([scheduled.publishJob.id]);

    const running = await engine.runPublishJob({
      publishJobId: scheduled.publishJob.id,
      actorId: "worker",
      trigger: "auto",
      now: fixedNow
    });

    expect(running.data.job.status).toBe("running");
    expect(running.data.job.metadata.runRequest).toBeUndefined();
    expect(store.auditLogs.at(-1)?.metadata).toMatchObject({ trigger: "manual", runRequestedBy: "reviewer" });
  });

  it("a run request makes a retry-scheduled job due without starting it", async () => {
    const scheduled = await createScheduledCandidateWithJob("candidate_retry_request", "publish_job_retry_request");
    await engine.runPublishJob({ publishJobId: scheduled.publishJob.id, actorId: "worker", now: fixedNow });
    await engine.markPublishFailed({
      publishJobId: scheduled.publishJob.id,
      code: "temporary_failure",
      message: "Temporary publisher error.",
      retryable: true,
      actorId: "worker",
      now: fixedNow
    });

    const requestedAt = new Date("2026-05-31T00:00:30.000Z");
    const requested = await engine.requestPublishJobRun({
      publishJobId: scheduled.publishJob.id,
      actorId: "reviewer",
      now: requestedAt
    });

    // Regression: the API retry route used to move the job to "running" with
    // no process left to finish it, so it stayed running forever.
    expect(requested.data.status).toBe("retry_scheduled");
    expect(requested.data.attempt).toBe(1);
    expect(requested.data.retryAfter).toBe(requestedAt.toISOString());

    const due = await engine.enqueueDuePublishJobs({
      dueBefore: requestedAt.toISOString(),
      actorId: "worker",
      trigger: "auto"
    });
    expect(due.data.jobs.map((job) => job.id)).toEqual([scheduled.publishJob.id]);
  });

  it("refuses run requests for jobs that are not waiting", async () => {
    const scheduled = await createScheduledCandidateWithJob("candidate_running", "publish_job_running");
    await engine.runPublishJob({ publishJobId: scheduled.publishJob.id, actorId: "worker", now: fixedNow });

    await expect(
      engine.requestPublishJobRun({ publishJobId: scheduled.publishJob.id, actorId: "reviewer", now: fixedNow })
    ).rejects.toBeInstanceOf(WorkflowRuleViolationError);
  });

  it("audit logs are written", async () => {
    const candidate = await createReadyCandidate();
    await engine.approveCandidate({
      candidateId: candidate.id,
      actorId: "reviewer",
      now: fixedNow
    });

    expect(store.auditLogs.map((entry) => entry.action)).toEqual([
      "candidate.created",
      "candidate.approved"
    ]);
  });

  it("event emission works", async () => {
    const scheduled = await createScheduledCandidateWithJob("candidate_events", "publish_job_events");
    await engine.enqueueDuePublishJobs({
      dueBefore: "2026-06-01T11:00:00.000Z",
      actorId: "scheduler"
    });
    await engine.runPublishJob({
      publishJobId: scheduled.publishJob.id,
      actorId: "worker",
      now: fixedNow
    });
    await engine.markPublishSucceeded({
      publishJobId: scheduled.publishJob.id,
      externalPostId: "external_post_1",
      actorId: "worker",
      now: fixedNow
    });

    expect(events.map((event) => event.type)).toEqual([
      "CandidateCreated",
      "CandidateApproved",
      "PostScheduled",
      "PublishJobsDueChecked",
      "PublishJobEnqueued",
      "PublishJobStarted",
      "PublishSucceeded"
    ]);
    expect(store.candidates.get("candidate_events")?.status).toBe("published");
  });

  async function createReadyCandidate(id = "candidate_ready"): Promise<PostCandidate> {
    const created = await engine.createPostCandidate({
      id,
      accountId: "account_main",
      conceptId: "concept_manual",
      status: "ready_for_review",
      format: "feed_image",
      caption: "Ready candidate.",
      actorId: "creator",
      now: fixedNow
    });

    return created.data;
  }

  async function createScheduledCandidateWithJob(candidateId: string, publishJobId: string) {
    const candidate = await createReadyCandidate(candidateId);
    const approved = await engine.approveCandidate({
      candidateId: candidate.id,
      actorId: "reviewer",
      now: fixedNow
    });

    return engine
      .scheduleCandidate({
        candidateId: approved.data.id,
        publisherPluginId: "plugin_publisher",
        publishJobId,
        scheduledAt,
        actorId: "scheduler",
        now: fixedNow
      })
      .then((result) => result.data);
  }
});

interface MemoryStore {
  accounts: Map<string, Account>;
  auditLogs: AuditLog[];
  candidates: Map<string, PostCandidate>;
  concepts: Map<string, Concept>;
  plugins: Map<string, PluginRegistration>;
  publishJobs: Map<string, PublishJob>;
}

function createSeededStore(): MemoryStore {
  const account = createAccount({
    id: "account_main",
    platform: { id: "instagram", displayName: "Instagram", metadata: {} },
    handle: "main",
    status: "connected",
    schedulePolicy: {
      timezone: "UTC",
      minLeadTimeMinutes: 0,
      maxPostsPerDay: 10,
      allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
      allowedTimeWindows: [{ start: "00:00", end: "23:59" }],
      requireApprovedCandidate: true
    },
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  });
  const concept = createConcept({
    id: "concept_manual",
    accountId: account.id,
    name: "Manual Concept",
    description: "Requires review before scheduling.",
    audience: "Operators",
    pillars: ["workflow"],
    voice: "Direct.",
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  });
  const publisher = createPluginRegistration({
    id: "plugin_publisher",
    pluginId: "official.publisher.mock",
    name: "Official Publisher Mock",
    version: "0.1.0",
    type: "publisher",
    enabled: true,
    officialApiOnly: true,
    capabilities: ["publish"],
    permissions: ["candidate:read", "publish:approved"],
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z"
  });

  return {
    accounts: new Map([[account.id, account]]),
    auditLogs: [],
    candidates: new Map(),
    concepts: new Map([[concept.id, concept]]),
    plugins: new Map([[publisher.id, publisher]]),
    publishJobs: new Map()
  };
}

function createMemoryRepositories(store: MemoryStore): WorkflowRepositories {
  return {
    accounts: {
      getById: (id) => store.accounts.get(id)
    },
    auditLogs: {
      append: (entry) => {
        store.auditLogs.push(entry);
        return entry;
      }
    },
    candidates: {
      create: (candidate) => {
        store.candidates.set(candidate.id, candidate);
        return candidate;
      },
      getById: (id) => store.candidates.get(id),
      update: (candidate) => {
        store.candidates.set(candidate.id, candidate);
        return candidate;
      },
      getByStatus: (status: CandidateStatus) =>
        [...store.candidates.values()].filter((candidate) => candidate.status === status)
    },
    concepts: {
      getById: (id) => store.concepts.get(id)
    },
    plugins: {
      getById: (id) => store.plugins.get(id)
    },
    publishJobs: {
      create: (job) => {
        store.publishJobs.set(job.id, job);
        return job;
      },
      getById: (id) => store.publishJobs.get(id),
      update: (job) => {
        store.publishJobs.set(job.id, job);
        return job;
      },
      getScheduledJobsDueBefore: (timestamp) =>
        [...store.publishJobs.values()].filter(
          (job) =>
            (job.status === "queued" && job.scheduledAt <= timestamp) ||
            (job.status === "retry_scheduled" &&
              typeof job.retryAfter === "string" &&
              job.retryAfter <= timestamp)
        )
    }
  };
}

const mockPublisherPlugin: PublisherPlugin = {
  manifest: {
    schemaVersion: "ig-manager.plugin.v1",
    id: "mock.publisher",
    name: "Mock Publisher",
    version: "0.1.0",
    description: "Mock publisher contract for workflow tests.",
    type: "publisher",
    distribution: "community",
    private: false,
    officialApiOnly: true,
    permissions: ["candidate:read", "publish:validate", "publish:approved"],
    capabilities: [{ id: "publish.mock" }],
    uiExtensionPoints: [],
    dryRun: { supported: true, modes: ["validate_only"] },
    metadata: {}
  },
  validatePublish: async () =>
    pluginSuccess({
      valid: true,
      issues: []
    }),
  publish: async () =>
    pluginSuccess({
      externalPostId: "mock_external_post"
    })
};
