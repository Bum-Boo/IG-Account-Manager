import { DomainValidationError } from "./errors.js";
import {
  AccountSchema,
  AuditLogSchema,
  ConceptSchema,
  ContentAssetSchema,
  ContentRecipeSchema,
  PluginRegistrationSchema,
  PostCandidateSchema,
  PublishJobSchema
} from "./entities.js";
import {
  AutomationPolicy,
  AutomationPolicySchema,
  Platform,
  PlatformSchema,
  SchedulePolicy,
  SchedulePolicySchema
} from "./value-objects.js";
import type { z } from "zod";

type AccountSchemaInput = z.input<typeof AccountSchema>;
type AuditLogSchemaInput = z.input<typeof AuditLogSchema>;
type ConceptSchemaInput = z.input<typeof ConceptSchema>;
type ContentAssetSchemaInput = z.input<typeof ContentAssetSchema>;
type ContentRecipeSchemaInput = z.input<typeof ContentRecipeSchema>;
type PlatformSchemaInput = z.input<typeof PlatformSchema>;
type PluginRegistrationSchemaInput = z.input<typeof PluginRegistrationSchema>;
type PostCandidateSchemaInput = z.input<typeof PostCandidateSchema>;
type PublishJobSchemaInput = z.input<typeof PublishJobSchema>;

export function isoNow(date = new Date()): string {
  return date.toISOString();
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createPlatform(input: PlatformSchemaInput): Platform {
  return PlatformSchema.parse(input);
}

export function createAutomationPolicy(input: Partial<AutomationPolicy> = {}): AutomationPolicy {
  return AutomationPolicySchema.parse(input);
}

export function createSchedulePolicy(input: Partial<SchedulePolicy> = {}): SchedulePolicy {
  return SchedulePolicySchema.parse({
    timezone: "UTC",
    ...input
  });
}

export type CreateAccountInput = Omit<
  AccountSchemaInput,
  "id" | "status" | "automationPolicy" | "schedulePolicy" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: AccountSchemaInput["status"];
  automationPolicy?: Partial<AutomationPolicy>;
  schedulePolicy?: Partial<SchedulePolicy>;
  createdAt?: string;
  updatedAt?: string;
};

export function createAccount(input: CreateAccountInput) {
  const now = isoNow();

  return AccountSchema.parse({
    ...input,
    id: input.id ?? createId("account"),
    status: input.status ?? "draft",
    automationPolicy: createAutomationPolicy(input.automationPolicy),
    schedulePolicy: createSchedulePolicy(input.schedulePolicy),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now
  });
}

export type CreateConceptInput = Omit<
  ConceptSchemaInput,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function createConcept(input: CreateConceptInput) {
  const now = isoNow();

  return ConceptSchema.parse({
    ...input,
    id: input.id ?? createId("concept"),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now
  });
}

export type CreateContentAssetInput = Omit<
  ContentAssetSchemaInput,
  "id" | "importedAt" | "createdAt" | "updatedAt"
> & {
  id?: string;
  importedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function createContentAsset(input: CreateContentAssetInput) {
  const now = isoNow();

  return ContentAssetSchema.parse({
    ...input,
    id: input.id ?? createId("asset"),
    importedAt: input.importedAt ?? now,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now
  });
}

export type CreateContentRecipeInput = Omit<
  ContentRecipeSchemaInput,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function createContentRecipe(input: CreateContentRecipeInput) {
  const now = isoNow();

  return ContentRecipeSchema.parse({
    ...input,
    id: input.id ?? createId("recipe"),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now
  });
}

export type CreatePostCandidateInput = Omit<
  PostCandidateSchemaInput,
  "id" | "status" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: PostCandidateSchemaInput["status"];
  createdAt?: string;
  updatedAt?: string;
};

export function createPostCandidate(input: CreatePostCandidateInput) {
  const now = isoNow();

  return PostCandidateSchema.parse({
    ...input,
    id: input.id ?? createId("candidate"),
    status: input.status ?? "draft",
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now
  });
}

export type CreatePublishJobInput = Omit<
  PublishJobSchemaInput,
  "id" | "status" | "attempt" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: PublishJobSchemaInput["status"];
  attempt?: number;
  createdAt?: string;
  updatedAt?: string;
};

export function createPublishJob(input: CreatePublishJobInput) {
  const now = isoNow();

  return PublishJobSchema.parse({
    ...input,
    id: input.id ?? createId("publish_job"),
    status: input.status ?? "queued",
    attempt: input.attempt ?? 0,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now
  });
}

export type CreatePluginRegistrationInput = Omit<
  PluginRegistrationSchemaInput,
  "id" | "enabled" | "createdAt" | "updatedAt"
> & {
  id?: string;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export function createPluginRegistration(input: CreatePluginRegistrationInput) {
  const now = isoNow();

  return PluginRegistrationSchema.parse({
    ...input,
    id: input.id ?? createId("plugin_registration"),
    enabled: input.enabled ?? true,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now
  });
}

export type CreateAuditLogInput = Omit<
  AuditLogSchemaInput,
  "id" | "createdAt"
> & {
  id?: string;
  createdAt?: string;
};

export function createAuditLog(input: CreateAuditLogInput) {
  return AuditLogSchema.parse({
    ...input,
    id: input.id ?? createId("audit"),
    createdAt: input.createdAt ?? isoNow()
  });
}

export function assertValidDomainObject<T>(schema: { parse: (value: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new DomainValidationError("Invalid domain object.");
  }
}
