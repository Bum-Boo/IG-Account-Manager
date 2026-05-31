import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { PublishJobStatusSchema, type PublishJob } from "@ig-manager/domain";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { IdParamSchema, parseBody, parseParams, parseQuery } from "../validation.js";

const PublishJobQuerySchema = z
  .object({
    status: PublishJobStatusSchema.optional(),
    dueBefore: z.string().datetime({ offset: true }).optional()
  })
  .strict();

const RetryBodySchema = z
  .object({
    actorId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

export async function registerPublishJobRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.get<{ Querystring: unknown; Reply: ApiDataResponse<PublishJob[]> }>(
    "/publish-jobs",
    { schema: { tags: ["publish jobs"], security: [{ localToken: [] }] } },
    async (request) => {
      const query = parseQuery(PublishJobQuerySchema, request.query);
      let jobs = query.dueBefore
        ? context.repositories.publishJobs.getScheduledJobsDueBefore(query.dueBefore)
        : context.repositories.publishJobs.list();

      if (query.status) {
        jobs = jobs.filter((job) => job.status === query.status);
      }

      return { data: jobs };
    }
  );

  server.post<{ Params: unknown; Body: unknown; Reply: ApiDataResponse<PublishJob> }>(
    "/publish-jobs/:id/retry",
    { schema: { tags: ["publish jobs"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const body = parseBody(RetryBodySchema, request.body ?? {});
      const retried = await context.workflow.retryPublishJob({
        publishJobId: id,
        actorId: body.actorId ?? context.actorId
      });

      return { data: retried.data };
    }
  );
}
