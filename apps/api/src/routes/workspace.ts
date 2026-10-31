import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { seedStarterWorkspace, STARTER_SEED_VERSION } from "@ig-manager/db";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { parseBody } from "../validation.js";

const SeedBodySchema = z
  .object({
    actorId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

interface SeedResult {
  seed: string;
  accounts: number;
  concepts: number;
  candidates: number;
  publishers: number;
}

export async function registerWorkspaceRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.post<{ Body: unknown; Reply: ApiDataResponse<SeedResult> }>(
    "/workspace/seed",
    { schema: { tags: ["workspace"], security: [{ localToken: [] }] } },
    async (request, reply) => {
      const body = parseBody(SeedBodySchema, request.body ?? {});
      const seeded = seedStarterWorkspace(context.database, { actorId: body.actorId ?? context.actorId });

      return reply.code(201).send({
        data: {
          seed: STARTER_SEED_VERSION,
          accounts: seeded.accounts.length,
          concepts: seeded.concepts.length,
          candidates: seeded.candidates.length,
          publishers: seeded.plugins.filter((plugin) => plugin.type === "publisher").length
        }
      });
    }
  );
}
