import type { PublishJob } from "@ig-manager/domain";

export interface RetryPolicyFailure {
  retryable: boolean;
  code?: string;
  message: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  nextRetryAt(job: PublishJob, failure: RetryPolicyFailure, now: Date): string | undefined;
}

export class FixedIntervalRetryPolicy implements RetryPolicy {
  constructor(
    public readonly maxAttempts = 3,
    private readonly intervalMs = 5 * 60 * 1000
  ) {}

  nextRetryAt(job: PublishJob, failure: RetryPolicyFailure, now: Date): string | undefined {
    if (!failure.retryable || job.attempt >= Math.min(job.maxAttempts, this.maxAttempts)) {
      return undefined;
    }

    return new Date(now.getTime() + this.intervalMs).toISOString();
  }
}

