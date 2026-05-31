import type { Clock } from "./clock.js";

export interface JobLockHandle {
  jobId: string;
  acquiredAt: string;
  release(): Promise<void> | void;
}

export interface JobLock {
  acquire(jobId: string): Promise<JobLockHandle | undefined> | JobLockHandle | undefined;
  isLocked?(jobId: string): boolean;
}

export class InMemoryJobLock implements JobLock {
  private readonly lockedJobIds = new Set<string>();

  constructor(private readonly clock: Clock) {}

  acquire(jobId: string): JobLockHandle | undefined {
    if (this.lockedJobIds.has(jobId)) {
      return undefined;
    }

    this.lockedJobIds.add(jobId);

    return {
      jobId,
      acquiredAt: this.clock.now().toISOString(),
      release: () => {
        this.lockedJobIds.delete(jobId);
      }
    };
  }

  isLocked(jobId: string): boolean {
    return this.lockedJobIds.has(jobId);
  }
}

