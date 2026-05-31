import { z } from "zod";
import { IdSchema, ISODateTimeSchema } from "./value-objects.js";
import { createId, isoNow } from "./factories.js";

const BaseDomainEventSchema = z
  .object({
    id: IdSchema,
    occurredAt: ISODateTimeSchema,
    actorId: z.string().trim().min(1).max(120).optional(),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict();

export const AccountConnectedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("AccountConnected"),
  data: z
    .object({
      accountId: IdSchema,
      pluginRegistrationId: IdSchema.optional()
    })
    .strict()
});

export const ConceptCreatedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("ConceptCreated"),
  data: z
    .object({
      conceptId: IdSchema,
      accountId: IdSchema
    })
    .strict()
});

export const AssetImportedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("AssetImported"),
  data: z
    .object({
      assetId: IdSchema,
      accountIds: z.array(IdSchema).default([]),
      conceptIds: z.array(IdSchema).default([])
    })
    .strict()
});

export const CandidateCreatedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("CandidateCreated"),
  data: z
    .object({
      candidateId: IdSchema,
      accountId: IdSchema,
      conceptId: IdSchema
    })
    .strict()
});

export const CandidateApprovedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("CandidateApproved"),
  data: z
    .object({
      candidateId: IdSchema,
      approvedBy: z.string().trim().min(1).max(120).optional()
    })
    .strict()
});

export const CandidateRejectedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("CandidateRejected"),
  data: z
    .object({
      candidateId: IdSchema,
      rejectedBy: z.string().trim().min(1).max(120).optional(),
      reason: z.string().trim().min(1).max(2000)
    })
    .strict()
});

export const PostScheduledEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("PostScheduled"),
  data: z
    .object({
      candidateId: IdSchema,
      scheduledAt: ISODateTimeSchema
    })
    .strict()
});

export const PublishJobStartedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("PublishJobStarted"),
  data: z
    .object({
      publishJobId: IdSchema,
      candidateId: IdSchema,
      attempt: z.number().int().min(1)
    })
    .strict()
});

export const PublishJobsDueCheckedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("PublishJobsDueChecked"),
  data: z
    .object({
      dueBefore: ISODateTimeSchema,
      count: z.number().int().min(0)
    })
    .strict()
});

export const PublishJobEnqueuedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("PublishJobEnqueued"),
  data: z
    .object({
      publishJobId: IdSchema,
      candidateId: IdSchema,
      scheduledAt: ISODateTimeSchema
    })
    .strict()
});

export const PublishJobRetriedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("PublishJobRetried"),
  data: z
    .object({
      publishJobId: IdSchema,
      candidateId: IdSchema,
      attempt: z.number().int().min(1)
    })
    .strict()
});

export const PublishSucceededEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("PublishSucceeded"),
  data: z
    .object({
      publishJobId: IdSchema,
      candidateId: IdSchema,
      externalPostId: z.string().trim().min(1).max(256).optional()
    })
    .strict()
});

export const PublishFailedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("PublishFailed"),
  data: z
    .object({
      publishJobId: IdSchema,
      candidateId: IdSchema,
      code: z.string().trim().min(1).max(120).optional(),
      message: z.string().trim().min(1).max(2000),
      retryable: z.boolean()
    })
    .strict()
});

export const FirstCommentCreatedEventSchema = BaseDomainEventSchema.extend({
  type: z.literal("FirstCommentCreated"),
  data: z
    .object({
      candidateId: IdSchema,
      createdBy: z.string().trim().min(1).max(120).optional()
    })
    .strict()
});

export const DomainEventSchema = z.discriminatedUnion("type", [
  AccountConnectedEventSchema,
  ConceptCreatedEventSchema,
  AssetImportedEventSchema,
  CandidateCreatedEventSchema,
  CandidateApprovedEventSchema,
  CandidateRejectedEventSchema,
  PostScheduledEventSchema,
  PublishJobStartedEventSchema,
  PublishJobsDueCheckedEventSchema,
  PublishJobEnqueuedEventSchema,
  PublishJobRetriedEventSchema,
  PublishSucceededEventSchema,
  PublishFailedEventSchema,
  FirstCommentCreatedEventSchema
]);
export type DomainEvent = z.infer<typeof DomainEventSchema>;
export type DomainEventType = DomainEvent["type"];

export function createDomainEvent<TType extends DomainEventType>(
  type: TType,
  data: Extract<DomainEvent, { type: TType }>["data"],
  options: {
    id?: string;
    occurredAt?: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Extract<DomainEvent, { type: TType }> {
  return DomainEventSchema.parse({
    id: options.id ?? createId("event"),
    type,
    data,
    occurredAt: options.occurredAt ?? isoNow(),
    actorId: options.actorId,
    metadata: options.metadata ?? {}
  }) as Extract<DomainEvent, { type: TType }>;
}
