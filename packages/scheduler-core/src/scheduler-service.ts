import type { PublishJob } from "@ig-manager/domain";
import type { PluginContext, PublisherPlugin } from "@ig-manager/plugin-sdk";
import type {
  PublishFailureInput,
  PublisherPluginRegistry,
  RunPublishJobResult,
  WorkflowActionResult
} from "@ig-manager/workflow-engine";
import type { Clock } from "./clock.js";
import type { JobLock } from "./job-lock.js";
import type { SchedulerLogger } from "./logger.js";
import { silentSchedulerLogger } from "./logger.js";
import { FixedIntervalRetryPolicy, type RetryPolicy } from "./retry-policy.js";

export interface SchedulerWorkflowEngine {
  enqueueDuePublishJobs(command: {
    dueBefore: string;
    actorId?: string;
    trigger?: "manual" | "auto";
  }): Promise<WorkflowActionResult<{ jobs: PublishJob[] }>>;
  runPublishJob(command: {
    publishJobId: string;
    actorId?: string;
    trigger?: "manual" | "auto";
    now?: Date;
  }): Promise<WorkflowActionResult<RunPublishJobResult>>;
  markPublishSucceeded(command: {
    publishJobId: string;
    actorId?: string;
    externalPostId?: string;
    permalink?: string;
    rawResultRef?: string;
    now?: Date;
  }): Promise<WorkflowActionResult<PublishJob>>;
  markPublishFailed(command: PublishFailureInput & {
    publishJobId: string;
    actorId?: string;
    now?: Date;
  }): Promise<WorkflowActionResult<PublishJob>>;
}

export interface SchedulerServiceOptions {
  workflow: SchedulerWorkflowEngine;
  publishers: PublisherPluginRegistry;
  jobLock: JobLock;
  clock: Clock;
  retryPolicy?: RetryPolicy;
  logger?: SchedulerLogger;
  actorId?: string;
  workspaceId?: string;
  dryRun?: boolean;
  trigger?: "manual" | "auto";
}

export type JobExecutionStatus = "succeeded" | "failed" | "dry_run" | "locked";

export interface JobExecutionResult {
  jobId: string;
  status: JobExecutionStatus;
  error?: string;
}

export interface SchedulerPollResult {
  dueBefore: string;
  selected: number;
  results: JobExecutionResult[];
}

export class SchedulerService {
  private readonly logger: SchedulerLogger;
  private readonly retryPolicy: RetryPolicy;
  private readonly actorId: string;
  private readonly workspaceId: string;
  private readonly trigger: "manual" | "auto";

  constructor(private readonly options: SchedulerServiceOptions) {
    this.logger = options.logger ?? silentSchedulerLogger;
    this.retryPolicy = options.retryPolicy ?? new FixedIntervalRetryPolicy();
    this.actorId = options.actorId ?? "local-worker";
    this.workspaceId = options.workspaceId ?? "local";
    this.trigger = options.trigger ?? "auto";
  }

  async pollOnce(): Promise<SchedulerPollResult> {
    const dueBefore = this.options.clock.now().toISOString();
    const enqueued = await this.options.workflow.enqueueDuePublishJobs({
      dueBefore,
      actorId: this.actorId,
      trigger: this.trigger
    });

    this.logger.info("scheduler selected due publish jobs", {
      dueBefore,
      count: enqueued.data.jobs.length,
      dryRun: this.options.dryRun === true
    });

    const results: JobExecutionResult[] = [];

    for (const job of enqueued.data.jobs) {
      const lock = await this.options.jobLock.acquire(job.id);

      if (!lock) {
        this.logger.warn("publish job is already locked, skipping", { jobId: job.id });
        results.push({ jobId: job.id, status: "locked" });
        continue;
      }

      try {
        results.push(await this.runJob(job));
      } finally {
        await lock.release();
      }
    }

    return {
      dueBefore,
      selected: enqueued.data.jobs.length,
      results
    };
  }

  private async runJob(job: PublishJob): Promise<JobExecutionResult> {
    if (this.options.dryRun) {
      this.logger.info("dry-run: publish job would execute", {
        jobId: job.id,
        candidateId: job.candidateId,
        scheduledAt: job.scheduledAt
      });
      return { jobId: job.id, status: "dry_run" };
    }

    let runningJob: PublishJob | undefined;

    try {
      const running = await this.options.workflow.runPublishJob({
        publishJobId: job.id,
        actorId: this.actorId,
        trigger: this.trigger,
        now: this.options.clock.now()
      });
      runningJob = running.data.job;
      const publisher = await this.getPublisher(running.data.publisherPluginId);
      const context = this.createPluginContext(publisher);
      const validation = await publisher.validatePublish(
        {
          account: running.data.account,
          candidate: running.data.candidate,
          job: running.data.job
        },
        context
      );

      if (!validation.ok || !validation.data.valid) {
        const issue = validation.ok ? validation.data.issues[0] : validation.error;
        return this.failRunningJob(running.data.job, {
          code: "publish_validation_failed",
          message: issue?.message ?? "Publisher validation failed.",
          retryable: false
        });
      }

      const published = await publisher.publish(
        {
          account: running.data.account,
          candidate: running.data.candidate,
          job: running.data.job,
          approvedBy: this.actorId
        },
        context
      );

      if (!published.ok) {
        return this.failRunningJob(running.data.job, {
          code: published.error.code,
          message: published.error.message,
          retryable: published.error.retryable
        });
      }

      await this.options.workflow.markPublishSucceeded({
        publishJobId: running.data.job.id,
        actorId: this.actorId,
        externalPostId: published.data.externalPostId,
        permalink: published.data.permalink,
        rawResultRef: published.data.rawResultRef,
        now: this.options.clock.now()
      });

      this.logger.info("publish job succeeded", {
        jobId: job.id,
        externalPostId: published.data.externalPostId
      });

      return { jobId: job.id, status: "succeeded" };
    } catch (error) {
      this.logger.error("publish job failed before publisher completion", {
        jobId: job.id,
        error: formatError(error)
      });

      if (runningJob) {
        return this.failRunningJob(runningJob, {
          code: "scheduler_execution_error",
          message: formatError(error),
          retryable: true
        });
      }

      return {
        jobId: job.id,
        status: "failed",
        error: formatError(error)
      };
    }
  }

  private async failRunningJob(
    job: PublishJob,
    failure: {
      code: string;
      message: string;
      retryable: boolean;
    }
  ): Promise<JobExecutionResult> {
    const now = this.options.clock.now();
    const retryAfter = this.retryPolicy.nextRetryAt(job, failure, now);

    await this.options.workflow.markPublishFailed({
      publishJobId: job.id,
      actorId: this.actorId,
      code: failure.code,
      message: failure.message,
      retryable: failure.retryable,
      retryAfter,
      now
    });

    this.logger.warn("publish job failed", {
      jobId: job.id,
      code: failure.code,
      retryable: failure.retryable,
      retryAfter
    });

    return {
      jobId: job.id,
      status: "failed",
      error: failure.message
    };
  }

  private async getPublisher(pluginRegistrationId: string): Promise<PublisherPlugin> {
    const publisher = await this.options.publishers.getPublisher(pluginRegistrationId);

    if (!publisher) {
      throw new Error(`Publisher plugin '${pluginRegistrationId}' is not registered.`);
    }

    return publisher;
  }

  private createPluginContext(publisher: PublisherPlugin): PluginContext {
    return {
      workspaceId: this.workspaceId,
      pluginId: publisher.manifest.id,
      manifest: publisher.manifest,
      permissions: publisher.manifest.permissions,
      dryRun: false,
      logger: this.logger
    };
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
