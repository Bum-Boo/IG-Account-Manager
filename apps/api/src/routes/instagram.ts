import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createAuditLog } from "@ig-manager/domain";
import { InstagramIntegrationError, type InstagramConnectionStatus } from "@ig-manager/instagram-integration";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { IdParamSchema, parseBody, parseParams, parseQuery } from "../validation.js";

const CallbackQuerySchema = z
  .object({
    state: z.string().trim().min(1),
    code: z.string().trim().min(1).optional(),
    error: z.string().trim().min(1).optional(),
    error_description: z.string().trim().min(1).optional()
  })
  .strict();

const SelectInstagramAccountBodySchema = z
  .object({
    instagramBusinessAccountId: z.string().trim().min(1).max(256),
    actorId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

const OptionalActorBodySchema = z
  .object({
    actorId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

export async function registerInstagramRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.post<{ Params: unknown; Body: unknown; Reply: ApiDataResponse<{ authorizationUrl: string; stateExpiresAt: string; scopes: string[] }> }>(
    "/accounts/:id/instagram/connect",
    { schema: { tags: ["instagram"], security: [{ localToken: [] }] } },
    async (request, reply) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const body = parseBody(OptionalActorBodySchema, request.body ?? {});
      const service = getInstagramConnectionService(context);
      audit(context, "instagram.connection_requested", id, body.actorId ?? context.actorId, {});

      try {
        const result = service.startConnection(id);
        return reply.code(201).send({ data: result });
      } catch (error) {
        audit(context, "instagram.connection_failed", id, body.actorId ?? context.actorId, {
          reason: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
  );

  server.get<{ Params: unknown; Reply: ApiDataResponse<InstagramConnectionStatus> }>(
    "/accounts/:id/instagram/connection",
    { schema: { tags: ["instagram"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      return { data: getInstagramConnectionService(context).getStatus(id) };
    }
  );

  server.post<{ Params: unknown; Body: unknown; Reply: ApiDataResponse<InstagramConnectionStatus> }>(
    "/accounts/:id/instagram/select",
    { schema: { tags: ["instagram"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const body = parseBody(SelectInstagramAccountBodySchema, request.body);
      const before = getSafeStatus(context, id);
      const result = getInstagramConnectionService(context).selectAccount(id, body.instagramBusinessAccountId);
      audit(context, "instagram.account_selected", id, body.actorId ?? context.actorId, {
        before,
        after: result,
        instagramBusinessAccountId: result.externalAccountId
      });
      return { data: result };
    }
  );

  server.post<{ Params: unknown; Body: unknown; Reply: ApiDataResponse<InstagramConnectionStatus> }>(
    "/accounts/:id/instagram/disconnect",
    { schema: { tags: ["instagram"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const body = parseBody(OptionalActorBodySchema, request.body ?? {});
      const before = getSafeStatus(context, id);
      const result = getInstagramConnectionService(context).disconnect(id);
      audit(context, "instagram.disconnected", id, body.actorId ?? context.actorId, {
        before,
        after: result
      });
      return { data: result };
    }
  );

  server.post<{ Params: unknown; Body: unknown; Reply: ApiDataResponse<InstagramConnectionStatus> }>(
    "/accounts/:id/instagram/refresh",
    { schema: { tags: ["instagram"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const body = parseBody(OptionalActorBodySchema, request.body ?? {});
      const result = await getInstagramConnectionService(context).refresh(id);
      audit(context, "instagram.token_refreshed", id, body.actorId ?? context.actorId, {
        expiresAt: result.expiresAt
      });
      return { data: result };
    }
  );

  server.get<{ Querystring: unknown }>(
    "/instagram/oauth/callback",
    { schema: { tags: ["instagram"] } },
    async (request, reply) => {
      const query = parseQuery(CallbackQuerySchema, request.query);
      const service = getInstagramConnectionService(context);

      try {
        const result = await service.completeOAuthCallback({
          state: query.state,
          code: query.code,
          error: query.error,
          errorDescription: query.error_description,
          signal: undefined
        });
        audit(context, "instagram.oauth_completed", result.accountId, context.actorId, {
          status: result.status,
          externalAccountId: result.connection.externalAccountId
        });

        return reply.redirect(result.redirectUrl);
      } catch (error) {
        const accountId = extractAccountIdFromState(query.state, service);
        audit(context, "instagram.connection_failed", accountId ?? "instagram_oauth", context.actorId, {
          reason: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
  );
}

function getInstagramConnectionService(context: ApiContext) {
  if (!context.instagramConnectionService) {
    throw new InstagramIntegrationError({
      code: "instagram_connection_unavailable",
      message: "Instagram connection service is not configured for this local API instance.",
      statusCode: 503
    });
  }

  return context.instagramConnectionService;
}

function getSafeStatus(context: ApiContext, accountId: string): InstagramConnectionStatus | undefined {
  try {
    return getInstagramConnectionService(context).getStatus(accountId);
  } catch {
    return undefined;
  }
}

function audit(
  context: ApiContext,
  action: string,
  entityId: string,
  actorId: string | undefined,
  metadata: Record<string, unknown>
): void {
  context.repositories.auditLogs.append(
    createAuditLog({
      action,
      actorId,
      entityType: "account",
      entityId,
      metadata
    })
  );
}

function extractAccountIdFromState(state: string, service: { getStatus(accountId: string): InstagramConnectionStatus }): string | undefined {
  void service;
  const body = state.split(".")[0];

  if (!body) {
    return undefined;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { accountId?: unknown };
    return typeof payload.accountId === "string" ? payload.accountId : undefined;
  } catch {
    return undefined;
  }
}
