import { defaultDatabaseFilename } from "@ig-manager/db";
import { createApiServer } from "./server.js";

const server = createApiServer({
  logger: process.env.NODE_ENV !== "test",
  databaseUrl: process.env.API_DATABASE_URL ?? process.env.DATABASE_URL ?? defaultDatabaseFilename(),
  apiToken: process.env.IG_MANAGER_LOCAL_TOKEN,
  actorId: process.env.API_ACTOR_ID ?? "local-api"
});

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
