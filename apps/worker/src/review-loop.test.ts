import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDatabase,
  createRepositories,
  runMigrations,
  seedStarterWorkspace,
  STARTER_MOCK_PUBLISHER_ID
} from "@ig-manager/db";
import { WorkflowEngine } from "@ig-manager/workflow-engine";
import { startWorker, type WorkerConfig } from "./index.js";

describe("worker review loop against a shared SQLite file", () => {
  let directory: string;
  let databaseUrl: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "ig-manager-worker-"));
    databaseUrl = join(directory, "workspace.sqlite");
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("publishes a reviewed job with the mock publisher only after a person requests the run", async () => {
    // Stand-in for the API process: same file, separate connection.
    const api = createDatabase(databaseUrl);
    runMigrations(api.client);
    seedStarterWorkspace(api);
    const repositories = createRepositories(api.db);
    const workflow = new WorkflowEngine({ repositories, events: { emit: () => undefined } });

    await workflow.approveCandidate({ candidateId: "candidate_starter_morning", actorId: "reviewer" });
    await workflow.scheduleCandidate({
      candidateId: "candidate_starter_morning",
      publisherPluginId: STARTER_MOCK_PUBLISHER_ID,
      publishJobId: "job_review_loop",
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      actorId: "reviewer"
    });

    // The default worker (auto trigger) must not publish review-first work on its own.
    await startWorker({ config: workerConfig() }).done;
    expect(repositories.publishJobs.getById("job_review_loop")?.status).toBe("queued");

    await workflow.requestPublishJobRun({ publishJobId: "job_review_loop", actorId: "reviewer" });
    await startWorker({ config: workerConfig() }).done;

    const job = repositories.publishJobs.getById("job_review_loop");
    expect(job?.status).toBe("succeeded");
    expect(job?.attempt).toBe(1);
    expect(job?.result?.externalPostId).toBe("mock_candidate_starter_morning");
    expect(repositories.candidates.getById("candidate_starter_morning")?.status).toBe("published");

    const actions = repositories.auditLogs.listForEntity("publish_job", "job_review_loop").map((entry) => entry.action);
    expect(actions).toEqual(["publish_job.run_requested", "publish_job.started", "publish_job.succeeded"]);
    const started = repositories.auditLogs.listForEntity("publish_job", "job_review_loop")[1];
    expect(started?.actorId).toBe("test-worker");
    expect(started?.metadata).toMatchObject({ trigger: "manual", runRequestedBy: "reviewer" });

    // A second poll must not publish the same job again.
    await startWorker({ config: workerConfig() }).done;
    expect(repositories.publishJobs.getById("job_review_loop")?.attempt).toBe(1);

    api.close();
  });

  function workerConfig(): WorkerConfig {
    return {
      databaseUrl,
      pollIntervalMs: 1000,
      dryRun: false,
      runOnce: true,
      logLevel: "error",
      actorId: "test-worker",
      workspaceId: "test",
      trigger: "auto",
      retryMaxAttempts: 3,
      retryIntervalMs: 1000
    };
  }
});
