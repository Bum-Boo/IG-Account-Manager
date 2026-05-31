import { z } from "zod";

export const IdParamSchema = z.object({ id: z.string().trim().min(1) }).strict();

export const EmptyBodySchema = z.object({}).strict();

export const ActorQuerySchema = z
  .object({
    actorId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

export function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

export function parseParams<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

export function parseQuery<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

export function optionalRecord() {
  return z.record(z.string(), z.unknown()).optional();
}
