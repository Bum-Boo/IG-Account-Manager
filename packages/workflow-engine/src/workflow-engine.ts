import {
  canRetryPublishJob,
  createAuditLog,
  createDomainEvent,
  createPostCandidate as createDomainPostCandidate,
  createPublishJob,
  failPublishJob,
  isoNow,
  PublishJobSchema,
  markCandidatePublishFailed,
  markCandidatePublished,
  approveCandidate as approveDomainCandidate,
  rejectCandidate as rejectDomainCandidate,
  scheduleCandidate as scheduleDomainCandidate,
  startPublishJob,
  succeedPublishJob,
  type AuditLog,
  type DomainEvent,
  type PostCandidate,
  type PublishJob
} from "@ig-manager/domain";
import type { CreatePostCandidateInput } from "@ig-manager/domain";
import { WorkflowNotFoundError, WorkflowRuleViolationError } from "./errors.js";
import type {
  EnqueueDuePublishJobsResult,
  PublishFailureInput,
  PublishSuccessInput,
  PublishTrigger,
  RetryPolicy,
  RunPublishJobResult,
  ScheduleCandidateResult,
  WorkflowActionResult,
  WorkflowEngineOptions,
  WorkflowRepositories
} from "./interfaces.js";
import { allowsAutoPublish, conceptAllowsAutoSchedule, getPublishJobRunRequest } from "./policies.js";

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: 5 * 60 * 1000
};

export interface CreatePostCandidateCommand extends Omit<CreatePostCandidateInput, "createdAt" | "updatedAt"> {
  actorId?: string;
  now?: Date;
}

export interface CandidateDecisionCommand {
  candidateId: string;
  actorId?: string;
  now?: Date;
}

export interface RejectCandidateCommand extends CandidateDecisionCommand {
  reason: string;
}

export interface ScheduleCandidateCommand {
  candidateId: string;
  scheduledAt: string;
  publisherPluginId: string;
  actorId?: string;
  autoPublish?: boolean;
  now?: Date;
  publishJobId?: string;
  maxAttempts?: number;
}

export interface EnqueueDuePublishJobsCommand {
  dueBefore: string;
  actorId?: string;
  trigger?: PublishTrigger;
}

export interface RunPublishJobCommand {
  publishJobId: string;
  actorId?: string;
  trigger?: PublishTrigger;
  now?: Date;
}

export interface MarkPublishSucceededCommand extends PublishSuccessInput {
  publishJobId: string;
  actorId?: string;
  now?: Date;
}

export interface MarkPublishFailedCommand extends PublishFailureInput {
  publishJobId: string;
  actorId?: string;
  now?: Date;
}

export interface RetryPublishJobCommand {
  publishJobId: string;
  actorId?: string;
  now?: Date;
}

export interface RequestPublishJobRunCommand {
  publishJobId: string;
  actorId?: string;
  now?: Date;
}

export class WorkflowEngine {
  private readonly repositories: WorkflowRepositories;
  private readonly retryPolicy: RetryPolicy;

  constructor(private readonly options: WorkflowEngineOptions) {
    this.repositories = options.repositories;
    this.retryPolicy = {
      ...DEFAULT_RETRY_POLICY,
      ...options.retryPolicy
    };
  }

  async createPostCandidate(
    command: CreatePostCandidateCommand
  ): Promise<WorkflowActionResult<PostCandidate>> {
    await this.getRequiredAccount(command.accountId);
    await this.getRequiredConcept(command.conceptId);

    const now = isoNow(command.now);
    const { actorId: _actorId, now: _now, ...candidateInput } = command;
    const candidate = createDomainPostCandidate({
      ...candidateInput,
      createdAt: now,
      updatedAt: now
    });

    await this.repositories.candidates.create(candidate);

    const events: DomainEvent[] = [
      createDomainEvent(
        "CandidateCreated",
        {
          candidateId: candidate.id,
          accountId: candidate.accountId,
          conceptId: candidate.conceptId
        },
        { actorId: command.actorId, occurredAt: now }
      )
    ];

    if (candidate.firstComment) {
      events.push(
        createDomainEvent(
          "FirstCommentCreated",
          {
            candidateId: candidate.id,
            createdBy: candidate.firstComment.createdBy
          },
          { actorId: command.actorId, occurredAt: now }
        )
      );
    }

    const auditLogs = await this.commit("candidate.created", candidate.id, command.actorId, events, {
      after: candidate,
      metadata: { conceptId: candidate.conceptId, accountId: candidate.accountId },
      now
    });

    return { data: candidate, events, auditLogs };
  }

