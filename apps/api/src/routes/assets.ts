import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AssetTypeSchema, createContentAsset, type ContentAsset } from "@ig-manager/domain";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { optionalRecord, parseBody, parseQuery } from "../validation.js";

const AssetQuerySchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    conceptId: z.string().trim().min(1).optional()
  })
  .strict();

const RightsBodySchema = z
  .object({
    usage: z.enum(["owned", "licensed", "reference_only", "unknown"]).optional(),
    source: z.string().trim().max(500).optional(),
    expiresAt: z.string().datetime({ offset: true }).optional()
  })
  .strict();

const CreateAssetBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    type: AssetTypeSchema,
    uri: z.string().trim().min(1).max(2000),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(80)).optional(),
    accountIds: z.array(z.string().trim().min(1)).optional(),
    conceptIds: z.array(z.string().trim().min(1)).optional(),
    rights: RightsBodySchema.optional(),
    checksum: z.string().trim().min(1).max(256).optional(),
    metadata: optionalRecord()
  })
  .strict();

export async function registerAssetRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.get<{ Querystring: unknown; Reply: ApiDataResponse<ContentAsset[]> }>(
    "/assets",
    { schema: { tags: ["assets"], security: [{ localToken: [] }] } },
    async (request) => {
      const query = parseQuery(AssetQuerySchema, request.query);
      let assets = query.conceptId
        ? context.repositories.assets.getAssetsCompatibleWithConcept(query.conceptId)
        : context.repositories.assets.list();

      if (query.accountId) {
        assets = assets.filter((asset) => asset.accountIds.includes(query.accountId as string));
      }

      return { data: assets };
    }
  );

  server.post<{ Body: unknown; Reply: ApiDataResponse<ContentAsset> }>(
    "/assets",
    { schema: { tags: ["assets"], security: [{ localToken: [] }] } },
    async (request, reply) => {
      const body = parseBody(CreateAssetBodySchema, request.body);
      const asset = createContentAsset(body);
      context.repositories.assets.create(asset);

      return reply.code(201).send({ data: asset });
    }
  );
}
