import type { FastifyInstance } from "fastify";
import type { ApiContext } from "./types.js";

const PUBLIC_PREFIXES = ["/docs", "/documentation", "/openapi.json"];

export function registerLocalTokenAuth(server: FastifyInstance, context: ApiContext): void {
  server.addHook("preHandler", async (request, reply) => {
    if (!context.apiToken || request.url === "/health" || isPublicDocumentationRoute(request.url)) {
      return;
    }

    const expected = `Bearer ${context.apiToken}`;

    if (request.headers.authorization !== expected) {
      await reply.code(401).send({
        error: {
          code: "unauthorized",
          message: "Missing or invalid local API token."
        }
      });
    }
  });
}

function isPublicDocumentationRoute(url: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`));
}
