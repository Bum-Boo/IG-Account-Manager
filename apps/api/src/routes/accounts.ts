import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createAccount,
  AccountStatusSchema,
  type Account
} from "@ig-manager/domain";
import { ApiNotFoundError } from "../errors.js";
import type { ApiContext, ApiDataResponse } from "../types.js";
import { IdParamSchema, optionalRecord, parseBody, parseParams } from "../validation.js";

const PlatformBodySchema = z
  .object({
    id: z.string().trim().min(3).max(64),
    displayName: z.string().trim().min(1).max(80),
    officialApiBaseUrl: z.string().url().optional(),
    metadata: optionalRecord()
  })
  .strict();

const AutomationPolicyBodySchema = z
  .object({
    candidateGeneration: z.enum(["manual", "plugin_assisted"]).optional(),
    requireHumanApproval: z.boolean().optional(),
    allowAutoScheduling: z.boolean().optional(),
    allowAutoPublishing: z.boolean().optional()
  })
  .strict();

const SchedulePolicyBodySchema = z
  .object({
    timezone: z.string().trim().min(1).optional(),
    minLeadTimeMinutes: z.number().int().min(0).optional(),
    maxPostsPerDay: z.number().int().min(1).max(100).optional(),
    allowedWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
    allowedTimeWindows: z
      .array(
        z
          .object({
            start: z.string().trim().min(5).max(5),
            end: z.string().trim().min(5).max(5)
          })
          .strict()
      )
      .optional(),
    requireApprovedCandidate: z.boolean().optional()
  })
  .strict();

const CreateAccountBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    platform: PlatformBodySchema,
    externalAccountId: z.string().trim().min(1).max(256).optional(),
    handle: z.string().trim().min(1).max(120),
    displayName: z.string().trim().min(1).max(120).optional(),
    status: AccountStatusSchema.optional(),
    automationPolicy: AutomationPolicyBodySchema.optional(),
    schedulePolicy: SchedulePolicyBodySchema.optional(),
    pluginRegistrationIds: z.array(z.string().trim().min(1)).optional(),
    notes: z.string().max(5000).optional(),
    metadata: optionalRecord(),
    connectedAt: z.string().datetime({ offset: true }).optional()
  })
  .strict();

export async function registerAccountRoutes(server: FastifyInstance, context: ApiContext): Promise<void> {
  server.get<{ Reply: ApiDataResponse<Account[]> }>(
    "/accounts",
    { schema: { tags: ["accounts"], security: [{ localToken: [] }] } },
    async () => ({
      data: context.repositories.accounts.list()
    })
  );

  server.post<{ Body: unknown; Reply: ApiDataResponse<Account> }>(
    "/accounts",
    { schema: { tags: ["accounts"], security: [{ localToken: [] }] } },
    async (request, reply) => {
      const body = parseBody(CreateAccountBodySchema, request.body);
      const account = createAccount(body);
      context.repositories.accounts.create(account);

      return reply.code(201).send({ data: account });
    }
  );

  server.get<{ Params: unknown; Reply: ApiDataResponse<Account> }>(
    "/accounts/:id",
    { schema: { tags: ["accounts"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);
      const account = context.repositories.accounts.getById(id);

      if (!account) {
        throw new ApiNotFoundError("account", id);
      }

      return { data: account };
    }
  );

  server.get<{ Params: unknown }>(
    "/accounts/:id/concepts",
    { schema: { tags: ["concepts"], security: [{ localToken: [] }] } },
    async (request) => {
      const { id } = parseParams(IdParamSchema, request.params);

      if (!context.repositories.accounts.getById(id)) {
        throw new ApiNotFoundError("account", id);
      }

      return { data: context.repositories.concepts.getByAccount(id) };
    }
  );
}
