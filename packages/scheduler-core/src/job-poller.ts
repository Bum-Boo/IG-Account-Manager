import type { Clock } from "./clock.js";
import type { SchedulerLogger } from "./logger.js";

export interface JobPollerOptions {
  clock: Clock;
  intervalMs: number;
  logger: SchedulerLogger;
  poll: () => Promise<void>;
}

export class JobPoller {
  private running = false;

  constructor(private readonly options: JobPollerOptions) {}

  async start(signal?: AbortSignal): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    this.options.logger.info("scheduler poller started", { intervalMs: this.options.intervalMs });

    try {
      while (!signal?.aborted) {
        try {
          await this.options.poll();
        } catch (error) {
          this.options.logger.error("scheduler poll failed", { error: formatError(error) });
        }

        await this.options.clock.sleep(this.options.intervalMs, signal);
      }
    } finally {
      this.running = false;
      this.options.logger.info("scheduler poller stopped");
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

