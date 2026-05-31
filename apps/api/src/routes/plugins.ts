import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { PluginRegistrationSchema, PluginTypeSchema, type PluginRegistration } from "@ig-manager/domain";
import { ApiNotFoundError } from "../errors.js";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { IdParamSchema, parseParams, parseQuery } from "../validation.js";

const PluginQuerySchema = z
  .object({
    type: PluginTypeSchema.optional(),
    enabled: z.enum(["true", "false"]).optional()
  })
  .strict();

export async function registerPluginRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.get<{ Querystring: unknown; Reply: ApiDataResponse<PluginRegistration[]> }>(
    "/plugins",
    { schema: { tags: ["plugins"], security: [{ localToken: [] }] } },
    async (request) => {
      const query = parseQuery(PluginQuerySchema, request.query);
      let plugins =
        query.type && query.enabled === "true"
          ? context.repositories.plugins.getEnabledByType(query.type)
          : context.repositories.plugins.list();

      if (query.type && query.enabled !== "true") {
        plugins = plugins.filter((plugin) => plugin.type === query.type);
      }

      if (query.enabled) {
        const enabled = query.enabled === "true";
        plugins = plugins.filter((plugin) => plugin.enabled === enabled);
      }

      return { data: plugins };
    }
  );

  server.post<{ Params: unknown; Reply: ApiDataResponse<PluginRegistration> }>(
    "/plugins/:id/enable",
    { schema: { tags: ["plugins"], security: [{ localToken: [] }] } },
    async (request) => setPluginEnabled(context, parseParams(IdParamSchema, request.params).id, true)
  );

  server.post<{ Params: unknown; Reply: ApiDataResponse<PluginRegistration> }>(
    "/plugins/:id/disable",
    { schema: { tags: ["plugins"], security: [{ localToken: [] }] } },
    async (request) => setPluginEnabled(context, parseParams(IdParamSchema, request.params).id, false)
  );
}

function setPluginEnabled(context: ApiContext, id: string, enabled: boolean): ApiDataResponse<PluginRegistration> {
  const plugin = context.repositories.plugins.getById(id);

  if (!plugin) {
    throw new ApiNotFoundError("plugin", id);
  }

  const updated = PluginRegistrationSchema.parse({
    ...plugin,
    enabled,
    updatedAt: new Date().toISOString()
  });
  context.repositories.plugins.update(updated);

  return { data: updated };
}
