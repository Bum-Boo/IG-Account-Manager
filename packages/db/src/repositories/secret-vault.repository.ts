import { asc, eq } from "drizzle-orm";
import type { IgManagerDatabase } from "../database.js";
import { secretVaultEntries } from "../schema.js";

type JsonRecord = Record<string, unknown>;
type SecretVaultRow = typeof secretVaultEntries.$inferSelect;
type SecretVaultInsert = typeof secretVaultEntries.$inferInsert;

export interface SecretVaultEntry {
  id: string;
  namespace: string;
  algorithm: string;
  ciphertext: string;
  iv: string;
  authTag: string;
  metadata: JsonRecord;
  createdAt: string;
  updatedAt: string;
}

export class SecretVaultRepository {
  constructor(private readonly db: IgManagerDatabase) {}

  create(entry: SecretVaultEntry): SecretVaultEntry {
    this.db.insert(secretVaultEntries).values(toSecretVaultRow(entry)).run();
    return entry;
  }

  getById(id: string): SecretVaultEntry | undefined {
    const row = this.db.select().from(secretVaultEntries).where(eq(secretVaultEntries.id, id)).get();
    return row ? fromSecretVaultRow(row) : undefined;
  }

  listByNamespace(namespace: string): SecretVaultEntry[] {
    return this.db
      .select()
      .from(secretVaultEntries)
      .where(eq(secretVaultEntries.namespace, namespace))
      .orderBy(asc(secretVaultEntries.updatedAt))
      .all()
      .map(fromSecretVaultRow);
  }

  update(entry: SecretVaultEntry): SecretVaultEntry {
    this.db.update(secretVaultEntries).set(toSecretVaultRow(entry)).where(eq(secretVaultEntries.id, entry.id)).run();
    return entry;
  }

  delete(id: string): void {
    this.db.delete(secretVaultEntries).where(eq(secretVaultEntries.id, id)).run();
  }
}

function toSecretVaultRow(entry: SecretVaultEntry): SecretVaultInsert {
  return {
    id: entry.id,
    namespace: entry.namespace,
    algorithm: entry.algorithm,
    ciphertext: entry.ciphertext,
    iv: entry.iv,
    authTag: entry.authTag,
    metadata: entry.metadata,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
}

function fromSecretVaultRow(row: SecretVaultRow): SecretVaultEntry {
  return {
    id: row.id,
    namespace: row.namespace,
    algorithm: row.algorithm,
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.authTag,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
