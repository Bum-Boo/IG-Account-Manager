import { DomainValidationError, InvalidStateTransitionError } from "./errors.js";
import { PostCandidateSchema, PublishJobSchema } from "./entities.js";
import type { PostCandidate, PublishJob } from "./entities.js";
import { isoNow } from "./factories.js";
import type { CandidateStatus, PublishJobStatus, SchedulePolicy } from "./value-objects.js";
import { SchedulePolicySchema, toMinutes } from "./value-objects.js";

export const CANDIDATE_STATUS_TRANSITIONS: Record<CandidateStatus, readonly CandidateStatus[]> = {
  draft: ["ready_for_review", "archived"],
  ready_for_review: ["changes_requested", "approved", "rejected", "archived"],
  changes_requested: ["draft", "ready_for_review", "archived"],
  approved: ["scheduled", "archived"],
  rejected: ["draft", "archived"],
  scheduled: ["approved", "published", "publish_failed", "archived"],
  published: ["archived"],
  publish_failed: ["scheduled", "approved", "archived"],
  archived: []
};

export function canTransitionCandidateStatus(from: CandidateStatus, to: CandidateStatus): boolean {
  return CANDIDATE_STATUS_TRANSITIONS[from].includes(to);
}

export function transitionCandidateStatus(
  candidate: PostCandidate,
  to: CandidateStatus,
  options: {
    now?: string;
    patch?: Partial<PostCandidate>;
  } = {}
): PostCandidate {
  if (!canTransitionCandidateStatus(candidate.status, to)) {
    throw new InvalidStateTransitionError("candidate", candidate.status, to);
  }

  return PostCandidateSchema.parse({
    ...candidate,
    ...options.patch,
    status: to,
    updatedAt: options.now ?? isoNow()
  });
}

export function markCandidateReady(candidate: PostCandidate, now = isoNow()): PostCandidate {
  return transitionCandidateStatus(candidate, "ready_for_review", { now });
}

export function requestCandidateChanges(candidate: PostCandidate, now = isoNow()): PostCandidate {
  return transitionCandidateStatus(candidate, "changes_requested", { now });
}

export function approveCandidate(
  candidate: PostCandidate,
  options: {
    approvedBy?: string;
    now?: string;
  } = {}
): PostCandidate {
  const now = options.now ?? isoNow();

  return transitionCandidateStatus(candidate, "approved", {
    now,
    patch: {
      approvedAt: now,
      approvedBy: options.approvedBy,
      rejectedAt: undefined,
      rejectedBy: undefined,
      rejectionReason: undefined
    }
  });
}

export function rejectCandidate(
  candidate: PostCandidate,
  options: {
    reason: string;
    rejectedBy?: string;
    now?: string;
  }
): PostCandidate {
  const now = options.now ?? isoNow();

  return transitionCandidateStatus(candidate, "rejected", {
    now,
    patch: {
      rejectedAt: now,
      rejectedBy: options.rejectedBy,
      rejectionReason: options.reason
    }
  });
}

export function scheduleCandidate(
  candidate: PostCandidate,
  options: {
    scheduledAt: string;
    schedulePolicy: SchedulePolicy;
    now?: Date;
  }
): PostCandidate {
  validateScheduledAt(options.schedulePolicy, options.scheduledAt, options.now);

  if (options.schedulePolicy.requireApprovedCandidate && candidate.status !== "approved") {
    throw new InvalidStateTransitionError("candidate", candidate.status, "scheduled");
  }

  if (!options.schedulePolicy.requireApprovedCandidate && !canScheduleWithoutApproval(candidate.status)) {
    throw new InvalidStateTransitionError("candidate", candidate.status, "scheduled");
  }

  return PostCandidateSchema.parse({
    ...candidate,
    status: "scheduled",
    scheduledAt: options.scheduledAt,
    updatedAt: isoNow(options.now)
  });
}

export function markCandidatePublished(candidate: PostCandidate, now = isoNow()): PostCandidate {
  return transitionCandidateStatus(candidate, "published", { now });
}

export function markCandidatePublishFailed(candidate: PostCandidate, now = isoNow()): PostCandidate {
  return transitionCandidateStatus(candidate, "publish_failed", { now });
}

function canScheduleWithoutApproval(status: CandidateStatus): boolean {
  return status === "draft" || status === "ready_for_review" || status === "changes_requested" || status === "approved";
}