  async approveCandidate(
    command: CandidateDecisionCommand
  ): Promise<WorkflowActionResult<PostCandidate>> {
    const candidate = await this.getRequiredCandidate(command.candidateId);
    const now = isoNow(command.now);
    const approved = approveDomainCandidate(candidate, {
      approvedBy: command.actorId,
      now
    });

    await this.repositories.candidates.update(approved);

    const event = createDomainEvent(
      "CandidateApproved",
      {
        candidateId: approved.id,
        approvedBy: command.actorId
      },
      { actorId: command.actorId, occurredAt: now }
    );
    const auditLog = await this.audit("candidate.approved", approved.id, command.actorId, {
      before: candidate,
      after: approved,
      now
    });
    await this.emit(event);

    return { data: approved, events: [event], auditLogs: [auditLog] };
  }

  async rejectCandidate(
    command: RejectCandidateCommand
  ): Promise<WorkflowActionResult<PostCandidate>> {
    const candidate = await this.getRequiredCandidate(command.candidateId);
    const now = isoNow(command.now);
    const rejected = rejectDomainCandidate(candidate, {
      reason: command.reason,
      rejectedBy: command.actorId,
      now
    });

    await this.repositories.candidates.update(rejected);

    const event = createDomainEvent(
      "CandidateRejected",
      {
        candidateId: rejected.id,
        rejectedBy: command.actorId,
        reason: command.reason
      },
      { actorId: command.actorId, occurredAt: now }
    );
    const auditLog = await this.audit("candidate.rejected", rejected.id, command.actorId, {
      before: candidate,
      after: rejected,
      now
    });
    await this.emit(event);

    return { data: rejected, events: [event], auditLogs: [auditLog] };
  }

  async scheduleCandidate(
    command: ScheduleCandidateCommand
  ): Promise<WorkflowActionResult<ScheduleCandidateResult>> {
    const candidate = await this.getRequiredCandidate(command.candidateId);
    const account = await this.getRequiredAccount(candidate.accountId);
    const concept = await this.getRequiredConcept(candidate.conceptId);
    const plugin = await this.getRequiredPublisherPluginRegistration(command.publisherPluginId);
    const now = isoNow(command.now);

    if (candidate.status !== "approved" && !conceptAllowsAutoSchedule(concept)) {
      throw new WorkflowRuleViolationError("Candidate must be approved before scheduling.");
    }

    if (command.autoPublish && !allowsAutoPublish(account, concept)) {
      throw new WorkflowRuleViolationError("Auto-publish must be explicitly enabled for the account or concept.");
    }

    const schedulePolicy = {
      ...account.schedulePolicy,
      requireApprovedCandidate:
        candidate.status === "approved" ? account.schedulePolicy.requireApprovedCandidate : false
    };
    // Due-job selection compares ISO strings in SQLite, so store UTC ("Z")
    // timestamps only; an offset such as +09:00 would sort incorrectly.
    const scheduledAt = normalizeIsoTimestamp(command.scheduledAt);
    const scheduledCandidate = scheduleDomainCandidate(candidate, {
      scheduledAt,
      schedulePolicy,
      now: command.now
    });
    const publishJob = createPublishJob({
      id: command.publishJobId,
      candidateId: scheduledCandidate.id,
      accountId: scheduledCandidate.accountId,
      pluginRegistrationId: plugin.id,
      scheduledAt,
      maxAttempts: command.maxAttempts ?? this.retryPolicy.maxAttempts,
      metadata: {
        autoPublish: command.autoPublish === true
      },
      createdAt: now,
      updatedAt: now
    });

    await this.repositories.candidates.update(scheduledCandidate);
    await this.repositories.publishJobs.create(publishJob);

    const event = createDomainEvent(
      "PostScheduled",
      {
        candidateId: scheduledCandidate.id,
        scheduledAt
      },
      { actorId: command.actorId, occurredAt: now }
    );
    const auditLog = await this.audit("candidate.scheduled", scheduledCandidate.id, command.actorId, {
      before: candidate,
      after: scheduledCandidate,
      metadata: {
        publishJobId: publishJob.id,
        publisherPluginId: plugin.id,
        autoPublish: command.autoPublish === true
      },
      now
    });
    await this.emit(event);

    return {
      data: {
        candidate: scheduledCandidate,
        publishJob
      },
      events: [event],
      auditLogs: [auditLog]
    };
  }

