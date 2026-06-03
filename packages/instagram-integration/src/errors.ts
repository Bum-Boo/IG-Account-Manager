export class InstagramIntegrationError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly details?: unknown;

  constructor(input: {
    code: string;
    message: string;
    statusCode?: number;
    retryable?: boolean;
    details?: unknown;
  }) {
    super(input.message);
    this.name = "InstagramIntegrationError";
    this.code = input.code;
    this.statusCode = input.statusCode ?? 400;
    this.retryable = input.retryable ?? false;
    this.details = input.details;
  }
}

export function redactInstagramErrorDetails(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactInstagramErrorDetails);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(value)) {
    if (/token|secret|password|authorization|appsecret/i.test(key)) {
      redacted[key] = "[redacted]";
      continue;
    }

    redacted[key] = redactInstagramErrorDetails(nested);
  }

  return redacted;
}
