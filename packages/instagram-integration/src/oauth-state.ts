import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { InstagramIntegrationError } from "./errors.js";

export interface InstagramOAuthStatePayload {
  accountId: string;
  nonce: string;
  expiresAt: string;
}

export function createInstagramOAuthState(input: {
  accountId: string;
  secret: string;
  now?: Date;
  ttlMs?: number;
}): { state: string; expiresAt: string } {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + (input.ttlMs ?? 10 * 60_000)).toISOString();
  const payload: InstagramOAuthStatePayload = {
    accountId: input.accountId,
    nonce: randomUUID(),
    expiresAt
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = signStateBody(body, input.secret);

  return {
    state: `${body}.${signature}`,
    expiresAt
  };
}

export function verifyInstagramOAuthState(input: {
  state: string;
  secret: string;
  now?: Date;
}): InstagramOAuthStatePayload {
  const [body, signature, extra] = input.state.split(".");

  if (!body || !signature || extra !== undefined) {
    throw invalidState();
  }

  const expected = signStateBody(body, input.secret);

  if (!safeEqual(signature, expected)) {
    throw invalidState();
  }

  let payload: InstagramOAuthStatePayload;

  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as InstagramOAuthStatePayload;
  } catch {
    throw invalidState();
  }

  if (!payload.accountId || !payload.nonce || !payload.expiresAt) {
    throw invalidState();
  }

  const now = input.now ?? new Date();

  if (Date.parse(payload.expiresAt) <= now.getTime()) {
    throw new InstagramIntegrationError({
      code: "instagram_oauth_state_expired",
      message: "Instagram OAuth state has expired. Start the connection again.",
      statusCode: 400
    });
  }

  return payload;
}

function signStateBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function invalidState(): InstagramIntegrationError {
  return new InstagramIntegrationError({
    code: "instagram_oauth_state_invalid",
    message: "Instagram OAuth state could not be verified.",
    statusCode: 400
  });
}
