import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ConceptSchema, createConcept, type Concept } from "@ig-manager/domain";
import { ApiNotFoundError } from "../errors.js";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { IdParamSchema, optionalRecord, parseBody, parseParams } from "../validation.js";

const CreateConceptBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    accountId: z.string().trim().min(1).max(128),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(1).max(1000),
    audience: z.string().trim().min(1).max(1000),
    pillars: z.array(z.string().trim().min(1).max(120)).min(1),
    voice: z.string().trim().min(1).max(1000),
    visualGuidelines: z.string().trim().max(2000).optional(),
    captionGuidelines: z.string().trim().max(2000).optional(),
    negativeGuidelines: z.array(z.string().trim().min(1).max(300)).optional(),
    referenceAssetIds: z.array(z.string().trim().min(1)).optional(),
    recipeIds: z.array(z.string().trim().min(1)).optional(),
    metadata: optionalRecord()
  })
  .strict();

const UpdateConceptBodySchema = CreateConceptBodySchema.omit({ accountId: true, id: true }).partial().strict();

export async function registerConceptRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.post<{ Body: unknown; Reply: ApiDataResponse<Concept> }>(
    "/concepts",
    { schema: { tags: ["concepts"], security: [{ localToken: [] }] } },
    async (request, reply) => {
      const body = parseBody(CreateConceptBodySchema, request.body);

      if (!context.repositories.accounts.getById(body.accountId)) {
        throw new ApiNotFoundError("account", body.accountId);
      }

      const concept = createConcept(body);
      context.repositories.concepts.create(concept);

      return reply.code(201).send({ data: concept });
    }
  );

  server.get<{ Params: unknown; Reply: ApiDataResponse<Concept> }>(
    "/concepts/:id",
    { schema: { tags: ["concepts"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const concept = context.repositories.concepts.getById(id);

      if (!concept) {
        throw new ApiNotFoundError("concept", id);
      }

      return { data: concept };
    }
  );

  server.put<{ Params: unknown; Body: unknown; Reply: ApiDataResponse<Concept> }>(
    "/concepts/:id",
    { schema: { tags: ["concepts"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const body = parseBody(UpdateConceptBodySchema, request.body);
      const current = context.repositories.concepts.getById(id);

      if (!current) {
        throw new ApiNotFoundError("concept", id);
      }

      const updated = ConceptSchema.parse({
        ...current,
        ...body,
        updatedAt: new Date().toISOString()
      });

      context.repositories.concepts.update(updated);

      return { data: updated };
    }
  );
}
