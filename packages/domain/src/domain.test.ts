import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  DomainValidationError,
  InvalidStateTransitionError,
  approveCandidate,
  canRetryPublishJob,
  createConcept,
  createPostCandidate,
  createPublishJob,
  createSchedulePolicy,
  failPublishJob,
  markCandidateReady,
  scheduleCandidate,
  startPublishJob,
  transitionCandidateStatus,
  validateScheduledAt
} from "./index.js";

const accountId = "account_test";
const conceptId = "concept_test";
const candidateId = "candidate_test";
const pluginRegistrationId = "plugin_registration_test";

describe("concept validation", () => {
  it("creates a valid concept", () => {
    const concept = createConcept({
      accountId,
      name: "Quiet Product Notes",
      description: "A concept for concise product operation posts.",
      audience: "Operators who want practical content systems.",
      pillars: ["workflow", "planning"],
      voice: "Direct, calm, and useful."
    });

    expect(concept.id).toMatch(/^concept_/);
    expect(concept.pillars).toEqual(["workflow", "planning"]);
  });

  it("rejects concepts without a usable name, audience, voice, or pillar", () => {
    expect(() =>
      createConcept({
        accountId,
        name: " ",
        description: "Missing required content.",
        audience: "",
        pillars: [],
        voice: ""
      })
    ).toThrow(z.ZodError);
  });
});

describe("candidate state transitions", () => {
  it("moves a candidate through review, approval, and scheduling", () => {
    const policy = createSchedulePolicy({
      timezone: "UTC",
      minLeadTimeMinutes: 0,
      allowedWeekdays: [1],
      allowedTimeWindows: [{ start: "09:00", end: "17:00" }]
    });

    const draft = createPostCandidate({
      accountId,
      conceptId,
      format: "feed_image",
      caption: "A reviewed candidate."
    });
    const ready = markCandidateReady(draft, "2026-05-31T00:00:00.000Z");
    const approved = approveCandidate(ready, {
      approvedBy: "reviewer",
      now: "2026-05-31T00:05:00.000Z"
    });
    const scheduled = scheduleCandidate(approved, {
      schedulePolicy: policy,
      scheduledAt: "2026-06-01T10:00:00.000Z",
      now: new Date("2026-05-31T00:00:00.000Z")
    });

    expect(ready.status).toBe("ready_for_review");
    expect(approved.status).toBe("approved");
    expect(scheduled.status).toBe("scheduled");
    expect(scheduled.scheduledAt).toBe("2026-06-01T10:00:00.000Z");
  });

  it("fails invalid transitions explicitly", () => {
    const draft = createPostCandidate({
      accountId,
      conceptId,
      format: "feed_image",
      caption: "A draft candidate."
    });

    expect(() => transitionCandidateStatus(draft, "scheduled")).toThrow(InvalidStateTransitionError);
  });

  it("does not schedule an unapproved candidate when policy requires approval", () => {
    const policy = createSchedulePolicy({ timezone: "UTC", minLeadTimeMinutes: 0 });
    const ready = createPostCandidate({
      accountId,
      conceptId,
      format: "feed_image",
      caption: "Not approved yet.",
      status: "ready_for_review"
    });

    expect(() =>
      scheduleCandidate(ready, {
        schedulePolicy: policy,
        scheduledAt: "2026-06-01T10:00:00.000Z",
        now: new Date("2026-05-31T00:00:00.000Z")
      })
    ).toThrow(InvalidStateTransitionError);
  });
});

describe("schedule policy validation", () => {
  it("rejects invalid timezones, duplicate weekdays, and inverted windows", () => {
    expect(() => createSchedulePolicy({ timezone: "Mars/Base" })).toThrow(z.ZodError);
    expect(() => createSchedulePolicy({ timezone: "UTC", allowedWeekdays: [1, 1] })).toThrow(z.ZodError);
    expect(() =>
      createSchedulePolicy({
        timezone: "UTC",
        allowedTimeWindows: [{ start: "17:00", end: "09:00" }]
      })
    ).toThrow(z.ZodError);
  });

  it("validates scheduled time against weekday and time windows", () => {
    const policy = createSchedulePolicy({
      timezone: "UTC",
      minLeadTimeMinutes: 60,
      allowedWeekdays: [1],
      allowedTimeWindows: [{ start: "09:00", end: "17:00" }]
    });

    expect(
      validateScheduledAt(policy, "2026-06-01T10:00:00.000Z", new Date("2026-05-31T00:00:00.000Z"))
    ).toEqual(policy);

    expect(() =>
      validateScheduledAt(policy, "2026-06-02T10:00:00.000Z", new Date("2026-05-31T00:00:00.000Z"))
    ).toThrow(DomainValidationError);

    expect(() =>
      validateScheduledAt(policy, "2026-06-01T18:00:00.000Z", new Date("2026-05-31T00:00:00.000Z"))
    ).toThrow(DomainValidationError);
  });
});

describe("publish job retry state", () => {
  it("schedules retry while attempts remain and fails after max attempts", () => {
    let job = createPublishJob({
      candidateId,
      accountId,
      pluginRegistrationId,
      scheduledAt: "2026-06-01T10:00:00.000Z",
      maxAttempts: 2
    });

    job = startPublishJob(job, "2026-06-01T10:00:00.000Z");
    expect(job.status).toBe("running");
    expect(job.attempt).toBe(1);

    job = failPublishJob(job, {
      code: "rate_limited",
      message: "Try later.",
      retryAfter: "2026-06-01T10:30:00.000Z",
      now: "2026-06-01T10:01:00.000Z"
    });
    expect(job.status).toBe("retry_scheduled");
    expect(job.lastError?.retryable).toBe(true);
    expect(canRetryPublishJob(job)).toBe(true);

    job = startPublishJob(job, "2026-06-01T10:30:00.000Z");
    expect(job.attempt).toBe(2);

    job = failPublishJob(job, {
      code: "rate_limited",
      message: "Still unavailable.",
      retryAfter: "2026-06-01T11:00:00.000Z",
      now: "2026-06-01T10:31:00.000Z"
    });
    expect(job.status).toBe("failed");
    expect(job.lastError?.retryable).toBe(false);
    expect(canRetryPublishJob(job)).toBe(false);
    expect(() => startPublishJob(job)).toThrow(InvalidStateTransitionError);
  });
});