  async enqueueDuePublishJobs(
    command: EnqueueDuePublishJobsCommand
  ): Promise<WorkflowActionResult<EnqueueDuePublishJobsResult>> {
    const trigger = command.trigger ?? "manual";
    const dueJobs = await this.repositories.publishJobs.getScheduledJobsDueBefore(command.dueBefore);
    const jobs = trigger === "auto" ? await this.filterAutoPublishJobs(dueJobs) : dueJobs;
    const now = isoNow();
    const events: DomainEvent[] = [
      createDomainEvent(
        "PublishJobsDueChecked",
        {
          dueBefore: command.dueBefore,
          count: jobs.length
        },
        { actorId: command.actorId, occurredAt: now, metadata: { trigger } }
      ),
      ...jobs.map((job) =>
        createDomainEvent(
          "PublishJobEnqueued",
          {
            publishJobId: job.id,
            candidateId: job.candidateId,
            scheduledAt: job.scheduledAt
          },
          { actorId: command.actorId, occurredAt: now, metadata: { trigger } }
        )
      )
    ];
    const auditLog = await this.audit("publish_jobs.due_enqueued", "publish_jobs", command.actorId, {
      metadata: {
        dueBefore: command.dueBefore,
        trigger,
        jobIds: jobs.map((job) => job.id)
      },
      now
    });

    await this.emitMany(events);

    return {
      data: { jobs },
      events,
      auditLogs: [auditLog]
    };
  }

  async runPublishJob(
    command: RunPublishJobCommand
  ): Promise<WorkflowActionResult<RunPublishJobResult>> {
    const job = await this.getRequiredPublishJob(command.publishJobId);
    const runRequest = getPublishJobRunRequest(job);
    // A run a person explicitly requested is a manual run, even when the
    // polling worker is the process that picks it up.
    const trigger = runRequest ? "manual" : (command.trigger ?? "manual");
    const candidate = await this.getRequiredCandidate(job.candidateId);
    const account = await this.getRequiredAccount(job.accountId);
    const concept = await this.getRequiredConcept(candidate.conceptId);
    const plugin = await this.getRequiredPublisherPluginRegistration(job.pluginRegistrationId);

    if (candidate.status !== "scheduled") {
      throw new WorkflowRuleViolationError("Publish jobs can only run for scheduled candidates.");
    }

    if (trigger === "auto" && (!job.metadata.autoPublish || !allowsAutoPublish(account, concept))) {
      throw new WorkflowRuleViolationError("Auto-publish must be explicitly enabled before running a job automatically.");
    }

    await this.getRequiredPublisherPluginContract(plugin.id);

    const now = isoNow(command.now);
    // One request authorizes one attempt; a later retry needs a new request
    // unless auto-publish is enabled for the job.
    const { runRequest: _consumed, ...metadata } = job.metadata;
    const runningJob = startPublishJob(runRequest ? { ...job, metadata } : job, now);
    await this.repositories.publishJobs.update(runningJob);

    const event = createDomainEvent(
      "PublishJobStarted",
      {
        publishJobId: runningJob.id,
        candidateId: runningJob.candidateId,
        attempt: runningJob.attempt
      },
      { actorId: command.actorId, occurredAt: now, metadata: { trigger } }
    );
    const auditLog = await this.audit("publish_job.started", runningJob.id, command.actorId, {
      before: job,
      after: runningJob,
      metadata: { trigger, publisherPluginId: plugin.id, ...(runRequest ? { runRequestedBy: runRequest.requestedBy } : {}) },
      now
    });
    await this.emit(event);

    return {
      data: {
        job: runningJob,
        account,
        candidate,
        publisherPluginId: plugin.id
      },
      events: [event],
      auditLogs: [auditLog]
    };
  }

  async markPublishSucceeded(
    command: MarkPublishSucceededCommand
  ): Promise<WorkflowActionResult<PublishJob>> {
    const job = await this.getRequiredPublishJob(command.publishJobId);
    const candidate = await this.getRequiredCandidate(job.candidateId);
    const now = isoNow(command.now);
    const succeeded = succeedPublishJob(job, {
      externalPostId: command.externalPostId,
      permalink: command.permalink,
      rawResultRef: command.rawResultRef,
      now
    });
    const publishedCandidate = markCandidatePublished(candidate, now);

    await this.repositories.publishJobs.update(succeeded);
    await this.repositories.candidates.update(publishedCandidate);

    const event = createDomainEvent(
      "PublishSucceeded",
      {
        publishJobId: succeeded.id,
        candidateId: succeeded.candidateId,
        externalPostId: command.externalPostId
      },
      { actorId: command.actorId, occurredAt: now }
    );
    const auditLog = await this.audit("publish_job.succeeded", succeeded.id, command.actorId, {
      before: job,
      after: succeeded,
      metadata: {
        candidateId: candidate.id,
        externalPostId: command.externalPostId
      },
      now
    });
    await this.emit(event);

    return { data: succeeded, events: [event], auditLogs: [auditLog] };
  }

