import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import type { SecretVaultEntry, SecretVaultRepository } from "@ig-manager/db";
import { InstagramIntegrationError } from "./errors.js";

const algorithm = "aes-256-gcm";
const namespace = "instagram";

export interface InstagramStoredTokenPayload {
  accessToken: string;
  pageAccessToken?: string;
  tokenType?: string;
  expiresAt?: string;
  scopes?: string[];
  userId?: string;
  pageId?: string;
  instagramBusinessAccountId?: string;
  availableAccounts?: {
    instagramBusinessAccountId: string;
    username: string;
    name?: string;
    pageId: string;
    pageName: string;
    pageAccessToken?: string;
  }[];
}

export interface EncryptedTokenVaultOptions {
  repository: SecretVaultRepository;
  key: string;
  now?: () => Date;
}

export class EncryptedTokenVault {
  private readonly key: Buffer;
  private readonly now: () => Date;

  constructor(private readonly options: EncryptedTokenVaultOptions) {
    this.key = parseVaultKey(options.key);
    this.now = options.now ?? (() => new Date());
  }

  store(payload: InstagramStoredTokenPayload, metadata: Record<string, unknown> = {}): string {
    const now = this.now().toISOString();
    const entry = this.encryptEntry({
      id: `secret_${randomUUID()}`,
      namespace,
      payload,
      metadata,
      createdAt: now,
      updatedAt: now
    });

    this.options.repository.create(entry);
    return entry.id;
  }

  replace(id: string, payload: InstagramStoredTokenPayload, metadata: Record<string, unknown> = {}): void {
    const existing = this.options.repository.getById(id);

    if (!existing) {
      throw new InstagramIntegrationError({
        code: "instagram_token_ref_not_found",
        message: "Stored Instagram token reference was not found.",
        statusCode: 404
      });
    }

    const entry = this.encryptEntry({
      id,
      namespace: existing.namespace,
      payload,
      metadata,
      createdAt: existing.createdAt,
      updatedAt: this.now().toISOString()
    });
    this.options.repository.update(entry);
  }

  read(id: string): InstagramStoredTokenPayload | undefined {
    const entry = this.options.repository.getById(id);

    if (!entry || entry.namespace !== namespace) {
      return undefined;
    }

    return this.decryptEntry(entry);
  }

  delete(id: string | undefined): void {
    if (id) {
      this.options.repository.delete(id);
    }
  }

  private encryptEntry(input: {
    id: string;
    namespace: string;
    payload: InstagramStoredTokenPayload;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): SecretVaultEntry {
    const iv = randomBytes(12);
    const cipher = createCipheriv(algorithm, this.key, iv);
    const plaintext = Buffer.from(JSON.stringify(input.payload), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      id: input.id,
      namespace: input.namespace,
      algorithm,
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      metadata: input.metadata,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt
    };
  }

  private decryptEntry(entry: SecretVaultEntry): InstagramStoredTokenPayload {
    if (entry.algorithm !== algorithm) {
      throw new InstagramIntegrationError({
        code: "instagram_token_vault_algorithm_unsupported",
        message: `Unsupported token vault algorithm '${entry.algorithm}'.`,
        statusCode: 500
      });
    }

    try {
      const decipher = createDecipheriv(algorithm, this.key, Buffer.from(entry.iv, "base64"));
      decipher.setAuthTag(Buffer.from(entry.authTag, "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(entry.ciphertext, "base64")),
        decipher.final()
      ]).toString("utf8");
      return JSON.parse(plaintext) as InstagramStoredTokenPayload;
    } catch {
      throw new InstagramIntegrationError({
        code: "instagram_token_vault_decrypt_failed",
        message: "Stored Instagram token could not be decrypted with the configured vault key.",
        statusCode: 500
      });
    }
  }
}

export function parseVaultKey(value: string): Buffer {
  const key = Buffer.from(value, "base64");

  if (key.length !== 32) {
    throw new InstagramIntegrationError({
      code: "instagram_token_vault_key_invalid",
      message: "IG_MANAGER_TOKEN_VAULT_KEY must be a base64-encoded 32-byte key.",
      statusCode: 500
    });
  }

  return key;
}
