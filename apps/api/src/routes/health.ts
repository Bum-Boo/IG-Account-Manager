import type { FastifyInstance } from "fastify";

export interface HealthResponse {
  status: "ok";
  service: "api";
}

export async function registerHealthRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Reply: HealthResponse }>(
    "/health",
    {
      schema: {
        tags: ["system"],
        response: {
          200: {
            type: "object",
            required: ["status", "service"],
            properties: {
              status: { type: "string", const: "ok" },
              service: { type: "string", const: "api" }
            }
          }
        }
      }
    },
    async () => ({
      status: "ok",
      service: "api"
    })
  );
}
