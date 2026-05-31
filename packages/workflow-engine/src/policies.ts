import type { Account, Concept } from "@ig-manager/domain";

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

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

