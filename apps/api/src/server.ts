import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyServerOptions } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { createDatabase, createRepositories, runMigrations, type DatabaseHandle } from "@ig-manager/db";
import { WorkflowEngine } from "@ig-manager/workflow-engine";
import { registerLocalTokenAuth } from "./auth.js";
import { registerErrorHandler } from "./errors.js";
import { createSqliteEventPublisher } from "./events.js";
import { createApiPublisherRegistry } from "./publisher-registry.js";
import type { ApiContext } from "./types.js";
import { registerAccountRoutes } from "./routes/accounts.js";
import { registerAssetRoutes } from "./routes/assets.js";
import { registerAuditLogRoutes } from "./routes/audit-logs.js";
import { registerCandidateRoutes } from "./routes/candidates.js";
import { registerConceptRoutes } from "./routes/concepts.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerPluginRoutes } from "./routes/plugins.js";
import { registerPublishJobRoutes } from "./routes/publish-jobs.js";
import { registerRecipeRoutes } from "./routes/recipes.js";

export interface CreateApiServerOptions extends FastifyServerOptions {
  databaseHandle?: DatabaseHandle;
  databaseUrl?: string;
  apiToken?: string;
  actorId?: string;
  applyMigrations?: boolean;
  closeDatabaseOnClose?: boolean;
}

export function createApiServer(options: CreateApiServerOptions = {}) {
  const {
    databaseHandle,
    databaseUrl,
    apiToken = process.env.IG_MANAGER_LOCAL_TOKEN,
    actorId = "local-api",
    applyMigrations = true,
    closeDatabaseOnClose,
    ...fastifyOptions
  } = options;
  const server = Fastify(fastifyOptions);
  const database = databaseHandle ?? createApiDatabase(databaseUrl ?? ":memory:");

  if (applyMigrations) {
    runMigrations(database.client);
  }

  const repositories = createRepositories(database.db);
  const publisherPlugins = createApiPublisherRegistry(repositories.plugins);
  const context: ApiContext = {
    database,
    repositories,
    workflow: new WorkflowEngine({
      repositories,
      events: createSqliteEventPublisher(database.db),
      publisherPlugins
    }),
    apiToken,
    actorId,
    ownsDatabase: closeDatabaseOnClose ?? !databaseHandle
  };

  registerErrorHandler(server);
  registerLocalTokenAuth(server, context);
  registerOpenApi(server);

  server.register(async (routes) => {
    await registerHealthRoutes(routes);
    await registerAccountRoutes(routes, context);
    await registerConceptRoutes(routes, context);
    await registerAssetRoutes(routes, context);
    await registerRecipeRoutes(routes, context);
    await registerCandidateRoutes(routes, context);
    await registerPublishJobRoutes(routes, context);
    await registerPluginRoutes(routes, context);
    await registerAuditLogRoutes(routes, context);
  });

  server.addHook("onClose", async () => {
    if (context.ownsDatabase) {
      context.database.close();
    }
  });

  return server;
}

function registerOpenApi(server: ReturnType<typeof Fastify>): void {
  server.register(fastifySwagger, {
    openapi: {
      info: {
        title: "IG Manager Local API",
        version: "0.1.0",
        description: "Local-first API for IG Manager Core operations."
      },
      components: {
        securitySchemes: {
          localToken: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "local-token"
          }
        }
      }
    }
  });
  server.register(fastifySwaggerUi, {
    routePrefix: "/docs"
  });
}

function createApiDatabase(databaseUrl: string): DatabaseHandle {
  const filename = resolveDatabaseFilename(databaseUrl);

  if (filename !== ":memory:") {
    const directory = dirname(filename);

    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  }

  return createDatabase(filename);
}

function resolveDatabaseFilename(databaseUrl: string): string {
  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  if (databaseUrl.startsWith("file:")) {
    return fileURLToPath(databaseUrl);
  }

  return resolve(databaseUrl);
}
