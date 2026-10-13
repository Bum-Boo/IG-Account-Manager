import { getEventListeners } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SystemClock } from "./clock.js";

describe("SystemClock.sleep", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("removes the abort listener after the timeout completes", async () => {
    const signal = new AbortController().signal;
    const pending = new SystemClock().sleep(100, signal);
    expect(getEventListeners(signal, "abort")).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(100);
    await pending;
    expect(getEventListeners(signal, "abort")).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not retain listeners across repeated poll intervals", async () => {
    const signal = new AbortController().signal;
    const clock = new SystemClock();
    for (let iteration = 0; iteration < 20; iteration++) {
      const pending = clock.sleep(100, signal);
      await vi.advanceTimersByTimeAsync(100);
      await pending;
    }
    expect(getEventListeners(signal, "abort")).toHaveLength(0);
  });

  it("aborting resolves the sleep and clears its timeout and listener", async () => {
    const controller = new AbortController();
    const pending = new SystemClock().sleep(100, controller.signal);
    controller.abort();
    await pending;
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("an already aborted signal does not allocate a listener or timeout", async () => {
    const controller = new AbortController();
    controller.abort();
    await new SystemClock().sleep(100, controller.signal);
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
