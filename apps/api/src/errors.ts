import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { WorkspaceNotEmptyError } from "@ig-manager/db";
import { DomainValidationError, InvalidStateTransitionError } from "@ig-manager/domain";
import { WorkflowNotFoundError, WorkflowRuleViolationError } from "@ig-manager/workflow-engine";

export class ApiNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} '${id}' was not found.`);
    this.name = "ApiNotFoundError";
  }
}

export function registerErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        error: {
          code: "validation_failed",
          message: "Request validation failed.",
          details: error.flatten()
        }
      });
    }

    if (error instanceof ApiNotFoundError || error instanceof WorkflowNotFoundError) {
      return reply.code(404).send({
        error: {
          code: "not_found",
          message: error.message
        }
      });
    }

    if (error instanceof WorkflowRuleViolationError || error instanceof InvalidStateTransitionError) {
      return reply.code(409).send({
        error: {
          code: "workflow_rule_violation",
          message: error.message
        }
      });
    }

    if (error instanceof WorkspaceNotEmptyError) {
      return reply.code(409).send({
        error: {
          code: "workspace_not_empty",
          message: error.message
        }
      });
    }

    if (error instanceof DomainValidationError) {
      return reply.code(400).send({
        error: {
          code: "domain_validation_failed",
          message: error.message
        }
      });
    }

    // Fastify's own request errors (malformed or empty JSON bodies, oversized
    // payloads, ...) carry a 4xx statusCode; report them as client errors
    // instead of a generic 500.
    const statusCode = (error as { statusCode?: unknown }).statusCode;

    if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
      return reply.code(statusCode).send({
        error: {
          code: "bad_request",
          message: error instanceof Error ? error.message : "Bad request."
        }
      });
    }

    server.log.error(error);

    return reply.code(500).send({
      error: {
        code: "internal_error",
        message: "Unexpected local API error."
      }
    });
  });
}
