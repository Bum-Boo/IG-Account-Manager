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

const RunBodySchema = z
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

  // The API never publishes. "Run now" and "retry" both record a run request
  // that makes the job due immediately; the local worker executes it on its
  // next poll. (Retry used to move the job to "running" here, which left it
  // stuck because no process would ever finish that attempt.)
  for (const action of ["run", "retry"] as const) {
    server.post<{ Params: unknown; Body: unknown; Reply: ApiDataResponse<PublishJob> }>(
      `/publish-jobs/:id/${action}`,
      { schema: { tags: ["publish jobs"], security: [{ localToken: [] }] } },
      async (request) => {
        const { id } = parseParams(IdParamSchema, request.params);
        const body = parseBody(RunBodySchema, request.body ?? {});
        const requested = await context.workflow.requestPublishJobRun({
          publishJobId: id,
          actorId: body.actorId ?? context.actorId
        });

        return { data: requested.data };
      }
    );
  }
}
