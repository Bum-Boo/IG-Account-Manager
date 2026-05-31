import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AssetTypeSchema, createContentRecipe, type ContentRecipe } from "@ig-manager/domain";
import { ApiNotFoundError } from "../errors.js";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { optionalRecord, parseBody, parseQuery } from "../validation.js";

const RecipeQuerySchema = z
  .object({
    conceptId: z.string().trim().min(1).optional()
  })
  .strict();

const CreateRecipeBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    conceptId: z.string().trim().min(1).max(128),
    name: z.string().trim().min(2).max(120),
    summary: z.string().trim().min(1).max(1000),
    contentPillars: z.array(z.string().trim().min(1).max(120)).min(1),
    requiredAssetTypes: z.array(AssetTypeSchema).optional(),
    format: z.string().trim().min(1).max(120),
    instructions: z.array(z.string().trim().min(1).max(500)).min(1),
    reviewChecklist: z.array(z.string().trim().min(1).max(300)).optional(),
    metadata: optionalRecord()
  })
  .strict();

export async function registerRecipeRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.get<{ Querystring: unknown; Reply: ApiDataResponse<ContentRecipe[]> }>(
    "/recipes",
    { schema: { tags: ["recipes"], security: [{ localToken: [] }] } },
    async (request) => {
      const query = parseQuery(RecipeQuerySchema, request.query);
      return {
        data: query.conceptId
          ? context.repositories.recipes.getByConcept(query.conceptId)
          : context.repositories.recipes.list()
      };
    }
  );

  server.post<{ Body: unknown; Reply: ApiDataResponse<ContentRecipe> }>(
    "/recipes",
    { schema: { tags: ["recipes"], security: [{ localToken: [] }] } },
    async (request, reply) => {
      const body = parseBody(CreateRecipeBodySchema, request.body);

      if (!context.repositories.concepts.getById(body.conceptId)) {
        throw new ApiNotFoundError("concept", body.conceptId);
      }

      const recipe = createContentRecipe(body);
      context.repositories.recipes.create(recipe);

      return reply.code(201).send({ data: recipe });
    }
  );
}
