import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ContentAsset, PostCandidate } from "@ig-manager/domain";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { runCandidateGeneration, type CandidateGenerationMetadata } from "../generation.js";
import { parseBody } from "../validation.js";

const GenerateCandidateBodySchema = z
  .object({
    accountId: z.string().trim().min(1).max(128),
    conceptId: z.string().trim().min(1).max(128),
    recipeId: z.string().trim().min(1).max(128),
    seed: z.union([z.string().trim().min(1).max(200), z.number().finite()]).optional(),
    dryRun: z.boolean().optional(),
    actorId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

export interface GenerateCandidateApiResponse {
  candidateId: string;
  candidate: PostCandidate;
  generatedAsset: ContentAsset;
  selectedAssetIds: string[];
  metadata: CandidateGenerationMetadata;
  auditLogIds: string[];
}

export async function registerGenerationRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.post<{ Body: unknown; Reply: ApiDataResponse<GenerateCandidateApiResponse> }>(
    "/generation/candidates",
    { schema: { tags: ["generation"], security: [{ localToken: [] }] } },
    async (request, reply) => {
      const body = parseBody(GenerateCandidateBodySchema, request.body);
      const generated = await runCandidateGeneration(context, {
        ...body,
        actorId: body.actorId ?? context.actorId
      });

      return reply.code(201).send({ data: generated });
    }
  );
}
