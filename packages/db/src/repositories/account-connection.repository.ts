import { and, asc, eq } from "drizzle-orm";
import type { IgManagerDatabase } from "../database.js";
import { accountConnections, type AccountConnectionStatus } from "../schema.js";

type JsonRecord = Record<string, unknown>;
type AccountConnectionRow = typeof accountConnections.$inferSelect;
type AccountConnectionInsert = typeof accountConnections.$inferInsert;

export interface AccountConnectionRecord {
  id: string;
  accountId: string;
  provider: string;
  externalAccountId?: string;
  handle?: string;
  status: AccountConnectionStatus;
  scopes: string[];
  tokenRef?: string;
  expiresAt?: string;
  metadata: JsonRecord;
  connectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class AccountConnectionRepository {
  constructor(private readonly db: IgManagerDatabase) {}

  create(record: AccountConnectionRecord): AccountConnectionRecord {
    this.db.insert(accountConnections).values(toAccountConnectionRow(record)).run();
    return record;
  }

  getById(id: string): AccountConnectionRecord | undefined {
    const row = this.db.select().from(accountConnections).where(eq(accountConnections.id, id)).get();
    return row ? fromAccountConnectionRow(row) : undefined;
  }

  getByAccountProvider(accountId: string, provider: string): AccountConnectionRecord | undefined {
    const row = this.db
      .select()
      .from(accountConnections)
      .where(and(eq(accountConnections.accountId, accountId), eq(accountConnections.provider, provider)))
      .get();
    return row ? fromAccountConnectionRow(row) : undefined;
  }

  listByAccount(accountId: string): AccountConnectionRecord[] {
    return this.db
      .select()
      .from(accountConnections)
      .where(eq(accountConnections.accountId, accountId))
      .orderBy(asc(accountConnections.provider))
      .all()
      .map(fromAccountConnectionRow);
  }

  listByProvider(provider: string): AccountConnectionRecord[] {
    return this.db
      .select()
      .from(accountConnections)
      .where(eq(accountConnections.provider, provider))
      .orderBy(asc(accountConnections.accountId))
      .all()
      .map(fromAccountConnectionRow);
  }

  upsert(record: AccountConnectionRecord): AccountConnectionRecord {
    const existing = this.getByAccountProvider(record.accountId, record.provider);

    if (existing) {
      this.db
        .update(accountConnections)
        .set(toAccountConnectionRow({ ...record, id: existing.id, createdAt: existing.createdAt }))
        .where(eq(accountConnections.id, existing.id))
        .run();
      return { ...record, id: existing.id, createdAt: existing.createdAt };
    }

    return this.create(record);
  }

  update(record: AccountConnectionRecord): AccountConnectionRecord {
    this.db.update(accountConnections).set(toAccountConnectionRow(record)).where(eq(accountConnections.id, record.id)).run();
    return record;
  }

  delete(id: string): void {
    this.db.delete(accountConnections).where(eq(accountConnections.id, id)).run();
  }
}

function toAccountConnectionRow(record: AccountConnectionRecord): AccountConnectionInsert {
  return {
    id: record.id,
    accountId: record.accountId,
    provider: record.provider,
    externalAccountId: record.externalAccountId ?? null,
    handle: record.handle ?? null,
    status: record.status,
    scopes: record.scopes,
    tokenRef: record.tokenRef ?? null,
    expiresAt: record.expiresAt ?? null,
    metadata: record.metadata,
    connectedAt: record.connectedAt ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function fromAccountConnectionRow(row: AccountConnectionRow): AccountConnectionRecord {
  return {
    id: row.id,
    accountId: row.accountId,
    provider: row.provider,
    externalAccountId: nullToUndefined(row.externalAccountId),
    handle: nullToUndefined(row.handle),
    status: row.status,
    scopes: row.scopes,
    tokenRef: nullToUndefined(row.tokenRef),
    expiresAt: nullToUndefined(row.expiresAt),
    metadata: row.metadata,
    connectedAt: nullToUndefined(row.connectedAt),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}
