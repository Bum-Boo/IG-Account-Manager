export interface Clock {
  now(): Date;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", finish);
        resolve();
      };
      const timeout = setTimeout(finish, ms);
      signal?.addEventListener("abort", finish, { once: true });
      if (signal?.aborted) finish();
    });
  }
}