  async markPublishFailed(
    command: MarkPublishFailedCommand
  ): Promise<WorkflowActionResult<PublishJob>> {
    const job = await this.getRequiredPublishJob(command.publishJobId);
    const candidate = await this.getRequiredCandidate(job.candidateId);
    const now = isoNow(command.now);
    const retryAfter = this.resolveRetryAfter(job, command, now);
    const failed = failPublishJob(job, {
      code: command.code,
      message: command.message,
      retryAfter,
      now
    });

    await this.repositories.publishJobs.update(failed);

    if (failed.status === "failed") {
      await this.repositories.candidates.update(markCandidatePublishFailed(candidate, now));
    }

    const event = createDomainEvent(
      "PublishFailed",
      {
        publishJobId: failed.id,
        candidateId: failed.candidateId,
        code: command.code,
        message: command.message,
        retryable: failed.lastError?.retryable ?? false
      },
      { actorId: command.actorId, occurredAt: now }
    );
    const auditLog = await this.audit("publish_job.failed", failed.id, command.actorId, {
      before: job,
      after: failed,
      metadata: {
        candidateId: candidate.id,
        retryAfter: failed.retryAfter,
        retryable: failed.lastError?.retryable ?? false
      },
      now
    });
    await this.emit(event);

    return { data: failed, events: [event], auditLogs: [auditLog] };
  }

  /**
   * Records that a person wants this job to run now and makes it due
   * immediately. Nothing is published here: the local worker picks the job up
   * on its next poll and runs it with a manual trigger, so review-first jobs do
   * not need auto-publish to be enabled.
   */
  async requestPublishJobRun(
    command: RequestPublishJobRunCommand
  ): Promise<WorkflowActionResult<PublishJob>> {
    const job = await this.getRequiredPublishJob(command.publishJobId);
    const waiting = job.status === "queued" || job.status === "retry_scheduled";

    if (!waiting || job.attempt >= job.maxAttempts) {
      throw new WorkflowRuleViolationError("Only queued or retry-scheduled jobs with attempts remaining can be run.");
    }

    const candidate = await this.getRequiredCandidate(job.candidateId);

    if (candidate.status !== "scheduled") {
      throw new WorkflowRuleViolationError("Publish jobs can only run for scheduled candidates.");
    }

    await this.getRequiredPublisherPluginRegistration(job.pluginRegistrationId);

    const now = isoNow(command.now);
    const requested = PublishJobSchema.parse({
      ...job,
      scheduledAt: job.status === "queued" && Date.parse(job.scheduledAt) > Date.parse(now) ? now : job.scheduledAt,
      retryAfter: job.status === "retry_scheduled" ? now : job.retryAfter,
      metadata: {
        ...job.metadata,
        runRequest: {
          requestedAt: now,
          requestedBy: command.actorId,
          originalScheduledAt: job.scheduledAt
        }
      },
      updatedAt: now
    });
    await this.repositories.publishJobs.update(requested);

    const event = createDomainEvent(
      "PublishJobRunRequested",
      {
        publishJobId: requested.id,
        candidateId: requested.candidateId,
        requestedBy: command.actorId
      },
      { actorId: command.actorId, occurredAt: now }
    );
    const auditLog = await this.audit("publish_job.run_requested", requested.id, command.actorId, {
      before: job,
      after: requested,
      metadata: { candidateId: candidate.id, previousStatus: job.status },
      now
    });
    await this.emit(event);

    return { data: requested, events: [event], auditLogs: [auditLog] };
  }

