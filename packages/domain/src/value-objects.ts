import { z } from "zod";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/;

export const ISODateTimeSchema = z.string().datetime({ offset: true });

export const IdSchema = z.string().trim().min(1).max(128);

export const SlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers, dots, underscores, or hyphens.");

export const AccountStatusSchema = z.enum([
  "draft",
  "connected",
  "disconnected",
  "disabled",
  "archived"
]);
export type AccountStatus = z.infer<typeof AccountStatusSchema>;

export const AssetTypeSchema = z.enum([
  "image",
  "video",
  "audio",
  "document",
  "text",
  "link",
  "template",
  "other"
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const CandidateStatusSchema = z.enum([
  "draft",
  "ready_for_review",
  "changes_requested",
  "approved",
  "rejected",
  "scheduled",
  "published",
  "publish_failed",
  "archived"
]);
export type CandidateStatus = z.infer<typeof CandidateStatusSchema>;

export const PublishJobStatusSchema = z.enum([
  "queued",
  "running",
  "retry_scheduled",
  "succeeded",
  "failed",
  "canceled"
]);
export type PublishJobStatus = z.infer<typeof PublishJobStatusSchema>;

export const PluginTypeSchema = z.enum([
  "publisher",
  "analytics",
  "asset_processor",
  "candidate_generator",
  "workflow",
  "importer",
  "exporter"
]);
export type PluginType = z.infer<typeof PluginTypeSchema>;

export const PermissionSchema = z.enum([
  "account:read",
  "account:write",
  "concept:read",
  "concept:write",
  "asset:read",
  "asset:write",
  "recipe:read",
  "recipe:write",
  "candidate:read",
  "candidate:write",
  "candidate:review",
  "schedule:read",
  "schedule:write",
  "publish:approved",
  "analytics:read",
  "audit:write",
  "settings:write"
]);
export type Permission = z.infer<typeof PermissionSchema>;

export const PlatformSchema = z
  .object({
    id: SlugSchema,
    displayName: z.string().trim().min(1).max(80),
    officialApiBaseUrl: z.string().url().optional(),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict();
export type Platform = z.infer<typeof PlatformSchema>;

export const AutomationPolicySchema = z
  .object({
    candidateGeneration: z.enum(["manual", "plugin_assisted"]).default("manual"),
    requireHumanApproval: z.boolean().default(true),
    allowAutoScheduling: z.boolean().default(false),
    allowAutoPublishing: z.boolean().default(false)
  })
  .strict()
  .superRefine((policy, ctx) => {
    if (policy.allowAutoPublishing && !policy.requireHumanApproval) {
      ctx.addIssue({
        code: "custom",
        path: ["allowAutoPublishing"],
        message: "Auto-publishing requires human approval to remain enabled."
      });
    }
  });
export type AutomationPolicy = z.infer<typeof AutomationPolicySchema>;

export const TimeWindowSchema = z
  .object({
    start: z.string().regex(TIME_PATTERN, "Use HH:mm in 24-hour time."),
    end: z.string().regex(TIME_PATTERN, "Use HH:mm in 24-hour time.")
  })
  .strict()
  .superRefine((window, ctx) => {
    if (toMinutes(window.start) >= toMinutes(window.end)) {
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "Schedule windows must end after they start."
      });
    }
  });
export type TimeWindow = z.infer<typeof TimeWindowSchema>;

export const SchedulePolicySchema = z
  .object({
    timezone: z.string().trim().min(1).refine(isValidTimeZone, "Use a valid IANA timezone."),
    minLeadTimeMinutes: z.number().int().min(0).default(0),
    maxPostsPerDay: z.number().int().min(1).max(100).default(10),
    allowedWeekdays: z.array(z.number().int().min(0).max(6)).min(1).default([0, 1, 2, 3, 4, 5, 6]),
    allowedTimeWindows: z.array(TimeWindowSchema).min(1).default([{ start: "00:00", end: "23:59" }]),
    requireApprovedCandidate: z.boolean().default(true)
  })
  .strict()
  .superRefine((policy, ctx) => {
    const uniqueWeekdays = new Set(policy.allowedWeekdays);

    if (uniqueWeekdays.size !== policy.allowedWeekdays.length) {
      ctx.addIssue({
        code: "custom",
        path: ["allowedWeekdays"],
        message: "Allowed weekdays must not contain duplicates."
      });
    }
  });
export type SchedulePolicy = z.infer<typeof SchedulePolicySchema>;

export function toMinutes(value: string): number {
  const match = TIME_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid time value '${value}'.`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

