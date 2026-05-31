export class WorkflowNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} '${id}' was not found.`);
    this.name = "WorkflowNotFoundError";
  }
}

export class WorkflowRuleViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowRuleViolationError";
  }
}