  async retryPublishJob(
    command: RetryPublishJobCommand
  ): Promise<WorkflowActionResult<PublishJob>> {
    const job = await this.getRequiredPublishJob(command.publishJobId);

    if (!canRetryPublishJob(job)) {
      throw new WorkflowRuleViolationError("Publish job is not eligible for retry.");
    }

    await this.getRequiredPublisherPluginRegistration(job.pluginRegistrationId);
    await this.getRequiredPublisherPluginContract(job.pluginRegistrationId);

    const now = isoNow(command.now);
    const retried = startPublishJob(job, now);
    await this.repositories.publishJobs.update(retried);

    const event = createDomainEvent(
      "PublishJobRetried",
      {
        publishJobId: retried.id,
        candidateId: retried.candidateId,
        attempt: retried.attempt
      },
      { actorId: command.actorId, occurredAt: now }
    );
    const auditLog = await this.audit("publish_job.retried", retried.id, command.actorId, {
      before: job,
      after: retried,
      now
    });
    await this.emit(event);

    return { data: retried, events: [event], auditLogs: [auditLog] };
  }

  private async filterAutoPublishJobs(jobs: PublishJob[]): Promise<PublishJob[]> {
    const allowed: PublishJob[] = [];

    for (const job of jobs) {
      const candidate = await this.getRequiredCandidate(job.candidateId);
      const account = await this.getRequiredAccount(job.accountId);
      const concept = await this.getRequiredConcept(candidate.conceptId);

      if ((job.metadata.autoPublish === true && allowsAutoPublish(account, concept)) || getPublishJobRunRequest(job)) {
        allowed.push(job);
      }
    }

    return allowed;
  }

  private resolveRetryAfter(job: PublishJob, command: PublishFailureInput, now: string): string | undefined {
    if (!command.retryable || job.attempt >= job.maxAttempts) {
      return undefined;
    }

    if (command.retryAfter) {
      return command.retryAfter;
    }

    return new Date(new Date(now).getTime() + this.retryPolicy.backoffMs * Math.max(job.attempt, 1)).toISOString();
  }

  private async getRequiredAccount(id: string) {
    const account = await this.repositories.accounts.getById(id);
    if (!account) throw new WorkflowNotFoundError("account", id);
    return account;
  }

  private async getRequiredConcept(id: string) {
    const concept = await this.repositories.concepts.getById(id);
    if (!concept) throw new WorkflowNotFoundError("concept", id);
    return concept;
  }

  private async getRequiredCandidate(id: string) {
    const candidate = await this.repositories.candidates.getById(id);
    if (!candidate) throw new WorkflowNotFoundError("candidate", id);
    return candidate;
  }

  private async getRequiredPublishJob(id: string) {
    const job = await this.repositories.publishJobs.getById(id);
    if (!job) throw new WorkflowNotFoundError("publish job", id);
    return job;
  }

  private async getRequiredPublisherPluginRegistration(id: string) {
    const plugin = await this.repositories.plugins.getById(id);

    if (!plugin) {
      throw new WorkflowNotFoundError("plugin", id);
    }

    if (!plugin.enabled || plugin.type !== "publisher") {
      throw new WorkflowRuleViolationError("Publish jobs must use an enabled publisher plugin.");
    }

    return plugin;
  }

  private async getRequiredPublisherPluginContract(id: string) {
    if (!this.options.publisherPlugins) {
      return undefined;
    }

    const plugin = await this.options.publisherPlugins.getPublisher(id);

    if (!plugin || typeof plugin.validatePublish !== "function" || typeof plugin.publish !== "function") {
      throw new WorkflowRuleViolationError("Publisher plugin contract is not available.");
    }

    return plugin;
  }

  private async commit(
    action: string,
    entityId: string,
    actorId: string | undefined,
    events: DomainEvent[],
    options: {
      before?: object;
      after?: object;
      metadata?: Record<string, unknown>;
      now: string;
    }
  ): Promise<AuditLog[]> {
    const auditLog = await this.audit(action, entityId, actorId, options);
    await this.emitMany(events);
    return [auditLog];
  }

  private async audit(
    action: string,
    entityId: string,
    actorId: string | undefined,
    options: {
      before?: object;
      after?: object;
      metadata?: Record<string, unknown>;
      now: string;
    }
  ): Promise<AuditLog> {
    const auditLog = createAuditLog({
      action,
      actorId,
      entityType: action.split(".")[0] ?? "workflow",
      entityId,
      before: options.before ? toRecord(options.before) : undefined,
      after: options.after ? toRecord(options.after) : undefined,
      metadata: options.metadata ?? {},
      createdAt: options.now
    });

    await this.repositories.auditLogs.append(auditLog);
    return auditLog;
  }

  private async emit(event: DomainEvent): Promise<void> {
    await this.options.events.emit(event);
  }

  private async emitMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }
}

function normalizeIsoTimestamp(value: string): string {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
}

function toRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}
