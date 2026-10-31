import type { Account, Concept, PublishJob } from "@ig-manager/domain";

export interface PublishJobRunRequest {
  requestedAt: string;
  requestedBy?: string;
  originalScheduledAt?: string;
}

export interface ConceptWorkflowPolicy {
  autoSchedule: boolean;
  autoPublish: boolean;
}

export function getConceptWorkflowPolicy(concept: Concept): ConceptWorkflowPolicy {
  const policy = readRecord(concept.metadata.workflowPolicy);

  return {
    autoSchedule: policy?.autoSchedule === true,
    autoPublish: policy?.autoPublish === true
  };
}

export function conceptAllowsAutoSchedule(concept: Concept): boolean {
  return getConceptWorkflowPolicy(concept).autoSchedule;
}

export function allowsAutoPublish(account: Account, concept: Concept): boolean {
  return account.automationPolicy.allowAutoPublishing || getConceptWorkflowPolicy(concept).autoPublish;
}

export function getPublishJobRunRequest(job: PublishJob): PublishJobRunRequest | undefined {
  const request = readRecord(job.metadata.runRequest);

  if (!request || typeof request.requestedAt !== "string") {
    return undefined;
  }

  return {
    requestedAt: request.requestedAt,
    requestedBy: typeof request.requestedBy === "string" ? request.requestedBy : undefined,
    originalScheduledAt: typeof request.originalScheduledAt === "string" ? request.originalScheduledAt : undefined
  };
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

