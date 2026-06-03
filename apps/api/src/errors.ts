import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DomainValidationError, InvalidStateTransitionError } from "@ig-manager/domain";
import { InstagramIntegrationError } from "@ig-manager/instagram-integration";
import { WorkflowNotFoundError, WorkflowRuleViolationError } from "@ig-manager/workflow-engine";
import {
  CandidateGenerationFailedError,
  CandidateGenerationNotFoundError,
  CandidateGenerationUnavailableError
} from "./generation.js";

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

    if (error instanceof ApiNotFoundError || error instanceof WorkflowNotFoundError || error instanceof CandidateGenerationNotFoundError) {
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

    if (error instanceof CandidateGenerationUnavailableError) {
      return reply.code(503).send({
        error: {
          code: "candidate_generation_unavailable",
          message: error.message
        }
      });
    }

    if (error instanceof CandidateGenerationFailedError) {
      return reply.code(502).send({
        error: {
          code: "candidate_generation_failed",
          message: error.message
        }
      });
    }

    if (error instanceof InstagramIntegrationError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
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

    server.log.error(error);

    return reply.code(500).send({
      error: {
        code: "internal_error",
        message: "Unexpected local API error."
      }
    });
  });
}
