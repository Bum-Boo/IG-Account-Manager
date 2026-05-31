import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AuditLog } from "@ig-manager/domain";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { parseQuery } from "../validation.js";

const AuditLogQuerySchema = z
  .object({
    entityType: z.string().trim().min(1).max(120).optional(),
    entityId: z.string().trim().min(1).max(128).optional()
  })
  .strict()
  .superRefine((query, ctx) => {
    if ((query.entityType && !query.entityId) || (!query.entityType && query.entityId)) {
      ctx.addIssue({
        code: "custom",
        message: "entityType and entityId must be provided together."
      });
    }
  });

export async function registerAuditLogRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.get<{ Querystring: unknown; Reply: ApiDataResponse<AuditLog[]> }>(
    "/audit-logs",
    { schema: { tags: ["audit logs"], security: [{ localToken: [] }] } },
    async (request) => {
      const query = parseQuery(AuditLogQuerySchema, request.query);

      return {
        data:
          query.entityType && query.entityId
            ? context.repositories.auditLogs.listForEntity(query.entityType, query.entityId)
            : context.repositories.auditLogs.list()
      };
    }
  );
}
