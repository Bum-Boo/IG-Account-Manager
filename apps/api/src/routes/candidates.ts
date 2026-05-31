import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CandidateStatusSchema, type PostCandidate, type PublishJob } from "@ig-manager/domain";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { IdParamSchema, optionalRecord, parseBody, parseParams, parseQuery } from "../validation.js";

const CandidateQuerySchema = z
  .object({
    status: CandidateStatusSchema.optional(),
    conceptId: z.string().trim().min(1).optional()
  })
  .strict();

const ProvenanceBodySchema = z
  .object({
    source: z.enum(["manual", "plugin"]).optional(),
    pluginRegistrationId: z.string().trim().min(1).max(128).optional(),
    sourceAssetIds: z.array(z.string().trim().min(1)).optional(),
    sourceReferenceIds: z.array(z.string().trim().min(1)).optional(),
    notes: z.string().trim().max(2000).optional()
  })
  .strict();

const FirstCommentBodySchema = z
  .object({
    text: z.string().trim().min(1).max(2200),
    createdBy: z.string().trim().min(1).max(120).optional(),
    createdAt: z.string().datetime({ offset: true }).optional()
  })
  .strict();

const CreateCandidateBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    accountId: z.string().trim().min(1).max(128),
    conceptId: z.string().trim().min(1).max(128),
    recipeId: z.string().trim().min(1).max(128).optional(),
    assetIds: z.array(z.string().trim().min(1)).optional(),
    status: CandidateStatusSchema.optional(),
    format: z.string().trim().min(1).max(120),
    caption: z.string().trim().min(1).max(10000),
    firstComment: FirstCommentBodySchema.optional(),
    internalNotes: z.string().trim().max(5000).optional(),
    provenance: ProvenanceBodySchema.optional(),
    metadata: optionalRecord(),
    actorId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

const RejectCandidateBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(2000),
    actorId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

const ActionBodySchema = z
  .object({
    actorId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

const ScheduleCandidateBodySchema = z
  .object({
    scheduledAt: z.string().datetime({ offset: true }),
    publisherPluginId: z.string().trim().min(1).max(128),
    autoPublish: z.boolean().optional(),
    publishJobId: z.string().trim().min(1).max(128).optional(),
    maxAttempts: z.number().int().min(1).max(20).optional(),
    actorId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

export async function registerCandidateRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.get<{ Querystring: unknown; Reply: ApiDataResponse<PostCandidate[]> }>(
    "/candidates",
    { schema: { tags: ["candidates"], security: [{ localToken: [] }] } },
    async (request) => {
      const query = parseQuery(CandidateQuerySchema, request.query);

      if (query.status) {
        return { data: context.repositories.candidates.getByStatus(query.status) };
      }

      if (query.conceptId) {
        return { data: context.repositories.candidates.getByConcept(query.conceptId) };
      }

      return { data: context.repositories.candidates.list() };
    }
  );

  server.post<{ Body: unknown; Reply: ApiDataResponse<PostCandidate> }>(
    "/candidates",
    { schema: { tags: ["candidates"], security: [{ localToken: [] }] } },
    async (request, reply) => {
      const body = parseBody(CreateCandidateBodySchema, request.body);
      const now = new Date().toISOString();
      const created = await context.workflow.createPostCandidate({
        ...body,
        actorId: body.actorId ?? context.actorId,
        firstComment: body.firstComment
          ? {
              ...body.firstComment,
              createdAt: body.firstComment.createdAt ?? now
            }
          : undefined,
        provenance: body.provenance
          ? {
              source: body.provenance.source ?? "manual",
              sourceAssetIds: body.provenance.sourceAssetIds ?? [],
              sourceReferenceIds: body.provenance.sourceReferenceIds ?? [],
              pluginRegistrationId: body.provenance.pluginRegistrationId,
              notes: body.provenance.notes
            }
          : undefined
      });

      return reply.code(201).send({ data: created.data });
    }
  );

  server.post<{ Params: unknown; Body: unknown; Reply: ApiDataResponse<PostCandidate> }>(
    "/candidates/:id/approve",
    { schema: { tags: ["candidates"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const body = parseBody(ActionBodySchema, request.body ?? {});
      const approved = await context.workflow.approveCandidate({
        candidateId: id,
        actorId: body.actorId ?? context.actorId
      });

      return { data: approved.data };
    }
  );

  server.post<{ Params: unknown; Body: unknown; Reply: ApiDataResponse<PostCandidate> }>(
    "/candidates/:id/reject",
    { schema: { tags: ["candidates"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const body = parseBody(RejectCandidateBodySchema, request.body);
      const rejected = await context.workflow.rejectCandidate({
        candidateId: id,
        reason: body.reason,
        actorId: body.actorId ?? context.actorId
      });

      return { data: rejected.data };
    }
  );

  server.post<{
    Params: unknown;
    Body: unknown;
    Reply: ApiDataResponse<{ candidate: PostCandidate; publishJob: PublishJob }>;
  }>(
    "/candidates/:id/schedule",
    { schema: { tags: ["candidates"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const body = parseBody(ScheduleCandidateBodySchema, request.body);
      const scheduled = await context.workflow.scheduleCandidate({
        candidateId: id,
        scheduledAt: body.scheduledAt,
        publisherPluginId: body.publisherPluginId,
        publishJobId: body.publishJobId,
        maxAttempts: body.maxAttempts,
        autoPublish: body.autoPublish,
        actorId: body.actorId ?? context.actorId
      });

      return { data: scheduled.data };
    }
  );
}