export function validateScheduledAt(
  policy: SchedulePolicy,
  scheduledAt: string,
  now: Date = new Date()
): SchedulePolicy {
  const parsedPolicy = SchedulePolicySchema.parse(policy);
  const scheduledDate = new Date(scheduledAt);

  if (Number.isNaN(scheduledDate.getTime())) {
    throw new DomainValidationError("Scheduled time must be a valid ISO date.");
  }

  const earliest = now.getTime() + parsedPolicy.minLeadTimeMinutes * 60_000;
  if (scheduledDate.getTime() < earliest) {
    throw new DomainValidationError("Scheduled time is earlier than the minimum lead time.");
  }

  const zoned = getZonedDateParts(scheduledDate, parsedPolicy.timezone);

  if (!parsedPolicy.allowedWeekdays.includes(zoned.weekday)) {
    throw new DomainValidationError("Scheduled weekday is not allowed by this schedule policy.");
  }

  const scheduledMinute = zoned.hour * 60 + zoned.minute;
  const isWithinWindow = parsedPolicy.allowedTimeWindows.some(
    (window) => scheduledMinute >= toMinutes(window.start) && scheduledMinute <= toMinutes(window.end)
  );

  if (!isWithinWindow) {
    throw new DomainValidationError("Scheduled time is outside allowed schedule windows.");
  }

  return parsedPolicy;
}

function getZonedDateParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(date);

  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(partMap.year);
  const month = Number(partMap.month);
  const day = Number(partMap.day);
  const hour = Number(partMap.hour);
  const minute = Number(partMap.minute);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return { year, month, day, weekday, hour, minute };
}

export const PUBLISH_JOB_STATUS_TRANSITIONS: Record<PublishJobStatus, readonly PublishJobStatus[]> = {
  queued: ["running", "canceled"],
  running: ["succeeded", "failed", "retry_scheduled"],
  retry_scheduled: ["running", "failed", "canceled"],
  succeeded: [],
  failed: [],
  canceled: []
};

export function canTransitionPublishJobStatus(from: PublishJobStatus, to: PublishJobStatus): boolean {
  return PUBLISH_JOB_STATUS_TRANSITIONS[from].includes(to);
}

export function transitionPublishJobStatus(
  job: PublishJob,
  to: PublishJobStatus,
  options: {
    now?: string;
    patch?: Partial<PublishJob>;
  } = {}
): PublishJob {
  if (!canTransitionPublishJobStatus(job.status, to)) {
    throw new InvalidStateTransitionError("publish job", job.status, to);
  }

  return PublishJobSchema.parse({
    ...job,
    ...options.patch,
    status: to,
    updatedAt: options.now ?? isoNow()
  });
}

export function startPublishJob(job: PublishJob, now = isoNow()): PublishJob {
  if (job.status !== "queued" && job.status !== "retry_scheduled") {
    throw new InvalidStateTransitionError("publish job", job.status, "running");
  }

  if (job.attempt >= job.maxAttempts) {
    throw new DomainValidationError("Publish job has no attempts remaining.");
  }

  return transitionPublishJobStatus(job, "running", {
    now,
    patch: {
      attempt: job.attempt + 1,
      startedAt: now,
      retryAfter: undefined
    }
  });
}

export function succeedPublishJob(
  job: PublishJob,
  options: {
    externalPostId?: string;
    permalink?: string;
    rawResultRef?: string;
    now?: string;
  } = {}
): PublishJob {
  const now = options.now ?? isoNow();

  return transitionPublishJobStatus(job, "succeeded", {
    now,
    patch: {
      finishedAt: now,
      result: {
        externalPostId: options.externalPostId,
        permalink: options.permalink,
        rawResultRef: options.rawResultRef
      }
    }
  });
}

export function failPublishJob(
  job: PublishJob,
  options: {
    message: string;
    code?: string;
    retryAfter?: string;
    now?: string;
  }
): PublishJob {
  const now = options.now ?? isoNow();
  const hasAttemptsRemaining = job.attempt < job.maxAttempts;
  const retryable = Boolean(options.retryAfter && hasAttemptsRemaining);
  const status: PublishJobStatus = retryable ? "retry_scheduled" : "failed";

  return transitionPublishJobStatus(job, status, {
    now,
    patch: {
      finishedAt: retryable ? undefined : now,
      retryAfter: retryable ? options.retryAfter : undefined,
      lastError: {
        code: options.code,
        message: options.message,
        retryable
      }
    }
  });
}

export function cancelPublishJob(job: PublishJob, now = isoNow()): PublishJob {
  if (job.status !== "queued" && job.status !== "retry_scheduled") {
    throw new InvalidStateTransitionError("publish job", job.status, "canceled");
  }

  return transitionPublishJobStatus(job, "canceled", {
    now,
    patch: {
      finishedAt: now
    }
  });
}

export function canRetryPublishJob(job: PublishJob): boolean {
  return job.status === "retry_scheduled" && job.attempt < job.maxAttempts;
}
